# Devpost submission text (copy into the form, then edit in your own voice)

**Project name:** ScamShield

**Tagline (≤ 200 chars):** A family fraud firewall for Alexa+. Say "Alexa, is this a scam?" and get a calm verdict, the real number to call, and a heads-up to your family.

**Track:** Alexa+ (self-hosted MCP server, spec 2025-11-25, Streamable HTTP)
**Mini challenge:** AWS Builder (Amazon Bedrock, Amazon DynamoDB, Amazon SNS)

---

## Inspiration

<!-- Make this personal. One or two true sentences about someone in your family is worth more than any statistic. -->
I'm starting a Master's in Cybersecurity, and the attack that worries me most isn't a zero-day. It's a phone call to an older relative from "Medicare," with a calm voice, a deadline, and a request for a card number. Those scripts are well documented, yet they still work because the person is alone, rushed, and told not to tell anyone. I wanted the moment of doubt, "is this real?", to have someone to ask. Fraud losses reported to the FTC by adults 60+ grew from about $600 million in 2020 to $2.4 billion in 2024.

## What it does

ScamShield is an Alexa+ integration that protects older adults from phone, text and email scams.

- **Ask in your own words:** "Alexa, a man from Medicare called and wants my number."
- **Get a clear verdict:** red / yellow / green on Echo Show (an MCP Apps card in large print), and a short calm answer by voice.
- **Get the real number:** ScamShield gives the verified official contact (Medicare, Social Security, IRS, your bank…), never the caller's number.
- **Family is told automatically** on a likely scam, by email through Amazon SNS, with no personal numbers in the message.
- **It remembers:** the same "Medicare" calling again tomorrow is recognized ("this is the third time this week"), and the risk goes up.
- **History on request:** "What suspicious calls did I get this week?"

## How we built it

- **MCP server** in TypeScript with the official MCP SDK: Streamable HTTP transport, protocol **2025-11-25**, stateless so it scales horizontally. Four tools, server `instructions` that guide the Alexa+ model, and tool annotations.
- **MCP Apps** verdict card (`ui://scamshield/verdict-card.html`, `text/html;profile=mcp-app`) linked via `_meta.ui.resourceUri`. The card implements the `ui/initialize` handshake, renders `tool-result` notifications, and its "Tell my family" button calls a server tool back through the host.
- **Hybrid analysis:** a deterministic, explainable scam playbook (15 tactics + 5 supporting signals drawn from FTC/AARP/FBI guidance) plus **Amazon Bedrock** (Converse API, Amazon Nova Lite) as a second opinion. ScamShield keeps the higher risk score.
- **Privacy first:** SSNs, card/account numbers, Medicare IDs and emails are redacted before reaching Bedrock, DynamoDB, logs or alerts.
- **Amazon DynamoDB** stores incident memory per household (on-demand, 180-day TTL). **Amazon SNS** delivers family alerts by email.
- **Resilience:** every AWS dependency has a local fallback, so the experience never breaks.
- **Alexa+ simulator** web app: an Echo Show–style screen that acts as an MCP Apps host, with voice input (Web Speech API), spoken responses, a "family phone" panel, and a live log of MCP calls.
- **119 automated tests**, including end-to-end tests over Streamable HTTP with the official MCP client and a **detection benchmark of 96 real-world messages** (54 scams, 42 ordinary): all scams flagged and no false alarms; 16/18 with zero false alarms on a final batch written after tuning.

## Challenges we ran into

- **Designing for the real user.** Every string had to be readable aloud to an 80-year-old: no jargon, one action per line, and never "verify your identity."
- **False alarms vs. misses.** A real bank call shouldn't trigger panic, so naming an organization alone adds no risk; it only counts alongside a real tactic.
- **MCP Apps SDK versions.** The latest `ext-apps` package targets the v2 MCP SDK packages, while our server uses the stable 1.x SDK. We implemented the small postMessage bridge directly from the spec, which works with any compliant host.
- **SMS vs. email alerts.** US SMS through SNS needs a registered origination number, so for the hackathon we used SNS email subscriptions, which work instantly.

## Accomplishments that we're proud of

- A complete loop: voice → MCP → AI + rules → memory → family alert → visual card, working end to end.
- A privacy design a security reviewer would sign off on: redaction before anything leaves the process.
- An interface that feels calm rather than alarming.

## What we learned

<!-- Fill in honestly after you've deployed and connected it. -->
- How MCP tool design changes when the "user" of the tool is an LLM speaking to an older adult: the `spoken` field and server instructions mattered as much as the logic.
- MCP Apps makes rich, accessible UI possible for voice-first devices.

## What's next for ScamShield

- Proactive Echo Show check-ins after a flagged week.
- A caregiver view in Alexa+ for the family member.
- Playbook updates from new FTC alerts within days.
- A Ring integration for door-to-door scams.
- A path to the Alexa+ catalog so any family can enable it.

## Built with

typescript · node.js · model-context-protocol · mcp-apps · alexa-plus · amazon-bedrock · amazon-nova · amazon-dynamodb · amazon-sns · aws-sdk · express · vitest

---

## AWS Builder: required details

**Services used and how:**
- **Amazon Bedrock** (Converse API, `us.amazon.nova-lite-v1:0`): second-opinion scam classification on redacted text → `src/analyzer/bedrock.ts`.
- **Amazon DynamoDB** (on-demand, TTL): per-household incident memory that powers repeat-attempt detection and history → `src/store.ts`.
- **Amazon SNS** (topic + email subscription): automatic family alerts → `src/notify.ts`.
- Provisioning script: `infra/setup-aws.sh`. Container deploy: `Dockerfile` (App Runner / ECS).

## Built during the submission window

<!-- Required if anything existed before. If you started from zero during the hackathon, say so plainly. -->
All code in this repository was written during the hackathon submission window.
