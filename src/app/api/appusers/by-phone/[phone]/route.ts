import type { NextRequest } from 'next/server';

const GAS_API_URL = process.env.GAS_API_URL;
const GAS_API_KEY = process.env.GAS_API_KEY;

function ensureBaseUrl() {
  if (!GAS_API_URL) {
    throw new Error('GAS_API_URL is not configured.');
  }
  return GAS_API_URL.replace(/\/+$/, '');
}

function makeUrl(path: string) {
  const base = ensureBaseUrl();
  const keyParam = GAS_API_KEY ? `&api_key=${encodeURIComponent(GAS_API_KEY)}` : '';
  const normalizedPath = encodeURIComponent(path.replace(/^[\/\#]+/, ''));
  return `${base}?path=${normalizedPath}${keyParam}`;
}

function normalizePhone(value: unknown) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function extractAppUsers(data: unknown): Array<Record<string, unknown>> {
  if (!data || typeof data !== 'object') {
    return [];
  }

  if (Array.isArray(data)) {
    return data as Array<Record<string, unknown>>;
  }

  if (Array.isArray((data as any).items)) {
    return (data as any).items as Array<Record<string, unknown>>;
  }

  if (Array.isArray((data as any).data)) {
    return (data as any).data as Array<Record<string, unknown>>;
  }

  if (Array.isArray((data as any).data?.items)) {
    return (data as any).data.items as Array<Record<string, unknown>>;
  }

  return [];
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const segments = requestUrl.pathname.split('/').filter(Boolean);
  const phone = normalizePhone(segments.at(-1));
  if (!phone) {
    return new Response(JSON.stringify({ status: 'error', message: 'Phone number is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = makeUrl('/appusers');
  const response = await fetch(url, { method: 'GET' });
  const text = await response.text();

  if (!response.ok) {
    return new Response(text, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = JSON.parse(text);
    const users = extractAppUsers(payload.data ?? payload);
    const matchingUser = users.find((user) => normalizePhone(user.phone) === phone) ?? null;
    return new Response(JSON.stringify({ status: 'success', data: matchingUser }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(text, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
