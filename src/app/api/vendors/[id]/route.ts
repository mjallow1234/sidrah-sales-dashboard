import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminOrSupervisorRole } from '@/lib/authorization';

const GAS_API_URL = process.env.GAS_API_URL;
const GAS_API_KEY = process.env.GAS_API_KEY;
const GAS_PROXY_KEY = process.env.GAS_PROXY_KEY;

function ensureBaseUrl() {
  if (!GAS_API_URL) {
    throw new Error('GAS_API_URL is not configured.');
  }
  return GAS_API_URL.replace(/\/+$/, '');
}

function makeUrl(path: string, query?: URLSearchParams) {
  const base = ensureBaseUrl();
  const keyParam = GAS_API_KEY ? `&api_key=${encodeURIComponent(GAS_API_KEY)}` : '';
  const normalizedPath = encodeURIComponent(path.replace(/^[\/\#]+/, ''));
  const queryString = query?.toString() ?? '';
  const queryParamString = queryString ? `&${queryString}` : '';
  return `${base}?path=${normalizedPath}${queryParamString}${keyParam}`;
}

function getIdFromUrl(request: NextRequest) {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  return pathSegments[pathSegments.length - 1] || '';
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }
  const id = getIdFromUrl(request);
  const queryParams = new URLSearchParams();
  queryParams.set('actor_role', session.role || '');
  queryParams.set('actor_sales_rep_id', session.sales_rep_id || '');
  if (session.userId) {
    queryParams.set('actor_user_id', session.userId);
  }
  if (GAS_PROXY_KEY) {
    queryParams.set('proxy_key', GAS_PROXY_KEY);
  }
  const url = makeUrl(`/vendors/${id}`, queryParams);
  const response = await fetch(url, { method: 'GET' });
  const text = await response.text();
  return new Response(text, { status: response.status, headers: { 'Content-Type': 'application/json' } });
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
  const body = {
    ...payload,
    actor_role: session.role,
    actor_sales_rep_id: session.sales_rep_id || '',
    assigned_by: payload.assigned_by || session.userId || 'system',
  };
  const putPayload: Record<string, unknown> = {
    _method: 'PUT',
    ...body,
  };

  const queryParams = new URLSearchParams();
  if (GAS_PROXY_KEY) {
    queryParams.set('proxy_key', GAS_PROXY_KEY);
  }
  const url = makeUrl(`/vendor/${id}`, queryParams);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(putPayload),
  });
  const text = await response.text();
  return new Response(text, { status: response.status, headers: { 'Content-Type': 'application/json' } });
}
