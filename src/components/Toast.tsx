'use client';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { cx } from '@/lib/format';

type Kind = 'success' | 'error' | 'info';
type Toast = { id: number; kind: Kind; text: string };
type Ctx = { success: (t: string) => void; error: (t: string) => void; info: (t: string) => void };

const ToastCtx = createContext<Ctx>({ success: () => {}, error: () => {}, info: () => {} });
export const useToast = () => useContext(ToastCtx);

let seq = 0;

const ICON: Record<Kind, string> = {
  success: 'M5 13l4 4L19 7',
  error: 'M12 8v5M12 16.5h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  info: 'M12 11v5M12 7.5h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Kind, text: string) => {
    const id = ++seq;
    setItems((s) => [...s, { id, kind, text }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), kind === 'error' ? 7000 : 4000);
  }, []);
  const value = useMemo<Ctx>(
    () => ({ success: (t) => push('success', t), error: (t) => push('error', t), info: (t) => push('info', t) }),
    [push],
  );
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(400px,calc(100vw-2rem))] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={cx(
              'animate-in pointer-events-auto flex items-start gap-3 rounded-card border px-4 py-3 text-body shadow-lift',
              t.kind === 'success' && 'border-volt-200 bg-status-success-bg text-status-success-fg',
              t.kind === 'error' && 'border-red-200 bg-status-danger-bg text-status-danger-fg',
              t.kind === 'info' && 'border-blue-200 bg-status-info-bg text-status-info-fg',
            )}
          >
            <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={ICON[t.kind]} /></svg>
            <span className="flex-1 break-words font-medium">{t.text}</span>
            <button className="rounded p-0.5 opacity-70 transition-opacity duration-150 hover:opacity-100" aria-label="Dismiss" onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
