import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE } from '@/lib/auth/constants';
import { csrfCookieAttributes } from '@/lib/auth/cookies';
import { randomToken } from '@/lib/auth/tokens';

/**
 * Edge middleware. It only checks cookie *presence* for navigation decisions;
 * the server validates and authorizes every request against the API. It also
 * guarantees a readable CSRF cookie exists so forms can double-submit.
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isSessionApi = pathname === '/api/session' || pathname.startsWith('/api/session/');
  const isAdminApi = pathname.startsWith('/api/admin');
  const isPublicPage = pathname === '/login' || pathname.startsWith('/login/');
  const hasSession = request.cookies.has(ACCESS_COOKIE) || request.cookies.has(REFRESH_COOKIE);

  if (isAdminApi && !hasSession) {
    return NextResponse.json(
      {
        statusCode: 401,
        message: 'Authentication required.',
        path: 'studio-web',
        timestamp: new Date().toISOString(),
      },
      { status: 401 },
    );
  }

  if (!isSessionApi && !isAdminApi && !isPublicPage && !hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('next', pathname);
    return withCsrfCookie(request, NextResponse.redirect(loginUrl));
  }

  return withCsrfCookie(request, NextResponse.next());
}

/** Seed a readable CSRF token when the browser does not have one yet. */
function withCsrfCookie(request: NextRequest, response: NextResponse): NextResponse {
  if (!request.cookies.get(CSRF_COOKIE)?.value) {
    response.cookies.set(CSRF_COOKIE, randomToken(), csrfCookieAttributes());
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js|map)$).*)',
  ],
};
