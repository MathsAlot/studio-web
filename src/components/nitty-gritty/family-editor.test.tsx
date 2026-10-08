import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FamilyEditor } from '@/components/nitty-gritty/family-editor';
import { defaultFactTypes, factDetail, familyDetail, worldSummary } from '@/test/fixtures';

function jsonResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

const worlds = [worldSummary({ id: 'world-1', name: 'Addition' })];
const factTypes = defaultFactTypes();

describe('FamilyEditor', () => {
  beforeEach(() => {
    document.cookie = 'csrf=test-csrf';
    localStorage.clear();
  });

  it('switches between bound and trigger World selectors with the Family type', () => {
    render(
      <FamilyEditor
        family={familyDetail()}
        worlds={worlds}
        factTypes={factTypes}
        canManageFamily
        retryDelaysMs={[]}
      />,
    );

    expect(screen.getByLabelText('Bound World')).toBeInTheDocument();
    expect(screen.queryByLabelText('Trigger World')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'GLOBAL' } });

    expect(screen.getByLabelText('Trigger World')).toBeInTheDocument();
    expect(screen.queryByLabelText('Bound World')).not.toBeInTheDocument();
  });

  it('hides the Fact number range for a Global Family', () => {
    render(
      <FamilyEditor
        family={familyDetail({ type: 'GLOBAL', boundWorldId: null, triggerWorldId: 'world-1' })}
        worlds={worlds}
        factTypes={factTypes}
        canManageFamily
        retryDelaysMs={[]}
      />,
    );

    expect(screen.queryByLabelText('Number range minimum')).not.toBeInTheDocument();
    expect(screen.getByText(/Global Families never set a number range/)).toBeInTheDocument();
  });

  it('saves Family metadata with a PATCH including the correct binding', async () => {
    const updated = familyDetail({ name: 'Renamed' });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(updated));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FamilyEditor
        family={familyDetail()}
        worlds={worlds}
        factTypes={factTypes}
        canManageFamily
        retryDelaysMs={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Renamed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Family' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/studio/families/family-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body))).toEqual({
      name: 'Renamed',
      type: 'WORLD_BOUND',
      boundWorldId: 'world-1',
      triggerWorldId: null,
      recurrenceInitialInterval: 3,
      recurrenceGrowthFactor: 2,
      instantRecallThresholdMs: 2000,
    });
  });

  it('shows a server invariant error inline and preserves the draft', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ message: 'GLOBAL Families require a trigger World' }, 400, 'Bad Request'),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FamilyEditor
        family={familyDetail()}
        worlds={worlds}
        factTypes={factTypes}
        canManageFamily
        retryDelaysMs={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Renamed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Family' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/GLOBAL Families require a trigger World/);
    expect(screen.getByLabelText('Name')).toHaveValue('Renamed');
    expect(localStorage.getItem('studio:draft:family:family-1')).toContain('Renamed');
  });

  it('reorders Facts with an explicit ordered id array', async () => {
    const family = familyDetail({
      facts: [
        factDetail({ id: 'fact-1', order: 1, factText: 'First' }),
        factDetail({ id: 'fact-2', order: 2, factText: 'Second' }),
      ],
    });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ orderedIds: ['fact-2', 'fact-1'] }));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FamilyEditor
        family={family}
        worlds={worlds}
        factTypes={factTypes}
        canManageFamily
        retryDelaysMs={[]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Move Fact Second up' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/studio/families/family-1/facts/order');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toEqual({ orderedIds: ['fact-2', 'fact-1'] });
  });

  it('renders read-only without family.manage', () => {
    render(
      <FamilyEditor
        family={familyDetail()}
        worlds={worlds}
        factTypes={factTypes}
        canManageFamily={false}
        retryDelaysMs={[]}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Save Family' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create Fact' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Move Fact/ })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Read-only: you do not hold/).length).toBeGreaterThan(0);
  });
});
