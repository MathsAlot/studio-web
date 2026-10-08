'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { logout } from '@/lib/client/session';

/** Ends the Studio session and returns to the login page. */
export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setPending(true);
    setError(null);
    const result = await logout();

    if (!result.ok && result.status !== 401) {
      setError(result.message);
      setPending(false);
      return;
    }

    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleLogout}
        disabled={pending}
        aria-busy={pending}
      >
        <LogOut aria-hidden="true" />
        {pending ? 'Signing out…' : 'Sign out'}
      </Button>
      {error ? (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
