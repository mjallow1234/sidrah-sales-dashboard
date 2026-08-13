import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminOrSupervisorRole } from '@/lib/authorization';
import { query as dbQuery } from '@/lib/db';
import type { Product } from '@/lib/types';

const GAS_API_URL = process.env.GAS_API_URL;
const GAS_API_KEY = process.env.GAS_API_KEY;

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

function getIdFromUrl(request: Request) {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  return pathSegments[pathSegments.length - 1] || '';
}

function ensureBaseUrl() {
  if (!GAS_API_URL) {
    throw new Error('GAS_API_URL is not configured.');
  }
  return GAS_API_URL.replace(/\/+$/, '');
}

function makeUrl(path: string) {
  const base = ensureBaseUrl();
  const keyParam = GAS_API_KEY ? `&api_key=${encodeURIComponent(GAS_API_KEY)}` : '';
  return `${base}?path=${encodeURIComponent(path.replace(/^[\/#]+/, ''))}${keyParam}`;
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const id = getIdFromUrl(request);
    const [rows] = await dbQuery<any[]>(
      'SELECT product_id, sku, product_name, category, unit, default_unit_price, currency, low_stock_threshold, active, date_created, last_updated, created_by, updated_by FROM products WHERE product_id = ? LIMIT 1',
      [id],
    );

    if (rows.length === 0) {
      return Response.json({ status: 'error', message: 'Product not found.' }, { status: 404 });
    }

    return Response.json({ status: 'success', data: mapProductRow(rows[0]) });
  } catch (error: unknown) {
    if (error instanceof Error && (error as any).statusCode) {
      return Response.json({ status: 'error', message: error.message }, { status: (error as any).statusCode });
    }
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
  const url = makeUrl(`/product/${encodeURIComponent(id)}`);
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  return new Response(text, { status: response.status, headers: { 'Content-Type': 'application/json' } });
}
