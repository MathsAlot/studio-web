import { NextResponse } from 'next/server';
import { apiSetFactReview } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';
import { parseSetReview } from '@/lib/studio/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ factId: string }>;
}

export async function PUT(request: Request, context: RouteContext): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const input = parseSetReview(await readJsonBody(request));
  if (!input) {
    return errorResponse(400, 'A valid review status is required.');
  }
  const { factId } = await context.params;
  return proxyToApi((accessToken) => apiSetFactReview(factId, input, accessToken));
}
