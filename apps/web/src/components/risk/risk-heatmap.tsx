'use client';

import { useMemo } from 'react';

export type HeatmapCell = {
  likelihood: number;
  impact: number;
  count: number;
  risks: any[];
  color: 'green' | 'amber' | 'red';
};

const likelihoodScale = [1, 2, 3, 4, 5];
const impactScale = [5, 4, 3, 2, 1];

function cellIntensity(count: number, color: string) {
  if (count === 0) return 'bg-slate-100 dark:bg-slate-800/60';
  
  switch (color) {
    case 'green':
      return 'bg-green-400';
    case 'amber':
      return 'bg-yellow-400';
    case 'red':
      return 'bg-red-400';
    default:
      return 'bg-slate-100 dark:bg-slate-800/60';
  }
}

export function RiskHeatmap({ cells, onCellClick }: { cells: HeatmapCell[], onCellClick: (bucket: string) => void }) {
  const cellMap = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    cells.forEach(cell => {
      map.set(`L${cell.likelihood}-I${cell.impact}`, cell);
    });
    return map;
  }, [cells]);

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex">
        <div className="w-24"></div>
        <div className="flex-1 grid grid-cols-5 gap-1">
          {likelihoodScale.map(l => <div key={`lh-${l}`} className="text-center font-bold">Likelihood {l}</div>)}
        </div>
      </div>
      <div className="flex">
        <div className="w-24 flex flex-col justify-between">
          {impactScale.map(i => <div key={`ih-${i}`} className="h-12 flex items-center justify-center font-bold">Impact {i}</div>)}
        </div>
        <div className="flex-1 grid grid-cols-5 gap-2">
          {impactScale.map(impact => (
            <div key={`row-${impact}`} className="grid grid-cols-5 gap-2">
              {likelihoodScale.map(likelihood => {
                const bucket = `L${likelihood}-I${impact}`;
                const cell = cellMap.get(bucket);
                const count = cell?.count || 0;
                const color = cell?.color || 'green';
                const intensity = cellIntensity(count, color);

                return (
                  <div
                    key={bucket}
                    className={`h-12 w-full rounded-lg border border-slate-200/80 dark:border-slate-800/80 ${intensity} cursor-pointer`}
                    onClick={() => onCellClick(bucket)}
                  >
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}