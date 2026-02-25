'use client';

import { useState } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
} from '@tanstack/react-table';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Search,
    RefreshCcw,
    Loader2,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

interface DataTableProps<TData> {
    columns: ColumnDef<TData, any>[];
    data: TData[];
    searchKey?: string;
    searchPlaceholder?: string;
    loading?: boolean;
    onRefresh?: () => void;
    pageSize?: number;
    itemLabel?: string;
}

export function DataTable<TData>({
    columns,
    data,
    searchPlaceholder = 'Search...',
    loading = false,
    onRefresh,
    pageSize = 10,
    itemLabel = 'rows',
}: DataTableProps<TData>) {
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<SortingState>([]);

    const table = useReactTable({
        data,
        columns,
        state: { globalFilter, sorting },
        onGlobalFilterChange: setGlobalFilter,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: { pageSize },
        },
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4 bg-background/50 backdrop-blur pb-4 border-b">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={searchPlaceholder}
                        className="pl-9 h-10 border-slate-200 dark:border-slate-800 focus-visible:ring-[#0EA5E9]"
                        value={globalFilter ?? ''}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                    />
                </div>
                {onRefresh && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onRefresh}
                        disabled={loading}
                        className="hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                )}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent px-2">
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="text-slate-500 font-bold uppercase text-[11px] tracking-wider py-4">
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin text-[#0EA5E9]" />
                                        <span>Loading data...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground font-medium">
                                    No results found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors border-slate-100 dark:border-slate-800/50">
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-3 px-4">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {!loading && table.getRowModel().rows.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20">
                        <p className="text-xs text-slate-500 font-medium tracking-tight">
                            Showing <span className="text-slate-900 dark:text-white font-bold">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span>–<span className="text-slate-900 dark:text-white font-bold">{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)}</span> of <span className="text-[#0EA5E9] font-black">{table.getFilteredRowModel().rows.length}</span> {itemLabel}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                                className="h-8 px-3 text-[11px] font-bold uppercase tracking-wider border-slate-200 dark:border-slate-800 hover:bg-[#0EA5E9]/5 hover:text-[#0EA5E9] hover:border-[#0EA5E9]/20 transition-all"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                                className="h-8 px-3 text-[11px] font-bold uppercase tracking-wider border-slate-200 dark:border-slate-800 hover:bg-[#0EA5E9]/5 hover:text-[#0EA5E9] hover:border-[#0EA5E9]/20 transition-all"
                            >
                                Next
                                <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
