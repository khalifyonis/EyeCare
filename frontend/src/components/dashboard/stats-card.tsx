'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatsCardColor = 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'orange';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color: StatsCardColor;
    trend?: {
        text: string;
        isUp: boolean;
    };
    className?: string;
}

const iconBgMap: Record<StatsCardColor, string> = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    orange: 'bg-orange-500',
};

const trendColorMap: Record<string, string> = {
    up: 'text-emerald-600 dark:text-emerald-400',
    down: 'text-rose-500 dark:text-rose-400',
};

export function StatsCard({
    title,
    value,
    icon: Icon,
    color,
    trend,
    className,
}: StatsCardProps) {
    return (
        <div
            className={cn(
                'rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 min-w-0',
                className
            )}
        >
            {/* Row 1: icon + title */}
            <div className="flex items-center gap-3 mb-4">
                <div className={cn('flex shrink-0 w-10 h-10 rounded-lg items-center justify-center', iconBgMap[color])}>
                    <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-tight">
                    {title}
                </span>
            </div>

            {/* Row 2: value */}
            <p className="text-[1.75rem] font-bold text-slate-900 dark:text-white tracking-tight tabular-nums leading-none mb-3">
                {value}
            </p>

            {/* Row 3: trend */}
            {trend && (
                <div className={cn('flex items-center gap-1.5 text-xs font-medium', trend.isUp ? trendColorMap.up : trendColorMap.down)}>
                    {trend.isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{trend.text}</span>
                </div>
            )}
        </div>
    );
}
