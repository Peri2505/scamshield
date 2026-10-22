# Demo video script (under 3:00, English, public on YouTube)

Record the Alexa+ simulator (`npm run dev` → http://127.0.0.1:3000) full screen. Turn system audio on so Alexa's spoken answers are captured. No copyrighted music.

| Time | Screen | Voice-over (you) |
|---|---|---|
| 0:00–0:15 | Black screen, white text: *"Hi, this is Medicare. Your card is expiring. I need your number right now or you'll lose your benefits."* | "This is a real scam script. It works because the person is alone, rushed, and told not to tell anyone." |
| 0:15–0:25 | Simulator idle clock | "I'm Aiperi, a cybersecurity grad student. This is ScamShield, a family fraud firewall for Alexa+." |
| 0:25–1:05 | Click the mic (or the **Medicare call** chip). Red card appears; Alexa speaks. | Let Alexa's voice play. Then: "A clear verdict, why it's a scam in plain words, and the *real* Medicare number, never the caller's." |
| 1:05–1:20 | Point to the **family phone** panel | "Because it's very likely a scam, ScamShield already emailed her granddaughter through Amazon SNS, with no personal numbers in it." |
| 1:20–1:45 | **Medicare call** again → banner "second time this week" | "Scammers call back. ScamShield remembers, using DynamoDB, so the second call is recognized and the risk goes up." |
| 1:45–2:00 | **Pharmacy (real)** → green card | "And it doesn't cry wolf. A normal pharmacy text is fine." |
| 2:00–2:10 | **What happened this week?** → history card | "Family can ask what happened this week." |
| 2:10–2:40 | README architecture diagram, then the MCP log panel | "Under the hood: a self-hosted MCP server on the 2025-11-25 spec over Streamable HTTP, with four tools and an MCP Apps card for Echo Show. Personal numbers are redacted first. Then a scam playbook plus Amazon Bedrock Nova Lite decide, keeping the higher risk." |
| 2:40–2:55 | Your face or the logo | "Every family has someone who answers the phone alone. ScamShield is built to be in the catalog for them." |

**Tips**
- Only name DynamoDB, SNS and Bedrock on camera if you recorded in **AWS mode** (header says so). In local mode, say "remembers" and "alerts family" without naming the services.
- Record at 1080p. Zoom the browser to 110% so the card text is readable on a phone.
- If you've connected AWS, show the header saying **AWS mode** and the real alert email arriving in Gmail. It's the strongest proof for the AWS Builder judges.
- If you've connected it to a real Alexa+ device or test console, put 10 seconds of that right after the hook.
