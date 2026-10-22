import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createApp } from "../src/server.js";

let http: Server;
let client: Client;

beforeAll(async () => {
  http = createApp().listen(0, "127.0.0.1");
  await new Promise((r) => http.once("listening", r));
  const { port } = http.address() as AddressInfo;
  client = new Client({ name: "e2e", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`)));
});

afterAll(async () => {
  await client?.close();
  http?.close();
});

describe("ScamShield MCP server over Streamable HTTP", () => {
  it("negotiates protocol 2025-11-25 and lists tools with a UI resource", async () => {
    expect(client.getServerVersion()?.name).toBe("scamshield");
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(
      ["alert_trusted_family", "check_suspicious_contact", "get_incident_history", "get_official_contact"].sort(),
    );
    const check = tools.find((t) => t.name === "check_suspicious_contact")!;
    expect((check._meta as any)?.ui?.resourceUri).toBe("ui://scamshield/verdict-card.html");
  });

  it("serves the MCP Apps verdict card", async () => {
    const r = await client.readResource({ uri: "ui://scamshield/verdict-card.html" });
    expect(r.contents[0].mimeType).toBe("text/html;profile=mcp-app");
    expect((r.contents[0] as any).text).toContain("ui/initialize");
  });

  it("flags a Medicare scam, alerts family, and remembers repeats", async () => {
    const household_id = `t-${Date.now()}`;
    const first: any = await client.callTool({
      name: "check_suspicious_contact",
      arguments: { description: "Someone from Medicare called asking for my Medicare number right now", household_id },
    });
    expect(first.structuredContent.verdict).toBe("SCAM");
    expect(first.structuredContent.officialContact.phone).toMatch(/633-4227/);
    expect(first.structuredContent.familyAlerted).toBe(true);
    expect(first.structuredContent.repeatNote).toBeNull();

    const second: any = await client.callTool({
      name: "check_suspicious_contact",
      arguments: { description: "Medicare called again, said my card expires, wants my card number", household_id },
    });
    expect(second.structuredContent.repeatNote).toMatch(/second time this week/);

    const hist: any = await client.callTool({ name: "get_incident_history", arguments: { household_id, days: 7 } });
    expect(hist.structuredContent.suspiciousOrScam).toBe(2);
  });

  it("never stores raw ID numbers", async () => {
    const r: any = await client.callTool({
      name: "check_suspicious_contact",
      arguments: { description: "He asked me to read my card 4111 1111 1111 1111 and SSN 123-45-6789", household_id: "privacy" },
    });
    expect(r.structuredContent.redactedText).not.toMatch(/4111|6789/);
  });

  it("looks up official contacts", async () => {
    const r: any = await client.callTool({ name: "get_official_contact", arguments: { organization: "irs" } });
    expect(r.structuredContent.contact.phone).toBe("1-800-829-1040");
  });
});
