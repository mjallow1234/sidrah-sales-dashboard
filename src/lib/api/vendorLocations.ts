import type { VendorLocationRequest } from '@/lib/types';

async function parse<T>(response: Response, fallback: string): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || fallback);
  return body.data as T;
}

export interface VendorLocationData {
  vendor_id: string;
  latitude: number | null;
  longitude: number | null;
  captured_at?: string | null;
  captured_by?: string | null;
  captured_by_name?: string;
  pending_request?: VendorLocationRequest | null;
}

export async function getVendorLocation(vendorId: string): Promise<VendorLocationData> {
  return parse<VendorLocationData>(await fetch(`/api/vendors/${encodeURIComponent(vendorId)}/location`), 'Unable to load vendor location.');
}

export async function submitVendorLocation(vendorId: string, latitude: number, longitude: number): Promise<{ type: 'updated' | 'requested'; location?: VendorLocationData; request?: VendorLocationRequest }> {
  return parse(await fetch(`/api/vendors/${encodeURIComponent(vendorId)}/location`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ latitude, longitude }) }), 'Unable to save vendor location.');
}

export async function getPendingVendorLocationRequests(): Promise<VendorLocationRequest[]> {
  return parse<VendorLocationRequest[]>(await fetch('/api/vendor-location-requests'), 'Unable to load location requests.');
}

export async function decideVendorLocationRequest(requestId: string, action: 'approve' | 'reject', reason?: string): Promise<VendorLocationRequest> {
  return parse<VendorLocationRequest>(await fetch(`/api/vendor-location-requests/${encodeURIComponent(requestId)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, reason }) }), 'Unable to decide location request.');
}
