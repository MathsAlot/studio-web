import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionManager } from '@/components/permission-manager';
import type { Permission, UserSummary } from '@/lib/api-client';

const staff: UserSummary = {
  id: 'user-1',
  email: 'staff@example.com',
  displayName: 'Staff Member',
  role: 'STAFF',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastLoginAt: null,
  permissions: [],
};

const catalogue: Permission[] = [
  { key: 'trick.content.write', label: 'Write Trick content' },
  { key: 'trick.vetting.write', label: 'Vet Tricks' },
];

function jsonResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

describe('PermissionManager', () => {
  beforeEach(() => {
    document.cookie = 'csrf=test-csrf';
  });

  it('grants a permission and confirms from the server response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          key: 'trick.content.write',
          label: 'Write Trick content',
          grantedAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<PermissionManager initialUsers={[staff]} catalogue={catalogue} />);
    const checkbox = screen.getByLabelText(/write trick content/i);
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);

    await waitFor(() => expect(checkbox).toBeChecked());
    expect(await screen.findByRole('status')).toHaveTextContent(/granted/i);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/admin/users/user-1/permissions');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['x-csrf-token']).toBe('test-csrf');
  });

  it('revokes a permission and confirms from the server response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, removed: true }));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <PermissionManager
        initialUsers={[{ ...staff, permissions: ['trick.content.write'] }]}
        catalogue={catalogue}
      />,
    );
    const checkbox = screen.getByLabelText(/write trick content/i);
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);

    await waitFor(() => expect(checkbox).not.toBeChecked());
    expect(await screen.findByRole('status')).toHaveTextContent(/revoked/i);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/admin/users/user-1/permissions/trick.content.write');
    expect(init.method).toBe('DELETE');
  });

  it('shows an alert and does not move the checkbox when the server rejects', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ message: 'Server rejected the grant.' }, 400, 'Bad Request'),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<PermissionManager initialUsers={[staff]} catalogue={catalogue} />);
    const checkbox = screen.getByLabelText(/write trick content/i);

    fireEvent.click(checkbox);

    expect(await screen.findByRole('alert')).toHaveTextContent('Server rejected the grant.');
    expect(checkbox).not.toBeChecked();
  });

  it('does not render grant controls for Admin accounts', () => {
    render(
      <PermissionManager initialUsers={[{ ...staff, role: 'ADMIN' }]} catalogue={catalogue} />,
    );

    expect(screen.queryByLabelText(/write trick content/i)).not.toBeInTheDocument();
    expect(screen.getByText(/bypass permission grants/i)).toBeInTheDocument();
  });
});
