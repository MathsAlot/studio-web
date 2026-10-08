import { NextResponse } from 'next/server';
import { apiGetFact, apiUpdateFact } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';
import { parseUpdateFact } from '@/lib/studio/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ factId: string }>;
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { factId } = await context.params;
  return proxyToApi((accessToken) => apiGetFact(factId, accessToken));
}

export async function PATCH(request: Request, context: RouteContext): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const input = parseUpdateFact(await readJsonBody(request));
  if (!input) {
    return errorResponse(400, 'A valid Fact update is required.');
  }
  const { factId } = await context.params;
  return proxyToApi((accessToken) => apiUpdateFact(factId, input, accessToken));
}
