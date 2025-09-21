'use client';

import { useMemo } from 'react';

export type HeatmapCell = {
  bucket: string;
  count: number;
  risks: string[];
};

const likelihoodScale = [1, 2, 3, 4, 5];
const impactScale = [5, 4, 3, 2, 1];

function cellIntensity(count: number) {
  if (count === 0) return 'bg-slate-100 dark:bg-slate-800/60';
  if (count === 1) return 'bg-green-200 dark:bg-emerald-700/50';
  if (count === 2) return 'bg-yellow-200 dark:bg-amber-600/60';
  if (count === 3) return 'bg-orange-200 dark:bg-orange-600/60';
  return 'bg-red-300 dark:bg-red-700/70';
}

export function RiskHeatmap({ cells }: { cells: HeatmapCell[] }) {
  const cellMap = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    cells.forEach((cell) => map.set(cell.bucket, cell));
    return map;
  }, [cells]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span>Impact</span>
        <span>Likelihood</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {impactScale.map((impact) =>
          likelihoodScale.map((likelihood) => {
            const key = `${likelihood}-${impact}`;
            const cell = cellMap.get(key);
            const risks = cell?.risks ?? [];
            return (
              <div
                key={key}
                className={`flex h-20 flex-col justify-between rounded-lg border border-slate-200 p-2 text-xs shadow-sm transition hover:scale-[1.01] dark:border-slate-800 ${cellIntensity(
                  cell?.count ?? 0
                )}`}
              >
                <div className="font-semibold text-slate-700 dark:text-slate-100">
                  {likelihood}×{impact}
                </div>
                <div className="text-[10px] font-medium uppercase text-slate-600 dark:text-slate-200">
                  {cell?.count ?? 0} risks
                </div>
                {risks.length > 0 ? (
                  <ul className="mt-1 space-y-1">
                    {risks.slice(0, 2).map((risk) => (
                      <li key={risk} className="truncate text-[10px] text-slate-700 dark:text-slate-100">
                        {risk}
                      </li>
                    ))}
                    {risks.length > 2 ? (
                      <li className="text-[10px] font-semibold text-slate-600 dark:text-slate-200">+{risks.length - 2} more</li>
                    ) : null}
                  </ul>
                ) : null}
              </div>
            );
          })
        )}
      </div>
      <div className="flex items-center justify-end gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="rounded-full bg-green-200 px-2 py-1 dark:bg-emerald-700/50">Low density</span>
        <span className="rounded-full bg-orange-300 px-2 py-1 dark:bg-orange-600/70">Moderate</span>
        <span className="rounded-full bg-red-400 px-2 py-1 dark:bg-red-700/80">Concentration</span>
      </div>
    </div>
  );
}
