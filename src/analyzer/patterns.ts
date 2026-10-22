/**
 * Scam playbook library.
 *
 * Each "red flag" is a tactic scammers use, written so the explanation can be
 * read aloud to an older adult in plain words. Weights are added together and
 * capped at 100 to produce a risk score.
 *
 * Sources for the tactics: FTC consumer alerts, AARP Fraud Watch Network,
 * FBI IC3 elder fraud reports. Contributions welcome (see CONTRIBUTING.md).
 */

export interface RedFlag {
  id: string;
  /** Short label for the card, e.g. "Asks for gift cards". */
  label: string;
  /** One sentence, plain language, safe to read aloud. */
  why: string;
  weight: number;
  patterns: RegExp[];
}

export const RED_FLAGS: RedFlag[] = [
  {
    id: "gift_cards",
    label: "Wants payment in gift cards",
    why: "No real government office or company asks you to pay with gift cards.",
    weight: 45,
    patterns: [/gift ?cards?/i, /google play card/i, /itunes card/i, /apple card(s)? from the store/i, /target card|walmart card|steam card/i],
  },
  {
    id: "crypto_or_wire",
    label: "Wants crypto, wire transfer or cash",
    why: "Scammers ask for crypto, wire transfers, cash apps or cash because the money cannot be returned.",
    weight: 40,
    patterns: [/bitcoin|crypto|btc|usdt/i, /wire (the )?(money|transfer)/i, /bitcoin atm|crypto atm/i, /zelle|venmo|cash ?app/i, /(put|leave) (the )?cash/i, /courier (will|to) (pick|collect)/i],
  },
  {
    id: "asks_for_ids",
    label: "Asks for an ID or card number",
    why: "Real agencies, banks and companies already have your numbers. They never contact you to ask for them or for a code.",
    weight: 35,
    patterns: [/social security (number|#)/i, /\bssn\b/i, /medicare (card|number|#)/i, /card number/i, /account number/i, /\bpin\b/i, /verification code|one[- ]time code|the code (we|i) (just )?sent/i, /routing number/i],
  },
  {
    id: "urgency",
    label: "Pushes you to act right now",
    why: "Real organizations give you time. Rushing you is how scammers stop you from thinking or asking someone.",
    weight: 20,
    patterns: [/right now|immediately|urgent|within (the next )?\d+ (minutes|hours)|today or|last chance|final notice/i],
  },
  {
    id: "threat",
    label: "Threatens arrest, fines or losing benefits",
    why: "Government agencies do not threaten arrest or cut off benefits over the phone.",
    weight: 30,
    patterns: [/arrest|warrant|police (will|are)|jail|lawsuit|sued/i, /(suspend|cancel|lose|cut off).{0,30}(benefits|medicare|social security|account)/i, /deport/i],
  },
  {
    id: "secrecy",
    label: "Tells you to keep it secret",
    why: "A real caller never tells you to hide something from your family or your bank.",
    weight: 35,
    patterns: [/don'?t tell|do not tell|keep (this|it) (a )?secret|between us|don'?t (talk|speak) to (anyone|your)/i, /(stay|keep) on the (line|phone)/i],
  },
  {
    id: "grandparent",
    label: "\"Family member in trouble\" story",
    why: "Scammers pretend to be a grandchild or a lawyer for one, asking for bail or hospital money.",
    weight: 35,
    patterns: [/grand(son|daughter|child|kid)/i, /\bbail\b/i, /(car )?accident.{0,40}(money|pay|need)/i, /it'?s me,? (grandma|grandpa|nana)/i],
  },
  {
    id: "remote_access",
    label: "Wants control of your computer or phone",
    why: "Tech companies do not call you about viruses, and nobody should install remote-access apps on your device.",
    weight: 50,
    patterns: [/anydesk|teamviewer|remote access|screen ?share|download (an |this )?app/i, /(virus|hacked|infected).{0,40}(computer|phone|account)/i],
  },
  {
    id: "prize",
    label: "Prize or refund you didn't expect",
    why: "If you have to pay a fee to get a prize, refund or grant, it is a scam.",
    weight: 30,
    patterns: [/you('ve| have)? won|lottery|sweepstakes|prize/i, /refund|overpaid|owe you money/i, /(pay|fee|tax).{0,30}(to (claim|receive|release))/i, /free (government )?grant/i],
  },
  {
    id: "impersonation",
    label: "Claims to be a trusted organization",
    why: "Caller ID and names are easy to fake. Always call back using a number you find yourself.",
    weight: 10,
    patterns: [/medicare|social security|\bssa\b|\birs\b|treasury|amazon|apple|microsoft|bank|fbi|ftc|sheriff|usps|fedex|ups/i],
  },
  {
    id: "unsolicited_link",
    label: "Text or email with a link to click",
    why: "Links in surprise messages often lead to fake websites that steal passwords.",
    weight: 20,
    patterns: [/https?:\/\/|bit\.ly|tinyurl|click (the|this) link|tap (the|this) link/i],
  },
];

/** Organizations we recognise in a message, mapped to keys in the official directory. */
export const ORG_ALIASES: Record<string, RegExp> = {
  medicare: /medicare|cms\b/i,
  social_security: /social security|\bssa\b/i,
  irs: /\birs\b|internal revenue|tax (office|department)/i,
  bank: /\bbank\b|chase|wells fargo|bank of america|citi(bank)?|credit union/i,
  amazon: /amazon/i,
  tech_support: /microsoft|apple|windows|tech support|geek squad/i,
  law_enforcement: /police|sheriff|fbi|warrant|marshal/i,
  usps: /usps|post(al)? (office|service)|package (delivery|held)/i,
};
