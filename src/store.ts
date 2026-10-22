import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { config } from "./config.js";
import type { Verdict } from "./analyzer/types.js";

/**
 * Incident memory — what lets ScamShield say "this is the third fake
 * Medicare call this week." Only redacted text is ever stored.
 */
export interface Incident {
  householdId: string;
  ts: string; // ISO timestamp (sort key)
  channel: string;
  verdict: Verdict;
  riskScore: number;
  claimedOrganization?: string;
  redFlagIds: string[];
  redactedText: string;
  familyAlerted: boolean;
}

export interface IncidentStore {
  add(incident: Incident): Promise<void>;
  recent(householdId: string, days?: number): Promise<Incident[]>;
}

class MemoryStore implements IncidentStore {
  private items: Incident[] = [];
  async add(i: Incident) {
    this.items.push(i);
  }
  async recent(householdId: string, days = 30) {
    const since = Date.now() - days * 86_400_000;
    return this.items
      .filter((i) => i.householdId === householdId && Date.parse(i.ts) >= since)
      .sort((a, b) => b.ts.localeCompare(a.ts));
  }
}

class DynamoStore implements IncidentStore {
  private doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.awsRegion }), {
    marshallOptions: { removeUndefinedValues: true },
  });
  async add(i: Incident) {
    // Expire records after 180 days (enable TTL on attribute "expiresAt").
    const expiresAt = Math.floor(Date.now() / 1000) + 180 * 86_400;
    await this.doc.send(new PutCommand({ TableName: config.incidentsTable, Item: { ...i, expiresAt } }));
  }
  async recent(householdId: string, days = 30) {
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const res = await this.doc.send(
      new QueryCommand({
        TableName: config.incidentsTable,
        KeyConditionExpression: "householdId = :h AND ts >= :since",
        ExpressionAttributeValues: { ":h": householdId, ":since": since },
        ScanIndexForward: false,
        Limit: 50,
      }),
    );
    return (res.Items ?? []) as Incident[];
  }
}

/** Falls back to memory if DynamoDB is unreachable, so a demo never dies on stage. */
class ResilientStore implements IncidentStore {
  constructor(
    private primary: IncidentStore,
    private backup: IncidentStore,
  ) {}
  async add(i: Incident) {
    await this.backup.add(i);
    try {
      await this.primary.add(i);
    } catch (e) {
      console.warn("[dynamodb] add failed, kept in memory:", (e as Error).message);
    }
  }
  async recent(h: string, d?: number) {
    try {
      return await this.primary.recent(h, d);
    } catch (e) {
      console.warn("[dynamodb] query failed, using memory:", (e as Error).message);
      return this.backup.recent(h, d);
    }
  }
}

export function createStore(): IncidentStore {
  return config.awsEnabled ? new ResilientStore(new DynamoStore(), new MemoryStore()) : new MemoryStore();
}
