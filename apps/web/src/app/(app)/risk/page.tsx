'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { RiskTable } from '@/components/risk/risk-table';
import { riskApi } from "@/lib/api";
import { useTenant } from '@/components/providers/tenant-provider';

export default function RiskRegisterPage() {
  const searchParams = useSearchParams();
  const { tenantId } = useTenant();

  const page = searchParams.get('page') ?? '1';
  const pageSize = searchParams.get('pageSize') ?? '10';
  const sort = searchParams.get('sort') ?? 'updatedAt';
  const status = searchParams.get('status');
  const appetiteBreached = searchParams.get('appetiteBreached');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['risks', tenantId, page, pageSize, sort, status, appetiteBreached],
    queryFn: async () => {
      if (!tenantId) return { data: [], meta: { totalPages: 0 } };

      const params = new URLSearchParams({
        page,
        pageSize,
        sort,
      });

      if (status && status !== 'all') params.append('status', status);
      if (appetiteBreached && appetiteBreached !== 'all') params.append('appetiteBreached', appetiteBreached);

      const response = await riskApi.list(tenantId, params.toString());
      
      return {
          data: response.items,
          meta: {
              totalPages: Math.ceil(response.total / parseInt(pageSize, 10))
          }
      };
    },
    enabled: !!tenantId,
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError || !data) return <div>Error fetching data</div>;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Risk Register</h1>
      <RiskTable data={data.data} pageCount={data.meta.totalPages} />
    </div>
  );
}
