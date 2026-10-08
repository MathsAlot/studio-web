import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssignmentEditor } from '@/components/curriculum/assignment-editor';
import { SequenceEditor } from '@/components/curriculum/sequence-editor';
import { sequenceDetail, sequenceTrick, trickSummary } from '@/test/fixtures';

function jsonResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

const worldTricks = [
  trickSummary({ id: 'trick-1', name: 'Basic Addition', position: 1 }),
  trickSummary({ id: 'trick-2', name: 'Carrying', position: 2 }),
];

describe('SequenceEditor', () => {
  beforeEach(() => {
    document.cookie = 'csrf=test-csrf';
    localStorage.clear();
  });

  it('saves Sequence metadata with a PATCH', async () => {
    const updated = sequenceDetail({ name: 'Renamed steps' });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(updated));
    vi.stubGlobal('fetch', fetchMock);
    const onSaved = vi.fn();

    render(
      <SequenceEditor
        sequence={sequenceDetail()}
        worldTricks={worldTricks}
        canWriteSequence
        onSaved={onSaved}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Renamed steps' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Sequence' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/studio/sequences/sequence-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body))).toEqual({
      name: 'Renamed steps',
      objective: 'Introduce Basic Addition',
      difficultyDescription: 'Single digit addition',
      status: 'DRAFT',
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(updated));
  });

  it('retries a failed Sequence save without discarding input', async () => {
    const updated = sequenceDetail({ name: 'Renamed steps' });
    let calls = 0;
    const fetchMock = vi.fn(() => {
      calls += 1;
      if (calls === 1) {
        return Promise.reject(new Error('offline'));
      }
      return Promise.resolve(jsonResponse(updated));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <SequenceEditor
        sequence={sequenceDetail()}
        worldTricks={worldTricks}
        canWriteSequence
        onSaved={vi.fn()}
        retryDelaysMs={[500]}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Renamed steps' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Sequence' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Retrying automatically; your input is preserved/);
    expect(screen.getByLabelText('Name')).toHaveValue('Renamed steps');
    expect(localStorage.getItem('studio:draft:sequence:sequence-1')).toContain('Renamed steps');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), { timeout: 3000 });
    expect(await screen.findByText(/All changes saved/)).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Renamed steps');
    expect(localStorage.getItem('studio:draft:sequence:sequence-1')).toBeNull();
  });

  it('shows an inline error and focuses the name before saving', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(
      <SequenceEditor
        sequence={sequenceDetail()}
        worldTricks={worldTricks}
        canWriteSequence
        onSaved={vi.fn()}
      />,
    );

    const name = screen.getByLabelText('Name');
    fireEvent.change(name, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Sequence' }));

    expect(screen.getByText('Enter a Sequence name.')).toBeInTheDocument();
    expect(name).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('AssignmentEditor', () => {
  beforeEach(() => {
    document.cookie = 'csrf=test-csrf';
    localStorage.clear();
  });

  it('sets the ordered Trick role list with gap-free positions', async () => {
    const sequence = sequenceDetail({
      tricks: [sequenceTrick({ id: 'a1', trickId: 'trick-1', role: 'INTRODUCE', position: 1 })],
    });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(sequence));
    vi.stubGlobal('fetch', fetchMock);
    const onSaved = vi.fn();

    render(
      <AssignmentEditor
        sequence={sequence}
        worldTricks={worldTricks}
        canWriteSequence
        onSaved={onSaved}
      />,
    );

    fireEvent.change(screen.getByLabelText('Trick', { selector: '#add-trick-sequence-1' }), {
      target: { value: 'trick-2' },
    });
    fireEvent.change(screen.getByLabelText('Role', { selector: '#add-role-sequence-1' }), {
      target: { value: 'RETAIN' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add role assignment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save assignments' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/studio/sequences/sequence-1/tricks');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toEqual({
      tricks: [
        { trickId: 'trick-1', role: 'INTRODUCE', position: 1 },
        { trickId: 'trick-2', role: 'RETAIN', position: 2 },
      ],
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(sequence));
  });

  it('exposes role controls read-only without sequence.write', () => {
    const sequence = sequenceDetail();
    render(
      <AssignmentEditor
        sequence={sequence}
        worldTricks={worldTricks}
        canWriteSequence={false}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Add role assignment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save assignments' })).not.toBeInTheDocument();
    expect(screen.getByText(/Read-only: you do not hold/)).toBeInTheDocument();
  });
});
