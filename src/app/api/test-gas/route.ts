const GAS_API_URL = process.env.GAS_API_URL;
const GAS_API_KEY = process.env.GAS_API_KEY;

export async function GET() {
  const url = `${GAS_API_URL.replace(/\/+$/, '')}/stats?api_key=${encodeURIComponent(GAS_API_KEY ?? '')}`;
  const response = await fetch(url, { method: 'GET' });
  const body = await response.text();
  return Response.json({
    url: response.url,
    status: response.status,
    redirected: response.redirected,
    contentType: response.headers.get('content-type'),
    location: response.headers.get('location'),
    body: body,
  });
}
