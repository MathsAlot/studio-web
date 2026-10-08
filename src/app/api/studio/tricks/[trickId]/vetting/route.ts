import { NextResponse } from 'next/server';
import { apiSetTrickVetting } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';
import { parseSetTrickVetting } from '@/lib/studio/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ trickId: string }>;
}

export async function PUT(request: Request, context: RouteContext): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const input = parseSetTrickVetting(await readJsonBody(request));
  if (!input) {
    return errorResponse(400, 'A valid vetting status is required.');
  }
  const { trickId } = await context.params;
  return proxyToApi((accessToken) => apiSetTrickVetting(trickId, input, accessToken));
}
