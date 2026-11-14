import Link from 'next/link';
import { cx } from '@/lib/format';

export function Logo({ dark, href = '/' }: { dark?: boolean; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-volt-500 text-volt-950">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M13.5 2 4 13.5h6.2L9.5 22 19 10.5h-6.2L13.5 2Z" />
        </svg>
      </span>
      <span className={cx('text-lg font-semibold tracking-tight', dark ? 'text-white' : 'text-ink-950')}>Voltora</span>
    </Link>
  );
}
