const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3456;
const DATA_FILE = path.join(__dirname, 'data.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- File helpers ----
function loadJSON(file, fallback) {
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  return fallback;
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function loadData() { return loadJSON(DATA_FILE, {}); }
function saveData(d) { saveJSON(DATA_FILE, d); }
function loadConfig() {
  return loadJSON(CONFIG_FILE, {
    morning: ['Tablet A', 'Tablet B'],
    afternoon: ['Tablet C'],
    night: ['Tablet D', 'Tablet E']
  });
}
function saveConfigFile(c) { saveJSON(CONFIG_FILE, c); }

function todayKey() { return new Date().toISOString().slice(0, 10); }
const VALID_SLOTS = ['morning', 'afternoon', 'night'];

// ---- GET /api/pills ----
app.get('/api/pills', (req, res) => res.json(loadData()));

// ---- GET /api/config ----
app.get('/api/config', (req, res) => res.json(loadConfig()));

// ---- POST /api/config — save medicine list ----
app.post('/api/config', (req, res) => {
  const cfg = req.body;
  if (!cfg || typeof cfg !== 'object') return res.status(400).json({ error: 'Invalid config' });
  // Validate structure
  for (const slot of VALID_SLOTS) {
    if (cfg[slot] && !Array.isArray(cfg[slot])) return res.status(400).json({ error: `${slot} must be an array` });
  }
  saveConfigFile(cfg);
  res.json({ message: 'Config saved', config: cfg });
});

// ---- POST /api/pills/toggleMed — toggle individual medicine ----
app.post('/api/pills/toggleMed', (req, res) => {
  const { date, slot, med, taken } = req.body;
  if (!date || !slot || !med) return res.status(400).json({ error: 'date, slot, and med are required' });
  if (!VALID_SLOTS.includes(slot)) return res.status(400).json({ error: 'Invalid slot' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });

  const data = loadData();
  if (!data[date]) data[date] = {};
  // Migrate old boolean format to object format
  if (typeof data[date][slot] !== 'object' || data[date][slot] === null) {
    data[date][slot] = {};
  }
  data[date][slot][med] = typeof taken === 'boolean' ? taken : !data[date][slot][med];
  saveData(data);
  res.json({ date, slot, med, taken: data[date][slot][med] });
});

// ---- POST /api/pills/markSlot — mark ALL medicines in a slot as taken ----
app.post('/api/pills/markSlot', (req, res) => {
  let { date, slot } = req.body;
  date = date || todayKey();
  if (!slot) return res.status(400).json({ error: 'slot is required' });
  if (!VALID_SLOTS.includes(slot)) return res.status(400).json({ error: 'Invalid slot' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });

  const config = loadConfig();
  const meds = config[slot] || [];
  const data = loadData();
  if (!data[date]) data[date] = {};
  if (typeof data[date][slot] !== 'object' || data[date][slot] === null) {
    data[date][slot] = {};
  }
  meds.forEach(med => { data[date][slot][med] = true; });
  saveData(data);
  res.json({ message: `All ${slot} medicines marked as taken`, date, slot, meds });
});

// ---- SmartTag2 tap endpoints ----
function autoSlot() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'night';
}

function handleTap(slot, res) {
  const date = todayKey();
  const config = loadConfig();
  const meds = config[slot] || [];
  const data = loadData();
  if (!data[date]) data[date] = {};
  if (typeof data[date][slot] !== 'object' || data[date][slot] === null) {
    data[date][slot] = {};
  }

  const alreadyAll = meds.every(m => data[date][slot][m]);
  meds.forEach(med => { data[date][slot][med] = true; });
  saveData(data);

  const slotIcon = { morning: '🌅', afternoon: '☀️', night: '🌙' }[slot];
  const status = alreadyAll ? 'Already marked' : 'All marked as taken';
  const medList = meds.map(m => `<li style="padding:3px 0;font-size:0.85rem">✓ ${m}</li>`).join('');

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pill Marked!</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#f0f2f5;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{background:#fff;border-radius:20px;padding:36px 28px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:340px;width:90vw}
    .check{font-size:3.5rem;color:#00b894;margin-bottom:6px}
    .icon{font-size:2.5rem;margin-bottom:8px}
    .slot{display:inline-block;background:#6c5ce7;color:#fff;padding:4px 16px;border-radius:20px;font-size:0.85rem;font-weight:600;text-transform:uppercase;margin-bottom:12px}
    h1{font-size:1.1rem;color:#2d3436;margin-bottom:4px}
    p{font-size:0.8rem;color:#888;margin-bottom:14px}
    ul{list-style:none;text-align:left;padding:0 10px;color:#2d3436;margin-bottom:14px}
    .note{font-size:0.72rem;color:#b2bec3}
    a{color:#6c5ce7;text-decoration:none;font-weight:600;font-size:0.85rem}
    a:hover{text-decoration:underline}
  </style>
</head>
<body>
  <div class="card">
    <div class="check">✓</div>
    <div class="icon">${slotIcon}</div>
    <div class="slot">${slot}</div>
    <h1>${status}</h1>
    <p>${date}</p>
    <ul>${medList || '<li>No medicines configured</li>'}</ul>
    <a href="/">Open Full Tracker →</a>
    <div class="note" style="margin-top:14px">You can close this tab now</div>
  </div>
</body>
</html>`);
}

app.get('/tap/auto', (req, res) => handleTap(autoSlot(), res));
app.get('/tap/morning', (req, res) => handleTap('morning', res));
app.get('/tap/afternoon', (req, res) => handleTap('afternoon', res));
app.get('/tap/night', (req, res) => handleTap('night', res));

app.listen(PORT, () => {
  console.log(`Shanmathi's Pill Tracker running at http://localhost:${PORT}`);
});
