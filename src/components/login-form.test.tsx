import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '@/components/login-form';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

const user = {
  id: 'user-1',
  email: 'staff@example.com',
  displayName: 'Staff Member',
  role: 'STAFF' as const,
  isAdmin: false,
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

function seedCsrf(): void {
  document.cookie = 'csrf=test-csrf';
}

describe('LoginForm', () => {
  beforeEach(() => {
    router.replace.mockReset();
    router.refresh.mockReset();
    document.cookie = 'csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    seedCsrf();
  });

  it('shows validation errors and does not call the network for empty input', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<LoginForm nextPath="/" />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(screen.getByText(/check the highlighted fields/i)).toBeInTheDocument();
    const alerts = screen.getAllByRole('alert');
    expect(alerts.some((alert) => /enter your email address/i.test(alert.textContent ?? ''))).toBe(
      true,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed email address', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<LoginForm nextPath="/" />);
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('signs in with the CSRF header and redirects to the next path', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ user }));
    vi.stubGlobal('fetch', fetchMock);

    render(<LoginForm nextPath="/admin/permissions" />);
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'staff@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-password' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/permissions'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/session/login');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['x-csrf-token']).toBe('test-csrf');
    expect(String(init.body)).toContain('staff@example.com');
  });

  it('surfaces a generic error and preserves the entered email on failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ message: 'Email or password is incorrect.' }, 401, 'Unauthorized'),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<LoginForm nextPath="/" />);
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'staff@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/incorrect/i));
    expect(screen.getByLabelText('Email address')).toHaveValue('staff@example.com');
    expect(router.replace).not.toHaveBeenCalled();
  });
});
