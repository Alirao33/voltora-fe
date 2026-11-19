
'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Admin } from '@/lib/endpoints';
import { useAction, useApi } from '@/lib/hooks';
import { ENUMS, type BatteryOut, type BatteryState, type Chemistry } from '@/lib/types';
import { num } from '@/lib/format';
import { AutoView, RawJson } from '@/components/AutoView';
import { BatteryTable } from '@/components/BatteryTable';
import { BatteryStateModal } from '@/components/BatteryStateModal';
import { Button, Card, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, Stat, Tabs, Toolbar } from '@/components/ui';

function BatteriesInner() {
  const router = useRouter(), sp = useSearchParams();
  const [tab, setTab] = useState<'all' | 'second' | 'plan'>('all');
  const [state, setState] = useState(''), [station, setStation] = useState('');
  const [maxHealth, setMaxHealth] = useState(sp.get('max_health') || '');
  const [limit, setLimit] = useState(200);
  const list = useApi(() => Admin.batteries({ state, station_id: station, max_health: maxHealth, limit }), [state, station, maxHealth, limit]);
  const second = useApi(() => Admin.secondLife(), [], { skip: tab !== 'second' });
  const plan = useApi(() => Admin.chargingPlan(), [], { skip: tab !== 'plan' });

  const [editing, setEditing] = useState<BatteryOut | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [nb, setNb] = useState({ id: '', chemistry: 'LFP' as Chemistry, rated_capacity_ah: '20', nominal_voltage: '48', station_id: '', locker_id: '', state: 'CHARGED' as BatteryState });
  const act = useAction(), rows = list.data || [];

  const byState = (s: BatteryState) => rows.filter(b => b.state === s).length;
  const avgHealth = rows.length ? rows.reduce((a, b) => a + b.health_score, 0) / rows.length : 0;
  const open = (b: BatteryOut) => router.push(`/admin/batteries/${encodeURIComponent(b.id)}`);
  const edit = (b: BatteryOut) => <Button size="sm" variant="secondary" onClick={() => setEditing(b)}>State</Button>;

  const updateNB = (key: string, value: string) => setNb(prev => ({ ...prev, [key]: value }));

  const register = async () => {
    const r = await act.run(() => Admin.createBattery({
      id: nb.id, chemistry: nb.chemistry, rated_capacity_ah: Number(nb.rated_capacity_ah),
      nominal_voltage: Number(nb.nominal_voltage), station_id: nb.station_id || null,
      locker_id: nb.locker_id || null, state: nb.state
    }), b => `Pack ${b.id} registered`);
    if (r) { setCreateOpen(false); list.reload(); }
  };

  return (
    <>
      <PageHeader title="Batteries" desc="Every pack in the fleet, with live health from telemetry." actions={<Button onClick={() => setCreateOpen(true)}>Register pack</Button>} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Packs shown" value={rows.length} />
        <Stat label="Charged" value={byState('CHARGED')} tone="good" />
        <Stat label="Charging" value={byState('CHARGING')} />
        <Stat label="In use" value={byState('IN_USE') + byState('RESERVED')} />
        <Stat label="Avg health" value={num(avgHealth)} tone={avgHealth >= 70 ? 'good' : avgHealth >= 50 ? 'warn' : 'bad'} />
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'all', label: 'Fleet' },
        { value: 'second', label: 'Second-life candidates' },
        { value: 'plan', label: 'Charging plan' }
      ]} />

      {tab === 'all' && (
        <Card>
          <Toolbar>
            <Field label="State"><Select value={state} onChange={e => setState(e.target.value)} placeholder="All" options={ENUMS.BatteryState} /></Field>
            <Field label="Station"><Input value={station} onChange={e => setStation(e.target.value)} placeholder="Station ID" className="w-36" /></Field>
            <Field label="Max health"><Input type="number" value={maxHealth} onChange={e => setMaxHealth(e.target.value)} placeholder="e.g. 60" className="w-28" /></Field>
            <Field label="Limit"><Select value={String(limit)} onChange={e => setLimit(+e.target.value)} options={['50', '200', '500', '1000'].map(x => ({ value: x, label: x }))} /></Field>
            <Button variant="ghost" onClick={list.reload}>Refresh</Button>
          </Toolbar>
          <ErrorBox error={list.error} onRetry={list.reload} />
          {list.loading ? <Loading /> : <BatteryTable rows={rows} onOpen={open} actions={edit} />}
        </Card>
      )}

      {tab === 'second' && (
        <Card title="Packs suited for second-life use" subtitle="Too worn for riders, still useful for stationary storage.">
          <ErrorBox error={second.error} onRetry={second.reload} />
          {second.loading ? <Loading /> : <BatteryTable rows={second.data || []} onOpen={open} actions={edit} />}
        </Card>
      )}

      {tab === 'plan' && (
        <Card title="Charging plan" subtitle="Charging windows for depleted and charging packs. Times are estimates from the missing energy and an assumed 3 kW charger." actions={<Button size="sm" variant="ghost" loading={act.busy} onClick={async () => { const r = await act.run(() => Admin.recomputeChargingPlan(), 'Charging windows recomputed'); if (r) plan.setData(r); }}>Recompute</Button>}>
          <ErrorBox error={plan.error} onRetry={plan.reload} />
          {plan.loading ? <Loading /> : <><AutoView data={plan.data} /><RawJson data={plan.data} /></>}
        </Card>
      )}

      <BatteryStateModal pack={editing} onClose={() => setEditing(null)} onSaved={() => {
        setEditing(null); list.reload();
        if (tab === 'second') second.reload();
      }} />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Register a new pack" wide footer={
        <>
          <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button loading={act.busy} onClick={register}>Register</Button>
        </>
      }>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Pack ID"><Input value={nb.id} onChange={e => updateNB('id', e.target.value)} placeholder="VOLT-0199" maxLength={40} /></Field>
          <Field label="Chemistry"><Select value={nb.chemistry} onChange={e => updateNB('chemistry', e.target.value)} options={ENUMS.Chemistry} /></Field>
          <Field label="Initial state"><Select value={nb.state} onChange={e => updateNB('state', e.target.value)} options={ENUMS.BatteryState} /></Field>
          <Field label="Rated capacity (Ah)"><Input type="number" value={nb.rated_capacity_ah} onChange={e => updateNB('rated_capacity_ah', e.target.value)} /></Field>
          <Field label="Nominal voltage (V)"><Input type="number" value={nb.nominal_voltage} onChange={e => updateNB('nominal_voltage', e.target.value)} /></Field>
          <div />
          <Field label="Station ID"><Input value={nb.station_id} onChange={e => updateNB('station_id', e.target.value)} /></Field>
          <Field label="Locker ID"><Input value={nb.locker_id} onChange={e => updateNB('locker_id', e.target.value)} /></Field>
        </div>
      </Modal>
    </>
  );
}

export default function BatteriesPage() {
  return <Suspense><BatteriesInner /></Suspense>;
}
