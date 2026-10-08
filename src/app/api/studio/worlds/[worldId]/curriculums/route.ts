import { NextResponse } from 'next/server';
import { apiCreateCurriculum, apiListCurriculums } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';
import { parseCreateCurriculum } from '@/lib/studio/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ worldId: string }>;
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { worldId } = await context.params;
  return proxyToApi((accessToken) => apiListCurriculums(worldId, accessToken));
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const input = parseCreateCurriculum(await readJsonBody(request));
  if (!input) {
    return errorResponse(400, 'A valid Curriculum name and version are required.');
  }
  const { worldId } = await context.params;
  return proxyToApi((accessToken) => apiCreateCurriculum(worldId, input, accessToken), 201);
}
