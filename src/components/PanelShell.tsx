'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Logo } from './Logo';
import { useAuth } from './AuthProvider';
import { cx } from '@/lib/format';

export type NavItem = { href: string; label: string; icon: ReactNode; exact?: boolean } | { section: string };

export function PanelShell({ nav, children, area, logoutTo = '/login' }: { nav: NavItem[]; children: ReactNode; area: string; logoutTo?: string }) {
  const { user, signOut } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  const navEl = (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
      {nav.map((n, i) =>
        'section' in n ? (
          <div key={i} className="mt-4 px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-ink-500 first:mt-0">{n.section}</div>
        ) : (
          <Link
            key={n.href}
            href={n.href}
            className={cx(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
              (n.exact ? path === n.href : path === n.href || path.startsWith(n.href + '/'))
                ? 'bg-white/10 text-white'
                : 'text-ink-300 hover:bg-white/5 hover:text-white',
            )}
          >
            <span className="h-4 w-4 shrink-0 opacity-80">{n.icon}</span>
            {n.label}
          </Link>
        ),
      )}
    </nav>
  );

  const userEl = (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-volt-500/20 text-sm font-semibold text-volt-300">
          {(user?.full_name || user?.username || user?.phone || '?').slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-white">{user?.full_name || user?.username || user?.phone}</div>
          <div className="text-[11px] text-ink-400">{user?.role?.toLowerCase()}{user?.is_vip ? ' · VIP' : ''}</div>
        </div>
        <button
          title="Sign out"
          onClick={() => { signOut(); router.replace(logoutTo); }}
          className="rounded-md p-1.5 text-ink-400 hover:bg-white/10 hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 17l5-5-5-5M20 12H9M12 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" /></svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-ink-950 lg:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          <Logo dark />
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-300">{area}</span>
        </div>
        {navEl}
        {userEl}
      </aside>

      {/* mobile */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-ink-950 px-4 lg:hidden">
        <Logo dark />
        <button className="rounded-md p-2 text-white" onClick={() => setOpen(true)} aria-label="Menu">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-ink-950" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-14 items-center px-5"><Logo dark /></div>
            {navEl}
            {userEl}
          </aside>
        </div>
      )}

      <main className="lg:pl-60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
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
