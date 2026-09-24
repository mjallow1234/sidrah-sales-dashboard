'use client';

import Link from 'next/link';
import type { DeliveryTrackingLocation } from '@/lib/types';

function mapUrl(locations: DeliveryTrackingLocation[]): string {
  const first = locations[0];
  if (!first) return '';
  const delta = 0.02;
  const bbox = [first.longitude - delta, first.latitude - delta, first.longitude + delta, first.latitude + delta].join('%2C');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${first.latitude}%2C${first.longitude}`;
}

export function DeliveryTrackingMap({ locations, isLoading, isError }: { locations: DeliveryTrackingLocation[]; isLoading: boolean; isError: boolean }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6" aria-labelledby="delivery-tracking-heading">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Live delivery tracking</p><h2 id="delivery-tracking-heading" className="mt-2 text-xl font-semibold text-slate-900">Delivery users on active deliveries</h2></div>
        <p className="text-xs text-slate-500">Updates every 30 seconds · stale after 10 minutes</p>
      </div>
      {isLoading ? <p className="mt-4 text-sm text-slate-600">Loading delivery locations…</p> : null}
      {isError ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Unable to load delivery tracking.</p> : null}
      {!isLoading && !isError && locations.length === 0 ? <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No active delivery locations have been reported yet.</p> : null}
      {!isLoading && !isError && locations.length > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <iframe title="OpenStreetMap delivery tracking map" src={mapUrl(locations)} className="h-80 w-full border-0" loading="lazy" />
            <p className="border-t border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">Map view centered on the most recently updated delivery. Use the delivery list for exact coordinates and links.</p>
          </div>
          <div className="space-y-3">
            {locations.map((location) => (
              <Link key={location.delivery_id} href={`/deliveries/${location.delivery_id}`} className="block rounded-2xl border border-slate-200 p-4 transition hover:border-sidrah-300 hover:bg-sidrah-50">
                <div className="flex items-start justify-between gap-3"><p className="font-semibold text-slate-900">{location.delivery_user_name || location.delivery_user_username || 'Delivery user'}</p><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${location.is_stale ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{location.is_stale ? 'Stale' : 'Recent'}</span></div>
                <p className="mt-1 text-sm text-slate-700">{location.vendor_name}</p><p className="text-sm text-slate-500">{location.delivery_address}</p>
                <p className="mt-2 text-xs text-slate-500">Updated {new Date(location.location_updated_at).toLocaleString()} · {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
