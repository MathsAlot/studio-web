import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityFeed } from '@/components/ops/activity-feed';
import type { ActivityPage } from '@/lib/api-client';

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/activity',
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(''),
}));

function jsonResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

function page(overrides: Partial<ActivityPage> = {}): ActivityPage {
  return {
    items: [
      {
        id: 'act-1',
        action: 'trick.vetting.updated',
        targetType: 'Trick',
        targetId: 'trick-1',
        occurredAt: '2026-01-02T10:00:00.000Z',
        actor: { id: 'user-1', displayName: 'Staff One' },
      },
    ],
    total: 30,
    limit: 25,
    offset: 0,
    hasMore: true,
    ...overrides,
  };
}

describe('ActivityFeed', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renders newest-first activity with actor, action, and target', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(page()));

    render(<ActivityFeed />);

    expect(await screen.findByText(/trick vetting updated/i)).toBeInTheDocument();
    const row = screen.getByRole('listitem');
    expect(within(row).getByText('Staff One')).toBeInTheDocument();
    expect(within(row).getByText('Trick')).toBeInTheDocument();
    expect(within(row).getByText('trick-1')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/showing 1–1 of 30/i);

    const [url] = vi.mocked(fetch).mock.calls[0] as [string];
    expect(url).toBe('/api/admin/ops/activity?limit=25&offset=0');
  });

  it('pages forward with the next offset', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(page()))
      .mockResolvedValueOnce(
        jsonResponse(
          page({
            offset: 25,
            hasMore: false,
            items: [
              {
                id: 'act-26',
                action: 'fact.review.updated',
                targetType: 'Fact',
                targetId: 'fact-9',
                occurredAt: '2026-01-01T09:00:00.000Z',
                actor: null,
              },
            ],
          }),
        ),
      );

    render(<ActivityFeed />);
    const next = await screen.findByRole('button', { name: /next/i });
    fireEvent.click(next);

    await waitFor(() => expect(screen.getByText(/fact review updated/i)).toBeInTheDocument());
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();

    const [secondUrl] = vi.mocked(fetch).mock.calls[1] as [string];
    expect(secondUrl).toBe('/api/admin/ops/activity?limit=25&offset=25');
    expect(navigation.replace).toHaveBeenCalledWith('/admin/activity?offset=25', {
      scroll: false,
    });
  });

  it('shows an empty state when there is no activity', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(page({ items: [], total: 0, hasMore: false })));

    render(<ActivityFeed />);

    expect(await screen.findByText(/no recent activity/i)).toBeInTheDocument();
  });

  it('surfaces a load failure with a retry action', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ message: 'Activity unavailable.' }, 503, 'Service Unavailable'),
    );

    render(<ActivityFeed />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Activity unavailable.');
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
