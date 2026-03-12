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

export function ServerPagination({
    page,
    limit,
    total,
    totalPages,
    onPageChange,
    onLimitChange,
    limitOptions = DEFAULT_LIMIT_OPTIONS,
    disabled = false,
}: ServerPaginationProps) {
    const totalPagesSafe = totalPages || 1;

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-transparent bg-slate-50 dark:bg-slate-900/40">
            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                {onLimitChange && (
                    <span className="flex items-center gap-2">
                        Rows per page
                        <Select
                            value={String(limit)}
                            onValueChange={(v) => onLimitChange(Number(v))}
                            disabled={disabled}
                        >
                            <SelectTrigger className="h-8 w-[68px] border-slate-200 dark:border-slate-700 text-sm font-medium">
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
                <span className="px-3 text-sm text-slate-600 dark:text-slate-400">
                    Page <span className="font-semibold text-slate-900 dark:text-white">{page}</span> of{' '}
                    <span className="font-semibold text-slate-900 dark:text-white">{totalPagesSafe}</span>
                </span>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-md border-slate-200 dark:border-slate-700"
                    onClick={() => onPageChange(page + 1)}
                    disabled={disabled || page >= totalPagesSafe}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-md border-slate-200 dark:border-slate-700"
                    onClick={() => onPageChange(totalPagesSafe)}
                    disabled={disabled || page >= totalPagesSafe}
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
