import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { analyze } from "./analyzer/index.js";
import { RED_FLAGS } from "./analyzer/patterns.js";
import { verdictFromScore } from "./analyzer/types.js";
import { nextStepsFor } from "./analyzer/rules.js";
import { config } from "./config.js";
import { findOfficialContact, OFFICIAL_CONTACTS } from "./contacts.js";
import { sendFamilyAlert } from "./notify.js";
import { createStore, type IncidentStore } from "./store.js";

const here = dirname(fileURLToPath(import.meta.url));
/** MCP Apps (SEP-1865) UI resource: rendered by the host in a sandboxed iframe. */
export const VERDICT_CARD_URI = "ui://scamshield/verdict-card.html";
export const MCP_APP_MIME = "text/html;profile=mcp-app";

function loadCardHtml(): string {
  // Works from both src/ (tsx) and dist/ (compiled) because the build copies ui/.
  for (const p of [join(here, "ui", "verdict-card.html"), join(here, "..", "src", "ui", "verdict-card.html")]) {
    try {
      return readFileSync(p, "utf8");
    } catch {}
  }
  throw new Error("verdict-card.html not found");
}

const prettyOrg = (k?: string) => (k ? (OFFICIAL_CONTACTS[k]?.name ?? k.replace(/_/g, " ")) : undefined);

function ordinal(n: number) {
  return ["", "first", "second", "third", "fourth", "fifth"][n] ?? `${n}th`;
}

/** One store per process so memory survives across MCP sessions. */
const sharedStore: IncidentStore = createStore();

export function createScamShieldServer(store: IncidentStore = sharedStore): McpServer {
  const server = new McpServer(
    { name: "scamshield", title: "ScamShield", version: "1.0.0" },
    {
      instructions:
        "ScamShield protects older adults from phone, text and email scams. When the user describes a call, " +
        "message, visitor or request for money/information they are unsure about, call check_suspicious_contact " +
        "with their own words. Read the 'spoken' field back to them calmly and slowly. Never ask the user to " +
        "repeat card, Social Security or Medicare numbers. Use get_official_contact when they want to call an " +
        "organization back, alert_trusted_family when they ask you to tell family, and get_incident_history when " +
        "they ask what has happened recently.",
    },
  );

  // ── UI resource (MCP Apps) ────────────────────────────────────────────────
  server.registerResource(
    "verdict-card",
    VERDICT_CARD_URI,
    {
      title: "ScamShield verdict card",
      description: "Large-print red / yellow / green verdict card for Echo Show and other screens.",
      mimeType: MCP_APP_MIME,
      _meta: { ui: { prefersBorder: false } },
    },
    async () => ({
      contents: [{ uri: VERDICT_CARD_URI, mimeType: MCP_APP_MIME, text: loadCardHtml() }],
    }),
  );

  // ── 1. The orchestrating tool ─────────────────────────────────────────────
  server.registerTool(
    "check_suspicious_contact",
    {
      title: "Check a suspicious call, text or email",
      description:
        "Analyze a phone call, text, email, voicemail or visitor the user is unsure about. Redacts personal numbers, " +
        "scores it against a scam playbook (plus Amazon Bedrock when enabled), remembers it, detects repeat attempts, " +
        "returns the official contact for the organization being impersonated, and alerts the trusted family member " +
        "automatically when it is very likely a scam.",
      inputSchema: {
        description: z
          .string()
          .min(3)
          .describe("What happened, in the user's own words, e.g. 'A man from Medicare called and wants my card number'."),
        channel: z
          .enum(["phone_call", "voicemail", "text_message", "email", "in_person", "other"])
          .default("phone_call")
          .describe("How the contact happened."),
        household_id: z.string().optional().describe("Household to remember this under. Defaults to the device's household."),
      },
      annotations: { title: "Check suspicious contact", readOnlyHint: false, openWorldHint: true },
      _meta: { ui: { resourceUri: VERDICT_CARD_URI }, "ui/resourceUri": VERDICT_CARD_URI },
    },
    async ({ description, channel, household_id }) => {
      const householdId = household_id ?? config.defaultHousehold;
      const a = await analyze(description, channel);

      // Memory: has this household seen the same play recently?
      const history = await store.recent(householdId, 7);
      // Same impersonated organization if we know it; otherwise the same tactic.
      const sameOrgOrTactic = history.filter(
        (h) =>
          h.verdict !== "LIKELY_SAFE" &&
          (a.claimedOrganization
            ? h.claimedOrganization === a.claimedOrganization
            : !h.claimedOrganization &&
              h.redFlagIds.some((id) => id !== "impersonation" && a.redFlags.some((f) => f.id === id))),
      );
      let riskScore = a.riskScore;
      let repeatNote: string | undefined;
      if (sameOrgOrTactic.length > 0 && a.verdict !== "LIKELY_SAFE") {
        riskScore = Math.min(100, riskScore + 15 * sameOrgOrTactic.length);
        const nth = sameOrgOrTactic.length + 1;
        repeatNote = a.claimedOrganization
          ? `This is the ${ordinal(nth)} time this week someone claimed to be ${prettyOrg(a.claimedOrganization)}. Scammers often try again and again.`
          : `This is the ${ordinal(nth)} contact like this in the past week. Scammers often try again.`;
      }
      const verdict = verdictFromScore(riskScore);
      const nextSteps = verdict === a.verdict ? a.nextSteps : nextStepsFor(verdict, a.claimedOrganization, channel);
      const official = a.claimedOrganization ? OFFICIAL_CONTACTS[a.claimedOrganization] : undefined;

      // Agentic step: alert family automatically on a likely scam.
      let familyAlerted = false;
      if (verdict === "SCAM" && config.autoAlertOnScam) {
        const r = await sendFamilyAlert({
          householdId,
          verdict,
          claimedOrganization: prettyOrg(a.claimedOrganization),
          redFlagLabels: a.redFlags.filter((f) => f.id !== "impersonation").map((f) => f.label),
          note: repeatNote,
        });
        familyAlerted = r.delivered;
      }

      await store.add({
        householdId,
        ts: new Date().toISOString(),
        channel,
        verdict,
        riskScore,
        claimedOrganization: a.claimedOrganization,
        redFlagIds: a.redFlags.map((f) => f.id),
        redactedText: a.redactedText,
        familyAlerted,
      });

      const spokenParts = [
        verdict === "SCAM"
          ? "Please stop. This is very likely a scam."
          : verdict === "SUSPICIOUS"
            ? "Let's be careful. This has some warning signs of a scam."
            : "This doesn't look like a common scam, but stay careful.",
        a.redFlags.filter((f) => f.id !== "impersonation")[0]?.why,
        repeatNote,
        official?.phone && verdict !== "LIKELY_SAFE"
          ? `If you want to check, ${channel === "text_message" || channel === "email" ? "don't use the message. Call" : "hang up and call"} ${official.name} yourself at ${official.phone.replace(/\s*\(.*\)/, "")}.`
          : official?.website && verdict !== "LIKELY_SAFE"
            ? `If you want to check, go to ${official.website.split(" ")[0]} yourself instead of using the message.`
            : undefined,
        familyAlerted ? `I've let ${config.trustedContactName} know, so they can check in with you.` : undefined,
      ].filter(Boolean);
      const spoken = spokenParts.join(" ");

      const result = {
        verdict,
        riskScore,
        summary: a.summary,
        spoken,
        nextSteps,
        redFlags: a.redFlags,
        claimedOrganization: prettyOrg(a.claimedOrganization),
        officialContact: official ?? null,
        repeatNote: repeatNote ?? null,
        familyAlerted,
        trustedContactName: config.trustedContactName,
        engine: a.engine,
        redactedText: a.redactedText,
      };
      return {
        content: [{ type: "text", text: spoken }],
        structuredContent: result,
      };
    },
  );

  // ── 2. Official contact lookup ────────────────────────────────────────────
  server.registerTool(
    "get_official_contact",
    {
      title: "Get the real phone number for an organization",
      description:
        "Return the verified official phone number / website for an organization (Medicare, Social Security, IRS, bank, " +
        "Amazon, tech support, police, USPS, FTC fraud reporting, AARP helpline). Use this instead of any number a caller gave.",
      inputSchema: {
        organization: z.string().describe("e.g. 'medicare', 'social security', 'irs', 'bank', 'report fraud'"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ organization }) => {
      const c = findOfficialContact(organization);
      if (!c) {
        return {
          content: [
            {
              type: "text",
              text: `I don't have a verified number for "${organization}". Look for the number on an official letter, bill, or the back of your card — never use a number the caller gave you.`,
            },
          ],
          structuredContent: { found: false, organization },
        };
      }
      const text = [
        `${c.name}:`,
        c.phone ? `Phone: ${c.phone}.` : "",
        c.website ? `Website: ${c.website}.` : "",
        c.howTheyContactYou,
      ]
        .filter(Boolean)
        .join(" ");
      return { content: [{ type: "text", text }], structuredContent: { found: true, contact: c } };
    },
  );

  // ── 3. Manual family alert ────────────────────────────────────────────────
  server.registerTool(
    "alert_trusted_family",
    {
      title: "Let a trusted family member know",
      description:
        "Send a short alert to the household's trusted family member (via Amazon SNS when enabled). " +
        "Use when the user asks to tell their family, or is worried they already shared information.",
      inputSchema: {
        note: z.string().max(300).optional().describe("Short note in the user's words. Do not include any ID or card numbers."),
        household_id: z.string().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ note, household_id }) => {
      const householdId = household_id ?? config.defaultHousehold;
      const recent = (await store.recent(householdId, 1))[0];
      const r = await sendFamilyAlert({
        householdId,
        verdict: recent?.verdict ?? "SUSPICIOUS",
        claimedOrganization: prettyOrg(recent?.claimedOrganization),
        redFlagLabels: (recent?.redFlagIds ?? [])
          .map((id) => RED_FLAGS.find((f) => f.id === id)?.label)
          .filter((x): x is string => Boolean(x)),
        note: note ? note.replace(/\d{4,}/g, "[number removed]") : undefined,
      });
      return {
        content: [{ type: "text", text: `Done. I've let ${config.trustedContactName} know. They'll reach out to you soon.` }],
        structuredContent: { ...r, trustedContactName: config.trustedContactName },
      };
    },
  );

  // ── 4. Memory across sessions ─────────────────────────────────────────────
  server.registerTool(
    "get_incident_history",
    {
      title: "What suspicious contacts happened recently",
      description:
        "Summarize the suspicious calls/messages this household reported recently (stored in DynamoDB when enabled). " +
        "Useful for the user, or for a family member checking in.",
      inputSchema: {
        days: z.number().int().min(1).max(180).default(7),
        household_id: z.string().optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: { ui: { resourceUri: VERDICT_CARD_URI }, "ui/resourceUri": VERDICT_CARD_URI },
    },
    async ({ days, household_id }) => {
      const items = await store.recent(household_id ?? config.defaultHousehold, days);
      const risky = items.filter((i) => i.verdict !== "LIKELY_SAFE");
      const byOrg = new Map<string, number>();
      for (const i of risky) {
        const k = prettyOrg(i.claimedOrganization) ?? "unknown caller";
        byOrg.set(k, (byOrg.get(k) ?? 0) + 1);
      }
      const top = [...byOrg.entries()].sort((a, b) => b[1] - a[1]);
      const text = risky.length
        ? `In the last ${days} days there were ${risky.length} suspicious contacts. ` +
          top.map(([org, n]) => `${n} from someone claiming to be ${org}`).join(", ") +
          ". None of them should be called back on the number they gave."
        : `No suspicious contacts in the last ${days} days. Nice work staying alert.`;
      return {
        content: [{ type: "text", text }],
        structuredContent: {
          days,
          trustedContactName: config.trustedContactName,
          total: items.length,
          suspiciousOrScam: risky.length,
          byOrganization: Object.fromEntries(top),
          incidents: items.slice(0, 20).map(({ ts, channel, verdict, riskScore, claimedOrganization, familyAlerted }) => ({
            ts,
            channel,
            verdict,
            riskScore,
            claimedOrganization: prettyOrg(claimedOrganization) ?? null,
            familyAlerted,
          })),
        },
      };
    },
  );

  return server;
}
