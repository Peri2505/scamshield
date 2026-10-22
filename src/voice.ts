/**
 * Conversational wording for what Alexa says out loud.
 *
 * The card shows short, scannable text. Speech needs something different:
 * contractions, short sentences, a warm opener, and phone numbers grouped the
 * way people actually read them. A few phrasings are rotated so repeat calls
 * don't sound canned.
 */
import type { Verdict } from "./analyzer/types.js";

// Rotate through phrasings so back-to-back answers never sound identical.
const counters = new Map<string[], number>();
const pick = <T extends string>(xs: T[]): T => {
  const n = counters.get(xs) ?? Math.floor(Math.random() * xs.length);
  counters.set(xs, n + 1);
  return xs[n % xs.length];
};

/** Most telling reason first. */
const PRIORITY = [
  "safe_account", "grandparent", "romance", "gift_cards", "remote_access", "crypto_or_wire", "delivery_toll",
  "door_to_door", "asks_for_ids", "threat", "account_problem", "verify_info", "secrecy", "prize", "lookalike_site",
  "unsolicited_link", "family_claim", "payment_demand", "urgency",
];

const OPENERS: Record<Verdict, string[]> = {
  SCAM: [
    "Okay, I'd stop right there. This sounds like a scam.",
    "I'm really glad you asked me first. This sounds like a scam.",
    "Let's pause for a second. This has all the signs of a scam.",
  ],
  SUSPICIOUS: [
    "Hmm, I'd be careful with this one.",
    "Good thing you checked. A couple of things about this worry me.",
  ],
  LIKELY_SAFE: ["That sounds okay to me.", "Nothing about that sounds like a scam."],
};

/** One spoken sentence per tactic, in everyday language. */
const FLAG_SPEECH: Record<string, string> = {
  gift_cards: "Real offices never ask you to pay with gift cards. That's a big giveaway.",
  crypto_or_wire: "Once money goes out by wire or crypto, you can't get it back. That's why scammers ask for it.",
  asks_for_ids: "Real companies and agencies already have your details. They'd never ask for them like this.",
  urgency: "They're rushing you, and that's a trick, so you don't stop and think.",
  threat: "Nobody from the government is going to arrest you over the phone.",
  secrecy: "When someone tells you to keep it a secret, that's exactly when to tell someone.",
  grandparent: "Scammers often pretend to be a grandchild in trouble, and they can sound very real.",
  remote_access: "Please don't let anyone into your computer. Real tech companies don't call about viruses.",
  prize: "If you have to pay to get a prize or a refund, it isn't real.",
  unsolicited_link: "I wouldn't tap that link. It could take you to a fake website.",
  lookalike_site: "That web address looks made up to seem official. I wouldn't open it.",
  safe_account: "No real bank will ever ask you to move your money to keep it safe. That's always a scam.",
  verify_info: "Real companies don't reach out of the blue to confirm your private details.",
  account_problem: "They're saying something's wrong with your account, so you'll panic and act fast.",
  payment_demand: "They want money, and that's when it's best to slow down.",
  delivery_toll: "Those little toll and package fee texts are one of the most common scams right now.",
  romance: "I know this one is hard. But someone you've only met online who asks for money is almost always a scammer.",
  family_claim: "Scammers often pretend to be family, sometimes from a new number.",
  door_to_door: "Real workers don't show up unannounced and ask for cash. It's okay not to open the door.",
};

const CLOSERS = ["You did the right thing by asking.", "Asking first was exactly right.", ""];

/** "1-800-633-4227 (1-800-MEDICARE)" → "1 800, 6 3 3, 4 2 2 7" */
export function phoneForSpeech(phone: string): string | undefined {
  const m = phone.match(/(\d)-(\d{3})-(\d{3})-(\d{4})/);
  if (!m) return undefined;
  const digits = (s: string) => s.split("").join(" ");
  return `${m[1]} ${m[2]}, ${digits(m[3])}, ${digits(m[4])}`;
}

export interface SpeechInput {
  verdict: Verdict;
  flagIds: string[];
  orgName?: string;
  repeatCount: number; // how many earlier attempts this week
  official?: { name: string; phone?: string; website?: string };
  written: boolean; // text or email rather than a call
  familyAlerted: boolean;
  trustedContactName: string;
}

export function composeSpeech(s: SpeechInput): string {
  const parts: string[] = [pick(OPENERS[s.verdict])];

  if (s.verdict === "LIKELY_SAFE") {
    parts.push("Just remember, never share a code or a card number with someone who contacted you first.");
    return parts.join(" ");
  }

  const ordered = [...s.flagIds].sort((a, b) => PRIORITY.indexOf(a) - PRIORITY.indexOf(b));
  const reasons = ordered.map((id) => FLAG_SPEECH[id]).filter(Boolean);
  parts.push(...reasons.slice(0, 2));

  if (s.repeatCount > 0) {
    parts.push(
      s.orgName
        ? `And this isn't the first time. Someone said they were ${s.orgName} earlier this week, too. They often keep trying.`
        : "And this isn't the first time this week. They often keep trying.",
    );
  }

  const spokenPhone = s.official?.phone ? phoneForSpeech(s.official.phone) : undefined;
  if (s.official && spokenPhone) {
    parts.push(
      `If you'd like to double check, ${s.written ? "ignore the message and" : "hang up and"} call ${s.official.name} yourself. The real number is ${spokenPhone}.`,
    );
  } else if (s.official?.website) {
    const site = s.official.website.split(" ")[0];
    parts.push(`If you'd like to check, go to ${site} yourself, instead of using the ${s.written ? "message" : "number they gave you"}.`);
  } else if (s.flagIds.includes("grandparent") || s.flagIds.includes("family_claim")) {
    parts.push("If you're worried, hang up and call them back on the number you already have for them.");
  } else {
    parts.push(s.written ? "It's safest to just delete it." : "It's okay to just hang up.");
  }

  if (s.familyAlerted) parts.push(`I've also let ${s.trustedContactName} know, so they can check in with you.`);
  if (s.verdict === "SCAM") {
    const close = pick(CLOSERS);
    if (close) parts.push(close);
  }
  return parts.join(" ");
}
