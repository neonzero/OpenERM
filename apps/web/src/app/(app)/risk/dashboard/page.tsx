
'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { RiskHeatmap } from '@/components/risk/risk-heatmap';
import { riskApi } from '@/lib/api';
import { useTenant } from '@/components/providers/tenant-provider';

export default function RiskDashboardPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const { data: heatmapData, isLoading, isError } = useQuery({
    queryKey: ['risk-heatmap', tenantId],
    queryFn: () => riskApi.heatmap(tenantId!),
    enabled: !!tenantId,
  });

  const handleCellClick = (bucket: string) => {
    const [l, i] = bucket.split('-');
    const likelihood = l.replace('L', '');
    const impact = i.replace('I', '');
    router.push(`/risk?likelihood=${likelihood}&impact=${impact}`);
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError || !heatmapData) return <div>Error fetching heatmap data</div>;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Risk Heatmap</h1>
      <RiskHeatmap cells={Object.values(heatmapData.matrix)} onCellClick={handleCellClick} />
    </div>
  );
}
