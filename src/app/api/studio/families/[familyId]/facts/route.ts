import { NextResponse } from 'next/server';
import { apiCreateFact } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';
import { parseCreateFact } from '@/lib/studio/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ familyId: string }>;
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const input = parseCreateFact(await readJsonBody(request));
  if (!input) {
    return errorResponse(400, 'A valid Fact type, structured data, and display text are required.');
  }
  const { familyId } = await context.params;
  return proxyToApi((accessToken) => apiCreateFact(familyId, input, accessToken), 201);
}
