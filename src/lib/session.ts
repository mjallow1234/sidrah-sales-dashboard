import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET;
const SESSION_COOKIE_NAME = 'sidrah_session';
const SESSION_MAX_AGE_SECONDS = 86400; // 24 hours

if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be defined in the environment');
}

const encoder = new TextEncoder();
const secretKey = encoder.encode(SESSION_SECRET);

export interface SessionPayload {
  userId: string;
  role: string;
}

export async function createSession(payload: SessionPayload) {
  const jwt = await new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey);

  return jwt;
}

export interface SessionVerificationResult {
  valid: boolean;
  userId?: string;
  role?: string;
}

export async function verifySession(token: string): Promise<SessionVerificationResult> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return {
      valid: true,
      userId: typeof payload.userId === 'string' ? payload.userId : undefined,
      role: typeof payload.role === 'string' ? payload.role : undefined,
    };
  } catch {
    return { valid: false };
  }
}

const cookieSecureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';

export function destroySession() {
  return `${SESSION_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${cookieSecureFlag}`;
}

export function createSessionCookie(token: string) {
  return `${SESSION_COOKIE_NAME}=${token}; path=/; max-age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${cookieSecureFlag}`;
}
