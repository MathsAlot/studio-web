import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FactEditor } from '@/components/nitty-gritty/fact-editor';
import { defaultFactTypes, factDetail } from '@/test/fixtures';

function jsonResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

const factTypes = defaultFactTypes();

describe('FactEditor', () => {
  beforeEach(() => {
    document.cookie = 'csrf=test-csrf';
    localStorage.clear();
  });

  it('renders structured fields from the selected factType', () => {
    render(
      <FactEditor
        fact={factDetail()}
        familyType="WORLD_BOUND"
        factTypes={factTypes}
        canManageFamily
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('operation')).toHaveValue('+');
    expect(screen.getByLabelText('a')).toBeInTheDocument();
    expect(screen.getByLabelText('b')).toBeInTheDocument();
    expect(screen.getByLabelText('answer')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Fact type'), { target: { value: 'equivalence' } });
    expect(screen.getByLabelText('value')).toBeInTheDocument();
    expect(screen.getByLabelText('equivalents')).toBeInTheDocument();
    expect(screen.queryByLabelText('operation')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Fact type'), { target: { value: 'calendar' } });
    expect(screen.getByLabelText('prompt')).toBeInTheDocument();
    expect(screen.getByLabelText('answer')).toBeInTheDocument();
    expect(screen.queryByLabelText('value')).not.toBeInTheDocument();
  });

  it('saves typed data and the World-bound range with a PATCH', async () => {
    const updated = factDetail({ factText: '6 * 7 = 42' });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(updated));
    vi.stubGlobal('fetch', fetchMock);
    const onSaved = vi.fn();

    render(
      <FactEditor
        fact={factDetail()}
        familyType="WORLD_BOUND"
        factTypes={factTypes}
        canManageFamily
        onSaved={onSaved}
      />,
    );

    fireEvent.change(screen.getByLabelText('operation'), { target: { value: '*' } });
    fireEvent.change(screen.getByLabelText('a'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('b'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('answer'), { target: { value: '42' } });
    fireEvent.change(screen.getByLabelText('Display text'), { target: { value: '6 * 7 = 42' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Fact' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/studio/facts/fact-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body))).toEqual({
      factType: 'operation',
      data: { operation: '*', a: 6, b: 7, answer: 42 },
      factText: '6 * 7 = 42',
      gatingRequired: false,
      numberRangeMin: 1,
      numberRangeMax: 10,
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(updated));
  });

  it('shows a server invariant error inline and retries without discarding input', async () => {
    const updated = factDetail();
    let calls = 0;
    const fetchMock = vi.fn(() => {
      calls += 1;
      if (calls === 1) {
        return Promise.resolve(
          jsonResponse(
            { message: 'WORLD_BOUND Facts require both numberRangeMin and numberRangeMax' },
            400,
            'Bad Request',
          ),
        );
      }
      return Promise.resolve(jsonResponse(updated));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FactEditor
        fact={factDetail()}
        familyType="WORLD_BOUND"
        factTypes={factTypes}
        canManageFamily
        onSaved={vi.fn()}
        retryDelaysMs={[500]}
      />,
    );

    fireEvent.change(screen.getByLabelText('Display text'), { target: { value: 'Edited label' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Fact' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/WORLD_BOUND Facts require both numberRangeMin/);
    expect(screen.getByLabelText('Display text')).toHaveValue('Edited label');
    expect(localStorage.getItem('studio:draft:fact:fact-1')).toContain('Edited label');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), { timeout: 3000 });
    expect(await screen.findByText(/All changes saved/)).toBeInTheDocument();
    expect(screen.getByLabelText('Display text')).toHaveValue('Edited label');
  });

  it('validates required structured fields before sending', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(
      <FactEditor
        fact={factDetail()}
        familyType="WORLD_BOUND"
        factTypes={factTypes}
        canManageFamily
        onSaved={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('a'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Fact' }));

    expect(screen.getByText(/Enter a number for Left operand/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renders read-only without family.manage', () => {
    render(
      <FactEditor
        fact={factDetail()}
        familyType="WORLD_BOUND"
        factTypes={factTypes}
        canManageFamily={false}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Save Fact' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Display text')).toBeDisabled();
    expect(screen.getByText(/Read-only: you do not hold/)).toBeInTheDocument();
  });
});
