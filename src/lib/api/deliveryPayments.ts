import type { DeliveryPaymentHistory, DeliveryPaymentOption, DeliveryPaymentSummary } from '@/lib/types';

async function parse<T>(response: Response, fallback: string): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || fallback);
  return body.data as T;
}

export async function getDeliveryPaymentOptions(includeInactive = false): Promise<DeliveryPaymentOption[]> {
  return parse<DeliveryPaymentOption[]>(await fetch(`/api/delivery-payment-options${includeInactive ? '?includeInactive=1' : ''}`), 'Unable to load payment options.');
}

export async function createDeliveryPaymentOption(name: string): Promise<DeliveryPaymentOption> {
  return parse<DeliveryPaymentOption>(await fetch('/api/delivery-payment-options', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }), 'Unable to add payment option.');
}

export async function updateDeliveryPaymentOption(id: string, payload: { name?: string; is_active?: boolean }): Promise<DeliveryPaymentOption> {
  return parse<DeliveryPaymentOption>(await fetch(`/api/delivery-payment-options/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }), 'Unable to update payment option.');
}

export async function getDeliveryPayments(deliveryId: string): Promise<DeliveryPaymentHistory> {
  return parse<DeliveryPaymentHistory>(await fetch(`/api/deliveries/${encodeURIComponent(deliveryId)}/payments`), 'Unable to load payment history.');
}

export async function getDeliveryPaymentSummary(filters: { date: string; location?: string; vendor?: string }): Promise<DeliveryPaymentSummary> {
  const params = new URLSearchParams({ date: filters.date });
  if (filters.location) params.set('location', filters.location);
  if (filters.vendor) params.set('vendor', filters.vendor);
  return parse<DeliveryPaymentSummary>(await fetch(`/api/deliveries/payments/summary?${params.toString()}`), 'Unable to load payment summary.');
}

export async function recordDeliveryPayment(deliveryId: string, amount: number, paymentOptionId: string): Promise<DeliveryPaymentHistory> {
  return parse<DeliveryPaymentHistory>(await fetch(`/api/deliveries/${encodeURIComponent(deliveryId)}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, payment_option_id: paymentOptionId }) }), 'Unable to record payment.');
}
