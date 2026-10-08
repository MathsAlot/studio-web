import { NextResponse } from 'next/server';
import { apiListInsertions, apiSetInsertions } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';
import { parseSetInsertions } from '@/lib/studio/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ sequenceId: string }>;
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { sequenceId } = await context.params;
  return proxyToApi((accessToken) => apiListInsertions(sequenceId, accessToken));
}

export async function PUT(request: Request, context: RouteContext): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const input = parseSetInsertions(await readJsonBody(request));
  if (!input) {
    return errorResponse(400, 'An ordered insertion list with gap-free positions is required.');
  }
  const { sequenceId } = await context.params;
  return proxyToApi((accessToken) => apiSetInsertions(sequenceId, input, accessToken));
}
