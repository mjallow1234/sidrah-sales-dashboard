import type { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { updateVendor } from '@/services/vendorService';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAgentRole, isAdminOrSupervisorRole } from '@/lib/authorization';
import type { Vendor } from '@/lib/types';

function getIdFromUrl(request: NextRequest) {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  return pathSegments[pathSegments.length - 1] || '';
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
    assigned_date: row.assigned_date === null ? undefined : formatDateValue(row.assigned_date),
    assigned_by: row.assigned_by === null ? undefined : String(row.assigned_by),
    date_created: formatDateValue(row.date_created),
    last_updated: formatDateTimeValue(row.last_updated),
    status: String(row.status) as Vendor['status'],
    created_by: row.created_by === null ? undefined : String(row.created_by),
    updated_by: row.updated_by === null ? undefined : String(row.updated_by),
  };
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const id = getIdFromUrl(request);
    const [rows] = await getPool().query<any[]>(`SELECT v.vendor_id, v.vendor_name, v.phone, v.location, v.sales_rep_id, v.acquired_by, acquired_name.name AS acquired_by_name, v.vendor_type_id, vt.name AS vendor_type_name, v.assigned_date, v.assigned_by, v.date_created, v.last_updated, v.status, v.created_by, v.updated_by
      FROM vendors v LEFT JOIN acquired_by_names acquired_name ON acquired_name.acquired_by_id = v.acquired_by
      LEFT JOIN vendor_types vt ON vt.vendor_type_id = v.vendor_type_id
      WHERE v.vendor_id = ? LIMIT 1`, [id]);
    if (rows.length === 0) {
      return Response.json({ status: 'error', message: 'Vendor not found.' }, { status: 404 });
    }

    const vendor = rows[0];
    if (!isAdminOrSupervisorRole(session.role)) {
      if (isAgentRole(session.role)) {
        if (vendor.sales_rep_id !== null && vendor.sales_rep_id !== session.sales_rep_id) {
          return forbiddenResponse();
        }
      } else {
        return forbiddenResponse();
      }
    }

    return Response.json({ status: 'success', data: mapVendorRow(vendor) });
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

  try {
    const id = getIdFromUrl(request);
    const payload = await request.json();
    const vendor = await updateVendor(id, {
      ...payload,
      acquired_by_eligible: true,
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
