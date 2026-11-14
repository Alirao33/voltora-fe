'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Rider } from '@/lib/endpoints';
import { useAction, useForm, useRecentBookings } from '@/lib/hooks';
import { ENUMS, type ActionType } from '@/lib/types';
import { enumLabel, localToIso } from '@/lib/format';
import { useAuth } from '@/components/AuthProvider';
import { StationSelect } from '@/components/domain';
import { Button, Card, Empty, Field, Input, PageHeader, Select } from '@/components/ui';
import { useToast } from '@/components/Toast';

export default function Bookings() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { ids, add } = useRecentBookings();
  const [lookup, setLookup] = useState('');
  const f = useForm({ site_id: '', locker_id: '', action_type: 'SWAP_DROP_AND_PICK' as ActionType, scheduled_time: '' });
  const { run, busy } = useAction();

  const actions = ENUMS.ActionType.filter((a) => a !== 'GUEST_PAY_SWAP' && (a !== 'RESERVE_VIP_SLOT' || user?.is_vip));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.values.site_id) return toast.error('Pick a station');
    const r = await run(() => Rider.bookLocker({
      site_id: f.values.site_id,
      locker_id: f.values.locker_id || null,
      action_type: f.values.action_type,
      scheduled_time: localToIso(f.values.scheduled_time),
    }), 'Locker booked');
    const bid = r && (r.booking_id ?? r.id ?? r.booking?.booking_id);
    if (bid) { add(String(bid)); router.push(`/rider/bookings/${bid}`); }
  };

  return (
    <>
      <PageHeader title="Locker bookings" desc="Reserve a specific locker door ahead of time." />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card title="Book a locker">
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Station" className="sm:col-span-2"><StationSelect value={f.values.site_id} onChange={(x) => f.set('site_id', x)} placeholder="Choose a station" /></Field>
            <Field label="Locker ID (optional)" hint="Leave empty for any free locker"><Input {...f.bind('locker_id')} /></Field>
            <Field label="Booking type"><Select {...f.bind('action_type')} options={actions.map((a) => ({ value: a, label: a === 'RESERVE_VIP_SLOT' ? 'VIP reserved slot' : enumLabel(a) }))} /></Field>
            <Field label="Arrive at (optional)"><Input type="datetime-local" {...f.bind('scheduled_time')} /></Field>
            <div className="flex items-end"><Button type="submit" loading={busy} className="w-full">Book locker</Button></div>
          </form>
        </Card>
        <div className="space-y-6">
          <Card title="Open a booking">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (lookup) router.push(`/rider/bookings/${encodeURIComponent(lookup.trim())}`); }}>
              <Input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="Booking ID" className="font-mono" />
              <Button type="submit" variant="dark">Open</Button>
            </form>
          </Card>
          <Card title="Recent on this device">
            {ids.length ? (
              <ul className="divide-y divide-ink-100">
                {ids.map((id) => (
                  <li key={id}><Link href={`/rider/bookings/${encodeURIComponent(id)}`} className="flex justify-between py-2.5 font-mono text-sm hover:text-volt-700">{id}<span>→</span></Link></li>
                ))}
              </ul>
            ) : <Empty title="No bookings yet" />}
          </Card>
        </div>
      </div>
    </>
  );
}
