export interface CurrentDeliveryUserLocation {
  delivery_user_id: string;
  latitude: number;
  longitude: number;
  location_updated_at: string;
  source: string;
}

export type DeliveryUserLocationState = 'fresh' | 'stale' | 'unavailable';
export interface CurrentDeliveryUserLocationResponse {
  location: CurrentDeliveryUserLocation | null;
  state: DeliveryUserLocationState;
}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body?.message || `Request failed: ${response.status}`);
  return body.data as T;
}

export async function getCurrentDeliveryUserLocation(): Promise<CurrentDeliveryUserLocationResponse> {
  return parse<CurrentDeliveryUserLocationResponse>(await fetch('/api/deliveries/location'));
}

export async function saveCurrentDeliveryUserLocation(latitude: number, longitude: number): Promise<CurrentDeliveryUserLocation> {
  return parse<CurrentDeliveryUserLocation>(await fetch('/api/deliveries/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude, longitude }),
  }));
}
