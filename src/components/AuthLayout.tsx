import { Logo } from './Logo';

export function AuthLayout({ title, subtitle, children, side }: { title: string; subtitle?: string; children: React.ReactNode; side?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white lg:grid lg:grid-cols-2">
      {/* Phones and tablets: a compact dark-green band instead of the side panel. */}
      <div className="bg-gradient-to-br from-volt-950 via-[#06382a] to-volt-900 px-5 pb-8 pt-6 text-white lg:hidden">
        <Logo dark />
        <p className="mt-5 max-w-sm text-lg font-semibold leading-snug">Every pack is monitored live, so the one you pick up is always healthy and full.</p>
      </div>
      <div className="flex flex-1 flex-col px-5 py-6 sm:px-12 lg:py-8">
        <div className="hidden lg:block"><Logo /></div>
        <div className="flex flex-1 items-start lg:items-center">
          <div className="mx-auto w-full max-w-sm py-6 lg:py-12">
            <h1 className="text-page text-volt-950">{title}</h1>
            {subtitle && <p className="mt-2 text-body text-ink-600">{subtitle}</p>}
            <div className="mt-6 lg:mt-8">{children}</div>
          </div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-to-b from-volt-950 via-[#06382a] to-volt-900 lg:block">
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
