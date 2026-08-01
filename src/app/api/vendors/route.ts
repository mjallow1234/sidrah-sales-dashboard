import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminOrSupervisorRole, isAgentRole, isSupervisorRole } from '@/lib/authorization';

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
  const normalizedPath = encodeURIComponent(path.replace(/^[\/\#]+/, ''));
  const queryString = query?.toString() ?? '';
  const queryParamString = queryString ? `&${queryString}` : '';
  return `${base}?path=${normalizedPath}${queryParamString}${keyParam}`;
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const queryParams = new URLSearchParams(request.nextUrl.searchParams);
    queryParams.delete('diagnose');
    queryParams.set('actor_role', session.role || '');
    queryParams.set('actor_sales_rep_id', session.sales_rep_id || '');
    if (session.userId) {
      queryParams.set('actor_user_id', session.userId);
    }
    if (GAS_PROXY_KEY) {
      queryParams.set('proxy_key', GAS_PROXY_KEY);
    }
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

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }
  if (!isAgentRole(session.role) && !isSupervisorRole(session.role) && !isAdminOrSupervisorRole(session.role)) {
    return forbiddenResponse();
  }

  try {
    const payload = await request.json();
    if (isAgentRole(session.role) && payload.sales_rep_id) {
      return forbiddenResponse();
    }
    const requestBody = {
      ...payload,
      actor_role: session.role,
      actor_sales_rep_id: session.sales_rep_id || '',
      ...(payload.sales_rep_id ? { assigned_by: session.userId || 'system' } : {}),
    };
    const queryParams = new URLSearchParams();
    if (GAS_PROXY_KEY) {
      queryParams.set('proxy_key', GAS_PROXY_KEY);
    }
    const url = makeUrl('/vendor', queryParams);

    console.log({
      gasUrl: url,
      searchParams: new URL(url).search,
      hasProxyKey: !!GAS_PROXY_KEY,
      proxyKeyLength: GAS_PROXY_KEY?.length ?? 0,
      requestBody,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
