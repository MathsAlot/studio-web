'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCheck, Loader2, MessageSquare, RotateCcw, Send } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { ErrorAlert } from '@/components/error-alert';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import type { Comment, UserSummary } from '@/lib/api-client';
import { listUsers } from '@/lib/client/admin';
import { createComment, listComments, updateComment } from '@/lib/client/studio';
import { COMMENT_STATUS_LABELS } from '@/lib/studio/fields';
import { formatDateTime } from '@/lib/studio/nitty-gritty';
import { cn } from '@/lib/utils';

interface CommentThreadProps {
  trickId: string;
  canCoordinate: boolean;
}

interface ThreadState {
  status: 'loading' | 'ready' | 'error';
  comments: Comment[];
  error?: string;
}

function replaceComment(list: Comment[], id: string, patch: Partial<Comment>): Comment[] {
  return list.map((comment) =>
    comment.id === id
      ? { ...comment, ...patch }
      : { ...comment, replies: replaceComment(comment.replies ?? [], id, patch) },
  );
}

function CommentStatusBadge({ status }: { status: Comment['status'] }) {
  return status === 'RESOLVED' ? (
    <StatusBadge tone="success" icon={CheckCheck}>
      {COMMENT_STATUS_LABELS.RESOLVED}
    </StatusBadge>
  ) : (
    <StatusBadge tone="info" icon={MessageSquare}>
      {COMMENT_STATUS_LABELS.OPEN}
    </StatusBadge>
  );
}

interface CommentNodeProps {
  comment: Comment;
  depth: number;
  canCoordinate: boolean;
  users: UserSummary[];
  busyId: string | null;
  onReply: (parentId: string, body: string) => Promise<boolean>;
  onSetStatus: (commentId: string, status: Comment['status']) => void;
  onAssign: (commentId: string, assignedToId: string | null) => void;
}

function CommentNode({
  comment,
  depth,
  canCoordinate,
  users,
  busyId,
  onReply,
  onSetStatus,
  onAssign,
}: CommentNodeProps) {
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const assignee = comment.assignedToId;
  const busy = busyId === comment.id;

  async function submitReply() {
    if (replyBody.trim().length === 0) {
      setReplyError('Write a reply before sending.');
      return;
    }
    setSubmitting(true);
    const ok = await onReply(comment.id, replyBody.trim());
    setSubmitting(false);
    if (ok) {
      setReplyBody('');
      setReplyError(null);
      setReplying(false);
    }
  }

  return (
    <li className={cn(depth > 0 && 'mt-2 border-l border-border pl-3')}>
      <div className="rounded-md border border-border bg-surface px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-body-sm">
            <span className="font-mono text-xs text-muted-foreground">{comment.authorId}</span>
            <time dateTime={comment.createdAt} className="text-xs text-muted-foreground">
              {formatDateTime(comment.createdAt)}
            </time>
            <CommentStatusBadge status={comment.status} />
            {assignee ? (
              <span className="text-xs text-muted-foreground">
                Assigned to <span className="font-mono">{assignee}</span>
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setReplying((current) => !current)}
              disabled={busy}
              data-action="reply"
            >
              <Send aria-hidden="true" />
              Reply
            </Button>
            {canCoordinate ? (
              <>
                {comment.status === 'RESOLVED' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onSetStatus(comment.id, 'OPEN')}
                    disabled={busy}
                    data-action="reopen"
                  >
                    <RotateCcw aria-hidden="true" />
                    Reopen
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onSetStatus(comment.id, 'RESOLVED')}
                    disabled={busy}
                    data-action="resolve"
                  >
                    <CheckCheck aria-hidden="true" />
                    Resolve
                  </Button>
                )}
                {users.length > 0 ? (
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="sr-only">Assign comment</span>
                    <NativeSelect
                      aria-label="Assign comment"
                      className="h-7 text-xs"
                      value={assignee ?? ''}
                      onChange={(event) => onAssign(comment.id, event.target.value || null)}
                      disabled={busy}
                    >
                      <option value="">Unassigned</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.displayName || user.email}
                        </option>
                      ))}
                    </NativeSelect>
                  </label>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <p className="mt-2 whitespace-pre-wrap break-words text-body text-foreground">
          {comment.body}
        </p>
      </div>

      {replying ? (
        <div className="mt-2 space-y-2">
          <label
            htmlFor={`reply-${comment.id}`}
            className="text-label uppercase text-muted-foreground"
          >
            Reply to {comment.authorId}
          </label>
          <Textarea
            id={`reply-${comment.id}`}
            value={replyBody}
            onChange={(event) => {
              setReplyError(null);
              setReplyBody(event.target.value);
            }}
            placeholder="Write a reply…"
            rows={2}
            maxLength={8000}
            aria-invalid={replyError ? true : undefined}
          />
          {replyError ? (
            <p role="alert" className="text-body-sm text-danger">
              {replyError}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void submitReply()}
              disabled={submitting}
              aria-busy={submitting}
              data-action="send-reply"
            >
              {submitting ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Send aria-hidden="true" />
              )}
              Send reply
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setReplying(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {comment.replies && comment.replies.length > 0 ? (
        <ul className="mt-2 list-none space-y-2">
          {comment.replies.map((reply) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              canCoordinate={canCoordinate}
              users={users}
              busyId={busyId}
              onReply={onReply}
              onSetStatus={onSetStatus}
              onAssign={onAssign}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * Threaded Trick comments (D-045). Any Staff/Admin can comment or reply;
 * resolving or reassigning requires `comment.coordinate`. Server decisions are
 * rendered; the API is the authority.
 */
export function CommentThread({ trickId, canCoordinate }: CommentThreadProps) {
  const [state, setState] = useState<ThreadState>({ status: 'loading', comments: [] });
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);

  const loadComments = useCallback(async () => {
    setState({ status: 'loading', comments: [] });
    const result = await listComments(trickId);
    if (!result.ok) {
      setState({ status: 'error', comments: [], error: result.message });
      return;
    }
    setState({ status: 'ready', comments: result.data });
  }, [trickId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

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

  async function submitComment() {
    if (body.trim().length === 0) {
      setFormError('Write a comment before posting.');
      return;
    }
    setPosting(true);
    setActionError(null);
    const result = await createComment(trickId, { body: body.trim() });
    setPosting(false);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    setBody('');
    setFormError(null);
    await loadComments();
  }

  const handleReply = useCallback(
    async (parentId: string, replyBody: string): Promise<boolean> => {
      setActionError(null);
      const result = await createComment(trickId, {
        body: replyBody,
        parentCommentId: parentId,
      });
      if (!result.ok) {
        setActionError(result.message);
        return false;
      }
      await loadComments();
      return true;
    },
    [trickId, loadComments],
  );

  const handleSetStatus = useCallback((commentId: string, status: Comment['status']) => {
    void (async () => {
      setBusyId(commentId);
      setActionError(null);
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
    })();
  }, []);

  const handleAssign = useCallback((commentId: string, assignedToId: string | null) => {
    void (async () => {
      setBusyId(commentId);
      setActionError(null);
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
    })();
  }, []);

  return (
    <section
      aria-labelledby="comments-heading"
      data-slot="comment-thread"
      className="rounded-lg border border-border bg-surface p-4"
    >
      <h2 id="comments-heading" className="text-heading-2 font-semibold text-foreground">
        Comments
      </h2>

      {actionError ? (
        <ErrorAlert title="Comment action failed" className="mt-3">
          {actionError}
        </ErrorAlert>
      ) : null}

      <div className="mt-3 space-y-2">
        <label htmlFor="new-comment" className="text-label uppercase text-muted-foreground">
          Add a comment
        </label>
        <Textarea
          id="new-comment"
          value={body}
          onChange={(event) => {
            setFormError(null);
            setBody(event.target.value);
          }}
          placeholder="e.g. Flag that the worked example needs carrying…"
          rows={3}
          maxLength={8000}
          aria-invalid={formError ? true : undefined}
        />
        {formError ? (
          <p role="alert" className="text-body-sm text-danger">
            {formError}
          </p>
        ) : null}
        <Button
          type="button"
          onClick={() => void submitComment()}
          disabled={posting}
          aria-busy={posting}
          data-action="post-comment"
        >
          {posting ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Send aria-hidden="true" />
          )}
          Post comment
        </Button>
      </div>

      <div className="mt-4 border-t border-border pt-4">
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

        {state.status === 'ready' ? (
          state.comments.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No comments yet."
              description="Start the conversation using the box above."
            />
          ) : (
            <ul className="list-none space-y-2" aria-label="Comments">
              {state.comments.map((comment) => (
                <CommentNode
                  key={comment.id}
                  comment={comment}
                  depth={0}
                  canCoordinate={canCoordinate}
                  users={users}
                  busyId={busyId}
                  onReply={handleReply}
                  onSetStatus={handleSetStatus}
                  onAssign={handleAssign}
                />
              ))}
            </ul>
          )
        ) : null}

        {!canCoordinate ? (
          <p role="status" className="mt-3 text-body-sm text-muted-foreground">
            You can comment and reply. Resolving or reassigning comments requires{' '}
            <code className="font-mono">comment.coordinate</code>.
          </p>
        ) : null}
      </div>
    </section>
  );
}
