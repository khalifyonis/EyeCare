'use client';

import { useState, useEffect } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
    type RowSelectionState,
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
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Search,
    RefreshCcw,
    Loader2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

function getPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | 'ellipsis')[] = [];
    if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
    }
    return pages;
}

export type QuickAction<TData> = {
    id: string;
    label: string;
    onClick: (selected: TData[]) => void;
    variant?: 'default' | 'destructive' | 'outline';
};

interface DataTableProps<TData> {
    columns: ColumnDef<TData, any>[];
    data: TData[];
    searchKey?: string;
    searchPlaceholder?: string;
    loading?: boolean;
    onRefresh?: () => void;
    pageSize?: number;
    itemLabel?: string;
    hideSearch?: boolean;
    hidePagination?: boolean;
    emptyMessage?: string;
    emptyDescription?: string;
    enableRowSelection?: boolean;
    onSelectionChange?: (rows: TData[]) => void;
    quickActions?: QuickAction<TData>[];
    /** Change this key (e.g. after bulk delete) to clear row selection */
    selectionKey?: string | number;
}

export function DataTable<TData>({
    columns,
    data,
    searchPlaceholder = 'Search...',
    loading = false,
    onRefresh,
    pageSize = 10,
    itemLabel = 'rows',
    hideSearch = false,
    hidePagination = false,
    emptyMessage,
    emptyDescription,
    enableRowSelection = false,
    onSelectionChange,
    quickActions,
    selectionKey,
}: DataTableProps<TData>) {
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    useEffect(() => {
        setRowSelection({});
    }, [selectionKey]);

    const selectionColumn: ColumnDef<TData, any> = {
        id: 'select',
        header: ({ table: t }) => (
            <Checkbox
                checked={t.getIsAllPageRowsSelected()}
                indeterminate={t.getIsSomePageRowsSelected()}
                onChange={t.getToggleAllPageRowsSelectedHandler()}
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onChange={row.getToggleSelectedHandler()}
            />
        ),
        enableSorting: false,
        enableGlobalFilter: false,
    };

    const finalColumns = enableRowSelection ? [selectionColumn, ...columns] : columns;

    const table = useReactTable({
        data,
        columns: finalColumns,
        state: { globalFilter, sorting, rowSelection },
        onGlobalFilterChange: setGlobalFilter,
        onSortingChange: setSorting,
        onRowSelectionChange: (updater) => {
            const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
            setRowSelection(newSelection);
            if (onSelectionChange) {
                const selectedIndices = Object.keys(newSelection).filter(k => newSelection[k]).map(Number);
                onSelectionChange(selectedIndices.map(i => data[i]).filter(Boolean));
            }
        },
        enableRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: hidePagination ? undefined : getPaginationRowModel(),
        initialState: {
            pagination: { pageSize: hidePagination ? 9999 : pageSize },
        },
    });

    const totalRows = table.getFilteredRowModel().rows.length;
    const pageCount = table.getPageCount();
    const { pageIndex, pageSize: currentPageSize } = table.getState().pagination;
    const start = totalRows === 0 ? 0 : pageIndex * currentPageSize + 1;
    const end = Math.min((pageIndex + 1) * currentPageSize, totalRows);
    const currentPage = pageIndex + 1;
    const pageNumbers = getPageNumbers(currentPage, pageCount || 1);

    const selectedCount = Object.values(rowSelection).filter(Boolean).length;

    return (
        <div>
            {!hideSearch && (
                <div className="flex items-center gap-4 p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder={searchPlaceholder}
                            className="pl-9 h-10 rounded-lg border-slate-200 dark:border-slate-700 text-sm"
                            value={globalFilter ?? ''}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                        />
                    </div>
                    {onRefresh && (
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={onRefresh}
                            disabled={loading}
                            className="h-10 w-10 rounded-lg border-slate-200 dark:border-slate-700"
                        >
                            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    )}
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/60 [&_tr]:border-slate-200 dark:[&_tr]:border-slate-700 [&_tr]:hover:bg-transparent">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="border-slate-200 dark:border-slate-700 hover:bg-transparent">
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className={`text-slate-600 dark:text-slate-300 font-semibold text-[13px] tracking-normal py-3 ${
                                            header.id === 'select' ? 'w-[50px] px-4' : ''
                                        }`}
                                    >
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
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={finalColumns.length} className="h-32 text-center">
                                    <div className="flex items-center justify-center gap-2 text-slate-500">
                                        <Loader2 className="w-5 h-5 animate-spin text-[#0EA5E9]" />
                                        <span className="text-sm">Loading data...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={finalColumns.length} className="h-40 text-center">
                                    <div className="flex flex-col items-center gap-1.5">
                                        <span className="text-slate-500 text-sm">
                                            {emptyMessage || `No ${itemLabel} found.`}
                                        </span>
                                        {emptyDescription && (
                                            <span className="text-xs text-slate-400 max-w-xs">
                                                {emptyDescription}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() ? 'selected' : undefined}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            className={cell.column.id === 'select' ? 'w-[50px] px-4' : undefined}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {enableRowSelection && selectedCount > 0 && quickActions && quickActions.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40">
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-normal">
                            {selectedCount} {itemLabel}
                            {selectedCount === 1 ? '' : 's'} selected
                        </span>
                        {quickActions
                            .filter((a) => a.variant === 'destructive')
                            .map((action) => (
                                <button
                                    key={action.id}
                                    type="button"
                                    onClick={() => action.onClick(table.getSelectedRowModel().rows.map((r) => r.original))}
                                    className="font-normal text-red-600 dark:text-red-400 hover:underline"
                                >
                                    {action.id === 'delete' ? 'Delete Them' : action.label}
                                </button>
                            ))}
                    </div>
                    <div className="flex items-center gap-2">
                        {quickActions
                            .filter((a) => a.variant !== 'destructive')
                            .map((action) => (
                                <Button
                                    key={action.id}
                                    variant={action.variant === 'outline' ? 'outline' : 'default'}
                                    size="sm"
                                    className={action.variant !== 'outline' ? 'bg-[#0EA5E9] hover:bg-[#0c96d4] text-white' : ''}
                                    onClick={() => action.onClick(table.getSelectedRowModel().rows.map((r) => r.original))}
                                >
                                    {action.id === 'download'
                                        ? `Download ${selectedCount} item${selectedCount === 1 ? '' : 's'}`
                                        : action.label}
                                </Button>
                            ))}
                    </div>
                </div>
            )}

            {!loading && !hidePagination && totalRows > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-transparent bg-slate-50 dark:bg-slate-900/40">
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        {enableRowSelection && selectedCount > 0 && !(quickActions && quickActions.length > 0) && (
                            <span className="font-medium text-[#0EA5E9]">
                                {selectedCount} selected
                            </span>
                        )}
                        <span className="flex items-center gap-2">
                            Rows per page
                            <Select
                                value={String(currentPageSize)}
                                onValueChange={(v) => table.setPageSize(Number(v))}
                            >
                                <SelectTrigger className="h-8 w-[68px] border-slate-200 dark:border-slate-700 text-sm font-medium">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ROWS_PER_PAGE_OPTIONS.map((n) => (
                                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </span>
                        {/* Left side intentionally only rows-per-page, no total text to match sample footer */}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-md border-slate-200 dark:border-slate-700"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-md border-slate-200 dark:border-slate-700"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="px-3 text-sm text-slate-600 dark:text-slate-400">
                            Page <span className="font-semibold text-slate-900 dark:text-white">{currentPage}</span> of{' '}
                            <span className="font-semibold text-slate-900 dark:text-white">{pageCount || 1}</span>
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-md border-slate-200 dark:border-slate-700"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-md border-slate-200 dark:border-slate-700"
                            onClick={() => table.setPageIndex(pageCount - 1)}
                            disabled={!table.getCanNextPage()}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
