'use client';
import { API_BASE } from '@/lib/api';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      full_name: fullName,
      username: username,
      password: password,
    };

    try {
      let res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (!res) throw new Error('network');

      if (res.ok) {
        router.push('/login');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || 'Failed to create account. Please try again.');
      }
    } catch (err) {
      setError('Connection error. Please ensure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Form Panel */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12">
        <div className="mb-8 flex items-center space-x-3">
          <div className="w-10 h-10 bg-volt-500 rounded-lg flex items-center justify-center text-volt-950 font-medium text-xl">
            ⚡
          </div>
          <span className="text-2xl font-bold text-ink-900">Voltora</span>
        </div>

        <div className="max-w-md w-full mx-auto">
          <h1 className="text-page text-ink-900">Create your account</h1>
          <p className="text-sm text-ink-600 mt-2">Start swapping in minutes.</p>

          {error && (
            <div className="mt-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center space-x-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="mt-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="ali"
                className="w-full px-4 py-3 rounded-lg border border-line focus:ring-2 focus:ring-volt-500 text-ink-900 bg-white shadow-sm transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ali5505"
                className="w-full px-4 py-3 rounded-lg border border-line focus:ring-2 focus:ring-volt-500 text-ink-900 bg-white shadow-sm transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg border border-line focus:ring-2 focus:ring-volt-500 text-ink-900 bg-white shadow-sm transition"
                required
              />
              <p className="text-sm text-ink-600 mt-1">At least 8 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-volt-500 hover:bg-volt-600 text-volt-950 font-medium rounded-lg transition-colors duration-150"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-sm text-center text-ink-600 mt-6">
            Already have one?{' '}
            <a href="/login" className="text-volt-700 font-medium hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>

      {/* Right panel: dark green */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-b from-ink-950 via-[#0c1f2a] to-[#0a3a2c] p-16 flex-col justify-between relative overflow-hidden">

        <div className="relative z-10 flex justify-end">
          <span className="px-3.5 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium">
            ● Voltora Network
          </span>
        </div>

        <div className="relative z-10 space-y-4 max-w-lg">
          <div className="flex items-center space-x-3 text-volt-300 text-sm font-mono">
            <span>⚡ 98%</span>
            <span>48.2V</span>
            <span>27°C</span>
          </div>

          <h2 className="text-3xl font-bold text-white leading-tight">
            Every pack is monitored live, so the one you pick up is always healthy and full
          </h2>
        </div>

        <div className="relative z-10 border-t border-white/10 pt-6 flex justify-between items-center text-xs text-ink-300">
          <span>© Voltora Network Karachi</span>
          <span>Battery Telemetry Systems</span>
        </div>
      </div>
    </div>
  );
}