import { Metadata } from 'next';
import { Suspense } from 'react';
import { apiClient } from '../../../lib/api/client';
import { RiskTable, RiskRow } from '../../../components/risk/risk-table';
import { Badge } from '../../../components/ui/badge';

export const metadata: Metadata = {
  title: 'Risk Register | OpenERM'
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
        status: 'MITIGATION'
      },
      {
        id: 'fallback-2',
        referenceId: 'R-002',
        title: 'Supplier concentration risk',
        category: 'Strategic',
        inherentScore: 12,
        residualScore: 9,
        status: 'ASSESSMENT'
      }
    ];
  }
}

export default async function RiskPage() {
  const risks = await fetchRisks();

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <Badge className="w-fit bg-brand-600 text-white">Risk workspace</Badge>
        <h2 className="text-3xl font-semibold text-slate-900 dark:text-white">Risk register overview</h2>
        <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Monitor enterprise risks, track assessments, and coordinate mitigation plans. Data is scoped
          per-tenant with row-level security enforced in PostgreSQL.
        </p>
      </div>
      <Suspense fallback={<div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">Loading risk data…</div>}>
        <RiskTable data={risks} />
      </Suspense>
    </section>
  );
}
