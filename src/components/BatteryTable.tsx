'use client';
import type { BatteryOut } from '@/lib/types';
import { ago, num } from '@/lib/format';
import { Badge, DataTable, Mono } from './ui';
import { Meter } from './LineChart';

export function BatteryTable({ rows, onOpen, actions }: { rows: BatteryOut[]; onOpen?: (b: BatteryOut) => void; actions?: (b: BatteryOut) => React.ReactNode }) {
  return (
    <DataTable
      rows={rows}
      rowKey={(b) => b.id}
      onRowClick={onOpen}
      empty="No packs match these filters."
      cols={[
        { key: 'id', header: 'Pack', render: (b) => <Mono>{b.id}</Mono> },
        { key: 'state', header: 'State', render: (b) => <Badge value={b.state} /> },
        { key: 'health', header: 'Health', render: (b) => <div className="flex items-center gap-2"><Meter value={b.health_score} /><Badge value={b.health_status} /></div> },
        { key: 'soc', header: 'SoC %', render: (b) => <Meter value={b.soc} tone="volt" /> },
        { key: 'soh', header: 'SoH %', align: 'right', render: (b) => num(b.soh) },
        { key: 'voltage', header: 'V', align: 'right', render: (b) => num(b.voltage, 2) },
        { key: 'temperature_c', header: '°C', align: 'right', render: (b) => <span className={b.temperature_c > 45 ? 'font-semibold text-red-600' : ''}>{num(b.temperature_c)}</span> },
        { key: 'cycle_count', header: 'Cycles', align: 'right', render: (b) => num(b.cycle_count, 0) },
        { key: 'chemistry', header: 'Chem', render: (b) => b.chemistry },
        { key: 'where', header: 'Location', render: (b) => <Mono>{b.station_id || (b.van_id ? `van #${b.van_id}` : '—')}{b.locker_id ? ` / ${b.locker_id}` : ''}</Mono> },
        { key: 'last_seen_at', header: 'Seen', render: (b) => <span className="text-ink-500">{ago(b.last_seen_at)}</span> },
        ...(actions ? [{ key: 'actions', header: '', render: (b: BatteryOut) => <div onClick={(e) => e.stopPropagation()}>{actions(b)}</div> }] : []),
      ]}
    />
  );
}
