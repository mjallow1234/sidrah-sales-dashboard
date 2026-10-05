import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/password';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminRole } from '@/lib/authorization';
import { createAppUser } from '@/services/appUserService';

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isAdminRole(session.role)) return forbiddenResponse();

  const payload = await request.json();
  const { role, password } = payload as {
    role?: string;
    password?: string;
  };

  if (!payload?.email || !payload?.phone || !payload?.name || !role) {
    return NextResponse.json({ status: 'error', message: 'email, phone, name, and role are required.' }, { status: 400 });
  }

  const actorId = session.userId;
  const body: Record<string, unknown> = {
    ...payload,
    created_by: actorId,
    updated_by: actorId,
    status: payload.status ?? 'active',
  };

  if (password) {
    body.password_hash = hashPassword(password);
    body.password_reset_required = String(payload.password_reset_required ?? 'false');
  }
  delete (body as any).password;
  delete (body as any).user_id;
  delete (body as any).sales_rep_id;

  const result = await createAppUser(body);

  const status =
    typeof result.payload === 'object' && result.payload !== null && typeof (result.payload as any).statusCode === 'number'
      ? (result.payload as any).statusCode
      : result.status;

  return new Response(JSON.stringify(result.payload ?? result.text), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
