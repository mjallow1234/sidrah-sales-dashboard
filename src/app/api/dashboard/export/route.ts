import type { NextRequest } from 'next/server';
import { query as dbQuery } from '@/lib/db';
import { getVerifiedSession, unauthorizedResponse } from '@/lib/session';

function formatDateValue(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value === null || value === undefined ? '' : String(value);
}

function formatDateTimeValue(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value === null || value === undefined ? '' : String(value);
}

function escapeCsv(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  const text = String(value);
  if (text.includes('"') || text.includes(',') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function mapVisitLogRow(row: any) {
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
    payment_reference: row.payment_reference === null ? '' : String(row.payment_reference),
    client_transaction_id: row.client_transaction_id === null ? '' : String(row.client_transaction_id),
    latitude: row.latitude === null ? '' : Number(row.latitude),
    longitude: row.longitude === null ? '' : Number(row.longitude),
    notes: row.notes === null ? '' : String(row.notes),
    created_by: row.created_by === null ? '' : String(row.created_by),
    updated_by: row.updated_by === null ? '' : String(row.updated_by),
  };
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }

  if (session.role === 'agent') {
    return new Response(JSON.stringify({ error: 'Export not allowed for agent users.' }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  try {
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

    const joinClause = market ? 'INNER JOIN vendors v ON v.vendor_id = vl.vendor_id' : '';
    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const sql = `SELECT vl.* FROM visit_logs vl ${joinClause} ${whereClause} ORDER BY vl.date DESC, vl.timestamp DESC`;
    const [rows] = await dbQuery<any[]>(sql, params);

    const header = [
      'visit_id',
      'timestamp',
      'date',
      'vendor_id',
      'product_id',
      'sales_rep_id',
      'opening_stock',
      'stock_sold',
      'stock_added',
      'cash_collected',
      'expected_cash',
      'unit_price',
      'closing_stock',
      'payment_method',
      'payment_reference',
      'client_transaction_id',
      'latitude',
      'longitude',
      'notes',
      'created_by',
      'updated_by',
    ];

    const csvRows = rows.map(mapVisitLogRow).map((row) =>
      [
        row.visit_id,
        row.timestamp,
        row.date,
        row.vendor_id,
        row.product_id,
        row.sales_rep_id,
        row.opening_stock,
        row.stock_sold,
        row.stock_added,
        row.cash_collected,
        row.expected_cash,
        row.unit_price,
        row.closing_stock,
        row.payment_method,
        row.payment_reference,
        row.client_transaction_id,
        row.latitude,
        row.longitude,
        row.notes,
        row.created_by,
        row.updated_by,
      ].map(escapeCsv).join(',')
    );

    const csv = [header.join(','), ...csvRows].join('\n');
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="dashboard-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
