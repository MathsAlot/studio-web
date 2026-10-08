import { NextResponse } from 'next/server';
import { apiUpdateComment } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';
import { parseUpdateComment } from '@/lib/studio/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ commentId: string }>;
}

export async function PATCH(request: Request, context: RouteContext): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const input = parseUpdateComment(await readJsonBody(request));
  if (!input) {
    return errorResponse(400, 'A status or assignee is required.');
  }
  const { commentId } = await context.params;
  return proxyToApi((accessToken) => apiUpdateComment(commentId, input, accessToken));
}
