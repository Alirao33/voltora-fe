'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ApiError } from '@/lib/api';
import { Auth } from '@/lib/endpoints';
import { useAuth } from '@/components/AuthProvider';

type FieldName = 'full_name' | 'username' | 'email' | 'phone' | 'password';

// Mirrors UserCreate.validate_password_complexity in backend/schemas/auth.py.
const PASSWORD_RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One uppercase letter (A-Z)', test: (v) => /[A-Z]/.test(v) },
  { label: 'One lowercase letter (a-z)', test: (v) => /[a-z]/.test(v) },
  { label: 'One number (0-9)', test: (v) => /\d/.test(v) },
  { label: 'One special character (!@#$%^&*)', test: (v) => /[!@#$%^&*(),.?":{}|<>]/.test(v) },
];

// Mirrors normalize_phone in backend/utils/security.py.
const PHONE_RE = /^(\+92|0)3\d{9}$/;

function validate(f: Record<FieldName, string>): Partial<Record<FieldName, string>> {
  const e: Partial<Record<FieldName, string>> = {};
  if (f.full_name.trim().length > 120) e.full_name = 'Full name must be 120 characters or fewer';
  const uname = f.username.trim();
  if (uname.length < 3 || uname.length > 64) e.username = 'Username must be 3 to 64 characters';
  else if (uname.includes('@') || /\s/.test(uname)) e.username = 'Username cannot contain spaces or @ (your email goes in the email field)';
  const email = f.email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address';
  else if (email.length > 64) e.email = 'Email must be 64 characters or fewer';
  if (f.phone.trim() && !PHONE_RE.test(f.phone.replace(/[\s\-()]/g, ''))) e.phone = 'Enter a valid Pakistani mobile number, e.g. 0300 1234567';
  if (f.password.length > 128) e.password = 'Password must be 128 characters or fewer';
  else if (!PASSWORD_RULES.every((r) => r.test(f.password))) e.password = 'Password does not meet all the requirements below';
  return e;
}

const SERVER_FIELD: Record<string, FieldName> = { username: 'username', email: 'email', password: 'password', phone: 'phone', full_name: 'full_name' };

/** Turns a FastAPI error into per-field messages plus anything that isn't tied to a field. */
function serverErrors(err: unknown): { fields: Partial<Record<FieldName, string>>; general: string[] } {
  const fields: Partial<Record<FieldName, string>> = {};
  const general: string[] = [];
  const detail = err instanceof ApiError ? (err.body as any)?.detail : undefined;
  if (Array.isArray(detail)) {
    for (const d of detail) {
      const msg = String(d?.msg ?? '').replace(/^Value error, /, '');
      const field = SERVER_FIELD[String((d?.loc ?? []).at(-1))];
      if (field && !fields[field]) fields[field] = msg;
      else general.push(msg);
    }
  } else {
    const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
    // 409s from /register name the field in plain words.
    if (/^Username /.test(msg)) fields.username = 'This username is taken. Choose another.';
    else if (/^Email /.test(msg)) fields.email = 'An account with this email already exists. Sign in instead.';
    else if (/^Phone /.test(msg)) fields.phone = 'This phone number is already registered.';
    else general.push(msg);
  }
  return { fields, general };
}

function RegisterForm() {
  const router = useRouter();
  const selectedPlan = useSearchParams().get('plan');
  const { signIn } = useAuth();

  const [formData, setFormData] = useState<Record<FieldName, string>>({ full_name: '', username: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [generalErrors, setGeneralErrors] = useState<string[]>([]);

  const fields: { name: FieldName; label: string; type: string; placeholder: string; required: boolean; autoComplete: string }[] = [
    { name: 'full_name', label: 'Full Name', type: 'text', placeholder: 'John Doe', required: false, autoComplete: 'name' },
    { name: 'username', label: 'Username (you sign in with this)', type: 'text', placeholder: 'johndoe', required: true, autoComplete: 'username' },
    { name: 'email', label: 'Email address', type: 'email', placeholder: 'rider@example.com', required: true, autoComplete: 'email' },
    { name: 'phone', label: 'Phone Number', type: 'tel', placeholder: '0300 1234567', required: false, autoComplete: 'tel' },
    { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••', required: true, autoComplete: 'new-password' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.name as FieldName;
    setFormData((prev) => ({ ...prev, [name]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralErrors([]);
    const local = validate(formData);
    setFieldErrors(local);
    if (Object.keys(local).length) return;

    setLoading(true);
    try {
      const username = formData.username.trim();
      await Auth.register({ username, email: formData.email.trim().toLowerCase(), password: formData.password, phone: formData.phone.trim() || null, full_name: formData.full_name.trim() || null });
      await signIn(await Auth.login(username, formData.password));
      router.push(selectedPlan ? `/rider/checkout?plan=${encodeURIComponent(selectedPlan)}` : '/rider/plans');
    } catch (err) {
      console.error('Registration error:', err);
      const { fields: f, general } = serverErrors(err);
      setFieldErrors(f);
      setGeneralErrors(general);
    } finally {
      setLoading(false);
    }
  };

  const problems = [
    ...fields.filter((f) => fieldErrors[f.name]).map((f) => `${f.label.replace(/ \(.*\)$/, '')}: ${fieldErrors[f.name]}`),
    ...generalErrors,
  ];

  return (
    <div className="min-h-screen bg-canvas text-ink-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2 text-volt-700 font-bold text-2xl">⚡ Voltora</Link>
        <h2 className="text-3xl font-bold">Create your Rider Account</h2>
        <p className="text-sm text-ink-600">
          {selectedPlan ? <>Registration is required to activate pass code: <code className="text-volt-700 font-mono bg-white px-2 py-0.5 rounded">{selectedPlan}</code></> : 'Registration is mandatory to purchase locker passes and swap batteries.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="surface py-8 px-4 sm:rounded-2xl sm:px-10">
          {problems.length > 0 && (
            <div role="alert" className="mb-4 bg-status-danger-bg border border-red-200 text-status-danger-fg px-4 py-3 rounded-xl text-sm">
              <p className="font-medium">{problems.length === 1 ? 'Please fix this:' : `Please fix these ${problems.length} things:`}</p>
              <ul className="mt-1 list-disc pl-5 space-y-0.5">
                {problems.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            {fields.map((field) => {
              const err = fieldErrors[field.name];
              return (
                <div key={field.name}>
                  <label htmlFor={field.name} className="block text-sm font-medium text-ink-700">
                    {field.label}{!field.required && <span className="text-ink-600"> (optional)</span>}
                  </label>
                  <input
                    id={field.name}
                    type={field.name === 'password' && showPw ? 'text' : field.type}
                    name={field.name}
                    required={field.required}
                    autoComplete={field.autoComplete}
                    value={formData[field.name]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    aria-invalid={!!err}
                    aria-describedby={err ? `${field.name}-error` : field.name === 'password' ? 'password-rules' : undefined}
                    className={`mt-1 block w-full rounded-lg bg-white border text-ink-900 px-3 py-2 text-sm focus:outline-none ${err ? 'border-red-500 focus:border-red-400' : 'border-line focus:border-emerald-500'}`}
                  />
                  {field.name === 'password' && (
                    <button type="button" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw} className="mt-1 text-xs font-medium text-volt-700">
                      {showPw ? 'Hide password' : 'Show password'}
                    </button>
                  )}
                  {err && <p id={`${field.name}-error`} className="mt-1 text-xs text-red-700">{err}</p>}
                  {field.name === 'password' && (
                    <ul id="password-rules" className="mt-2 space-y-0.5 text-xs" aria-live="polite">
                      {PASSWORD_RULES.map((r) => {
                        const ok = r.test(formData.password);
                        return (
                          <li key={r.label} className={ok ? 'text-volt-700' : 'text-ink-600'}>
                            <span aria-hidden="true">{ok ? '✓' : '○'}</span> {r.label}
                            <span className="sr-only">{ok ? ' (met)' : ' (not met)'}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}

            <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-volt-950 bg-volt-500 hover:bg-volt-600 focus:outline-none transition disabled:opacity-50">
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-ink-600">Already have an account? </span>
            <Link href={selectedPlan ? `/login?plan=${encodeURIComponent(selectedPlan)}` : '/login'} className="font-medium text-volt-700 hover:text-volt-700">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas text-ink-900 p-8 text-center">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
