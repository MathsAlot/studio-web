import { NextResponse } from 'next/server';
import { apiCreateSequence } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';
import { parseCreateSequence } from '@/lib/studio/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ curriculumId: string }>;
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const input = parseCreateSequence(await readJsonBody(request));
  if (!input) {
    return errorResponse(400, 'A valid Sequence name and objective are required.');
  }
  const { curriculumId } = await context.params;
  return proxyToApi((accessToken) => apiCreateSequence(curriculumId, input, accessToken), 201);
}
