import { NextResponse } from 'next/server';
import { apiGetCurriculum, apiUpdateCurriculum } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';
import { parseUpdateCurriculum } from '@/lib/studio/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ curriculumId: string }>;
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { curriculumId } = await context.params;
  return proxyToApi((accessToken) => apiGetCurriculum(curriculumId, accessToken));
}

export async function PATCH(request: Request, context: RouteContext): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const input = parseUpdateCurriculum(await readJsonBody(request));
  if (!input) {
    return errorResponse(400, 'A valid Curriculum update is required.');
  }
  const { curriculumId } = await context.params;
  return proxyToApi((accessToken) => apiUpdateCurriculum(curriculumId, input, accessToken));
}
