'use client';

export type PricingDiff = { field: string; from: unknown; to: unknown }[];

/** Readable names for every pricing setting. */
export const PRICING_LABELS: Record<string, string> = {
  soc_rate_pkr_per_unit: 'SoC rate (PKR per unit)',
  soc_rate_pkr_per_pct: 'SoC rate (old, per 1%)',
  delivery_rate_pkr_per_km: 'Delivery rate (PKR per km)',
  penalty_temp_pkr_per_pt: 'Temperature penalty (PKR/pt)',
  penalty_cycle_pkr_per_pt: 'Cycle penalty (PKR/pt)',
  penalty_fault_pkr_per_pt: 'Fault penalty (PKR/pt)',
  same_soh_discount_pct: 'Same-SoH discount',
  tariff_grid_pkr_per_kwh: 'Grid tariff (PKR/kWh)',
  wear_pkr_per_kwh_lfp: 'Wear, LFP (PKR/kWh)',
  wear_pkr_per_kwh_nmc: 'Wear, NMC (PKR/kWh)',
  operating_cost_pkr: 'Operating cost per swap (PKR)',
  delivery_cost_pkr: 'Home delivery cost (PKR)',
  margin: 'Margin',
  peak_demand_factor: 'Peak demand factor',
  peak_hours_pkt: 'Peak hours',
  scarcity_threshold: 'Scarcity threshold',
  scarcity_uplift: 'Scarcity uplift',
  max_demand_factor: 'Max demand factor',
  thermal_adjustment_enabled: 'Thermal adjustment',
  green_rebate_max_c: 'Green rebate below (°C)',
  green_rebate_pct: 'Green rebate',
  standard_max_c: 'Penalty above (°C)',
  thermal_penalty_pct: 'Thermal penalty',
};

const fmtVal = (v: unknown) =>
  Array.isArray(v) ? v.map((w) => (Array.isArray(w) ? w.join('–') : String(w))).join(', ') : typeof v === 'boolean' ? (v ? 'On' : 'Off') : String(v);

/** What a request changes, one line per setting: "SoC rate  10 → 12". */
export function DiffList({ diff }: { diff: PricingDiff }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {diff.map((d) => (
        <li key={d.field} className="flex flex-wrap items-center gap-x-3 text-body">
          <span className="font-medium text-ink-900">{PRICING_LABELS[d.field] || d.field}</span>
          <span className="num text-ink-600">{fmtVal(d.from)}</span>
          <span aria-hidden className="text-ink-600">→</span>
          <span className="num font-semibold text-volt-800">{fmtVal(d.to)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Short summary for a table cell: "SoC rate, Delivery rate +1 more". */
export function diffSummary(diff: PricingDiff) {
  const names = diff.slice(0, 2).map((d) => (PRICING_LABELS[d.field] || d.field).replace(/ \(.*\)$/, ''));
  return names.join(', ') + (diff.length > 2 ? ` +${diff.length - 2} more` : '');
}
