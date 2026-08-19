import type { AppUser } from '@/lib/types';
import { getPool } from '@/lib/db';
import { AppUserRepository } from '@/repositories/AppUserRepository';
import { ValidationError, NotFoundError } from './errors';

type AppUserServiceResult = {
  status: number;
  ok: boolean;
  payload: unknown;
  text: string;
};

function normalizePhone(value: unknown) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function normalizeRole(value: unknown): AppUser['role'] | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized === '') {
    return undefined;
  }

  if (['super_admin', 'admin', 'supervisor', 'agent'].includes(normalized)) {
    return normalized as AppUser['role'];
  }

  return undefined;
}

function normalizeStatus(value: unknown): AppUser['status'] | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized === '') {
    return undefined;
  }

  if (['active', 'inactive', 'suspended'].includes(normalized)) {
    return normalized as AppUser['status'];
  }

  return undefined;
}

function formatSqlDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function formatSqlDateTime(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function formatResult(status: number, payload: unknown): AppUserServiceResult {
  return {
    status,
    ok: status >= 200 && status < 300,
    payload,
    text: typeof payload === 'string' ? payload : JSON.stringify(payload),
  };
}

function validateAppUserPayload(payload: Record<string, unknown>, isUpdate = false) {
  const requiredFields = ['email', 'phone', 'name', 'role', 'status'];
  if (!isUpdate) {
    const missing = requiredFields.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === '');
    if (missing.length > 0) {
      throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  if (payload.username !== undefined && typeof payload.username !== 'string') {
    throw new ValidationError('username must be a string.');
  }
  if (payload.email !== undefined && typeof payload.email !== 'string') {
    throw new ValidationError('email must be a string.');
  }
  if (payload.phone !== undefined && typeof payload.phone !== 'string') {
    throw new ValidationError('phone must be a string.');
  }
  if (payload.name !== undefined && typeof payload.name !== 'string') {
    throw new ValidationError('name must be a string.');
  }
  if (payload.role !== undefined && typeof payload.role !== 'string') {
    throw new ValidationError('role must be a string.');
  }
  if (payload.status !== undefined && typeof payload.status !== 'string') {
    throw new ValidationError('status must be a string.');
  }
}

export async function fetchAppUsers(): Promise<AppUser[]> {
  const repository = new AppUserRepository(getPool());
  return repository.findAll();
}

export async function fetchAppUserByPhone(phone: string): Promise<AppUser | null> {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return null;
  }

  const repository = new AppUserRepository(getPool());
  return repository.findByPhone(normalizedPhone);
}

export async function fetchAppUserById(id: string): Promise<AppUserServiceResult> {
  try {
    const repository = new AppUserRepository(getPool());
    const user = await repository.findById(id);
    return formatResult(200, { status: 'success', data: user });
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      return formatResult(404, { status: 'error', message: error.message });
    }
    return formatResult(500, { status: 'error', message: error instanceof Error ? error.message : String(error) });
  }
}

export async function createAppUser(payload: Record<string, unknown>): Promise<AppUserServiceResult> {
  try {
    validateAppUserPayload(payload);
    const now = new Date();
    const repository = new AppUserRepository(getPool());
    const userId = String(payload.user_id ?? `U_${now.getTime()}`);

    const defaultUsername = String(payload.username ?? payload.email ?? payload.phone ?? `U_${now.getTime()}`);
    const user = await repository.create({
      user_id: userId,
      username: defaultUsername,
      email: String(payload.email ?? ''),
      phone: String(payload.phone ?? ''),
      name: String(payload.name ?? ''),
      role: normalizeRole(payload.role) ?? 'agent',
      status: normalizeStatus(payload.status) ?? 'active',
      sales_rep_id: payload.sales_rep_id === undefined ? undefined : payload.sales_rep_id === null ? null : String(payload.sales_rep_id),
      password_hash: String(payload.password_hash ?? ''),
      password_reset_required: payload.password_reset_required === 'true' || payload.password_reset_required === '1' || payload.password_reset_required === true,
      is_system_user: payload.is_system_user === 'true' || payload.is_system_user === '1' || payload.is_system_user === true,
      failed_login_count: Number(payload.failed_login_count ?? 0),
      last_login: formatSqlDateTime(payload.last_login),
      last_failed_login: formatSqlDateTime(payload.last_failed_login),
      lockout_until: formatSqlDateTime(payload.lockout_until),
      version: Number(payload.version ?? 1),
      created_by: payload.created_by === undefined ? undefined : String(payload.created_by),
      updated_by: payload.updated_by === undefined ? undefined : String(payload.updated_by),
      date_created: formatSqlDate(payload.date_created ?? now) ?? now.toISOString().slice(0, 10),
      last_updated: formatSqlDateTime(payload.last_updated ?? now) ?? now.toISOString().slice(0, 19).replace('T', ' '),
    });

    return formatResult(201, { status: 'success', data: user });
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return formatResult(400, { status: 'error', message: error.message });
    }
    return formatResult(500, { status: 'error', message: error instanceof Error ? error.message : String(error) });
  }
}

export async function updateAppUser(id: string, payload: Record<string, unknown>): Promise<AppUserServiceResult> {
  try {
    validateAppUserPayload(payload, true);
    const repository = new AppUserRepository(getPool());
    const updates: Record<string, unknown> = {};

    if (payload.username !== undefined) updates.username = String(payload.username);
    if (payload.email !== undefined) updates.email = String(payload.email);
    if (payload.phone !== undefined) updates.phone = String(payload.phone);
    if (payload.name !== undefined) updates.name = String(payload.name);
    if (payload.role !== undefined) updates.role = String(payload.role);
    if (payload.status !== undefined) updates.status = String(payload.status);
    if (payload.sales_rep_id !== undefined) {
      updates.sales_rep_id = payload.sales_rep_id === null ? null : String(payload.sales_rep_id);
    }
    if (payload.password_hash !== undefined) updates.password_hash = String(payload.password_hash);
    if (payload.password_reset_required !== undefined) {
      updates.password_reset_required = payload.password_reset_required === 'true' || payload.password_reset_required === '1' || payload.password_reset_required === true;
    }
    if (payload.is_system_user !== undefined) {
      updates.is_system_user = payload.is_system_user === 'true' || payload.is_system_user === '1' || payload.is_system_user === true;
    }
    if (payload.failed_login_count !== undefined) updates.failed_login_count = Number(payload.failed_login_count);
    if (payload.last_login !== undefined) updates.last_login = payload.last_login === null ? null : formatSqlDateTime(payload.last_login);
    if (payload.last_failed_login !== undefined) updates.last_failed_login = payload.last_failed_login === null ? null : formatSqlDateTime(payload.last_failed_login);
    if (payload.lockout_until !== undefined) updates.lockout_until = payload.lockout_until === null ? null : formatSqlDateTime(payload.lockout_until);
    if (payload.version !== undefined) updates.version = Number(payload.version);
    if (payload.updated_by !== undefined) updates.updated_by = payload.updated_by === null ? null : String(payload.updated_by);
    updates.last_updated = formatSqlDateTime(new Date());

    const user = await repository.update(id, updates as any);
    return formatResult(200, { status: 'success', data: user });
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return formatResult(400, { status: 'error', message: error.message });
    }
    if (error instanceof NotFoundError) {
      return formatResult(404, { status: 'error', message: error.message });
    }
    return formatResult(500, { status: 'error', message: error instanceof Error ? error.message : String(error) });
  }
}
