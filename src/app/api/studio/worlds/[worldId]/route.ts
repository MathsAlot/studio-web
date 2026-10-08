import { NextResponse } from 'next/server';
import { apiUpdateWorld } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';
import { parseUpdateWorld } from '@/lib/studio/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ worldId: string }>;
}

export async function PATCH(request: Request, context: RouteContext): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const input = parseUpdateWorld(await readJsonBody(request));
  if (!input) {
    return errorResponse(400, 'A valid World update is required.');
  }
  const { worldId } = await context.params;
  return proxyToApi((accessToken) => apiUpdateWorld(worldId, input, accessToken));
}
