import type { NextRequest } from 'next/server';
import { query as dbQuery } from '@/lib/db';
import type { VendorBalance } from '@/lib/types';

function formatDateValue(value: unknown): string {
  if (value instanceof Date) {
    return Number.isNaN(value.valueOf()) ? '' : value.toISOString().split('T')[0];
  }
  if (value === null || value === undefined) {
    return '';
  }
  const text = String(value).trim();
  return ['0000-00-00', '0000-00-00 00:00:00', '1899-11-30', '1899-11-30T00:00:00.000Z'].includes(text)
    ? ''
    : text;
}

function formatDateTimeValue(value: unknown): string {
  if (value instanceof Date) {
    return Number.isNaN(value.valueOf()) ? '' : value.toISOString();
  }
  if (value === null || value === undefined) {
    return '';
  }
  const text = String(value).trim();
  return ['0000-00-00', '0000-00-00 00:00:00', '1899-11-30', '1899-11-30T00:00:00.000Z'].includes(text)
    ? ''
    : text;
}

function mapVendorBalanceRow(row: any): VendorBalance {
  return {
    vendor_id: String(row.vendor_id),
    total_expected_cash: Number(row.total_expected_cash) || 0,
    cash_collected: Number(row.cash_collected) || 0,
    balance_owed: Number(row.balance_owed) || 0,
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

    if (vendorId) {
      filters.push('vendor_id = :vendor_id');
      params.vendor_id = vendorId;
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const sql = `SELECT vendor_id, total_expected_cash, cash_collected, balance_owed, date_created, last_updated FROM vendor_balances ${whereClause} ORDER BY vendor_id ASC`;
    const [rows] = await dbQuery<any[]>(sql, params);

    return Response.json({ status: 'success', data: rows.map(mapVendorBalanceRow) });
  } catch (error: unknown) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
