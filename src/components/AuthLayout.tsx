import { Logo } from './Logo';

export function AuthLayout({ title, subtitle, children, side }: { title: string; subtitle?: string; children: React.ReactNode; side?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-sm py-12">
            <h1 className="text-page text-ink-900">{title}</h1>
            {subtitle && <p className="mt-2 text-body text-ink-600">{subtitle}</p>}
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-to-b from-ink-950 via-[#0c1f2a] to-[#0a3a2c] lg:block">
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          {side ?? (
            <>
              <div className="id-mono text-volt-300">⚡ 98% · 48.2V · 27°C</div>
              <p className="mt-4 max-w-md text-3xl font-bold leading-tight">Every pack is monitored live, so the one you pick up is always healthy and full.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
