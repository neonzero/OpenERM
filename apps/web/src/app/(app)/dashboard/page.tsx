import { Metadata } from 'next';
import { apiClient } from '../../../lib/api/client';
import { Badge } from '../../../components/ui/badge';
import { StatCard } from '../../../components/ui/stat-card';
import type { RiskRow } from '../../../components/risk/risk-table';
import { RiskHeatmap, HeatmapCell } from '../../../components/risk/risk-heatmap';
import { TopRisksList, TopRisk } from '../../../components/risk/top-risks';
import { SummaryPills } from '../../../components/risk/summary-pills';
import { PlanProgressList, PlanProgress } from '../../../components/audit/plan-progress';
import { FindingsAging } from '../../../components/audit/findings-aging';
import { EngagementTimeline, EngagementEvent } from '../../../components/audit/engagement-timeline';

export const metadata: Metadata = {
  title: 'Executive Dashboard | OpenERM'
};

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? 'seed-tenant';

type ApiRisk = {
  id: string;
  title: string;
  taxonomy: string[];
  inherentL: number;
  inherentI: number;
  residualL: number | null;
  residualI: number | null;
  status: string;
  appetiteBreached: boolean;
  owner?: { name: string | null; email: string | null } | null;
};

type RisksResponse = {
  items: ApiRisk[];
};

type HeatmapResponse = {
  matrix: Record<
    string,
    {
      likelihood: number;
      impact: number;
      count: number;
      risks: Array<{
        id: string;
        title: string;
        status: string;
        likelihood: number;
        impact: number;
        appetiteBreached: boolean;
      }>;
    }
  >;
  totals: {
    totalRisks: number;
    appetiteBreaches: number;
  };
};

type DashboardResponse = {
  planProgress: PlanProgress[];
  findingsBySeverity: Record<string, number>;
  findingsAging: { '0-30': number; '31-60': number; '60+': number };
  utilization: { totalCapacity: number; bookedHours: number; utilizationRate: number };
  indicatorSummary: Record<string, number>;
};

type EngagementApi = {
  id: string;
  title: string;
  status: string;
  startDate: string | null;
  findingsOpen: number;
  owner?: string | null;
};

function toRiskRow(risk: ApiRisk): RiskRow {
  return {
    id: risk.id,
    title: risk.title,
    taxonomy: risk.taxonomy,
    inherentLikelihood: risk.inherentL,
    inherentImpact: risk.inherentI,
    residualLikelihood: risk.residualL ?? undefined,
    residualImpact: risk.residualI ?? undefined,
    status: risk.status,
    owner: risk.owner?.name ?? risk.owner?.email ?? null,
    appetiteBreached: risk.appetiteBreached
  } satisfies RiskRow;
}

function buildHeatmapCells(response: HeatmapResponse): HeatmapCell[] {
  return Object.values(response.matrix).map((bucket) => ({
    bucket: `${bucket.likelihood}-${bucket.impact}`,
    count: bucket.count,
    risks: bucket.risks.map((risk) => risk.title)
  }));
}

function computeTopRisks(rows: RiskRow[]): TopRisk[] {
  return rows
    .map((row) => {
      const likelihood = row.residualLikelihood ?? row.inherentLikelihood;
      const impact = row.residualImpact ?? row.inherentImpact;
      return {
        id: row.id,
        title: row.title,
        residualScore: likelihood * impact,
        owner: row.owner
      } satisfies TopRisk;
    })
    .sort((a, b) => b.residualScore - a.residualScore)
    .slice(0, 3);
}

function computeCounts(rows: RiskRow[]): { statuses: Record<string, number>; taxonomy: Record<string, number> } {
  const statusCounts = new Map<string, number>();
  const taxonomyCounts = new Map<string, number>();

  rows.forEach((row) => {
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
    row.taxonomy.forEach((tag) => taxonomyCounts.set(tag, (taxonomyCounts.get(tag) ?? 0) + 1));
  });

  return {
    statuses: Object.fromEntries(statusCounts),
    taxonomy: Object.fromEntries(taxonomyCounts)
  };
}

function computeAppetiteBreaches(rows: RiskRow[]): Array<{ id: string; title: string; residualScore: number }> {
  return rows
    .filter((row) => row.appetiteBreached)
    .map((row) => {
      const likelihood = row.residualLikelihood ?? row.inherentLikelihood;
      const impact = row.residualImpact ?? row.inherentImpact;
      return {
        id: row.id,
        title: row.title,
        residualScore: likelihood * impact
      };
    });
}

async function fetchRisks(): Promise<RiskRow[]> {
  try {
    const response = await apiClient.get<RisksResponse>(`/tenants/${TENANT_ID}/risks`);
    return response.items.map(toRiskRow);
  } catch (error) {
    return [
      {
        id: 'fallback-1',
        title: 'Cloud infrastructure outage',
        taxonomy: ['Operational'],
        inherentLikelihood: 4,
        inherentImpact: 5,
        residualLikelihood: 2,
        residualImpact: 3,
        status: 'Monitoring',
        owner: 'Risk Owner',
        appetiteBreached: false
      },
      {
        id: 'fallback-2',
        title: 'Supplier concentration risk',
        taxonomy: ['Strategic'],
        inherentLikelihood: 3,
        inherentImpact: 4,
        residualLikelihood: 3,
        residualImpact: 3,
        status: 'Assessment',
        owner: 'Procurement Lead',
        appetiteBreached: true
      }
    ];
  }
}

async function fetchHeatmap(): Promise<HeatmapResponse> {
  try {
    return await apiClient.get<HeatmapResponse>(`/tenants/${TENANT_ID}/risk-heatmap`);
  } catch (error) {
    return {
      matrix: {
        'L3_I4': {
          likelihood: 3,
          impact: 4,
          count: 1,
          risks: [
            {
              id: 'fallback-1',
              title: 'Cloud infrastructure outage',
              status: 'Monitoring',
              likelihood: 3,
              impact: 4,
              appetiteBreached: false
            }
          ]
        }
      },
      totals: {
        totalRisks: 2,
        appetiteBreaches: 1
      }
    } satisfies HeatmapResponse;
  }
}

async function fetchDashboard(): Promise<DashboardResponse> {
  try {
    return await apiClient.get<DashboardResponse>(`/tenants/${TENANT_ID}/audit-dashboard`);
  } catch (error) {
    return {
      planProgress: [
        { planId: 'plan-1', period: 'FY24', status: 'Approved', completed: 1, total: 3 }
      ],
      findingsBySeverity: { High: 2, Moderate: 1 },
      findingsAging: { '0-30': 1, '31-60': 1, '60+': 0 },
      utilization: { totalCapacity: 1600, bookedHours: 720, utilizationRate: 0.45 },
      indicatorSummary: { Open: 2, Closed: 1 }
    } satisfies DashboardResponse;
  }
}

async function fetchEngagements(): Promise<EngagementEvent[]> {
  try {
    const response = await apiClient.get<EngagementApi[]>(`/tenants/${TENANT_ID}/engagements`);
    return response.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      timestamp: item.startDate ?? new Date().toISOString(),
      owner: item.owner ?? 'Unassigned'
    }));
  } catch (error) {
    return [
      {
        id: 'eng-1',
        title: 'FY24 Enterprise Risk Review',
        status: 'Planning',
        timestamp: new Date().toISOString(),
        owner: 'Lead Auditor'
      },
      {
        id: 'eng-2',
        title: 'ITGC Controls Assessment',
        status: 'Fieldwork',
        timestamp: new Date().toISOString(),
        owner: 'Audit Manager'
      }
    ];
  }
}

export default async function DashboardPage() {
  const [riskRows, heatmapResponse, dashboard, engagements] = await Promise.all([
    fetchRisks(),
    fetchHeatmap(),
    fetchDashboard(),
    fetchEngagements()
  ]);

  const totalRisks = heatmapResponse.totals.totalRisks || riskRows.length;
  const appetiteBreaches = computeAppetiteBreaches(riskRows);
  const appetiteBreachCount = heatmapResponse.totals.appetiteBreaches || appetiteBreaches.length;
  const heatmapCells = buildHeatmapCells(heatmapResponse);
  const topRisks = computeTopRisks(riskRows);
  const counts = computeCounts(riskRows);
  const openFindings = Object.values(dashboard.findingsBySeverity).reduce((sum, count) => sum + count, 0);
  const activeEngagements = engagements.filter((event) => event.status.toLowerCase() !== 'closed').length;
  const utilizationPercent = Math.round((dashboard.utilization.utilizationRate ?? 0) * 100);

  const sortedEngagements = [...engagements].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <Badge className="w-fit bg-brand-600 text-white">Executive overview</Badge>
        <h2 className="text-3xl font-semibold text-slate-900 dark:text-white">Risk &amp; audit command center</h2>
        <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Correlate enterprise risk posture with audit execution metrics in a single tenant-isolated workspace. Data is pulled from
          the same assessments, heat maps, and audit dashboards available in the dedicated pages.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total risks" value={totalRisks.toString()} helper="Across current tenant" />
        <StatCard
          title="Appetite breaches"
          value={appetiteBreachCount.toString()}
          helper="Residual scores above configured appetite"
        />
        <StatCard title="Open findings" value={openFindings.toString()} helper="Weighted by severity" />
        <StatCard
          title="Active engagements"
          value={activeEngagements.toString()}
          helper={`${utilizationPercent}% capacity utilized`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Likelihood × impact heat map</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Shared from the risk register</span>
          </div>
          <div className="mt-4">
            <RiskHeatmap cells={heatmapCells} />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Audit plan execution</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Progress imported from the audit workspace with utilization context.
            </p>
            <div className="mt-4">
              <PlanProgressList plans={dashboard.planProgress} />
            </div>
          </div>
          <SummaryPills title="Follow-up status" data={dashboard.indicatorSummary} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Top residual risks</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Derived from the latest risk assessments per tenant.</p>
            <div className="mt-4">
              <TopRisksList risks={topRisks} />
            </div>
          </div>
          <SummaryPills title="Risk status mix" data={counts.statuses} />
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Findings aging</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Same severity buckets surfaced in the audit hub.</p>
            <div className="mt-4">
              <FindingsAging data={dashboard.findingsAging} />
            </div>
          </div>
          <SummaryPills title="Taxonomy coverage" data={counts.taxonomy} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Engagement activity</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Timeline entries mirror the audit engagement lifecycle with the same underlying data feed.
        </p>
        <div className="mt-6">
          <EngagementTimeline events={sortedEngagements} />
        </div>
      </div>
    </section>
  );
}
