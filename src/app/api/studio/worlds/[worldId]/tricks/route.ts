import { NextResponse } from 'next/server';
import { apiCreateTrick } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';
import { parseCreateTrick } from '@/lib/studio/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ worldId: string }>;
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const input = parseCreateTrick(await readJsonBody(request));
  if (!input) {
    return errorResponse(400, 'A Trick name and method description are required.');
  }
  const { worldId } = await context.params;
  return proxyToApi((accessToken) => apiCreateTrick(worldId, input, accessToken), 201);
}
