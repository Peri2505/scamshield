import { timingSafeEqual } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { config } from "./config.js";
import { createScamShieldServer } from "./mcp.js";
import { localOutbox } from "./notify.js";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, "..", "public");

export function createApp() {
  const allowedHosts = process.env.ALLOWED_HOSTS?.split(",").map((h) => h.trim()).filter(Boolean);
  const app = createMcpExpressApp({ host: config.host, ...(allowedHosts?.length ? { allowedHosts } : {}) });

  // Optional shared-secret auth for the MCP endpoint (set SCAMSHIELD_API_KEY in production).
  const apiKey = process.env.SCAMSHIELD_API_KEY;
  const requireKey: express.RequestHandler = (req, res, next) => {
    if (!apiKey) return next();
    const given = Buffer.from((req.header("authorization") ?? "").replace(/^Bearer\s+/i, ""));
    const want = Buffer.from(apiKey);
    if (given.length === want.length && timingSafeEqual(given, want)) return next();
    res.status(401).json({ jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" }, id: null });
  };

  // ── MCP endpoint: Streamable HTTP, stateless (a fresh server per request). ──
  // Stateless keeps it horizontally scalable (Lambda / App Runner); incident
  // memory lives in DynamoDB, not in the HTTP session.
  app.post("/mcp", requireKey, async (req, res) => {
    const server = createScamShieldServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("[mcp] error", err);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
      }
    }
  });
  const methodNotAllowed: express.RequestHandler = (_req, res) => {
    res.status(405).set("Allow", "POST").json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed (stateless server)." },
      id: null,
    });
  };
  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);

  // ── Demo helpers (simulated Alexa+ experience) ──
  app.get("/health", (_req, res) => {
    res.json({ ok: true, mode: config.awsEnabled ? "aws" : "local", bedrockModel: config.awsEnabled ? config.bedrockModelId : null });
  });
  app.get("/demo/outbox", (_req, res) => {
    res.json({ mode: config.awsEnabled && config.alertTopicArn ? "sns" : "local-outbox", items: localOutbox.slice(0, 10) });
  });
  app.use("/", express.static(publicDir, { index: "index.html" }));

  return app;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  createApp().listen(config.port, config.host, () => {
    console.log(`🛡️  ScamShield MCP server`);
    console.log(`   MCP endpoint : http://${config.host}:${config.port}/mcp  (Streamable HTTP, spec 2025-11-25)`);
    console.log(`   Demo         : http://${config.host}:${config.port}/`);
    console.log(`   Mode         : ${config.awsEnabled ? `AWS (Bedrock ${config.bedrockModelId}, DynamoDB, SNS)` : "local (free, no AWS calls)"}`);
  });
}
