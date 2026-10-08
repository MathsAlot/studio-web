import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VariantEditor } from '@/components/trick/variant-editor';
import { completeness, trickDetail } from '@/test/fixtures';

function jsonResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

describe('VariantEditor', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = 'csrf=test-csrf';
  });

  it('warns about a missing tier and saves it via the variant endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(trickDetail()));
    vi.stubGlobal('fetch', fetchMock);

    const trick = trickDetail({
      variants: [],
      completeness: completeness({
        variantCount: 2,
        missingTiers: ['FORMATIVE'],
        isComplete: false,
      }),
    });

    render(<VariantEditor trick={trick} ageTier="FORMATIVE" canWriteContent />);

    expect(screen.getByText(/This tier is missing/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Wording'), { target: { value: 'New wording' } });
    fireEvent.change(screen.getByLabelText('Scenario'), { target: { value: 'New scenario' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save tier' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/studio/tricks/trick-1/variants/FORMATIVE');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toEqual({
      wording: 'New wording',
      scenario: 'New scenario',
      readingLevel: null,
    });
    expect(await screen.findByText(/All changes saved/)).toBeInTheDocument();
  });

  it('saves a selected reading-level grade band instead of free text', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(trickDetail()));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <VariantEditor trick={trickDetail({ variants: [] })} ageTier="FORMATIVE" canWriteContent />,
    );

    fireEvent.change(screen.getByLabelText('Wording'), { target: { value: 'New wording' } });
    fireEvent.change(screen.getByLabelText('Scenario'), { target: { value: 'New scenario' } });
    fireEvent.change(screen.getByLabelText('Reading level'), { target: { value: '2-3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save tier' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/studio/tricks/trick-1/variants/FORMATIVE');
    expect(JSON.parse(String(init.body))).toMatchObject({
      wording: 'New wording',
      scenario: 'New scenario',
      readingLevel: '2-3',
    });
  });

  it('restores an unsaved variant draft on reload (concurrent-edit recovery)', async () => {
    localStorage.setItem(
      'studio:draft:variant:trick-1:FORMATIVE',
      JSON.stringify({
        wording: 'Restored wording',
        scenario: 'Restored scenario',
        readingLevel: '',
      }),
    );
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<VariantEditor trick={trickDetail()} ageTier="FORMATIVE" canWriteContent />);

    await waitFor(() => expect(screen.getByLabelText('Wording')).toHaveValue('Restored wording'));
    expect(screen.getByLabelText('Scenario')).toHaveValue('Restored scenario');
    expect(screen.getByText(/Restored an unsaved draft/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows inline errors and focuses the first invalid field before saving', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<VariantEditor trick={trickDetail()} ageTier="FORMATIVE" canWriteContent />);

    const wording = screen.getByLabelText('Wording');
    fireEvent.change(wording, { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Scenario'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save tier' }));

    expect(screen.getByText('Enter the tier wording.')).toBeInTheDocument();
    expect(screen.getByText('Enter the tier scenario.')).toBeInTheDocument();
    expect(wording).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renders read-only without trick.content.write', () => {
    render(<VariantEditor trick={trickDetail()} ageTier="FORMATIVE" canWriteContent={false} />);

    expect(screen.getByLabelText('Wording')).toBeDisabled();
    expect(screen.getByLabelText('Scenario')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save tier' })).not.toBeInTheDocument();
    expect(screen.getByText(/Read-only: you do not hold/)).toBeInTheDocument();
  });
});
