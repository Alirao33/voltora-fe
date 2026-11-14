// Thin fetch wrapper around the Voltora API: bearer auth, transparent token refresh,
// FastAPI error formatting.

export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || '/api-proxy').replace(/\/$/, '');
const KEY = 'voltora.auth';

export type Tokens = { access_token: string; refresh_token?: string | null; token_type?: string };

export function getTokens(): Tokens | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Tokens;
    
    // Fallback if token was stored raw
    const directAccess = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (directAccess) return { access_token: directAccess, refresh_token: null, token_type: 'bearer' };
  } catch {
    /* storage unavailable */
  }
  return null;
}

export function setTokens(t: Tokens | null) {
  if (typeof window === 'undefined') return;
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event('voltora-auth'));
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

export function formatDetail(body: any, status: number): string {
  const d = body?.detail ?? body?.message ?? body;
  if (Array.isArray(d)) {
    return d
      .map((e: any) => {
        const loc = (e?.loc || []).filter((x: unknown) => x !== 'body').join('.');
        return loc ? `${loc}: ${e?.msg}` : String(e?.msg ?? e);
      })
      .join('; ');
  }
  if (typeof d === 'string' && d) return d;
  if (d && typeof d === 'object') return JSON.stringify(d);
  if (status === 0) return 'Cannot reach the Voltora API. Is the backend running?';
  return `Request failed (${status})`;
}

export type RequestOptions = {
  method?: string;
  body?: unknown;
  form?: Record<string, string>;
  query?: Record<string, unknown>;
  auth?: boolean;
  headers?: Record<string, string>;
  raw?: boolean;
};

export function qs(q?: Record<string, unknown>) {
  if (!q) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === '') continue;
    p.append(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const t = getTokens();
  if (!t?.refresh_token) return false;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const r = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: t.refresh_token }),
        });
        if (!r.ok) return false;
        const j = await r.json();
        setTokens({ access_token: j.access_token, refresh_token: j.refresh_token ?? t.refresh_token });
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => (refreshing = null), 0);
      }
    })();
  }
  return refreshing;
}

export async function api<T = any>(path: string, o: RequestOptions = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...(o.headers || {}) };
  let body: BodyInit | undefined;
  if (o.form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(o.form).toString();
  } else if (o.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(o.body);
  }
  const auth = o.auth ?? true;
  const t = getTokens();
  if (auth && t?.access_token) headers.Authorization = `Bearer ${t.access_token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}${qs(o.query)}`, {
      method: o.method || (body !== undefined ? 'POST' : 'GET'),
      headers,
      body,
    });
  } catch {
    throw new ApiError(0, formatDetail(null, 0));
  }

  if (res.status === 401 && auth && !retried && t) {
    if (await tryRefresh()) return api<T>(path, o, true);
    setTokens(null);
  }

  if (o.raw) {
    if (!res.ok) {
      let data: any = null;
      try { data = await res.json(); } catch { /* not json */ }
      throw new ApiError(res.status, formatDetail(data, res.status), data);
    }
    return res as unknown as T;
  }

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) throw new ApiError(res.status, formatDetail(data, res.status), data);
  return data as T;
}

/** Normalises list-ish responses ({items: []}, {stations: []}, [] ...) into an array. */
export function asList<T = any>(d: any): T[] {
  if (Array.isArray(d)) return d;
  if (!d || typeof d !== 'object') return [];
  for (const k of ['items', 'results', 'data', 'stations', 'sites', 'lockers', 'tasks', 'plan', 'stops', 'models', 'rows']) {
    if (Array.isArray(d[k])) return d[k];
  }
  const firstArr = Object.values(d).find(Array.isArray);
  return (firstArr as T[]) || [];
}
