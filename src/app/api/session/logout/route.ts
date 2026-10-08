import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { apiLogout } from '@/lib/api-client';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { REFRESH_COOKIE } from '@/lib/auth/constants';
import { clearSessionCookies } from '@/lib/auth/server-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Same-origin logout BFF. Revokes the session at the API (best effort) and
 * always clears local cookies, so a revocation failure cannot strand the user
 * in a half-authenticated state.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const csrfRejection = verifyMutationRequest(request);
  if (csrfRejection) {
    return csrfRejection;
  }

  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    await apiLogout(refreshToken);
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookies(response);
  return response;
}
