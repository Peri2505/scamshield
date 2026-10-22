import { describe, expect, it, vi } from "vitest";

// Simulate a brand-new AWS account: every Bedrock call is refused with the daily-quota error.
const send = vi.fn(async () => {
  throw Object.assign(new Error("Too many tokens per day, please wait before trying again."), { name: "ThrottlingException" });
});
vi.mock("@aws-sdk/client-bedrock-runtime", () => ({
  BedrockRuntimeClient: class { send = send; },
  ConverseCommand: class { constructor(public input: unknown) {} },
}));

const { analyzeWithBedrock, bedrockPausedUntil } = await import("../src/analyzer/bedrock.js");

describe("Bedrock circuit breaker", () => {
  it("pauses Bedrock after a daily-quota error so answers stay fast", async () => {
    expect(await analyzeWithBedrock("test")).toBeUndefined();
    expect(send).toHaveBeenCalledTimes(1);
    expect(bedrockPausedUntil()).toBeGreaterThan(Date.now() + 50 * 60_000);

    // Later questions skip Bedrock entirely and fall back to the scam playbook instantly.
    expect(await analyzeWithBedrock("another question")).toBeUndefined();
    expect(send).toHaveBeenCalledTimes(1);
  });
});
