'use client';

import { perPeriod } from '@/lib/format';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, asList } from '@/lib/api';
import { Rider } from '@/lib/endpoints';
import { usePageTitle } from '@/lib/hooks';
import { Modal } from '@/components/ui';
import type { PaymentMethod } from '@/lib/types';
import { authorizeOrThrow, maybePaidHint, newPaymentReference, shouldRotateReference } from '@/lib/mockGateway';

interface Plan {
  id: number;
  code: string;
  name: string;
  duration_type: string;
  duration_days: number;
  price_pkr: number;
}

function CheckoutForm() {
  usePageTitle('Confirm subscription');
  const router = useRouter();
  const searchParams = useSearchParams();
  const planCode = searchParams.get('plan');

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('RAAST');
  const [lastRef, setLastRef] = useState<string | null>(null);
  const refId = useRef<string | null>(null); // one reference per checkout
  const [current, setCurrent] = useState<{ ends_at: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    Rider.subscription().then((s) => setCurrent(s || null)).catch(() => {});
  }, []);

  const handleCancel = async () => {
    setCancelling(true);
    setPayError(null);
    try {
      await Rider.cancelSubscription();
      setCurrent(null);
    } catch (err: any) {
      setPayError(err?.message || 'Could not cancel the subscription.');
    } finally {
      setCancelling(false);
      setConfirmOpen(false);
    }
  };

  useEffect(() => {


    if (!planCode) {
      router.push('/rider/plans');
      return;
    }

    api<any>('/api/plans', { auth: false })
      .then((data) => {
        const list = asList(data);
        const found = list.find((p: any) => p.code === planCode || p.plan_code === planCode);
        if (found) {
          setPlan({
            id: Number(found.id ?? found.plan_id),
            code: found.code || found.plan_code,
            name: found.name || 'Locker Pass',
            duration_type: found.duration_type || 'Pass',
            duration_days: Number(found.duration_days) || 0,
            price_pkr: Number(found.price_pkr) || 0,
          });
        } else {
          setError('Selected subscription plan was not found.');
        }
      })
      .catch((err) => {
        console.error('Failed to load plan details:', err);
        setError('Could not verify subscription plan.');
      })
      .finally(() => setLoading(false));
  }, [planCode, router]);

  const handleConfirmSubscription = async () => {
    if (!plan) return;
    setSubmitting(true);
    setPayError(null);
    try {
      refId.current ??= newPaymentReference();
      // First click only shows the bill code; the next click starts the subscription.
      if (!lastRef) {
        setLastRef(refId.current);
        setSubmitting(false);
        return;
      }
      const auth = await authorizeOrThrow({ reference: refId.current, method, amount_pkr: plan.price_pkr, outcome: 'approve' });
      await Rider.subscribe(plan.id, { payment_method: method, payment_reference: auth.reference });
      refId.current = null;
      router.push('/rider/bookings'); // next step: pick a station for the locker
    } catch (err: any) {
      if (shouldRotateReference(err)) refId.current = null;
      setPayError((err?.message || 'Payment processing failed. Try again.') + maybePaidHint(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas text-ink-900 flex items-center justify-center p-8">
        <p className="text-ink-600">Loading subscription summary...</p>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-canvas text-ink-900 flex flex-col items-center justify-center p-8 space-y-4 text-center">
        <p className="text-red-700">{error || 'Invalid subscription request.'}</p>
        <button
          onClick={() => router.push('/rider/plans')}
          className="border border-line bg-white text-ink-800 hover:bg-ink-50 px-4 py-2 rounded-xl text-sm font-medium"
        >
          Return to Plans
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-ink-900 p-6 md:p-12">
      <div className="max-w-xl mx-auto space-y-8">
        <div>
          <h1 className="text-page text-ink-900">Confirm Subscription</h1>
          <p className="text-ink-600 mt-2">
            Review your Locker Pass details before activating station storage access.
          </p>
        </div>

        <div className="surface rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex justify-between items-start border-b border-line pb-4">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-volt-700">
                {plan.duration_type}
              </span>
              <h2 className="text-2xl font-bold text-ink-900 mt-1">{plan.name}</h2>
              <p className="text-xs text-ink-600 mt-1">Code: {plan.code}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-ink-900">
                Rs {plan.price_pkr.toLocaleString('en-PK')}
              </span>
              <p className="text-xs text-ink-600">{perPeriod(plan.duration_days)}</p>
            </div>
          </div>

          <ul className="space-y-3 text-sm text-ink-700">
            <li className="flex items-center gap-2">⚡ Unlimited station locker access rights</li>
            <li className="flex items-center gap-2">⚡ Priority swapping queue priority</li>
            <li className="flex items-center gap-2">⚡ Linked directly to your registered rider profile</li>
          </ul>

          {current && (
            <div className="rounded-xl border border-amber-300 bg-status-warning-bg p-4 text-body text-status-warning-fg flex items-center justify-between gap-3">
              <span>You have an active subscription until {new Date(current.ends_at).toLocaleDateString('en-PK')}.</span>
              <button
                onClick={() => setConfirmOpen(true)}
                className="shrink-0 rounded-lg border border-line bg-white text-volt-700 hover:bg-volt-50 hover:text-red-700 px-3 py-1.5 text-xs font-medium"
              >
                Cancel subscription
              </button>
            </div>
          )}
          <Modal
            open={confirmOpen}
            onClose={() => !cancelling && setConfirmOpen(false)}
            title="Cancel subscription?"
            footer={
              <>
                <button onClick={() => setConfirmOpen(false)} disabled={cancelling} className="rounded-lg px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100 disabled:opacity-50">
                  Keep it
                </button>
                <button onClick={handleCancel} disabled={cancelling} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-volt-700 hover:bg-volt-50 hover:text-red-700 disabled:opacity-50">
                  {cancelling ? 'Cancelling...' : 'Yes, cancel'}
                </button>
              </>
            }
          >
            <p className="text-sm text-ink-700">Your current subscription will end immediately. No refund is issued.</p>
          </Modal>

          <div className="grid gap-3 sm:grid-cols-2 border-t border-line pt-4">
            <label className="text-xs text-ink-600 space-y-1">
              <span>Payment method</span>
              <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="w-full rounded-xl bg-ink-100 border border-line px-3 py-2 text-sm text-ink-900">
                <option value="RAAST">Raast</option>
                <option value="WALLET">Mobile wallet</option>
                <option value="CARD">Card</option>
              </select>
            </label>
          </div>

          {lastRef && (
            <p className="text-sm text-ink-600">
              Bill code: <code className="font-mono text-volt-700 break-all">{lastRef}</code>
              <span className="block text-xs text-ink-600 mt-1">Click Activate Pass again to pay and start your subscription.</span>
            </p>
          )}
          <Modal open={!!payError && !confirmOpen} onClose={() => setPayError(null)} title="Payment not completed" footer={<button onClick={() => setPayError(null)} className="rounded-lg bg-volt-500 px-4 py-2 text-sm font-medium text-volt-950">OK</button>}>
            <p className="text-sm text-ink-700">{payError}</p>
          </Modal>

          <button
            onClick={handleConfirmSubscription}
            disabled={submitting}
            className="w-full bg-volt-500 hover:bg-volt-600 text-volt-950 font-medium py-3.5 rounded-xl transition disabled:opacity-50"
          >
            {submitting
              ? 'Processing payment...'
              : `Activate Pass (Rs ${plan.price_pkr.toLocaleString('en-PK')})`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas text-ink-900 p-8 text-center">Loading...</div>}>
      <CheckoutForm />
    </Suspense>
  );
}