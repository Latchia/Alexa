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

app.listen(PORT, () => {
  console.log(`Shanmathi's Pill Tracker running at http://localhost:${PORT}`);
});
