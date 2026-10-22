export type Verdict = "SCAM" | "SUSPICIOUS" | "LIKELY_SAFE";

export interface Analysis {
  verdict: Verdict;
  /** 0–100 */
  riskScore: number;
  /** One or two sentences, plain language, safe to read aloud. */
  summary: string;
  /** What to do next, in order. */
  nextSteps: string[];
  redFlags: Array<{ id: string; label: string; why: string }>;
  /** Organization the contact claimed to be, if recognised (key in OFFICIAL_CONTACTS). */
  claimedOrganization?: string;
  /** "rules" = local playbook only; "rules+bedrock" = playbook + Amazon Bedrock reasoning. */
  engine: "rules" | "rules+bedrock";
}

export function verdictFromScore(score: number): Verdict {
  if (score >= 60) return "SCAM";
  if (score >= 25) return "SUSPICIOUS";
  return "LIKELY_SAFE";
}
