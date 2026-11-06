import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
app.use(express.json({ limit: '25mb' }));

// Never cache API responses across browsers/proxies
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ztqwyutqsuslkpsmtbkt.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cXd5dXRxc3VzbGtwc210Ymt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMTQ4ODUsImV4cCI6MjEwNzg5MDg4NX0.wjVFJvj4SEEcjSR27HhknxV34gQ1DA-tWGNwlsxFya8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- API PROXY ENDPOINTS (Hides Supabase domain & credentials from browser inspect element) ---

// 1. OFFICERS
app.get('/api/officers', async (req, res) => {
  try {
    const { data, error } = await supabase.from('officers').select('*').order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.post('/api/officers', async (req, res) => {
  try {
    const officer = req.body;
    const { data, error } = await supabase.from('officers').insert([officer]).select();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data: data?.[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.delete('/api/officers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('officers').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// 2. MEMOS
app.get('/api/memos', async (req, res) => {
  try {
    const { data, error } = await supabase.from('memos').select('*').order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.post('/api/memos', async (req, res) => {
  try {
    const memo = req.body;
    const { data, error } = await supabase.from('memos').insert([memo]).select();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data: data?.[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.put('/api/memos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const { data, error } = await supabase.from('memos').update(updateData).eq('id', id).select();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data: data?.[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.delete('/api/memos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('memos').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// 3. EVENTS
app.get('/api/events', async (req, res) => {
  try {
    const { data, error } = await supabase.from('events').select('*').order('date', { ascending: true });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const event = req.body;
    const { data, error } = await supabase.from('events').insert([event]).select();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data: data?.[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.put('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const { data, error } = await supabase.from('events').update(updateData).eq('id', id).select();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data: data?.[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// 4. ANNOUNCEMENTS
app.get('/api/announcements', async (req, res) => {
  try {
    const { data, error } = await supabase.from('announcements').select('*');
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.post('/api/announcements', async (req, res) => {
  try {
    const item = req.body;
    const { data, error } = await supabase.from('announcements').insert([item]).select();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data: data?.[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.put('/api/announcements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const { data, error } = await supabase.from('announcements').update(updateData).eq('id', id).select();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data: data?.[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.delete('/api/announcements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// 5. DUTIES
app.get('/api/duties', async (req, res) => {
  try {
    const { data, error } = await supabase.from('duties').select('*');
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.post('/api/duties', async (req, res) => {
  try {
    const duty = req.body;
    const { data, error } = await supabase.from('duties').upsert([duty]).select();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data: data?.[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// 6. DAILY ACTIVITIES
app.get('/api/daily-activities', async (req, res) => {
  try {
    const { data, error } = await supabase.from('daily_activities').select('*');
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.post('/api/daily-activities', async (req, res) => {
  try {
    const activity = req.body;
    const { data, error } = await supabase.from('daily_activities').upsert([activity]).select();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data: data?.[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.put('/api/daily-activities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const { data, error } = await supabase.from('daily_activities').update(updateData).eq('id', id).select();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data: data?.[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.delete('/api/daily-activities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('daily_activities').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// 7. STANDING ORDERS
app.get('/api/standing-orders', async (req, res) => {
  try {
    const { data, error } = await supabase.from('standing_orders').select('*').order('sort_order', { ascending: true });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.post('/api/standing-orders', async (req, res) => {
  try {
    const { orders } = req.body; // array of strings
    if (!Array.isArray(orders)) return res.status(400).json({ error: 'orders must be an array' });

    // Clear existing and replace with new ordered list
    await supabase.from('standing_orders').delete().neq('id', 'placeholder_non_existent');
    const rows = orders.map((text: string, idx: number) => ({
      id: `ord-${idx + 1}-${Date.now()}`,
      order_text: text,
      sort_order: idx + 1,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase.from('standing_orders').insert(rows).select();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// 8. BOARD METADATA (Uniforms, Fleet Roster, Total Strength)
app.get('/api/board-meta', async (req, res) => {
  try {
    const { data, error } = await supabase.from('board_meta').select('*');
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.post('/api/board-meta', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'key is required' });
    const { data, error } = await supabase.from('board_meta').upsert([{ key, value, updated_at: new Date().toISOString() }]).select();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data: data?.[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// 6. MEMO FILE UPLOAD PROXY
app.post('/api/memos/upload-file', async (req, res) => {
  try {
    const { fileName, fileData, memoNumber, fileFormat } = req.body;
    if (!fileData) return res.status(400).json({ error: 'No file data provided' });

    const buffer = Buffer.from(fileData, 'base64');
    const cleanMemoNum = (memoNumber || 'MEMO').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileExt = (fileName || '').split('.').pop() || (fileFormat === 'PDF' ? 'pdf' : 'docx');
    const storagePath = `${Date.now()}_${cleanMemoNum}.${fileExt}`;

    const { error: storageErr } = await supabase.storage.from('memos').upload(storagePath, buffer, {
      contentType: fileFormat === 'PDF' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    });

    if (storageErr) return res.status(400).json({ error: storageErr.message });

    const { data: urlData } = supabase.storage.from('memos').getPublicUrl(storagePath);
    return res.json({ fileUrl: urlData?.publicUrl || '' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Upload server error' });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const PORT = process.env.PORT || 3000;

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: Number(PORT) },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
