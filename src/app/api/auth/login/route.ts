import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/session';

const VALID_PHONE = process.env.AUTH_PHONE ?? 'ahmad';
const VALID_PASSWORD = process.env.AUTH_PASSWORD ?? 'Jallow@123';
const AUTH_USER_ID = process.env.AUTH_USER_ID ?? 'agent-1';
const AUTH_USER_ROLE = process.env.AUTH_USER_ROLE ?? 'agent';
const SESSION_MAX_AGE_SECONDS = 86400;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password } = body as { phone?: string; password?: string };

    if (phone !== VALID_PHONE || password !== VALID_PASSWORD) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const token = await createSession({
      userId: AUTH_USER_ID,
      role: AUTH_USER_ROLE,
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
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
