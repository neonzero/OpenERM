import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/utils';

type StatCardProps = ComponentPropsWithoutRef<'div'> & {
  title: string;
  value: string;
  helper?: string;
};

export function StatCard({ title, value, helper, className, ...props }: StatCardProps) {
  return (
    <div
      className={cn('rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900', className)}
      {...props}
    >
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{helper}</p> : null}
    </div>
  );
}
