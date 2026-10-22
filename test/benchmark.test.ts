import { describe, expect, it } from "vitest";
import { analyzeWithRules } from "../src/analyzer/rules.js";

/**
 * Detection benchmark: 54 real-world scam scripts and 42 ordinary messages
 * an older adult might ask about. Written from FTC / AARP / FBI IC3 scam patterns.
 * This runs the offline rules only. With AWS on, Amazon Bedrock adds a second opinion
 * for wording the rules have never seen.
 */
const SCAMS: string[] = [
  "Hi Grandma, it's me, I lost my phone so this is my new number. Can you send $500 on Zelle?",
  "My bank called about a suspicious charge and asked me to read back the one-time code they just texted me",
  "Someone called from Social Security and said my social security number has been suspended because of illegal activity",
  "Text message: You have an unpaid toll of $3.95. Pay now to avoid late fees: ezdrive-pay.com",
  "The electric company called and said my power will be shut off in 30 minutes unless I pay",
  "A man I met on Facebook says he loves me and needs money for a plane ticket to visit me",
  "Medicare called offering a free back brace, they just need to confirm my information",
  "Email says my Netflix payment failed and I need to update my billing info at netflix-billing-help.com",
  "Someone said they are from the sheriff's office and I missed jury duty, I have to pay a fine today",
  "A caller said my computer sent them an error message and they need to fix it",
  "They said I won a Publishers Clearing House prize but I need to pay the taxes first",
  "Someone from my bank said my account is compromised and I should move my money to a safe account",
  "FedEx: your parcel is waiting, confirm your delivery address and pay $1.99 here fedex-track-parcel.info",
  "Caller from Apple support says my iCloud was hacked and asked me to install AnyDesk",
  "A woman said she's from the IRS and I owe back taxes, I must pay with Bitcoin at a Bitcoin ATM",
  "Someone claiming to be my nephew says he's in jail in Mexico and needs bail, please don't tell his parents",
  "PayPal email: we limited your account, verify your identity to restore access",
  "They said they're from Medicare and my card is expiring, they need my number to send a new one",
  "Got a call that my Social Security benefits will stop unless I verify my SSN today",
  "A man from the gas company said they will turn off my gas today unless I pay on the phone",
  "Text from my bank: unusual login detected, reply with the code we sent to secure your account",
  "Someone I've been talking to on WhatsApp for months wants me to invest in crypto with him",
  "Microsoft called and said there's a virus on my laptop and I need to let them fix it remotely",
  "I got a letter saying I won $2 million but I need to send $500 for processing",
  "A recorded message said Amazon charged me $899 for an iPhone and to press 1 to cancel",
  "Someone from the DMV texted that my license will be suspended unless I pay a fee online",
  "A caller said he's a federal agent and my bank account is linked to money laundering",
  "My 'grandson' called, voice sounded off, he said he hit someone with his car and a lawyer needs $8,000",
  "Text: Your Wells Fargo card has been locked. Call 1-888-555-0199 now",
  "A man at my door said my roof is damaged and I need to pay him cash today for repairs",
  "Email from 'Geek Squad' says my subscription renewed for $499, call to get a refund",
  "Someone on a dating site wants me to buy Apple gift cards for his daughter's surgery",
  "A lady said I qualify for a government grant of $9,000 if I pay a $250 fee",
  "The caller said my Medicare number was used for fraud and I need to give my bank details to fix it",
  "Got a voicemail: final notice about your car's extended warranty, press 1 now",
  "Text says I have a USPS package that can't be delivered, update address at usps-redeliver.com",
  "Somebody called saying they were from Verizon and asked for the PIN on my account to stop a fraud alert",
  "A text said my Zelle payment of $1,200 is pending, reply NO if you didn't authorize it",
  "A caller said my grandson was arrested and I should not tell anyone, the bail is $5,000",
  "Got an email that my Norton antivirus renewed for $399 and to call this number to cancel",
  "Someone from 'Medicare' says I can get free diabetic supplies if I give them my Medicare number",
  "A man says he's with the power company and will cut my electricity in an hour unless I pay with a gift card",
  "Text: Final notice, your Social Security number has been suspended, call immediately",
  "A friend I met online wants me to receive a package for him and send it overseas",
  "They said I have a refund from the IRS and need my bank routing number to deposit it",
  "A man knocked on my door saying he's from the water company and needs to come inside to test, cash payment only",
  "A woman from my church group says she has a great investment that doubles your money in a week, but I have to decide tonight",
  "A man said he's from the hospital and my son was in a crash, they need my credit card to start surgery",
  "Someone called saying my Costco membership will be canceled unless I confirm the card on file",
  "A caller said he's from Apple and my iCloud account was used to buy something, he wants me to go to Target and buy cards to reverse it",
  "A recorded voice said there's a warrant for my arrest from the IRS, press 1 to speak to an officer",
  "A caller from Apple says my iCloud was used to buy something and I must go to Target and buy cards to reverse it",
  "A man says he is with the power company and will cut my electricity in an hour unless I pay with a gift card",
  "He told me to read him the numbers on the back of the cards",
];

const ORDINARY: string[] = [
  "My doctor's office called to confirm my appointment tomorrow at 10",
  "My daughter called to say she'll pick me up for dinner on Sunday",
  "Amazon emailed that my package was delivered",
  "The pharmacy called, my prescription is ready",
  "My grandson visited today and we baked cookies",
  "My son texted me his new number, he got a new phone at the store with me yesterday",
  "The dentist called to confirm my appointment on Friday",
  "I need to pay my electric bill this week, where can I find the due date?",
  "My church sent an email about the bake sale on Saturday",
  "Amazon texted that my order of vitamins has shipped",
  "My granddaughter called to say happy birthday",
  "Walgreens says my flu shot appointment is tomorrow at 2pm",
  "The library emailed that my book is ready, go to chicagopubliclibrary.org",
  "My bank mailed me a new debit card because the old one expires next month",
  "My neighbor asked if I can water her plants next week",
  "Chase sent me my monthly statement by email",
  "My granddaughter sent photos from her vacation",
  "Social Security mailed me a letter about my cost of living increase",
  "My doctor's office texted a reminder to bring my insurance card to my appointment",
  "Comcast emailed that my bill is ready to view in the app",
  "My daughter is coming to fix my computer this weekend",
  "The pharmacy said my refill will be ready after 3pm",
  "My daughter came to the house and helped me clean",
  "The water company left a notice about street repairs on Tuesday",
  "I talked to my friend from church on the phone for an hour",
  "My grandson called to tell me he got a new job",
  "The bank called back after I asked them about my statement",
  "Medicare sent my new plan booklet in the mail",
  "My nephew is visiting for Thanksgiving",
  "CVS texted that my prescription is ready for pickup",
  "My neighbor asked me to sign for her package while she is at work",
  "My daughter called and asked if I want to come for dinner on Sunday",
  "My son is having surgery next week, the hospital said I should bring my insurance card",
  "The doctor office called to say my copay for the visit is $20",
  "The hospital mailed a bill for my knee surgery",
  "My pastor called to ask if I need a ride to church on Sunday",
  "Medicare open enrollment letter came in the mail, it says to call 1-800-MEDICARE with questions",
  "I bought gift cards for my grandkids for Christmas",
  "I went to Target to buy birthday cards",
  "My daughter gave me a gift card for my birthday",
  "I need to go to Target and buy birthday cards for the kids",
  "I have to buy a gift card for my niece",
];

describe("benchmark: scams are flagged", () => {
  for (const text of SCAMS) {
    it(text.slice(0, 70), () => {
      expect(analyzeWithRules(text).verdict).not.toBe("LIKELY_SAFE");
    });
  }
});

describe("benchmark: ordinary messages are not flagged (no false alarms)", () => {
  for (const text of ORDINARY) {
    it(text.slice(0, 70), () => {
      expect(analyzeWithRules(text).verdict).toBe("LIKELY_SAFE");
    });
  }
});
