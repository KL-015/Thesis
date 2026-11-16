import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Primary API client routes requests through backend Express proxy (/api/*).
// When deployed on static hosting where /api/* returns HTTP 404/405 or HTML (no Node server),
// it automatically falls back to direct Supabase calls so reads, writes, and file uploads still work across all devices.

const SUPABASE_URL =
  import.meta.env?.VITE_SUPABASE_URL || 'https://ztqwyutqsuslkpsmtbkt.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cXd5dXRxc3VzbGtwc210Ymt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMTQ4ODUsImV4cCI6MjEwNzg5MDg4NX0.wjVFJvj4SEEcjSR27HhknxV34gQ1DA-tWGNwlsxFya8';

let directClient: SupabaseClient | null = null;
let useDirectSupabase = false;

function getDirectClient(): SupabaseClient {
  if (!directClient) {
    directClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return directClient;
}

const OFFICER_PERMISSIONS_META_KEY = 'officer_permissions';

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

function pickColumns(source: Record<string, any>, allowed: string[]): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of allowed) {
    if (source && source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function getOfficerPermissionsMap(): Promise<Record<string, any>> {
  try {
    const supabase = getDirectClient();
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
  const supabase = getDirectClient();
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
  const supabase = getDirectClient();
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

async function directGet<T>(endpoint: string): Promise<{ data?: T; error?: string }> {
  const supabase = getDirectClient();
  const path = endpoint.split('?')[0].replace(/^\/+/, '');

  try {
    switch (path) {
      case 'officers': {
        const [{ data, error }, permMap] = await Promise.all([
          supabase.from('officers').select('*').order('created_at', { ascending: false }),
          getOfficerPermissionsMap(),
        ]);
        if (error) return { error: error.message };
        const enriched = (data || []).map((row: any) => ({
          ...row,
          permissions: row.permissions || permMap[row.id] || undefined,
        }));
        return { data: enriched as unknown as T };
      }
      case 'memos': {
        const { data, error } = await supabase
          .from('memos')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) return { error: error.message };
        return { data: data as unknown as T };
      }
      case 'events': {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('date', { ascending: true })
          .order('start_time', { ascending: true });
        if (error) return { error: error.message };
        return { data: data as unknown as T };
      }
      case 'announcements': {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) return { error: error.message };
        return { data: data as unknown as T };
      }
      case 'duties': {
        const { data, error } = await supabase
          .from('duties')
          .select('*')
          .order('date', { ascending: false })
          .order('id', { ascending: true });
        if (error) return { error: error.message };
        return { data: data as unknown as T };
      }
      case 'daily-activities': {
        const { data, error } = await supabase
          .from('daily_activities')
          .select('*')
          .order('start_time', { ascending: true })
          .order('id', { ascending: true });
        if (error) return { error: error.message };
        return { data: data as unknown as T };
      }
      case 'standing-orders': {
        const { data, error } = await supabase
          .from('standing_orders')
          .select('*')
          .order('sort_order', { ascending: true });
        if (error) return { error: error.message };
        return { data: data as unknown as T };
      }
      case 'board-meta': {
        const { data, error } = await supabase.from('board_meta').select('*');
        if (error) return { error: error.message };
        return { data: data as unknown as T };
      }
      default:
        return { error: `Unknown endpoint: ${path}` };
    }
  } catch (e: any) {
    return { error: e?.message || 'Supabase request error' };
  }
}

async function directPost<T>(endpoint: string, body: any): Promise<{ data?: T; error?: string }> {
  const supabase = getDirectClient();
  const path = endpoint.split('?')[0].replace(/^\/+/, '');

  try {
    switch (path) {
      case 'officers': {
        const payload = pickColumns(body || {}, OFFICER_COLUMNS);
        const { permissions, ...corePayload } = payload;
        let result = await supabase.from('officers').insert([payload]).select();
        if (result.error && /column|schema cache/i.test(result.error.message)) {
          result = await supabase.from('officers').insert([corePayload]).select();
        }
        if (result.error) return { error: result.error.message };
        const saved = result.data?.[0];
        if (saved && permissions !== undefined) {
          await saveOfficerPermissionsToMeta(saved.id, permissions);
        }
        return {
          data: (saved ? { ...saved, permissions: saved.permissions || permissions } : saved) as T,
        };
      }
      case 'memos': {
        const memo = pickColumns(body || {}, MEMO_COLUMNS);
        const { data, error } = await supabase.from('memos').insert([memo]).select();
        if (error) return { error: error.message };
        return { data: data?.[0] as T };
      }
      case 'memos/upload-file': {
        const { fileName, fileData, memoNumber, fileFormat } = body || {};
        if (!fileData) return { error: 'No file data provided' };
        const bytes = base64ToUint8Array(fileData);
        const cleanMemoNum = (memoNumber || 'MEMO').replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileExt = (fileName || '').split('.').pop() || (fileFormat === 'PDF' ? 'pdf' : 'docx');
        const storagePath = `${Date.now()}_${cleanMemoNum}.${fileExt}`;

        const { error: storageErr } = await supabase.storage.from('memos').upload(storagePath, bytes, {
          contentType:
            fileFormat === 'PDF'
              ? 'application/pdf'
              : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true,
        });
        if (storageErr) return { error: storageErr.message };

        const { data: urlData } = supabase.storage.from('memos').getPublicUrl(storagePath);
        return { data: { fileUrl: urlData?.publicUrl || '' } as unknown as T };
      }
      case 'events': {
        const event = pickColumns(body || {}, EVENT_COLUMNS);
        const { data, error } = await supabase.from('events').insert([event]).select();
        if (error) return { error: error.message };
        return { data: data?.[0] as T };
      }
      case 'announcements': {
        const item = pickColumns(body || {}, ANNOUNCEMENT_COLUMNS);
        const { data, error } = await supabase.from('announcements').insert([item]).select();
        if (error) return { error: error.message };
        return { data: data?.[0] as T };
      }
      case 'duties': {
        const duty = pickColumns(body || {}, DUTY_COLUMNS);
        if (!duty.id || !duty.date) {
          return { error: 'Duty id and date are required' };
        }
        const { data, error } = await supabase
          .from('duties')
          .upsert([duty], { onConflict: 'id' })
          .select();
        if (error) return { error: error.message };
        return { data: data?.[0] as T };
      }
      case 'daily-activities': {
        const activity = pickColumns(
          { ...(body || {}), updated_at: new Date().toISOString() },
          DAILY_ACTIVITY_COLUMNS
        );
        const { data, error } = await supabase
          .from('daily_activities')
          .upsert([activity], { onConflict: 'id' })
          .select();
        if (error) return { error: error.message };
        return { data: data?.[0] as T };
      }
      case 'standing-orders': {
        const orders = body?.orders;
        if (!Array.isArray(orders)) return { error: 'orders must be an array' };

        const { error: delError } = await supabase
          .from('standing_orders')
          .delete()
          .neq('id', 'placeholder_non_existent');
        if (delError) return { error: delError.message };

        const rows = orders
          .map((t: any) => String(t).trim())
          .filter(Boolean)
          .map((text: string, idx: number) => ({
            id: `ord-${idx + 1}-${Date.now()}`,
            order_text: text,
            sort_order: idx + 1,
            updated_at: new Date().toISOString(),
          }));

        if (rows.length === 0) return { data: [] as unknown as T };

        const { data, error } = await supabase.from('standing_orders').insert(rows).select();
        if (error) return { error: error.message };
        return { data: data as unknown as T };
      }
      case 'board-meta': {
        const { key, value } = body || {};
        if (!key) return { error: 'key is required' };
        const { data, error } = await supabase
          .from('board_meta')
          .upsert([{ key, value, updated_at: new Date().toISOString() }], { onConflict: 'key' })
          .select();
        if (error) return { error: error.message };
        return { data: data?.[0] as T };
      }
      default:
        return { error: `Unknown endpoint: ${path}` };
    }
  } catch (e: any) {
    return { error: e?.message || 'Supabase request error' };
  }
}

async function directPut<T>(endpoint: string, body: any): Promise<{ data?: T; error?: string }> {
  const supabase = getDirectClient();
  const path = endpoint.split('?')[0].replace(/^\/+/, '');
  const parts = path.split('/');
  const resource = parts[0];
  const id = decodeURIComponent(parts.slice(1).join('/'));

  if (!id) return { error: 'Resource id is required' };

  try {
    switch (resource) {
      case 'officers': {
        const payload = pickColumns(body || {}, OFFICER_COLUMNS);
        const { permissions, ...corePayload } = payload;
        let saved: any = null;

        if (Object.keys(payload).length > 0) {
          let result = await supabase.from('officers').update(payload).eq('id', id).select();
          if (result.error && /column|schema cache/i.test(result.error.message)) {
            if (Object.keys(corePayload).length > 0) {
              result = await supabase.from('officers').update(corePayload).eq('id', id).select();
            } else {
              result = await supabase.from('officers').select('*').eq('id', id);
            }
          }
          if (result.error) return { error: result.error.message };
          saved = result.data?.[0] || null;
        }

        if (!saved) {
          return { error: `Officer "${id}" not found in database` };
        }
        if (permissions !== undefined) {
          await saveOfficerPermissionsToMeta(id, permissions);
        }
        return { data: { ...saved, permissions: saved.permissions || permissions } as T };
      }
      case 'memos': {
        const updateData = pickColumns(body || {}, MEMO_COLUMNS);
        const { data, error } = await supabase.from('memos').update(updateData).eq('id', id).select();
        if (error) return { error: error.message };
        if (!data || data.length === 0) return { error: `Memo "${id}" not found in database` };
        return { data: data[0] as T };
      }
      case 'events': {
        const updateData = pickColumns(body || {}, EVENT_COLUMNS);
        const { data, error } = await supabase.from('events').update(updateData).eq('id', id).select();
        if (error) return { error: error.message };
        if (!data || data.length === 0) return { error: `Event "${id}" not found in database` };
        return { data: data[0] as T };
      }
      case 'announcements': {
        const updateData = pickColumns(body || {}, ANNOUNCEMENT_COLUMNS);
        const { data, error } = await supabase
          .from('announcements')
          .update(updateData)
          .eq('id', id)
          .select();
        if (error) return { error: error.message };
        if (!data || data.length === 0) return { error: `Announcement "${id}" not found in database` };
        return { data: data[0] as T };
      }
      case 'daily-activities': {
        const updateData = pickColumns(
          { ...(body || {}), updated_at: new Date().toISOString() },
          DAILY_ACTIVITY_COLUMNS
        );
        const { data, error } = await supabase
          .from('daily_activities')
          .update(updateData)
          .eq('id', id)
          .select();
        if (error) return { error: error.message };
        if (!data || data.length === 0) return { error: `Daily activity "${id}" not found in database` };
        return { data: data[0] as T };
      }
      default:
        return { error: `Unknown endpoint: ${path}` };
    }
  } catch (e: any) {
    return { error: e?.message || 'Supabase request error' };
  }
}

async function directDelete(endpoint: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = getDirectClient();
  const path = endpoint.split('?')[0].replace(/^\/+/, '');
  const parts = path.split('/');
  const resource = parts[0];
  const id = decodeURIComponent(parts.slice(1).join('/'));

  if (!id) return { error: 'Resource id is required' };

  try {
    switch (resource) {
      case 'officers': {
        const { error } = await supabase.from('officers').delete().eq('id', id);
        if (error) return { error: error.message };
        await deleteOfficerPermissionsFromMeta(id);
        return { success: true };
      }
      case 'memos': {
        const { error } = await supabase.from('memos').delete().eq('id', id);
        if (error) return { error: error.message };
        return { success: true };
      }
      case 'events': {
        const { error } = await supabase.from('events').delete().eq('id', id);
        if (error) return { error: error.message };
        return { success: true };
      }
      case 'announcements': {
        const { error } = await supabase.from('announcements').delete().eq('id', id);
        if (error) return { error: error.message };
        return { success: true };
      }
      case 'daily-activities': {
        const { error } = await supabase.from('daily_activities').delete().eq('id', id);
        if (error) return { error: error.message };
        return { success: true };
      }
      default:
        return { error: `Unknown endpoint: ${path}` };
    }
  } catch (e: any) {
    return { error: e?.message || 'Supabase request error' };
  }
}

async function parseProxyResponse<R>(res: Response): Promise<{ fallback: boolean; payload?: R }> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await res.json().catch(() => null);
    if (json !== null) {
      if (!res.ok) {
        return { fallback: false, payload: { error: json.error || `HTTP ${res.status}` } as R };
      }
      return { fallback: false, payload: json as R };
    }
  }
  // Static/CDN host returned empty 404, 405, HTML SPA fallback, or gateway error
  if (res.status === 404 || res.status === 405 || res.status >= 500 || res.ok) {
    useDirectSupabase = true;
    return { fallback: true };
  }
  return { fallback: false, payload: { error: `HTTP ${res.status}` } as R };
}

export async function apiGet<T>(endpoint: string): Promise<{ data?: T; error?: string }> {
  if (useDirectSupabase) {
    return directGet<T>(endpoint);
  }
  try {
    const separator = endpoint.includes('?') ? '&' : '?';
    const res = await fetch(`/api/${endpoint}${separator}_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
    const parsed = await parseProxyResponse<{ data?: T; error?: string }>(res);
    if (parsed.fallback) {
      return directGet<T>(endpoint);
    }
    return parsed.payload!;
  } catch {
    return directGet<T>(endpoint);
  }
}

export async function apiPost<T>(endpoint: string, body: any): Promise<{ data?: T; error?: string }> {
  if (useDirectSupabase) {
    return directPost<T>(endpoint, body);
  }
  try {
    const res = await fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const parsed = await parseProxyResponse<{ data?: T; error?: string }>(res);
    if (parsed.fallback) {
      return directPost<T>(endpoint, body);
    }
    return parsed.payload!;
  } catch {
    return directPost<T>(endpoint, body);
  }
}

export async function apiPut<T>(endpoint: string, body: any): Promise<{ data?: T; error?: string }> {
  if (useDirectSupabase) {
    return directPut<T>(endpoint, body);
  }
  try {
    const res = await fetch(`/api/${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const parsed = await parseProxyResponse<{ data?: T; error?: string }>(res);
    if (parsed.fallback) {
      return directPut<T>(endpoint, body);
    }
    return parsed.payload!;
  } catch {
    return directPut<T>(endpoint, body);
  }
}

export async function apiDelete(endpoint: string): Promise<{ success?: boolean; error?: string }> {
  if (useDirectSupabase) {
    return directDelete(endpoint);
  }
  try {
    const res = await fetch(`/api/${endpoint}`, { method: 'DELETE' });
    const parsed = await parseProxyResponse<{ success?: boolean; error?: string }>(res);
    if (parsed.fallback) {
      return directDelete(endpoint);
    }
    return parsed.payload!;
  } catch {
    return directDelete(endpoint);
  }
}
