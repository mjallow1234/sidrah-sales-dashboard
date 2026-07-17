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
  const separator = path.includes('?') ? '&' : '?';
  const keyParam = GAS_API_KEY ? `${separator}api_key=${encodeURIComponent(GAS_API_KEY)}` : '';
  return `${base}${path}${keyParam}`;
}

export async function GET(request: NextRequest) {
  const url = makeUrl(`/salesreps${request.nextUrl.search}`);
  const response = await fetch(url, {
    method: 'GET',
  });

  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const url = makeUrl('/salesrep');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
