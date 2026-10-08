import { NextResponse } from 'next/server';
import { apiUpdateSequence } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';
import { parseUpdateSequence } from '@/lib/studio/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ sequenceId: string }>;
}

export async function PATCH(request: Request, context: RouteContext): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const input = parseUpdateSequence(await readJsonBody(request));
  if (!input) {
    return errorResponse(400, 'A valid Sequence update is required.');
  }
  const { sequenceId } = await context.params;
  return proxyToApi((accessToken) => apiUpdateSequence(sequenceId, input, accessToken));
}
