import { NextResponse } from 'next/server';
import { apiResetUserPassword } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ userId: string }>;
}

/**
 * Lockout recovery proxy (D-047). The plaintext password passes straight
 * through to the API and is never logged, returned, or stored by the BFF; the
 * API revokes the target's sessions and audits the action.
 */
export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const csrfRejection = verifyMutationRequest(request);
  if (csrfRejection) {
    return csrfRejection;
  }

  const password = parsePassword(await readJsonBody(request));
  if (!password) {
    return errorResponse(400, 'A password of at least 12 characters is required.');
  }

  const { userId } = await context.params;
  return proxyToApi((accessToken) => apiResetUserPassword(userId, { password }, accessToken));
}

function parsePassword(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const password = (payload as Record<string, unknown>).password;
  return typeof password === 'string' && password.length >= 12 ? password : null;
}
