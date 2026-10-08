import type { NextResponse } from 'next/server';
import { apiPublishFact } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ factId: string }>;
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const { factId } = await context.params;
  return proxyToApi((accessToken) => apiPublishFact(factId, accessToken));
}
