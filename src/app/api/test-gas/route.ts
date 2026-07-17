const GAS_API_URL = process.env.GAS_API_URL;
const GAS_API_KEY = process.env.GAS_API_KEY;

export async function GET() {
  if (!GAS_API_URL) {
    return Response.json(
      {
        error: 'GAS_API_URL missing'
      },
      { status: 500 }
    );
  }

  const url = `${GAS_API_URL.replace(/\/+$/, '')}/stats?api_key=${encodeURIComponent(GAS_API_KEY ?? '')}`;
  const response = await fetch(url, { method: 'GET' });
  const body = await response.text();
  return Response.json({
    responseUrl: response.url,
    status: response.status,
    redirected: response.redirected,
    contentType: response.headers.get('content-type'),
    body: body,
  });
}
