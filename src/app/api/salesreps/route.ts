import type { NextRequest } from 'next/server';
import { query as dbQuery } from '@/lib/db';
import type { SalesRep } from '@/lib/types';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminOrSupervisorRole } from '@/lib/authorization';
import { createSalesRep } from '@/services/salesRepService';

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

function mapSalesRepRow(row: any): SalesRep {
  return {
    sales_rep_id: String(row.sales_rep_id),
    name: String(row.name),
    phone: String(row.phone),
    role: String(row.role),
    status: String(row.status) as SalesRep['status'],
    date_created: formatDateValue(row.date_created),
    last_updated: formatDateTimeValue(row.last_updated),
  };
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }
  if (!isAdminOrSupervisorRole(session.role)) {
    return forbiddenResponse();
  }

  try {
    const query = request.nextUrl.searchParams;
    const status = query.get('status');
    const page = parsePositiveInt(query.get('page'));
    const pageSize = parsePositiveInt(query.get('pageSize'));
    const whereClause = status ? 'WHERE status = :status' : '';
    const params: Record<string, unknown> = {};
    if (status) {
      params.status = status;
    }

    const baseSql = `SELECT sales_rep_id, name, phone, role, status, date_created, last_updated FROM sales_reps ${whereClause} ORDER BY name ASC`;
    if (page !== undefined && pageSize !== undefined) {
      params.limit = pageSize;
      params.offset = (page - 1) * pageSize;
      const countSql = `SELECT COUNT(*) AS total FROM sales_reps ${whereClause}`;
      const [countRows] = await dbQuery<{ total: number }[]>(countSql, params);
      const total = countRows.length > 0 ? Number(countRows[0].total) : 0;
      const [rows] = await dbQuery<any[]>(`${baseSql} LIMIT :limit OFFSET :offset`, params);
      return Response.json({ status: 'success', data: { items: rows.map(mapSalesRepRow), totalCount: total, page, pageSize } });
    }

    const [rows] = await dbQuery<any[]>(baseSql, params);
    return Response.json({ status: 'success', data: rows.map(mapSalesRepRow) });
  } catch (error: unknown) {
    return Response.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getVerifiedSession(request as NextRequest);
  if (!session) {
    return unauthorizedResponse();
  }
  if (!isAdminOrSupervisorRole(session.role)) {
    return forbiddenResponse();
  }

  try {
    const payload = await request.json();
    const result = await createSalesRep({
      ...payload,
      created_by: session.userId,
      updated_by: session.userId,
    });
    return Response.json({ status: 'success', data: result }, { status: 201 });
  } catch (error: unknown) {
    return Response.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
