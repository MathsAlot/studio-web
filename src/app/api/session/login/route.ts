import { NextResponse } from 'next/server';
import { apiLogin, type LoginInput } from '@/lib/api-client';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';
import { applySessionCookies, clearSessionCookies } from '@/lib/auth/server-session';
import { CSRF_COOKIE } from '@/lib/auth/constants';
import { csrfCookieAttributes } from '@/lib/auth/cookies';
import { randomToken } from '@/lib/auth/tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Same-origin login BFF. Calls the API, then stores the returned tokens in
 * httpOnly cookies. The token pair is never included in the JSON response or
 * logged, so it cannot reach client JS.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const csrfRejection = verifyMutationRequest(request);
  if (csrfRejection) {
    return csrfRejection;
  }

  const input = parseLoginInput(await readJsonBody(request));
  if (!input) {
    return errorResponse(400, 'Enter a valid email address and password.');
  }

  const result = await apiLogin(input);

  if (!result.ok) {
    if (result.status === 401) {
      return errorResponse(401, 'Email or password is incorrect.');
    }
    if (result.status === 429) {
      return errorResponse(429, 'Too many attempts. Wait a minute and try again.');
    }
    return errorResponse(result.status === 0 ? 502 : result.status, result.message);
  }

  if (result.data.user.role === 'LEARNER') {
    const response = errorResponse(403, 'Studio access is limited to Staff and Admin accounts.');
    clearSessionCookies(response);
    return response;
  }

  const response = NextResponse.json({ user: result.data.user });
  applySessionCookies(response, result.data);
  // Rotate the double-submit token alongside the session.
  response.cookies.set(CSRF_COOKIE, randomToken(), csrfCookieAttributes());
  return response;
}

function parseLoginInput(payload: unknown): LoginInput | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const candidate = payload as Record<string, unknown>;
  const email = candidate.email;
  const password = candidate.password;

  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    return null;
  }
  if (typeof password !== 'string' || password.length === 0 || password.length > 200) {
    return null;
  }

  return { email: email.trim(), password };
}
