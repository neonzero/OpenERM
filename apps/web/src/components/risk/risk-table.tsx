'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Risk } from '@prisma/client';

type RiskRow = Pick<
  Risk,
  'id' | 'title' | 'status' | 'inherentScore' | 'residualScore'
> & {
  owner: { name: string } | null;
};

const columns: ColumnDef<RiskRow>[] = [
  {
    accessorKey: 'title',
    header: 'Risk',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
  {
    accessorKey: 'owner.name',
    header: 'Owner',
  },
  {
    accessorKey: 'inherentScore',
    header: 'Inherent Score',
  },
  {
    accessorKey: 'residualScore',
    header: 'Residual Score',
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const risk = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => console.log('Edit', risk.id)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => console.log('Delete', risk.id)}>
              Delete
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => console.log('Reassess', risk.id)}
            >
              Reassess
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export function RiskTable({
  data,
  pageCount,
}: {
  data: RiskRow[];
  pageCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get('page')) || 1;
  const pageSize = Number(searchParams.get('pageSize')) || 10;
  const sort = searchParams.get('sort') || 'updatedAt';
  const status = searchParams.get('status');
  const appetiteBreached = searchParams.get('appetiteBreached');

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(name, value);
    return params.toString();
  };

  const table = useReactTable({
    data,
    columns,
    pageCount,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Select
            value={status || 'all'}
            onValueChange={(value) => {
              router.push(pathname + '?' + createQueryString('status', value));
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={appetiteBreached || 'all'}
            onValueChange={(value) => {
              router.push(
                pathname + '?' + createQueryString('appetiteBreached', value)
              );
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Appetite Breach" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Breached</SelectItem>
              <SelectItem value="false">Not Breached</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sort}
            onValueChange={(value) => {
              router.push(pathname + '?' + createQueryString('sort', value));
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt">Last Updated</SelectItem>
              <SelectItem value="residualScoreAsc">
                Residual Score (Asc)
              </SelectItem>
              <SelectItem value="residualScoreDesc">
                Residual Score (Desc)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => console.log('Create Risk')}>Create Risk</Button>
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 cursor-pointer"
                onClick={() => router.push(`/risk/${row.original.id}`)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-3 text-slate-700 dark:text-slate-200"
                  >
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                router.push(
                  pathname + '?' + createQueryString('pageSize', value)
                );
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {page} of {pageCount}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() =>
                router.push(pathname + '?' + createQueryString('page', '1'))
              }
              disabled={page <= 1}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() =>
                router.push(
                  pathname + '?' + createQueryString('page', String(page - 1))
                )
              }
              disabled={page <= 1}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() =>
                router.push(
                  pathname + '?' + createQueryString('page', String(page + 1))
                )
              }
              disabled={page >= pageCount}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() =>
                router.push(
                  pathname + '?' + createQueryString('page', String(pageCount))
                )
              }
              disabled={page >= pageCount}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}