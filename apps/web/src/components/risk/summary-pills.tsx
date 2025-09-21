'use client';

const statusColors: Record<string, string> = {
  PLANNED: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-white',
  IN_PROGRESS: 'bg-blue-200 text-blue-900 dark:bg-blue-700 dark:text-white',
  EFFECTIVE: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-700 dark:text-white',
  CLOSED: 'bg-slate-300 text-slate-900 dark:bg-slate-600 dark:text-white',
  ON_TRACK: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-700 dark:text-white',
  WARNING: 'bg-amber-200 text-amber-900 dark:bg-amber-600 dark:text-white',
  BREACHED: 'bg-red-300 text-red-900 dark:bg-red-700 dark:text-white',
  OPEN: 'bg-indigo-200 text-indigo-900 dark:bg-indigo-700 dark:text-white',
  MONITORING: 'bg-purple-200 text-purple-900 dark:bg-purple-700 dark:text-white',
  DRAFT: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-white',
  Open: 'bg-indigo-200 text-indigo-900 dark:bg-indigo-700 dark:text-white',
  Closed: 'bg-slate-300 text-slate-900 dark:bg-slate-600 dark:text-white',
  Planning: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-white',
  Fieldwork: 'bg-blue-200 text-blue-900 dark:bg-blue-700 dark:text-white'
};

export function SummaryPills({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {entries.length === 0 ? (
          <span className="text-xs text-slate-500 dark:text-slate-400">No data yet.</span>
        ) : (
          entries.map(([key, value]) => (
            <span
              key={key}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                statusColors[key] ?? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-white'
              }`}
            >
              {key.replace(/_/g, ' ')} · {value}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
