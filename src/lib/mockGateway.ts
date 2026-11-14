// Client-side mock payment gateway for the rider app.
//
// Each checkout gets one UUID reference (`VLT-<uuid>`), generated in the browser. The backend
// stores it as Payment.reference (unique); resending a paid UUID returns the original order or
// subscription (backend paid_replay) instead of charging again.
// Keep it across retries after a timeout or 5xx (the server may already have charged); make a
// new one only after a definite failure (see shouldRotateReference). Prototype that settled
// this: PROTOTYPE-payment-attempt.html. The backend's `sandbox` gateway approves any reference
// that doesn't start with FAIL, so these references pass through unchanged.

import { ApiError } from './api';
import type { PaymentMethod } from './types';

export type MockOutcome = 'approve' | 'decline';

export type MockAuthorization = {
  ok: boolean;
  reference: string;     // send as payment_reference
  provider_ref: string;  // what a real PSP would return (display only)
  method: PaymentMethod;
  message: string;
};

/** RFC 4122 v4 UUID. crypto.randomUUID only exists in secure contexts (https/localhost). */
export function uuid(): string {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const newPaymentReference = () => `VLT-${uuid()}`;

const LABEL: Record<PaymentMethod, string> = { RAAST: 'Raast', WALLET: 'Mobile wallet', CARD: 'Card' };

/** Pretends to send the rider to a PSP and back. A decline never reaches the backend. */
export async function authorize(opts: { reference: string; method: PaymentMethod; amount_pkr?: number | null; outcome?: MockOutcome; delayMs?: number }): Promise<MockAuthorization> {
  const { reference, method, amount_pkr, outcome = 'approve', delayMs = 700 } = opts;
  await new Promise((r) => setTimeout(r, delayMs));
  const amount = amount_pkr != null ? ` for Rs ${amount_pkr.toLocaleString('en-PK')}` : '';
  if (outcome === 'decline') {
    return { ok: false, reference, provider_ref: '', method, message: `${LABEL[method]} payment${amount} was declined (simulated)` };
  }
  return { ok: true, reference, provider_ref: `MOCK-${reference.slice(-12).toUpperCase()}`, method, message: `${LABEL[method]} payment${amount} authorised` };
}

export class PaymentDeclined extends Error {}

/** authorize() that throws on decline, for use inside useAction().run. */
export async function authorizeOrThrow(opts: Parameters<typeof authorize>[0]): Promise<MockAuthorization> {
  const a = await authorize(opts);
  if (!a.ok) throw new PaymentDeclined(a.message);
  return a;
}

/**
 * After a failed attempt, should the checkout get a new reference?
 * Yes for a decline or a 4xx (the server recorded or refused it, nothing was charged).
 * No for network errors, 5xx and 409: the server may have charged, so retrying the same
 * reference returns the original result instead of charging twice.
 */
export function shouldRotateReference(e: unknown): boolean {
  if (e instanceof PaymentDeclined) return true;
  return e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 409;
}

/** Message for an error where the payment may already have gone through. */
export const maybePaidHint = (e: unknown) =>
  e instanceof ApiError && (e.status === 0 || e.status === 409 || e.status >= 500)
    ? " Your payment may already have gone through, so check your orders before paying again. Retrying is safe: you won't be charged twice."
    : '';
