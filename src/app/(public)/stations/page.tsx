'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Guest, stationId, stationName } from '@/lib/endpoints';
import { asList } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { getPosition } from '@/lib/format';
import { latOf, lonOf, MiniMap, StationCard } from '@/components/domain';
import { AutoView } from '@/components/AutoView';
import { Button, Card, Empty, ErrorBox, Field, Input, Loading } from '@/components/ui';
import { useToast } from '@/components/Toast';

export default function StationsPage() {
  const toast = useToast();
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null);
  const [radius, setRadius] = useState(25);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<any>(null);
  const { data, loading, error, reload } = useApi(() => Guest.stations({ lat: pos?.lat, lon: pos?.lon, radius_km: radius }), [pos?.lat, pos?.lon, radius]);
  const list = asList(data).filter((s) => !q || `${stationName(s)} ${s.address || ''}`.toLowerCase().includes(q.toLowerCase()));
  const active = sel || list[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Stations</h1>
          <p className="mt-1 text-ink-500">Live stock at every Voltora swap point{pos ? ', nearest first' : ''}.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Search"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or area" /></Field>
          <Field label="Radius (km)"><Input type="number" min={1} max={100} value={radius} onChange={(e) => setRadius(Math.min(100, Math.max(1, +e.target.value || 25)))} className="w-24" /></Field>
          <Button variant="secondary" onClick={() => getPosition().then(setPos).catch((e) => toast.error(e.message))}>📍 Use my location</Button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          <ErrorBox error={error} onRetry={reload} />
          {loading ? <Loading /> : list.length ? list.map((s, i) => (
            <StationCard key={stationId(s) || i} s={s} selected={active && stationId(active) === stationId(s)} onClick={() => setSel(s)} />
          )) : <Empty title="No stations found">Try a larger radius or clear the search.</Empty>}
        </div>
        {active && (
          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            {latOf(active) != null && lonOf(active) != null && <MiniMap lat={latOf(active)!} lon={lonOf(active)!} className="h-72" />}
            <Card title={stationName(active)} actions={
              <>
                {latOf(active) != null && (
                  <a className="text-sm font-medium text-volt-700" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${latOf(active)},${lonOf(active)}`}>Directions ↗</a>
                )}
                <Link href={`/swap?site=${encodeURIComponent(stationId(active))}`} className="rounded-lg bg-volt-500 px-3 py-1.5 text-sm font-medium text-volt-950">Swap here</Link>
              </>
            }>
              <AutoView data={active} />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
