'use client';

import { cn } from '@/lib/utils';

export type StatusVariant = 'success' | 'warning' | 'error' | 'neutral' | 'info' | 'procedure';

const variantStyles: Record<StatusVariant, string> = {
    success:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
    warning:
        'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
    error:
        'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-red-200 dark:border-red-800/50',
    neutral:
        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    info:
        'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400 border-sky-200 dark:border-sky-800/50',
    procedure:
        'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-800/50',
};

export interface StatusPillProps {
    children: React.ReactNode;
    variant: StatusVariant;
    className?: string;
}

export function StatusPill({ children, variant, className }: StatusPillProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider',
                variantStyles[variant],
                className
            )}
        >
            {children}
        </span>
    );
}

/** Map common status strings to StatusVariant for use in tables */
export function statusToVariant(status: string): StatusVariant {
    const s = String(status).toUpperCase();
    if (['PAID', 'COMPLETED', 'ACTIVE', 'DONE', 'SUCCESS'].includes(s)) return 'success';
    if (['IN_SURGERY', 'OPERATING', 'SURGERY'].includes(s)) return 'procedure';
    if (['EXAMINING', 'IN PROGRESS', 'EXAMINATION'].includes(s)) return 'info';
    if (['PENDING', 'PARTIAL', 'SUSPENDED', 'DRAFT', 'SCHEDULED', 'RECEIVED'].includes(s)) return 'warning';
    if (['UNPAID', 'CANCELLED', 'OVERDUE', 'BANNED', 'INACTIVE'].includes(s)) return 'error';
    if (['UNASSIGNED'].includes(s)) return 'neutral';
    return 'neutral';
}
