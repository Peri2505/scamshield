import { describe, expect, it } from "vitest";
import { redact } from "../src/analyzer/redact.js";
import { analyzeWithRules } from "../src/analyzer/rules.js";
import { findOfficialContact } from "../src/contacts.js";

describe("redaction", () => {
  it("removes SSNs, card numbers, Medicare IDs and emails", () => {
    const { text, redactions } = redact(
      "My SSN is 123-45-6789, card 4111 1111 1111 1111, Medicare 1EG4-TE5-MK73, email me at a.b@example.com",
    );
    expect(text).not.toMatch(/123-45-6789|4111|1EG4|example\.com/);
    expect(text).toContain("[SSN]");
    expect(text).toContain("[CARD-OR-ACCOUNT]");
    expect(text).toContain("[MEDICARE-ID]");
    expect(redactions).toBeGreaterThanOrEqual(4);
  });
});

describe("scam playbook", () => {
  const cases: Array<[string, "SCAM" | "SUSPICIOUS" | "LIKELY_SAFE"]> = [
    ["A man from Medicare called and needs my Medicare number right now or I lose my benefits", "SCAM"],
    ["The IRS said police will arrest me today unless I pay with Target gift cards", "SCAM"],
    ["My grandson called, he needs bail money, he said don't tell your mom", "SCAM"],
    ["Microsoft called, my computer has a virus, they want me to download AnyDesk", "SCAM"],
    ["Text: your Amazon account is locked, click this link bit.ly/xyz", "SCAM"],
    ["The pharmacy texted that my prescription is ready for pickup", "LIKELY_SAFE"],
    ["My bank sent the monthly statement", "LIKELY_SAFE"],
  ];
  for (const [text, expected] of cases) {
    it(`${expected}: ${text.slice(0, 50)}…`, () => {
      expect(analyzeWithRules(text).verdict).toBe(expected);
    });
  }

  it("recognises the impersonated organization", () => {
    expect(analyzeWithRules("Social Security called about my benefits being suspended").claimedOrganization).toBe(
      "social_security",
    );
  });

  it("does not flag impersonation alone", () => {
    const a = analyzeWithRules("Medicare sent me a letter about my plan");
    expect(a.verdict).toBe("LIKELY_SAFE");
    expect(a.redFlags).toHaveLength(0);
  });
});

describe("official contacts", () => {
  it("finds Medicare by loose name", () => {
    expect(findOfficialContact("Medicare")?.phone).toMatch(/1-800-633-4227/);
    expect(findOfficialContact("social security")?.phone).toBe("1-800-772-1213");
    expect(findOfficialContact("report fraud")?.website).toBe("ReportFraud.ftc.gov");
  });
});
