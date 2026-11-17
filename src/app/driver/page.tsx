'use client';
import { useEffect, useState } from 'react';
import { Driver } from '@/lib/endpoints';
import { useAction, useApi } from '@/lib/hooks';
import { cx } from '@/lib/format';
import type { VanTaskOut } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { MiniMap } from '@/components/domain';
import { OrderChat } from '@/components/OrderChat';
import { Badge, Button, ErrorBox, Field, Input, Loading, Modal, PageHeader, Stat } from '@/components/ui';

const km = (n?: number | null) => (n == null ? null : `${n.toFixed(1)} km`);
const directions = (t: VanTaskOut) => `https://www.google.com/maps/dir/?api=1&destination=${t.latitude},${t.longitude}`;
const nameOf = (t: VanTaskOut) => (t.kind === 'DELIVERY' ? t.customer_name || 'Customer' : `Station ${t.station_id}`);

/** Three steps of a home delivery: assigned, locker code shared by the rider, handed over. */
function Steps({ t }: { t: VanTaskOut }) {
  const steps = [
    { label: 'Assigned', on: true },
    { label: 'Locker code', on: t.locker_code_state === 'SHARED' },
    { label: 'Handover', on: false },
  ];
  return (
    <ol className="flex items-center gap-2 text-xs">
      {steps.map((s, i) => (
        <li key={s.label} className="flex flex-1 items-center gap-2">
          <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium', s.on ? 'bg-volt-500 text-volt-950' : 'bg-ink-200 text-ink-600')}>{s.on ? '✓' : i + 1}</span>
          <span className={cx('truncate', s.on ? 'font-medium text-ink-900' : 'text-ink-600')}>{s.label}</span>
          {i < steps.length - 1 && <span className={cx('h-px flex-1', s.on ? 'bg-volt-400' : 'bg-ink-200')} />}
        </li>
      ))}
    </ol>
  );
}

export default function DriverHome() {
  const { user } = useAuth();
  const van = useApi(() => Driver.me(), []);
  const tasks = useApi(() => Driver.tasks(true), []);
  const act = useAction();
  const [active, setActive] = useState<VanTaskOut | null>(null);
  const [otp, setOtp] = useState('');
  const [chatFor, setChatFor] = useState<VanTaskOut | null>(null);

  const refresh = () => Driver.tasks(true).then((r) => tasks.setData(r)).catch(() => {});

  // Quiet refresh so new stops and the rider's answer about the locker code show up without a reload.
  useEffect(() => {
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const all = tasks.data || [];
  const pending = all.filter((t) => t.status === 'PENDING').sort((a, b) => a.seq - b.seq || a.id - b.id);
  const today = new Date().toDateString();
  const doneToday = all.filter((t) => t.status === 'DONE' && t.confirmed_at && new Date(t.confirmed_at).toDateString() === today);
  const kmToday = doneToday.reduce((a, t) => a + (t.delivery_km || 0), 0);
  const [current, ...next] = pending;

  const askCode = async (t: VanTaskOut) => {
    if (!t.order_id) return;
    await act.run(() => Driver.requestLockerCode(t.order_id!), 'Request sent to the rider');
    refresh();
  };

  const handover = async () => {
    if (!active) return;
    const r = await act.run(() => Driver.confirm(active.id, { delivery_otp: otp.trim() }), 'Delivery completed. Order closed.');
    if (r) {
      setActive(null);
      setOtp('');
      refresh();
    }
  };

  if (van.loading || tasks.loading) return <Loading />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="My route" desc={`Hi ${user?.full_name?.split(' ').slice(-1)[0] || user?.username || 'there'} · ${van.data ? `Van ${van.data.name}` : 'Your deliveries'} · ${pending.length ? `${pending.length} stop${pending.length > 1 ? 's' : ''} left` : 'all clear'}`} />
      <ErrorBox error={van.error || tasks.error} onRetry={() => { van.reload(); tasks.reload(); }} />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Stops left" value={pending.length} tone={pending.length ? 'warn' : undefined} />
        <Stat label="Done today" value={doneToday.length} tone="good" />
        <Stat label="Km today" value={km(kmToday) ?? '0 km'} />
      </div>

      {!current && !tasks.error && (
        <div className="rounded-2xl surface p-8 text-center shadow-card">
          <div className="text-4xl">🚐</div>
          <h2 className="mt-3 text-lg font-medium text-ink-900">No deliveries right now</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-600">New home deliveries appear here as soon as an admin approves them. This page refreshes by itself.</p>
        </div>
      )}

      {current && (
        <div className="overflow-hidden rounded-2xl border border-volt-300 bg-white/95 shadow-card ring-2 ring-volt-500/15">
          <div className="flex items-center justify-between gap-3 bg-volt-50 px-5 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-volt-800">Current stop</span>
            <span className="flex items-center gap-2"><Badge value={current.kind} />{current.order_ref && <span className="font-mono text-xs text-ink-600">{current.order_ref}</span>}</span>
          </div>
          <div className="space-y-4 p-5">
            <div>
              <h2 className="text-xl font-medium text-ink-900">{nameOf(current)}</h2>
              <p className="text-sm text-ink-600">{current.address || current.station_id || '—'}</p>
              {current.kind === 'DELIVERY' && (
                <p className="mt-1 text-sm text-ink-600">
                  {km(current.delivery_km) ? `${km(current.delivery_km)} from the station` : ''}
                  {current.delivery_charge_pkr != null ? ` · delivery charge Rs ${Math.round(current.delivery_charge_pkr)}` : ''}
                </p>
              )}
            </div>

            {current.kind === 'DELIVERY' && <Steps t={current} />}

            {current.latitude != null && current.longitude != null && <MiniMap lat={current.latitude} lon={current.longitude} className="h-52" />}

            <div className="grid grid-cols-2 gap-3">
              {current.latitude != null && current.longitude != null && (
                <a href={directions(current)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center rounded-[10px] bg-volt-500 text-sm font-medium text-volt-950 transition-colors duration-150 hover:bg-volt-600">🧭 Directions</a>
              )}
              {current.kind === 'DELIVERY' && current.order_id && (
                <Button variant="secondary" className="h-11" onClick={() => setChatFor(current)}>💬 Chat</Button>
              )}
            </div>

            {current.kind === 'DELIVERY' && current.order_id && (
              <div className="rounded-xl border border-ink-100 bg-ink-50/70 p-4">
                {current.locker_code_state === 'SHARED' && current.locker_code ? (
                  <div className="text-center">
                    <div className="text-xs uppercase tracking-widest text-ink-600">Locker code</div>
                    <div className="font-mono text-4xl font-bold tracking-[0.3em] text-ink-900">{current.locker_code}</div>
                  </div>
                ) : current.locker_code_state === 'REQUESTED' ? (
                  <p className="text-center text-sm text-ink-600">Waiting for the rider to allow the locker code…</p>
                ) : (
                  <Button variant="secondary" className="w-full" loading={act.busy} onClick={() => askCode(current)}>Ask rider for the locker code</Button>
                )}
              </div>
            )}

            {current.kind === 'DELIVERY' ? (
              <Button size="lg" className="w-full" onClick={() => { setOtp(''); setActive(current); }}>Verify delivery OTP &amp; hand over</Button>
            ) : (
              <Button size="lg" className="w-full" variant="secondary" loading={act.busy} onClick={async () => { if (await act.run(() => Driver.confirm(current.id, {}), 'Stop confirmed')) refresh(); }}>
                Confirm stop ({current.drop_count} drop / {current.pickup_count} pickup)
              </Button>
            )}
            <p className="text-center text-xs text-ink-600">Payment is already settled online. You cannot change the amount.</p>
          </div>
        </div>
      )}

      {next.length > 0 && (
        <div className="space-y-3">
          <h3 className="px-1 text-xs font-medium uppercase tracking-wide text-ink-600">Up next</h3>
          {next.map((t, i) => (
            <div key={t.id} className="flex items-center gap-3 rounded-2xl surface p-4 shadow-card">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-sm font-medium text-ink-700">{i + 2}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-ink-900">{nameOf(t)}</div>
                <div className="truncate text-xs text-ink-600">{t.address || t.station_id || '—'}{km(t.delivery_km) ? ` · ${km(t.delivery_km)}` : ''}</div>
              </div>
              {t.kind === 'DELIVERY' && t.order_id && <Button size="sm" variant="ghost" onClick={() => setChatFor(t)}>💬</Button>}
              {t.latitude != null && t.longitude != null && <a href={directions(t)} target="_blank" rel="noreferrer" className="text-sm font-medium text-volt-700 underline">Map</a>}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!chatFor} onClose={() => setChatFor(null)} title={`Chat with ${chatFor?.customer_name || 'the rider'}`}>
        {chatFor?.order_id && <OrderChat orderId={chatFor.order_id} side="DRIVER" />}
      </Modal>

      <Modal
        open={!!active}
        onClose={() => !act.busy && setActive(null)}
        title="Confirm customer handover"
        footer={
          <>
            <Button variant="ghost" disabled={act.busy} onClick={() => setActive(null)}>Cancel</Button>
            <Button loading={act.busy} disabled={otp.trim().length < 3} onClick={handover}>Verify &amp; hand over</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-ink-600">Ask {active?.customer_name || 'the customer'} for the delivery OTP shown on their order page.</p>
          <Field label="Delivery OTP">
            <Input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} maxLength={8} className="font-mono tracking-widest" placeholder="e.g. 4829" inputMode="numeric" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
