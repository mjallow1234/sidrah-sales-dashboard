import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSession, verifySession } from '@/lib/session';
import { hashPassword, verifyPassword } from '@/lib/password';
import { fetchAppUserById, updateAppUser } from '@/services/appUserService';

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

  const userResult = await fetchAppUserById(session.userId);
  if (!userResult.ok) {
    return NextResponse.json({ success: false, message: 'Unable to load user.' }, { status: 400 });
  }

  const userPayload = userResult.payload;
  const appUser = typeof userPayload === 'object' && userPayload !== null ? (userPayload as any).data ?? null : null;

  if (!appUser || !appUser.password_hash) {
    return NextResponse.json({ success: false, message: 'User does not have a password set.' }, { status: 400 });
  }

  if (!verifyPassword(currentPassword, appUser.password_hash)) {
    return NextResponse.json({ success: false, message: 'Current password is incorrect.' }, { status: 401 });
  }

  const updateBody = {
    password_hash: hashPassword(newPassword),
    password_reset_required: 'false',
  };

  const updateResult = await updateAppUser(session.userId, updateBody);

  if (!updateResult.ok) {
    return NextResponse.json({ success: false, message: 'Unable to update password.' }, { status: 500 });
  }

  const verifyResult = await fetchAppUserById(session.userId);
  if (!verifyResult.ok) {
    return NextResponse.json({ success: false, message: 'Unable to verify password update.' }, { status: 500 });
  }

  const verifyPayload = verifyResult.payload;
  const updatedAppUser = typeof verifyPayload === 'object' && verifyPayload !== null ? (verifyPayload as any).data ?? null : null;

  if (!updatedAppUser || !updatedAppUser.password_hash) {
    return NextResponse.json({ success: false, message: 'Password update verification failed.' }, { status: 500 });
  }

  if (!verifyPassword(newPassword, updatedAppUser.password_hash)) {
    return NextResponse.json({ success: false, message: 'Password update did not persist.' }, { status: 500 });
  }

  if (updatedAppUser.password_reset_required === 'true' || updatedAppUser.password_reset_required === '1' || updatedAppUser.password_reset_required === true) {
    return NextResponse.json({ success: false, message: 'Password reset flag was not cleared.' }, { status: 500 });
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
