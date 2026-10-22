# Friction log

Each entry: task · steps · expected vs. actual · severity · workaround · suggestion. All of these happened while building ScamShield during the hackathon.

---

### 1. Amazon Bedrock on a brand-new AWS account: daily token quota of 0
- **Task:** Call Amazon Nova Lite through the Bedrock Converse API from the ScamShield server.
- **Steps:** New AWS account on the Free plan → CloudShell setup script → least-privilege IAM user allowed to invoke `us.amazon.nova-lite-v1:0` → first scam check from the app.
- **Expected:** A classification response (models such as Nova are enabled by default).
- **Actual:** a "Too many tokens per day" error on the very first request. The account's daily token quota was effectively 0. Nothing in the Bedrock console or the model catalog shows this before you call the model.
- **Severity:** High (the AI half of the product is unavailable for the demo)
- **Workaround:** A circuit breaker: when Bedrock reports a per-day limit, ScamShield pauses Bedrock for an hour and keeps answering instantly from its rule playbook, so users are still protected. DynamoDB and SNS keep working.
- **Suggestion:** Show the account's current Bedrock token quotas on the model page, and make the error message link to Service Quotas with the exact quota name to request.

### 2. Amazon SNS email alerts silently not delivered
- **Task:** Email a family member when a likely scam is detected.
- **Steps:** Created topic + email subscription → `Publish` from the app → `Publish` returned a MessageId.
- **Expected:** An email in the family member's inbox.
- **Actual:** Nothing arrived. The subscription was still "Pending confirmation" (the confirmation email had been overlooked). `Publish` succeeds even when a topic has zero confirmed subscribers, so the app had no way to tell.
- **Severity:** Medium (looks like a bug in your code)
- **Workaround:** Confirmed the subscription; the setup script tells you to click "Confirm subscription", and the README says so.
- **Suggestion:** Return a warning (or a `ConfirmedSubscriptions` count) from `Publish` when nobody can receive the message, and highlight pending subscriptions on the topic page.

### 3. Family alerts by SMS
- **Task:** Text a family member instead of emailing.
- **Steps:** Planned `sns:Publish` with `PhoneNumber`.
- **Expected:** SMS delivered.
- **Actual:** US SMS requires a registered origination identity (toll-free or 10DLC) before messages deliver; registration takes days.
- **Severity:** Medium (blocking for a hackathon)
- **Workaround:** SNS topic with an email subscription.
- **Suggestion:** Surface the origination requirement in the SNS Publish docs and console at the point of first SMS use, with a sandbox/test number option.

### 4. Using MCP Apps view helpers with a 1.x MCP server
- **Task:** Add an MCP Apps UI resource to a server built on `@modelcontextprotocol/sdk` 1.32.
- **Steps:** `npm i @modelcontextprotocol/ext-apps` (2.0.3) → read README.
- **Expected:** A helper to register the UI resource on the existing server.
- **Actual:** 2.x lists the v2 split packages (`@modelcontextprotocol/server`, `/client`, `/core`) as peers; using it alongside SDK 1.x means two SDK generations in one project.
- **Severity:** Medium
- **Workaround:** Registered the resource with `mimeType: "text/html;profile=mcp-app"` and `_meta.ui.resourceUri` directly, and wrote a small postMessage bridge in the view following the spec.
- **Suggestion:** Document a "1.x server + MCP Apps" path, or ship a tiny dependency-free view bridge script.

### 5. Testing an Alexa+ MCP Apps card without a device
- **Task:** See how the verdict card looks and behaves on an Echo Show.
- **Steps:** Looked for a hosted test console or simulator for Alexa+ MCP integrations.
- **Expected:** A way to preview an MCP Apps card in an Echo Show frame and call tools by voice or text.
- **Actual:** We didn't find one we could use within the hackathon window.
- **Severity:** Medium
- **Workaround:** Built our own Alexa+ simulator: an Echo Show–style MCP Apps host that talks to the same MCP server over Streamable HTTP (included in the repo).
- **Suggestion:** A browser-based Alexa+ test console that renders MCP Apps cards at Echo Show sizes and logs the tool calls.

### 6. Hackathon AWS credits
- **Task:** Get AWS credits for the AWS Builder mini challenge.
- **Steps:** Resources page → credit request.
- **Expected:** Credit code.
- **Actual:** Codes had run out (Oct 7).
- **Severity:** Low
- **Workaround:** AWS Free plan account (credits, no charges beyond them).
- **Suggestion:** Point late entrants straight to the Free plan on the Resources page.
