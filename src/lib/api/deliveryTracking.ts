import type { DeliveryTrackingLocation } from '@/lib/types';

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body?.message || `Request failed: ${response.status}`);
  return body.data as T;
}

export async function getDeliveryTracking(): Promise<DeliveryTrackingLocation[]> {
  return parse<DeliveryTrackingLocation[]>(await fetch('/api/deliveries/tracking'));
}

export async function updateDeliveryTracking(deliveryId: string, latitude: number, longitude: number): Promise<void> {
  await parse<void>(await fetch('/api/deliveries/tracking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delivery_id: deliveryId, latitude, longitude }),
  }));
}
