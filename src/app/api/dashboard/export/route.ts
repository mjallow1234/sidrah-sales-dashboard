import type { NextRequest } from 'next/server';
import { getVerifiedSession } from '@/lib/session';

const GAS_API_URL = process.env.GAS_API_URL;
const GAS_API_KEY = process.env.GAS_API_KEY;

function ensureBaseUrl() {
  if (!GAS_API_URL) {
    throw new Error('GAS_API_URL is not configured.');
  }
  return GAS_API_URL.replace(/\/+$|\s+/g, '');
}

function makeUrl(path: string, query?: URLSearchParams) {
  const base = ensureBaseUrl();
  const keyParam = GAS_API_KEY ? `&api_key=${encodeURIComponent(GAS_API_KEY)}` : '';
  const queryString = query?.toString() ? `&${query.toString()}` : '';
  return `${base}?path=${encodeURIComponent(path.replace(/^[\/#]+/, ''))}${queryString}${keyParam}`;
}

function getTodayRange() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return {
    startDate: startDate.toISOString().slice(0, 19),
    endDate: endDate.toISOString().slice(0, 19),
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getVerifiedSession(request);
    if (session?.role === 'agent') {
      return new Response(JSON.stringify({ error: 'Export not allowed for agent users.' }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const query = new URLSearchParams(request.nextUrl.searchParams);
    query.set('format', 'csv');
    const url = makeUrl('/visitlogs', query);
    const response = await fetch(url, { method: 'GET' });
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="dashboard-export-${new Date().toISOString().slice(0,10)}.csv"`,
      },
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
