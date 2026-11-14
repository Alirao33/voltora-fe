'use client';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { cx } from '@/lib/format';

type Kind = 'success' | 'error' | 'info';
type Toast = { id: number; kind: Kind; text: string };
type Ctx = { success: (t: string) => void; error: (t: string) => void; info: (t: string) => void };

const ToastCtx = createContext<Ctx>({ success: () => {}, error: () => {}, info: () => {} });
export const useToast = () => useContext(ToastCtx);

let seq = 0;

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
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cx(
              'pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg animate-in',
              t.kind === 'success' && 'border-volt-200 bg-volt-50 text-volt-900',
              t.kind === 'error' && 'border-red-200 bg-red-50 text-red-900',
              t.kind === 'info' && 'border-ink-200 bg-white text-ink-800',
            )}
          >
            <span className="mt-0.5 text-base leading-none">{t.kind === 'success' ? '✓' : t.kind === 'error' ? '!' : 'i'}</span>
            <span className="flex-1 break-words">{t.text}</span>
            <button className="text-ink-400 hover:text-ink-700" onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
