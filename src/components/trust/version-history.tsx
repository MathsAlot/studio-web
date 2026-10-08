'use client';

import { useState } from 'react';
import { History, Loader2, RotateCcw } from 'lucide-react';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import type { FactDetail, TrickDetail } from '@/lib/api-client';
import type { ClientResult } from '@/lib/client/http';
import { formatDateTime } from '@/lib/studio/nitty-gritty';

export interface VersionEntry {
  id: string;
  editedById: string;
  editedAt: string;
  snapshot: Record<string, unknown>;
}

interface VersionHistoryProps {
  entityLabel: string;
  canRestore: boolean;
  load: () => Promise<ClientResult<VersionEntry[]>>;
  restore: (versionId: string) => Promise<ClientResult<TrickDetail | FactDetail>>;
  summarize: (snapshot: Record<string, unknown>) => string;
  onRestored: () => void | Promise<void>;
}

interface VersionState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  versions: VersionEntry[];
  error?: string;
}

/**
 * Attributed snapshot history with restore (D-044). Restore always appends a
 * new audited revision; prior history is never erased, so the list is reloaded
 * after a successful restore and the caller refreshes the entity.
 */
export function VersionHistory({
  entityLabel,
  canRestore,
  load,
  restore,
  summarize,
  onRestored,
}: VersionHistoryProps) {
  const [state, setState] = useState<VersionState>({ status: 'idle', versions: [] });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadHistory() {
    setState({ status: 'loading', versions: [] });
    const result = await load();
    if (!result.ok) {
      setState({ status: 'error', versions: [], error: result.message });
      return;
    }
    setState({ status: 'ready', versions: result.data });
  }

  async function handleRestore(versionId: string) {
    setBusyId(versionId);
    setRestoreError(null);
    setNotice(null);
    const result = await restore(versionId);
    if (!result.ok) {
      setBusyId(null);
      setRestoreError(result.message);
      return;
    }
    await onRestored();
    setBusyId(null);
    setNotice('Restored that revision. A new snapshot was added to the history.');
    await loadHistory();
  }

  return (
    <div data-slot="version-history" className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-heading-2 font-semibold text-foreground">
          {entityLabel} version history
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void loadHistory()}
          disabled={state.status === 'loading'}
          aria-busy={state.status === 'loading'}
          data-action="show-history"
        >
          {state.status === 'loading' ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <History aria-hidden="true" />
          )}
          {state.status === 'ready' ? 'Refresh history' : 'Show history'}
        </Button>
      </div>

      {restoreError ? (
        <p role="alert" className="mt-3 text-body-sm text-danger">
          {restoreError}
        </p>
      ) : null}
      {notice ? (
        <p role="status" aria-live="polite" className="mt-3 text-body-sm text-success-foreground">
          {notice}
        </p>
      ) : null}
      {!canRestore ? (
        <p role="status" className="mt-2 text-body-sm text-muted-foreground">
          Restoring is view-only for your account.
        </p>
      ) : null}

      {state.status === 'error' ? (
        <p role="alert" className="mt-2 text-body-sm text-danger">
          {state.error}
        </p>
      ) : null}

      {state.status === 'ready' ? (
        state.versions.length === 0 ? (
          <p role="status" className="mt-2 text-body-sm text-muted-foreground">
            No revisions recorded yet.
          </p>
        ) : (
          <ol className="mt-3 space-y-1" aria-label={`${entityLabel} version history`}>
            {state.versions.map((version) => (
              <li
                key={version.id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border py-2 last:border-b-0"
              >
                <span className="min-w-0 break-words text-body-sm text-foreground">
                  {summarize(version.snapshot)}
                </span>
                <span className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-mono">{version.editedById}</span>
                  <time dateTime={version.editedAt} className="font-mono">
                    {formatDateTime(version.editedAt)}
                  </time>
                  {canRestore ? (
                    <ConfirmDialog
                      title={`Restore this ${entityLabel.toLowerCase()} revision?`}
                      description="Restoring appends a new audited snapshot. Earlier revisions stay in the history."
                      confirmLabel="Restore revision"
                      onConfirm={() => void handleRestore(version.id)}
                      trigger={
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busyId !== null}
                          aria-busy={busyId === version.id}
                          data-action="restore"
                        >
                          <RotateCcw aria-hidden="true" />
                          Restore
                        </Button>
                      }
                    />
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        )
      ) : null}
    </div>
  );
}
