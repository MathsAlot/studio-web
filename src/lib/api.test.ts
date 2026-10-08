import { describe, expect, it, vi } from 'vitest';
import { getHealth, type HealthResponse } from '@/lib/api';

const successPayload: HealthResponse = {
  status: 'ok',
  database: 'up',
  timestamp: '2026-01-01T00:00:00.000Z',
};

interface MockResponseInit {
  ok?: boolean;
  status?: number;
  statusText?: string;
}

function mockResponse(body: unknown, init: MockResponseInit = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    json: async () => body,
  } as unknown as Response;
}

describe('getHealth', () => {
  it('returns a success state for a valid health payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(successPayload)));

    await expect(getHealth()).resolves.toEqual({ status: 'success', data: successPayload });
  });

  it('returns an error state when the request rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')));

    await expect(getHealth()).resolves.toEqual({
      status: 'error',
      message: 'connection refused',
    });
  });

  it('returns an error state for a non-OK HTTP response', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          mockResponse({}, { ok: false, status: 503, statusText: 'Service Unavailable' }),
        ),
    );

    await expect(getHealth()).resolves.toEqual({
      status: 'error',
      message: 'API responded with 503 Service Unavailable',
    });
  });

  it('returns an error state when the payload is missing fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({ status: 'ok' })));

    await expect(getHealth()).resolves.toEqual({
      status: 'error',
      message: 'API health payload was missing expected fields',
    });
  });

  it('returns an error state when the body is not JSON', async () => {
    const notJson = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    } as unknown as Response;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(notJson));

    await expect(getHealth()).resolves.toEqual({
      status: 'error',
      message: 'API returned a non-JSON response',
    });
  });
});
