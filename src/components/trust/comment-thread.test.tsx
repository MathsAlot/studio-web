import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CommentThread } from '@/components/trust/comment-thread';
import { comment, userSummary } from '@/test/fixtures';

function jsonResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

function method(init?: RequestInit): string {
  return init?.method ?? 'GET';
}

describe('CommentThread', () => {
  beforeEach(() => {
    document.cookie = 'csrf=test-csrf';
  });

  it('lists comments and resolves with comment.coordinate', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url === '/api/admin/users') {
        return Promise.resolve(jsonResponse([userSummary()]));
      }
      if (url.endsWith('/comments') && method(init) === 'GET') {
        return Promise.resolve(jsonResponse([comment()]));
      }
      if (url.includes('/api/studio/comments/comment-1') && method(init) === 'PATCH') {
        return Promise.resolve(jsonResponse(comment({ status: 'RESOLVED' })));
      }
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<CommentThread trickId="trick-1" canCoordinate />);

    expect(await screen.findByText('Should the worked example show carrying?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));

    await waitFor(() => expect(screen.getByText('Resolved')).toBeInTheDocument());
    const patch = fetchMock.mock.calls.find(([, init]) => method(init) === 'PATCH');
    expect(patch?.[0]).toBe('/api/studio/comments/comment-1');
    expect(JSON.parse(String((patch?.[1] as RequestInit).body))).toEqual({ status: 'RESOLVED' });
  });

  it('posts a threaded reply without extra grants', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith('/comments') && method(init) === 'GET') {
        return Promise.resolve(jsonResponse([comment()]));
      }
      if (url.endsWith('/comments') && method(init) === 'POST') {
        return Promise.resolve(jsonResponse(comment({ id: 'comment-2' }), 201, 'Created'));
      }
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<CommentThread trickId="trick-1" canCoordinate={false} />);
    await screen.findByText('Should the worked example show carrying?');

    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    fireEvent.change(screen.getByLabelText('Reply to user-1'), {
      target: { value: 'Good point — adding a carrying example.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, init]) => method(init) === 'POST');
      expect(post).toBeTruthy();
      expect(JSON.parse(String((post?.[1] as RequestInit).body))).toEqual({
        body: 'Good point — adding a carrying example.',
        parentCommentId: 'comment-1',
      });
    });
  });

  it('hides resolve and reassign without comment.coordinate', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith('/comments') && method(init) === 'GET') {
        return Promise.resolve(jsonResponse([comment()]));
      }
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<CommentThread trickId="trick-1" canCoordinate={false} />);
    await screen.findByText('Should the worked example show carrying?');

    expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Assign comment')).not.toBeInTheDocument();
    expect(screen.getByText(/Resolving or reassigning comments requires/)).toBeInTheDocument();
  });

  it('shows an empty state when there are no comments', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse([])));
    vi.stubGlobal('fetch', fetchMock);

    render(<CommentThread trickId="trick-1" canCoordinate={false} />);
    expect(await screen.findByText('No comments yet.')).toBeInTheDocument();
  });

  it('renders an error state when comments fail to load', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/comments')) {
        return Promise.resolve(
          jsonResponse({ message: 'Comment service unavailable.' }, 503, 'Service Unavailable'),
        );
      }
      return Promise.resolve(jsonResponse({}));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<CommentThread trickId="trick-1" canCoordinate={false} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load comments');
    expect(screen.getByRole('alert')).toHaveTextContent('Comment service unavailable.');
    expect(screen.queryByText('No comments yet.')).not.toBeInTheDocument();
  });
});
