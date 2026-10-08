import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TrickDetailView } from '@/components/trick/trick-detail';
import { TrickTrustPanel } from '@/components/trust/trick-trust-panel';
import { TooltipProvider } from '@/components/ui/tooltip';
import { capabilities, trickDetail, variant } from '@/test/fixtures';

function jsonResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

function readyTrick() {
  return trickDetail({
    vettingStatus: 'VERIFIED',
    reviewStatus: 'APPROVED',
    variants: [
      variant({ id: 'v1', ageTier: 'FORMATIVE', reviewStatus: 'APPROVED' }),
      variant({ id: 'v2', ageTier: 'MIDRANGE', reviewStatus: 'APPROVED' }),
      variant({ id: 'v3', ageTier: 'MATURE', reviewStatus: 'APPROVED' }),
    ],
  });
}

function renderView(trick = readyTrick()) {
  return render(
    <TooltipProvider>
      <TrickDetailView trick={trick} world={null} capabilities={capabilities()} />
    </TooltipProvider>,
  );
}

describe('Trick publication flow', () => {
  beforeEach(() => {
    document.cookie = 'csrf=test-csrf';
    localStorage.clear();
  });

  it('publishes a ready Trick and reflects the server state', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (url === '/api/studio/tricks/trick-1/publish' && method === 'POST') {
        return Promise.resolve(jsonResponse({}));
      }
      if (url === '/api/studio/tricks/trick-1' && method === 'GET') {
        return Promise.resolve(
          jsonResponse({ ...readyTrick(), publishedAt: '2026-02-01T00:00:00.000Z' }),
        );
      }
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(screen.getByText('Published')).toBeInTheDocument());
    const post = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'POST');
    expect(post?.[0]).toBe('/api/studio/tricks/trick-1/publish');
  });

  it('surfaces the server blocker when publish is rejected', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url === '/api/studio/tricks/trick-1/publish' && (init?.method ?? 'GET') === 'POST') {
        return Promise.resolve(
          jsonResponse({ message: 'All three age tiers are required.' }, 409, 'Conflict'),
        );
      }
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    expect(await screen.findByText('All three age tiers are required.')).toBeInTheDocument();
  });

  it('blocks publication for an unapproved AI draft', () => {
    renderView(
      trickDetail({
        draftSource: 'AI',
        reviewStatus: 'NEEDS_REVIEW',
        vettingStatus: 'VERIFIED',
        variants: [
          variant({ id: 'v1', ageTier: 'FORMATIVE', reviewStatus: 'APPROVED' }),
          variant({ id: 'v2', ageTier: 'MIDRANGE', reviewStatus: 'APPROVED' }),
          variant({ id: 'v3', ageTier: 'MATURE', reviewStatus: 'APPROVED' }),
        ],
      }),
    );

    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(
      screen.getByText(/AI-drafted content is held until a human approves it/),
    ).toBeInTheDocument();
  });

  it('unpublishes a published Trick and reflects the cleared state', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (url === '/api/studio/tricks/trick-1/unpublish' && method === 'POST') {
        return Promise.resolve(jsonResponse(readyTrick()));
      }
      if (url === '/api/studio/tricks/trick-1' && method === 'GET') {
        return Promise.resolve(jsonResponse(readyTrick()));
      }
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderView({ ...readyTrick(), publishedAt: '2026-02-01T00:00:00.000Z' });
    fireEvent.click(screen.getByRole('button', { name: 'Unpublish' }));

    await waitFor(() =>
      expect(screen.getByText('Every publication requirement is met.')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
    const post = fetchMock.mock.calls.find(
      ([url, init]) =>
        url === '/api/studio/tricks/trick-1/unpublish' && (init as RequestInit)?.method === 'POST',
    );
    expect(post).toBeTruthy();
  });

  it('hides Trick restore when world.structure.write is held without trick.content.write', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      if (url === '/api/studio/tricks/trick-1/versions' && method === 'GET') {
        return Promise.resolve(
          jsonResponse([
            {
              id: 'version-1',
              editedById: 'user-1',
              editedAt: '2026-01-01T00:00:00.000Z',
              snapshot: { name: 'Basic Addition' },
            },
          ]),
        );
      }
      if (url.endsWith('/comments') && method === 'GET') {
        return Promise.resolve(jsonResponse([]));
      }
      if (url === '/api/admin/users') {
        return Promise.resolve(jsonResponse([]));
      }
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <TooltipProvider>
        <TrickTrustPanel
          trick={readyTrick()}
          capabilities={capabilities({ canWriteStructure: true, canWriteContent: false })}
          onTrickChange={vi.fn()}
        />
      </TooltipProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Show history' }));

    expect(await screen.findByText(/Restoring is view-only/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Restore' })).not.toBeInTheDocument();
  });
});
