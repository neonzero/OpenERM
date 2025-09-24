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

export function RiskHeatmap({ cells, onCellClick }: { cells: HeatmapCell[], onCellClick: (bucket: string) => void }) {
  // ... (rest of the component)
          <div
            key={cell.bucket}
            className={`h-12 w-12 rounded-lg border border-slate-200/80 dark:border-slate-800/80 ${color} cursor-pointer`}
            onClick={() => onCellClick(cell.bucket)}
          >
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
              {cell.count}
            </div>
          </div>
  // ... (rest of the component)
}
