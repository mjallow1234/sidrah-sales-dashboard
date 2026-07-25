import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminOrSupervisorRole } from '@/lib/authorization';

const GAS_API_URL = process.env.GAS_API_URL;
const GAS_API_KEY = process.env.GAS_API_KEY;

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
  const keySeparator = path.includes('?') ? '&' : '?';
  const keyParam = GAS_API_KEY ? `${keySeparator}api_key=${encodeURIComponent(GAS_API_KEY)}` : '';
  return `${base}?path=${encodeURIComponent(path.replace(/^[\/#]+/, ''))}${keyParam}`;
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }

  const id = getIdFromUrl(request);
  const url = makeUrl(`/products/${encodeURIComponent(id)}`);
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
  const url = makeUrl(`/product/${encodeURIComponent(id)}`);
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  return new Response(text, { status: response.status, headers: { 'Content-Type': 'application/json' } });
}
