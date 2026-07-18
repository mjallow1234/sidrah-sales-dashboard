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
  try {
    const queryParams = new URLSearchParams(request.nextUrl.searchParams);
    queryParams.delete('diagnose');
    const url = makeUrl('/vendors', queryParams);
    const response = await fetch(url, {
      method: 'GET',
    });

    const text = await response.text();
    const diagnosticMode = request.nextUrl.searchParams.get('diagnose') === 'true';

    if (diagnosticMode) {
      return Response.json(
        {
          gasApiUrl: process.env.GAS_API_URL,
          gasApiKey: process.env.GAS_API_KEY,
          constructedUrl: url,
          responseStatus: response.status,
          responseHeaders: Object.fromEntries(response.headers.entries()),
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

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const url = makeUrl('/vendor');

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
