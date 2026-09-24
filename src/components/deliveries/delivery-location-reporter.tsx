'use client';

import { useEffect, useState } from 'react';
import { useUpdateDeliveryTrackingMutation } from '@/lib/hooks/deliveryTrackingQueries';

export function DeliveryLocationReporter({ deliveryId, active }: { deliveryId: string; active: boolean }) {
  const mutation = useUpdateDeliveryTrackingMutation();
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !navigator.geolocation) {
      if (active) setMessage('Location sharing is unavailable on this device.');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setMessage('Location sharing is active.');
        mutation.mutate({ deliveryId, latitude: position.coords.latitude, longitude: position.coords.longitude });
      },
      () => setMessage('Location permission was denied. Enable it to share your current position.'),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [active, deliveryId]);

  if (!active) return null;
  return <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600" role="status">{message || 'Requesting current location…'}</p>;
}
