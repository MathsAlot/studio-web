'use client';

import { useEffect, useRef } from 'react';
import { logout } from '@/lib/client/session';

/**
 * Clears a refused (e.g. Learner) session once on mount so stale cookies do
 * not keep bouncing the visitor to the refusal message.
 */
export function ForbiddenSessionCleanup() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) {
      return;
    }
    done.current = true;
    void logout();
  }, []);

  return null;
}
