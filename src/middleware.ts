import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest, canAccessPath } from '@/lib/authorization';

export async function middleware(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  const isAuthenticated = session.valid;

  const loginUrl = new URL('/login', request.url);
  const dashboardUrl = new URL('/dashboard', request.url);
  const pathname = request.nextUrl.pathname;

  if (pathname === '/login') {
    if (isAuthenticated) {
      if (session.passwordResetRequired) {
        return NextResponse.redirect(new URL('/change-password', request.url));
      }
      return NextResponse.redirect(dashboardUrl);
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(loginUrl);
  }

  if (session.passwordResetRequired && pathname !== '/change-password') {
    return NextResponse.redirect(new URL('/change-password', request.url));
  }

  if (pathname === '/change-password' && !session.passwordResetRequired) {
    return NextResponse.redirect(dashboardUrl);
  }

  if (!canAccessPath(session.role, pathname)) {
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/change-password',
    '/dashboard/:path*',
    '/vendors/:path*',
    '/products/:path*',
    '/visits/:path*',
    '/users/:path*',
    '/salesreps/:path*',
    '/reports/:path*',
  ],
};
