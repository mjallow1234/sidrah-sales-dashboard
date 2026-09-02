import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { canAccessPath } from '@/lib/authorization';

const PUBLIC_ORIGIN = (() => {
  const appUrl = process.env.APP_URL?.trim();
  if (!appUrl) return null;

  try {
    return new URL(appUrl).origin;
  } catch {
    return null;
  }
})();

function buildPublicRedirectUrl(request: NextRequest, pathname: string) {
  if (PUBLIC_ORIGIN) {
    return `${PUBLIC_ORIGIN}${pathname}`;
  }

  const fallbackOrigin = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  return `${fallbackOrigin}${pathname}`;
}

export async function middleware(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  const isAuthenticated = session.valid;
  const pathname = request.nextUrl.pathname;
  const isApiRequest = pathname.startsWith('/api/');

  const loginUrl = buildPublicRedirectUrl(request, '/login');
  const dashboardUrl = buildPublicRedirectUrl(request, '/dashboard');
  const changePasswordUrl = buildPublicRedirectUrl(request, '/change-password');
  const deliveriesUrl = buildPublicRedirectUrl(request, '/deliveries');
  const homeUrl = session.role === 'delivery' ? deliveriesUrl : dashboardUrl;

  if (pathname === '/api/auth' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  if (isApiRequest && !isAuthenticated) {
    return NextResponse.json({ status: 'error', message: 'Not authenticated.' }, { status: 401 });
  }

  if (isApiRequest && session.role === 'delivery' && !pathname.startsWith('/api/deliveries')) {
    return NextResponse.json({ status: 'error', message: 'Forbidden.' }, { status: 403 });
  }

  if (isApiRequest) {
    return NextResponse.next();
  }

  if (pathname === '/login') {
    if (isAuthenticated) {
      if (session.passwordResetRequired) {
        return NextResponse.redirect(changePasswordUrl);
      }
      return NextResponse.redirect(homeUrl);
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(loginUrl);
  }

  if (session.passwordResetRequired && pathname !== '/change-password') {
    return NextResponse.redirect(changePasswordUrl);
  }

  if (pathname === '/change-password' && !session.passwordResetRequired) {
    return NextResponse.redirect(homeUrl);
  }

  if (!canAccessPath(session.role, pathname)) {
    return NextResponse.redirect(homeUrl);
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
    '/deliveries/:path*',
    '/api/:path*',
  ],
};
