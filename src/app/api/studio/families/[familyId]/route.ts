import { NextResponse } from 'next/server';
import { apiGetFamily, apiUpdateFamily } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';
import { parseUpdateFamily } from '@/lib/studio/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ familyId: string }>;
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { familyId } = await context.params;
  return proxyToApi((accessToken) => apiGetFamily(familyId, accessToken));
}

export async function PATCH(request: Request, context: RouteContext): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const input = parseUpdateFamily(await readJsonBody(request));
  if (!input) {
    return errorResponse(400, 'A valid Family update is required.');
  }
  const { familyId } = await context.params;
  return proxyToApi((accessToken) => apiUpdateFamily(familyId, input, accessToken));
}
