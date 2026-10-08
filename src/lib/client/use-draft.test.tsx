import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDraft } from '@/lib/client/use-draft';

interface Value {
  text: string;
}

interface HarnessProps {
  persist: (value: Value) => Promise<void>;
  retryDelaysMs?: number[];
  storageKey?: string;
  serverText?: string;
}

function Harness({
  persist,
  retryDelaysMs = [300, 600, 1200],
  storageKey = 'draft-key',
  serverText = 'server value',
}: HarnessProps) {
  const draft = useDraft<Value, Value>({
    storageKey,
    serverValue: { text: serverText },
    toValue: (value) => value,
    persist,
    retryDelaysMs,
  });

  return (
    <div>
      <span data-testid="status">{draft.status}</span>
      <span data-testid="value">{draft.value.text}</span>
      <span data-testid="dirty">{String(draft.isDirty)}</span>
      <span data-testid="restored">{String(draft.restored)}</span>
      <button type="button" onClick={() => draft.setValue({ text: 'local edit' })}>
        edit
      </button>
      <button type="button" onClick={draft.save}>
        save
      </button>
      <button type="button" onClick={draft.discard}>
        discard
      </button>
    </div>
  );
}

describe('useDraft (D-021)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists edits locally and never discards them on failure, then retries', async () => {
    const persist = vi
      .fn<(value: Value) => Promise<void>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined);

    render(<Harness persist={persist} />);

    fireEvent.click(screen.getByText('edit'));
    expect(screen.getByTestId('value')).toHaveTextContent('local edit');
    expect(localStorage.getItem('draft-key')).toContain('local edit');

    fireEvent.click(screen.getByText('save'));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('error'));
    expect(screen.getByTestId('value')).toHaveTextContent('local edit');
    expect(localStorage.getItem('draft-key')).toContain('local edit');

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('saved'), {
      timeout: 3000,
    });
    expect(persist).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('draft-key')).toBeNull();
  });

  it('restores an unsaved local draft on reload and marks it dirty', async () => {
    localStorage.setItem('draft-key', JSON.stringify({ text: 'restored edit' }));
    const persist = vi.fn<(value: Value) => Promise<void>>().mockResolvedValue(undefined);

    render(<Harness persist={persist} serverText="fresh server value" />);

    await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('restored edit'));
    expect(screen.getByTestId('restored')).toHaveTextContent('true');
    expect(screen.getByTestId('dirty')).toHaveTextContent('true');
  });

  it('discards a local draft only on explicit request, reverting to server data', async () => {
    localStorage.setItem('draft-key', JSON.stringify({ text: 'restored edit' }));
    const persist = vi.fn<(value: Value) => Promise<void>>().mockResolvedValue(undefined);

    render(<Harness persist={persist} serverText="fresh server value" />);
    await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('restored edit'));

    fireEvent.click(screen.getByText('discard'));

    expect(screen.getByTestId('value')).toHaveTextContent('fresh server value');
    expect(localStorage.getItem('draft-key')).toBeNull();
  });
});
