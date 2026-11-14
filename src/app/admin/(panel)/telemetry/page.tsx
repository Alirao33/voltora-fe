'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Telemetry } from '@/lib/endpoints';
import { useAction, useForm } from '@/lib/hooks';
import type { BatteryOut, TelemetryIn } from '@/lib/types';
import { toNum } from '@/lib/format';
import { AutoView, RawJson } from '@/components/AutoView';
import { Button, Card, Field, Input, PageHeader } from '@/components/ui';

const FIELDS: [keyof TelemetryIn, string][] = [
  ['soc', 'SoC (%)'], ['soh', 'SoH (%)'], ['remaining_ah', 'Remaining (Ah)'], ['full_charge_ah', 'Full charge (Ah)'],
  ['rated_ah', 'Rated (Ah)'], ['cycle_count', 'Cycle count'], ['fault_count', 'Fault count'], ['operating_hours', 'Operating hours'],
  ['supply_voltage_v', 'Supply voltage (V)'],
];

export default function TelemetryPage() {
  const [lookup, setLookup] = useState('');
  const [latest, setLatest] = useState<BatteryOut | null>(null);
  const [ingested, setIngested] = useState<any>(null);
  const [deviceKey, setDeviceKey] = useState('');
  const f = useForm<Record<string, string>>({ pack_id: '', voltage: '52.1', current_a: '0', temperature_c: '28', station_id: '', slot_id: '', ts: '' });
  const act = useAction();

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = f.values;
    const body: TelemetryIn = {
      pack_id: v.pack_id, voltage: Number(v.voltage), current_a: Number(v.current_a) || 0, temperature_c: Number(v.temperature_c),
      ts: v.ts ? new Date(v.ts).toISOString() : null, station_id: v.station_id || null, slot_id: v.slot_id || null,
    };
    for (const [k] of FIELDS) { const n = toNum(v[k as string] ?? ''); if (n !== null) (body as any)[k] = n; }
    const r = await act.run(() => Telemetry.ingest(body, deviceKey || undefined), 'Reading accepted');
    if (r !== undefined) setIngested(r ?? { accepted: true });
  };

  return (
    <>
      <PageHeader title="Telemetry" desc="Inspect the latest reading for any pack, or push a test reading (normally sent by station controllers over MQTT)." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Latest reading">
          <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); const r = await act.run(() => Telemetry.latest(lookup.trim())); if (r) setLatest(r); }}>
            <Input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="Pack ID" className="font-mono" />
            <Button type="submit" variant="dark" loading={act.busy}>Look up</Button>
          </form>
          {latest && (
            <div className="mt-5">
              <AutoView data={latest} />
              <Link href={`/admin/batteries/${encodeURIComponent(latest.id)}`} className="mt-4 inline-block text-sm font-medium text-volt-700">Open history & charts →</Link>
            </div>
          )}
        </Card>

        <Card title="Send a test reading" subtitle="POST /api/telemetry/ingest">
          <form onSubmit={send} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Pack ID *"><Input {...f.bind('pack_id')} required className="font-mono" /></Field>
              <Field label="Voltage (V) *"><Input type="number" step="any" {...f.bind('voltage')} required /></Field>
              <Field label="Temperature (°C) *"><Input type="number" step="any" {...f.bind('temperature_c')} required /></Field>
              <Field label="Current (A)"><Input type="number" step="any" {...f.bind('current_a')} /></Field>
              <Field label="Station ID"><Input {...f.bind('station_id')} /></Field>
              <Field label="Slot ID"><Input {...f.bind('slot_id')} /></Field>
              {FIELDS.map(([k, l]) => <Field key={k} label={l}><Input type="number" step="any" {...f.bind(k as string)} /></Field>)}
              <Field label="Timestamp"><Input type="datetime-local" {...f.bind('ts')} /></Field>
              <Field label="X-Device-Key" className="sm:col-span-2" hint="Optional; device auth instead of your admin token"><Input value={deviceKey} onChange={(e) => setDeviceKey(e.target.value)} /></Field>
            </div>
            <Button type="submit" loading={act.busy}>Send reading</Button>
          </form>
          {ingested && <div className="mt-5 border-t border-ink-100 pt-4"><AutoView data={ingested} /><RawJson data={ingested} /></div>}
        </Card>
      </div>
    </>
  );
}
