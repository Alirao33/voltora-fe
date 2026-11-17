'use client';
import { forwardRef, useEffect, type ReactNode } from 'react';
import { cx, enumLabel } from '@/lib/format';
import { useBand } from './band';

/* ---------- Buttons ---------- */
// Two looks only: solid lime (primary) and white with a border (secondary).
// 'ghost', 'dark', 'danger' and 'warning' are kept so every existing call still works; they use the secondary look,
// and the two destructive ones turn red on hover only.
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
};
export function Button({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...p }: BtnProps) {
  const primary = variant === 'primary';
  const destructive = variant === 'danger' || variant === 'warning';
  return (
    <button
      {...p}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-[10px] text-[17px] font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:border-ink-200 disabled:bg-ink-100 disabled:text-ink-500',
        size === 'sm' && 'h-9 px-3',
        size === 'md' && 'h-11 px-5',
        size === 'lg' && 'h-12 px-6',
        primary && 'bg-volt-500 text-volt-950 hover:bg-volt-600 disabled:hover:bg-ink-100',
        !primary && 'border border-ink-300 bg-white text-ink-900 hover:bg-volt-50 disabled:hover:bg-ink-100',
        !primary && destructive && 'hover:text-red-700',
        className,
      )}
    >
      {loading ? <Spinner small /> : icon ? <span className="flex h-4 w-4 items-center justify-center [&>svg]:h-4 [&>svg]:w-4">{icon}</span> : null}
      {children}
    </button>
  );
}

/* ---------- Form controls ---------- */
const control =
  'block w-full rounded-[10px] border border-line bg-white px-3.5 text-body text-ink-900 placeholder:text-ink-500 transition-colors duration-150 hover:border-ink-300 focus:border-volt-700 focus:outline-none focus:ring-2 focus:ring-volt-700/25 disabled:bg-ink-100 disabled:text-ink-500';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} {...p} className={cx(control, 'h-11', className)} />;
});

export function Select({ className, options, placeholder, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: (string | { value: string; label: string })[]; placeholder?: string }) {
  return (
    <select {...p} className={cx(control, 'h-11 pr-9', className)}>
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
  return <textarea {...p} className={cx(control, 'min-h-[96px] py-2.5', className)} />;
}

/** Label above the control: 12px uppercase, muted. */
export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="label mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-sm text-ink-600">{hint}</span>}
    </label>
  );
}

export function Checkbox({ label, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className="inline-flex min-h-[44px] cursor-pointer select-none items-center gap-2.5 text-body text-ink-700">
      <input type="checkbox" {...p} className="h-4 w-4 rounded border-ink-300 accent-volt-700" />
      {label}
    </label>
  );
}

/* ---------- Layout bits ---------- */
/** White card, 16px radius. Title and a divider, no subtitle line (the subtitle prop is accepted and ignored). */
export function Card({ title, actions, children, className, bodyClass }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cx('surface min-w-0', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-5">
          {title && <h2 className="min-w-0 text-section text-ink-900">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx('p-6', bodyClass)}>{children}</div>
    </section>
  );
}

/**
 * Page title, one short line and action buttons. Inside the app shell they are drawn in the lime band at the top
 * of the page; elsewhere (public pages) they render as a plain heading. Also sets the browser tab title.
 */
export function PageHeader({ title, desc, actions }: { title: ReactNode; desc?: ReactNode; actions?: ReactNode }) {
  const band = useBand();
  useEffect(() => {
    if (typeof title === 'string') document.title = `${title} · Voltora`;
  }, [title]);
  useEffect(() => {
    band?.set({ title, desc, actions });
  });
  useEffect(() => () => band?.set(null), []); // eslint-disable-line react-hooks/exhaustive-deps
  if (band) return null;
  return (
    <div className="animate-in mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-page text-ink-900">{title}</h1>
        {desc && <p className="mt-1 text-body text-ink-600">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const CHIPS = ['bg-volt-100 text-volt-700', 'bg-blue-100 text-blue-700', 'bg-amber-100 text-amber-700', 'bg-violet-100 text-violet-700', 'bg-rose-100 text-rose-700', 'bg-teal-100 text-teal-700'];
/** The same label always gets the same colour, so stat cards are colourful but stable. */
const chipFor = (label: ReactNode) => {
  let h = 0;
  for (const c of typeof label === 'string' ? label : '') h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CHIPS[h % CHIPS.length];
};

const DEFAULT_ICON = <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 3v18h18M7 15l4-4 3 3 5-6" /></svg>;

/** Equal-height stat card: green icon chip, small uppercase label, large dark number. */
export function Stat({ label, value, sub, tone, icon }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'warn' | 'bad'; icon?: ReactNode }) {
  return (
    <div className="surface flex h-full min-h-[140px] items-start gap-5 p-6">
      <span className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', chipFor(label))}>{icon ?? DEFAULT_ICON}</span>
      <div className="min-w-0">
        <div className="label">{label}</div>
        <div className={cx('num mt-1 whitespace-nowrap text-[2.125rem] font-bold leading-10', tone === 'warn' && 'text-amber-700', tone === 'bad' && 'text-red-600', (!tone || tone === 'good') && 'text-ink-900')}>{value}</div>
        {sub && <div className="mt-0.5 text-cell text-ink-600">{sub}</div>}
      </div>
    </div>
  );
}
export const StatCard = Stat;

/* ---------- Status ---------- */
// Completed = green, Cancelled = red, Expired = amber, In flight = blue, everything else neutral.
const GOOD = ['COMPLETED', 'SUCCEEDED', 'CHARGED', 'NORMAL', 'ACTIVE', 'AVAILABLE', 'DONE', 'TRUE', 'OK', 'READY', 'UNLOCKED', 'CONFIRMED', 'LIVE', 'RESOLVED', 'LOW', 'APPROVED', 'RECEIVED'];
const INFLIGHT = ['PENDING_PAYMENT', 'AWAITING_APPROVAL', 'PAID', 'IN_PROGRESS', 'REQUESTED', 'SHARED', 'ACKNOWLEDGED', 'ON_VAN', 'IN_USE', 'INFO'];
const WARN = ['EXPIRED', 'PENDING', 'WARNING', 'CHARGING', 'ONE_LEFT', 'RESERVED', 'RESERVED_VIP', 'PARTIALLY_REFUNDED', 'BOOKED', 'WEAK_PACK', 'LOW_SUPPLY', 'MEDIUM', 'HIGH', 'DUE'];
const BAD = ['FAILED', 'CRITICAL', 'RETIRE', 'RETIRED', 'FULL', 'CANCELLED', 'LOCKED', 'DEPLETED', 'STOCK_OUT', 'OVER_TEMP', 'LOCKOUT', 'MAINTENANCE', 'REFUNDED', 'FALSE', 'PACK_RETIRED', 'ERROR', 'DOWN', 'REJECTED'];

export function Badge({ value, className }: { value: unknown; className?: string }) {
  const s = String(value ?? '—');
  const k = s.toUpperCase();
  const tone = GOOD.includes(k) ? 'good' : INFLIGHT.includes(k) ? 'info' : WARN.includes(k) ? 'warn' : BAD.includes(k) ? 'bad' : 'neutral';
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[15px] font-semibold leading-none',
        tone === 'good' && 'bg-status-success-bg text-status-success-fg',
        tone === 'info' && 'bg-status-info-bg text-status-info-fg',
        tone === 'warn' && 'bg-status-warning-bg text-status-warning-fg',
        tone === 'bad' && 'bg-status-danger-bg text-status-danger-fg',
        tone === 'neutral' && 'bg-status-neutral-bg text-status-neutral-fg',
        className,
      )}
    >
      <span className={cx('h-1.5 w-1.5 rounded-full', tone === 'good' && 'bg-volt-700', tone === 'info' && 'bg-blue-600', tone === 'warn' && 'bg-amber-600', tone === 'bad' && 'bg-red-600', tone === 'neutral' && 'bg-ink-500')} />
      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : enumLabel(s)}
    </span>
  );
}
export const StatusPill = Badge;

/* ---------- Feedback ---------- */
export function Spinner({ small }: { small?: boolean }) {
  return (
    <span
      aria-label="Loading"
      className={cx('inline-block animate-spin rounded-full border-2 border-current border-r-transparent', small ? 'h-4 w-4' : 'h-6 w-6 text-volt-700')}
    />
  );
}

/** Shimmer block for content that is still loading. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('skeleton', className)} />;
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3 py-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-5/6" />
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <div role="alert" className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-status-danger-bg px-4 py-3 text-body text-status-danger-fg">
      <span className="flex items-start gap-2">
        <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5h.01" /></svg>
        {error}
      </span>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 font-medium underline hover:no-underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function Empty({ title = 'Nothing here yet', children }: { title?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-300 bg-ink-50 px-6 py-12 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-volt-100 text-volt-700">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10" /></svg>
      </span>
      <div className="text-body font-medium text-ink-900">{title}</div>
      {children && <div className="mt-1 max-w-sm text-cell text-ink-600">{children}</div>}
    </div>
  );
}
export const EmptyState = Empty;

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
    <div className="animate-in fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal
        onMouseDown={(e) => e.stopPropagation()}
        className={cx('flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-lift sm:rounded-card', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
          <h3 className="text-section text-ink-900">{title}</h3>
          <button onClick={onClose} className="rounded-md p-2 text-ink-600 transition-colors duration-150 hover:bg-volt-50 hover:text-ink-900" aria-label="Close">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 text-body">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Tabs ---------- */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="mb-5 inline-flex max-w-full overflow-x-auto rounded-xl border border-line bg-volt-50 p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx('h-9 whitespace-nowrap rounded-lg px-4 text-[17px] font-semibold transition-colors duration-150', value === t.value ? 'bg-white text-ink-900 shadow-card' : 'text-ink-600 hover:text-ink-900')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Table ---------- */
export type Col<T> = { key: string; header: ReactNode; render?: (row: T) => ReactNode; className?: string; align?: 'right'; hideBelow?: 'lg' | 'xl' | '2xl' };
// Lower-priority columns drop out on narrower screens so the rest keep room to breathe.
const HIDE = { lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell', '2xl': 'hidden 2xl:table-cell' } as const;

/** Light green sticky header, 56px rows, right-aligned numbers, row hover. Scrolls sideways on small screens. */
export function DataTable<T>({ rows, cols, onRowClick, rowKey, empty }: { rows: T[]; cols: Col<T>[]; onRowClick?: (r: T) => void; rowKey?: (r: T, i: number) => string | number; empty?: ReactNode }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <div className="-mx-6 max-h-[75vh] overflow-auto">
      <table className="min-w-full border-separate border-spacing-0 text-cell">
        <thead>
          <tr className="text-left">
            {cols.map((c) => (
              <th key={c.key} className={cx('label sticky top-0 z-10 whitespace-nowrap border-y border-line bg-ink-50 px-5 py-5 first:pl-8 last:pr-8', c.align === 'right' && 'text-right', c.hideBelow && HIDE[c.hideBelow], c.className)}>
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
              className={cx('group h-[76px] transition-colors duration-150 even:bg-ink-50/60 hover:bg-volt-50', onRowClick && 'cursor-pointer')}
            >
              {cols.map((c) => (
                <td key={c.key} className={cx('whitespace-nowrap border-b border-ink-100 px-5 py-3.5 text-ink-800 first:pl-8 first:font-medium last:pr-8 group-last:border-b-0', c.align === 'right' && 'num text-right font-medium text-ink-900', c.hideBelow && HIDE[c.hideBelow], c.className)}>
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

/** One aligned row of filters that wraps on small screens. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-end gap-4">{children}</div>;
}

/** Identifiers only: ORD-7, VOLT-0003, RCP-000007. */
export function Mono({ children }: { children: ReactNode }) {
  return <span className="id-mono inline-block rounded-md bg-ink-100 px-2.5 py-1.5 font-medium text-ink-800">{children}</span>;
}
