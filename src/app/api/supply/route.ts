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
  return `${base}?path=${encodeURIComponent(path.replace(/^[\/#]+/, ''))}${keyParam}`;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const url = makeUrl('/supply');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    const successResponse = response.ok && json && typeof json === 'object' && json.status === 'success';
    if (!successResponse) {
      const message = json?.message || json?.error || `GAS API returned ${response.status}`;
      return new Response(
        JSON.stringify({ status: 'error', message }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }

    return new Response(text, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return Response.json(
      {
        status: 'error',
        message: String(error),
        gasUrlExists: !!process.env.GAS_API_URL,
        gasKeyExists: !!process.env.GAS_API_KEY,
        gasUrlLength: process.env.GAS_API_URL?.length ?? 0,
        gasKeyLength: process.env.GAS_API_KEY?.length ?? 0,
      },
      { status: 500 }
    );
  }
}
