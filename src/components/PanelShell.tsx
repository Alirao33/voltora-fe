'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Logo } from './Logo';
import { useAuth } from './AuthProvider';
import { BandContext, type BandContent } from './band';
import { cx } from '@/lib/format';

export type NavItem = { href: string; label: string; icon: ReactNode; exact?: boolean } | { section: string };

/** White sidebar, lime header band (search, bell, avatar, page title) and the page content overlapping the band. */
export function PanelShell({ nav, children, area, logoutTo = '/login' }: { nav: NavItem[]; children: ReactNode; area: string; logoutTo?: string }) {
  const { user, signOut } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [band, setBand] = useState<BandContent | null>(null);
  const [query, setQuery] = useState('');
  const ctx = useMemo(() => ({ set: setBand }), []);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open]);

  const links = nav.filter((n): n is Extract<NavItem, { href: string }> => 'href' in n);
  const isActive = useCallback((n: { href: string; exact?: boolean }) => (n.exact ? path === n.href : path === n.href || path.startsWith(n.href + '/')), [path]);
  const activeLabel = links.find(isActive)?.label ?? area;
  const alertsLink = links.find((l) => l.href.endsWith('/alerts'));
  const profileLink = links.find((l) => l.href.endsWith('/profile'));
  const initial = (user?.full_name || user?.username || user?.phone || '?').slice(0, 1).toUpperCase();

  // Jump to the first page whose name matches what was typed.
  const goSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    const hit = q && links.find((l) => l.label.toLowerCase().includes(q));
    if (hit) {
      router.push(hit.href);
      setQuery('');
    }
  };

  const navEl = (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {nav.map((n, i) => {
        if ('section' in n) return <div key={i} className="label mt-5 px-3 pb-1 first:mt-0">{n.section}</div>;
        const active = isActive(n);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'relative flex h-11 items-center gap-3 rounded-[10px] px-3 text-body transition-colors duration-150',
              active ? 'bg-volt-100 font-medium text-ink-900' : 'text-ink-700 hover:bg-volt-50 hover:text-ink-900',
            )}
          >
            {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-accent" aria-hidden />}
            <span className={cx('h-5 w-5 shrink-0 [&>svg]:h-5 [&>svg]:w-5', active ? 'text-volt-700' : 'text-ink-600')}>{n.icon}</span>
            {n.label}
          </Link>
        );
      })}
    </nav>
  );

  const userEl = (
    <div className="p-3">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-ink-50 p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-volt-100 text-body font-medium text-volt-900">{initial}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-body font-medium text-ink-900">{user?.full_name || user?.username || user?.phone}</div>
          <div className="text-sm text-ink-600">{user?.role?.toLowerCase()}{user?.is_vip ? ' · VIP' : ''}</div>
        </div>
        <button
          title="Sign out"
          aria-label="Sign out"
          onClick={() => { signOut(); router.replace(logoutTo); }}
          className="rounded-md p-2 text-ink-600 transition-colors duration-150 hover:bg-white hover:text-red-700"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M15 17l5-5-5-5M20 12H9M12 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" /></svg>
        </button>
      </div>
    </div>
  );

  const round = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink-900 transition-colors duration-150 hover:bg-volt-50';

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-white lg:flex">
        <div className="flex h-16 items-center gap-3 px-5">
          <Logo />
          <span className="rounded-md bg-volt-100 px-2 py-1 text-xs font-medium uppercase tracking-wide text-volt-900">{area}</span>
        </div>
        {navEl}
        {userEl}
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="animate-in absolute inset-0 bg-ink-950/40" />
          <aside role="dialog" aria-modal aria-label="Menu" className="animate-in absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-line bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-16 items-center justify-between px-5">
              <Logo />
              <button className="flex h-11 w-11 items-center justify-center rounded-md text-ink-600 hover:bg-volt-50" onClick={() => setOpen(false)} aria-label="Close menu">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            {navEl}
            {userEl}
          </aside>
        </div>
      )}

      <main className="lg:pl-64">
        <BandContext.Provider value={ctx}>
          <div className="rounded-b-[28px] bg-volt-500">
            <div className="mx-auto max-w-[1280px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button className={cx(round, 'lg:hidden')} onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
                </button>
                <form onSubmit={goSearch} role="search" className="relative min-w-0 max-w-md flex-1">
                  <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                  <input list="page-list" aria-label="Search pages" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pages" className="h-11 w-full rounded-full border-0 bg-white pl-11 pr-4 text-body text-ink-900 placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-volt-700" />
                  <datalist id="page-list">{links.map((l) => <option key={l.href} value={l.label} />)}</datalist>
                </form>
                <div className="ml-auto flex items-center gap-2">
                  {alertsLink && (
                    <Link href={alertsLink.href} aria-label="Alerts" className={round}>
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4" /></svg>
                    </Link>
                  )}
                  {profileLink ? (
                    <Link href={profileLink.href} aria-label="My profile" className={cx(round, 'font-medium')}>{initial}</Link>
                  ) : (
                    <span className={cx(round, 'font-medium')} aria-hidden>{initial}</span>
                  )}
                </div>
              </div>

              <div className="animate-in mt-8 flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-page text-ink-900">{band?.title ?? activeLabel}</h1>
                  {band?.desc && <p className="mt-1 text-body text-ink-800">{band.desc}</p>}
                </div>
                {band?.actions && <div className="flex flex-wrap items-center gap-2">{band.actions}</div>}
              </div>
            </div>
          </div>

          <div key={path} className="animate-in relative mx-auto -mt-10 max-w-[1280px] px-4 pb-10 sm:px-6 lg:px-8">{children}</div>
        </BandContext.Provider>
      </main>
    </div>
  );
}

/* Minimal stroke icons (24x24) */
const I = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d={d} /></svg>
);
export const Icons = {
  home: I('M3 11l9-8 9 8M5 10v10h14V10'),
  pin: I('M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5'),
  battery: I('M3 8h15v8H3zM21 11v2M6 11v2M9 11v2'),
  bolt: I('M13 2 4 14h7l-1 8 9-12h-7l1-8z'),
  receipt: I('M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6'),
  card: I('M3 6h18v12H3zM3 10h18'),
  bell: I('M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4'),
  users: I('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8'),
  tag: I('M20 12l-8 8-9-9V3h8zM7.5 7.5h.01'),
  sliders: I('M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6'),
  truck: I('M1 4h14v12H1zM15 9h4l4 4v3h-8M5.5 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4M18.5 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4'),
  chart: I('M3 3v18h18M7 15l4-4 3 3 5-6'),
  brain: I('M12 3v18M5 8a4 4 0 0 1 7-3M19 8a4 4 0 0 0-7-3M5 8a4 4 0 0 0 0 8M19 8a4 4 0 0 1 0 8M5 16a4 4 0 0 0 7 3M19 16a4 4 0 0 1-7 3'),
  list: I('M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'),
  pulse: I('M22 12h-4l-3 9L9 3l-3 9H2'),
  user: I('M20 21a8 8 0 1 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10'),
  lock: I('M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4'),
  route: I('M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4M18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4M6 15V9a4 4 0 0 1 4-4h6M18 9v6a4 4 0 0 1-4 4H8'),
};
