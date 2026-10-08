import { NextResponse } from 'next/server';
import { apiReorderFacts } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';
import { parseReorder } from '@/lib/studio/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ familyId: string }>;
}

export async function PUT(request: Request, context: RouteContext): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const orderedIds = parseReorder(await readJsonBody(request));
  if (!orderedIds) {
    return errorResponse(400, 'An ordered id array is required.');
  }
  const { familyId } = await context.params;
  return proxyToApi((accessToken) => apiReorderFacts(familyId, orderedIds, accessToken));
}
