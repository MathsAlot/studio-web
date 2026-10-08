import { resolveApiUrl } from '@/lib/env';
import type { components } from '@/types/api';

/** Contract type derived from the exported OpenAPI spec. Never hand-written. */
export type HealthResponse = components['schemas']['HealthResponseDto'];

/** Discriminated union consumed by the health view for every render state. */
export type HealthState =
  | { status: 'loading' }
  | { status: 'success'; data: HealthResponse }
  | { status: 'error'; message: string };

function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.status === 'ok' || candidate.status === 'degraded') &&
    (candidate.database === 'up' || candidate.database === 'down') &&
    typeof candidate.timestamp === 'string'
  );
}

/**
 * Server-side call to `GET /health`. Never throws: transport, HTTP, and payload
 * problems all collapse into an `error` state so the UI can render and retry.
 */
export async function getHealth(): Promise<HealthState> {
  let response: Response;
  try {
    response = await fetch(resolveApiUrl('/health'), { cache: 'no-store' });
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Network error',
    };
  }

  if (!response.ok) {
    const label = `${response.status} ${response.statusText}`.trim();
    return { status: 'error', message: `API responded with ${label}` };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { status: 'error', message: 'API returned a non-JSON response' };
  }

  if (!isHealthResponse(payload)) {
    return { status: 'error', message: 'API health payload was missing expected fields' };
  }

  return { status: 'success', data: payload };
}
