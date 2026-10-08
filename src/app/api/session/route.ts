import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse } from '@/lib/auth/http';
import { applySessionCookies, clearSessionCookies } from '@/lib/auth/server-session';
import { resolveSession, type CookieSource } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Current user for the client shell, refreshing tokens when needed. */
export async function GET(): Promise<NextResponse> {
  const store = await cookies();
  const source: CookieSource = { get: (name) => store.get(name)?.value };
  const resolution = await resolveSession(source);

  switch (resolution.status) {
    case 'authenticated': {
      const response = NextResponse.json({ user: resolution.user });
      if (resolution.refreshedTokens) {
        applySessionCookies(response, resolution.refreshedTokens);
      }
      return response;
    }
    case 'forbidden': {
      const response = errorResponse(403, 'Studio access is limited to Staff and Admin accounts.');
      clearSessionCookies(response);
      return response;
    }
    case 'rejected': {
      const response = errorResponse(401, 'Your session has ended. Please sign in again.');
      clearSessionCookies(response);
      return response;
    }
    case 'unavailable': {
      return errorResponse(503, 'The Studio service is temporarily unavailable.');
    }
    case 'anonymous': {
      return errorResponse(401, 'Authentication required.');
    }
  }
}

/**
 * Mutation entry point for the session resource. Not used for login/logout
 * (those have dedicated routes) but kept so `/api/session` is CSRF-guarded if a
 * client ever posts to it.
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  const csrfRejection = verifyMutationRequest(request);
  if (csrfRejection) {
    return csrfRejection;
  }
  const response = NextResponse.json({ success: true });
  clearSessionCookies(response);
  return response;
}
