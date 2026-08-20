const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const APP_PORT = process.env.AUTH_PORT || 3001;
const SECRET = process.env.AUTH_JWT_SECRET || 'c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2';
const TOKEN_EXPIRES = process.env.AUTH_JWT_EXPIRES || '8h';

const app = express();
app.use(cors());
app.use(express.json());
// Log incoming requests for debugging
app.use((req, res, next) => {
  try {
    console.log('REQ', req.method, req.path);
  } catch (e) {}
  next();
});

const plainPath = path.join(__dirname, '..', 'auth', 'creds.plain.json');
const credsPath = path.join(__dirname, '..', 'auth', 'creds.json');

function ensureHashedCreds() {
  if (!fs.existsSync(plainPath)) {
    console.error('Missing auth/creds.plain.json');
    return;
  }

  const plain = JSON.parse(fs.readFileSync(plainPath, 'utf8'));
  const hashed = plain.map((u) => ({
    username: u.username,
    role: u.role,
    name: u.name,
    district: u.district,
    hash: bcrypt.hashSync(u.password, 10),
  }));

  const existing = fs.existsSync(credsPath)
    ? JSON.parse(fs.readFileSync(credsPath, 'utf8'))
    : null;

  const shouldRewrite = !existing || JSON.stringify(existing) !== JSON.stringify(hashed);
  if (!shouldRewrite) return;

  fs.writeFileSync(credsPath, JSON.stringify(hashed, null, 2));
  console.log('Wrote hashed credentials to', credsPath);
}

ensureHashedCreds();

function loadCreds() {
  if (!fs.existsSync(credsPath)) return [];
  return JSON.parse(fs.readFileSync(credsPath, 'utf8'));
}

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const creds = loadCreds();
  const user = creds.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const session = {
    username: user.username,
    role: user.role,
    name: user.name,
    district: user.district,
  };
  const token = jwt.sign({ username: user.username, role: user.role }, SECRET, { expiresIn: TOKEN_EXPIRES });
  res.json({ token, session });
});

app.get('/api/auth/me', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : req.query.token;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, SECRET);
    const creds = loadCreds();
    const user = creds.find((u) => u.username === decoded.username);
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    const session = { username: user.username, role: user.role, name: user.name, district: user.district };
    res.json({ session });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Server-side sync endpoint: accepts a draft entry from a logged-in DM and inserts into Supabase
app.post('/api/sync/entry', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  let decoded;
  try {
    decoded = jwt.verify(token, SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const creds = loadCreds();
  const user = creds.find((u) => u.username === decoded.username);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  const body = req.body || {};
  const rotation = Number(body.rotation) || 1;
  const area = Number(body.area) || 0;
  const maintenanceYear = body.maintenanceYear || body.maintenance_year || '2025-26';
  const rangeName = body.range || body.range_name || '—';

  // initialize Supabase service-role client
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return res.status(500).json({ error: 'Supabase service credentials not configured on server' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

  const record = {
    rotation,
    area,
    maintenance_year: maintenanceYear,
    range: rangeName,
    dm_name: user.name || null,
    district: user.district || null,
  };

  try {
    const { data, error } = await supabase.from('entries').insert([record]).select();
    if (error) {
      console.error('Supabase insert error', error);
      return res.status(500).json({ error: 'Failed to insert entry', detail: error });
    }
    return res.json({ inserted: data });
  } catch (err) {
    console.error('Sync error', err);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
});

// Debug: list registered routes for verification
try {
  const routes = (app._router && app._router.stack)
    ? app._router.stack.filter((r) => r.route).map((r) => ({ path: r.route.path, methods: r.route.methods }))
    : [];
  console.log('Registered routes:', JSON.stringify(routes, null, 2));
} catch (e) {
  console.error('Failed to list routes', e);
}

app.listen(APP_PORT, () => console.log(`Auth server listening on http://localhost:${APP_PORT}`));
