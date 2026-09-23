import type { DeliveryActivity, DeliveryItem, DeliveryPreparationSummary, DeliveryPriority, DeliveryRecord } from '@/lib/types';

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

export async function getDeliveryPreparationSummary(): Promise<DeliveryPreparationSummary> {
  const result = await fetchJson<{ status: string; data: DeliveryPreparationSummary }>('/api/deliveries/summary');
  return result.data;
}

export async function getDelivery(deliveryId: string): Promise<DeliveryRecord> {
  const result = await fetchJson<{ status: string; data: DeliveryRecord }>(`/api/deliveries/${encodeURIComponent(deliveryId)}`);
  return result.data;
}

export async function addDeliveryItems(deliveryId: string, items: DeliveryItem[]): Promise<DeliveryRecord> {
  const result = await fetchJson<{ status: string; data: DeliveryRecord }>(`/api/deliveries/${encodeURIComponent(deliveryId)}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  return result.data;
}

export async function createDelivery(payload: {
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  items: DeliveryItem[];
  notes?: string;
  priority?: DeliveryPriority;
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

export async function claimDelivery(deliveryId: string, comment?: string): Promise<DeliveryRecord> {
  const result = await fetchJson<{ status: string; data: DeliveryRecord }>(`/api/deliveries/${encodeURIComponent(deliveryId)}/claim`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comment }),
  });
  return result.data;
}

export async function markDeliveryDelivered(deliveryId: string, comment?: string): Promise<DeliveryRecord> {
  const result = await fetchJson<{ status: string; data: DeliveryRecord }>(`/api/deliveries/${encodeURIComponent(deliveryId)}/deliver`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comment }),
  });
  return result.data;
}

export async function reassignDelivery(deliveryId: string, deliveryUserId: string, comment?: string): Promise<DeliveryRecord> {
  const result = await fetchJson<{ status: string; data: DeliveryRecord }>(`/api/deliveries/${encodeURIComponent(deliveryId)}/reassign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ deliveryUserId, comment }),
  });
  return result.data;
}

export async function cancelDelivery(deliveryId: string, comment?: string): Promise<DeliveryRecord> {
  const result = await fetchJson<{ status: string; data: DeliveryRecord }>(`/api/deliveries/${encodeURIComponent(deliveryId)}/cancel`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comment }),
  });
  return result.data;
}

export async function getDeliveryActivity(deliveryId: string): Promise<DeliveryActivity[]> {
  const result = await fetchJson<{ status: string; data: DeliveryActivity[] }>(`/api/deliveries/${encodeURIComponent(deliveryId)}/activity`);
  return result.data;
}

export async function addDeliveryComment(deliveryId: string, comment: string): Promise<DeliveryActivity[]> {
  const result = await fetchJson<{ status: string; data: DeliveryActivity[] }>(`/api/deliveries/${encodeURIComponent(deliveryId)}/comments`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comment }),
  });
  return result.data;
}

export async function getDeliveryUsers(): Promise<DeliveryUserOption[]> {
  const result = await fetchJson<{ status: string; data: DeliveryUserOption[] }>('/api/appusers?role=delivery&status=active');
  return result.data;
}
