/**
 * Privacy first: strip anything that looks like a card, SSN, Medicare ID,
 * account number or one-time code BEFORE text is sent to a model, stored
 * in DynamoDB, or included in a family alert.
 */
const RULES: Array<[RegExp, string]> = [
  [/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]"],
  // Medicare Beneficiary Identifier: 11 chars, letters + digits, often with dashes
  [/\b\d[A-Z][A-Z0-9]\d-?[A-Z][A-Z0-9]\d-?[A-Z]{2}\d{2}\b/gi, "[MEDICARE-ID]"],
  [/\b(?:\d[ -]?){13,19}\b/g, "[CARD-OR-ACCOUNT]"],
  [/\b\d{6,12}\b/g, "[NUMBER]"],
  [/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, "[EMAIL]"],
];

export function redact(text: string): { text: string; redactions: number } {
  let out = text;
  let redactions = 0;
  for (const [re, label] of RULES) {
    out = out.replace(re, () => {
      redactions++;
      return label;
    });
  }
  return { text: out, redactions };
}
