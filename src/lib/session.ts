import 'server-only';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'sidrah_session';
const SESSION_MAX_AGE_SECONDS = 86400; // 24 hours

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error('SESSION_SECRET must be defined');
  }

  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  role: string;
  sales_rep_id?: string;
  passwordResetRequired?: boolean;
  name?: string;
  display_name?: string;
  full_name?: string;
  username?: string;
}

export async function createSession(payload: SessionPayload) {
  const jwt = await new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());

  return jwt;
}

export interface SessionVerificationResult {
  valid: boolean;
  userId?: string;
  role?: string;
  sales_rep_id?: string;
  passwordResetRequired?: boolean;
  name?: string;
  display_name?: string;
  full_name?: string;
  username?: string;
}

export async function verifySession(token: string): Promise<SessionVerificationResult> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return {
      valid: true,
      userId: typeof payload.userId === 'string' ? payload.userId : undefined,
      role: typeof payload.role === 'string' ? payload.role : undefined,
      sales_rep_id: typeof payload.sales_rep_id === 'string' ? payload.sales_rep_id : undefined,
      passwordResetRequired: typeof payload.passwordResetRequired === 'boolean' ? payload.passwordResetRequired : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      display_name: typeof payload.display_name === 'string' ? payload.display_name : undefined,
      full_name: typeof payload.full_name === 'string' ? payload.full_name : undefined,
      username: typeof payload.username === 'string' ? payload.username : undefined,
    };
  } catch {
    return { valid: false };
  }
}

export async function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get('sidrah_session')?.value;
  return token ? await verifySession(token) : { valid: false };
}

export async function getVerifiedSession(request: NextRequest) {
  const token = request.cookies.get('sidrah_session')?.value;
  if (!token) {
    return null;
  }

  const session = await verifySession(token);
  return session.valid ? session : null;
}

export function unauthorizedResponse() {
  return NextResponse.json({ status: 'error', message: 'Not authenticated.' }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ status: 'error', message: 'Insufficient permissions.' }, { status: 403 });
}

const cookieSecureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';

export function destroySession() {
  return `${SESSION_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${cookieSecureFlag}`;
}

export function createSessionCookie(token: string) {
  return `${SESSION_COOKIE_NAME}=${token}; path=/; max-age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${cookieSecureFlag}`;
}
