import type { NextResponse } from 'next/server';
import { apiUnpublishTrick } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ trickId: string }>;
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const { trickId } = await context.params;
  return proxyToApi((accessToken) => apiUnpublishTrick(trickId, accessToken));
}
