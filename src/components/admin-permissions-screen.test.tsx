import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminPermissionsScreen } from '@/components/admin-permissions-screen';
import type { MeView, Permission, UserSummary } from '@/lib/api-client';

const admin: MeView = {
  id: 'admin-1',
  email: 'admin@example.com',
  displayName: 'Admin User',
  role: 'ADMIN',
  isAdmin: true,
  permissions: [],
};

const staffMe: MeView = {
  id: 'user-1',
  email: 'staff@example.com',
  displayName: 'Staff Member',
  role: 'STAFF',
  isAdmin: false,
  permissions: [],
};

const staffUser: UserSummary = {
  id: 'user-1',
  email: 'staff@example.com',
  displayName: 'Staff Member',
  role: 'STAFF',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastLoginAt: null,
  permissions: [],
};

const catalogue: Permission[] = [{ key: 'trick.content.write', label: 'Write Trick content' }];

describe('AdminPermissionsScreen', () => {
  it('refuses a non-Admin and renders no user data', () => {
    render(<AdminPermissionsScreen user={staffMe} users={[staffUser]} catalogue={catalogue} />);

    expect(screen.getByRole('heading', { name: /admin access required/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /permission management/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/write trick content/i)).not.toBeInTheDocument();
  });

  it('renders the permission manager for an Admin', () => {
    render(<AdminPermissionsScreen user={admin} users={[staffUser]} catalogue={catalogue} />);

    expect(screen.getByRole('heading', { name: /permission management/i })).toBeInTheDocument();
    expect(screen.getByText('Staff Member')).toBeInTheDocument();
    expect(screen.getByLabelText(/write trick content/i)).toBeInTheDocument();
  });

  it('surfaces a load failure without rendering the manager', () => {
    render(<AdminPermissionsScreen user={admin} loadError="Could not load users." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load users.');
    expect(screen.queryByLabelText(/write trick content/i)).not.toBeInTheDocument();
  });
});
