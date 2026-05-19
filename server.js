const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3456;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- DB structure ----
// {
//   profiles: { "id": { name: "Shanmathi", config: { morning: [...], afternoon: [...], night: [...] } } },
//   pills: { "id": { "2026-05-20": { morning: { "TabletA": true }, ... } } }
// }
function loadDB() {
  if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  return { profiles: {}, pills: {} };
}
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function todayKey() { return new Date().toISOString().slice(0, 10); }
const VALID_SLOTS = ['morning', 'afternoon', 'night'];

function sanitizeId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
}

// ---- GET /api/profiles ----
app.get('/api/profiles', (req, res) => {
  const db = loadDB();
  const list = Object.entries(db.profiles).map(([id, p]) => ({ id, name: p.name }));
  res.json(list);
});

// ---- POST /api/profiles — create profile ----
app.post('/api/profiles', (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const trimmed = name.trim().slice(0, 50);
  const id = sanitizeId(trimmed) || 'user';
  const db = loadDB();
  if (db.profiles[id]) {
    return res.status(409).json({ error: 'Profile already exists', id });
  }
  db.profiles[id] = {
    name: trimmed,
    config: { morning: [], afternoon: [], night: [] }
  };
  db.pills[id] = {};
  saveDB(db);
  res.json({ id, name: trimmed });
});

// ---- DELETE /api/profiles/:id ----
app.delete('/api/profiles/:id', (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  if (!db.profiles[id]) return res.status(404).json({ error: 'Profile not found' });
  delete db.profiles[id];
  delete db.pills[id];
  saveDB(db);
  res.json({ message: 'Deleted', id });
});

// ---- GET /api/pills/:profileId ----
app.get('/api/pills/:profileId', (req, res) => {
  const db = loadDB();
  res.json(db.pills[req.params.profileId] || {});
});

// ---- GET /api/config/:profileId ----
app.get('/api/config/:profileId', (req, res) => {
  const db = loadDB();
  const profile = db.profiles[req.params.profileId];
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(profile.config);
});

// ---- POST /api/config/:profileId — save medicine list ----
app.post('/api/config/:profileId', (req, res) => {
  const cfg = req.body;
  if (!cfg || typeof cfg !== 'object') return res.status(400).json({ error: 'Invalid config' });
  for (const slot of VALID_SLOTS) {
    if (cfg[slot] && !Array.isArray(cfg[slot])) return res.status(400).json({ error: `${slot} must be an array` });
  }
  const db = loadDB();
  if (!db.profiles[req.params.profileId]) return res.status(404).json({ error: 'Profile not found' });
  db.profiles[req.params.profileId].config = cfg;
  saveDB(db);
  res.json({ message: 'Config saved', config: cfg });
});

// ---- POST /api/pills/:profileId/toggleMed ----
app.post('/api/pills/:profileId/toggleMed', (req, res) => {
  const { date, slot, med, taken } = req.body;
  const pid = req.params.profileId;
  if (!date || !slot || !med) return res.status(400).json({ error: 'date, slot, and med are required' });
  if (!VALID_SLOTS.includes(slot)) return res.status(400).json({ error: 'Invalid slot' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });

  const db = loadDB();
  if (!db.pills[pid]) db.pills[pid] = {};
  if (!db.pills[pid][date]) db.pills[pid][date] = {};
  if (typeof db.pills[pid][date][slot] !== 'object' || db.pills[pid][date][slot] === null) {
    db.pills[pid][date][slot] = {};
  }
  db.pills[pid][date][slot][med] = typeof taken === 'boolean' ? taken : !db.pills[pid][date][slot][med];
  saveDB(db);
  res.json({ date, slot, med, taken: db.pills[pid][date][slot][med] });
});

// ---- SmartTag2 tap endpoints ----
function autoSlot() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'night';
}

function handleTap(profileId, slot, res) {
  const date = todayKey();
  const db = loadDB();
  const profile = db.profiles[profileId];
  if (!profile) {
    return res.status(404).send('Profile not found. Check your SmartTag URL.');
  }
  const meds = profile.config[slot] || [];
  if (!db.pills[profileId]) db.pills[profileId] = {};
  if (!db.pills[profileId][date]) db.pills[profileId][date] = {};
  if (typeof db.pills[profileId][date][slot] !== 'object' || db.pills[profileId][date][slot] === null) {
    db.pills[profileId][date][slot] = {};
  }

  const alreadyAll = meds.every(m => db.pills[profileId][date][slot][m]);
  meds.forEach(med => { db.pills[profileId][date][slot][med] = true; });
  saveDB(db);

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
    .name{font-size:0.9rem;color:#6c5ce7;font-weight:600;margin-bottom:4px}
    p{font-size:0.8rem;color:#888;margin-bottom:14px}
    ul{list-style:none;text-align:left;padding:0 10px;color:#2d3436;margin-bottom:14px}
    .note{font-size:0.72rem;color:#b2bec3}
    a{color:#6c5ce7;text-decoration:none;font-weight:600;font-size:0.85rem}
  </style>
</head>
<body>
  <div class="card">
    <div class="check">✓</div>
    <div class="icon">${slotIcon}</div>
    <div class="slot">${slot}</div>
    <div class="name">${profile.name}</div>
    <h1>${status}</h1>
    <p>${date}</p>
    <ul>${medList || '<li>No medicines configured</li>'}</ul>
    <a href="/">Open Full Tracker →</a>
    <div class="note" style="margin-top:14px">You can close this tab now</div>
  </div>
</body>
</html>`);
}

// /tap/:profileId/auto, /tap/:profileId/morning, etc.
app.get('/tap/:profileId/auto', (req, res) => handleTap(req.params.profileId, autoSlot(), res));
app.get('/tap/:profileId/morning', (req, res) => handleTap(req.params.profileId, 'morning', res));
app.get('/tap/:profileId/afternoon', (req, res) => handleTap(req.params.profileId, 'afternoon', res));
app.get('/tap/:profileId/night', (req, res) => handleTap(req.params.profileId, 'night', res));

app.listen(PORT, () => {
  console.log(`"Howdy" Mr.Pill-Tracker running at http://localhost:${PORT}`);
});
