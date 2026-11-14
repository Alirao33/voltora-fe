import { Logo } from './Logo';

export function AuthLayout({ title, subtitle, children, side }: { title: string; subtitle?: string; children: React.ReactNode; side?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-sm py-12">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-ink-950 lg:block">
        <div className="grid-bg absolute inset-0" />
        <div className="absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-volt-500/25 blur-3xl" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          {side ?? (
            <>
              <div className="font-mono text-sm text-volt-400">⚡ 98% · 48.2V · 27°C</div>
              <p className="mt-4 max-w-md text-3xl font-semibold leading-tight">Every pack is monitored live, so the one you pick up is always healthy and full.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
