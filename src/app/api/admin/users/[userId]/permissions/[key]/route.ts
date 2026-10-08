import { NextResponse } from 'next/server';
import { apiRevokePermission } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ userId: string; key: string }>;
}

export async function DELETE(request: Request, context: RouteContext): Promise<NextResponse> {
  const csrfRejection = verifyMutationRequest(request);
  if (csrfRejection) {
    return csrfRejection;
  }

  const { userId, key } = await context.params;
  return proxyToApi((accessToken) => apiRevokePermission(userId, key, accessToken));
}
