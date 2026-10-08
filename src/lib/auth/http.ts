import { NextResponse } from 'next/server';

/** Error envelope aligned with the API's `{ statusCode, message, path, timestamp }`. */
export function errorResponse(statusCode: number, message: string): NextResponse {
  return NextResponse.json(
    { statusCode, message, path: 'studio-web', timestamp: new Date().toISOString() },
    { status: statusCode },
  );
}

/** Parse a JSON request body without throwing on malformed input. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
