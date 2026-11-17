import Link from 'next/link';
import { cx } from '@/lib/format';

/** Lime chip with a dark bolt, plus the wordmark. */
export function Logo({ href = '/', className }: { dark?: boolean; href?: string; className?: string }) {
  return (
    <Link href={href} className={cx('flex items-center gap-2', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-volt-500 text-volt-950">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M13.5 2 4 13.5h6.2L9.5 22 19 10.5h-6.2L13.5 2Z" />
        </svg>
      </span>
      <span className="text-lg font-bold text-ink-900">Voltora</span>
    </Link>
  );
}
