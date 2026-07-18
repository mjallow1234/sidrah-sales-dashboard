import type { NextRequest } from 'next/server';

const GAS_API_URL = process.env.GAS_API_URL;
const GAS_API_KEY = process.env.GAS_API_KEY;

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

export async function GET(request: NextRequest) {
  const queryParams = new URLSearchParams(request.nextUrl.searchParams);
  queryParams.delete('diagnose');
  const url = makeUrl('/inventory', queryParams);
  const response = await fetch(url, { method: 'GET' });
  const text = await response.text();
  return new Response(text, { status: response.status, headers: { 'Content-Type': 'application/json' } });
}
