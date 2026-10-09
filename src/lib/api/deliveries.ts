import type { AgentAccountabilityDetail, AgentAccountabilityTransfer, DeliveryActivity, DeliveryItem, DeliveryPreparationSummary, DeliveryPriority, DeliveryRecord } from '@/lib/types';

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

export async function getDeliveries(params?: { status?: string; productId?: string; unassigned?: boolean; vendor?: string; location?: string; dateDelivered?: string }): Promise<DeliveryRecord[]> {
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

export async function getForemanDeliveryPreparationSummary(): Promise<DeliveryPreparationSummary> {
  const result = await fetchJson<{ status: string; data: DeliveryPreparationSummary }>('/api/factory/delivery-preparations');
  return result.data;
}

export async function getDelivery(deliveryId: string): Promise<DeliveryRecord> {
  const result = await fetchJson<{ status: string; data: DeliveryRecord }>(`/api/deliveries/${encodeURIComponent(deliveryId)}`);
  return result.data;
}

export async function getDeliveryAccountability(deliveryId: string): Promise<AgentAccountabilityDetail | null> {
  const result = await fetchJson<{ status: string; data: AgentAccountabilityDetail | null }>(`/api/deliveries/${encodeURIComponent(deliveryId)}/accountability`);
  return result.data;
}

export async function recordAccountabilityCollection(deliveryId: string, payload: { amount: number; payment_option_id: string; operation_id?: string; source_payment_id?: string; reason?: string }): Promise<AgentAccountabilityDetail | null> {
  const result = await fetchJson<{ status: string; data: AgentAccountabilityDetail | null }>(`/api/deliveries/${encodeURIComponent(deliveryId)}/accountability/collections`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return result.data;
}

export async function recordAccountabilityReturn(deliveryId: string, payload: { product_id: string; quantity: number; operation_id?: string; reason?: string }): Promise<AgentAccountabilityDetail | null> {
  const result = await fetchJson<{ status: string; data: AgentAccountabilityDetail | null }>(`/api/deliveries/${encodeURIComponent(deliveryId)}/accountability/returns`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return result.data;
}

export async function getAccountabilityAgents(): Promise<Array<{ user_id: string; name: string }>> {
  const result = await fetchJson<{ status: string; data: Array<{ user_id: string; name: string }> }>('/api/accountability/agents');
  return result.data;
}

export async function getAccountabilityTransfers(): Promise<AgentAccountabilityTransfer[]> {
  const result = await fetchJson<{ status: string; data: AgentAccountabilityTransfer[] }>('/api/accountability/transfers');
  return result.data;
}

export async function initiateAccountabilityTransfer(deliveryId: string, payload: { to_agent_user_id: string; operation_id?: string; reason?: string }): Promise<AgentAccountabilityTransfer | null> {
  const result = await fetchJson<{ status: string; data: AgentAccountabilityTransfer | null }>(`/api/deliveries/${encodeURIComponent(deliveryId)}/accountability/transfers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return result.data;
}

export async function decideAccountabilityTransfer(transferId: string, action: 'accept' | 'reject' | 'cancel', reason?: string): Promise<AgentAccountabilityTransfer | null> {
  const result = await fetchJson<{ status: string; data: AgentAccountabilityTransfer | null }>(`/api/accountability/transfers/${encodeURIComponent(transferId)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, reason }) });
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
  vendor_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  items: DeliveryItem[];
  notes?: string;
  priority?: DeliveryPriority;
  delivery_date: string;
  cooking_location?: 'Home' | 'Workplace';
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

export async function markDeliveryDelivered(deliveryId: string, comment?: string, emptyGallonsReceived = 0): Promise<DeliveryRecord> {
  const result = await fetchJson<{ status: string; data: DeliveryRecord }>(`/api/deliveries/${encodeURIComponent(deliveryId)}/deliver`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comment, empty_gallons_received: emptyGallonsReceived }),
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

export async function updateDeliveryDate(deliveryId: string, deliveryDate: string): Promise<DeliveryRecord> {
  const result = await fetchJson<{ status: string; data: DeliveryRecord }>(`/api/deliveries/${encodeURIComponent(deliveryId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delivery_date: deliveryDate }),
  });
  return result.data;
}

export async function updateDeliveryDetails(deliveryId: string, payload: { delivery_date: string; cooking_location?: 'Home' | 'Workplace' }): Promise<DeliveryRecord> {
  const result = await fetchJson<{ status: string; data: DeliveryRecord }>(`/api/deliveries/${encodeURIComponent(deliveryId)}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
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
