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
  const keySeparator = path.includes('?') ? '&' : '?';
  const keyParam = GAS_API_KEY ? `${keySeparator}api_key=${encodeURIComponent(GAS_API_KEY)}` : '';
  return `${base}?path=${encodeURIComponent(path.replace(/^[\/#]+/, ''))}${keyParam}`;
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
          responseUrl: response.url,
          responseStatus: response.status,
          responseHeaders: {
            'content-type': response.headers.get('content-type'),
            location: response.headers.get('location')
          },
          redirected: response.redirected,
          gasApiUrl: process.env.GAS_API_URL,
          gasApiKey: process.env.GAS_API_KEY,
          constructedUrl: url,
          status: response.status,
          contentType,
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
