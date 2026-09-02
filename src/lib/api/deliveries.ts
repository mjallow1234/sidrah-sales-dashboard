import type { DeliveryItem, DeliveryRecord } from '@/lib/types';

async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, options);
  const text = await response.text();
  let json;

  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Failed to parse JSON response from ${path}`);
  }

  if (!response.ok) {
    throw new Error(json?.message || `Request failed: ${response.status}`);
  }

  return json as T;
}

export interface DeliveryUserOption {
  user_id: string;
  name: string;
  username: string;
}

export async function getDeliveries(params?: { status?: string }): Promise<DeliveryRecord[]> {
  const query = params
    ? Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&')
    : '';
  const path = query ? `/api/deliveries?${query}` : '/api/deliveries';
  const result = await fetchJson<{ status: string; data: DeliveryRecord[] }>(path);
  return result.data;
}

export async function getDelivery(deliveryId: string): Promise<DeliveryRecord> {
  const result = await fetchJson<{ status: string; data: DeliveryRecord }>(`/api/deliveries/${encodeURIComponent(deliveryId)}`);
  return result.data;
}

export async function createDelivery(payload: {
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  items: DeliveryItem[];
  notes?: string;
}) {
  const result = await fetchJson<{ status: string; data: DeliveryRecord }>('/api/deliveries', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function claimDelivery(deliveryId: string): Promise<DeliveryRecord> {
  const result = await fetchJson<{ status: string; data: DeliveryRecord }>(`/api/deliveries/${encodeURIComponent(deliveryId)}/claim`, {
    method: 'POST',
  });
  return result.data;
}

export async function markDeliveryDelivered(deliveryId: string): Promise<DeliveryRecord> {
  const result = await fetchJson<{ status: string; data: DeliveryRecord }>(`/api/deliveries/${encodeURIComponent(deliveryId)}/deliver`, {
    method: 'POST',
  });
  return result.data;
}

export async function reassignDelivery(deliveryId: string, deliveryUserId: string): Promise<DeliveryRecord> {
  const result = await fetchJson<{ status: string; data: DeliveryRecord }>(`/api/deliveries/${encodeURIComponent(deliveryId)}/reassign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ deliveryUserId }),
  });
  return result.data;
}

export async function cancelDelivery(deliveryId: string): Promise<DeliveryRecord> {
  const result = await fetchJson<{ status: string; data: DeliveryRecord }>(`/api/deliveries/${encodeURIComponent(deliveryId)}/cancel`, {
    method: 'POST',
  });
  return result.data;
}

export async function getDeliveryUsers(): Promise<DeliveryUserOption[]> {
  const result = await fetchJson<{ status: string; data: DeliveryUserOption[] }>('/api/appusers?role=delivery&status=active');
  return result.data;
}
