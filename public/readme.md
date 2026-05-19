
Considered alternatives for connecting Alexa to webhooks
IFTTT's Alexa integrations seem to be fully deprecated. Let's skip IFTTT entirely. Here are the two options that actually work:

Option A: VoiceMonkey (Easiest — no coding)
On your phone, open the Alexa app → More → Skills & Games → search "Voice Monkey" → Enable skill → Link your account at voicemonkey.io

On voicemonkey.io → Dashboard → Manage Monkeys → Create a monkey called morning-pill

Go to Flows → Create a flow:

Trigger: morning-pill monkey
Action: URL Request
URL: https://YOUR-RENDER-URL.onrender.com/api/pills/mark
Method: POST
Headers: Content-Type: application/json
Body: {"slot":"morning"}
In the Alexa app → More → Routines → Create:

When this happens: Voice → say "I took my morning pill"
Add action: Smart Home → select your morning-pill Voice Monkey device → Turn On
Save
Repeat for afternoon-pill and night-pill

Say: "Alexa, I took my morning pill" — done!

Option B: Just use the webpage on your phone (Simplest)
Skip Alexa entirely — bookmark the Render URL on your phone and tap the buttons:

Open https://YOUR-RENDER-URL.onrender.com on your phone browser
Add to Home Screen (Share → Add to Home Screen on iPhone, or menu → Add to Home Screen on Android)
It now looks and acts like an app — tap morning/afternoon/night when you take your pill
Have you deployed to Render yet?
Both options need your server online. If you haven't deployed yet, tell me and I'll walk you through it — it's the first thing we need to get working. If you'd prefer to skip the Alexa integration and just use the webpage as a phone app, that works right now with zero setup by just opening the HTML file.

Which would you like to do?

Claude Opus 4.6 • 3x