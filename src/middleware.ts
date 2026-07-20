import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('sidrah_session')?.value;
  const verification = token ? await verifySession(token) : { valid: false };
  const isAuthenticated = verification.valid;

  const loginUrl = new URL('/login', request.url);
  const dashboardUrl = new URL('/dashboard', request.url);

  if (request.nextUrl.pathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(dashboardUrl);
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/dashboard/:path*',
    '/vendors/:path*',
    '/products/:path*',
    '/visits/:path*',
  ],
};
