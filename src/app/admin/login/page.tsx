
'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Auth } from '@/lib/endpoints';
import { useAction } from '@/lib/hooks';
import { AuthLayout } from '@/components/AuthLayout';
import { isAdmin, useAuth } from '@/components/AuthProvider';
import { Button, Field, Input } from '@/components/ui';
import { useToast } from '@/components/Toast';

function AdminLoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const toast = useToast();
  const { user, signIn, signOut } = useAuth();
  const { run, busy } = useAction();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [challenge, setChallenge] = useState<any>(null);
  const [code, setCode] = useState('');

  const next = sp.get('next') || '/admin';

  useEffect(() => {
    if (user && isAdmin(user)) router.replace(next);
  }, [user, next, router]);

  const finish = async (token: any) => {
    const me = await signIn(token);
    if (!isAdmin(me)) {
      signOut();
      toast.error('That account is not an administrator');
      return;
    }
    router.replace(next);
  };

  const step1 = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await run(() => Auth.adminLogin(username, password));
    if (!r) return;

    if (r.access_token) return finish(r);
    if (r.challenge_id == null) return toast.error('Unexpected response from server');

    setChallenge(r);
    toast.info(r.message || 'Enter the verification code we sent you');
  };

  const step2 = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await run(() => Auth.adminVerify(Number(challenge.challenge_id), code));
    if (token) await finish(token);
  };

  // The backend only includes dev_code outside production, so show it whenever it is present.
  const devCode = challenge?.dev_code ?? challenge?.code ?? challenge?.debug_code;

  return (
    <AuthLayout
      title="Operator sign in"
      subtitle="Two-step verification for administrators."
      side={<p className="max-w-md text-3xl font-semibold leading-tight">Fleet health, pricing, forecasting and rebalancing — in one console.</p>}
    >
      {!challenge ? (
        <form onSubmit={step1} className="space-y-4">
          <Field label="Username">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
          </Field>
          <Field label="Password">
            <div className="relative">
              <Input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="pr-16" />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-3 text-sm font-medium text-ink-500 hover:text-ink-800"
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </Field>
          <Button type="submit" variant="dark" className="w-full" loading={busy}>Continue</Button>
        </form>
      ) : (
        <form onSubmit={step2} className="space-y-4">
          <div className="rounded-lg border border-ink-200 bg-ink-50 p-3 text-sm text-ink-600">
            Step 2 of 2 · Challenge <span className="font-mono">{challenge.challenge_id}</span>
            {challenge.channel && <> · sent via {challenge.channel}</>}
            {devCode && <div className="mt-1 text-xs">Dev code: <span className="font-mono font-semibold">{devCode}</span></div>}
          </div>
          <Field label="Verification code">
            <Input value={code} onChange={(e) => setCode(e.target.value)} minLength={4} maxLength={8} required inputMode="numeric" autoComplete="one-time-code" className="font-mono tracking-[0.3em]" autoFocus />
          </Field>
          <Button type="submit" variant="dark" className="w-full" loading={busy}>Verify</Button>
          <button type="button" className="w-full text-sm text-ink-500 hover:text-ink-800" onClick={() => { setChallenge(null); setCode(''); }}>
            Start over
          </button>
        </form>
      )}
      <Link href="/login" className="mt-6 inline-block text-sm font-medium text-ink-600 hover:text-ink-900">← Back to rider sign in</Link>
    </AuthLayout>
  );
}

export default function AdminLogin() {
  return <Suspense><AdminLoginInner /></Suspense>;
}
