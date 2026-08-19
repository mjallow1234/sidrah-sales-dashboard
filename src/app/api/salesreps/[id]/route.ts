import type { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import type { SalesRep } from '@/lib/types';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminOrSupervisorRole } from '@/lib/authorization';
import { updateSalesRep } from '@/services/salesRepService';

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
  if (!isAdminOrSupervisorRole(session.role)) {
    return forbiddenResponse();
  }

  try {
    const id = getIdFromUrl(request);
    const [rows] = await getPool().query<any[]>('SELECT sales_rep_id, name, phone, role, status, date_created, last_updated FROM sales_reps WHERE sales_rep_id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return Response.json({ status: 'error', message: 'SalesRep not found.' }, { status: 404 });
    }
    return Response.json({ status: 'success', data: mapSalesRepRow(rows[0]) });
  } catch (error: unknown) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }
  if (!isAdminOrSupervisorRole(session.role)) {
    return forbiddenResponse();
  }

  const id = getIdFromUrl(request);
  const payload = await request.json();

  try {
    const updated = await updateSalesRep(id, payload);
    return Response.json({ status: 'success', data: updated });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return Response.json({ status: 'error', message: error.message }, { status: 500 });
    }
    return Response.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}
