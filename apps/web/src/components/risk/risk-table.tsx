'use client';

import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useMemo } from 'react';
import { Badge } from '../ui/badge';

export type RiskRow = {
  id: string;
  title: string;
  taxonomy: string[];
  inherentLikelihood: number;
  inherentImpact: number;
  residualLikelihood?: number | null;
  residualImpact?: number | null;
  status: string;
  owner?: string | null;
  appetiteBreached?: boolean;

};

export function RiskTable({ data }: { data: RiskRow[] }) {
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
        header: 'Inherent L×I',
        cell: ({ row }) => (
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.inherentLikelihood}×{row.original.inherentImpact}
          </span>
        )
      },
      {
        accessorKey: 'residualLikelihood',
        header: 'Residual L×I',
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

      }
    ],
    []
  );

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-800/40">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 text-slate-700 dark:text-slate-200">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
