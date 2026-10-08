import { NextResponse } from 'next/server';
import { apiCreateWorld, apiListWorlds } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';
import { parseCreateWorld } from '@/lib/studio/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  return proxyToApi((accessToken) => apiListWorlds(accessToken));
}

export async function POST(request: Request): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const input = parseCreateWorld(await readJsonBody(request));
  if (!input) {
    return errorResponse(400, 'A valid World name is required.');
  }
  return proxyToApi((accessToken) => apiCreateWorld(input, accessToken), 201);
}
