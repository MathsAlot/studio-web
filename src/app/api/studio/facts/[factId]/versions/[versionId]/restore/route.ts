import type { NextResponse } from 'next/server';
import { apiRestoreFactVersion } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ factId: string; versionId: string }>;
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const { factId, versionId } = await context.params;
  return proxyToApi((accessToken) => apiRestoreFactVersion(factId, versionId, accessToken));
}
