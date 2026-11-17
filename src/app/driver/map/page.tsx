'use client';
import { useState } from 'react';
import { asList } from '@/lib/api';
import { Driver, Guest, stationId, stationName } from '@/lib/endpoints';
import { useApi } from '@/lib/hooks';
import { latOf, lonOf, MiniMap } from '@/components/domain';
import { Badge, Card, Empty, ErrorBox, Loading, PageHeader } from '@/components/ui';

type Pin = { key: string; title: string; sub: string; kind: string; lat: number; lon: number };

/** Map for the delivery man: customers still waiting for a delivery, and the stations. Stays inside the delivery man's app. */
export default function DriverMap() {
  const tasks = useApi(() => Driver.tasks(), []);
  const stations = useApi(() => Guest.stations({ radius_km: 100 }), []);
  const [picked, setPicked] = useState<string | null>(null);

  const stops: Pin[] = (tasks.data || [])
    .filter((t) => t.latitude != null && t.longitude != null)
    .map((t) => ({
      key: `task-${t.id}`,
      title: t.kind === 'DELIVERY' ? t.customer_name || 'Customer' : `Station ${t.station_id}`,
      sub: t.address || t.station_id || '',
      kind: t.kind,
      lat: t.latitude!,
      lon: t.longitude!,
    }));
  const places: Pin[] = asList(stations.data)
    .filter((s: any) => latOf(s) != null && lonOf(s) != null)
    .map((s: any) => ({ key: `st-${stationId(s)}`, title: stationName(s), sub: s.address || '', kind: 'STATION', lat: latOf(s)!, lon: lonOf(s)! }));

  const all = [...stops, ...places];
  const cur = all.find((p) => p.key === picked) || all[0];

  const row = (p: Pin) => (
    <li key={p.key}>
      <button type="button" onClick={() => setPicked(p.key)} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${cur?.key === p.key ? 'bg-volt-50 ring-1 ring-volt-300' : 'hover:bg-ink-50'}`}>
        <span><b className="text-ink-900">{p.title}</b><span className="block text-xs text-ink-600">{p.sub}</span></span>
        <Badge value={p.kind} />
      </button>
    </li>
  );

  if (tasks.loading || stations.loading) return <Loading />;
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Map" desc="Where your customers are waiting, and where the stations are." />
      <ErrorBox error={tasks.error || stations.error} onRetry={() => { tasks.reload(); stations.reload(); }} />
      {!cur ? <Card><Empty title="Nothing to show on the map yet" /></Card> : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-6">
            <Card title="Customers to deliver to">
              {stops.length ? <ul className="space-y-1">{stops.map(row)}</ul> : <p className="text-sm text-ink-600">No delivery stops right now.</p>}
            </Card>
            <Card title="Stations">
              {places.length ? <ul className="space-y-1">{places.map(row)}</ul> : <p className="text-sm text-ink-600">No stations found.</p>}
            </Card>
          </div>
          <Card title={cur.title} subtitle={cur.sub} actions={
            <a className="text-sm font-medium text-volt-700 underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${cur.lat},${cur.lon}`}>Directions ↗</a>
          }>
            <MiniMap lat={cur.lat} lon={cur.lon} className="h-96" />
          </Card>
        </div>
      )}
    </div>
  );
}
