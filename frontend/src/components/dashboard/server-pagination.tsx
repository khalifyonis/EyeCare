'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type ServerPaginationProps = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    disabled?: boolean;
};

export function ServerPagination({
    page,
    limit,
    total,
    totalPages,
    onPageChange,
    disabled = false,
}: ServerPaginationProps) {
    const start = total === 0 ? 0 : (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 py-3 px-1 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{start}</span>–
                <span className="font-medium text-foreground">{end}</span> of{' '}
                <span className="font-medium text-foreground">{total}</span>
            </p>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(page - 1)}
                    disabled={disabled || page <= 1}
                    className="h-9"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                    Page {page} of {totalPages || 1}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(page + 1)}
                    disabled={disabled || page >= totalPages}
                    className="h-9"
                >
                    Next
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
