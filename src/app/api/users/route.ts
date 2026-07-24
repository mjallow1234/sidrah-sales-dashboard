import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const { role, password } = payload as {
    role?: string;
    password?: string;
  };

  if (!payload?.email || !payload?.phone || !payload?.name || !role) {
    return NextResponse.json({ status: 'error', message: 'email, phone, name, and role are required.' }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json({ status: 'error', message: 'Password is required.' }, { status: 400 });
  }

  const actorId = await getSessionUserId(request);
  const body = {
    ...payload,
    created_by: actorId,
    updated_by: actorId,
    status: payload.status ?? 'active',
    password_hash: hashPassword(password),
    password_reset_required: String(payload.password_reset_required ?? 'false'),
  };
  delete (body as any).password;
  delete (body as any).user_id;
  delete (body as any).sales_rep_id;

  const response = await fetch(new URL('/api/appusers', request.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

  return new Response(JSON.stringify(parsedPayload ?? text), {
    status: status,
    headers: { 'Content-Type': 'application/json' },
  });
}
