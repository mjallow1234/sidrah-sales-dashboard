import type { NextRequest } from 'next/server';

const GAS_API_URL = process.env.GAS_API_URL;
const GAS_API_KEY = process.env.GAS_API_KEY;

function ensureBaseUrl() {
  if (!GAS_API_URL) {
    throw new Error('GAS_API_URL is not configured.');
  }
  return GAS_API_URL.replace(/\/+$/, '');
}

function buildGasUrl(path: string, query?: URLSearchParams) {
  const base = ensureBaseUrl();
  const normalizedPath = path
    .replace(/^\/+/, '')
    .split('/')
    .map(encodeURIComponent)
    .join('/');
  const queryString = query?.toString() ?? '';
  const keyParam = GAS_API_KEY ? `&api_key=${encodeURIComponent(GAS_API_KEY)}` : '';
  return `${base}?path=${normalizedPath}${queryString ? `&${queryString}` : ''}${keyParam}`;
}

function getIdFromUrl(request: Request) {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  return pathSegments[pathSegments.length - 1] || '';
}

export async function GET(request: Request) {
  const id = getIdFromUrl(request);
  const url = buildGasUrl(`/appusers/${id}`);
  const response = await fetch(url, { method: 'GET' });
  const text = await response.text();
  return new Response(text, { status: response.status, headers: { 'Content-Type': 'application/json' } });
}

export async function PUT(request: Request) {
  const id = getIdFromUrl(request);
  const payload = await request.json();
  const putPayload: Record<string, unknown> = {
    _method: 'PUT',
    ...payload,
  };

  if (!putPayload.sales_rep_id) {
    const existingResponse = await fetch(buildGasUrl(`/appusers/${id}`), {
      method: 'GET',
    });
    if (existingResponse.ok) {
      try {
        const existingBody = await existingResponse.json();
        if (existingBody && existingBody.data && existingBody.data.sales_rep_id) {
          putPayload.sales_rep_id = existingBody.data.sales_rep_id;
        }
      } catch (_) {
        // ignore parse errors; continue with original payload
      }
    }
  }

  const url = buildGasUrl(`/appuser/${id}`);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(putPayload),
  });
  const text = await response.text();
  return new Response(text, { status: response.status, headers: { 'Content-Type': 'application/json' } });
}
