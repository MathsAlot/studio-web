import { NextResponse } from 'next/server';
import { apiListTrickVersions } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ trickId: string }>;
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { trickId } = await context.params;
  return proxyToApi((accessToken) => apiListTrickVersions(trickId, accessToken));
}
