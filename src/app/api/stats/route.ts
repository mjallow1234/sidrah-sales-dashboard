import type { NextRequest } from 'next/server';
import { getVerifiedSession } from '@/lib/session';

const GAS_API_URL = process.env.GAS_API_URL;
const GAS_API_KEY = process.env.GAS_API_KEY;
const GAS_PROXY_KEY = process.env.GAS_PROXY_KEY;

function ensureBaseUrl() {
  if (!GAS_API_URL) {
    throw new Error('GAS_API_URL is not configured.');
  }
  return GAS_API_URL.replace(/\/+$/, '');
}

function makeUrl(path: string, query?: URLSearchParams) {
  const base = ensureBaseUrl();
  const keyParam = GAS_API_KEY ? `&api_key=${encodeURIComponent(GAS_API_KEY)}` : '';
  const queryString = query?.toString() ? `&${query.toString()}` : '';
  return `${base}?path=${encodeURIComponent(path.replace(/^[\/#!]+/, ''))}${queryString}${keyParam}`;
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
    const query = new URLSearchParams(request.nextUrl.searchParams);

    if (session?.role === 'agent') {
      const todayRange = getTodayRange();
      query.set('startDate', todayRange.startDate);
      query.set('endDate', todayRange.endDate);
    }

    query.set('actor_role', session?.role || '');
    query.set('actor_sales_rep_id', session?.sales_rep_id || '');
    if (session?.userId) {
      query.set('actor_user_id', session.userId);
    }
    if (GAS_PROXY_KEY) {
      query.set('proxy_key', GAS_PROXY_KEY);
    }

    const url = makeUrl('/stats', query);
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
