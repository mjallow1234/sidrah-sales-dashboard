import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAgentRole, isSupervisorRole, isAdminOrSupervisorRole } from '@/lib/authorization';
import { createVisit as createVisitLocally } from '@/services/visitService';

const GAS_API_URL = process.env.GAS_API_URL;
const GAS_API_KEY = process.env.GAS_API_KEY;
const GAS_PROXY_KEY = process.env.GAS_PROXY_KEY;
const USE_MYSQL_VISIT_WRITE = process.env.USE_MYSQL_VISIT_WRITE === 'true';

function ensureBaseUrl() {
  if (!GAS_API_URL) {
    throw new Error('GAS_API_URL is not configured.');
  }
  return GAS_API_URL.replace(/\/+$/, '');
}

function makeUrl(path: string, query?: URLSearchParams) {
  const base = ensureBaseUrl();
  const keyParam = GAS_API_KEY ? `&api_key=${encodeURIComponent(GAS_API_KEY)}` : '';
  const queryString = query?.toString() ?? '';
  const queryParamString = queryString ? `&${queryString}` : '';
  return `${base}?path=${encodeURIComponent(path.replace(/^[\/\#]+/, ''))}${queryParamString}${keyParam}`;
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
    if (isAgentRole(session.role) && payload.sales_rep_id && payload.sales_rep_id !== session.sales_rep_id) {
      return forbiddenResponse();
    }
    const body = {
      ...payload,
      actor_role: session.role,
      actor_sales_rep_id: session.sales_rep_id || '',
    };

    if (USE_MYSQL_VISIT_WRITE) {
      try {
        const result = await createVisitLocally(body);
        return NextResponse.json({ status: 'success', data: result });
      } catch (error) {
        const status = error instanceof Error && 'status' in error ? (error as any).status ?? 500 : 500;
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ status: 'error', message }, { status });
      }
    }

    const queryParams = new URLSearchParams();
    if (GAS_PROXY_KEY) {
      queryParams.set('proxy_key', GAS_PROXY_KEY);
    }
    const url = makeUrl('/visit', queryParams);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
