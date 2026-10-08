import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PreviewPanel } from '@/components/trick/preview-panel';
import { preview } from '@/test/fixtures';

function jsonResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

describe('PreviewPanel', () => {
  beforeEach(() => {
    document.cookie = 'csrf=test-csrf';
  });

  it('previews the selected tier from saved server content', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(preview({ wording: 'Saved wording', scenario: 'Saved scenario' })),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<PreviewPanel trickId="trick-1" ageTier="FORMATIVE" tierLabel="Formative" />);
    fireEvent.click(screen.getByRole('button', { name: /Preview saved Formative/ }));

    expect(await screen.findByTestId('preview-content')).toHaveTextContent('Saved wording');
    expect(screen.getByTestId('preview-content')).toHaveTextContent('Saved scenario');
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('/api/studio/tricks/trick-1/preview?ageTier=FORMATIVE');
  });

  it('explains when the selected tier has no saved content', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: 'Not found' }, 404, 'Not Found'));
    vi.stubGlobal('fetch', fetchMock);

    render(<PreviewPanel trickId="trick-1" ageTier="MATURE" tierLabel="Mature" />);
    fireEvent.click(screen.getByRole('button', { name: /Preview saved Mature/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No saved mature content yet.');
  });
});
