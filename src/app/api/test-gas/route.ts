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

export async function GET() {
  if (!GAS_API_URL) {
    return Response.json(
      {
        error: 'GAS_API_URL missing'
      },
      { status: 500 }
    );
  }

  const url = makeUrl('/stats');
  const response = await fetch(url, { method: 'GET' });
  const body = await response.text();
  return Response.json({
    gasApiUrl: process.env.GAS_API_URL,
    gasApiKey: process.env.GAS_API_KEY,
    constructedUrl: url,
    responseUrl: response.url,
    status: response.status,
    redirected: response.redirected,
    contentType: response.headers.get('content-type'),
    body: body,
  });
}
