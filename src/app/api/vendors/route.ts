import type { NextRequest } from 'next/server';
import { query as dbQuery } from '@/lib/db';
import { createVendor } from '@/services/vendorService';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAgentRole, isAdminOrSupervisorRole } from '@/lib/authorization';
import type { Vendor } from '@/lib/types';

function parsePositiveInt(value: string | null, fallback?: number): number | undefined {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function formatDateValue(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  return value === null || value === undefined ? '' : String(value);
}

function formatDateTimeValue(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value === null || value === undefined ? '' : String(value);
}

function mapVendorRow(row: any): Vendor {
  return {
    vendor_id: String(row.vendor_id),
    vendor_name: String(row.vendor_name),
    phone: String(row.phone),
    location: String(row.location),
    sales_rep: undefined,
    sales_rep_id: row.sales_rep_id === null ? undefined : String(row.sales_rep_id),
    acquired_by: row.acquired_by === null ? undefined : String(row.acquired_by),
    acquired_by_name: row.acquired_by_name === null || row.acquired_by_name === undefined ? undefined : String(row.acquired_by_name),
    vendor_type_id: row.vendor_type_id === null ? undefined : String(row.vendor_type_id),
    vendor_type_name: row.vendor_type_name === null || row.vendor_type_name === undefined ? undefined : String(row.vendor_type_name),
    status_name: row.status_name === null || row.status_name === undefined ? undefined : String(row.status_name),
    assigned_date: row.assigned_date === null ? undefined : formatDateValue(row.assigned_date),
    assigned_by: row.assigned_by === null ? undefined : String(row.assigned_by),
    date_created: formatDateValue(row.date_created),
    last_updated: formatDateTimeValue(row.last_updated),
    status: String(row.status) as Vendor['status'],
    created_by: row.created_by === null ? undefined : String(row.created_by),
    updated_by: row.updated_by === null ? undefined : String(row.updated_by),
  };
}

function getIdFromUrl(request: Request) {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  return pathSegments[pathSegments.length - 1] || '';
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const query = request.nextUrl.searchParams;
    const filters: string[] = [];
    const params: Record<string, unknown> = {};

    const salesRepId = query.get('salesRepId') || query.get('sales_rep_id');
    const status = query.get('status');
    const search = query.get('search');
    const page = parsePositiveInt(query.get('page'));
    const pageSize = parsePositiveInt(query.get('pageSize'));

    if (isAgentRole(session.role)) {
      if (session.sales_rep_id) {
        filters.push('(v.sales_rep_id IS NULL OR v.sales_rep_id = :session_sales_rep_id)');
        params.session_sales_rep_id = session.sales_rep_id;
      }
    } else if (salesRepId) {
      filters.push('v.sales_rep_id = :sales_rep_id');
      params.sales_rep_id = salesRepId;
    }

    if (status) {
      filters.push('v.status = :status');
      params.status = status;
    }

    if (search && String(search).trim() !== '') {
      const normalizedSearch = `%${String(search).trim()}%`;
      filters.push('(v.vendor_id LIKE :search OR v.vendor_name LIKE :search OR v.phone LIKE :search OR v.location LIKE :search)');
      params.search = normalizedSearch;
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const countSql = `SELECT COUNT(*) AS total FROM vendors v ${whereClause}`;
    const [countRows] = await dbQuery<{ total: number }[]>(countSql, params);
    const total = countRows.length > 0 ? Number(countRows[0].total) : 0;

    let sql = `SELECT v.vendor_id, v.vendor_name, v.phone, v.location, v.sales_rep_id, v.acquired_by, acquired_name.name AS acquired_by_name, v.vendor_type_id, vt.name AS vendor_type_name, v.assigned_date, v.assigned_by, v.date_created, v.last_updated, v.status, vs.name AS status_name, v.created_by, v.updated_by
      FROM vendors v LEFT JOIN acquired_by_names acquired_name ON acquired_name.acquired_by_id = v.acquired_by
      LEFT JOIN vendor_types vt ON vt.vendor_type_id = v.vendor_type_id
      LEFT JOIN vendor_statuses vs ON vs.status_id = v.status
      ${whereClause}
      ORDER BY v.vendor_id ASC`;

    if (page !== undefined && pageSize !== undefined) {
      params.limit = pageSize;
      params.offset = (page - 1) * pageSize;
      sql += ' LIMIT :limit OFFSET :offset';
    }

    const [rows] = await dbQuery<any[]>(sql, params);
    const items = rows.map(mapVendorRow);
    if (page !== undefined && pageSize !== undefined) {
      return Response.json({ status: 'success', data: { items, totalCount: total, page, pageSize } });
    }

    return Response.json({ status: 'success', data: items });
  } catch (error: unknown) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }
  if (!isAgentRole(session.role) && !isAdminOrSupervisorRole(session.role) && !isAdminOrSupervisorRole(session.role)) {
    return forbiddenResponse();
  }

  try {
    const payload = await request.json();
    if (isAgentRole(session.role) && payload.sales_rep_id) {
      return forbiddenResponse();
    }
    const vendor = await createVendor({
      ...payload,
      acquired_by: payload.acquired_by,
      acquired_by_eligible: true,
      assigned_by: payload.sales_rep_id ? session.userId || 'system' : payload.assigned_by,
      created_by: session.userId,
      updated_by: session.userId,
    });
    return Response.json({ status: 'success', data: vendor });
  } catch (error: unknown) {
    const status = error instanceof Error && 'statusCode' in error
      ? Number((error as { statusCode?: number }).statusCode) || 500
      : 500;
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status });
  }
}
