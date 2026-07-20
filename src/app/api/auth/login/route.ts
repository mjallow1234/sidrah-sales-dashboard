import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/session';

const SESSION_MAX_AGE_SECONDS = 86400;

function getAuthConfig() {
  const phone = process.env.AUTH_PHONE;
  const password = process.env.AUTH_PASSWORD;
  const userId = process.env.AUTH_USER_ID;
  const role = process.env.AUTH_USER_ROLE;

  if (!phone || !password || !userId || !role) {
    throw new Error(
      'AUTH_PHONE, AUTH_PASSWORD, AUTH_USER_ID, and AUTH_USER_ROLE must be configured'
    );
  }

  return {
    phone,
    password,
    userId,
    role,
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthConfig();
    const body = await request.json();
    const { phone, password } = body as { phone?: string; password?: string };

    if (phone !== auth.phone || password !== auth.password) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const token = await createSession({
      userId: auth.userId,
      role: auth.role,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set('sidrah_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
