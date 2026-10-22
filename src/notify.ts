import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { config } from "./config.js";

export interface FamilyAlert {
  householdId: string;
  verdict: string;
  claimedOrganization?: string;
  redFlagLabels: string[];
  note?: string;
}

export interface AlertResult {
  delivered: boolean;
  channel: "sns" | "local-outbox";
  message: string;
}

/** In local mode alerts land here so the demo page can show them. */
export const localOutbox: Array<{ at: string; subject: string; message: string }> = [];

let sns: SNSClient | undefined;

export function composeAlert(a: FamilyAlert): { subject: string; message: string } {
  const who = config.protectedPersonName;
  const org = a.claimedOrganization ? ` pretending to be ${a.claimedOrganization.replace(/_/g, " ")}` : "";
  const subject = `ScamShield: ${who} reported a ${a.verdict === "SCAM" ? "likely scam" : "suspicious contact"}`;
  const lines = [
    `Hi ${config.trustedContactName},`,
    ``,
    `${who} just asked ScamShield about a contact${org}.`,
    `Verdict: ${a.verdict.replace("_", " ")}.`,
    a.redFlagLabels.length ? `Warning signs: ${a.redFlagLabels.join("; ")}.` : "",
    a.note ? `Note: ${a.note}` : "",
    ``,
    `ScamShield already told ${who} to hang up and not share any numbers.`,
    `A quick call from you would help. No personal numbers are included in this message.`,
  ].filter((l) => l !== "");
  return { subject: subject.slice(0, 99), message: lines.join("\n") };
}

export async function sendFamilyAlert(a: FamilyAlert): Promise<AlertResult> {
  const { subject, message } = composeAlert(a);

  if (config.awsEnabled && config.alertTopicArn) {
    try {
      sns ??= new SNSClient({ region: config.awsRegion });
      await sns.send(new PublishCommand({ TopicArn: config.alertTopicArn, Subject: subject, Message: message }));
      return { delivered: true, channel: "sns", message };
    } catch (e) {
      console.warn("[sns] publish failed, using local outbox:", (e as Error).message);
    }
  }
  localOutbox.unshift({ at: new Date().toISOString(), subject, message });
  console.log(`\n📨 FAMILY ALERT (local outbox)\n${subject}\n${message}\n`);
  return { delivered: true, channel: "local-outbox", message };
}
