import { NextResponse } from 'next/server';
import { CSRF_COOKIE, CSRF_HEADER } from './constants';
import { parseCookieHeader } from './cookies';
import { safeEqual } from './tokens';

function forbidden(message: string): NextResponse {
  return NextResponse.json(
    {
      statusCode: 403,
      message,
      path: 'studio-web',
      timestamp: new Date().toISOString(),
    },
    { status: 403 },
  );
}

/**
 * Guard for every mutating BFF route handler (D-014).
 *
 * 1. Origin/Host: a present `Origin` must match the request `Host` so a
 *    cross-site page cannot drive same-origin cookies.
 * 2. Double submit: `x-csrf-token` must match the readable `csrf` cookie using
 *    a constant-time compare.
 *
 * Returns a ready-to-return 403 response on failure, or `null` when allowed.
 */
export function verifyMutationRequest(request: Request): NextResponse | null {
  const origin = request.headers.get('origin');
  if (origin) {
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    if (!host || !isSameOrigin(origin, host)) {
      return forbidden('Cross-origin request rejected.');
    }
  }

  const cookieToken = parseCookieHeader(request.headers.get('cookie')).get(CSRF_COOKIE);
  const headerToken = request.headers.get(CSRF_HEADER);
  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    return forbidden('Invalid or missing CSRF token.');
  }

  return null;
}

function isSameOrigin(origin: string, host: string): boolean {
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  return originHost.toLowerCase() === host.toLowerCase();
}
