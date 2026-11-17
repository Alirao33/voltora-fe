
'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Auth } from '@/lib/endpoints';
import { useAction } from '@/lib/hooks';
import { AuthLayout } from '@/components/AuthLayout';
import { homeFor, useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';
import { cx } from '@/lib/format';
import { Button, Field, Input, Tabs } from '@/components/ui';
import { AutoView } from '@/components/AutoView';

type Tab = 'password' | 'otp';
type Portal = 'RIDER' | 'DRIVER';
type TokenResponse = { access_token: string; refresh_token?: string | null };
type OtpResponse = { sent?: boolean; challenge_id?: number; expires_in?: number; dev_code?: string };

function safeNext(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\') || /^\/login(?:[/?]|$)/.test(raw)) return null;
  return raw;
}

function LoginInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const { user, signIn, signOut } = useAuth();
  const toast = useToast();
  const [portal, setPortal] = useState<Portal>(sp?.get('role') === 'driver' || (sp?.get('next') ?? '').startsWith('/driver') ? 'DRIVER' : 'RIDER'); // riders by default
  const next = safeNext(sp?.get('next'));
  const [tab, setTab] = useState<Tab>(sp?.get('tab') === 'otp' ? 'otp' : 'password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [otpSent, setOtpSent] = useState<OtpResponse | null>(null);
  const { run, busy } = useAction();

  const checking = useRef(false); // true while a fresh sign-in is being checked against the chosen portal

  useEffect(() => {
    if (user && !checking.current) router.replace(next ?? homeFor(user));
  }, [user, next, router]);

  const signInWith = (request: () => Promise<TokenResponse | undefined>) =>
    run(async () => {
      checking.current = true;
      try {
        const tokens = await request();
        if (!tokens?.access_token) return;
        const me = await signIn(tokens);
        // Keep riders and delivery men on their own side: a mismatch signs back out with a friendly hint.
        if (me && (me.role === 'RIDER' || me.role === 'DRIVER') && me.role !== portal) {
          signOut();
          toast.error(me.role === 'DRIVER' ? 'That is a delivery man account. Switch to Delivery man above.' : 'That is a rider account. Switch to Rider above.');
          return;
        }
        router.replace(next ?? homeFor(me));
      } finally {
        checking.current = false;
      }
    });

  const sendCode = () =>
    run(() => Auth.otpRequest(phone.trim()) as Promise<OtpResponse | undefined>, 'Code sent')
      .then(res => { if (res) setOtpSent(res); });

  return (
    <AuthLayout title="Welcome back" subtitle={portal === 'RIDER' ? 'Good to see you. Sign in to swap, track orders and manage your pass.' : 'Ready for the road? Sign in to see your deliveries.'}>
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-line bg-white p-1.5" role="tablist" aria-label="Sign in as">
        {([['RIDER', 'I am a rider'], ['DRIVER', 'I am a delivery man']] as const).map(([v, label]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={portal === v}
            onClick={() => setPortal(v)}
            className={cx('rounded-xl px-3 py-2.5 text-sm font-medium transition', portal === v ? 'bg-volt-500 text-volt-950 shadow' : 'text-ink-600 hover:bg-white')}
          >
            {label}
          </button>
        ))}
      </div>
      <Tabs value={tab} onChange={v => setTab(v === 'otp' ? 'otp' : 'password')} tabs={[{ value: 'password', label: 'Username' }, { value: 'otp', label: 'Phone (OTP)' }]} />

      {tab === 'password' ? (
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); signInWith(() => Auth.login(username.trim(), password) as Promise<TokenResponse | undefined>); }}>
          <Field label="Username">
            <Input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required />
          </Field>
          <Field label="Password">
            <div className="relative w-full">
              <Input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required className="pr-16" />
              <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-600 hover:text-volt-700 focus:outline-none focus-visible:underline">
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </Field>
          <Button type="submit" className="w-full" loading={busy}>Sign in</Button>
        </form>
      ) : !otpSent ? (
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); sendCode(); }}>
          <Field label="Phone number" hint="We'll text you a one-time code. New numbers get an account automatically.">
            <Input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="03xx xxxxxxx" required />
          </Field>
          <Button type="submit" className="w-full" loading={busy}>Send code</Button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={e => {
          e.preventDefault();
          signInWith(() => Auth.otpVerify({ phone: phone.trim(), code: code.trim(), full_name: name.trim() || null }) as Promise<TokenResponse | undefined>);
        }}>
          {otpSent.dev_code && <div className="rounded-lg bg-ink-50 p-3 text-xs"><AutoView data={otpSent} /></div>}
          <Field label={`Code sent to ${phone}`}>
            <Input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} minLength={4} maxLength={8} required className="font-mono tracking-[0.3em]" />
          </Field>
          <Field label="Full name (first time only)">
            <Input value={name} onChange={e => setName(e.target.value)} maxLength={120} />
          </Field>
          <Button type="submit" className="w-full" loading={busy}>Verify &amp; sign in</Button>
          <button type="button" className="w-full text-center text-sm text-ink-600 hover:text-ink-800" onClick={() => { setOtpSent(null); setCode(''); }}>
            Use a different number
          </button>
        </form>
      )}

      <div className="mt-8 space-y-2 text-center text-sm text-ink-600">
        {portal === 'RIDER'
          ? <p>New here? <Link href="/register" className="font-medium text-volt-700">Create an account</Link></p>
          : <p>Delivery man accounts are set up by your operator. Ask them if you can't sign in.</p>}
        <p>Operator? <Link href="/admin/login" className="font-medium text-ink-800">Admin sign in</Link></p>
      </div>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginInner /></Suspense>;
}
