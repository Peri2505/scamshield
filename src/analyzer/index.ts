import { config } from "../config.js";
import { analyzeWithBedrock } from "./bedrock.js";
import { RED_FLAGS } from "./patterns.js";
import { redact } from "./redact.js";
import { analyzeWithRules, nextStepsFor } from "./rules.js";
import { type Analysis, verdictFromScore } from "./types.js";

export type { Analysis, Verdict } from "./types.js";

/**
 * Hybrid analysis:
 *  1. Redact personal numbers.
 *  2. Run the deterministic playbook (always — it's instant and explainable).
 *  3. If AWS is on, ask Bedrock for a second opinion and take the HIGHER risk.
 *     For a safety tool, a false alarm is much cheaper than a missed scam.
 */
export async function analyze(text: string, channel?: string): Promise<Analysis & { redactedText: string }> {
  const { text: clean } = redact(text);
  const rules = analyzeWithRules(clean, channel);
  if (!config.awsEnabled) return { ...rules, redactedText: clean };

  const llm = await analyzeWithBedrock(clean);
  if (!llm) return { ...rules, redactedText: clean };

  const riskScore = Math.max(rules.riskScore, llm.riskScore);
  const verdict = verdictFromScore(riskScore);
  const flagIds = new Set([...rules.redFlags.map((f) => f.id), ...llm.redFlagIds]);
  const redFlags = RED_FLAGS.filter((f) => flagIds.has(f.id)).map(({ id, label, why }) => ({ id, label, why }));
  const claimedOrganization = rules.claimedOrganization ?? llm.claimedOrganization;

  return {
    verdict,
    riskScore,
    summary: llm.summary || rules.summary,
    nextSteps: nextStepsFor(verdict, claimedOrganization, channel),
    redFlags,
    claimedOrganization,
    engine: "rules+bedrock",
    redactedText: clean,
  };
}
