import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CurriculumBuilder } from '@/components/curriculum/curriculum-builder';
import { capabilities, curriculumDetail, sequenceDetail, trickSummary } from '@/test/fixtures';

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

describe('CurriculumBuilder', () => {
  beforeEach(() => {
    document.cookie = 'csrf=test-csrf';
    localStorage.clear();
  });

  it('renders server-computed completeness and missing items without inferring readiness', () => {
    const sequence = sequenceDetail({
      id: 'sequence-1',
      name: 'First steps',
      objective: '',
      difficultyDescription: null,
      tricks: [],
      completion: {
        assignmentCount: 0,
        introduceCount: 0,
        retainCount: 0,
        revisitCount: 0,
        isComplete: false,
      },
    });
    const curriculum = curriculumDetail({ sequences: [sequence] });

    render(
      <CurriculumBuilder
        worldId="world-1"
        curriculum={curriculum}
        worldTricks={worldTricks}
        capabilities={capabilities()}
      />,
    );

    expect(screen.getByTestId('curriculum-completeness')).toHaveTextContent('100% complete');
    expect(screen.getByRole('heading', { name: '1. First steps' })).toBeInTheDocument();
    const sequenceCompleteness = screen.getByTestId('sequence-completeness');
    expect(sequenceCompleteness).toHaveTextContent('Incomplete');
    expect(sequenceCompleteness).toHaveTextContent(
      'Missing: objective, difficulty description, Trick assignments',
    );
  });

  it('reorders Sequences using an explicit ordered id array', async () => {
    const first = sequenceDetail({ id: 'sequence-1', name: 'First steps', sequenceNumber: 1 });
    const second = sequenceDetail({ id: 'sequence-2', name: 'Second steps', sequenceNumber: 2 });
    const curriculum = curriculumDetail({ sequences: [first, second] });

    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ orderedIds: ['sequence-2', 'sequence-1'] }));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <CurriculumBuilder
        worldId="world-1"
        curriculum={curriculum}
        worldTricks={worldTricks}
        capabilities={capabilities()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Move Sequence Second steps up' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/studio/curriculums/curriculum-1/sequences/order');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toEqual({
      orderedIds: ['sequence-2', 'sequence-1'],
    });
  });

  it('creates a Sequence with the next server number', async () => {
    const created = sequenceDetail({ id: 'sequence-2', name: 'Second steps', sequenceNumber: 2 });
    const refreshed = curriculumDetail({ sequences: [sequenceDetail(), created] });

    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return Promise.resolve(jsonResponse(created, 201, 'Created'));
      }
      if (String(url).includes('/curriculums/curriculum-1')) {
        return Promise.resolve(jsonResponse(refreshed));
      }
      return Promise.resolve(jsonResponse({}, 404, 'Not Found'));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <CurriculumBuilder
        worldId="world-1"
        curriculum={curriculumDetail()}
        worldTricks={worldTricks}
        capabilities={capabilities()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name', { selector: '#new-sequence-name' }), {
      target: { value: 'Second steps' },
    });
    fireEvent.change(screen.getByLabelText('Objective', { selector: '#new-sequence-objective' }), {
      target: { value: 'Extend to carrying' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Sequence' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/studio/curriculums/curriculum-1/sequences');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toMatchObject({
      name: 'Second steps',
      objective: 'Extend to carrying',
      status: 'DRAFT',
    });
    expect(await screen.findByText(/Added Sequence/)).toBeInTheDocument();
  });

  it('saves the Curriculum version as a v-prefixed string from the structured control', async () => {
    const updated = curriculumDetail({ version: 'v2' });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(updated));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <CurriculumBuilder
        worldId="world-1"
        curriculum={curriculumDetail()}
        worldTricks={worldTricks}
        capabilities={capabilities()}
      />,
    );

    const versionInput = screen.getByLabelText('Version');
    expect(versionInput).toHaveValue('1');

    fireEvent.change(versionInput, { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Curriculum' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/studio/curriculums/curriculum-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body))).toMatchObject({ version: 'v2' });
  });

  it('blocks saving an invalid version, shows the inline error, and focuses the field', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(
      <CurriculumBuilder
        worldId="world-1"
        curriculum={curriculumDetail()}
        worldTricks={worldTricks}
        capabilities={capabilities()}
      />,
    );

    const versionInput = screen.getByLabelText('Version');
    fireEvent.change(versionInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Curriculum' }));

    expect(await screen.findByText('Enter a version.')).toBeInTheDocument();
    expect(versionInput).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('hides and disables write controls without curriculum/sequence grants', () => {
    render(
      <CurriculumBuilder
        worldId="world-1"
        curriculum={curriculumDetail()}
        worldTricks={worldTricks}
        capabilities={capabilities({ canWriteCurriculum: false, canWriteSequence: false })}
      />,
    );

    expect(screen.getByLabelText('Name', { selector: '#edit-curriculum-name' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save Curriculum' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create Sequence' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Move Sequence/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save assignments' })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Read-only: you do not hold/).length).toBeGreaterThan(0);
  });
});
