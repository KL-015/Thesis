import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const supabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cXd5dXRxc3VzbGtwc210Ymt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMTQ4ODUsImV4cCI6MjEwNzg5MDg4NX0.wjVFJvj4SEEcjSR27HhknxV34gQ1DA-tWGNwlsxFya8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const OFFICER_PERMISSIONS_META_KEY = 'officer_permissions';

async function getOfficerPermissionsMap(): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase
      .from('board_meta')
      .select('value')
      .eq('key', OFFICER_PERMISSIONS_META_KEY)
      .maybeSingle();
    if (!error && data?.value && typeof data.value === 'object') {
      return data.value as Record<string, any>;
    }
  } catch (err) {
    console.warn('Could not fetch officer_permissions from board_meta:', err);
  }
  return {};
}

async function saveOfficerPermissionsToMeta(officerId: string, permissions: any): Promise<void> {
  if (!officerId || permissions === undefined) return;
  const currentMap = await getOfficerPermissionsMap();
  const nextMap = { ...currentMap, [officerId]: permissions };
  await supabase.from('board_meta').upsert(
    [
      {
        key: OFFICER_PERMISSIONS_META_KEY,
        value: nextMap,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: 'key' }
  );
}

async function deleteOfficerPermissionsFromMeta(officerId: string): Promise<void> {
  if (!officerId) return;
  const currentMap = await getOfficerPermissionsMap();
  if (officerId in currentMap) {
    const nextMap = { ...currentMap };
    delete nextMap[officerId];
    await supabase.from('board_meta').upsert(
      [
        {
          key: OFFICER_PERMISSIONS_META_KEY,
          value: nextMap,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'key' }
    );
  }
}

function pickColumns(source: Record<string, any>, allowed: string[]): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of allowed) {
    if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}

const OFFICER_COLUMNS = [
  'id',
  'email',
  'title',
  'full_name',
  'username',
  'role',
  'is_active',
  'permissions',
  'created_at',
];

const MEMO_COLUMNS = [
  'id',
  'title',
  'memo_number',
  'group_id',
  'file_format',
  'file_name',
  'file_size',
  'file_url',
  'uploaded_by',
  'uploaded_by_name',
  'upload_date',
  'effective_date',
  'summary',
  'signatory',
  'is_public_to_cadets',
  'created_at',
];

const EVENT_COLUMNS = [
  'id',
  'name',
  'date',
  'start_time',
  'end_time',
  'location',
  'details',
  'created_by',
  'created_by_name',
  'created_at',
];

const ANNOUNCEMENT_COLUMNS = [
  'id',
  'title',
  'content',
  'priority',
  'category',
  'target_audience',
  'date',
  'posted_at',
  'posted_by',
  'posted_by_name',
  'created_at',
];

const DUTY_COLUMNS = [
  'id',
  'date',
  'fod',
  'coow',
  'acoow1',
  'acoow2',
  'moow',
  'amoow1',
  'amoow2',
  'station',
  'status',
];

const DAILY_ACTIVITY_COLUMNS = [
  'id',
  'code',
  'name',
  'start_time',
  'end_time',
  'location',
  'description',
  'is_mandatory',
  'category',
  'updated_at',
];

// --- API PROXY ENDPOINTS ---

// 1. OFFICERS
app.get('/api/officers', async (req, res) => {
  try {
    const [{ data, error }, permMap] = await Promise.all([
      supabase.from('officers').select('*').order('created_at', { ascending: false }),
      getOfficerPermissionsMap(),
    ]);
    if (error) return res.status(400).json({ error: error.message });

    const enriched = (data || []).map((row: any) => ({
      ...row,
      permissions: row.permissions || permMap[row.id] || undefined,
    }));
    return res.json({ data: enriched });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.post('/api/officers', async (req, res) => {
  try {
    const payload = pickColumns(req.body || {}, OFFICER_COLUMNS);
    const { permissions, ...corePayload } = payload;

    let result = await supabase.from('officers').insert([payload]).select();

    // Fallback if Supabase officers table doesn't have the `permissions` column
    if (result.error && /column|schema cache/i.test(result.error.message)) {
      result = await supabase.from('officers').insert([corePayload]).select();
    }

    if (result.error) return res.status(400).json({ error: result.error.message });

    const saved = result.data?.[0];
    if (saved && permissions !== undefined) {
      await saveOfficerPermissionsToMeta(saved.id, permissions);
    }

    return res.json({
      data: saved ? { ...saved, permissions: saved.permissions || permissions } : saved,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.put('/api/officers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payload = pickColumns(req.body || {}, OFFICER_COLUMNS);
    const { permissions, ...corePayload } = payload;

    let saved: any = null;

    if (Object.keys(payload).length > 0) {
      let result = await supabase.from('officers').update(payload).eq('id', id).select();

      // Fallback if Supabase officers table doesn't have the `permissions` column
      if (result.error && /column|schema cache/i.test(result.error.message)) {
        if (Object.keys(corePayload).length > 0) {
          result = await supabase.from('officers').update(corePayload).eq('id', id).select();
        } else {
          // Only permissions were updated; fetch existing row to confirm it exists
          result = await supabase.from('officers').select('*').eq('id', id);
        }
      }

      if (result.error) return res.status(400).json({ error: result.error.message });
      saved = result.data?.[0] || null;
    }

    if (!saved) {
      return res.status(404).json({ error: `Officer "${id}" not found in database` });
    }

    if (permissions !== undefined) {
      await saveOfficerPermissionsToMeta(id, permissions);
    }

    return res.json({
      data: { ...saved, permissions: saved.permissions || permissions },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.delete('/api/officers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('officers').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    await deleteOfficerPermissionsFromMeta(id);
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
    const memo = pickColumns(req.body || {}, MEMO_COLUMNS);
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
    const updateData = pickColumns(req.body || {}, MEMO_COLUMNS);
    const { data, error } = await supabase.from('memos').update(updateData).eq('id', id).select();
    if (error) return res.status(400).json({ error: error.message });
    if (!data || data.length === 0) {
      return res.status(404).json({ error: `Memo "${id}" not found in database` });
    }
    return res.json({ data: data[0] });
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
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const event = pickColumns(req.body || {}, EVENT_COLUMNS);
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
    const updateData = pickColumns(req.body || {}, EVENT_COLUMNS);
    const { data, error } = await supabase.from('events').update(updateData).eq('id', id).select();
    if (error) return res.status(400).json({ error: error.message });
    if (!data || data.length === 0) {
      return res.status(404).json({ error: `Event "${id}" not found in database` });
    }
    return res.json({ data: data[0] });
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
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.post('/api/announcements', async (req, res) => {
  try {
    const item = pickColumns(req.body || {}, ANNOUNCEMENT_COLUMNS);
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
    const updateData = pickColumns(req.body || {}, ANNOUNCEMENT_COLUMNS);
    const { data, error } = await supabase.from('announcements').update(updateData).eq('id', id).select();
    if (error) return res.status(400).json({ error: error.message });
    if (!data || data.length === 0) {
      return res.status(404).json({ error: `Announcement "${id}" not found in database` });
    }
    return res.json({ data: data[0] });
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
    const { data, error } = await supabase
      .from('duties')
      .select('*')
      .order('date', { ascending: false })
      .order('id', { ascending: true });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.post('/api/duties', async (req, res) => {
  try {
    const duty = pickColumns(req.body || {}, DUTY_COLUMNS);
    if (!duty.id || !duty.date) {
      return res.status(400).json({ error: 'Duty id and date are required' });
    }
    const { data, error } = await supabase
      .from('duties')
      .upsert([duty], { onConflict: 'id' })
      .select();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data: data?.[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// 6. DAILY ACTIVITIES
app.get('/api/daily-activities', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('daily_activities')
      .select('*')
      .order('start_time', { ascending: true })
      .order('id', { ascending: true });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.post('/api/daily-activities', async (req, res) => {
  try {
    const activity = pickColumns(
      { ...req.body, updated_at: new Date().toISOString() },
      DAILY_ACTIVITY_COLUMNS
    );
    const { data, error } = await supabase
      .from('daily_activities')
      .upsert([activity], { onConflict: 'id' })
      .select();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data: data?.[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

app.put('/api/daily-activities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = pickColumns(
      { ...req.body, updated_at: new Date().toISOString() },
      DAILY_ACTIVITY_COLUMNS
    );
    const { data, error } = await supabase.from('daily_activities').update(updateData).eq('id', id).select();
    if (error) return res.status(400).json({ error: error.message });
    if (!data || data.length === 0) {
      return res.status(404).json({ error: `Daily activity "${id}" not found in database` });
    }
    return res.json({ data: data[0] });
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
    const { orders } = req.body;
    if (!Array.isArray(orders)) return res.status(400).json({ error: 'orders must be an array' });

    const { error: delError } = await supabase
      .from('standing_orders')
      .delete()
      .neq('id', 'placeholder_non_existent');
    if (delError) return res.status(400).json({ error: delError.message });

    const rows = orders
      .map((t: any) => String(t).trim())
      .filter(Boolean)
      .map((text: string, idx: number) => ({
        id: `ord-${idx + 1}-${Date.now()}`,
        order_text: text,
        sort_order: idx + 1,
        updated_at: new Date().toISOString(),
      }));

    if (rows.length === 0) {
      return res.json({ data: [] });
    }

    const { data, error } = await supabase.from('standing_orders').insert(rows).select();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// 8. BOARD METADATA (Uniforms, Fleet Roster, Total Strength, Memo Groups, Officer Permissions)
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
    const { data, error } = await supabase
      .from('board_meta')
      .upsert([{ key, value, updated_at: new Date().toISOString() }], { onConflict: 'key' })
      .select();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data: data?.[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// 9. MEMO FILE UPLOAD PROXY
app.post('/api/memos/upload-file', async (req, res) => {
  try {
    const { fileName, fileData, memoNumber, fileFormat } = req.body;
    if (!fileData) return res.status(400).json({ error: 'No file data provided' });

    const buffer = Buffer.from(fileData, 'base64');
    const cleanMemoNum = (memoNumber || 'MEMO').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileExt = (fileName || '').split('.').pop() || (fileFormat === 'PDF' ? 'pdf' : 'docx');
    const storagePath = `${Date.now()}_${cleanMemoNum}.${fileExt}`;

    const { error: storageErr } = await supabase.storage.from('memos').upload(storagePath, buffer, {
      contentType:
        fileFormat === 'PDF'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    });

    if (storageErr) return res.status(400).json({ error: storageErr.message });

    const { data: urlData } = supabase.storage.from('memos').getPublicUrl(storagePath);
    return res.json({ fileUrl: urlData?.publicUrl || '' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Upload server error' });
  }
});

// Catch unmatched /api/* routes with clean JSON 404 instead of SPA HTML
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
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
