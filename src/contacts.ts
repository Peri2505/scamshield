/**
 * Official contact directory. The single most protective thing an older adult
 * can do is hang up and call back on a number they did not get from the caller.
 *
 * Numbers verified against official .gov / company sites. Re-check before any
 * production release; never accept a number supplied by the caller.
 */
export interface OfficialContact {
  key: string;
  name: string;
  phone?: string;
  website?: string;
  howTheyContactYou: string;
}

export const OFFICIAL_CONTACTS: Record<string, OfficialContact> = {
  medicare: {
    key: "medicare",
    name: "Medicare",
    phone: "1-800-633-4227 (1-800-MEDICARE)",
    website: "medicare.gov",
    howTheyContactYou: "Medicare will not call you to ask for your Medicare number or to sell you anything.",
  },
  social_security: {
    key: "social_security",
    name: "Social Security Administration",
    phone: "1-800-772-1213",
    website: "ssa.gov",
    howTheyContactYou: "Social Security will never threaten arrest or ask for gift cards, wire transfers or crypto.",
  },
  irs: {
    key: "irs",
    name: "Internal Revenue Service",
    phone: "1-800-829-1040",
    website: "irs.gov",
    howTheyContactYou: "The IRS usually contacts you first by mail, and never demands payment by gift card or crypto.",
  },
  bank: {
    key: "bank",
    name: "Your bank",
    phone: "The number printed on the back of your bank card",
    howTheyContactYou: "Your bank will never ask you to move money to a 'safe account' or read them a security code.",
  },
  amazon: {
    key: "amazon",
    name: "Amazon",
    website: "amazon.com → Your Orders, or the Amazon app",
    howTheyContactYou: "Check orders yourself in the app. Amazon won't ask for payment by phone or gift card.",
  },
  tech_support: {
    key: "tech_support",
    name: "Microsoft / Apple support",
    website: "microsoft.com/support or support.apple.com",
    howTheyContactYou: "Tech companies don't call you about viruses. Never let a caller control your computer.",
  },
  law_enforcement: {
    key: "law_enforcement",
    name: "Local police (non-emergency)",
    phone: "Your local non-emergency number, or 911 if you are in danger",
    howTheyContactYou: "Police and courts do not call to collect fines or bail by phone.",
  },
  usps: {
    key: "usps",
    name: "U.S. Postal Service",
    phone: "1-800-275-8777",
    website: "usps.com",
    howTheyContactYou: "USPS does not text you asking for a fee to deliver a package.",
  },
  report_fraud: {
    key: "report_fraud",
    name: "FTC — report a scam",
    phone: "1-877-382-4357",
    website: "ReportFraud.ftc.gov",
    howTheyContactYou: "Reporting helps stop scammers and protects other people.",
  },
  aarp_helpline: {
    key: "aarp_helpline",
    name: "AARP Fraud Watch Helpline (free, for anyone)",
    phone: "1-877-908-3360",
    howTheyContactYou: "Trained volunteers will talk through what happened with you.",
  },
};

export function findOfficialContact(org: string): OfficialContact | undefined {
  const k = org.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (OFFICIAL_CONTACTS[k]) return OFFICIAL_CONTACTS[k];
  return Object.values(OFFICIAL_CONTACTS).find(
    (c) => c.name.toLowerCase().includes(org.toLowerCase()) || c.key.includes(k),
  );
}
