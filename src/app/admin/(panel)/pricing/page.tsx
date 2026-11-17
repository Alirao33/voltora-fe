'use client';
import { useEffect, useState } from 'react';
import { Admin, Guest } from '@/lib/endpoints';
import { useAction, useApi } from '@/lib/hooks';
import type { PricingConfig } from '@/lib/types';
import { pkr } from '@/lib/format';
import { AutoView } from '@/components/AutoView';
import { Badge, Button, Card, Checkbox, DataTable, ErrorBox, Field, Input, Loading, PageHeader, Tabs } from '@/components/ui';

type NumKey = Exclude<keyof PricingConfig, 'peak_hours_pkt' | 'thermal_adjustment_enabled'>;
const GROUPS: { title: string; desc: string; fields: [NumKey, string, string?][] }[] = [
  { title: 'Base costs', desc: 'What one swap costs us before margin.', fields: [
    ['tariff_grid_pkr_per_kwh', 'Grid tariff (PKR/kWh)'], ['wear_pkr_per_kwh_lfp', 'Wear — LFP (PKR/kWh)'], ['wear_pkr_per_kwh_nmc', 'Wear — NMC (PKR/kWh)'],
    ['operating_cost_pkr', 'Operating cost per swap (PKR)'], ['delivery_cost_pkr', 'Home delivery cost (PKR)'], ['margin', 'Margin', '0.2 = 20%'],
  ] },
  { title: 'Demand', desc: 'Surge during peak hours and when stock runs low.', fields: [
    ['peak_demand_factor', 'Peak demand factor', '1.0–3.0'], ['scarcity_threshold', 'Scarcity threshold', 'Share of stock left (0–1)'],
    ['scarcity_uplift', 'Scarcity uplift', '0.1 = +10%'], ['max_demand_factor', 'Max combined demand factor', 'Cap on surge'],
  ] },
  { title: 'Thermal adjustment', desc: 'Reward cool returns, penalise hot ones.', fields: [
    ['green_rebate_max_c', 'Green rebate below (°C)'], ['green_rebate_pct', 'Green rebate', '0.15 = 15% off'],
    ['standard_max_c', 'Penalty above (°C)'], ['thermal_penalty_pct', 'Thermal penalty', '0.1 = +10%'],
  ] },
];

const RATES: { key: 'delivery_rate_pkr_per_km' | 'same_soh_discount_pct' | 'soc_rate_pkr_per_pct' | 'penalty_temp_pkr_per_pt' | 'penalty_cycle_pkr_per_pt' | 'penalty_fault_pkr_per_pt'; label: string; unit: string; hint: string; step: number }[] = [
  { key: 'delivery_rate_pkr_per_km', label: 'Delivery rate', unit: 'PKR per km', hint: 'Extra charge from the station to the customer', step: 5 },
  { key: 'same_soh_discount_pct', label: 'Same-SoH discount', unit: 'Share of the whole bill (0.10 = 10%)', hint: 'Given when the pack is returned in the same SoH', step: 0.01 },
  { key: 'soc_rate_pkr_per_pct', label: 'SoC rate', unit: 'PKR per 1% charge used', hint: 'Fixed rate × SoC used in the swap', step: 0.05 },
  { key: 'penalty_temp_pkr_per_pt', label: 'SoH · temperature penalty', unit: 'PKR per penalty point', hint: '2.5 × (T − 35) above 35 °C', step: 0.25 },
  { key: 'penalty_cycle_pkr_per_pt', label: 'SoH · cycle penalty', unit: 'PKR per penalty point', hint: 'Cycles used ÷ rated life × 100', step: 0.25 },
  { key: 'penalty_fault_pkr_per_pt', label: 'SoH · fault penalty', unit: 'PKR per penalty point', hint: 'Faults ÷ operating hours × 100', step: 0.25 },
];

type Calc = { v: string; ah: string; soc: string; soh: string; temp: string; cycles: string; faults: string; hours: string; chem: 'LFP' | 'NMC'; delivery: boolean; peak: boolean; same: boolean; km: string };

/** Live preview of the backend formulas (Engine B6/B7) using the rates currently on screen, saved or not. */
function calcPrice(c: PricingConfig, i: Calc) {
  const n = (x: string) => Number(x) || 0;
  const kwh = (n(i.v) * n(i.ah) * (n(i.soc) / 100)) / 1000;
  const pTemp = n(i.temp) <= 35 ? 0 : n(i.temp) <= 55 ? 2.5 * (n(i.temp) - 35) : 100;
  const pCycle = Math.min(100, (n(i.cycles) / (i.chem === 'LFP' ? 1500 : 700)) * 100);
  const pFault = n(i.faults) <= 0 ? 0 : n(i.hours) <= 0 ? 100 : Math.min(100, (n(i.faults) / n(i.hours)) * 100);
  const health = 0.5 * n(i.soh) + 0.2 * (100 - pTemp) + 0.2 * (100 - pCycle) + 0.1 * (100 - pFault);
  const grid = kwh * c.tariff_grid_pkr_per_kwh;
  const wear = kwh * (i.chem === 'LFP' ? c.wear_pkr_per_kwh_lfp : c.wear_pkr_per_kwh_nmc) + (n(i.temp) > c.standard_max_c ? 100 : 0);
  const delivery = i.delivery ? c.delivery_cost_pkr : 0;
  const socCharge = n(i.soc) * c.soc_rate_pkr_per_pct;
  const sohCharge = pTemp * c.penalty_temp_pkr_per_pt + pCycle * c.penalty_cycle_pkr_per_pt + pFault * c.penalty_fault_pkr_per_pt;
  const base = grid + wear + c.operating_cost_pkr + delivery + socCharge + sohCharge;
  const demand = i.peak ? Math.min(c.peak_demand_factor, c.max_demand_factor) : 1;
  const kmCharge = i.delivery ? n(i.km) * c.delivery_rate_pkr_per_km : 0;
  const gross = base * (1 + c.margin) * demand + kmCharge;
  const discount = i.same ? gross * c.same_soh_discount_pct : 0;
  return { kwh, pTemp, pCycle, pFault, health, grid, wear, delivery, socCharge, sohCharge, base, demand, kmCharge, discount, total: gross - discount };
}

function quoteTotal(q: any): number | null {
  if (!q || typeof q !== 'object') return null;
  for (const k of ['total_pkr', 'total', 'price_pkr', 'amount_pkr']) if (typeof q[k] === 'number') return q[k];
  return q.price ? quoteTotal(q.price) : null;
}

export default function PricingPage() {
  const { data, loading, error, reload } = useApi(() => Admin.pricing(), []);
  const [cfg, setCfg] = useState<PricingConfig | null>(null);
  const [sim, setSim] = useState({ capacity_used_ah: '16', temperature_c: '30', chemistry: 'LFP', delivery: false, soc_used_pct: '60', pack_id: '' });
  const [quote, setQuote] = useState<any>(null);
  const act = useAction();
  const log = useApi(() => Admin.reportLog({ start: new Date(Date.now() - 30 * 86400000).toISOString() }), []);
  const simAct = useAction();
  const [tab, setTab] = useState<'rates' | 'log' | 'advanced'>('rates');
  const [calc, setCalc] = useState<Calc>({ v: '48', ah: '20', soc: '60', soh: '95', temp: '30', cycles: '300', faults: '0', hours: '500', chem: 'LFP', delivery: false, peak: false, same: true, km: '5' });

  useEffect(() => { if (data) setCfg({ ...data, peak_hours_pkt: (data.peak_hours_pkt || []).map((r) => [...r] as [number, number]) }); }, [data]);
  if (loading || !cfg) return error ? <ErrorBox error={error} onRetry={reload} /> : <Loading />;

  const setN = (k: NumKey, v: string) => setCfg({ ...cfg, [k]: v === '' ? ('' as any) : Number(v) });
  const dirty = JSON.stringify(cfg) !== JSON.stringify(data);

  const save = async () => {
    const r = await act.run(() => Admin.putPricing(cfg), 'Pricing saved — applies to new quotes immediately');
    if (r !== undefined) reload();
  };

  return (
    <>
      <PageHeader title="Pricing engine" desc="Set the SoC and SoH pricing for your station batteries. Saved rates apply to every customer on their next swap." actions={
        <>
          <Button variant="ghost" disabled={!dirty} onClick={() => data && setCfg({ ...data })}>Discard</Button>
          <Button onClick={save} loading={act.busy} disabled={!dirty}>Save changes</Button>
        </>
      } />
      <div className="mb-6"><Tabs value={tab} onChange={setTab} tabs={[{ value: 'rates', label: 'Rates & calculator' }, { value: 'log', label: 'Pricing log' }, { value: 'advanced', label: 'Advanced settings' }]} /></div>
      {tab === 'rates' && <>
      <Card className="mb-6" title="SoC & SoH rate control" subtitle="Change a rate when the market moves. Saved rates apply to every new swap straight away.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {RATES.map((r) => (
            <div key={r.key} className="rounded-xl border border-ink-200 bg-white p-4">
              <div className="text-sm font-medium text-ink-900">{r.label}</div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => setN(r.key, String(Math.max(0, Math.round(((cfg[r.key] as number) - r.step) * 100) / 100)))}>−</Button>
                <Input type="number" step="any" min={0} value={cfg[r.key] as any} onChange={(e) => setN(r.key, e.target.value)} />
                <Button size="sm" variant="secondary" onClick={() => setN(r.key, String(Math.round(((cfg[r.key] as number) + r.step) * 100) / 100))}>+</Button>
              </div>
              <div className="mt-2 text-xs text-ink-600">{r.unit}</div>
              <div className="text-xs text-ink-600">{r.hint}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" disabled={!dirty} onClick={() => data && setCfg({ ...data })}>Discard</Button>
          <Button onClick={save} loading={act.busy} disabled={!dirty}>Update rates</Button>
        </div>
      </Card>
      <Card className="mb-6" title="Price calculator" subtitle="Try a swap with the rates above, even before saving them.">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {([['v', 'Voltage (V)'], ['ah', 'Full capacity (Ah)'], ['soc', 'SoC used (%)'], ['soh', 'SoH (%)'], ['temp', 'Return temp (°C)'], ['cycles', 'Cycles used'], ['faults', 'Fault count'], ['hours', 'Operating hours'], ['km', 'Delivery distance (km)']] as [keyof Calc, string][]).map(([k, label]) => (
            <Field key={k} label={label}><Input type="number" value={calc[k] as string} onChange={(e) => setCalc({ ...calc, [k]: e.target.value })} /></Field>
          ))}
          <Field label="Chemistry"><select className="h-10 w-full rounded-lg border border-ink-200 px-2 text-sm" value={calc.chem} onChange={(e) => setCalc({ ...calc, chem: e.target.value as 'LFP' | 'NMC' })}><option>LFP</option><option>NMC</option></select></Field>
          <div className="flex items-end pb-2"><Checkbox label="Home delivery" checked={calc.delivery} onChange={(e) => setCalc({ ...calc, delivery: e.target.checked })} /></div>
          <div className="flex items-end pb-2"><Checkbox label="Returned in same SoH" checked={calc.same} onChange={(e) => setCalc({ ...calc, same: e.target.checked })} /></div>
          <div className="flex items-end pb-2"><Checkbox label="Peak hour" checked={calc.peak} onChange={(e) => setCalc({ ...calc, peak: e.target.checked })} /></div>
        </div>
        {(() => {
          const x = calcPrice(cfg, calc);
          const rows: [string, string][] = [
            ['Energy used', `${x.kwh.toFixed(3)} kWh`], ['Grid + wear', pkr(x.grid + x.wear)], ['Operating + delivery', pkr(cfg.operating_cost_pkr + x.delivery)],
            ['SoC charge', pkr(x.socCharge)], ['Temp penalty', `${x.pTemp.toFixed(1)} pts`], ['Cycle penalty', `${x.pCycle.toFixed(1)} pts`], ['Fault penalty', `${x.pFault.toFixed(1)} pts`],
            ['SoH penalty charge', pkr(x.sohCharge)], ['Delivery distance', pkr(x.kmCharge)], ['Same-SoH discount', `− ${pkr(x.discount)}`], ['Health score', `${x.health.toFixed(1)}%${x.health < 70 ? ' · retire' : x.health < 80 ? ' · maintenance' : ''}`],
          ];
          return (
            <div className="mt-5 grid gap-6 border-t border-ink-100 pt-4 md:grid-cols-[1fr_auto]">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm lg:grid-cols-3">
                {rows.map(([k, v]) => (<div key={k}><dt className="text-xs text-ink-600">{k}</dt><dd className="num font-medium text-ink-900">{v}</dd></div>))}
              </dl>
              <div className="text-right"><div className="text-xs text-ink-600">Swap price (incl. {Math.round(cfg.margin * 100)}% margin × demand {x.demand})</div><div className="font-mono text-3xl font-bold">{pkr(x.total)}</div></div>
            </div>
          );
        })()}
      </Card>
      </>}
      {tab === 'advanced' && <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {GROUPS.map((g) => (
            <Card key={g.title} title={g.title} subtitle={g.desc} actions={g.title === 'Thermal adjustment' ? (
              <Checkbox label="Enabled" checked={cfg.thermal_adjustment_enabled} onChange={(e) => setCfg({ ...cfg, thermal_adjustment_enabled: e.target.checked })} />
            ) : undefined}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {g.fields.map(([k, label, hint]) => (
                  <Field key={k} label={label} hint={hint}>
                    <Input type="number" step="any" value={cfg[k] as any} onChange={(e) => setN(k, e.target.value)} disabled={g.title === 'Thermal adjustment' && !cfg.thermal_adjustment_enabled} />
                  </Field>
                ))}
              </div>
            </Card>
          ))}
          <Card title="Peak hours (PKT)" subtitle="Each window is [start hour, end hour) in Pakistan time." actions={
            <Button size="sm" variant="secondary" onClick={() => setCfg({ ...cfg, peak_hours_pkt: [...cfg.peak_hours_pkt, [12, 14]] })}>Add window</Button>
          }>
            <div className="space-y-2">
              {cfg.peak_hours_pkt.map(([a, b], i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input type="number" min={0} max={24} value={a} className="w-24" onChange={(e) => { const p = [...cfg.peak_hours_pkt]; p[i] = [Number(e.target.value), b]; setCfg({ ...cfg, peak_hours_pkt: p }); }} />
                  <span className="text-ink-600">→</span>
                  <Input type="number" min={0} max={24} value={b} className="w-24" onChange={(e) => { const p = [...cfg.peak_hours_pkt]; p[i] = [a, Number(e.target.value)]; setCfg({ ...cfg, peak_hours_pkt: p }); }} />
                  <span className="text-sm text-ink-600">{String(a).padStart(2, '0')}:00 – {String(b).padStart(2, '0')}:00</span>
                  <Button size="sm" variant="ghost" onClick={() => setCfg({ ...cfg, peak_hours_pkt: cfg.peak_hours_pkt.filter((_, j) => j !== i) })}>Remove</Button>
                </div>
              ))}
              <div className="mt-3 flex h-6 overflow-hidden rounded-md border border-ink-200">
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} title={`${h}:00`} className={`flex-1 border-r border-white ${cfg.peak_hours_pkt.some(([a, b]) => h >= a && h < b) ? 'bg-amber-400' : 'bg-ink-100'}`} />
                ))}
              </div>
              <div className="flex justify-between text-xs text-ink-600"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
            </div>
          </Card>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <Card title="Try a quote" subtitle="Uses the saved config (save first to test edits).">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Capacity used (Ah)"><Input type="number" value={sim.capacity_used_ah} onChange={(e) => setSim({ ...sim, capacity_used_ah: e.target.value })} /></Field>
              <Field label="Return temp (°C)"><Input type="number" value={sim.temperature_c} onChange={(e) => setSim({ ...sim, temperature_c: e.target.value })} /></Field>
              <Field label="SoC used (%)"><Input type="number" value={sim.soc_used_pct} onChange={(e) => setSim({ ...sim, soc_used_pct: e.target.value })} /></Field>
              <Field label="Pack ID (for SoH)"><Input value={sim.pack_id} placeholder="VOLT-0001" onChange={(e) => setSim({ ...sim, pack_id: e.target.value })} /></Field>
              <Field label="Chemistry"><select className="h-10 w-full rounded-lg border border-ink-200 px-2 text-sm" value={sim.chemistry} onChange={(e) => setSim({ ...sim, chemistry: e.target.value })}><option>LFP</option><option>NMC</option></select></Field>
              <div className="flex items-end pb-2"><Checkbox label="Delivery" checked={sim.delivery} onChange={(e) => setSim({ ...sim, delivery: e.target.checked })} /></div>
            </div>
            <Button className="mt-4 w-full" variant="dark" loading={simAct.busy} onClick={async () => {
              const r = await simAct.run(() => Guest.quote({ capacity_used_ah: Number(sim.capacity_used_ah), temperature_c: Number(sim.temperature_c), chemistry: sim.chemistry as any, delivery: sim.delivery, soc_used_pct: Number(sim.soc_used_pct), pack_id: sim.pack_id || null }));
              if (r) setQuote(r);
            }}>Quote</Button>
            {quote && (
              <div className="mt-5 border-t border-ink-100 pt-4">
                <div className="mb-3 num text-stat">{pkr(quoteTotal(quote))}</div>
                <AutoView data={quote} />
              </div>
            )}
          </Card>
        </div>
      </div>}
      {tab === 'log' && <Card title="SoC, SoH & discount log" subtitle={`Last 30 days: SoC and SoH charges and same-SoH discounts per payment. Discounts given: ${pkr(log.data?.totals?.discount_pkr ?? 0)}. Updates as swaps are paid.`}>
        <DataTable rows={log.data?.rows || []} rowKey={(r: any) => r.payment_id} empty="No priced swaps yet." cols={[
          { key: 'date', header: 'Date', render: (r: any) => new Date(r.date).toLocaleString('en-PK') },
          { key: 'kind', header: 'Type', render: (r: any) => <Badge value={r.kind} /> },
          { key: 'reference', header: 'Reference', render: (r: any) => <span className="font-mono">{r.reference}</span> },
          { key: 'soc', header: 'SoC used', align: 'right', render: (r: any) => (r.soc_used_pct == null ? '—' : `${r.soc_used_pct}%`) },
          { key: 'socc', header: 'SoC charge', align: 'right', render: (r: any) => pkr(r.soc_charge_pkr) },
          { key: 'soh', header: 'SoH', align: 'right', render: (r: any) => (r.soh_pct == null ? '—' : `${r.soh_pct}%`) },
          { key: 'hs', header: 'Health score', align: 'right', render: (r: any) => (r.health_score == null ? '—' : r.health_score) },
          { key: 'sohc', header: 'SoH penalty', align: 'right', render: (r: any) => pkr(r.soh_charge_pkr) },
          { key: 'disc', header: 'Same-SoH discount', align: 'right', render: (r: any) => (r.same_soh_discount_pkr ? <span className="text-volt-700">− {pkr(r.same_soh_discount_pkr)}</span> : '—') },
          { key: 'paid', header: 'Paid', align: 'right', render: (r: any) => <b>{pkr(r.paid_pkr)}</b> },
        ]} />
      </Card>}
    </>
  );
}
