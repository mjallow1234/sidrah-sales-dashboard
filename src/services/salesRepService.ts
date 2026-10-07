import { getPool, transaction } from '@/lib/db';
import type { SalesRep } from '@/lib/types';
import { SalesRepRepository } from '@/repositories/SalesRepRepository';
import type { RepositoryDbClient } from '@/repositories/types';
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

export async function getNextSequentialSalesRepId(db: RepositoryDbClient): Promise<string> {
  const [rows] = await db.execute<any[]>(
    `SELECT sales_rep_id
     FROM sales_reps
     WHERE sales_rep_id REGEXP '^SR[0-9]+$'
     FOR UPDATE`,
  );

  let nextNumber = rows.reduce((highest: number, row: any) => {
    const match = /^SR(\d+)$/.exec(String(row.sales_rep_id ?? ''));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0) + 1;

  while (true) {
    const candidate = `SR${String(nextNumber).padStart(3, '0')}`;
    const [existing] = await db.execute<any[]>('SELECT sales_rep_id FROM sales_reps WHERE sales_rep_id = ? LIMIT 1', [candidate]);
    if (existing.length === 0) return candidate;
    nextNumber += 1;
  }
}

export async function createSalesRepInTransaction(db: RepositoryDbClient, payload: Record<string, unknown>): Promise<SalesRep> {
  validateSalesRepPayload(payload);

  const salesRepId = await getNextSequentialSalesRepId(db);
  const now = new Date();
  const nowDate = now.toISOString().slice(0, 10);
  const nowDateTime = now.toISOString();

  return new SalesRepRepository(db).create({
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

export async function createSalesRep(payload: Record<string, unknown>): Promise<SalesRep> {
  return transaction((connection) => createSalesRepInTransaction(connection, payload));
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
