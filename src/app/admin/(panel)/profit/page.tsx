'use client';
import { useEffect, useState } from 'react';
import { Admin } from '@/lib/endpoints';
import { useAction, useApi } from '@/lib/hooks';
import { dt, pkr } from '@/lib/format';
import { isSuperAdmin, useAuth } from '@/components/AuthProvider';
import { Badge, Button, Card, DataTable, ErrorBox, Field, Input, Loading, Mono, PageHeader, Skeleton, Stat } from '@/components/ui';

type Settings = { bootstrap_share_pct: number; soc_cost_pkr_per_unit: number; soh_cost_pct: number; station_registration_fee_pkr: number };

const FIELDS: { key: keyof Settings; label: string; unit: string; hint: string; step: number }[] = [
  { key: 'bootstrap_share_pct', label: 'Bootstrap share', unit: '% of the profit', hint: 'Taken from the profit on SoC and SoH, never from the income.', step: 1 },
  { key: 'soc_cost_pkr_per_unit', label: 'Cost of one unit', unit: 'PKR per unit (kWh)', hint: 'The SoC price minus this is the profit. Rs 10 price and Rs 7 cost leaves Rs 3.', step: 0.5 },
  { key: 'soh_cost_pct', label: 'SoH cost share', unit: '% of the SoH charge', hint: 'The rest of every SoH penalty counts as profit.', step: 5 },
  { key: 'station_registration_fee_pkr', label: 'Station admin registration fee', unit: 'PKR, one time', hint: 'Due when a user is registered as a station admin.', step: 500 },
];

/** Profit on SoC and SoH only. The bootstrap admin gets a share of the profit; the station keeps the rest. */
export default function ProfitLog() {
  const { user } = useAuth();
  const superAdmin = isSuperAdmin(user);
  const act = useAction();
  const log = useApi(() => Admin.profitLog({}), []);
  const fees = useApi(() => Admin.fees(), []);
  const pricing = useApi(() => Admin.pricing(), []);
  const settings = useApi(() => (superAdmin ? Admin.platformSettings() : Promise.resolve(null)), [superAdmin]);
  const [form, setForm] = useState<Settings | null>(null);
  useEffect(() => { if (settings.data) setForm({ ...(settings.data as Settings) }); }, [settings.data]);

  const rows: any[] = log.data?.rows || [];
  const t = log.data?.totals;
  const dirty = !!form && !!settings.data && JSON.stringify(form) !== JSON.stringify({ ...(settings.data as any) });
  const rate = pricing.data?.soc_rate_pkr_per_unit ?? 0;
  const perUnit = form ? rate - form.soc_cost_pkr_per_unit : 0;
  const perUnitShare = form ? Math.max(0, perUnit) * form.bootstrap_share_pct / 100 : 0;

  const save = async () => {
    if (!form) return;
    const r = await act.run(() => Admin.putPlatformSettings(form), 'Settings saved. They apply to every new swap.');
    if (r) settings.reload();
  };
  const received = async (id: number) => {
    if (await act.run(() => Admin.markFeeReceived(id), 'Fee marked as received.')) fees.reload();
  };

  const stat = (v: unknown) => (log.data ? pkr(v as number) : <Skeleton className="h-8 w-28" />);

  return (
    <>
      <PageHeader title="Profit log" desc={superAdmin ? 'Profit on SoC and SoH for every swap, and the share that goes to you.' : 'Profit on SoC and SoH at your station, and the share that goes to the bootstrap admin.'} />
      <ErrorBox error={log.error} onRetry={log.reload} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Profit" value={stat(t?.profit_pkr)} tone="good" />
        <Stat label={superAdmin ? 'Bootstrap share' : 'Paid to bootstrap'} value={stat(t?.bootstrap_share_pkr)} />
        <Stat label={superAdmin ? 'Stations keep' : 'You keep'} value={stat(t?.station_share_pkr)} />
        <Stat label="Swaps" value={log.data ? t?.swaps : <Skeleton className="h-8 w-16" />} />
      </div>

      {superAdmin && (
        <Card className="mb-6" title="Platform settings">
          <p className="mb-5 text-body text-ink-600">Only the bootstrap admin can change these. Station admins can't, and they don't need approval.</p>
          {!form ? <Loading /> : (
            <>
              <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                {FIELDS.map((f) => (
                  <Field key={f.key} label={f.label} hint={<><span className="font-medium text-ink-800">{f.unit}</span><br />{f.hint}</>}>
                    <Input type="number" min={0} step={f.step} value={form[f.key] as any} onChange={(e) => setForm({ ...form, [f.key]: e.target.value === '' ? ('' as any) : Number(e.target.value) })} />
                  </Field>
                ))}
              </div>
              <div className="mt-6 rounded-xl border border-volt-200 bg-volt-50 px-5 py-4 text-body text-ink-800">
                <b className="font-semibold text-ink-900">Example:</b> SoC price is Rs {rate} per unit and a unit costs Rs {form.soc_cost_pkr_per_unit}, so the profit is <b className="font-semibold">Rs {perUnit.toFixed(2)}</b> per unit.
                The bootstrap admin gets {form.bootstrap_share_pct}% of that, <b className="font-semibold">Rs {perUnitShare.toFixed(2)}</b>, and the station keeps <b className="font-semibold">Rs {(Math.max(0, perUnit) - perUnitShare).toFixed(2)}</b>.
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="secondary" disabled={!dirty} onClick={() => settings.data && setForm({ ...(settings.data as Settings) })}>Discard</Button>
                <Button loading={act.busy} disabled={!dirty} onClick={save}>Save settings</Button>
              </div>
            </>
          )}
        </Card>
      )}

      <Card className="mb-6" title={superAdmin ? 'Station admin registration fees' : 'Your registration fee'}>
        {fees.loading && !fees.data ? <Loading /> : (
          <>
            <div className="mb-5 flex flex-wrap gap-8 text-body">
              <span>Due <b className="num font-semibold text-amber-800">{pkr(fees.data?.totals?.due_pkr ?? 0)}</b></span>
              <span>Received <b className="num font-semibold text-volt-800">{pkr(fees.data?.totals?.received_pkr ?? 0)}</b></span>
            </div>
            <DataTable
              rows={fees.data?.fees || []}
              rowKey={(f: any) => f.id}
              empty="No registration fees yet. A fee is logged when a user is registered as a station admin."
              cols={[
                { key: 'created_at', header: 'Registered', render: (f: any) => dt(f.created_at) },
                { key: 'user_name', header: 'Station admin' },
                { key: 'station_id', header: 'Station', render: (f: any) => (f.station_id ? <Mono>{f.station_id}</Mono> : '—') },
                { key: 'amount_pkr', header: 'Fee', align: 'right', render: (f: any) => pkr(f.amount_pkr) },
                { key: 'status', header: 'Status', render: (f: any) => <Badge value={f.status} /> },
                { key: 'received', header: 'Received', render: (f: any) => (f.received_at ? <span>{dt(f.received_at)}<span className="block text-sm text-ink-600">{f.received_by_name}</span></span> : '—') },
                ...(superAdmin ? [{ key: 'act', header: '', render: (f: any) => (f.status === 'DUE' ? <Button size="sm" disabled={act.busy} onClick={() => received(f.id)}>Mark received</Button> : null) }] : []),
              ]}
            />
          </>
        )}
      </Card>

      <Card title="Profit per swap" actions={<Button variant="secondary" size="sm" onClick={log.reload}>↻ Refresh</Button>}>
        {log.loading && !log.data ? <Loading /> : (
          <DataTable
            rows={rows}
            rowKey={(r: any) => r.id}
            empty="Profit is logged when a swap is completed. Nothing has been logged yet."
            cols={[
              { key: 'date', header: 'Date', render: (r: any) => dt(r.date) },
              { key: 'reference', header: 'Swap', render: (r: any) => <Mono>{r.reference}</Mono> },
              { key: 'station_id', header: 'Station', render: (r: any) => r.station_id || '—' },
              { key: 'units', header: 'Units (kWh)', align: 'right', render: (r: any) => r.units_kwh },
              { key: 'soc_revenue_pkr', header: 'SoC price', align: 'right', render: (r: any) => pkr(r.soc_revenue_pkr) },
              { key: 'soc_cost_pkr', header: 'SoC cost', align: 'right', render: (r: any) => pkr(r.soc_cost_pkr) },
              { key: 'soc_profit_pkr', header: 'SoC profit', align: 'right', render: (r: any) => pkr(r.soc_profit_pkr) },
              { key: 'soh_profit_pkr', header: 'SoH profit', align: 'right', render: (r: any) => pkr(r.soh_profit_pkr) },
              { key: 'profit_pkr', header: 'Profit', align: 'right', render: (r: any) => pkr(r.profit_pkr) },
              { key: 'bootstrap_share_pkr', header: 'Bootstrap', align: 'right', render: (r: any) => <span>{pkr(r.bootstrap_share_pkr)}<span className="block text-sm text-ink-600">{r.bootstrap_pct}%</span></span> },
              { key: 'station_share_pkr', header: 'Station', align: 'right', render: (r: any) => <span className="font-semibold text-volt-800">{pkr(r.station_share_pkr)}</span> },
            ]}
          />
        )}
      </Card>
    </>
  );
}
