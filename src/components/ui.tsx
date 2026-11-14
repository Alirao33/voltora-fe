'use client';
import { forwardRef, useEffect, type ReactNode } from 'react';
import { cx, enumLabel } from '@/lib/format';

/* ---------- Buttons ---------- */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};
export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...p }: BtnProps) {
  return (
    <button
      {...p}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-volt-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'lg' && 'h-12 px-6 text-base',
        variant === 'primary' && 'bg-volt-500 text-volt-950 hover:bg-volt-400',
        variant === 'dark' && 'bg-ink-900 text-white hover:bg-ink-800',
        variant === 'secondary' && 'border border-ink-200 bg-white text-ink-800 hover:bg-ink-50',
        variant === 'ghost' && 'text-ink-700 hover:bg-ink-100',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-500',
        className,
      )}
    >
      {loading && <Spinner small />}
      {children}
    </button>
  );
}

/* ---------- Form controls ---------- */
const control =
  'block w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-volt-500 focus:outline-none focus:ring-2 focus:ring-volt-500/20 disabled:bg-ink-50';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} {...p} className={cx(control, 'h-10', className)} />;
});

export function Select({ className, options, placeholder, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: (string | { value: string; label: string })[]; placeholder?: string }) {
  return (
    <select {...p} className={cx(control, 'h-10 pr-8', className)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value;
        const l = typeof o === 'string' ? enumLabel(o) : o.label;
        return <option key={v} value={v}>{l}</option>;
      })}
    </select>
  );
}

export function Textarea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cx(control, 'min-h-[80px] py-2', className)} />;
}

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-xs font-medium text-ink-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

export function Checkbox({ label, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm text-ink-700">
      <input type="checkbox" {...p} className="h-4 w-4 rounded border-ink-300 text-volt-600 accent-volt-600" />
      {label}
    </label>
  );
}

/* ---------- Layout bits ---------- */
export function Card({ title, actions, children, className, bodyClass, subtitle }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cx('min-w-0 rounded-xl border border-ink-200 bg-white shadow-card', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-3.5">
          <div>
            {title && <h2 className="text-sm font-semibold text-ink-900">{title}</h2>}
            {subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx('p-5', bodyClass)}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, desc, actions }: { title: ReactNode; desc?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-950">{title}</h1>
        {desc && <p className="mt-1 text-sm text-ink-500">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'warn' | 'bad' }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-card">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</div>
      <div
        className={cx(
          'mt-1.5 font-mono text-2xl font-semibold tabular-nums',
          tone === 'good' && 'text-volt-700',
          tone === 'warn' && 'text-amber-600',
          tone === 'bad' && 'text-red-600',
          !tone && 'text-ink-950',
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-ink-500">{sub}</div>}
    </div>
  );
}

/* ---------- Status ---------- */
const GOOD = ['COMPLETED', 'SUCCEEDED', 'CHARGED', 'NORMAL', 'ACTIVE', 'AVAILABLE', 'DONE', 'PAID', 'TRUE', 'OK', 'READY', 'UNLOCKED', 'CONFIRMED', 'LIVE'];
const WARN = ['PENDING', 'PENDING_PAYMENT', 'AWAITING_APPROVAL', 'WARNING', 'CHARGING', 'ONE_LEFT', 'RESERVED', 'RESERVED_VIP', 'IN_PROGRESS', 'PARTIALLY_REFUNDED', 'ON_VAN', 'IN_USE', 'BOOKED', 'WEAK_PACK', 'LOW_SUPPLY'];
const BAD = ['FAILED', 'CRITICAL', 'RETIRE', 'RETIRED', 'FULL', 'CANCELLED', 'EXPIRED', 'LOCKED', 'DEPLETED', 'STOCK_OUT', 'OVER_TEMP', 'LOCKOUT', 'MAINTENANCE', 'REFUNDED', 'FALSE', 'PACK_RETIRED', 'ERROR', 'DOWN'];

export function Badge({ value, className }: { value: unknown; className?: string }) {
  const s = String(value ?? '—');
  const k = s.toUpperCase();
  const tone = GOOD.includes(k) ? 'good' : WARN.includes(k) ? 'warn' : BAD.includes(k) ? 'bad' : 'info';
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium',
        tone === 'good' && 'bg-volt-50 text-volt-800 ring-1 ring-volt-200',
        tone === 'warn' && 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
        tone === 'bad' && 'bg-red-50 text-red-700 ring-1 ring-red-200',
        tone === 'info' && 'bg-ink-100 text-ink-700 ring-1 ring-ink-200',
        className,
      )}
    >
      <span className={cx('h-1.5 w-1.5 rounded-full', tone === 'good' && 'bg-volt-500', tone === 'warn' && 'bg-amber-500', tone === 'bad' && 'bg-red-500', tone === 'info' && 'bg-ink-400')} />
      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : enumLabel(s)}
    </span>
  );
}

/* ---------- Feedback ---------- */
export function Spinner({ small }: { small?: boolean }) {
  return (
    <span
      aria-label="Loading"
      className={cx('inline-block animate-spin rounded-full border-2 border-current border-r-transparent', small ? 'h-3.5 w-3.5' : 'h-6 w-6 text-volt-600')}
    />
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm text-ink-500">
      <Spinner /> {label}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <span>{error}</span>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 font-medium underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function Empty({ title = 'Nothing here yet', children }: { title?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-200 px-6 py-12 text-center">
      <div className="text-sm font-medium text-ink-700">{title}</div>
      {children && <div className="mt-1 text-sm text-ink-500">{children}</div>}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal
        onMouseDown={(e) => e.stopPropagation()}
        className={cx('flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h3 className="text-base font-semibold text-ink-900">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Tabs ---------- */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="mb-5 inline-flex rounded-lg border border-ink-200 bg-ink-50 p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cx('rounded-md px-3 py-1.5 text-sm font-medium transition', value === t.value ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Table ---------- */
export type Col<T> = { key: string; header: ReactNode; render?: (row: T) => ReactNode; className?: string; align?: 'right' };

export function DataTable<T>({ rows, cols, onRowClick, rowKey, empty }: { rows: T[]; cols: Col<T>[]; onRowClick?: (r: T) => void; rowKey?: (r: T, i: number) => string | number; empty?: ReactNode }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left text-[11px] uppercase tracking-wide text-ink-500">
            {cols.map((c) => (
              <th key={c.key} className={cx('whitespace-nowrap px-5 py-2.5 font-medium', c.align === 'right' && 'text-right', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={rowKey ? rowKey(r, i) : i}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cx('border-b border-ink-50 last:border-0', onRowClick && 'cursor-pointer hover:bg-ink-50')}
            >
              {cols.map((c) => (
                <td key={c.key} className={cx('whitespace-nowrap px-5 py-3 text-ink-800', c.align === 'right' && 'text-right tabular-nums', c.className)}>
                  {c.render ? c.render(r) : String((r as any)[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-end gap-3">{children}</div>;
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-xs text-ink-700">{children}</span>;
}
