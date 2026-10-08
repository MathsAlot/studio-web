import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrickOrderList } from '@/components/trick/trick-order-list';
import { trickSummary } from '@/test/fixtures';

function jsonResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

const tricks = [
  trickSummary({ id: 'trick-1', name: 'Basic Addition', position: 1 }),
  trickSummary({ id: 'trick-2', name: 'Carrying', position: 2, kind: 'CAPSTONE' }),
];

describe('TrickOrderList', () => {
  beforeEach(() => {
    document.cookie = 'csrf=test-csrf';
  });

  it('reorders Tricks with an explicit ordered id array', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ orderedIds: ['trick-2', 'trick-1'] }));
    vi.stubGlobal('fetch', fetchMock);

    render(<TrickOrderList worldId="world-1" initialTricks={tricks} canReorder />);

    fireEvent.click(screen.getByRole('button', { name: 'Move Carrying up' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/studio/worlds/world-1/tricks/order');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toEqual({ orderedIds: ['trick-2', 'trick-1'] });

    const links = screen.getAllByRole('link', { name: /Basic Addition|Carrying/ });
    expect(links[0]).toHaveAccessibleName(/Carrying/);
  });

  it('hides move controls when the user cannot reorder', () => {
    render(<TrickOrderList worldId="world-1" initialTricks={tricks} canReorder={false} />);

    expect(screen.queryByRole('button', { name: /Move .* up/ })).not.toBeInTheDocument();
  });

  it('shows an alert and keeps the server order when reordering fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ message: 'Missing permission: world.structure.write' }, 403, 'Forbidden'),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<TrickOrderList worldId="world-1" initialTricks={tricks} canReorder />);
    fireEvent.click(screen.getByRole('button', { name: 'Move Carrying up' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Missing permission: world.structure.write',
    );
    const links = screen.getAllByRole('link', { name: /Basic Addition|Carrying/ });
    expect(links[0]).toHaveAccessibleName(/Basic Addition/);
  });
});
