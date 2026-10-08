import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FactTrustPanel } from '@/components/trust/fact-trust-panel';
import { factDetail } from '@/test/fixtures';

function jsonResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

function readyFact() {
  return factDetail({ vettingStatus: 'VERIFIED', reviewStatus: 'APPROVED' });
}

function renderPanel(fact = factDetail(), onFactChange = vi.fn()) {
  render(<FactTrustPanel fact={fact} canVetFact canManageFamily onFactChange={onFactChange} />);
  return { onFactChange };
}

describe('FactTrustPanel', () => {
  beforeEach(() => {
    document.cookie = 'csrf=test-csrf';
  });

  it('saves Fact vetting through fact.vetting.write and re-reads the entity', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (url === '/api/studio/facts/fact-1/vetting' && method === 'PUT') {
        return Promise.resolve(jsonResponse(factDetail({ vettingStatus: 'VERIFIED' })));
      }
      if (url === '/api/studio/facts/fact-1' && method === 'GET') {
        return Promise.resolve(jsonResponse(factDetail({ vettingStatus: 'VERIFIED' })));
      }
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal('fetch', fetchMock);
    const { onFactChange } = renderPanel();

    fireEvent.change(screen.getByLabelText('Vetting status'), { target: { value: 'VERIFIED' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save vetting' }));

    expect(await screen.findByText('Vetting saved.')).toBeInTheDocument();
    const put = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PUT');
    expect(put?.[0]).toBe('/api/studio/facts/fact-1/vetting');
    expect(JSON.parse(String((put?.[1] as RequestInit).body))).toEqual({ status: 'VERIFIED' });
    await waitFor(() => expect(onFactChange).toHaveBeenCalledTimes(1));
  });

  it('publishes a ready Fact and reports the server outcome', async () => {
    const published = factDetail({
      vettingStatus: 'VERIFIED',
      reviewStatus: 'APPROVED',
      publishedAt: '2026-02-01T00:00:00.000Z',
    });
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (url === '/api/studio/facts/fact-1/publish' && method === 'POST') {
        return Promise.resolve(jsonResponse(published));
      }
      if (url === '/api/studio/facts/fact-1' && method === 'GET') {
        return Promise.resolve(jsonResponse(published));
      }
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPanel(readyFact());

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    expect(await screen.findByText('Fact published.')).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'POST');
    expect(post?.[0]).toBe('/api/studio/facts/fact-1/publish');
  });

  it('keeps publish disabled while the Fact is unverified', () => {
    renderPanel();

    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });
});
