import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WorldList } from '@/components/world-list';
import { capabilities, worldSummary } from '@/test/fixtures';

function jsonResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

describe('WorldList', () => {
  beforeEach(() => {
    document.cookie = 'csrf=test-csrf';
  });

  it('renders Worlds with server rollup and completion', () => {
    render(
      <WorldList
        initialWorlds={[worldSummary({ description: 'Add numbers.' })]}
        capabilities={capabilities()}
      />,
    );

    const row = screen.getByRole('row', { name: /Addition/ });
    expect(within(row).getByText('Add numbers.')).toBeInTheDocument();
    expect(within(row).getByText('100%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Addition' })).toHaveAttribute(
      'href',
      '/worlds/world-1',
    );
  });

  it('hides create and reorder controls without the matching grants', () => {
    render(
      <WorldList
        initialWorlds={[worldSummary()]}
        capabilities={capabilities({ canWriteStructure: false, canReorderWorlds: false })}
      />,
    );

    expect(screen.queryByRole('button', { name: 'New World' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Move Addition up/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Read-only: you do not hold/)).toBeInTheDocument();
  });

  it('sends the explicit ordered id array when reordering Worlds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ orderedIds: ['world-2', 'world-1'] }));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <WorldList
        initialWorlds={[
          worldSummary({ id: 'world-1', name: 'Addition' }),
          worldSummary({ id: 'world-2', name: 'Subtraction', order: 2, tricks: [] }),
        ]}
        capabilities={capabilities()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Move Addition down' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/studio/worlds/order');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toEqual({ orderedIds: ['world-2', 'world-1'] });

    expect(await screen.findByText(/Reordered Worlds/)).toBeInTheDocument();
  });

  it('creates a World from a dialog rather than an always-open form', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(worldSummary({ id: 'world-2', name: 'Subtraction' })));
    vi.stubGlobal('fetch', fetchMock);

    render(<WorldList initialWorlds={[worldSummary()]} capabilities={capabilities()} />);

    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New World' }));
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Subtraction' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create World' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/studio/worlds');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ name: 'Subtraction' });
  });
});
