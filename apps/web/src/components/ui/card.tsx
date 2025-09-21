import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn('rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900', className)}
      {...props}
    />
  );
}
