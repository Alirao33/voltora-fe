'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getTokens, setTokens, type Tokens } from '@/lib/api';
import { Auth } from '@/lib/endpoints';
import type { Role, UserOut } from '@/lib/types';
import { Spinner } from './ui';

type Ctx = {
  user: UserOut | null | undefined; // undefined = still loading
  signIn: (t: Tokens) => Promise<UserOut | null>;
  signOut: () => void;
  refresh: () => Promise<UserOut | null>;
};

const AuthCtx = createContext<Ctx>({ user: undefined, signIn: async () => null, signOut: () => {}, refresh: async () => null });
export const useAuth = () => useContext(AuthCtx);

export const isAdmin = (u?: UserOut | null) =>
  !!u && (u.role === 'ADMIN' || (u.role as string) === 'STATION_ADMIN' || u.is_admin);

export const isSuperAdmin = (u?: UserOut | null) =>
  !!u && u.role === 'ADMIN' && !(u as any).station_id;

export const homeFor = (u?: UserOut | null) => (!u ? '/login' : isAdmin(u) ? '/admin' : u.role === 'DRIVER' ? '/driver' : '/rider');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserOut | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (!getTokens()) {
      setUser(null);
      return null;
    }
    try {
      const me = await Auth.me();
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => { if (!getTokens()) setUser(null); };
    window.addEventListener('voltora-auth', onChange);
    return () => window.removeEventListener('voltora-auth', onChange);
  }, [refresh]);

  const signIn = useCallback(async (t: Tokens) => {
    setTokens({ access_token: t.access_token, refresh_token: t.refresh_token ?? null });
    return refresh();
  }, [refresh]);

  const signOut = useCallback(() => {
    setTokens(null);
    setUser(null);
  }, []);

  return <AuthCtx.Provider value={{ user, signIn, signOut, refresh }}>{children}</AuthCtx.Provider>;
}

/** Client-side guard: redirects to login when signed out, blocks the wrong role. */
export function RequireAuth({ roles, loginPath = '/login', children }: { roles?: Role[]; loginPath?: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (user === undefined || user === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const allowed = !roles || roles.some((r) => (r === 'ADMIN' ? isAdmin(user) : user.role === r));
  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm rounded-xl border border-ink-200 bg-white p-6 text-center shadow-card">
          <h1 className="text-lg font-semibold text-ink-900">No access</h1>
          <p className="mt-2 text-sm text-ink-600">
            You're signed in as <b>{user.username || user.phone}</b> ({user.role.toLowerCase()}), which can't open this area.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <a href={homeFor(user)} className="rounded-lg bg-ink-900 px-3 py-2 text-sm font-medium text-white">Go to my dashboard</a>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}