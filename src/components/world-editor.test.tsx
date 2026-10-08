import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WorldEditor } from '@/components/world-editor';
import { capabilities, trickSummary, worldSummary } from '@/test/fixtures';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function jsonResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

describe('WorldEditor', () => {
  beforeEach(() => {
    document.cookie = 'csrf=test-csrf';
    localStorage.clear();
  });

  it('keeps the Trick list mounted across tab switches so an in-session reorder survives', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ orderedIds: ['trick-2', 'trick-1'] }));
    vi.stubGlobal('fetch', fetchMock);

    const world = worldSummary({
      tricks: [
        trickSummary({ id: 'trick-1', name: 'Basic Addition', position: 1 }),
        trickSummary({ id: 'trick-2', name: 'Carrying', position: 2, kind: 'CAPSTONE' }),
      ],
    });

    render(<WorldEditor world={world} capabilities={capabilities()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Move Carrying up' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(
      screen.getAllByRole('link', { name: /Basic Addition|Carrying/ })[0],
    ).toHaveAccessibleName(/Carrying/);

    fireEvent.click(screen.getByRole('tab', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Tricks' }));

    expect(
      screen.getAllByRole('link', { name: /Basic Addition|Carrying/ })[0],
    ).toHaveAccessibleName(/Carrying/);
  });

  it('saves World name and description with a PATCH', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(worldSummary()));
    vi.stubGlobal('fetch', fetchMock);

    render(<WorldEditor world={worldSummary()} capabilities={capabilities()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Settings' }));

    const name = screen.getByLabelText('Name', { selector: '#edit-world-name' });
    fireEvent.change(name, { target: { value: 'Renamed World' } });
    fireEvent.change(
      screen.getByLabelText('Description', { selector: '#edit-world-description' }),
      {
        target: { value: 'Updated description' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save World' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/studio/worlds/world-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body))).toEqual({
      name: 'Renamed World',
      description: 'Updated description',
    });
    expect(await screen.findByText('All changes saved.')).toBeInTheDocument();
  });

  it('restores an unsaved World draft on reload and keeps it until saved', async () => {
    localStorage.setItem(
      'studio:draft:world:world-1',
      JSON.stringify({ name: 'Restored World', description: 'Restored description' }),
    );
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<WorldEditor world={worldSummary()} capabilities={capabilities()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Settings' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Name', { selector: '#edit-world-name' })).toHaveValue(
        'Restored World',
      ),
    );
    expect(screen.getByText(/Restored an unsaved draft/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
