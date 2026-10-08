import { NextResponse } from 'next/server';
import { apiGrantPermission, apiListUserPermissions } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { userId } = await context.params;
  return proxyToApi((accessToken) => apiListUserPermissions(userId, accessToken));
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const csrfRejection = verifyMutationRequest(request);
  if (csrfRejection) {
    return csrfRejection;
  }

  const { userId } = await context.params;
  const key = parsePermissionKey(await readJsonBody(request));
  if (!key) {
    return errorResponse(400, 'A permission key is required.');
  }

  return proxyToApi((accessToken) => apiGrantPermission(userId, key, accessToken));
}

function parsePermissionKey(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const key = (payload as Record<string, unknown>).key;
  return typeof key === 'string' && key.trim().length > 0 ? key.trim() : null;
}
