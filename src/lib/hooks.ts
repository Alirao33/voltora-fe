'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/Toast';

/** Load data on mount / when deps change. */
export function useApi<T>(fn: () => Promise<T>, deps: unknown[] = [], opts: { skip?: boolean } = {}) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!opts.skip);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fnRef.current();
      setData(r);
      return r;
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!opts.skip) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, opts.skip]);

  return { data, error, loading, reload, setData };
}

/** Run a mutation with a busy flag and toast feedback. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async <T,>(fn: () => Promise<T>, okMessage?: string | ((r: T) => string)): Promise<T | undefined> => {
      setBusy(true);
      try {
        const r = await fn();
        if (okMessage) toast.success(typeof okMessage === 'function' ? okMessage(r) : okMessage);
        return r;
      } catch (e: any) {
        toast.error(e?.message || 'Something went wrong');
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );
  return { run, busy };
}

/** Simple form state. */
export function useForm<T extends Record<string, any>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const set = <K extends keyof T>(k: K, v: T[K]) => setValues((s) => ({ ...s, [k]: v }));
  const bind = (k: keyof T) => ({
    value: String(values[k] ?? ''),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      set(k, e.target.value as T[keyof T]),
  });
  const check = (k: keyof T) => ({
    checked: !!values[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.checked as T[keyof T]),
  });
  return { values, set, bind, check, setValues, reset: () => setValues(initial) };
}

/** Remembers recent booking ids locally so riders can get back to them. */
export function useRecentBookings() {
  const KEY = 'voltora.bookings';
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    try { setIds(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { /* ignore */ }
  }, []);
  const add = (id: string) => {
    setIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 15);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  return { ids, add };
}
