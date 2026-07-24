import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/session';
import { verifyPassword } from '@/lib/password';

const SESSION_MAX_AGE_SECONDS = 86400;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { phone, password } = body as { phone?: string; password?: string };

  if (!phone || !password) {
    return NextResponse.json({ success: false, message: 'Phone and password are required.' }, { status: 400 });
  }

  const lookupUrl = new URL(`/api/appusers/by-phone/${encodeURIComponent(phone)}`, request.url);
  const apiResponse = await fetch(lookupUrl.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!apiResponse.ok) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const result = await apiResponse.json();
  const appUser = result?.data ?? null;

  if (!appUser || appUser.status !== 'active' || !appUser.password_hash) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const passwordMatches = verifyPassword(password, appUser.password_hash);
  if (!passwordMatches) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const passwordResetRequired = appUser.password_reset_required === 'true' || appUser.password_reset_required === '1';
  const token = await createSession({
    userId: appUser.user_id,
    role: appUser.role ?? 'agent',
    sales_rep_id: appUser.sales_rep_id ?? '',
    passwordResetRequired,
  });

  const response = NextResponse.json({
    success: true,
    passwordResetRequired,
  });

  response.cookies.set('sidrah_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
