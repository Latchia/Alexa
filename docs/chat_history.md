# Shanmathi's Pill Tracker — Chat History

---

## Request 1: Create the Pill Tracker Webpage

**User:**
> Create me a webpage which has a table for each day tracking the pills we eat for morning, afternoon, night and this can be updated by the alexa or bixby or by a button press in laptop. Make the UI in the webpage lean and title it as Shanmathi's Pill Tracker.

**What was built:**
- `package.json` — Node.js project with Express + CORS
- `server.js` — Express server on port 3456 with API endpoints:
  - `GET /api/pills` — return all pill data
  - `POST /api/pills/toggle` — toggle a slot (needs `date` and `slot`)
  - `POST /api/pills/mark` — mark a slot as taken (date defaults to today)
  - `POST /api/pills/unmark` — unmark a slot
- `public/index.html` — Clean UI with:
  - Weekly view with day cards showing Morning 🌅 / Afternoon ☀️ / Night 🌙 slots
  - Click any slot to toggle taken/pending with toast notification
  - Today's card highlighted with purple accent
  - "All Done ✓" badge when all 3 slots completed
  - Week navigation (prev/next)
  - Auto-refreshes every 10 seconds for external updates

**API examples for Alexa/Bixby:**
```
POST http://<your-ip>:3456/api/pills/mark
{"slot": "morning"}
```

---

## Request 2: How to Use with Alexa

**User:**
> How do I use this with my Alexa device?

**Two approaches provided:**

### Option 1: Alexa Routines + IFTTT (Easiest)
1. Expose server via `npx localtunnel --port 3456`
2. Create IFTTT account at ifttt.com
3. Create applet: Alexa → "Say a specific phrase" → Webhooks → web request to `/api/pills/mark`
4. Say: "Alexa, trigger mark morning pill"

### Option 2: Custom Alexa Skill (More Flexible)
- Create custom skill at developer.amazon.com
- Define `MarkPillIntent` with `{timeOfDay}` slot
- Lambda function calls the server API
- Say: "Alexa, tell pill tracker I took my morning medicine"

**Key requirement:** Server needs a public URL (localtunnel, ngrok, Cloudflare Tunnel, or port forwarding).

---

## Request 3: Cloudflare Tunnel Setup

**User:**
> Make the Cloudflare Tunnel option and setup it easily and permanently.

**Attempted:**
- Checked for `cloudflared` — not installed
- Tried `winget install Cloudflare.cloudflared` — msstore certificate error
- Retried with `--source winget` — installation abandoned
- Tried direct download of `cloudflared-windows-amd64.exe` — user cancelled

**Outcome:** Could not install cloudflared due to office laptop restrictions.

---

## Request 4: Office Laptop with Firewall

**User:**
> Okay I work in my office laptop with a firewall and want to setup this personal project.

**Solution provided — two modes:**

### Local mode (office laptop)
- Updated `public/index.html` to use **localStorage** as fallback
- Just double-click the HTML file — works offline, no server needed
- Shows "💾 Local" badge in header

### Cloud mode (for Alexa integration)
- Updated `server.js` to use `PORT` env variable
- Added `.gitignore`
- Recommended deploying to **Render.com** (free):
  1. Push to GitHub
  2. Create Web Service on Render
  3. Build: `npm install`, Start: `npm start`
  4. Get public URL like `https://pill-tracker-xxxx.onrender.com`
- When opened via Render URL, shows "🟢 Online" badge and syncs

---

## Request 5: IFTTT Alexa Setup — Step by Step

**User:**
> I am stuck at step 3 Connect Alexa via IFTTT.

**Detailed walkthrough provided:**
1. Create IFTTT account
2. Link Amazon Alexa account
3. Create "Morning Pill" applet: Alexa phrase → Webhooks POST to `/api/pills/mark` with `{"slot":"morning"}`
4. Repeat for afternoon and night
5. Test: "Alexa, trigger mark morning pill"

**Pro tip:** Use "Say a phrase with a text ingredient" to handle all 3 slots with 1 applet.

---

## Request 6: Amazon Alexa Not in IFTTT

**User:**
> In IFTTT, tap your profile icon → My services → Search "Amazon Alexa" → Connect, Amazon Alexa is not listed in my services only Alexa Actions by mkZense.

**Explained:** Amazon removed official IFTTT integration. Suggested using "Alexa Actions by mkZense" as replacement with same setup steps.

---

## Request 7: Alexa Actions Doesn't Exist Either

**User:**
> Search "Alexa Actions" → select it doesn't exist.

**Concluded:** IFTTT's Alexa integrations are fully deprecated.

**Alternatives provided:**

### Option A: VoiceMonkey
- Install VoiceMonkey Alexa skill
- Create flows on voicemonkey.io pointing to Render URL
- Create Alexa Routines: "I took my morning pill" → VoiceMonkey trigger

### Option B: Just use webpage on phone
- Bookmark Render URL → Add to Home Screen
- Acts like an app

---

## Request 8: SmartTag2 Button Press Integration

**User:**
> Take the existing workspace and instead of the Alexa based trigger allow the Samsung Galaxy SmartTag2 with the button press updating the Shanmathi pill tracker.

**What was built:**

### New server endpoints (GET-based for URL opening):
- `GET /tap/auto` — auto-detects slot by time (5am–12pm=morning, 12–5pm=afternoon, 5pm–5am=night)
- `GET /tap/morning` — always marks morning
- `GET /tap/afternoon` — always marks afternoon
- `GET /tap/night` — always marks night

Each returns a beautiful confirmation page with ✓ checkmark.

### Updated webpage:
- Added expandable "📱 SmartTag2 Setup Guide" section
- Auto-fills the correct URL based on the current domain

### SmartTag2 setup instructions:
1. SmartThings app → SmartTag2 → Button actions
2. Press → Open link → paste `/tap/auto` URL

---

## Request 9: SmartTag2 "Open Link" Not Available

**User:**
> Set Press (or Double press) → Open link — this open link option is not available.

**Alternative provided:** Samsung Modes and Routines:
1. Settings → Modes and Routines → new routine
2. If: Devices → SmartTag2 → Button pressed
3. Then: Open webpage → enter URL

---

## Request 10: Devices Option Not in Routines

**User:**
> Scroll down → Devices → select your SmartTag2 — this devices option is not available.

**Alternative provided:** SmartTag2 → Launch App → HTTP Shortcuts app:
1. Install HTTP Shortcuts (free, open source)
2. Create shortcut with GET request to `/tap/auto`
3. SmartTag2 → Button actions → Launch app → HTTP Shortcuts

---

## Request 11: Launch App Doesn't Work

**User:**
> Press → Launch app → select HTTP Shortcuts doesn't launch app.

**Final alternatives provided:**

### Option 1: NFC Sticker (Best)
- Buy NTAG215 NFC sticker (₹50–100)
- Write URL with NFC Tools app
- Stick on pill box
- Tap phone on pill box → pill marked

### Option 2: Home Screen Shortcut (Zero hardware)
- Open Render URL in Chrome
- Menu → Add to Home screen → "💊 Pill Taken"
- One tap on home screen → pill marked

### Option 3: Chrome Widget
- Long-press home screen → Widgets → Chrome bookmark widget

**Blocker identified:** All options need the server deployed to Render first.

---

## Current Status
- ✅ Server with full API (`server.js`)
- ✅ Beautiful webpage with localStorage fallback (`public/index.html`)
- ✅ SmartTag2 tap endpoints (`/tap/auto`, `/tap/morning`, etc.)
- ⏳ **Pending: Deploy to Render** — needed for phone/SmartTag/NFC access
- ⏳ **Pending: Choose trigger method** — NFC sticker, home screen shortcut, or Chrome widget
