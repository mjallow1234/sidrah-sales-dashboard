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
    product_id: String(row.product_id),
    sales_rep_id: String(row.sales_rep_id),
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
  };
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
    let startDate = query.get('startDate');
    let endDate = query.get('endDate');

    const vendorId = query.get('vendorId') || query.get('vendor_id');
    const salesRepId = query.get('salesRepId') || query.get('sales_rep_id');
    const productId = query.get('productId') || query.get('product_id');
    const paymentMethod = query.get('paymentMethod') || query.get('payment_method');
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

    if (isAgentRole(session.role) && !vendorId) {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      if (!startDate && !endDate) {
        startDate = today;
        endDate = today;
      }
      if (session.sales_rep_id) {
        filters.push('vl.sales_rep_id = :session_sales_rep_id');
        params.session_sales_rep_id = session.sales_rep_id;
      }
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

    const joinClause = market ? 'INNER JOIN vendors v ON v.vendor_id = vl.vendor_id' : '';
    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const sql = `SELECT vl.* FROM visit_logs vl ${joinClause} ${whereClause} ORDER BY vl.date DESC, vl.timestamp DESC`;
    const [rows] = await dbQuery<any[]>(sql, params);

    return Response.json({ status: 'success', data: rows.map(mapVisitLogRow) });
  } catch (error: unknown) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
