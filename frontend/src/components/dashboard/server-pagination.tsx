'use client';

import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const DEFAULT_LIMIT_OPTIONS = [10, 20, 50, 100];

type ServerPaginationProps = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onLimitChange?: (limit: number) => void;
    limitOptions?: number[];
    disabled?: boolean;
    itemLabel?: string;
};

function getPageNumbers(page: number, totalPages: number): (number | 'ellipsis')[] {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | 'ellipsis')[] = [];
    if (page <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
    } else if (page >= totalPages - 3) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = page - 1; i <= page + 1; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
    }
    return pages;
}

export function ServerPagination({
    page,
    limit,
    total,
    totalPages,
    onPageChange,
    onLimitChange,
    limitOptions = DEFAULT_LIMIT_OPTIONS,
    disabled = false,
    itemLabel = 'rows',
}: ServerPaginationProps) {
    const start = total === 0 ? 0 : (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    const pageNumbers = getPageNumbers(page, totalPages || 1);

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-4">
                {onLimitChange && (
                    <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        Rows per page{' '}
                        <Select
                            value={String(limit)}
                            onValueChange={(v) => onLimitChange(Number(v))}
                            disabled={disabled}
                        >
                            <SelectTrigger className="h-8 w-[72px] border-slate-200 dark:border-slate-700 text-sm font-medium">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(limitOptions.includes(limit) ? limitOptions : [...limitOptions, limit].sort((a, b) => a - b)).map((n) => (
                                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </span>
                )}
                <span className="text-sm text-slate-600 dark:text-slate-400">
                    Showing <span className="font-semibold text-slate-900 dark:text-white">{start}</span>–
                    <span className="font-semibold text-slate-900 dark:text-white">{end}</span> of{' '}
                    <span className="font-semibold text-slate-900 dark:text-white">{total}</span> {itemLabel}
                </span>
            </div>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-md border-slate-200 dark:border-slate-700"
                    onClick={() => onPageChange(1)}
                    disabled={disabled || page <= 1}
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-md border-slate-200 dark:border-slate-700"
                    onClick={() => onPageChange(page - 1)}
                    disabled={disabled || page <= 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="flex items-center gap-1 px-1">
                    {pageNumbers.map((n, i) =>
                        n === 'ellipsis' ? (
                            <span key={`ellipsis-${i}`} className="px-1.5 text-slate-400 text-sm">…</span>
                        ) : (
                            <Button
                                key={n}
                                variant={page === n ? 'default' : 'outline'}
                                size="icon"
                                className={`h-8 w-8 rounded-md text-sm font-semibold ${
                                    page === n
                                        ? 'bg-[#0EA5E9] hover:bg-[#0c96d4] text-white border-0'
                                        : 'border-slate-200 dark:border-slate-700'
                                }`}
                                onClick={() => onPageChange(n)}
                                disabled={disabled}
                            >
                                {n}
                            </Button>
                        )
                    )}
                </span>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-md border-slate-200 dark:border-slate-700"
                    onClick={() => onPageChange(page + 1)}
                    disabled={disabled || page >= totalPages}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-md border-slate-200 dark:border-slate-700"
                    onClick={() => onPageChange(totalPages || 1)}
                    disabled={disabled || page >= totalPages}
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
