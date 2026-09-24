import { randomUUID } from 'crypto';
import { getPool, transaction } from '@/lib/db';
import { isAdminRole, isAdminOrSupervisorRole, isAgentRole } from '@/lib/authorization';
import { TransactionJournalRepository } from '@/repositories/TransactionJournalRepository';
import { VendorLocationRepository } from '@/repositories/VendorLocationRepository';
import { ConflictError, NotFoundError, ServiceError, ValidationError } from './errors';
import { getVendorById } from './vendorService';

function buildId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function validateCoordinates(latitude: unknown, longitude: unknown): { latitude: number; longitude: number } {
  const lat = typeof latitude === 'number' ? latitude : Number(latitude);
  const lon = typeof longitude === 'number' ? longitude : Number(longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new ValidationError('Latitude must be a valid number between -90 and 90.');
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new ValidationError('Longitude must be a valid number between -180 and 180.');
  return { latitude: Number(lat.toFixed(7)), longitude: Number(lon.toFixed(7)) };
}

async function assertVendorAccess(vendorId: string, actor: { userId: string; role?: string; salesRepId?: string }) {
  const vendor = await getVendorById(vendorId);
  if (!vendor) throw new NotFoundError('Vendor', vendorId);
  if (isAdminOrSupervisorRole(actor.role)) return vendor;
  if (isAgentRole(actor.role) && (!vendor.sales_rep_id || vendor.sales_rep_id === actor.salesRepId)) return vendor;
  throw new ServiceError('You are not allowed to access this vendor location.', 403, 'FORBIDDEN');
}

export async function getVendorLocation(vendorId: string, actor: { userId: string; role?: string; salesRepId?: string }) {
  await assertVendorAccess(vendorId, actor);
  const repository = new VendorLocationRepository(getPool());
  const current = await repository.findLocation(vendorId);
  return { vendor_id: vendorId, latitude: current.location_latitude === null ? null : Number(current.location_latitude), longitude: current.location_longitude === null ? null : Number(current.location_longitude), captured_at: current.location_updated_at instanceof Date ? current.location_updated_at.toISOString() : current.location_updated_at, captured_by: current.location_updated_by, captured_by_name: current.location_updated_by_name ?? undefined, pending_request: await repository.findPendingForVendor(vendorId) };
}

export async function submitVendorLocation(vendorId: string, latitudeValue: unknown, longitudeValue: unknown, actor: { userId: string; role?: string; salesRepId?: string }) {
  const coordinates = validateCoordinates(latitudeValue, longitudeValue);
  await assertVendorAccess(vendorId, actor);
  const timestamp = nowSql();
  return transaction(async (connection) => {
    const txRepository = new VendorLocationRepository(connection);
    const locked = await txRepository.lockVendor(vendorId);
    const request = await txRepository.findPendingForVendor(vendorId);
    if (request) throw new ConflictError('A location update request is already pending for this vendor.');
    const hasExistingLocation = locked.location_latitude !== null && locked.location_longitude !== null;
    if (isAgentRole(actor.role) && hasExistingLocation) {
      const updateRequest = await txRepository.createRequest({ request_id: buildId('VLR'), vendor_id: vendorId, latitude: coordinates.latitude, longitude: coordinates.longitude, requested_by: actor.userId });
      const journal = new TransactionJournalRepository(connection);
      await journal.create({ transaction_id: updateRequest.request_id, timestamp, endpoint: '/vendors/location', stage: 'request', status: 'success', payload: { action: 'location_update_requested', vendor_id: vendorId, old_latitude: Number(locked.location_latitude), old_longitude: Number(locked.location_longitude), proposed_latitude: coordinates.latitude, proposed_longitude: coordinates.longitude }, completed: true, actor: actor.userId, error_message: null, duration_ms: 0 });
      return { type: 'requested' as const, request: updateRequest };
    }
    await txRepository.updateLocation(vendorId, coordinates.latitude, coordinates.longitude, actor.userId, timestamp);
    const journal = new TransactionJournalRepository(connection);
    await journal.create({ transaction_id: buildId('T'), timestamp, endpoint: '/vendors/location', stage: 'update', status: 'success', payload: { action: 'location_updated', vendor_id: vendorId, old_latitude: locked.location_latitude, old_longitude: locked.location_longitude, new_latitude: coordinates.latitude, new_longitude: coordinates.longitude }, completed: true, actor: actor.userId, error_message: null, duration_ms: 0 });
    return { type: 'updated' as const, location: { vendor_id: vendorId, latitude: coordinates.latitude, longitude: coordinates.longitude, captured_at: timestamp, captured_by: actor.userId, pending_request: null } };
  });
}

export async function listPendingVendorLocationRequests(actor: { role?: string }) {
  if (!isAdminRole(actor.role)) throw new ServiceError('Only administrators can review vendor location requests.', 403, 'FORBIDDEN');
  return new VendorLocationRepository(getPool()).listPending();
}

async function decideRequest(requestId: string, actor: { userId: string; role?: string }, decision: 'approved' | 'rejected', reasonValue?: unknown) {
  if (!isAdminRole(actor.role)) throw new ServiceError('Only administrators can review vendor location requests.', 403, 'FORBIDDEN');
  const reason = reasonValue === undefined || reasonValue === null ? null : String(reasonValue).trim();
  if (decision === 'rejected' && !reason) throw new ValidationError('A rejection reason is required.');
  const timestamp = nowSql();
  return transaction(async (connection) => {
    const repository = new VendorLocationRepository(connection);
    const request = await repository.lockRequest(requestId);
    if (request.status !== 'pending') throw new ConflictError('This location request has already been decided.');
    const vendor = await repository.lockVendor(request.vendor_id);
    if (decision === 'approved') {
      await repository.updateLocation(request.vendor_id, request.proposed_latitude, request.proposed_longitude, actor.userId, timestamp);
    }
    await repository.markRequest(requestId, decision, actor.userId, reason);
    const journal = new TransactionJournalRepository(connection);
    await journal.create({ transaction_id: requestId, timestamp, endpoint: '/vendors/location/requests', stage: decision, status: 'success', payload: { action: `location_request_${decision}`, request_id: requestId, vendor_id: request.vendor_id, old_latitude: vendor.location_latitude, old_longitude: vendor.location_longitude, proposed_latitude: request.proposed_latitude, proposed_longitude: request.proposed_longitude, reason }, completed: true, actor: actor.userId, error_message: null, duration_ms: 0 });
    return { ...request, status: decision, reviewed_by: actor.userId, reviewed_at: timestamp, decision_reason: reason };
  });
}

export function approveVendorLocationRequest(requestId: string, actor: { userId: string; role?: string }) {
  return decideRequest(requestId, actor, 'approved');
}

export function rejectVendorLocationRequest(requestId: string, actor: { userId: string; role?: string }, reason?: unknown) {
  return decideRequest(requestId, actor, 'rejected', reason);
}
