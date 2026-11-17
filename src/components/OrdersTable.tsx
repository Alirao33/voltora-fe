'use client';
import type { OrderOut } from '@/lib/types';
import { dt, pkr } from '@/lib/format';
import { Badge, DataTable, Mono } from './ui';

export function OrdersTable({ rows, onOpen, showUser, showDriver }: { rows: OrderOut[]; onOpen?: (o: OrderOut) => void; showUser?: boolean; showDriver?: boolean }) {
  return (
    <DataTable
      rows={rows}
      rowKey={(o) => o.id}
      onRowClick={onOpen}
      empty="No orders yet."
      cols={[
        { key: 'order_id', header: 'Order', render: (o) => <div><Mono>{o.order_id}</Mono><div className="mt-1.5 text-sm font-normal text-ink-600">{dt(o.created_at)}</div></div> },
        { key: 'station_id', header: 'Station', render: (o) => <div><div className="font-medium text-ink-900">{o.station_id}</div><div className="mt-1.5"><Badge value={o.mode} /></div></div> },
        { key: 'status', header: 'Status', render: (o) => <Badge value={o.status} /> },
        ...(showDriver ? [{ key: 'driver', header: 'Delivery man', render: (o: OrderOut) => (o.driver_name ? <span>{o.driver_name}{o.driver_phone ? <span className="block text-sm text-ink-600">{o.driver_phone}{o.van_name ? ` · ${o.van_name}` : ''}</span> : null}</span> : <span className="text-ink-600">{o.status === 'AWAITING_APPROVAL' ? 'Awaiting approval' : 'Not assigned'}</span>) }] : []),
        { key: 'pack', header: 'Packs (out / in)', hideBelow: 'xl' as const, render: (o) => <div className="space-y-1.5"><Mono>{o.pack_out_id || '—'}</Mono><div className="text-sm text-ink-600">returned <span className="id-mono">{o.pack_in_id || '—'}</span></div></div> },
        ...(showUser ? [{ key: 'receipt_no', header: 'Receipt', hideBelow: '2xl' as const, render: (o: OrderOut) => <Mono>{o.receipt_no || '—'}</Mono> }] : []),
        { key: 'total_pkr', header: 'Total', align: 'right' as const, render: (o) => pkr(o.actual_total_pkr ?? o.total_pkr) },
        { key: 'charged_pkr', header: 'Charged', align: 'right' as const, render: (o) => <b className="font-semibold">{pkr(o.charged_pkr)}</b> },
      ]}
    />
  );
}
