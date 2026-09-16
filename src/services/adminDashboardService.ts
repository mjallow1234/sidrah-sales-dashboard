import { getPool } from '@/lib/db';
import type { AdminDashboardFilters, AdminDashboardSummary } from '@/lib/types/admin-dashboard';
import { AdminDashboardRepository } from '@/repositories/AdminDashboardRepository';
import { ValidationError } from './errors';

export interface AdminDashboardFilterInput {
  startDate?: string | null;
  endDate?: string | null;
  productId?: string | null;
  location?: string | null;
  salesRepId?: string | null;
}

function formatDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function defaultStartDate(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 29);
  return formatDate(date);
}

function today(): string {
  return formatDate(new Date());
}

function validateDate(value: string, name: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${name} must be a valid date in YYYY-MM-DD format.`);
  }
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new ValidationError(`${name} must be a valid calendar date.`);
  }
  return value;
}

function optionalText(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function normalizeAdminDashboardFilters(input: AdminDashboardFilterInput): AdminDashboardFilters {
  const startDate = validateDate(input.startDate?.trim() || defaultStartDate(), 'startDate');
  const endDate = validateDate(input.endDate?.trim() || today(), 'endDate');
  if (startDate > endDate) {
    throw new ValidationError('startDate must be before or equal to endDate.');
  }

  return {
    startDate,
    endDate,
    productId: optionalText(input.productId),
    location: optionalText(input.location),
    salesRepId: optionalText(input.salesRepId),
  };
}

export async function getAdminDashboardSummary(input: AdminDashboardFilterInput): Promise<AdminDashboardSummary> {
  const filters = normalizeAdminDashboardFilters(input);
  return new AdminDashboardRepository(getPool()).getSummary(filters);
}
