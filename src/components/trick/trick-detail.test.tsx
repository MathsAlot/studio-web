import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TrickDetailView } from '@/components/trick/trick-detail';
import { TooltipProvider } from '@/components/ui/tooltip';
import { capabilities, trickDetail, variant, worldSummary } from '@/test/fixtures';

function jsonResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

function renderView(
  props: Partial<Parameters<typeof TrickDetailView>[0]> = {},
): ReturnType<typeof render> {
  return render(
    <TooltipProvider>
      <TrickDetailView
        trick={trickDetail()}
        world={null}
        capabilities={capabilities()}
        {...props}
      />
    </TooltipProvider>,
  );
}

describe('TrickDetailView', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = 'csrf=test-csrf';
  });

  it('disables structure and content fields without the matching grants', () => {
    renderView({
      capabilities: capabilities({ canWriteStructure: false, canWriteContent: false }),
    });

    expect(screen.getByLabelText('Name')).toBeDisabled();
    expect(screen.getByLabelText('Kind')).toBeDisabled();
    expect(screen.getByLabelText('Method description')).toBeDisabled();
    expect(screen.getAllByText(/Read-only: you do not hold/).length).toBeGreaterThan(0);
  });

  it('uses a tabbed editor instead of per-section save buttons', () => {
    renderView();

    expect(screen.getByRole('tab', { name: 'Content' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Structure' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Preview' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save structure' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save content' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Name')).not.toBeDisabled();
  });

  it('keeps every panel mounted but only shows the active one', () => {
    renderView();

    const panels = ['Content', 'Structure', 'Preview'].map((name) => {
      const tab = screen.getByRole('tab', { name });
      return document.getElementById(tab.getAttribute('aria-controls') ?? '');
    });
    expect(panels.every(Boolean)).toBe(true);
    expect(panels.filter((panel) => panel?.getAttribute('data-state') === 'active')).toHaveLength(
      1,
    );
    // Inactive panels stay mounted (drafts survive) but are hidden via CSS.
    for (const panel of panels) {
      expect(panel).toHaveClass('data-[state=inactive]:hidden');
    }
    expect(document.getElementById('trick-name')).toBeInTheDocument();
  });

  it('shows the readiness rail with the publication requirements', () => {
    renderView();

    expect(screen.getByRole('heading', { name: 'Ready to publish?' })).toBeInTheDocument();
    expect(screen.getByText('All three age tiers present')).toBeInTheDocument();
    expect(screen.getByText('Vetting Verified')).toBeInTheDocument();
    expect(screen.getByText('Review Approved')).toBeInTheDocument();
    expect(screen.getByText('AI draft approved')).toBeInTheDocument();
  });

  it('flags unapproved AI-drafted content explicitly', () => {
    renderView({ trick: trickDetail({ draftSource: 'AI', reviewStatus: 'NEEDS_REVIEW' }) });

    expect(screen.getByRole('alert')).toHaveTextContent(
      /AI-drafted content is held from publication/,
    );
  });

  it('summarises dirty sections in the single action bar', async () => {
    renderView();

    expect(screen.queryByRole('button', { name: 'Save all' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New name' } });
    expect(await screen.findByText(/Unsaved changes in 1 section/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Method description'), { target: { value: 'New' } });
    expect(await screen.findByText(/Unsaved changes in 2 sections/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save all' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discard all' })).toBeInTheDocument();
  });

  it('reveals a hidden tab and focuses the first invalid field before saving everything', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderView();

    // The Structure panel is not the active tab when the invalid field is edited.
    expect(screen.getByRole('tab', { name: 'Content' })).toHaveAttribute('aria-selected', 'true');

    const name = screen.getByLabelText('Name');
    fireEvent.change(name, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save all' }));

    expect(screen.getByText('Enter a Trick name.')).toBeInTheDocument();
    const structureTab = screen.getByRole('tab', { name: 'Structure' });
    expect(structureTab).toHaveAttribute('aria-selected', 'true');
    const structurePanel = document.getElementById(
      structureTab.getAttribute('aria-controls') ?? '',
    );
    expect(structurePanel).toHaveAttribute('data-state', 'active');
    await waitFor(() => expect(name).toHaveFocus());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reveals a non-selected age tier when its variant fails validation (F-09)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderView({
      trick: trickDetail({
        variants: [
          variant({ id: 'v1', ageTier: 'FORMATIVE' }),
          variant({
            id: 'v2',
            ageTier: 'MIDRANGE',
            wording: 'Mid wording',
            scenario: 'Mid scenario',
          }),
          variant({
            id: 'v3',
            ageTier: 'MATURE',
            wording: 'Mat wording',
            scenario: 'Mat scenario',
          }),
        ],
      }),
    });

    // FORMATIVE is selected by default; the MIDRANGE panel is hidden.
    expect(screen.getByRole('tab', { name: 'Formative' })).toHaveAttribute('aria-selected', 'true');
    const midWording = document.getElementById('wording-MIDRANGE') as HTMLTextAreaElement;
    expect(midWording).toBeInTheDocument();
    expect(midWording.closest('[hidden]')).not.toBeNull();

    fireEvent.change(midWording, { target: { value: '' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Save all' }));

    expect(await screen.findByText('Enter the tier wording.')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Midrange' })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
    expect(midWording.closest('[hidden]')).toBeNull();
    await waitFor(() => expect(midWording).toHaveFocus());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('focuses the method when only the content section is invalid', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderView();

    const method = screen.getByLabelText('Method description');
    fireEvent.change(method, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save all' }));

    expect(screen.getByText('Describe the method.')).toBeInTheDocument();
    await waitFor(() => expect(method).toHaveFocus());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('persists every dirty section with Save all', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(trickDetail()));
    vi.stubGlobal('fetch', fetchMock);
    renderView();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Renamed Trick' } });
    fireEvent.change(screen.getByLabelText('Method description'), {
      target: { value: 'Updated method' },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Save all' }));

    expect(await screen.findByText('All changes saved.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const bodies = fetchMock.mock.calls.map(
      ([, init]) => JSON.parse(String((init as RequestInit).body)) as Record<string, unknown>,
    );
    expect(bodies).toContainEqual({ name: 'Renamed Trick', kind: 'STANDARD' });
    expect(bodies).toContainEqual({ methodDescription: 'Updated method', workedExample: null });
  });

  it('clears every dirty draft with Discard all', async () => {
    renderView();

    const name = screen.getByLabelText('Name');
    fireEvent.change(name, { target: { value: 'Throwaway' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Discard all' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Discard drafts' }));

    expect(name).toHaveValue('Basic Addition');
    expect(screen.queryByRole('button', { name: 'Save all' })).not.toBeInTheDocument();
  });

  it('offers a compact position control that links to the World for full ordering', () => {
    renderView({ world: worldSummary() });

    expect(screen.getByText(/Position 1 in Addition/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Reorder in Addition/ })).toHaveAttribute(
      'href',
      '/worlds/world-1',
    );
  });
});
