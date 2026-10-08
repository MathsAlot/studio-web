import type { NextResponse } from 'next/server';
import { apiListFactVersions } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ factId: string }>;
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { factId } = await context.params;
  return proxyToApi((accessToken) => apiListFactVersions(factId, accessToken));
}
