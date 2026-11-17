'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Admin } from '@/lib/endpoints';
import { useApi } from '@/lib/hooks';
import { ago, dt, num } from '@/lib/format';
import { BatteryStateModal } from '@/components/BatteryStateModal';
import { LineChart } from '@/components/LineChart';
import { Badge, Button, Card, ErrorBox, Loading, Select, Stat } from '@/components/ui';

export default function BatteryDetail() {
  const { id } = useParams<{ id: string }>();
  const packId = decodeURIComponent(id);
  const [hours, setHours] = useState(24);
  const pack = useApi(() => Admin.battery(packId), [packId]);
  const hist = useApi(() => Admin.telemetryHistory(packId, hours, 2000), [packId, hours]);
  const [editing, setEditing] = useState(false);

  if (pack.loading) return <Loading />;
  if (pack.error || !pack.data) return <ErrorBox error={pack.error || 'Pack not found'} onRetry={pack.reload} />;
  const b = pack.data;
  const series = (k: 'soc' | 'voltage' | 'temperature_c' | 'health_score' | 'current_a' | 'soh') =>
    (hist.data || []).map((t) => ({ t: new Date(t.ts).getTime(), v: Number(t[k]) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/batteries" className="text-sm text-ink-600 hover:text-ink-800">← Batteries</Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-3 text-page text-ink-900">
            <span className="font-mono">{b.id}</span> <Badge value={b.state} /> <Badge value={b.health_status} />
          </h1>
          <p className="text-sm text-ink-600">
            {b.chemistry} · {num(b.rated_capacity_ah)} Ah · {num(b.nominal_voltage)} V nominal · last seen {ago(b.last_seen_at)}
            {b.station_id && <> · at <span className="font-mono">{b.station_id}{b.locker_id ? `/${b.locker_id}` : ''}</span></>}
            {b.van_id && <> · on van #{b.van_id}</>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { pack.reload(); hist.reload(); }}>Refresh</Button>
          <Button onClick={() => setEditing(true)}>Change state</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
        <Stat label="Health" value={num(b.health_score)} tone={b.health_score >= 70 ? 'good' : b.health_score >= 50 ? 'warn' : 'bad'} />
        <Stat label="SoC" value={`${num(b.soc, 0)}%`} />
        <Stat label="SoH" value={`${num(b.soh, 0)}%`} />
        <Stat label="Voltage" value={num(b.voltage, 2)} sub="V" />
        <Stat label="Current" value={num(b.current_a, 1)} sub="A" />
        <Stat label="Temp" value={num(b.temperature_c)} sub="°C" tone={b.temperature_c > 45 ? 'bad' : undefined} />
        <Stat label="Cycles" value={num(b.cycle_count, 0)} />
        <Stat label="Faults" value={num(b.fault_count, 0)} tone={b.fault_count ? 'warn' : undefined} />
      </div>

      <Card title="Telemetry" subtitle={`${hist.data?.length ?? 0} readings`} actions={
        <Select value={String(hours)} onChange={(e) => setHours(+e.target.value)} options={[['6', '6 hours'], ['24', '24 hours'], ['72', '3 days'], ['168', '7 days'], ['720', '30 days']].map(([v, l]) => ({ value: v, label: l }))} />
      }>
        <ErrorBox error={hist.error} onRetry={hist.reload} />
        {hist.loading ? <Loading /> : (
          <div className="grid gap-8 md:grid-cols-2">
            <LineChart label="State of charge" unit="%" points={series('soc')} />
            <LineChart label="Health score" points={series('health_score')} color="#677791" />
            <LineChart label="Voltage" unit=" V" points={series('voltage')} color="#2563eb" />
            <LineChart label="Temperature" unit=" °C" points={series('temperature_c')} color="#ea580c" />
            <LineChart label="Current" unit=" A" points={series('current_a')} color="#7c3aed" />
            <LineChart label="State of health" unit="%" points={series('soh')} color="#0b6639" />
          </div>
        )}
      </Card>

      <Card title="Pack details">
        <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          {[
            ['Full-charge capacity', `${num(b.full_charge_capacity_ah, 2)} Ah`],
            ['Remaining', `${num(b.remaining_ah, 2)} Ah`],
            ['Operating hours', num(b.operating_hours)],
            ['Supply voltage', b.supply_voltage_v != null ? `${num(b.supply_voltage_v, 1)} V` : '—'],
            ['Last seen', dt(b.last_seen_at)],
          ].map(([k, v]) => (
            <div key={k}><dt className="text-xs text-ink-600">{k}</dt><dd className="num">{v}</dd></div>
          ))}
        </dl>
      </Card>

      <BatteryStateModal pack={editing ? b : null} onClose={() => setEditing(false)} onSaved={(nb) => { setEditing(false); pack.setData(nb); }} />
    </div>
  );
}
