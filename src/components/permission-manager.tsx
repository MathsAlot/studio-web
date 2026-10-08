'use client';

import { useState } from 'react';

import { ResetPasswordDialog } from '@/components/admin/reset-password-dialog';
import { ErrorAlert } from '@/components/error-alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Permission, UserSummary } from '@/lib/api-client';
import { grantPermission, revokePermission } from '@/lib/client/admin';

interface PermissionManagerProps {
  initialUsers: UserSummary[];
  catalogue: Permission[];
}

const ROLE_LABELS: Record<UserSummary['role'], string> = {
  ADMIN: 'Admin',
  STAFF: 'Staff',
  LEARNER: 'Learner',
};

/**
 * Admin-only grant/revoke UI. Every change is confirmed by the server response
 * before the checkbox state moves, so a failed request never silently appears
 * to succeed. Status and errors are announced as text, not colour alone.
 */
export function PermissionManager({ initialUsers, catalogue }: PermissionManagerProps) {
  const [users, setUsers] = useState<UserSummary[]>(initialUsers);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  function markPending(key: string, active: boolean) {
    setPending((current) => {
      const next = new Set(current);
      if (active) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  function clearMessage(userId: string) {
    setErrors((current) => removeKey(current, userId));
    setStatuses((current) => removeKey(current, userId));
  }

  function setUserPermissions(userId: string, permissions: string[]) {
    setUsers((current) =>
      current.map((user) => (user.id === userId ? { ...user, permissions } : user)),
    );
  }

  async function toggle(
    user: UserSummary,
    permission: Permission,
    nextGranted: boolean,
  ): Promise<void> {
    const pendingKey = `${user.id}:${permission.key}`;
    clearMessage(user.id);
    markPending(pendingKey, true);

    if (nextGranted) {
      const result = await grantPermission(user.id, permission.key);
      markPending(pendingKey, false);
      if (!result.ok) {
        setErrors((current) => ({ ...current, [user.id]: result.message }));
        return;
      }
      setUserPermissions(
        user.id,
        result.data.map((entry) => entry.key),
      );
      setStatuses((current) => ({ ...current, [user.id]: `Granted “${permission.label}”.` }));
      return;
    }

    const result = await revokePermission(user.id, permission.key);
    markPending(pendingKey, false);
    if (!result.ok) {
      setErrors((current) => ({ ...current, [user.id]: result.message }));
      return;
    }
    setUserPermissions(
      user.id,
      user.permissions.filter((key) => key !== permission.key),
    );
    setStatuses((current) => ({ ...current, [user.id]: `Revoked “${permission.label}”.` }));
  }

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-body-sm text-muted-foreground">
        Toggle a permission to grant or revoke it. The server confirms each change before the
        checkbox moves, so a failed request never silently appears to succeed.
      </p>

      {catalogue.length === 0 ? (
        <p role="status" className="text-body-sm text-muted-foreground">
          No permissions are available to assign.
        </p>
      ) : null}

      {users.map((user) => {
        const isAdmin = user.role === 'ADMIN';
        const isLearner = user.role === 'LEARNER';
        return (
          <Card key={user.id}>
            <CardHeader>
              <CardTitle>
                <h3 id={`user-${user.id}`} className="text-heading-2 font-semibold text-foreground">
                  {user.displayName}
                </h3>
              </CardTitle>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-body-sm text-muted-foreground">
                  {user.email} · Role:{' '}
                  <span className="font-medium text-foreground">{ROLE_LABELS[user.role]}</span>
                </p>
                {isLearner ? null : (
                  <ResetPasswordDialog
                    user={user}
                    onComplete={(message) => {
                      clearMessage(user.id);
                      setStatuses((current) => ({ ...current, [user.id]: message }));
                    }}
                    onError={(message) => {
                      setStatuses((current) => removeKey(current, user.id));
                      setErrors((current) => ({ ...current, [user.id]: message }));
                    }}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isAdmin ? (
                <p className="text-body-sm text-muted-foreground">
                  Admin accounts bypass permission grants automatically.
                </p>
              ) : (
                <fieldset>
                  <legend className="text-body-sm font-medium text-foreground">
                    Permissions for {user.displayName}
                  </legend>
                  <ul className="mt-2 space-y-2">
                    {catalogue.map((permission) => {
                      const inputId = `perm-${user.id}-${permission.key}`;
                      const checked = user.permissions.includes(permission.key);
                      const isPending = pending.has(`${user.id}:${permission.key}`);
                      return (
                        <li key={permission.key} className="flex items-start gap-2">
                          <Checkbox
                            id={inputId}
                            checked={checked}
                            disabled={isPending}
                            onCheckedChange={(next) => void toggle(user, permission, next === true)}
                            className="mt-0.5"
                          />
                          <Label htmlFor={inputId} className="text-body text-foreground">
                            {permission.label}{' '}
                            <code
                              className="font-mono text-body-sm text-muted-foreground"
                              translate="no"
                            >
                              {permission.key}
                            </code>
                            {isPending ? (
                              <span className="ml-1 text-body-sm text-muted-foreground">
                                (saving…)
                              </span>
                            ) : null}
                          </Label>
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>
              )}

              {errors[user.id] ? <ErrorAlert>{errors[user.id]}</ErrorAlert> : null}
              {statuses[user.id] ? (
                <p
                  role="status"
                  aria-live="polite"
                  className={cn('text-body-sm text-success-foreground')}
                >
                  {statuses[user.id]}
                </p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function removeKey(record: Record<string, string>, key: string): Record<string, string> {
  if (!(key in record)) {
    return record;
  }
  const next = { ...record };
  delete next[key];
  return next;
}
