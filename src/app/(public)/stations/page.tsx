'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Guest, stationId, stationName } from '@/lib/endpoints';
import { asList } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { getPosition } from '@/lib/format';
import { latOf, lonOf, MiniMap, StationCard } from '@/components/domain';
import { Button, Card, Empty, ErrorBox, Field, Input, Loading } from '@/components/ui';
import { useToast } from '@/components/Toast';

type Pin = { lat: number; lon: number };

export default function StationsPage() {
  const toast = useToast();
  const [pos, setPos] = useState<Pin | null>(null); // from "Use my location"
  const [found, setFound] = useState<Pin | null>(null); // from the place the rider typed
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<any>(null);
  const where = found ?? pos;
  const { data, loading, error, reload } = useApi(() => Guest.stations({ lat: where?.lat, lon: where?.lon }), [where?.lat, where?.lon]);

  // Look up the typed place (landmark, colony, street) on the map, then rank stations by distance from it.
  useEffect(() => {
    const text = q.trim();
    setFound(null);
    if (text.length < 3) return;
    let live = true;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=pk&accept-language=en&q=${encodeURIComponent(`${text}, Karachi`)}`);
        const j = await r.json();
        if (live && j?.[0]) { setFound({ lat: Number(Number(j[0].lat).toFixed(6)), lon: Number(Number(j[0].lon).toFixed(6)) }); setSel(null); }
      } catch { /* no lookup available: the name/area text filter below still works */ }
      finally { if (live) setSearching(false); }
    }, 700);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  // When the place was found, the list is already sorted nearest first; otherwise match the text against names and areas.
  const list = asList(data).filter((s) => found || !q || `${stationName(s)} ${s.address || ''}`.toLowerCase().includes(q.toLowerCase()));
  const active = sel || list[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-page text-ink-900">Stations</h1>
          <p className="mt-1 text-ink-600">Live stock at every Voltora swap point{where ? ', nearest first' : ''}.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end lg:w-auto">
          <Field label="Search" className="w-full sm:w-80" hint={searching ? 'Finding that place…' : found ? 'Nearest stations to that place' : undefined}>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, colony or landmark" />
          </Field>
          <Button variant="secondary" className="w-full sm:w-auto" onClick={() => getPosition().then((p) => { setPos(p); setQ(''); setSel(null); toast.success('Showing stations nearest to you'); }).catch((e) => toast.error(e.message))}>📍 Use my location</Button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          <ErrorBox error={error} onRetry={reload} />
          {loading ? <Loading /> : list.length ? list.map((s, i) => (
            <StationCard key={stationId(s) || i} s={s} selected={active && stationId(active) === stationId(s)} onClick={() => setSel(s)} />
          )) : <Empty title="No stations found">Try a different name or area, or clear the search.</Empty>}
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
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {active.address && <div className="col-span-2"><dt className="text-xs text-ink-600">Area</dt><dd>{active.address}</dd></div>}
                <div><dt className="text-xs text-ink-600">Lockers</dt><dd className="num text-lg font-medium">{active.total_lockers ?? '—'}</dd></div>
                <div><dt className="text-xs text-ink-600">Free battery slots</dt><dd className="num text-lg font-medium">{active.free_slots ?? '—'}</dd></div>
                {active.occupancy_status && <div><dt className="text-xs text-ink-600">Availability</dt><dd>{String(active.occupancy_status).replace(/_/g, ' ').toLowerCase().replace(/^./, (c: string) => c.toUpperCase())}</dd></div>}
                {active.distance_km != null && <div><dt className="text-xs text-ink-600">Distance</dt><dd className="num">{Number(active.distance_km).toFixed(1)} km</dd></div>}
              </dl>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
