import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { config } from "../config.js";
import { RED_FLAGS } from "./patterns.js";

let client: BedrockRuntimeClient | undefined;
function getClient() {
  // One quick attempt and a short timeout: a safety assistant must answer fast.
  client ??= new BedrockRuntimeClient({ region: config.awsRegion, maxAttempts: 1, requestHandler: { requestTimeout: 4000 } as never });
  return client;
}

/**
 * Circuit breaker. If Bedrock is throttled or over quota (e.g. brand-new AWS accounts
 * start with a daily token quota of 0), stop calling it for a while instead of making
 * every answer wait for an error. The scam playbook keeps working in the meantime.
 */
let pausedUntil = 0;
export function bedrockPausedUntil() {
  return pausedUntil;
}
function pauseFor(ms: number, reason: string) {
  pausedUntil = Date.now() + ms;
  console.warn(`[bedrock] paused for ${Math.round(ms / 60000)} min (${reason}); using the scam playbook meanwhile`);
}

export interface BedrockOpinion {
  riskScore: number;
  summary: string;
  redFlagIds: string[];
  claimedOrganization?: string;
}

const SYSTEM_PROMPT = `You are ScamShield, a fraud-prevention assistant protecting older adults.
You receive a description of a phone call, text, email or visit that the person received.
Personal numbers have already been replaced with tags like [SSN] or [CARD-OR-ACCOUNT].

Judge how likely it is to be a scam. Known tactic ids:
${RED_FLAGS.map((f) => `- ${f.id}: ${f.label}`).join("\n")}

Reply with ONLY a JSON object, no prose, in this shape:
{"riskScore": <0-100>, "summary": "<1-2 short calm sentences an 80-year-old can understand, no jargon>", "redFlagIds": ["<ids from the list>"], "claimedOrganization": "<medicare|social_security|irs|bank|amazon|tech_support|law_enforcement|usps|null>"}

Be decisive: payment by gift card/crypto/wire, requests for ID numbers or one-time codes, secrecy, or threats mean riskScore >= 75. A normal, non-pushy message with no requests means riskScore <= 20.`;

/** Ask Amazon Bedrock (Converse API) for a second opinion. Returns undefined on any failure. */
export async function analyzeWithBedrock(redactedText: string): Promise<BedrockOpinion | undefined> {
  if (Date.now() < pausedUntil) return undefined;
  try {
    const res = await getClient().send(
      new ConverseCommand({
        modelId: config.bedrockModelId,
        system: [{ text: SYSTEM_PROMPT }],
        messages: [{ role: "user", content: [{ text: redactedText.slice(0, 4000) }] }],
        inferenceConfig: { maxTokens: 300, temperature: 0 },
      }),
    );
    const raw = res.output?.message?.content?.map((c) => c.text ?? "").join("") ?? "";
    const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json);
    const score = Math.max(0, Math.min(100, Number(parsed.riskScore)));
    if (Number.isNaN(score)) return undefined;
    return {
      riskScore: score,
      summary: String(parsed.summary ?? "").slice(0, 400),
      redFlagIds: Array.isArray(parsed.redFlagIds) ? parsed.redFlagIds.map(String) : [],
      claimedOrganization:
        parsed.claimedOrganization && parsed.claimedOrganization !== "null"
          ? String(parsed.claimedOrganization)
          : undefined,
    };
  } catch (err) {
    const e = err as Error & { name?: string };
    const msg = e.message ?? String(err);
    if (/per day/i.test(msg)) pauseFor(60 * 60_000, "daily token quota reached");
    else if (e.name === "ThrottlingException" || /too many|throttl|rate exceeded/i.test(msg)) pauseFor(60_000, "throttled");
    else if (e.name === "AccessDeniedException") pauseFor(10 * 60_000, "access denied");
    else console.warn("[bedrock] falling back to rules:", msg);
    return undefined;
  }
}
