import type { NextRequest } from 'next/server';
import { query as dbQuery } from '@/lib/db';
import type { VendorInventory } from '@/lib/types';

function isInvalidDate(value: Date | string): boolean {
  if (typeof value === 'string') {
    const text = value.trim();
    return [
      '0000-00-00',
      '0000-00-00 00:00:00',
      '1899-11-30',
      '1899-11-30T00:00:00.000Z',
    ].includes(text);
  }

  if (Number.isNaN(value.valueOf())) {
    return true;
  }

  return (
    value.getUTCFullYear() === 1899 &&
    value.getUTCMonth() === 10 &&
    value.getUTCDate() === 30
  );
}

function formatDateValue(value: unknown): string {
  if (value instanceof Date) {
    return isInvalidDate(value) ? '' : value.toISOString().split('T')[0];
  }
  if (value === null || value === undefined) {
    return '';
  }
  const text = String(value).trim();
  return isInvalidDate(text) ? '' : text;
}

function formatDateTimeValue(value: unknown): string {
  if (value instanceof Date) {
    return isInvalidDate(value) ? '' : value.toISOString();
  }
  if (value === null || value === undefined) {
    return '';
  }
  const text = String(value).trim();
  return isInvalidDate(text) ? '' : text;
}

function mapVendorInventoryRow(row: any): VendorInventory {
  return {
    vendor_inventory_id: String(row.vendor_inventory_id),
    vendor_id: String(row.vendor_id),
    product_id: String(row.product_id),
    current_stock: Number(row.current_stock) || 0,
    total_stock_received: Number(row.total_stock_received) || 0,
    total_stock_sold: Number(row.total_stock_sold) || 0,
    created_at: formatDateValue(row.created_at),
    updated_at: formatDateTimeValue(row.updated_at),
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
    const sql = `SELECT vendor_inventory_id, vendor_id, product_id, current_stock, total_stock_received, total_stock_sold, created_at, updated_at FROM vendor_inventory ${whereClause} ORDER BY vendor_id ASC, product_id ASC`;
    const [rows] = await dbQuery<any[]>(sql, params);

    return Response.json({ status: 'success', data: rows.map(mapVendorInventoryRow) });
  } catch (error: unknown) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
