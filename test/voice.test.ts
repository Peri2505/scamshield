import { describe, expect, it } from "vitest";
import { composeSpeech, phoneForSpeech } from "../src/voice.js";

describe("conversational speech", () => {
  it("groups phone numbers the way people read them", () => {
    expect(phoneForSpeech("1-800-633-4227 (1-800-MEDICARE)")).toBe("1 800, 6 3 3, 4 2 2 7");
    expect(phoneForSpeech("The number on the back of your card")).toBeUndefined();
  });

  it("sounds warm and gives the real number on a scam", () => {
    const s = composeSpeech({
      verdict: "SCAM",
      flagIds: ["asks_for_ids", "urgency"],
      orgName: "Medicare",
      repeatCount: 1,
      official: { name: "Medicare", phone: "1-800-633-4227 (1-800-MEDICARE)" },
      written: false,
      familyAlerted: true,
      trustedContactName: "Aiperi",
    });
    expect(s).toMatch(/scam/i);
    expect(s).toMatch(/They'd never ask for them like this/);
    expect(s).toMatch(/isn't the first time/);
    expect(s).toMatch(/hang up and call Medicare yourself\. The real number is 1 800, 6 3 3, 4 2 2 7\./);
    expect(s).toMatch(/let Aiperi know/);
    expect(s).not.toMatch(/very likely a scam\. Real agencies, banks/); // old robotic phrasing
  });

  it("is short and reassuring when it looks safe", () => {
    const s = composeSpeech({
      verdict: "LIKELY_SAFE", flagIds: [], repeatCount: 0, written: true, familyAlerted: false, trustedContactName: "Aiperi",
    });
    expect(s.split(/[.!?]/).filter(Boolean).length).toBeLessThanOrEqual(2);
  });
});
