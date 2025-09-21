'use client';

import { Progress } from '../ui/progress';

export type PlanProgress = {
  planId: string;
  period: string;
  status: string;
  completed: number;
  total: number;
};

export function PlanProgressList({ plans }: { plans: PlanProgress[] }) {
  return (
    <div className="space-y-4">
      {plans.map((plan) => {
        const completion = plan.total === 0 ? 0 : Math.round((plan.completed / plan.total) * 100);
        return (
          <div
            key={plan.planId}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{plan.period} Audit Plan</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Status: {plan.status}</p>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{completion}%</span>
            </div>
            <Progress value={completion} className="mt-3" />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {plan.completed} of {plan.total} engagements completed
            </p>
          </div>
        );
      })}
      {plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
          Create your first risk-based audit plan to track execution progress.
        </div>
      ) : null}
    </div>
  );
}
