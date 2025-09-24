'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { riskApi } from '@/lib/api';
import { useTenant } from '@/components/providers/tenant-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Assuming tabs component exists

import { AssessmentsList } from '@/components/risk/assessments-list';
import { TreatmentsList } from '@/components/risk/treatments-list';
import { KRIList } from '@/components/risk/kri-list';
import { HistoryList } from '@/components/risk/history-list';

function RiskOverview({ risk }: { risk: any }) {
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold">{risk.title}</h2>
            <p className="text-gray-500">{risk.description}</p>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="font-bold">Status</p>
                    <p>{risk.status}</p>
                </div>
                <div>
                    <p className="font-bold">Owner</p>
                    <p>{risk.owner?.name || 'N/A'}</p>
                </div>
                <div>
                    <p className="font-bold">Inherent Score</p>
                    <p>{risk.inherentL * risk.inherentI}</p>
                </div>
                <div>
                    <p className="font-bold">Residual Score</p>
                    <p>{risk.residualScore || 'N/A'}</p>
                </div>
            </div>
        </div>
    );
}

export default function RiskDetailPage() {
  const params = useParams();
  const { tenantId } = useTenant();
  const riskId = params.riskId as string;

  const { data: risk, isLoading, isError } = useQuery({
    queryKey: ['risk', tenantId, riskId],
    queryFn: () => riskApi.get(tenantId!, riskId),
    enabled: !!tenantId && !!riskId,
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError || !risk) return <div>Error fetching risk data</div>;

  return (
    <div className="container mx-auto py-10">
        <Tabs defaultValue="overview">
            <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="assessments">Assessments</TabsTrigger>
                <TabsTrigger value="treatments">Treatments</TabsTrigger>
                <TabsTrigger value="controls">Controls</TabsTrigger>
                <TabsTrigger value="kris">KRIs</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
                <RiskOverview risk={risk} />
            </TabsContent>
            <TabsContent value="assessments">
                <AssessmentsList assessments={risk.assessments} />
            </TabsContent>
            <TabsContent value="treatments">
                <TreatmentsList treatments={risk.treatments} />
            </TabsContent>
            <TabsContent value="controls">
                <p>Controls are not directly linked to risks in the current data model.</p>
            </TabsContent>
            <TabsContent value="kris">
                <KRIList indicators={risk.indicators} />
            </TabsContent>
            <TabsContent value="history">
                <HistoryList events={risk.history} />
            </TabsContent>
        </Tabs>
    </div>
  );
}