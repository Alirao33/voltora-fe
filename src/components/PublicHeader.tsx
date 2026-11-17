'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Logo } from './Logo';
import { homeFor, useAuth } from './AuthProvider';
import { cx } from '@/lib/format';

const LINKS = [
  { href: '/stations', label: 'Stations' },
  { href: '/plans', label: 'Plans' },
  { href: '/swap', label: 'Quick swap' },
];

export function PublicHeader() {
  const { user } = useAuth();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={cx('rounded-md px-3 py-2 text-body font-medium transition-colors duration-150', path === l.href ? 'text-ink-900' : 'text-ink-600 hover:text-ink-900')}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Link href={homeFor(user)} className="rounded-lg bg-volt-500 px-4 py-2.5 text-body font-medium text-volt-950 transition-colors duration-150 hover:bg-volt-600">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2.5 text-body font-medium text-ink-700 transition-colors duration-150 hover:bg-ink-100">Sign in</Link>
              <Link href="/register" className="rounded-lg bg-volt-500 px-4 py-2.5 text-body font-medium text-volt-950 transition-colors duration-150 hover:bg-volt-600">Get started</Link>
            </>
          )}
        </div>
        <button className="flex h-11 w-11 items-center justify-center rounded-md md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </div>
      {open && (
        <div className="border-t border-line bg-white px-4 py-3 md:hidden">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-md px-2 py-3 text-body font-medium text-ink-700">{l.label}</Link>
          ))}
          <Link href={user ? homeFor(user) : '/login'} className="mt-2 block rounded-lg bg-volt-500 px-3 py-3 text-center text-body font-medium text-volt-950">
            {user ? 'Open dashboard' : 'Sign in'}
          </Link>
        </div>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-cell text-ink-600">
        <span>© {new Date().getFullYear()} Voltora · Battery swapping for Pakistan's riders</span>
        <div className="flex gap-4">
          <Link href="/admin/login" className="hover:text-ink-800">Operator login</Link>
          <Link href="/login" className="hover:text-ink-800">Driver login</Link>
        </div>
      </div>
    </footer>
  );
}
