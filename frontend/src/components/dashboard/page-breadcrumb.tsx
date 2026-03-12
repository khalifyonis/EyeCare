'use client';

import Link from 'next/link';

type PageBreadcrumbProps = {
    current: string;
    className?: string;
};

export function PageBreadcrumb({ current, className }: PageBreadcrumbProps) {
    return (
        <div
            className={
                className ??
                'text-sm text-muted-foreground flex items-center gap-2'
            }
            aria-label="Breadcrumb"
        >
            <Link
                href="/dashboard"
                className="font-medium hover:text-foreground transition-colors"
            >
                Dashboard
            </Link>
            <span className="opacity-60" aria-hidden="true">&gt;</span>
            <span className="font-medium text-foreground/80">{current}</span>
        </div>
    );
}
