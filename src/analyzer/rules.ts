import { ORG_ALIASES, RED_FLAGS } from "./patterns.js";
import { type Analysis, verdictFromScore } from "./types.js";

export function detectOrganization(text: string): string | undefined {
  for (const [key, re] of Object.entries(ORG_ALIASES)) {
    if (re.test(text)) return key;
  }
  return undefined;
}

export function nextStepsFor(verdict: Analysis["verdict"], org?: string, channel = "phone_call"): string[] {
  const written = channel === "text_message" || channel === "email";
  if (verdict === "SCAM") {
    return [
      written
        ? "Don't reply and don't tap any links. Delete the message."
        : "Hang up. You don't owe them an explanation.",
      "Do not send money, gift cards or any numbers or codes.",
      org
        ? "If you're worried, check with them yourself using the official contact on this screen."
        : "If you're worried, contact the organization using a number you find yourself.",
      "Tell someone you trust. ScamShield can let your family know.",
    ];
  }
  if (verdict === "SUSPICIOUS") {
    return [
      "Don't share any personal information yet.",
      written
        ? "Don't tap links in the message. Go to the official app or website yourself."
        : "Hang up and call back on the official number, not the one they gave you.",
      "Talk it over with family before doing anything.",
    ];
  }
  return [
    "Nothing here looks like a common scam.",
    "Still, never share codes or card numbers with someone who contacted you first.",
  ];
}

/** Fast, deterministic, offline analysis using the playbook library. */
export function analyzeWithRules(text: string, channel?: string): Analysis {
  const hits = RED_FLAGS.filter((f) => f.patterns.some((p) => p.test(text)));
  // Supporting signals (a company name, a relative, a payment, a link) are normal
  // on their own, so they only add weight when there's at least one real tactic.
  const meaningful = hits.filter((h) => !h.supporting);
  const score = meaningful.length ? Math.min(100, hits.reduce((sum, h) => sum + h.weight, 0)) : 0;
  const verdict = verdictFromScore(score);
  const org = detectOrganization(text);

  const summary =
    verdict === "SCAM"
      ? meaningful[0]?.why ?? "This matches a common scam."
      : verdict === "SUSPICIOUS"
        ? meaningful[0]?.why ?? "This has some warning signs of a scam."
        : "I don't see the usual signs of a scam, but stay careful.";

  return {
    verdict,
    riskScore: score,
    summary,
    nextSteps: nextStepsFor(verdict, org, channel),
    redFlags: (meaningful.length ? [...meaningful, ...hits.filter((h) => h.supporting)] : []).map(({ id, label, why }) => ({ id, label, why })),
    claimedOrganization: org,
    engine: "rules",
  };
}
