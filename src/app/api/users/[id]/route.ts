import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { hashPassword } from '@/lib/password';
import { verifySession } from '@/lib/session';

async function getSessionUserId(request: NextRequest) {
  const token = request.cookies.get('sidrah_session')?.value;
  if (!token) {
    return 'system';
  }
  const verification = await verifySession(token);
  return verification.userId ?? 'system';
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.pathname.split('/').filter(Boolean).pop();
  const response = await fetch(new URL(`/api/appusers/${encodeURIComponent(id ?? '')}`, request.url), {
    method: 'GET',
  });
  const text = await response.text();
  return new Response(text, { status: response.status, headers: { 'Content-Type': 'application/json' } });
}

export async function PUT(request: NextRequest) {
  const id = request.nextUrl.pathname.split('/').filter(Boolean).pop();
  const payload = await request.json();
  const body = { ...payload };

  if (body.password) {
    body.password_hash = hashPassword(body.password);
    delete body.password;
  }

  delete (body as any).user_id;
  delete (body as any).sales_rep_id;

  body.updated_by = await getSessionUserId(request);

  const updatePayload = {
    _method: 'PUT',
    ...body,
  };

  const response = await fetch(new URL(`/api/appusers/${encodeURIComponent(id ?? '')}`, request.url), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatePayload),
  });
  const text = await response.text();
  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(text);
  } catch (err) {
    parsedPayload = null;
  }

  let status = response.status;
  if (parsedPayload && typeof (parsedPayload as any).statusCode === 'number') {
    status = (parsedPayload as any).statusCode;
  }

  return new Response(JSON.stringify(payload ?? text), {
    status: status,
    headers: { 'Content-Type': 'application/json' },
  });
}
