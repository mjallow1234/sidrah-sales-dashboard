import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminOrSupervisorRole } from '@/lib/authorization';
import { query as dbQuery } from '@/lib/db';
import type { Product } from '@/lib/types';
import { createProduct } from '@/services/productService';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
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

function mapProductRow(row: any): Product {
  return {
    product_id: String(row.product_id),
    sku: String(row.sku),
    product_name: String(row.product_name),
    category: String(row.category),
    unit: String(row.unit),
    default_unit_price: Number(row.default_unit_price),
    currency: String(row.currency),
    low_stock_threshold: Number(row.low_stock_threshold),
    active: Boolean(row.active === 1 || row.active === true || String(row.active).toLowerCase() === 'true'),
    date_created: formatDateValue(row.date_created),
    last_updated: formatDateTimeValue(row.last_updated),
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
    const activeParam = query.get('active');
    const category = query.get('category') || undefined;
    const page = parsePositiveInt(query.get('page'), 1);
    const pageSize = Math.min(parsePositiveInt(query.get('pageSize'), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

    const filters: string[] = [];
    const params: Record<string, unknown> = {};

    if (activeParam !== null && activeParam !== undefined && activeParam !== '') {
      const normalizedActive = String(activeParam).trim().toLowerCase();
      if (normalizedActive === 'true' || normalizedActive === '1') {
        filters.push('active = :active');
        params.active = 1;
      } else if (normalizedActive === 'false' || normalizedActive === '0') {
        filters.push('active = :active');
        params.active = 0;
      } else {
        filters.push('LOWER(CAST(active AS CHAR)) = :active_text');
        params.active_text = normalizedActive;
      }
    }

    if (category) {
      filters.push('category = :category');
      params.category = category;
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;

    const countSql = `SELECT COUNT(*) AS total FROM products ${whereClause}`;
    const listSql = `SELECT product_id, sku, product_name, category, unit, default_unit_price, currency, low_stock_threshold, active, date_created, last_updated, created_by, updated_by FROM products ${whereClause} ORDER BY product_name ASC LIMIT :limit OFFSET :offset`;

    const [countRows] = await dbQuery<{ total: number }[]>(countSql, params);
    const totalCount = countRows.length > 0 ? Number(countRows[0].total) : 0;

    const [rows] = await dbQuery<any[]>(listSql, { ...params, limit: pageSize, offset });
    const items = rows.map(mapProductRow);

    return Response.json({ status: 'success', data: { totalCount, page, pageSize, items } });
  } catch (error: unknown) {
    if (error instanceof Error && (error as any).statusCode) {
      return Response.json({ status: 'error', message: error.message }, { status: (error as any).statusCode });
    }
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }

  if (!isAdminOrSupervisorRole(session.role)) {
    return forbiddenResponse();
  }

  try {
    const payload = await request.json();
    const product = await createProduct(payload);
    return Response.json({ status: 'success', data: product });
  } catch (error: unknown) {
    if (error instanceof Error && (error as any).statusCode) {
      return Response.json({ status: 'error', message: error.message }, { status: (error as any).statusCode });
    }
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
