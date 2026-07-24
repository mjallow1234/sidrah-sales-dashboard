import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSession, verifySession } from '@/lib/session';
import { hashPassword, verifyPassword } from '@/lib/password';

const SESSION_MAX_AGE_SECONDS = 86400;

export async function POST(request: NextRequest) {
  const token = request.cookies.get('sidrah_session')?.value;
  if (!token) {
    return NextResponse.json({ success: false, message: 'Not authenticated.' }, { status: 401 });
  }

  const session = await verifySession(token);
  if (!session.valid || !session.userId) {
    return NextResponse.json({ success: false, message: 'Not authenticated.' }, { status: 401 });
  }

  const body = await request.json();
  const { currentPassword, newPassword } = body as { currentPassword?: string; newPassword?: string };

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ success: false, message: 'Current and new password are required.' }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ success: false, message: 'New password must be at least 8 characters.' }, { status: 400 });
  }

  const userResponse = await fetch(new URL(`/api/appusers/${encodeURIComponent(session.userId)}`, request.url), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!userResponse.ok) {
    return NextResponse.json({ success: false, message: 'Unable to load user.' }, { status: 400 });
  }

  const userPayload = await userResponse.json();
  const appUser = userPayload?.data ?? null;

  if (!appUser || !appUser.password_hash) {
    return NextResponse.json({ success: false, message: 'User does not have a password set.' }, { status: 400 });
  }

  if (!verifyPassword(currentPassword, appUser.password_hash)) {
    return NextResponse.json({ success: false, message: 'Current password is incorrect.' }, { status: 401 });
  }

  const updateBody = {
    password: newPassword,
    password_reset_required: 'false',
  };

  const updateResponse = await fetch(new URL(`/api/appusers/${encodeURIComponent(session.userId)}`, request.url), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateBody),
  });

  if (!updateResponse.ok) {
    const updateText = await updateResponse.text();
    return NextResponse.json({ success: false, message: 'Unable to update password.' }, { status: 500 });
  }

  const updatedToken = await createSession({
    userId: session.userId,
    role: session.role ?? 'agent',
    sales_rep_id: session.sales_rep_id ?? '',
    passwordResetRequired: false,
  });

  const response = NextResponse.json({ success: true });
  response.cookies.set('sidrah_session', updatedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
