import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/utils';

export function Badge({ className, ...props }: ComponentPropsWithoutRef<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-600',
        className
      )}
      {...props}
    />
  );
}
