import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NittyGrittyInsertionEditor } from '@/components/nitty-gritty/nitty-gritty-insertion-editor';
import { factDetail, familyDetail, familySummary, insertion } from '@/test/fixtures';

function jsonResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

function routedFetch(overrides: { put?: () => Promise<Response> } = {}) {
  return vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (url.includes('/sequences/sequence-1/insertions')) {
      if (method === 'PUT') {
        return overrides.put?.() ?? Promise.resolve(jsonResponse([insertion()]));
      }
      return Promise.resolve(jsonResponse([insertion()]));
    }
    if (url.endsWith('/api/studio/families')) {
      return Promise.resolve(
        jsonResponse([familySummary({ id: 'family-1', name: 'Doubles', factCount: 2 })]),
      );
    }
    if (url.includes('/api/studio/families/family-1')) {
      return Promise.resolve(
        jsonResponse(
          familyDetail({
            id: 'family-1',
            facts: [
              factDetail({ id: 'fact-1', factText: '2 + 3' }),
              factDetail({ id: 'fact-2', factText: '4 + 5' }),
            ],
          }),
        ),
      );
    }
    return Promise.resolve(jsonResponse({}, 404, 'Not Found'));
  });
}

async function openEditor() {
  fireEvent.click(screen.getByRole('button', { name: 'Manage Nitty Gritty insertions' }));
  expect(await screen.findByText(/2 \+ 3/)).toBeInTheDocument();
}

describe('NittyGrittyInsertionEditor', () => {
  beforeEach(() => {
    document.cookie = 'csrf=test-csrf';
    localStorage.clear();
  });

  it('loads insertions on demand and replaces them with gap-free positions', async () => {
    const fetchMock = routedFetch({
      put: () =>
        Promise.resolve(
          jsonResponse([
            insertion(),
            insertion({
              id: 'insertion-2',
              factId: 'fact-2',
              insertionType: 'alongside',
              position: 2,
            }),
          ]),
        ),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <NittyGrittyInsertionEditor sequenceId="sequence-1" canWriteSequence retryDelaysMs={[]} />,
    );
    await openEditor();

    fireEvent.change(
      screen.getByLabelText('Fact', { selector: '#add-insertion-fact-sequence-1' }),
      {
        target: { value: 'fact-2' },
      },
    );
    fireEvent.change(
      screen.getByLabelText('Insertion type', { selector: '#add-insertion-type-sequence-1' }),
      { target: { value: 'alongside' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add insertion' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save insertions' }));

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
      expect(putCall).toBeDefined();
    });
    const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    const [url, init] = putCall as [string, RequestInit];
    expect(url).toBe('/api/studio/sequences/sequence-1/insertions');
    expect(JSON.parse(String(init.body))).toEqual({
      insertions: [
        { factId: 'fact-1', insertionType: 'gating', position: 1 },
        { factId: 'fact-2', insertionType: 'alongside', position: 2 },
      ],
    });
  });

  it('exposes an ordered read-only list without sequence.write', async () => {
    const fetchMock = routedFetch();
    vi.stubGlobal('fetch', fetchMock);

    render(
      <NittyGrittyInsertionEditor
        sequenceId="sequence-1"
        canWriteSequence={false}
        retryDelaysMs={[]}
      />,
    );
    await openEditor();

    expect(screen.queryByRole('button', { name: 'Save insertions' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add insertion' })).not.toBeInTheDocument();
    expect(
      screen.getByLabelText('Insertion type', { selector: '#insertion-type-sequence-1-fact-1' }),
    ).toBeDisabled();
    expect(screen.getAllByText(/Read-only: you do not hold/).length).toBeGreaterThan(0);
  });
});
