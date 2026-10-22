# Product feedback (required field)

> Draft based on what came up while building. Lines marked **[YOU]** need your own experience. Judges can tell generic feedback from real feedback, so edit freely.

## Model Context Protocol: TypeScript SDK (`@modelcontextprotocol/sdk` 1.32)
- **Used for:** the MCP server, Streamable HTTP transport, tool/resource registration, and the end-to-end test client.
- **Worked well:** `registerTool` with Zod schemas, `structuredContent`, tool annotations and `_meta` were straightforward. Protocol 2025-11-25 is negotiated out of the box. `createMcpExpressApp` adds DNS-rebinding protection for free. Stateless mode (`sessionIdGenerator: undefined`) is ideal for horizontally scaled hosting.
- **Needs work:** stateless vs. stateful trade-offs (e.g. GET/DELETE handling) are only clear from examples, not the API docs.
- **Would build with it again:** Yes.

## MCP Apps (`@modelcontextprotocol/ext-apps`)
- **Used for:** the verdict card UI resource (`text/html;profile=mcp-app`, `_meta.ui.resourceUri`).
- **Worked well:** the spec is small and readable; a minimal postMessage bridge (`ui/initialize` → `ui/notifications/initialized` → `ui/notifications/tool-result`, plus `tools/call` from the view) fits in ~30 lines.
- **Needs work:** `ext-apps` 2.x declares the v2 MCP SDK packages as peers, while most servers today run SDK 1.x. A note in the README on using the 2.x View helpers with a 1.x server would save time.
- **Would build with it again:** Yes, especially for voice-first devices with screens.

## Alexa+ (MCP integration)
- **Used for:** the target host for ScamShield's tools and card.
- **Onboarding:** **[YOU]** describe connecting your deployed `/mcp` URL: what docs you followed, how long it took, what was unclear.
- **Worked well:** **[YOU]**
- **Needs work:** **[YOU]** e.g. how MCP Apps cards render on Echo Show, how server `instructions` are used, how to test without a device.
- **Would build with it again:** **[YOU]**

## Amazon Bedrock (Converse API, Amazon Nova Lite)
- **Used for:** second-opinion scam classification with a JSON-only system prompt.
- **Worked well:** the Converse API keeps code model-agnostic; switching models is one env var. Nova Lite is fast and inexpensive for short classification prompts.
- **Needs work:** **[YOU]** e.g. enabling model access, and when to use a cross-region inference profile ID (`us.` prefix) vs. a base model ID.
- **Would build with it again:** Yes.

## Amazon DynamoDB
- **Used for:** household incident memory (partition `householdId`, sort `ts`, TTL `expiresAt`).
- **Worked well:** on-demand billing + TTL means zero ops and automatic data expiry, a good privacy default.
- **Would build with it again:** Yes.

## Amazon SNS
- **Used for:** family alerts via email subscription.
- **Worked well:** email subscriptions work instantly with one confirmation click.
- **Needs work:** sending SMS to US numbers requires registering an origination identity first, which isn't obvious from the Publish API and isn't practical in a hackathon timeframe. We used email instead.
- **Would build with it again:** Yes, for email; we'd plan ahead for SMS.

## AWS Free Tier
- **Worked well:** the Free plan's guarantee of no charges beyond credits made it safe for a student to experiment.
- **Needs work:** the hackathon credit codes ran out on Oct 7, so later entrants depend on the general Free plan.
