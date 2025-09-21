'use client';

import * as React from 'react';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(({ value = 0, className, ...props }, ref) => {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      ref={ref}
      className={`h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 ${className ?? ''}`.trim()}
      {...props}
    >
      <div
        className="h-full rounded-full bg-brand-600 transition-all duration-300 dark:bg-brand-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
});

Progress.displayName = 'Progress';
