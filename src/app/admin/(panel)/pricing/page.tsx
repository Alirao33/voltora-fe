'use client';
import { useEffect, useState } from 'react';
import { Admin, Guest } from '@/lib/endpoints';
import { useAction, useApi } from '@/lib/hooks';
import type { PricingConfig } from '@/lib/types';
import { pkr } from '@/lib/format';
import { AutoView } from '@/components/AutoView';
import { isSuperAdmin, useAuth } from '@/components/AuthProvider';
import { dt } from '@/lib/format';
import Link from 'next/link';
import { DiffList } from '@/components/PricingDiff';
import { Badge, Button, Card, Checkbox, DataTable, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, Tabs, Textarea } from '@/components/ui';

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

type RateKey = 'delivery_rate_pkr_per_km' | 'same_soh_discount_pct' | 'soc_rate_pkr_per_unit' | 'penalty_temp_pkr_per_pt' | 'penalty_cycle_pkr_per_pt' | 'penalty_fault_pkr_per_pt';
type Rate = { key: RateKey; label: string; unit: string; hint: string; formula?: string; step: number };
type RateGroup = { id: 'charge' | 'health' | 'discount'; title: string; desc: string; tone: string; chip: string; icon: string; rates: Rate[] };

const RATE_GROUPS: RateGroup[] = [
  {
    id: 'charge', title: 'Charges', desc: 'What every swap costs on top of the base price.',
    tone: 'border-volt-200 bg-volt-50', chip: 'bg-volt-100 text-volt-800', icon: 'M13 2 4 14h7l-1 8 9-12h-7l1-8z',
    rates: [
      { key: 'soc_rate_pkr_per_unit', label: 'SoC rate', unit: 'PKR per unit (kWh)', hint: 'A fixed rate for each unit of energy the rider uses in the swap.', formula: 'rate × units used (kWh)', step: 0.5 },
      { key: 'delivery_rate_pkr_per_km', label: 'Delivery rate', unit: 'PKR per km', hint: 'Extra charge from the station to the customer for home delivery.', formula: 'rate × distance (km)', step: 5 },
    ],
  },
  {
    id: 'health', title: 'SoH penalties', desc: 'Set what each penalty point costs. Points come from the pack health formulas.',
    tone: 'border-amber-200 bg-amber-50', chip: 'bg-amber-100 text-amber-900', icon: 'M22 12h-4l-3 9L9 3l-3 9H2',
    rates: [
      { key: 'penalty_temp_pkr_per_pt', label: 'Temperature penalty', unit: 'PKR per penalty point', hint: 'Charged when the pack comes back hot.', formula: '2.5 × (T − 35) above 35 °C', step: 0.25 },
      { key: 'penalty_cycle_pkr_per_pt', label: 'Cycle penalty', unit: 'PKR per penalty point', hint: 'Charged as the pack uses up its rated life.', formula: 'cycles ÷ rated life × 100', step: 0.25 },
      { key: 'penalty_fault_pkr_per_pt', label: 'Fault penalty', unit: 'PKR per penalty point', hint: 'Charged when the pack has recorded faults.', formula: 'faults ÷ operating hours × 100', step: 0.25 },
    ],
  },
  {
    id: 'discount', title: 'Discount', desc: 'A reward on the whole bill of that swap.',
    tone: 'border-blue-200 bg-blue-50', chip: 'bg-blue-100 text-blue-900', icon: 'M20 12l-8 8-9-9V3h8zM7.5 7.5h.01',
    rates: [
      { key: 'same_soh_discount_pct', label: 'Same-SoH discount', unit: 'share of the bill, 0.10 = 10%', hint: 'Given when the rider returns the pack in the same SoH.', formula: 'bill × discount', step: 0.01 },
    ],
  },
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
  const socCharge = kwh * c.soc_rate_pkr_per_unit;
  const sohCharge = pTemp * c.penalty_temp_pkr_per_pt + pCycle * c.penalty_cycle_pkr_per_pt + pFault * c.penalty_fault_pkr_per_pt;
  const base = grid + wear + c.operating_cost_pkr + delivery;
  const demand = i.peak ? Math.min(c.peak_demand_factor, c.max_demand_factor) : 1;
  const kmCharge = i.delivery ? n(i.km) * c.delivery_rate_pkr_per_km : 0;
  const gross = base * (1 + c.margin) * demand + kmCharge + socCharge + sohCharge;
  const discount = i.same ? gross * c.same_soh_discount_pct : 0;
  return { kwh, pTemp, pCycle, pFault, health, grid, wear, delivery, socCharge, sohCharge, base, demand, kmCharge, discount, total: gross - discount };
}

function quoteTotal(q: any): number | null {
  if (!q || typeof q !== 'object') return null;
  for (const k of ['total_pkr', 'total', 'price_pkr', 'amount_pkr']) if (typeof q[k] === 'number') return q[k];
  return q.price ? quoteTotal(q.price) : null;
}

/** A titled block of calculator inputs. */
function CalcGroup({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 border-b border-line pb-2">
        <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
        {hint && <p className="text-body text-ink-600">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** A big, easy-to-hit on/off choice. */
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex min-h-[52px] cursor-pointer select-none items-center gap-3 rounded-xl border px-4 py-3 text-body font-medium transition-colors duration-150 ${checked ? 'border-volt-300 bg-volt-50 text-ink-900' : 'border-line bg-white text-ink-700 hover:bg-ink-50'}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 rounded border-ink-300 accent-volt-700" />
      {label}
    </label>
  );
}

export default function PricingPage() {
  const { data, loading, error, reload } = useApi(() => Admin.pricing(), []);
  const [cfg, setCfg] = useState<PricingConfig | null>(null);
  const [sim, setSim] = useState({ capacity_used_ah: '16', temperature_c: '30', chemistry: 'LFP', delivery: false, soc_used_pct: '60', pack_id: '' });
  const [quote, setQuote] = useState<any>(null);
  const act = useAction();
  const { user } = useAuth();
  const superAdmin = isSuperAdmin(user);
  const changes = useApi(() => Admin.pricingChanges(), []);
  const log = useApi(() => Admin.reportLog({ start: new Date(Date.now() - 30 * 86400000).toISOString() }), []);
  const simAct = useAction();
  const [tab, setTab] = useState<'rates' | 'log' | 'advanced'>('rates');
  const [calc, setCalc] = useState<Calc>({ v: '48', ah: '20', soc: '60', soh: '95', temp: '30', cycles: '300', faults: '0', hours: '500', chem: 'LFP', delivery: false, peak: false, same: true, km: '5' });

  useEffect(() => { if (data) setCfg({ ...data, peak_hours_pkt: (data.peak_hours_pkt || []).map((r) => [...r] as [number, number]) }); }, [data]);
  if (loading || !cfg) return error ? <ErrorBox error={error} onRetry={reload} /> : <Loading />;

  const setN = (k: NumKey, v: string) => setCfg({ ...cfg, [k]: v === '' ? ('' as any) : Number(v) });
  const dirty = JSON.stringify(cfg) !== JSON.stringify(data);

  const save = async () => {
    const r = await act.run(() => Admin.putPricing(cfg), (res: any) => (res?.status === 'APPLIED' ? 'Pricing saved. It applies to new quotes at once.' : 'Sent to the super admin for approval. Your current rates stay live until it is approved.'));
    if (r !== undefined) { reload(); changes.reload(); }
  };

  return (
    <>
      <PageHeader title="Pricing engine" desc={superAdmin ? 'Set the SoC and SoH pricing for your station batteries. Saved rates apply to every customer on their next swap.' : 'Changes to the rates go to the super admin for approval. The price calculator is free to use.'} actions={
        <>
          <Button variant="ghost" disabled={!dirty} onClick={() => data && setCfg({ ...data })}>Discard</Button>
          <Button onClick={save} loading={act.busy} disabled={!dirty}>{superAdmin ? 'Save changes' : 'Submit for approval'}</Button>
        </>
      } />
      <div className="mb-6"><Tabs value={tab} onChange={setTab} tabs={[{ value: 'rates', label: 'Rates & calculator' }, { value: 'log', label: 'Pricing log' }, { value: 'advanced', label: 'Advanced settings' }]} /></div>
      {tab === 'rates' && <>
      {(() => {
        const list = changes.data || [];
        const pending = list.filter((c) => c.status === 'PENDING');
        if (superAdmin) {
          if (!pending.length) return null;
          return (
            <Link href="/admin/approvals" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-card border border-amber-200 bg-amber-50 px-5 py-4 transition-colors duration-150 hover:bg-amber-100">
              <span className="text-body font-medium text-amber-900">{pending.length} pricing {pending.length === 1 ? 'request is' : 'requests are'} waiting for your approval.</span>
              <span className="text-body font-semibold text-amber-900">Review →</span>
            </Link>
          );
        }
        const mine = list[0];
        if (!mine || (mine.status !== 'PENDING' && mine.status !== 'REJECTED' && mine.status !== 'APPROVED')) return null;
        const tone = mine.status === 'PENDING' ? 'border-amber-200 bg-amber-50' : mine.status === 'APPROVED' ? 'border-volt-200 bg-volt-50' : 'border-red-200 bg-red-50';
        return (
          <Card className="mb-6" title="Your latest pricing request">
            <div className={`rounded-xl border p-5 ${tone}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Badge value={mine.status === 'PENDING' ? 'PENDING' : mine.status} />
                  <span className="text-body text-ink-700">
                    {mine.status === 'PENDING' ? 'Waiting for the super admin to approve. Your current rates stay live until then.' : mine.status === 'APPROVED' ? `Approved by ${mine.decided_by_name}. The new rates are live.` : `Rejected by ${mine.decided_by_name}.`}
                  </span>
                </div>
                {mine.status === 'PENDING' && <Button variant="secondary" size="sm" disabled={act.busy} onClick={async () => { if (await act.run(() => Admin.cancelPricingChange(mine.id), 'Request withdrawn.')) changes.reload(); }}>Withdraw</Button>}
              </div>
              {mine.decision_note && <p className="mt-3 text-body text-ink-800">Note: {mine.decision_note}</p>}
              <DiffList diff={mine.diff} />
            </div>
          </Card>
        );
      })()}
      <Card className="mb-6" title="SoC & SoH rate control" subtitle="Change a rate when the market moves. Saved rates apply to every new swap straight away.">
        <div className="space-y-8">
          {RATE_GROUPS.map((g) => (
            <section key={g.id} className={`overflow-hidden rounded-2xl border ${g.tone}`}>
              <div className="flex items-center gap-4 px-6 py-5">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${g.chip}`}>
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={g.icon} /></svg>
                </span>
                <div className="min-w-0">
                  <h3 className="text-[26px] font-bold leading-7 text-ink-900">{g.title}</h3>
                  <p className="text-body text-ink-700">{g.desc}</p>
                </div>
              </div>

              <ul className="divide-y divide-line border-t border-line bg-white">
                {g.rates.map((r) => {
                  const value = cfg[r.key] as number;
                  return (
                    <li key={r.key} className="grid items-center gap-x-8 gap-y-4 px-6 py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,220px)_auto]">
                      <div className="min-w-0">
                        <div className="text-[23px] font-semibold leading-6 text-ink-900">{r.label}</div>
                        <p className="mt-1 text-body text-ink-600">{r.hint}</p>
                        {r.formula && <span className="id-mono mt-2 inline-block rounded-md bg-ink-100 px-2.5 py-1 text-ink-800">{r.formula}</span>}
                      </div>

                      <div>
                        <div className="label">Unit</div>
                        <div className="mt-1 text-body font-medium text-ink-800">{r.unit}</div>
                      </div>

                      <div className="flex flex-col items-start gap-2 md:items-end">
                        <div className="flex items-center gap-2">
                          <Button size="md" variant="secondary" className="!w-11 !px-0 text-xl" aria-label={`Decrease ${r.label}`} onClick={() => setN(r.key, String(Math.max(0, Math.round((value - r.step) * 100) / 100)))}>−</Button>
                          <Input type="number" step="any" min={0} value={value as any} aria-label={r.label} onChange={(e) => setN(r.key, e.target.value)} className="num !w-28 text-center !text-[26px] !leading-7 font-semibold" />
                          <Button size="md" variant="secondary" className="!w-11 !px-0 text-xl" aria-label={`Increase ${r.label}`} onClick={() => setN(r.key, String(Math.round((value + r.step) * 100) / 100))}>+</Button>
                        </div>
                        {r.key === 'same_soh_discount_pct' && <div className="text-body font-semibold text-blue-900">= {Math.round((Number(value) || 0) * 100)}% off the bill</div>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-ink-50 px-5 py-4">
          <p className={`text-body font-medium ${dirty ? 'text-amber-800' : 'text-ink-700'}`}>{dirty ? (superAdmin ? 'You have unsaved changes.' : 'These changes will be sent to the super admin for approval.') : 'All rates are saved and live.'}</p>
          <div className="flex gap-3">
            <Button variant="secondary" disabled={!dirty} onClick={() => data && setCfg({ ...data })}>Discard</Button>
            <Button onClick={save} loading={act.busy} disabled={!dirty}>{superAdmin ? 'Update rates' : 'Submit for approval'}</Button>
          </div>
        </div>
      </Card>
      <Card className="mb-6" title="Price calculator">
        <p className="mb-6 text-body text-ink-600">Try any numbers here. The calculator never changes live prices and needs no approval.</p>
        {(() => {
          const x = calcPrice(cfg, calc);
          const set = (k: keyof Calc, v: string | boolean) => setCalc({ ...calc, [k]: v });
          const num = (k: keyof Calc, label: string) => (
            <Field key={k} label={label}><Input type="number" value={calc[k] as string} onChange={(e) => set(k, e.target.value)} /></Field>
          );
          const row = (k: string, v: string, tone?: 'good') => (
            <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-body text-ink-200">{k}</dt>
              <dd className={`num text-lg font-semibold ${tone === 'good' ? 'text-volt-300' : 'text-white'}`}>{v}</dd>
            </div>
          );
          const status = x.health < 70 ? 'Retire the pack' : x.health < 80 ? 'Needs maintenance' : 'Healthy';
          return (
            <div className="grid gap-8 xl:grid-cols-[1.1fr_1fr]">
              <div className="space-y-8">
                <CalcGroup title="Energy" hint="How much charge the swap uses.">
                  <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
                    {num('v', 'Voltage (V)')}
                    {num('ah', 'Full capacity (Ah)')}
                    {num('soc', 'SoC used (%)')}
                    <Field label="Chemistry"><Select value={calc.chem} onChange={(e) => set('chem', e.target.value)} options={['LFP', 'NMC'].map((v) => ({ value: v, label: v }))} /></Field>
                  </div>
                </CalcGroup>
                <CalcGroup title="Pack health" hint="What the returned pack looks like (SoH).">
                  <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                    {num('soh', 'SoH (%)')}
                    {num('temp', 'Return temp (°C)')}
                    {num('cycles', 'Cycles used')}
                    {num('faults', 'Fault count')}
                    {num('hours', 'Operating hours')}
                  </div>
                </CalcGroup>
                <CalcGroup title="This order">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Toggle label="Home delivery" checked={calc.delivery} onChange={(v) => set('delivery', v)} />
                    <Toggle label="Returned in same SoH" checked={calc.same} onChange={(v) => set('same', v)} />
                    <Toggle label="Peak hour" checked={calc.peak} onChange={(v) => set('peak', v)} />
                  </div>
                  {calc.delivery && <div className="mt-5 max-w-xs">{num('km', 'Delivery distance (km)')}</div>}
                </CalcGroup>
              </div>

              <aside className="h-fit rounded-2xl bg-gradient-to-b from-ink-950 via-[#0c1f2a] to-[#0a3a2c] p-7 text-white xl:sticky xl:top-6">
                <div className="label !text-ink-300">Swap price</div>
                <div className="num mt-1 text-[44px] font-bold leading-[3rem]">{pkr(x.total)}</div>
                <div className="mt-1 text-body text-ink-300">Includes {Math.round(cfg.margin * 100)}% margin × demand {x.demand}. SoC, SoH and distance are added at their exact rates.</div>

                <dl className="mt-6 divide-y divide-white/10 border-t border-white/10">
                  {row('Units used', `${x.kwh.toFixed(3)} kWh`)}
                  {row('Grid + wear', pkr(x.grid + x.wear))}
                  {row('Operating + delivery', pkr(cfg.operating_cost_pkr + x.delivery))}
                  {row('SoC charge', pkr(x.socCharge))}
                  {row('SoH penalty charge', pkr(x.sohCharge))}
                  {row('Delivery distance', pkr(x.kmCharge))}
                  {x.discount > 0 && row('Same-SoH discount', `− ${pkr(x.discount)}`, 'good')}
                </dl>

                <div className="mt-6 rounded-xl bg-white/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-body text-ink-200">Health score</span>
                    <span className="num text-lg font-semibold">{x.health.toFixed(1)}%</span>
                  </div>
                  <div className="mt-1 text-body font-medium text-volt-300">{status}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-ink-200">
                    <span className="rounded-full bg-white/10 px-3 py-1">Temp {x.pTemp.toFixed(1)} pts</span>
                    <span className="rounded-full bg-white/10 px-3 py-1">Cycle {x.pCycle.toFixed(1)} pts</span>
                    <span className="rounded-full bg-white/10 px-3 py-1">Fault {x.pFault.toFixed(1)} pts</span>
                  </div>
                </div>
              </aside>
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
