'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { formatDateOnly } from '@/lib/dateOnly';
import { useRecommendedNextDeliveryQuery } from '@/lib/hooks/recommendedDeliveryQueries';
import { useCurrentDeliveryUserLocationQuery, useSaveCurrentDeliveryUserLocationMutation } from '@/lib/hooks/deliveryUserLocationQueries';

const priorityLabels = { urgent: 'Urgent', high: 'High', normal: 'Normal', low: 'Low' } as const;

export function RecommendedNextDelivery({ enabled }: { enabled: boolean }) {
  const [locationReady, setLocationReady] = useState(false);
  const [coordinates, setCoordinates] = useState<{ latitude?: number; longitude?: number }>({});
  const [locationState, setLocationState] = useState<'fresh' | 'stale' | 'unavailable'>('unavailable');
  const locationRequestStarted = useRef(false);
  const storedLocation = useCurrentDeliveryUserLocationQuery(enabled);
  const saveLocation = useSaveCurrentDeliveryUserLocationMutation();

  useEffect(() => {
    if (!enabled) return;
    if (storedLocation.isLoading || locationRequestStarted.current) return;
    locationRequestStarted.current = true;
    if (storedLocation.data?.state === 'fresh' && storedLocation.data.location) {
      setCoordinates({ latitude: storedLocation.data.location.latitude, longitude: storedLocation.data.location.longitude });
      setLocationState('fresh');
      setLocationReady(true);
      return;
    }
    setLocationState(storedLocation.data?.state === 'stale' ? 'stale' : 'unavailable');
    if (!navigator.geolocation) {
      setLocationReady(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextCoordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setCoordinates(nextCoordinates);
        setLocationState('fresh');
        try {
          await saveLocation.mutateAsync(nextCoordinates);
        } catch {
          // The recommendation can still use this fresh browser location for this request.
        }
        setLocationReady(true);
      },
      () => setLocationReady(true),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 10_000 },
    );
  }, [enabled, storedLocation.data, storedLocation.isLoading]);

  const recommendation = useRecommendedNextDeliveryQuery(coordinates.latitude, coordinates.longitude, enabled && locationReady);
  if (!enabled) return null;
  if (!locationReady || recommendation.isLoading) return <section className="rounded-3xl border border-sidrah-200 bg-sidrah-50 p-5 shadow-soft"><p className="text-sm text-sidrah-700">Finding your recommended next delivery…</p></section>;
  if (recommendation.isError) return <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-soft"><p className="text-sm text-rose-700">Unable to load the recommended next delivery.</p></section>;
  if (!recommendation.data) return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft"><p className="font-semibold text-slate-900">No recommended delivery</p><p className="mt-1 text-sm text-slate-600">There are no eligible pending deliveries right now.</p></section>;

  const delivery = recommendation.data;
  return <section className="rounded-3xl border-2 border-sidrah-300 bg-sidrah-50/70 p-5 shadow-soft sm:p-6" aria-labelledby="recommended-next-delivery-heading">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-sidrah-600">Recommended Next Delivery</p>
        <h2 id="recommended-next-delivery-heading" className="mt-2 text-xl font-semibold text-slate-900">{delivery.vendor_name}</h2>
        <p className="mt-1 text-sm text-slate-600">{delivery.delivery_address}</p>
      </div>
      <Link href={`/deliveries/${delivery.delivery_id}`} className="inline-flex items-center justify-center rounded-2xl bg-sidrah-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sidrah-700">Open Delivery</Link>
    </div>
    <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <p><span className="text-slate-500">Priority:</span> <span className="font-semibold text-slate-900">{priorityLabels[delivery.priority]}</span></p>
      <p><span className="text-slate-500">Delivery date:</span> <span className="font-semibold text-slate-900">{formatDateOnly(delivery.delivery_date)}</span></p>
      {delivery.cooking_location ? <p><span className="text-slate-500">Cooking location:</span> <span className="font-semibold text-slate-900">{delivery.cooking_location}</span></p> : null}
      <p><span className="text-slate-500">Distance:</span> <span className="font-semibold text-slate-900">{delivery.distance_available ? `${delivery.distance_km} km` : 'Distance unavailable'}</span></p>
    </div>
    <p className="mt-4 text-xs text-slate-600">{delivery.recommendation_reason}</p>
    <p className="mt-2 text-xs text-slate-500">{delivery.location_state === 'fresh' ? 'Using current location' : delivery.location_state === 'stale' || locationState === 'stale' ? 'Location stale — using priority fallback' : 'Location unavailable — using priority fallback'}</p>
  </section>;
}
