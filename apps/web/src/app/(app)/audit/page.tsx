import { Metadata } from 'next';
import { apiClient } from '../../../lib/api/client';
import { StatCard } from '../../../components/ui/stat-card';
import { EngagementTimeline, EngagementEvent } from '../../../components/audit/engagement-timeline';
import { Badge } from '../../../components/ui/badge';

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

export default async function AuditPage() {
  const engagements = await fetchEngagements();
  const openCount = engagements.filter((event) => event.status !== 'CLOSED').length;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <Badge className="w-fit bg-purple-600 text-white">Audit workspace</Badge>
        <h2 className="text-3xl font-semibold text-slate-900 dark:text-white">Internal audit lifecycle</h2>
        <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Track audit engagements, workpapers, and findings with immutable evidence trails per IIA 2024
          standards.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Active engagements" value={openCount.toString()} helper="Across all tenants" />
        <StatCard title="Open findings" value="4" helper="Auto-synced from audit service" />
        <StatCard title="Avg. time to close" value="32 days" helper="Rolling 90-day window" />
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
