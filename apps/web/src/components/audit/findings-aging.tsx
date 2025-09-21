'use client';

type AgingBuckets = {
  '0-30': number;
  '31-60': number;
  '60+': number;
};

const bucketColors: Record<keyof AgingBuckets, string> = {
  '0-30': 'bg-emerald-500/70',
  '31-60': 'bg-amber-500/80',
  '60+': 'bg-red-500/80'
};

export function FindingsAging({ data }: { data: AgingBuckets }) {
  const total = Object.values(data).reduce((sum, count) => sum + count, 0);
  return (
    <div className="space-y-3">
      {Object.entries(data).map(([bucket, count]) => {
        const width = total === 0 ? 0 : Math.round((count / total) * 100);
        return (
          <div key={bucket} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{bucket} days</span>
              <span>{count}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className={`h-full ${bucketColors[bucket as keyof AgingBuckets]} transition-all`} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
      {total === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">No open findings at the moment.</p>
      ) : null}
    </div>
  );
}
