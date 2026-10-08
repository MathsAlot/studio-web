'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCheck, Loader2, MessageSquare, RotateCcw } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { ErrorAlert } from '@/components/error-alert';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import type { Comment, UserSummary, WorldSummary } from '@/lib/api-client';
import { listUsers } from '@/lib/client/admin';
import { listComments, updateComment } from '@/lib/client/studio';
import { COMMENT_STATUS_LABELS } from '@/lib/studio/fields';
import { formatDateTime } from '@/lib/studio/nitty-gritty';

interface CommentState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  comments: Comment[];
  error?: string;
}

function flatten(comments: Comment[]): Comment[] {
  const result: Comment[] = [];
  for (const comment of comments) {
    result.push(comment);
    if (comment.replies && comment.replies.length > 0) {
      result.push(...flatten(comment.replies));
    }
  }
  return result;
}

function replaceComment(list: Comment[], id: string, patch: Partial<Comment>): Comment[] {
  return list.map((comment) =>
    comment.id === id
      ? { ...comment, ...patch }
      : { ...comment, replies: replaceComment(comment.replies ?? [], id, patch) },
  );
}

function statusRank(comment: Comment): number {
  return comment.status === 'OPEN' ? 0 : 1;
}

interface CommentCoordinationProps {
  worlds: WorldSummary[];
  canCoordinate: boolean;
}

/**
 * Admin comment triage (D-045). Open comments are listed first across a
 * selected Trick with reassign/resolve. `comment.coordinate`/Admin is enforced
 * by the API; this surface only shapes what the signed-in user can act on.
 */
export function CommentCoordination({ worlds, canCoordinate }: CommentCoordinationProps) {
  const [worldId, setWorldId] = useState(worlds[0]?.id ?? '');
  const selectedWorld = worlds.find((world) => world.id === worldId) ?? worlds[0];
  const [trickId, setTrickId] = useState(selectedWorld?.tricks[0]?.id ?? '');
  const [showResolved, setShowResolved] = useState(false);
  const [state, setState] = useState<CommentState>({ status: 'idle', comments: [] });
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!canCoordinate) {
      return;
    }
    let active = true;
    void listUsers().then((result) => {
      if (active && result.ok) {
        setUsers(result.data);
      }
    });
    return () => {
      active = false;
    };
  }, [canCoordinate]);

  const loadComments = useCallback(async (targetTrickId: string) => {
    if (targetTrickId.length === 0) {
      setState({ status: 'idle', comments: [] });
      return;
    }
    setState({ status: 'loading', comments: [] });
    const result = await listComments(targetTrickId);
    if (!result.ok) {
      setState({ status: 'error', comments: [], error: result.message });
      return;
    }
    setState({ status: 'ready', comments: result.data });
  }, []);

  useEffect(() => {
    void loadComments(trickId);
  }, [loadComments, trickId]);

  function selectWorld(nextWorldId: string) {
    setWorldId(nextWorldId);
    const nextWorld = worlds.find((world) => world.id === nextWorldId);
    setTrickId(nextWorld?.tricks[0]?.id ?? '');
  }

  const visible = useMemo(() => {
    const all = flatten(state.comments);
    const filtered = showResolved ? all : all.filter((comment) => comment.status === 'OPEN');
    return [...filtered].sort((a, b) => {
      const rank = statusRank(a) - statusRank(b);
      if (rank !== 0) {
        return rank;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [state.comments, showResolved]);

  async function handleStatus(commentId: string, status: Comment['status']) {
    setBusyId(commentId);
    setActionError(null);
    setNotice(null);
    const result = await updateComment(commentId, { status });
    setBusyId(null);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    setState((current) => ({
      ...current,
      comments: replaceComment(current.comments, commentId, {
        status: result.data.status,
        updatedAt: result.data.updatedAt,
      }),
    }));
    setNotice(status === 'RESOLVED' ? 'Comment resolved.' : 'Comment reopened.');
  }

  async function handleAssign(commentId: string, assignedToId: string | null) {
    setBusyId(commentId);
    setActionError(null);
    setNotice(null);
    const result = await updateComment(commentId, { assignedToId });
    setBusyId(null);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    setState((current) => ({
      ...current,
      comments: replaceComment(current.comments, commentId, {
        assignedToId: result.data.assignedToId,
        updatedAt: result.data.updatedAt,
      }),
    }));
    setNotice('Assignee updated.');
  }

  if (worlds.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No Worlds yet."
        description="Comments appear once Tricks exist to discuss."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-body-sm text-muted-foreground">
          World
          <NativeSelect
            aria-label="Select a World"
            value={worldId}
            onChange={(event) => selectWorld(event.target.value)}
            className="w-56"
          >
            {worlds.map((world) => (
              <option key={world.id} value={world.id}>
                {world.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1 text-body-sm text-muted-foreground">
          Trick
          <NativeSelect
            aria-label="Select a Trick"
            value={trickId}
            onChange={(event) => setTrickId(event.target.value)}
            className="w-56"
            disabled={!selectedWorld || selectedWorld.tricks.length === 0}
          >
            {selectedWorld?.tricks.map((trick) => (
              <option key={trick.id} value={trick.id}>
                {trick.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <div className="flex items-center gap-2 pb-1">
          <Checkbox
            id="show-resolved"
            checked={showResolved}
            onCheckedChange={(next) => setShowResolved(next === true)}
          />
          <Label htmlFor="show-resolved" className="text-body-sm text-foreground">
            Show resolved
          </Label>
        </div>
      </div>

      {!canCoordinate ? (
        <p role="status" className="text-body-sm text-muted-foreground">
          Resolving or reassigning comments requires{' '}
          <code className="font-mono">comment.coordinate</code>.
        </p>
      ) : null}

      {actionError ? <ErrorAlert title="Comment action failed">{actionError}</ErrorAlert> : null}
      {notice ? (
        <p role="status" aria-live="polite" className="text-body-sm text-success-foreground">
          {notice}
        </p>
      ) : null}

      {state.status === 'loading' ? (
        <p role="status" className="flex items-center gap-2 text-body-sm text-muted-foreground">
          <Loader2 aria-hidden="true" className="animate-spin" />
          Loading comments…
        </p>
      ) : null}

      {state.status === 'error' ? (
        <ErrorAlert title="Could not load comments">
          {state.error ?? 'Please try again.'}
        </ErrorAlert>
      ) : null}

      {state.status === 'idle' ||
      (state.status === 'ready' && selectedWorld?.tricks.length === 0) ? (
        <EmptyState
          icon={MessageSquare}
          title="No Tricks in this World."
          description="Add a Trick before coordinating its comments."
        />
      ) : null}

      {state.status === 'ready' && visible.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={showResolved ? 'No comments.' : 'No open comments.'}
          description={
            showResolved
              ? 'This Trick has no comments yet.'
              : 'Every comment on this Trick is resolved. Tick “Show resolved” to review them.'
          }
        />
      ) : null}

      {state.status === 'ready' && visible.length > 0 ? (
        <ul aria-label="Open comments" className="list-none space-y-2">
          {visible.map((comment) => {
            const busy = busyId === comment.id;
            return (
              <li key={comment.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-body-sm text-muted-foreground">
                    <span className="font-mono text-xs">{comment.authorId}</span>
                    <time dateTime={comment.createdAt} className="text-xs">
                      {formatDateTime(comment.createdAt)}
                    </time>
                    <StatusBadge
                      tone={comment.status === 'RESOLVED' ? 'success' : 'info'}
                      icon={comment.status === 'RESOLVED' ? CheckCheck : MessageSquare}
                    >
                      {COMMENT_STATUS_LABELS[comment.status]}
                    </StatusBadge>
                    {comment.parentCommentId ? <span className="text-xs">reply</span> : null}
                  </div>
                  {canCoordinate ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {comment.status === 'RESOLVED' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleStatus(comment.id, 'OPEN')}
                          disabled={busy}
                          data-action="coordinate-reopen"
                        >
                          <RotateCcw aria-hidden="true" />
                          Reopen
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleStatus(comment.id, 'RESOLVED')}
                          disabled={busy}
                          data-action="coordinate-resolve"
                        >
                          <CheckCheck aria-hidden="true" />
                          Resolve
                        </Button>
                      )}
                      <NativeSelect
                        aria-label="Reassign comment"
                        className="h-7 w-44 text-xs"
                        value={comment.assignedToId ?? ''}
                        onChange={(event) =>
                          void handleAssign(comment.id, event.target.value || null)
                        }
                        disabled={busy}
                      >
                        <option value="">Unassigned</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.displayName || user.email}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  ) : null}
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-body text-foreground">
                  {comment.body}
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
