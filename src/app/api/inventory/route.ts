import type { NextRequest } from 'next/server';
import { query as dbQuery } from '@/lib/db';
import type { Inventory } from '@/lib/types';

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

function mapInventoryRow(row: any): Inventory {
  return {
    inventory_id: String(row.inventory_id),
    vendor_id: String(row.vendor_id),
    product_id: row.product_id === null ? undefined : String(row.product_id),
    total_stock_supplied: Number(row.total_stock_supplied) || 0,
    total_stock_sold: Number(row.total_stock_sold) || 0,
    current_stock: Number(row.current_stock) || 0,
    date_created: formatDateValue(row.date_created),
    last_updated: formatDateTimeValue(row.last_updated),
  };
}

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams;
    const filters: string[] = [];
    const params: Record<string, unknown> = {};

    const vendorId = query.get('vendorId') || query.get('vendor_id');
    const productId = query.get('productId') || query.get('product_id');

    if (vendorId) {
      filters.push('vendor_id = :vendor_id');
      params.vendor_id = vendorId;
    }
    if (productId) {
      filters.push('product_id = :product_id');
      params.product_id = productId;
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const sql = `SELECT inventory_id, vendor_id, product_id, total_stock_supplied, total_stock_sold, current_stock, date_created, last_updated FROM inventory ${whereClause} ORDER BY vendor_id ASC, product_id ASC`;
    const [rows] = await dbQuery<any[]>(sql, params);

    return Response.json({ status: 'success', data: rows.map(mapInventoryRow) });
  } catch (error: unknown) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
