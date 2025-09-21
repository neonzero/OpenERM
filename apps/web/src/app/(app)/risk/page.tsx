import { Metadata } from 'next';
import { Suspense } from 'react';
import { apiClient } from '../../../lib/api/client';
import { RiskTable, RiskRow } from '../../../components/risk/risk-table';
import { Badge } from '../../../components/ui/badge';
import { StatCard } from '../../../components/ui/stat-card';
import { RiskHeatmap, HeatmapCell } from '../../../components/risk/risk-heatmap';
import { TopRisksList, TopRisk } from '../../../components/risk/top-risks';
import { SummaryPills } from '../../../components/risk/summary-pills';

export const metadata: Metadata = {
  title: 'Risk Register | OpenERM'
};

type DashboardResponse = {
  totalRisks: number;
  heatmap: HeatmapCell[];
  topRisks: TopRisk[];
  appetiteBreaches: Array<{ id: string; title: string; residualScore: number }>;
  mitigationSummary: Record<string, number>;
  indicatorSummary: Record<string, number>;
};

async function fetchRisks(): Promise<RiskRow[]> {
  try {
    const response = await apiClient.get<{ items: RiskRow[] }>('/risks');
    return response.items;
  } catch (error) {
    return [
      {
        id: 'fallback-1',
        referenceId: 'R-001',
        title: 'Cloud infrastructure outage',
        category: 'Operational',
        inherentScore: 16,
        residualScore: 8,
        status: 'MITIGATION',
        owner: 'Risk Owner'
      },
      {
        id: 'fallback-2',
        referenceId: 'R-002',
        title: 'Supplier concentration risk',
        category: 'Strategic',
        inherentScore: 12,
        residualScore: 9,
        status: 'ASSESSMENT',
        owner: 'Procurement Lead'
      }
    ];
  }
}

async function fetchDashboard(): Promise<DashboardResponse> {
  try {
    return await apiClient.get<DashboardResponse>('/risks/dashboard');
  } catch (error) {
    return {
      totalRisks: 2,
      heatmap: [
        { bucket: '3-4', count: 1, risks: ['Cloud infrastructure outage'] },
        { bucket: '2-3', count: 1, risks: ['Supplier concentration risk'] }
      ],
      topRisks: [
        { id: 'fallback-1', title: 'Cloud infrastructure outage', residualScore: 8, owner: 'Risk Owner' },
        { id: 'fallback-2', title: 'Supplier concentration risk', residualScore: 9, owner: 'Procurement Lead' }
      ],
      appetiteBreaches: [
        { id: 'fallback-2', title: 'Supplier concentration risk', residualScore: 9 }
      ],
      mitigationSummary: { PLANNED: 1, IN_PROGRESS: 1 },
      indicatorSummary: { ON_TRACK: 1, WARNING: 1 }
    };
  }
}

export default async function RiskPage() {
  const [risks, dashboard] = await Promise.all([fetchRisks(), fetchDashboard()]);

  const breachedCount = dashboard.appetiteBreaches.length;
  const warningIndicators = (dashboard.indicatorSummary.WARNING ?? 0) + (dashboard.indicatorSummary.BREACHED ?? 0);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <Badge className="w-fit bg-brand-600 text-white">Risk workspace</Badge>
        <h2 className="text-3xl font-semibold text-slate-900 dark:text-white">Risk register overview</h2>
        <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Monitor enterprise risks, assessments, and mitigation progress with per-tenant isolation and
          immutable audit trails. Dashboards blend quantitative heat maps and treatment telemetry to
          highlight appetite breaches early.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total risks" value={dashboard.totalRisks.toString()} helper="Across current tenant" />
        <StatCard title="Appetite breaches" value={breachedCount.toString()} helper="Residual score > appetite" />
        <StatCard
          title="KRIs flagged"
          value={warningIndicators.toString()}
          helper="Indicators in warning or breached states"
        />
        <StatCard title="Open mitigations" value={(dashboard.mitigationSummary.IN_PROGRESS ?? 0).toString()} helper="In progress" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Likelihood × Impact heat map</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Higher concentration → darker</span>
          </div>
          <div className="mt-4">
            <RiskHeatmap cells={dashboard.heatmap} />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Key risks</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ranked by residual impact after treatments and controls.
            </p>
            <div className="mt-4">
              <TopRisksList risks={dashboard.topRisks} />
            </div>
          </div>
          <SummaryPills title="Mitigation status" data={dashboard.mitigationSummary} />
          <SummaryPills title="Indicator health" data={dashboard.indicatorSummary} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Appetite breaches</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Residual scores exceeding tenant risk appetite configuration.
            </p>
          </div>
          <Badge className="bg-red-500/80 text-white">{breachedCount}</Badge>
        </div>
        <div className="mt-4 space-y-3">
          {dashboard.appetiteBreaches.map((risk) => (
            <div
              key={risk.id}
              className="flex items-center justify-between rounded-xl border border-red-200/60 bg-red-50/60 p-4 text-sm dark:border-red-800/40 dark:bg-red-900/30"
            >
              <span className="font-medium text-red-900 dark:text-red-200">{risk.title}</span>
              <span className="text-red-700 dark:text-red-200">Residual {risk.residualScore.toFixed(1)}</span>
            </div>
          ))}
          {dashboard.appetiteBreaches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
              All risks are operating within configured appetite thresholds.
            </div>
          ) : null}
        </div>
      </div>

      <Suspense fallback={<div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">Loading risk data…</div>}>
        <RiskTable data={risks} />
      </Suspense>
    </section>
  );
}
