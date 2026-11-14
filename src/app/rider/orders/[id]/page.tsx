'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Rider } from '@/lib/endpoints';
import { useAction, useApi } from '@/lib/hooks';
import { cx, dt, pkr } from '@/lib/format';
import { AutoView, RawJson } from '@/components/AutoView';
import { Badge, Button, Card, ErrorBox, Field, Input, Loading, Modal, Mono, Textarea } from '@/components/ui';

const FLOW = ['PENDING_PAYMENT', 'PAID', 'IN_PROGRESS', 'COMPLETED'];

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: o, loading, error, reload, setData } = useApi(() => Rider.order(id), [id]);
  const act = useAction();
  const [code, setCode] = useState('');
  const [returned, setReturned] = useState('');
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [receipt, setReceipt] = useState<any>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (loading) return <Loading />;
  if (error || !o) return <ErrorBox error={error || 'Order not found'} onRetry={reload} />;

  const update = (r?: any) => r && setData(r);
  const step = FLOW.indexOf(o.status);
  const closed = ['COMPLETED', 'CANCELLED', 'EXPIRED', 'FAILED'].includes(o.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/rider/orders" className="text-sm text-ink-500 hover:text-ink-800">← My orders</Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            <span className="font-mono">{o.order_id}</span> <Badge value={o.status} />
          </h1>
          <p className="text-sm text-ink-500">{o.mode.toLowerCase()} swap at {o.station_id} · created {dt(o.created_at)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={async () => { const r = await act.run(() => Rider.receipt(o.id)); if (r) setReceipt(r); }}>Receipt</Button>
          {!closed && <Button variant="danger" onClick={() => setConfirmCancel(true)}>Cancel order</Button>}
        </div>
      </div>

      {/* progress */}
      {step >= 0 && (
        <div className="flex items-center gap-2">
          {FLOW.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div className={cx('h-1.5 flex-1 rounded-full', i <= step ? 'bg-volt-500' : 'bg-ink-200')} />
              <span className={cx('hidden text-xs sm:inline', i <= step ? 'font-medium text-ink-800' : 'text-ink-400')}>{s.replace('_', ' ').toLowerCase()}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          {o.pickup_code && !closed && (
            <div className="rounded-2xl bg-ink-950 p-6 text-white">
              <div className="text-xs uppercase tracking-widest text-ink-400">Pickup code</div>
              <div className="mt-2 font-mono text-4xl font-semibold tracking-[0.3em] text-volt-400">{o.pickup_code}</div>
              <div className="mt-3 text-sm text-ink-300">
                {o.slot_id && <>Slot <b className="font-mono">{o.slot_id}</b> · </>}
                {o.hold_expires_at && <>held until {dt(o.hold_expires_at)}</>}
              </div>
              {o.delivery_otp && <div className="mt-3 text-sm text-ink-300">Delivery OTP for driver: <b className="font-mono text-white">{o.delivery_otp}</b></div>}
            </div>
          )}

          {['PAID', 'PENDING_PAYMENT'].includes(o.status) && o.mode !== 'HOME' && (
            <Card title="1 · Unlock the locker">
              <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); update(await act.run(() => Rider.unlock(o.id, code || o.pickup_code || ''), 'Locker unlocked — take your pack')); }}>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder={o.pickup_code || 'Pickup code'} minLength={3} maxLength={8} className="font-mono" />
                <Button type="submit" loading={act.busy}>Unlock</Button>
              </form>
            </Card>
          )}

          {(o.status === 'IN_PROGRESS' || (o.mode === 'HOME' && o.status === 'PAID')) && (
            <Card title="2 · Return your old pack">
              <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); update(await act.run(() => Rider.complete(o.id, returned), 'Swap complete!')); }}>
                <Field label="Depleted pack ID" hint="Scan the QR on your old battery">
                  <Input value={returned} onChange={(e) => setReturned(e.target.value)} placeholder="VOLT-0042" className="font-mono" />
                </Field>
                <Button type="submit" loading={act.busy}>Complete swap</Button>
              </form>
            </Card>
          )}

          {o.status === 'COMPLETED' && (
            <Card title={o.rating ? 'Your rating' : 'How was it?'}>
              {o.rating ? (
                <div className="text-2xl">{'★'.repeat(o.rating)}<span className="text-ink-200">{'★'.repeat(5 - o.rating)}</span></div>
              ) : (
                <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); update(await act.run(() => Rider.rate(o.id, rating, review), 'Thanks for the feedback')); }}>
                  <div className="flex gap-1 text-3xl">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button type="button" key={n} onClick={() => setRating(n)} className={n <= rating ? 'text-amber-400' : 'text-ink-200'}>★</button>
                    ))}
                  </div>
                  <Textarea value={review} onChange={(e) => setReview(e.target.value)} maxLength={500} placeholder="Anything we should know? (optional)" />
                  <Button type="submit" loading={act.busy}>Submit rating</Button>
                </form>
              )}
            </Card>
          )}
        </div>

        <Card title="Summary">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-xs text-ink-500">Quoted total</dt><dd className="font-mono text-lg font-semibold">{pkr(o.total_pkr)}</dd></div>
            <div><dt className="text-xs text-ink-500">Charged</dt><dd className="font-mono text-lg font-semibold">{pkr(o.charged_pkr)}</dd></div>
            <div><dt className="text-xs text-ink-500">Actual total</dt><dd className="font-mono">{pkr(o.actual_total_pkr)}</dd></div>
            <div>
              <dt className="text-xs text-ink-500">Settlement</dt>
              <dd className={cx('font-mono', (o.settlement_delta_pkr ?? 0) < 0 ? 'text-volt-700' : (o.settlement_delta_pkr ?? 0) > 0 ? 'text-red-600' : '')}>
                {o.settlement_delta_pkr == null ? '—' : `${o.settlement_delta_pkr > 0 ? '+' : ''}${pkr(o.settlement_delta_pkr)}`}
              </dd>
            </div>
            <div><dt className="text-xs text-ink-500">Pack issued</dt><dd><Mono>{o.pack_out_id || '—'}</Mono></dd></div>
            <div><dt className="text-xs text-ink-500">Pack returned</dt><dd><Mono>{o.pack_in_id || '—'}</Mono></dd></div>
            {o.delivery_address && <div className="col-span-2"><dt className="text-xs text-ink-500">Delivery to</dt><dd>{o.delivery_address}</dd></div>}
            {o.receipt_no && <div><dt className="text-xs text-ink-500">Receipt</dt><dd><Mono>{o.receipt_no}</Mono></dd></div>}
            {o.completed_at && <div><dt className="text-xs text-ink-500">Completed</dt><dd>{dt(o.completed_at)}</dd></div>}
          </dl>
          <div className="mt-5 border-t border-ink-100 pt-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Price breakdown</div>
            <AutoView data={o.price} />
          </div>
        </Card>
      </div>

      <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel this order?" footer={
        <>
          <Button variant="ghost" onClick={() => setConfirmCancel(false)}>Keep it</Button>
          <Button variant="danger" loading={act.busy} onClick={async () => { update(await act.run(() => Rider.cancel(o.id), 'Order cancelled')); setConfirmCancel(false); }}>Cancel order</Button>
        </>
      }>
        <p className="text-sm text-ink-600">The reserved pack will be released. Any refund follows the cancellation policy.</p>
      </Modal>

      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Receipt" wide footer={<Button variant="secondary" onClick={() => window.print()}>Print</Button>}>
        <AutoView data={receipt} />
        <RawJson data={receipt} />
      </Modal>
    </div>
  );
}
