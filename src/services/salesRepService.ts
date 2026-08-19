import { randomUUID } from 'crypto';
import { getPool } from '@/lib/db';
import type { SalesRep } from '@/lib/types';
import { SalesRepRepository } from '@/repositories/SalesRepRepository';
import { ValidationError } from './errors';

function normalizeBoolean(value: unknown): boolean {
  if (value === undefined || value === null || value === '') {
    return false;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1';
}

function validateSalesRepPayload(payload: Record<string, unknown>, isUpdate = false) {
  if (!isUpdate) {
    const required = ['full_name', 'phone'];
    const missing = required.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === '');
    if (missing.length > 0) {
      throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  if (payload.full_name !== undefined && typeof payload.full_name !== 'string') {
    throw new ValidationError('full_name must be a string.');
  }
  if (payload.phone !== undefined && typeof payload.phone !== 'string') {
    throw new ValidationError('phone must be a string.');
  }
  if (payload.status !== undefined && typeof payload.status !== 'string') {
    throw new ValidationError('status must be a string.');
  }
  if (payload.role !== undefined && typeof payload.role !== 'string') {
    throw new ValidationError('role must be a string.');
  }
}

export async function createSalesRep(payload: Record<string, unknown>): Promise<SalesRep> {
  validateSalesRepPayload(payload);

  const repository = new SalesRepRepository(getPool());
  const salesRepId = `SR_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const now = new Date();
  const nowDate = now.toISOString().slice(0, 10);
  const nowDateTime = now.toISOString();

  return repository.create({
    sales_rep_id: salesRepId,
    name: String(payload.full_name),
    phone: String(payload.phone),
    role: typeof payload.role === 'string' && payload.role !== '' ? payload.role : 'agent',
    status: typeof payload.status === 'string' && payload.status !== '' ? payload.status : 'active',
    is_active: true,
    date_created: nowDate,
    last_updated: nowDateTime,
    version: 1,
    created_by: typeof payload.created_by === 'string' ? payload.created_by : undefined,
    updated_by: typeof payload.updated_by === 'string' ? payload.updated_by : undefined,
  });
}

export async function updateSalesRep(salesRepId: string, payload: Record<string, unknown>): Promise<SalesRep> {
  validateSalesRepPayload(payload, true);

  const repository = new SalesRepRepository(getPool());
  const updates: Record<string, unknown> = {};

  if (payload.full_name !== undefined) {
    updates.name = String(payload.full_name);
  }
  if (payload.phone !== undefined) {
    updates.phone = String(payload.phone);
  }
  if (payload.role !== undefined) {
    updates.role = String(payload.role);
  }
  if (payload.status !== undefined) {
    updates.status = String(payload.status);
  }
  if (payload.is_active !== undefined) {
    updates.is_active = normalizeBoolean(payload.is_active);
  }
  if (payload.updated_by !== undefined) {
    updates.updated_by = payload.updated_by === null ? null : String(payload.updated_by);
  }

  updates.last_updated = new Date().toISOString();

  return repository.update(salesRepId, updates as any);
}
