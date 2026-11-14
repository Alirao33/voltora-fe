'use client';
import type { OrderOut } from '@/lib/types';
import { dt, pkr } from '@/lib/format';
import { Badge, DataTable, Mono } from './ui';

export function OrdersTable({ rows, onOpen, showUser }: { rows: OrderOut[]; onOpen?: (o: OrderOut) => void; showUser?: boolean }) {
  return (
    <DataTable
      rows={rows}
      rowKey={(o) => o.id}
      onRowClick={onOpen}
      empty="No orders yet."
      cols={[
        { key: 'order_id', header: 'Order', render: (o) => <Mono>{o.order_id}</Mono> },
        { key: 'created_at', header: 'Created', render: (o) => dt(o.created_at) },
        { key: 'station_id', header: 'Station', render: (o) => o.station_id },
        { key: 'mode', header: 'Mode', render: (o) => <Badge value={o.mode} /> },
        { key: 'status', header: 'Status', render: (o) => <Badge value={o.status} /> },
        { key: 'pack', header: 'Packs (out / in)', render: (o) => <Mono>{o.pack_out_id || '—'} / {o.pack_in_id || '—'}</Mono> },
        ...(showUser ? [{ key: 'receipt_no', header: 'Receipt', render: (o: OrderOut) => <Mono>{o.receipt_no || '—'}</Mono> }] : []),
        { key: 'total_pkr', header: 'Total', align: 'right' as const, render: (o) => pkr(o.actual_total_pkr ?? o.total_pkr) },
        { key: 'charged_pkr', header: 'Charged', align: 'right' as const, render: (o) => pkr(o.charged_pkr) },
      ]}
    />
  );
}
