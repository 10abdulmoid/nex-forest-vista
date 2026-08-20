const express = require('express');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const APP_PORT = process.env.SYNC_PORT || 3002;
const SECRET = process.env.AUTH_JWT_SECRET || 'secret';

const app = express();
app.use(express.json());

app.get('/api/sync/entries', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided' });

  let decoded;
  try {
    decoded = jwt.verify(token, SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });
    let query = supabase.from('entries').select('*').order('created_at', { ascending: true });

    if (decoded.role === 'dm') {
      query = query.eq('dm_name', decoded.username);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error });
    return res.json({ entries: data || [] });
  } catch (err) {
    console.error('Load entries error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

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

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

  const body = req.body || {};
  const record = {
    rotation: Number(body.rotation) || 1,
    area: Number(body.area) || 0,
    maintenance_year: body.maintenanceYear || body.maintenance_year || '2025-26',
    range_name: body.range || body.range_name || '—',
    dm_name: decoded.username || null,
    district: body.district || null,
  };

  try {
    const { data, error } = await supabase.from('entries').insert([record]).select();
    if (error) return res.status(500).json({ error });
    return res.json({ inserted: data });
  } catch (err) {
    return res.status(500).json({ error: 'server error' });
  }
});

app.listen(APP_PORT, () => console.log(`Sync server listening on http://localhost:${APP_PORT}`));
