import { Badge } from '../ui/badge';

export type TopRisk = {
  id: string;
  title: string;
  residualScore: number;
  owner?: string | null;
};

export function TopRisksList({ risks }: { risks: TopRisk[] }) {
  return (
    <div className="space-y-3">
      {risks.map((risk) => (
        <div
          key={risk.id}
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{risk.title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Owner: {risk.owner ?? 'Unassigned'}</p>
          </div>
          <Badge className="bg-red-500/80 text-white">Residual {risk.residualScore.toFixed(1)}</Badge>
        </div>
      ))}
      {risks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No key risks identified yet.
        </div>
      ) : null}
    </div>
  );
}
