import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { hashPassword } from '@/lib/password';
import { verifySession } from '@/lib/session';
import { fetchAppUserById, updateAppUser } from '@/services/appUserService';

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
  const result = await fetchAppUserById(id ?? '');
  return new Response(result.text, { status: result.status, headers: { 'Content-Type': 'application/json' } });
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

  const result = await updateAppUser(id ?? '', updatePayload);

  let status = result.status;
  if (typeof result.payload === 'object' && result.payload !== null && typeof (result.payload as any).statusCode === 'number') {
    status = (result.payload as any).statusCode;
  }

  return new Response(JSON.stringify(payload ?? result.text), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
