export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function pkr(n?: number | null) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return `Rs ${Number(n).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

export function num(n?: number | null, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('en-PK', { maximumFractionDigits: digits });
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
export const isIsoDate = (v: unknown) => typeof v === 'string' && ISO.test(v);

export function dt(s?: string | null, opts: { dateOnly?: boolean } = {}) {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return opts.dateOnly
    ? d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
    : d.toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** DD/MM/YY in Karachi time. */
export const ddmmyy = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi', day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';

export function ago(s?: string | null) {
  if (!s) return '—';
  const diff = (Date.now() - new Date(s).getTime()) / 1000;
  if (Number.isNaN(diff)) return s;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function titleize(k: string) {
  return k
    .replace(/_pkr$/, ' (PKR)')
    .replace(/_km$/, ' (km)')
    .replace(/_c$/, ' (°C)')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export const enumLabel = (s?: string | null) => (s ? s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (m) => m.toUpperCase()) : '—');

/** datetime-local input value → ISO string (or null) */
export const localToIso = (v: string) => (v ? new Date(v).toISOString() : null);

export function toNum(v: string): number | null {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const geoOnce = (opts: PositionOptions) =>
  new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, opts));

function geoMessage(e: unknown): string {
  const code = (e as GeolocationPositionError)?.code;
  if (code === 1) return 'Location is blocked. Allow location for this site in your browser settings, then try again.';
  if (code === 2) return 'Your device could not find its location. Turn on location services and try again.';
  if (code === 3) return 'Finding your location took too long. Please try again.';
  return 'Could not get your location.';
}

/** Rider position. Tries the fast network-based fix first, then a precise GPS fix; explains failures in plain words. */
export async function getPosition(): Promise<{ lat: number; lon: number }> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) throw new Error('Location is not available in this browser.');
  if (!window.isSecureContext) throw new Error('Location only works on a secure (https) page.');
  let p: GeolocationPosition;
  try {
    p = await geoOnce({ enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 });
  } catch (e) {
    if ((e as GeolocationPositionError)?.code === 1) throw new Error(geoMessage(e));
    try {
      p = await geoOnce({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    } catch (e2) {
      throw new Error(geoMessage(e2));
    }
  }
  return { lat: +p.coords.latitude.toFixed(6), lon: +p.coords.longitude.toFixed(6) };
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "per month", "per 6 months", "per year" for a pass length in days (falls back to "per N days"). */
export function perPeriod(days: number): string {
  if (days === 30) return 'per month';
  if (days === 180) return 'per 6 months';
  if (days === 365) return 'per year';
  return `per ${days} days`;
}
