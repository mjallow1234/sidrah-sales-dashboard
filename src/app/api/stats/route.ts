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
  try {
    const url = makeUrl(`/stats${request.nextUrl.search}`);
    const response = await fetch(url, {
      method: 'GET',
    });

    const text = await response.text();
    const contentType = response.headers.get('content-type');
    const diagnosticMode = request.nextUrl.searchParams.get('diagnose') === 'true';

    if (diagnosticMode) {
      return Response.json(
        {
          finalUrl: response.url,
          status: response.status,
          redirected: response.redirected,
          contentType,
          body: text,
        },
        { status: 200 }
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
        error: String(error),
        gasUrlExists: !!process.env.GAS_API_URL,
        gasKeyExists: !!process.env.GAS_API_KEY,
        gasUrlLength: process.env.GAS_API_URL?.length ?? 0,
        gasKeyLength: process.env.GAS_API_KEY?.length ?? 0,
      },
      { status: 500 }
    );
  }
}
