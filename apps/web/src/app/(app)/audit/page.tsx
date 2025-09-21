import { Metadata } from 'next';
import { apiClient } from '../../../lib/api/client';
import { StatCard } from '../../../components/ui/stat-card';
import { EngagementTimeline, EngagementEvent } from '../../../components/audit/engagement-timeline';
import { Badge } from '../../../components/ui/badge';
import { PlanProgressList, PlanProgress } from '../../../components/audit/plan-progress';
import { FindingsAging } from '../../../components/audit/findings-aging';
import { SummaryPills } from '../../../components/risk/summary-pills';

export const metadata: Metadata = {
  title: 'Audit Hub | OpenERM'
};

type EngagementResponse = {
  items: Array<{
    id: string;
    name: string;
    status: string;
    startDate?: string;
    owner?: { displayName: string };
  }>;
};

type DashboardResponse = {
  planProgress: PlanProgress[];
  findingsBySeverity: Record<string, number>;
  findingsAging: { '0-30': number; '31-60': number; '60+': number };
  utilization: { totalCapacity: number; bookedHours: number; utilizationRate: number };
  engagements: Array<{ id: string; name: string; status: string; findingsOpen: number; startDate: Date | string | null }>;
  indicatorSummary: Record<string, number>;
};

async function fetchEngagements(): Promise<EngagementEvent[]> {
  try {
    const response = await apiClient.get<EngagementResponse>('/audits/engagements');
    return response.items.map((item) => ({
      id: item.id,
      title: item.name,
      status: item.status,
      timestamp: item.startDate ?? new Date().toISOString(),
      owner: item.owner?.displayName ?? 'Unassigned'
    }));
  } catch (error) {
    return [
      {
        id: 'eng-1',
        title: 'FY24 Enterprise Risk Review',
        status: 'PLANNING',
        timestamp: new Date().toISOString(),
        owner: 'Lead Auditor'
      },
      {
        id: 'eng-2',
        title: 'ITGC Controls Assessment',
        status: 'FIELDWORK',
        timestamp: new Date().toISOString(),
        owner: 'Audit Manager'
      }
    ];
  }
}

async function fetchDashboard(): Promise<DashboardResponse> {
  try {
    const response = await apiClient.get<DashboardResponse>('/audits/dashboard');
    return response;
  } catch (error) {
    return {
      planProgress: [
        { planId: 'plan-1', period: 'FY24', status: 'IN_PROGRESS', completed: 3, total: 5 }
      ],
      findingsBySeverity: { HIGH: 2, MODERATE: 1 },
      findingsAging: { '0-30': 1, '31-60': 1, '60+': 1 },
      utilization: { totalCapacity: 1600, bookedHours: 720, utilizationRate: 0.45 },
      engagements: [],
      indicatorSummary: { ON_TRACK: 2, WARNING: 1 }
    };
  }
}

export default async function AuditPage() {
  const [engagements, dashboard] = await Promise.all([fetchEngagements(), fetchDashboard()]);
  const openFindings = Object.values(dashboard.findingsBySeverity).reduce((sum, count) => sum + count, 0);
  const utilizationPercent = Math.round((dashboard.utilization.utilizationRate ?? 0) * 100);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <Badge className="w-fit bg-purple-600 text-white">Audit workspace</Badge>
        <h2 className="text-3xl font-semibold text-slate-900 dark:text-white">Internal audit lifecycle</h2>
        <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Track audit engagements, workpapers, and findings with immutable evidence trails and time
          tracking aligned to IIA 2024 standards. Dashboards highlight plan execution, capacity, and
          issue aging to focus remediation.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Active engagements" value={engagements.filter((event) => event.status !== 'CLOSED').length.toString()} helper="Across all tenants" />
        <StatCard title="Open findings" value={openFindings.toString()} helper="By severity weighting" />
        <StatCard title="Capacity used" value={`${utilizationPercent}%`} helper={`${dashboard.utilization.bookedHours}h booked`} />
        <StatCard title="KRIs flagged" value={((dashboard.indicatorSummary.WARNING ?? 0) + (dashboard.indicatorSummary.BREACHED ?? 0)).toString()} helper="Linked to audit scope" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Audit plan execution</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Status by period across the risk-based audit universe.
          </p>
          <div className="mt-4">
            <PlanProgressList plans={dashboard.planProgress} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Findings aging</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Monitor outstanding issues by elapsed days.</p>
          <div className="mt-4">
            <FindingsAging data={dashboard.findingsAging} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Indicator health</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Key risk indicators feeding the risk-based audit program.
          </p>
          <div className="mt-4">
            <SummaryPills title="Indicators" data={dashboard.indicatorSummary} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Utilization insight</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Hours booked vs available across roles.
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <p>Total capacity: {dashboard.utilization.totalCapacity}h</p>
            <p>Booked hours: {dashboard.utilization.bookedHours}h</p>
            <p>Utilization rate: {utilizationPercent}%</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Engagement progress</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Status changes are logged to the immutable audit trail with actor, timestamp, and supporting
          evidence references.
        </p>
        <div className="mt-6">
          <EngagementTimeline events={engagements} />
        </div>
      </div>
    </section>
  );
}
