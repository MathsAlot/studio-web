import { NextResponse } from 'next/server';
import type { ApiResult } from '@/lib/api-client';
import { errorResponse } from './http';
import { getServerAccessToken } from './server-session';

/**
 * Proxy a typed API call using the httpOnly access token. The browser never
 * sees a token; authorization is decided by the API and its status is mirrored
 * to the caller so the UI can show the real server outcome.
 */
export async function proxyToApi<T>(
  call: (accessToken: string) => Promise<ApiResult<T>>,
  successStatus = 200,
): Promise<NextResponse> {
  const session = await getServerAccessToken();
  if (!session) {
    return errorResponse(401, 'Authentication required.');
  }

  const result = await call(session.accessToken);
  if (!result.ok) {
    return errorResponse(result.status === 0 ? 502 : result.status, result.message);
  }

  return NextResponse.json(result.data, { status: successStatus });
}
