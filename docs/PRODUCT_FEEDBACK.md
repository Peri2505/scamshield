# Product feedback

## Model Context Protocol: TypeScript SDK (`@modelcontextprotocol/sdk` 1.32)
- **Used for:** the MCP server, Streamable HTTP transport, tool/resource registration, and the end-to-end test client.
- **Worked well:** `registerTool` with Zod schemas, `structuredContent`, tool annotations and `_meta` were straightforward. Protocol 2025-11-25 is negotiated out of the box. `createMcpExpressApp` adds DNS-rebinding protection for free. Stateless mode is ideal for horizontally scaled hosting.
- **Needs work:** stateless vs. stateful trade-offs (e.g. GET/DELETE handling) are only clear from examples, not the API docs.
- **Onboarding:** fast: a working server and an end-to-end test with the official client in under an hour.
- **Would build with it again:** Yes.

## MCP Apps (`@modelcontextprotocol/ext-apps`)
- **Used for:** the verdict card UI resource (`text/html;profile=mcp-app`, `_meta.ui.resourceUri`).
- **Worked well:** the spec is small and readable; a minimal postMessage bridge (`ui/initialize` → `ui/notifications/initialized` → `ui/notifications/tool-result`, plus `tools/call` from the view) fits in about 30 lines.
- **Needs work:** `ext-apps` 2.x declares the v2 MCP SDK packages as peers, while most servers today run SDK 1.x. A note on using it with a 1.x server would save time.
- **Onboarding:** reading the spec was easier than the package README for a 1.x server.
- **Would build with it again:** Yes, especially for voice-first devices with screens.

## Alexa+ (MCP integration)
- **Used for:** the target host for ScamShield's tools and card.
- **Worked well:** building on open MCP means the same server works with any MCP host, and server `instructions` plus a `spoken` field let us shape exactly how Alexa talks to an older adult.
- **Needs work:** we couldn't find a hosted way to preview an MCP Apps card at Echo Show sizes or exercise tools without a device, so we built our own simulator host.
- **Onboarding:** the MCP side is familiar to anyone who has built an MCP server; device-side testing is where we lost time.
- **Would build with it again:** Yes. Voice is the most natural interface for the people ScamShield protects.

## Amazon Bedrock (Converse API, Amazon Nova Lite)
- **Used for:** second-opinion scam classification on redacted text, with a JSON-only system prompt.
- **Worked well:** the Converse API keeps code model-agnostic; switching models is one environment variable. Nova Lite is fast and inexpensive for short classification prompts.
- **Needs work:** a brand-new account hit `Too many tokens per day` on the first request; the quota isn't visible on the model page. The choice between a cross-region inference profile ID (`us.` prefix) and a base model ID also needs a clearer explanation.
- **Onboarding:** the API itself was quick; quotas were the blocker. We added a circuit breaker so the product keeps working.
- **Would build with it again:** Yes.

## Amazon DynamoDB
- **Used for:** household incident memory (partition `householdId`, sort `ts`, TTL `expiresAt`), which powers repeat-call detection.
- **Worked well:** on-demand billing plus TTL means zero ops and automatic data expiry, a good privacy default.
- **Onboarding:** one CLI command in CloudShell.
- **Would build with it again:** Yes.

## Amazon SNS
- **Used for:** family alerts via email subscription.
- **Worked well:** email alerts arrive within seconds once the subscription is confirmed.
- **Needs work:** `Publish` succeeds silently when a subscription is still pending, and US SMS requires an origination identity first.
- **Onboarding:** easy, apart from the pending-confirmation trap.
- **Would build with it again:** Yes, for email; we'd plan ahead for SMS.

## AWS CloudShell, IAM and the Free plan
- **Worked well:** CloudShell's "Upload file" made setup possible with no local AWS tools; one script creates the table, topic and a least-privilege IAM user. The Free plan's guarantee of no charges beyond credits made it safe for a student to experiment.
- **Needs work:** the hackathon credit codes ran out on Oct 7, so later entrants depend on the general Free plan.
