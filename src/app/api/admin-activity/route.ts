import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/db';
import { getVerifiedSession, unauthorizedResponse, forbiddenResponse } from '@/lib/session';
import { isAdminOrSupervisorRole } from '@/lib/authorization';

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

function mapRow(row: any) {
  return {
    admin_stock_movement_id: String(row.admin_stock_movement_id),
    operation_id: String(row.operation_id),
    movement_type: String(row.movement_type),
    product_id: String(row.product_id),
    product_name: row.product_name ?? '',
    source_vendor_id: row.source_vendor_id ?? null,
    source_vendor_name: row.source_vendor_name ?? null,
    destination_vendor_id: row.destination_vendor_id ?? null,
    destination_vendor_name: row.destination_vendor_name ?? null,
    vendor_id: row.vendor_id ?? null,
    vendor_name: row.vendor_name ?? null,
    quantity: Number(row.quantity) || 0,
    admin_id: String(row.admin_id),
    admin_name: row.admin_name ?? row.admin_username ?? row.admin_id,
    notes: row.notes ?? '',
    timestamp: formatDateTimeValue(row.timestamp),
    created_at: formatDateTimeValue(row.created_at),
    reversal_visit_id: row.reversal_visit_id ?? null,
    original_visit_timestamp: formatDateTimeValue(row.original_visit_timestamp),
    original_visit_date: formatDateValue(row.original_visit_date),
    original_sales_rep_id: row.original_sales_rep_id ?? null,
    original_sales_rep_name: row.original_sales_rep_name ?? null,
    original_actor: row.original_actor ?? null,
    reversal_reason: row.reversal_reason ?? null,
    status: row.status ?? null,
    action_type: row.action_type ?? null,
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
    const filters: string[] = [];
    const params: Record<string, unknown> = {};

    const startDate = query.get('startDate');
    const endDate = query.get('endDate');
    const actionType = query.get('actionType');
    const adminId = query.get('adminId');
    const vendorId = query.get('vendorId');
    const productId = query.get('productId');
    const search = query.get('search');

    if (startDate) {
      filters.push('a.timestamp >= :startDate');
      params.startDate = `${startDate} 00:00:00`;
    }
    if (endDate) {
      filters.push('a.timestamp <= :endDate');
      params.endDate = `${endDate} 23:59:59`;
    }
    if (actionType) {
      filters.push("CASE WHEN vl.reversal_operation_id IS NOT NULL THEN 'reversal' ELSE a.movement_type END = :actionType");
      params.actionType = actionType;
    }
    if (adminId) {
      filters.push('a.admin_id = :adminId');
      params.adminId = adminId;
    }
    if (vendorId) {
      filters.push('(a.source_vendor_id = :vendorId OR a.destination_vendor_id = :vendorId OR vl.vendor_id = :vendorId)');
      params.vendorId = vendorId;
    }
    if (productId) {
      filters.push('a.product_id = :productId');
      params.productId = productId;
    }
    if (search) {
      filters.push(`(
        a.operation_id LIKE :search OR
        p.product_name LIKE :search OR
        au.name LIKE :search OR
        au.username LIKE :search OR
        sv.vendor_name LIKE :search OR
        dv.vendor_name LIKE :search OR
        vv.vendor_name LIKE :search
      )`);
      params.search = `%${search}%`;
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const sql = `
      SELECT
        a.*,
        p.product_name,
        au.name AS admin_name,
        au.username AS admin_username,
        sv.vendor_name AS source_vendor_name,
        dv.vendor_name AS destination_vendor_name,
        ov.vendor_name AS vendor_name,
        vl.visit_id AS reversal_visit_id,
        vl.timestamp AS original_visit_timestamp,
        vl.date AS original_visit_date,
        vl.sales_rep_id AS original_sales_rep_id,
        COALESCE(au2.name, au2.username, sr.name) AS original_actor,
        vl.reversal_reason,
        CASE WHEN vl.reversal_operation_id IS NOT NULL THEN 'reversal' ELSE a.movement_type END AS action_type,
        CASE WHEN vl.reversal_operation_id IS NOT NULL THEN 'Reversed' ELSE NULL END AS status
      FROM admin_stock_movements a
      LEFT JOIN products p ON p.product_id = a.product_id
      LEFT JOIN vendors sv ON sv.vendor_id = a.source_vendor_id
      LEFT JOIN vendors dv ON dv.vendor_id = a.destination_vendor_id
      LEFT JOIN visit_logs vl ON vl.reversal_operation_id = a.operation_id
      LEFT JOIN vendors ov ON ov.vendor_id = vl.vendor_id
      LEFT JOIN app_users au ON au.user_id = a.admin_id
      LEFT JOIN app_users au2 ON au2.user_id = vl.reversed_by
      LEFT JOIN sales_reps sr ON sr.sales_rep_id = vl.sales_rep_id
      ${whereClause}
      ORDER BY a.timestamp DESC, a.created_at DESC
    `;

    const [rows] = await dbQuery<any[]>(sql, params);
    const data = rows.map(mapRow);
    return NextResponse.json({ status: 'success', data });
  } catch (error: unknown) {
    return NextResponse.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
