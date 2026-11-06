// Relative API Client - routes all requests through backend Express proxy /api/*
// This hides Supabase project URLs and credentials from browser inspect element.

export async function apiGet<T>(endpoint: string): Promise<{ data?: T; error?: string }> {
  try {
    const separator = endpoint.includes('?') ? '&' : '?';
    const res = await fetch(`/api/${endpoint}${separator}_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { error: errJson.error || `HTTP ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    return { error: e?.message || 'Network error' };
  }
}

export async function apiPost<T>(endpoint: string, body: any): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { error: errJson.error || `HTTP ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    return { error: e?.message || 'Network error' };
  }
}

export async function apiPut<T>(endpoint: string, body: any): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(`/api/${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { error: errJson.error || `HTTP ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    return { error: e?.message || 'Network error' };
  }
}

export async function apiDelete(endpoint: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/${endpoint}`, { method: 'DELETE' });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { error: errJson.error || `HTTP ${res.status}` };
    }
    return await res.json();
  } catch (e: any) {
    return { error: e?.message || 'Network error' };
  }
}
