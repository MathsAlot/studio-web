import type { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface ErrorAlertProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Standard error surface. Rendered as an ARIA alert with an icon plus text so
 * the failure never depends on colour alone.
 */
export function ErrorAlert({
  title = 'Something went wrong',
  children,
  className,
}: ErrorAlertProps) {
  return (
    <Alert
      variant="destructive"
      className={cn('border-danger/30 bg-danger-subtle text-danger-foreground', className)}
    >
      <TriangleAlert aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="text-danger-foreground/90">{children}</AlertDescription>
    </Alert>
  );
}
