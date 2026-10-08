import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetPasswordDialog } from '@/components/admin/reset-password-dialog';
import type { UserSummary } from '@/lib/api-client';

const NEW_PASSWORD = 'correct-horse-battery';

const staff: UserSummary = {
  id: 'user-1',
  email: 'staff@example.com',
  displayName: 'Staff Member',
  role: 'STAFF',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastLoginAt: null,
  permissions: [],
};

function jsonResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

describe('ResetPasswordDialog', () => {
  beforeEach(() => {
    document.cookie = 'csrf=test-csrf';
    vi.stubGlobal('fetch', vi.fn());
  });

  it('confirms without ever displaying the password, then resets it', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ success: true, revokedSessions: 2 }));
    const onComplete = vi.fn();
    const onError = vi.fn();

    render(<ResetPasswordDialog user={staff} onComplete={onComplete} onError={onError} />);

    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));
    fireEvent.change(await screen.findByLabelText(/new password/i), {
      target: { value: NEW_PASSWORD },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: NEW_PASSWORD },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Confirmation step: the plaintext must not be rendered anywhere.
    expect(await screen.findByText(/confirm password reset/i)).toBeInTheDocument();
    expect(screen.queryByDisplayValue(NEW_PASSWORD)).not.toBeInTheDocument();
    expect(screen.queryByText(NEW_PASSWORD)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirm reset/i }));

    expect(await screen.findByText(/2 session\(s\) revoked/i)).toBeInTheDocument();
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete.mock.calls[0]?.[0]).toMatch(/password reset for staff member/i);

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/admin/users/user-1/reset-password');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ password: NEW_PASSWORD });
    expect((init.headers as Record<string, string>)['x-csrf-token']).toBe('test-csrf');
  });

  it('blocks mismatched passwords before confirmation', async () => {
    render(<ResetPasswordDialog user={staff} onComplete={vi.fn()} onError={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));
    fireEvent.change(await screen.findByLabelText(/new password/i), {
      target: { value: NEW_PASSWORD },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'different-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/do not match/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps entered data and reports a server failure', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ message: 'Weak password.' }, 400, 'Bad Request'),
    );
    const onError = vi.fn();

    render(<ResetPasswordDialog user={staff} onComplete={vi.fn()} onError={onError} />);

    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));
    fireEvent.change(await screen.findByLabelText(/new password/i), {
      target: { value: NEW_PASSWORD },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: NEW_PASSWORD },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm reset/i }));

    expect(await screen.findByText('Weak password.')).toBeInTheDocument();
    await waitFor(() => expect(onError).toHaveBeenCalledWith('Weak password.'));
    // Form returns with the value preserved for a retry.
    expect(screen.getByLabelText(/new password/i)).toHaveValue(NEW_PASSWORD);
  });
});
