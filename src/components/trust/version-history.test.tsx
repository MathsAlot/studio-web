import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VersionHistory, type VersionEntry } from '@/components/trust/version-history';

const NOW = '2026-01-01T00:00:00.000Z';

const versions: VersionEntry[] = [
  { id: 'version-1', editedById: 'user-1', editedAt: NOW, snapshot: { name: 'Earlier' } },
  { id: 'version-2', editedById: 'user-2', editedAt: NOW, snapshot: { name: 'Latest' } },
];

function renderHistory(overrides: Partial<Parameters<typeof VersionHistory>[0]> = {}) {
  const load = vi.fn().mockResolvedValue({ ok: true, data: versions });
  const restore = vi.fn().mockResolvedValue({ ok: true, data: {} });
  const onRestored = vi.fn();
  render(
    <VersionHistory
      entityLabel="Trick"
      canRestore
      load={load}
      restore={restore}
      summarize={(snapshot) => String(snapshot.name ?? 'Snapshot')}
      onRestored={onRestored}
      {...overrides}
    />,
  );
  return { load, restore, onRestored };
}

describe('VersionHistory', () => {
  it('restores a revision after confirmation and reloads the history', async () => {
    const { load, restore, onRestored } = renderHistory();

    fireEvent.click(screen.getByRole('button', { name: 'Show history' }));
    expect(await screen.findByText('Earlier')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Restore' })[0]!);
    fireEvent.click(await screen.findByRole('button', { name: 'Restore revision' }));

    await waitFor(() => expect(restore).toHaveBeenCalledWith('version-1'));
    await waitFor(() => expect(onRestored).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/A new snapshot was added/)).toBeInTheDocument();
  });

  it('surfaces a restore failure', async () => {
    renderHistory({
      restore: vi.fn().mockResolvedValue({ ok: false, status: 409, message: 'Version missing.' }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Show history' }));
    await screen.findByText('Earlier');
    fireEvent.click(screen.getAllByRole('button', { name: 'Restore' })[0]!);
    fireEvent.click(await screen.findByRole('button', { name: 'Restore revision' }));

    expect(await screen.findByText('Version missing.')).toBeInTheDocument();
  });

  it('hides Restore without the grant', async () => {
    renderHistory({ canRestore: false });

    fireEvent.click(screen.getByRole('button', { name: 'Show history' }));
    await screen.findByText('Earlier');
    expect(screen.queryByRole('button', { name: 'Restore' })).not.toBeInTheDocument();
    expect(screen.getByText(/Restoring is view-only/)).toBeInTheDocument();
  });

  it('shows a load error', async () => {
    renderHistory({
      load: vi.fn().mockResolvedValue({ ok: false, status: 500, message: 'History unavailable.' }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Show history' }));
    expect(await screen.findByText('History unavailable.')).toBeInTheDocument();
  });
});
