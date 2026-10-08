import { NextResponse } from 'next/server';
import { apiCreateComment, apiListComments } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';
import { parseCreateComment } from '@/lib/studio/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ trickId: string }>;
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { trickId } = await context.params;
  return proxyToApi((accessToken) => apiListComments(trickId, accessToken));
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const input = parseCreateComment(await readJsonBody(request));
  if (!input) {
    return errorResponse(400, 'A comment body is required.');
  }
  const { trickId } = await context.params;
  return proxyToApi((accessToken) => apiCreateComment(trickId, input, accessToken), 201);
}
