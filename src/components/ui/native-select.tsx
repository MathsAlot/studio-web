import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Native `<select>` styled with the same tokens as the shadcn Input. Native
 * selects keep their browser affordances and keyboard behaviour for dense
 * data-entry forms.
 */
function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          'h-8 w-full min-w-0 appearance-none rounded-md border border-border-input bg-surface px-2.5 py-1 pr-8 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { NativeSelect };
