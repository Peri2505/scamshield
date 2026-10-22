import { describe, expect, it, vi } from "vitest";

// Simulate AWS mode without touching AWS: Bedrock returns a canned opinion.
vi.mock("../src/config.js", async (orig) => {
  const mod: any = await orig();
  return { config: { ...mod.config, awsEnabled: true } };
});
const seen: string[] = [];
vi.mock("../src/analyzer/bedrock.js", () => ({
  analyzeWithBedrock: vi.fn(async (text: string) => {
    seen.push(text);
    return { riskScore: 85, summary: "Bedrock says: scam.", redFlagIds: ["secrecy"], claimedOrganization: "bank" };
  }),
}));

const { analyze } = await import("../src/analyzer/index.js");

describe("hybrid rules + Bedrock analysis", () => {
  it("takes the higher risk, merges red flags, and only sends redacted text to the model", async () => {
    const a = await analyze("Someone said keep quiet, my account 12345678901 is at risk");
    expect(a.engine).toBe("rules+bedrock");
    expect(a.verdict).toBe("SCAM");
    expect(a.riskScore).toBe(85);
    expect(a.redFlags.map((f) => f.id)).toContain("secrecy");
    expect(a.claimedOrganization).toBe("bank");
    expect(seen[0]).not.toMatch(/12345678901/);
  });
});
