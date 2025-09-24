import { Metadata } from 'next';
import { Suspense } from 'react';
import { apiClient } from '../../../lib/api/client';
import { useReactTable, getCoreRowModel, getFilteredRowModel, ColumnDef } from '@tanstack/react-table';
import { RiskTable, RiskRow } from '../../../components/risk/risk-table';

// ... (imports)

'use client';

import { Metadata } from 'next';
import { Suspense, useMemo, useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api/client';
import { RiskTable, RiskRow } from '../../../components/risk/risk-table';
import { Badge } from '../../../components/ui/badge';
import { StatCard } from '../../../components/ui/stat-card';
import { RiskHeatmap, HeatmapCell } from '../../../components/risk/risk-heatmap';
import { TopRisksList, TopRisk } from '../../../components/risk/top-risks';
import { SummaryPills } from '../../../components/risk/summary-pills';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, getPaginationRowModel, ColumnDef } from '@tanstack/react-table';
import { ArrowUpDownIcon } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { MoreHorizontalIcon } from 'lucide-react';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { Button } from '../../../components/ui/button';

export const metadata: Metadata = {
  title: 'Risk Register | OpenERM'
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

function toRiskRow(risk: ApiRisk): RiskRow {
  return {
    id: risk.id,
    title: risk.title,
    taxonomy: risk.taxonomy,
    inherentLikelihood: risk.inherentL,
    inherentImpact: risk.inherentI,
    residualLikelihood: risk.residualL,
    residualImpact: risk.residualI,
    status: risk.status,
    owner: risk.owner?.name ?? risk.owner?.email ?? null,
    appetiteBreached: risk.appetiteBreached
  };
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

export default function RiskPage() {
  const [riskRows, setRiskRows] = useState<RiskRow[]>([]);
  const [heatmapResponse, setHeatmapResponse] = useState<HeatmapResponse | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [risks, heatmap] = await Promise.all([fetchRisks(), fetchHeatmap()]);
      setRiskRows(risks);
      setHeatmapResponse(heatmap);
    };
    fetchData();
  }, []);

  const columns = useMemo<ColumnDef<RiskRow>[]>(
    () => [
      { accessorKey: 'title', header: 'Title' },
      {
        accessorKey: 'taxonomy',
        header: 'Taxonomy',
        cell: ({ getValue }) => {
          const taxonomy = getValue<string[] | undefined>() ?? [];
          return taxonomy.length > 0 ? taxonomy.join(', ') : '—';
        }
      },
      {
        accessorKey: 'inherentLikelihood',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Inherent L×I
            <ArrowUpDownIcon className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.inherentLikelihood}×{row.original.inherentImpact}
          </span>
        )
      },
      {
        accessorKey: 'residualLikelihood',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Residual L×I
            <ArrowUpDownIcon className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const { residualLikelihood, residualImpact } = row.original;
          if (residualLikelihood == null || residualImpact == null) {
            return '—';
          }
          return (
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {residualLikelihood}×{residualImpact}
            </span>
          );
        }
      },
      {
        accessorKey: 'owner',
        header: 'Owner',
        cell: ({ getValue }) => getValue<string | null>() ?? '—'
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row, getValue }) => (
          <div className="flex items-center gap-2">
            <Badge>{getValue<string>()}</Badge>
            {row.original.appetiteBreached ? <Badge className="bg-red-500/80 text-white">Appetite</Badge> : null}
          </div>
        )
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const risk = row.original
 
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => navigator.clipboard.writeText(risk.id)}
                >
                  Copy risk ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>View risk details</DropdownMenuItem>
                <DropdownMenuItem>Delete risk</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: riskRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!heatmapResponse) {
    return <div>Loading...</div>;
  }

  const heatmapCells = buildHeatmapCells(heatmapResponse);
  const topRisks = computeTopRisks(riskRows);
  const appetiteBreaches = computeAppetiteBreaches(riskRows);
  const counts = computeCounts(riskRows);
  const highDensityBuckets = heatmapCells.filter((cell) => cell.count >= 2).length;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <Badge className="w-fit bg-brand-600 text-white">Risk workspace</Badge>
        <h2 className="text-3xl font-semibold text-slate-900 dark:text-white">Risk register overview</h2>
        <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Monitor enterprise risks, assessments, and mitigation progress with per-tenant isolation and immutable audit trails.
          Dashboards combine likelihood × impact concentrations with appetite breach tracking to focus remediation.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total risks"
          value={(heatmapResponse.totals.totalRisks || riskRows.length).toString()}
          helper="Across current tenant"
        />
        <StatCard
          title="Appetite breaches"
          value={(heatmapResponse.totals.appetiteBreaches || appetiteBreaches.length).toString()}
          helper="Residual scores above configured appetite"
        />
        <StatCard
          title="High density cells"
          value={highDensityBuckets.toString()}
          helper="Heat map buckets with 2+ risks"
        />
        <StatCard
          title="Unique taxonomies"
          value={Object.keys(counts.taxonomy).length.toString()}
          helper="Risk categories represented"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Likelihood × Impact heat map</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Higher concentration → darker</span>
          </div>
          <div className="mt-4">
            <RiskHeatmap cells={heatmapCells} onCellClick={(bucket) => {
              const [likelihood, impact] = bucket.split('-');
              table.getColumn('inherentLikelihood')?.setFilterValue(likelihood);
              table.getColumn('inherentImpact')?.setFilterValue(impact);
            }} />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Top residual risks</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Derived from the latest assessment residuals per tenant.</p>
            <div className="mt-4">
              <TopRisksList risks={topRisks} />
            </div>
          </div>
          <SummaryPills title="Status mix" data={counts.statuses} />
          <SummaryPills title="Taxonomy coverage" data={counts.taxonomy} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Appetite breaches</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Residual scoring above tenant-defined appetite thresholds.
            </p>
          </div>
          <Badge className="bg-red-500/80 text-white">{appetiteBreaches.length}</Badge>
        </div>
        <div className="mt-4 space-y-3">
          {appetiteBreaches.map((risk) => (
            <div
              key={risk.id}
              className="flex items-center justify-between rounded-xl border border-red-200/60 bg-red-50/60 p-4 text-sm dark:border-red-800/40 dark:bg-red-900/30"
            >
              <span className="font-medium text-red-900 dark:text-red-200">{risk.title}</span>
              <span className="text-red-700 dark:text-red-200">Residual {risk.residualScore.toFixed(1)}</span>
            </div>
          ))}
          {appetiteBreaches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
              All risks are operating within configured appetite thresholds.
            </div>
          ) : null}
        </div>
      </div>

      <Suspense fallback={<div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">Loading risk data…</div>}>
        <div className="flex items-center py-4">
          <Input
            placeholder="Filter by title..."
            value={(table.getColumn('title')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('title')?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          <Button onClick={() => console.log('Create new risk')}>Create</Button>
          <div className="ml-auto flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  Status <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  className="capitalize"
                  checked={table.getColumn('status')?.getFilterValue() === 'Open'}
                  onCheckedChange={(value) =>
                    table.getColumn('status')?.setFilterValue(value ? 'Open' : undefined)
                  }
                >
                  Open
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  className="capitalize"
                  checked={table.getColumn('status')?.getFilterValue() === 'Closed'}
                  onCheckedChange={(value) =>
                    table.getColumn('status')?.setFilterValue(value ? 'Closed' : undefined)
                  }
                >
                  Closed
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  Appetite <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  className="capitalize"
                  checked={table.getColumn('appetiteBreached')?.getFilterValue() === true}
                  onCheckedChange={(value) =>
                    table.getColumn('appetiteBreached')?.setFilterValue(value ? true : undefined)
                  }
                >
                  Breached
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <RiskTable table={table} />
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </Suspense>
    </section>
  );
}
