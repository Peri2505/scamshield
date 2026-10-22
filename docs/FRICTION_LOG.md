# Friction log (up to +10% judging bonus)

> Each entry: task · steps · expected vs. actual · severity · workaround · suggestion.
> Entries 1–3 happened while building this repo. **Add your own** as you deploy, enable Bedrock and connect to Alexa+, and those will be the most valuable ones. Delete anything that doesn't match your experience.

---

### 1. Using MCP Apps view helpers with a 1.x MCP server
- **Task:** Add an MCP Apps UI resource to a server built on `@modelcontextprotocol/sdk` 1.32.
- **Steps:** `npm i @modelcontextprotocol/ext-apps` (2.0.3) → read README.
- **Expected:** a helper to register the UI resource on the existing server.
- **Actual:** 2.x lists the v2 split packages (`@modelcontextprotocol/server`, `/client`, `/core`) as peers; using it alongside SDK 1.x means two SDK generations in one project.
- **Severity:** Medium
- **Workaround:** Registered the resource with `mimeType: "text/html;profile=mcp-app"` and `_meta.ui.resourceUri` directly, and wrote a small postMessage bridge in the view following the spec (method names from the package's generated schema).
- **Suggestion:** Document a "1.x server + MCP Apps" path, or ship a tiny dependency-free view bridge script.

### 2. Family alerts by SMS
- **Task:** Text a family member when a likely scam is detected.
- **Steps:** Planned `sns:Publish` with `PhoneNumber`.
- **Expected:** SMS delivered.
- **Actual:** US SMS requires a registered origination identity (toll-free or 10DLC) before messages deliver; registration takes days.
- **Severity:** Medium (blocking for a hackathon)
- **Workaround:** SNS topic with an email subscription.
- **Suggestion:** Surface the origination requirement in the SNS Publish docs and console at the point of first SMS use, with a sandbox/test number option.

### 3. Hackathon AWS credits
- **Task:** Get AWS credits for the AWS Builder mini challenge.
- **Steps:** Resources page → credit request.
- **Expected:** Credit code.
- **Actual:** Codes ran out on Oct 7.
- **Severity:** Low
- **Workaround:** AWS Free plan account (credits, no charges beyond them).
- **Suggestion:** Point late entrants straight to the Free plan on the Resources page.

---

### 4. [YOU] Enabling Bedrock model access
- **Task:**
- **Steps:**
- **Expected:**
- **Actual:**
- **Severity:**
- **Workaround:**
- **Suggestion:**

### 5. [YOU] Connecting the MCP server to Alexa+
- **Task:**
- **Steps:**
- **Expected:**
- **Actual:**
- **Severity:**
- **Workaround:**
- **Suggestion:**
