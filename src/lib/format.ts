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

export function getPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location is not available in this browser'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: +p.coords.latitude.toFixed(6), lon: +p.coords.longitude.toFixed(6) }),
      (e) => reject(new Error(e.message || 'Could not get your location')),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
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
