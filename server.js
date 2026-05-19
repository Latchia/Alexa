const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3456;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: load data
function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  }
  return {};
}

// Helper: save data
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Helper: today's date string
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// GET /api/pills — return all pill data
app.get('/api/pills', (req, res) => {
  res.json(loadData());
});

// POST /api/pills/toggle — toggle a specific slot
// Body: { "date": "2026-04-28", "slot": "morning" }
app.post('/api/pills/toggle', (req, res) => {
  const { date, slot } = req.body;
  if (!date || !slot) {
    return res.status(400).json({ error: 'date and slot are required' });
  }
  const validSlots = ['morning', 'afternoon', 'night'];
  if (!validSlots.includes(slot)) {
    return res.status(400).json({ error: 'slot must be morning, afternoon, or night' });
  }
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  }

  const data = loadData();
  if (!data[date]) {
    data[date] = { morning: false, afternoon: false, night: false };
  }
  data[date][slot] = !data[date][slot];
  saveData(data);
  res.json({ date, slot, taken: data[date][slot] });
});

// POST /api/pills/mark — mark a slot as taken (for Alexa / Bixby)
// Body: { "date": "2026-04-28", "slot": "morning" }  (date is optional, defaults to today)
app.post('/api/pills/mark', (req, res) => {
  let { date, slot } = req.body;
  date = date || todayKey();
  if (!slot) {
    return res.status(400).json({ error: 'slot is required (morning, afternoon, or night)' });
  }
  const validSlots = ['morning', 'afternoon', 'night'];
  if (!validSlots.includes(slot)) {
    return res.status(400).json({ error: 'slot must be morning, afternoon, or night' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  }

  const data = loadData();
  if (!data[date]) {
    data[date] = { morning: false, afternoon: false, night: false };
  }
  data[date][slot] = true;
  saveData(data);
  res.json({ message: `Marked ${slot} pill as taken for ${date}`, date, slot, taken: true });
});

// POST /api/pills/unmark — mark a slot as NOT taken
app.post('/api/pills/unmark', (req, res) => {
  let { date, slot } = req.body;
  date = date || todayKey();
  if (!slot) {
    return res.status(400).json({ error: 'slot is required (morning, afternoon, or night)' });
  }
  const validSlots = ['morning', 'afternoon', 'night'];
  if (!validSlots.includes(slot)) {
    return res.status(400).json({ error: 'slot must be morning, afternoon, or night' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  }

  const data = loadData();
  if (!data[date]) {
    data[date] = { morning: false, afternoon: false, night: false };
  }
  data[date][slot] = false;
  saveData(data);
  res.json({ message: `Unmarked ${slot} pill for ${date}`, date, slot, taken: false });
});

// ---- SmartTag2 tap endpoints (GET-based, opens in phone browser) ----

// Auto-detect slot based on time of day
function autoSlot() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'night';
}

// Shared handler for tap endpoints
function handleTap(slot, res) {
  const date = todayKey();
  const data = loadData();
  if (!data[date]) {
    data[date] = { morning: false, afternoon: false, night: false };
  }
  const alreadyTaken = data[date][slot];
  data[date][slot] = true;
  saveData(data);

  const slotIcon = { morning: '🌅', afternoon: '☀️', night: '🌙' }[slot];
  const status = alreadyTaken ? 'Already marked' : 'Marked as taken';

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pill Marked!</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f0f2f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 20px; padding: 40px 32px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 340px; width: 90vw; }
    .icon { font-size: 3rem; margin-bottom: 12px; }
    .check { font-size: 4rem; color: #00b894; margin-bottom: 8px; }
    h1 { font-size: 1.2rem; color: #2d3436; margin-bottom: 4px; }
    p { font-size: 0.85rem; color: #888; margin-bottom: 20px; }
    .slot { display: inline-block; background: #6c5ce7; color: #fff; padding: 4px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }
    .note { font-size: 0.75rem; color: #b2bec3; }
    a { color: #6c5ce7; text-decoration: none; font-weight: 600; font-size: 0.85rem; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">✓</div>
    <div class="icon">${slotIcon}</div>
    <div class="slot">${slot}</div>
    <h1>${status}</h1>
    <p>${date}</p>
    <a href="/">Open Full Tracker →</a>
    <div class="note" style="margin-top:16px">You can close this tab now</div>
  </div>
</body>
</html>`);
}

// GET /tap/auto — auto-detect morning/afternoon/night based on current time
app.get('/tap/auto', (req, res) => handleTap(autoSlot(), res));

// GET /tap/morning, /tap/afternoon, /tap/night — mark a specific slot
app.get('/tap/morning', (req, res) => handleTap('morning', res));
app.get('/tap/afternoon', (req, res) => handleTap('afternoon', res));
app.get('/tap/night', (req, res) => handleTap('night', res));

app.listen(PORT, () => {
  console.log(`Shanmathi's Pill Tracker running at http://localhost:${PORT}`);
});
