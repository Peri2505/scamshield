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
  /**
   * Supporting signals (a company name, a family member, a payment) are normal
   * on their own. They only add risk alongside at least one real scam tactic.
   */
  supporting?: boolean;
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
    patterns: [/bitcoin|crypto|btc|usdt/i, /wire (the )?(money|transfer)/i, /bitcoin atm|crypto atm/i, /zelle|venmo|cash ?app|western union|moneygram/i, /(put|leave) (the )?cash/i, /pay (him|her|them)? ?(in )?cash|cash (only|today|now|payment)/i, /courier (will|to) (pick|collect)/i],
  },
  {
    id: "safe_account",
    label: "Tells you to move your money",
    why: "No real bank or agency will ever ask you to move your money to a 'safe account'.",
    weight: 55,
    patterns: [/safe account|secure account|protected account/i, /move (all )?(your|my|the) (money|savings|funds)/i, /(withdraw|take out) (your|my|the) (money|savings|cash)/i],
  },
  {
    id: "asks_for_ids",
    label: "Asks for an ID or card number",
    why: "Real agencies, banks and companies already have your numbers. They never contact you to ask for them or for a code.",
    weight: 35,
    patterns: [/social security (number|#)/i, /\bssn\b/i, /medicare (card|number|#)/i, /card number/i, /account number/i, /\bpin\b/i, /verification code|one[- ]time code|security code|the code (we|i|they) (just )?(sent|texted)|read (back )?the code/i, /routing number/i, /(need|needs|want|wants|asked for|ask for|give them|read them) (my|your) (medicare |social security |bank |card |account )?(number|numbers|info|information|details)\b/i],
  },
  {
    id: "verify_info",
    label: "Asks you to 'confirm' your details",
    why: "Real companies don't contact you out of the blue to confirm private details. That's how scammers collect them.",
    weight: 30,
    patterns: [/(confirm|verify|update|validate)\b.{0,30}\b(information|info|details|identity|billing|account|payment|card)/i],
  },
  {
    id: "account_problem",
    label: "Says your account has a problem",
    why: "Scammers invent a problem with your account or number to scare you into acting fast.",
    weight: 30,
    patterns: [
      /(account|card|number|ssn|benefits)\b.{0,40}\b(suspended|locked|compromised|frozen|limited|hacked|closed|deactivated|on hold)/i,
      /(suspend|lock|freez|deactivat)\w*.{0,30}(account|card|number|ssn)/i,
      /payment (failed|declined|didn'?t go through)|suspicious (charge|activity|transaction|login)|unusual (login|activity|sign[- ]?in)|unauthori[sz]ed (charge|purchase|transaction)/i,
      /(medicare|social security|insurance) card.{0,20}(expir|replace|upgrade)|new (medicare|social security) card/i,
      /benefits.{0,30}(stop|end|cut)/i,
      /(license|registration|passport).{0,30}(suspended|revoked|cancel)/i,
      /money laundering|linked to (a )?(crime|fraud|drug)|used (in|for) (a )?(crime|fraud)|identity (was )?stolen/i,
      /(charged|billed) (me|you)\b.{0,30}\$|subscription (renewed|was renewed|has renewed)|auto[- ]?renew|renewed (for|at) \$|call (this number|us|them) to cancel|to cancel (the|this) (charge|order|payment)/i,
    ],
  },
  {
    id: "payment_demand",
    label: "Wants you to pay or send money",
    why: "When someone who contacted you first asks for money, slow down and check with someone you trust.",
    weight: 25,
    supporting: true,
    patterns: [
      /\bpay\b.{0,30}\b(now|today|immediately|fine|fee|fees|toll|bill|taxes|penalty)\b/i,
      /unless (you|i) pay|pay (it )?(over|on) the phone/i,
      /send (me |us |them )?(\$|money|cash|\d)/i,
      /needs? (some )?money|needs? \$\d|\$\d[\d,.]*/i,
    ],
  },
  {
    id: "delivery_toll",
    label: "Fake toll or delivery fee",
    why: "Texts about unpaid tolls or held packages asking for a small payment are one of the most common scams right now.",
    weight: 40,
    patterns: [/unpaid toll|toll (bill|balance|fee|violation)|outstanding toll/i, /package.{0,30}(on hold|held|undeliverable|could not be delivered)|redelivery fee|delivery fee|customs fee/i],
  },
  {
    id: "urgency",
    label: "Pushes you to act right now",
    why: "Real organizations give you time. Rushing you is how scammers stop you from thinking or asking someone.",
    weight: 20,
    patterns: [/right now|immediately|urgent|within (the next )?\d+ (minutes|hours)|in \d+ (minutes|hours)|today or|last chance|final notice|now to avoid|expires? today|act fast|as soon as possible|today unless|by (tonight|end of (the )?day)|press 1|press one|final notice/i],
  },
  {
    id: "threat",
    label: "Threatens arrest, fines or a shutoff",
    why: "Government agencies and utilities don't threaten arrest or a shutoff over the phone and demand payment.",
    weight: 30,
    patterns: [
      /arrest|warrant|police (will|are)|jail|lawsuit|sued|deport/i,
      /(suspend|cancel|lose|cut off).{0,30}(benefits|medicare|social security|account)/i,
      /shut (off|down)|disconnect(ed|ion)?|turn(ed)? off (your|my|the) (power|electricity|gas|water)/i,
      /jury duty|missed (a )?court|court date|(pay|owe) (a |the )?fine|late fees?|legal action/i,
      /owe (back )?taxes|back taxes|tax debt/i,
      /federal agent|fbi agent|dea agent|special agent/i,
    ],
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
    why: "Scammers pretend to be a grandchild or other relative in trouble, asking for bail, a lawyer or hospital money.",
    weight: 40,
    patterns: [
      /\bbail\b|in jail|was arrested|got arrested|in custody|police station/i,
      /(car )?accident.{0,40}(money|pay|need)|hospital bill|(lawyer|attorney) (will|needs|called|is)/i,
    ],
  },
  {
    id: "family_claim",
    label: "Says it's a family member",
    why: "Scammers pretend to be family, often from a 'new number'. Call the person on the number you already have.",
    weight: 25,
    supporting: true,
    patterns: [
      /grand(son|daughter|child|kid)|nephew|niece/i,
      /it'?s me,? (grandma|grandpa|nana|mom|dad)/i, /hi,? (grandma|grandpa|nana|mom|dad)\b/i,
      /lost my phone|new (phone )?number|changed my number/i,
    ],
  },
  {
    id: "romance",
    label: "Online friend asking for money",
    why: "Someone you've only met online who asks for money is almost always a scammer, even if they seem kind.",
    weight: 45,
    patterns: [
      /(met|meet|chatting|talking|friend).{0,40}(online|facebook|instagram|dating|whatsapp|tiktok|internet)/i,
      /says (he|she|they) loves? me|in love with me/i,
      /plane ticket|plane fare|stuck overseas|(military|soldier|oil rig).{0,30}(overseas|abroad)/i,
    ],
  },
  {
    id: "remote_access",
    label: "Wants control of your computer or phone",
    why: "Tech companies don't call you about viruses or errors, and nobody should get remote access to your device.",
    weight: 50,
    patterns: [
      /anydesk|teamviewer|remote access|screen ?share|download (an |this )?app/i,
      /(virus|hacked|infected|malware).{0,40}(computer|phone|account|pc|laptop)/i,
      /(computer|pc|laptop|device) (sent|has|is|shows).{0,30}(error|problem|virus|infected)/i,
      /(let|allow|give) (them|him|her|the caller) (fix|access|into|control|connect)/i,
      /\b(they|he|she|caller|someone|technician)\b.{0,30}\b(fix|repair|clean)\w*.{0,15}(computer|pc|laptop|device|it) (remotely|for me)/i,
      /(fix|repair|clean)\w* (it|the computer|my computer|your computer) remotely/i,
    ],
  },
  {
    id: "door_to_door",
    label: "Stranger at the door asking for money",
    why: "Real contractors and utility workers don't show up unannounced and ask for cash on the spot.",
    weight: 35,
    supporting: true,
    patterns: [/(at|to|knocked on) my (front )?door|came to (my|the) (house|home)|door[- ]to[- ]door/i],
  },
  {
    id: "prize",
    label: "Prize, refund or free offer",
    why: "If you have to pay a fee or give personal details to get a prize, refund or free item, it's a scam.",
    weight: 30,
    patterns: [
      /you('ve| have)? won|lottery|sweepstakes|prize|publishers clearing house/i,
      /refund|overpaid|owe you money/i,
      /(pay|fee|tax).{0,30}(to (claim|receive|release))|(pay|cover) the taxes|processing fee|for processing|handling fee|release fee/i,
      /free (government )?grant|free (back )?brace|free (medical|genetic|covid|cancer) (equipment|test|screening)|free (gift|iphone|cruise|vacation)/i,
      /qualif(y|ied) for.{0,40}(grant|loan|refund|money|prize)|government grant|extended warranty/i,
    ],
  },
  {
    id: "impersonation",
    label: "Claims to be a trusted organization",
    why: "Caller ID and names are easy to fake. Always call back using a number you find yourself.",
    weight: 10,
    supporting: true,
    patterns: [/medicare|social security|\bssa\b|\birs\b|treasury|amazon|apple|microsoft|bank|fbi|ftc|sheriff|usps|fedex|\bups\b|paypal|netflix|electric|utility|power company|gas company|toll|publishers clearing|\bdmv\b|federal|geek squad|wells fargo|chase|paypal|government/i],
  },
  {
    id: "unsolicited_link",
    label: "Text or email with a link to click",
    why: "Links in surprise messages often lead to fake websites that steal passwords and card numbers.",
    weight: 20,
    supporting: true,
    patterns: [/https?:\/\/|bit\.ly|tinyurl|click (the|this|a) link|tap (the|this|a) link|\b[a-z0-9-]+\.(com|net|org|info|xyz|top|site|online|us|co|link|click|io)\b/i],
  },
  {
    id: "lookalike_site",
    label: "Website address that looks fake",
    why: "Scammers use web addresses that look official but have extra words or dashes, like 'amazon-secure-help.com'.",
    weight: 25,
    patterns: [/\b[a-z0-9]+-[a-z0-9-]+\.(com|net|org|info|xyz|top|site|online|us|co|link|click|io)\b/i],
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
  utility: /electric (company|bill)|power company|utility|gas company|water company/i,
};
