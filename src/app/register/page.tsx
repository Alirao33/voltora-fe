
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

function RegisterForm() {
  const router = useRouter();
  const selectedPlan = useSearchParams().get('plan');

  const [formData, setFormData] = useState({ full_name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields = [
    { name: 'full_name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
    { name: 'email', label: 'Email address', type: 'email', placeholder: 'rider@example.com' },
    { name: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+92 300 1234567' },
    { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••' }
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.detail || 'Registration failed');

      const token = data.token || data.access_token;
      if (token) localStorage.setItem('token', token);

      router.push(selectedPlan
        ? `/rider/checkout?plan=${encodeURIComponent(selectedPlan)}`
        : '/rider/plans');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2 text-emerald-400 font-bold text-2xl">⚡ Voltora</Link>
        <h2 className="text-3xl font-extrabold tracking-tight">Create your Rider Account</h2>
        <p className="text-sm text-gray-400">
          {selectedPlan ? <>Registration is required to activate pass code: <code className="text-emerald-400 font-mono bg-slate-900 px-2 py-0.5 rounded">{selectedPlan}</code></> : 'Registration is mandatory to purchase locker passes and swap batteries.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-8 px-4 shadow border border-slate-800 sm:rounded-2xl sm:px-10">
          {error && <div className="mb-4 bg-red-950/50 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl text-sm">{error}</div>}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {fields.map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-300">{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  required
                  value={formData[field.name as keyof typeof formData]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  className="mt-1 block w-full rounded-xl bg-slate-800 border border-slate-700 text-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            ))}

            <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-600 focus:outline-none transition disabled:opacity-50">
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-400">Already have an account? </span>
            <Link href={selectedPlan ? `/login?plan=${encodeURIComponent(selectedPlan)}` : '/login'} className="font-medium text-emerald-400 hover:text-emerald-300">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white p-8 text-center">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
