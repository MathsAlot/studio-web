import { NextResponse } from 'next/server';
import { apiCreateFamily, apiListFamilies } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';
import { parseCreateFamily } from '@/lib/studio/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  return proxyToApi((accessToken) => apiListFamilies(accessToken));
}

export async function POST(request: Request): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const input = parseCreateFamily(await readJsonBody(request));
  if (!input) {
    return errorResponse(400, 'A valid Family name, type, and recurrence settings are required.');
  }
  return proxyToApi((accessToken) => apiCreateFamily(input, accessToken), 201);
}
