'use client';
import { useEffect, useState } from 'react';
import { Admin, Guest } from '@/lib/endpoints';
import { useAction, useApi } from '@/lib/hooks';
import type { PricingConfig } from '@/lib/types';
import { pkr } from '@/lib/format';
import { AutoView } from '@/components/AutoView';
import { Button, Card, Checkbox, ErrorBox, Field, Input, Loading, PageHeader } from '@/components/ui';

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

function quoteTotal(q: any): number | null {
  if (!q || typeof q !== 'object') return null;
  for (const k of ['total_pkr', 'total', 'price_pkr', 'amount_pkr']) if (typeof q[k] === 'number') return q[k];
  return q.price ? quoteTotal(q.price) : null;
}

export default function PricingPage() {
  const { data, loading, error, reload } = useApi(() => Admin.pricing(), []);
  const [cfg, setCfg] = useState<PricingConfig | null>(null);
  const [sim, setSim] = useState({ capacity_used_ah: '16', temperature_c: '30', chemistry: 'LFP', delivery: false });
  const [quote, setQuote] = useState<any>(null);
  const act = useAction();
  const simAct = useAction();

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
      <PageHeader title="Pricing engine" desc="Every quote = (energy × tariff + wear + operating cost) × (1 + margin) × demand × thermal." actions={
        <>
          <Button variant="ghost" disabled={!dirty} onClick={() => data && setCfg({ ...data })}>Discard</Button>
          <Button onClick={save} loading={act.busy} disabled={!dirty}>Save changes</Button>
        </>
      } />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
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
                  <span className="text-ink-400">→</span>
                  <Input type="number" min={0} max={24} value={b} className="w-24" onChange={(e) => { const p = [...cfg.peak_hours_pkt]; p[i] = [a, Number(e.target.value)]; setCfg({ ...cfg, peak_hours_pkt: p }); }} />
                  <span className="text-sm text-ink-500">{String(a).padStart(2, '0')}:00 – {String(b).padStart(2, '0')}:00</span>
                  <Button size="sm" variant="ghost" onClick={() => setCfg({ ...cfg, peak_hours_pkt: cfg.peak_hours_pkt.filter((_, j) => j !== i) })}>Remove</Button>
                </div>
              ))}
              <div className="mt-3 flex h-6 overflow-hidden rounded-md border border-ink-200">
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} title={`${h}:00`} className={`flex-1 border-r border-white ${cfg.peak_hours_pkt.some(([a, b]) => h >= a && h < b) ? 'bg-amber-400' : 'bg-ink-100'}`} />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-ink-400"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
            </div>
          </Card>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <Card title="Try a quote" subtitle="Uses the saved config (save first to test edits).">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Capacity used (Ah)"><Input type="number" value={sim.capacity_used_ah} onChange={(e) => setSim({ ...sim, capacity_used_ah: e.target.value })} /></Field>
              <Field label="Return temp (°C)"><Input type="number" value={sim.temperature_c} onChange={(e) => setSim({ ...sim, temperature_c: e.target.value })} /></Field>
              <Field label="Chemistry"><select className="h-10 w-full rounded-lg border border-ink-200 px-2 text-sm" value={sim.chemistry} onChange={(e) => setSim({ ...sim, chemistry: e.target.value })}><option>LFP</option><option>NMC</option></select></Field>
              <div className="flex items-end pb-2"><Checkbox label="Delivery" checked={sim.delivery} onChange={(e) => setSim({ ...sim, delivery: e.target.checked })} /></div>
            </div>
            <Button className="mt-4 w-full" variant="dark" loading={simAct.busy} onClick={async () => {
              const r = await simAct.run(() => Guest.quote({ capacity_used_ah: Number(sim.capacity_used_ah), temperature_c: Number(sim.temperature_c), chemistry: sim.chemistry as any, delivery: sim.delivery }));
              if (r) setQuote(r);
            }}>Quote</Button>
            {quote && (
              <div className="mt-5 border-t border-ink-100 pt-4">
                <div className="mb-3 font-mono text-3xl font-semibold">{pkr(quoteTotal(quote))}</div>
                <AutoView data={quote} />
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
