import { NextResponse } from 'next/server';
import { apiSetSequenceTricks } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';
import { parseSetSequenceTricks } from '@/lib/studio/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ sequenceId: string }>;
}

export async function PUT(request: Request, context: RouteContext): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const input = parseSetSequenceTricks(await readJsonBody(request));
  if (!input) {
    return errorResponse(400, 'A valid ordered Trick role assignment list is required.');
  }
  const { sequenceId } = await context.params;
  return proxyToApi((accessToken) => apiSetSequenceTricks(sequenceId, input, accessToken));
}
