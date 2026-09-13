import type { NextRequest } from 'next/server';
import { query as dbQuery } from '@/lib/db';
import { getVerifiedSession, unauthorizedResponse, forbiddenResponse } from '@/lib/session';
import { isAgentRole, isAdminOrSupervisorRole } from '@/lib/authorization';

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

function mapVisitLogRow(row: any): Record<string, unknown> {
  return {
    visit_id: String(row.visit_id),
    timestamp: formatDateTimeValue(row.timestamp),
    date: formatDateValue(row.date),
    vendor_id: String(row.vendor_id),
    vendor_name: row.vendor_name === null ? undefined : String(row.vendor_name),
    product_id: String(row.product_id),
    product_name: row.product_name === null ? undefined : String(row.product_name),
    sales_rep_id: String(row.sales_rep_id),
    sales_rep_name: row.sales_rep_name === null ? undefined : String(row.sales_rep_name),
    opening_stock: Number(row.opening_stock) || 0,
    stock_sold: Number(row.stock_sold) || 0,
    stock_added: Number(row.stock_added) || 0,
    cash_collected: Number(row.cash_collected) || 0,
    expected_cash: Number(row.expected_cash) || 0,
    unit_price: Number(row.unit_price) || 0,
    closing_stock: Number(row.closing_stock) || 0,
    payment_method: row.payment_method === null ? '' : String(row.payment_method),
    payment_reference: row.payment_reference === null ? undefined : String(row.payment_reference),
    client_transaction_id: row.client_transaction_id === null ? undefined : String(row.client_transaction_id),
    latitude: row.latitude === null ? undefined : Number(row.latitude),
    longitude: row.longitude === null ? undefined : Number(row.longitude),
    notes: row.notes === null ? undefined : String(row.notes),
    created_by: row.created_by === null ? undefined : String(row.created_by),
    updated_by: row.updated_by === null ? undefined : String(row.updated_by),
    reversed_by: row.reversed_by === null ? undefined : String(row.reversed_by),
    reversed_by_name: row.reversed_by_name === null ? undefined : String(row.reversed_by_name),
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getVerifiedSession(request);
    const query = request.nextUrl.searchParams;
    const filters: string[] = [];
    const params: Record<string, unknown> = {};

    const vendorId = query.get('vendorId') || query.get('vendor_id');
    const salesRepId = query.get('salesRepId') || query.get('sales_rep_id');
    const productId = query.get('productId') || query.get('product_id');
    const paymentMethod = query.get('paymentMethod') || query.get('payment_method');
    const startDate = query.get('startDate');
    const endDate = query.get('endDate');
    const market = query.get('market');

    if (vendorId) {
      const [[vendorRow]] = await dbQuery<any[]>(
        'SELECT sales_rep_id FROM vendors WHERE vendor_id = ? LIMIT 1',
        [vendorId],
      );

      if (!vendorRow) {
        return Response.json({ status: 'success', data: [] });
      }

      const assignedSalesRepId = vendorRow.sales_rep_id as string | null;
      if (assignedSalesRepId) {
        if (!session) {
          return unauthorizedResponse();
        }

        if (!isAdminOrSupervisorRole(session.role) && !(isAgentRole(session.role) && session.sales_rep_id === assignedSalesRepId)) {
          return forbiddenResponse();
        }
      }

      filters.push('vl.vendor_id = :vendor_id');
      params.vendor_id = vendorId;
    }

    if (session && isAgentRole(session.role) && !vendorId) {
      if (session.sales_rep_id) {
        filters.push('vl.sales_rep_id = :session_sales_rep_id');
        params.session_sales_rep_id = session.sales_rep_id;
      }
    }

    if (vendorId) {
      filters.push('vl.vendor_id = :vendor_id');
      params.vendor_id = vendorId;
    }
    if (salesRepId) {
      filters.push('vl.sales_rep_id = :sales_rep_id');
      params.sales_rep_id = salesRepId;
    }
    if (productId) {
      filters.push('vl.product_id = :product_id');
      params.product_id = productId;
    }
    if (paymentMethod) {
      filters.push('vl.payment_method = :payment_method');
      params.payment_method = paymentMethod;
    }
    if (startDate) {
      filters.push('vl.date >= :startDate');
      params.startDate = startDate;
    }
    if (endDate) {
      filters.push('vl.date <= :endDate');
      params.endDate = endDate;
    }
    if (market) {
      filters.push('v.location = :market');
      params.market = market;
    }

    const joinClause = [
      'LEFT JOIN vendors vendor_info ON vendor_info.vendor_id = vl.vendor_id',
      'LEFT JOIN products product_info ON product_info.product_id = vl.product_id',
      'LEFT JOIN sales_reps sr ON sr.sales_rep_id = vl.sales_rep_id',
      'LEFT JOIN app_users reversal_user ON reversal_user.user_id = vl.reversed_by',
      market ? 'INNER JOIN vendors v ON v.vendor_id = vl.vendor_id' : '',
    ].filter(Boolean).join(' ');
    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const sql = `SELECT vl.*, vendor_info.vendor_name AS vendor_name, product_info.product_name AS product_name, sr.name AS sales_rep_name, COALESCE(reversal_user.name, reversal_user.username) AS reversed_by_name FROM visit_logs vl ${joinClause} ${whereClause} ORDER BY vl.date DESC, vl.timestamp DESC`;
    const [rows] = await dbQuery<any[]>(sql, params);

    return Response.json({ status: 'success', data: rows.map(mapVisitLogRow) });
  } catch (error: unknown) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
