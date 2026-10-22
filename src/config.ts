/**
 * Central configuration. Everything has a safe local default so the server
 * runs with zero setup and zero cost. Set SCAMSHIELD_AWS=1 (plus normal AWS
 * credentials) to switch on Amazon Bedrock, DynamoDB and SNS.
 */
import { existsSync } from "node:fs";

// Load .env if present (Node 22+ built-in, no dotenv dependency). Tests skip it.
if (existsSync(".env") && !process.env.VITEST) process.loadEnvFile(".env");

const env = process.env;

export const config = {
  port: Number(env.PORT ?? 3000),
  host: env.HOST ?? "127.0.0.1",

  /** Master switch for AWS services. Off by default = fully local, free mode. */
  awsEnabled: env.SCAMSHIELD_AWS === "1",
  awsRegion: env.AWS_REGION ?? "us-east-1",

  /** Amazon Nova Lite: fast and inexpensive. Override with any Converse-capable model. */
  bedrockModelId: env.BEDROCK_MODEL_ID ?? "us.amazon.nova-lite-v1:0",

  /** DynamoDB table for incident memory (partition key: householdId, sort key: ts). */
  incidentsTable: env.INCIDENTS_TABLE ?? "scamshield-incidents",

  /** SNS topic for family alerts. Subscribe a family member's email to it. */
  alertTopicArn: env.ALERT_TOPIC_ARN ?? "",

  /** Name shown in alerts, e.g. "Mom" or "Grandma Aigul". */
  protectedPersonName: env.PROTECTED_PERSON_NAME ?? "Grandma",
  trustedContactName: env.TRUSTED_CONTACT_NAME ?? "Aiperi",

  /** Automatically alert family when the verdict is SCAM. */
  autoAlertOnScam: env.AUTO_ALERT_ON_SCAM !== "0",

  defaultHousehold: env.DEFAULT_HOUSEHOLD ?? "demo-household",
};

export type Config = typeof config;
