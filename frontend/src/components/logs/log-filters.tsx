'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import type { LogFilters, LogUser } from '@/lib/types/logs';
import { formatModuleLabel } from '@/lib/logging-utils';

export type LogFilterState = {
    from: string;
    to: string;
    entityType: string;
    action: string;
    module: string;
    userId: string;
    search: string;
};

type LogFiltersBarProps = {
    filters: LogFilterState;
    options: LogFilters | null;
    onChange: (key: keyof LogFilterState, value: string) => void;
    onReset: () => void;
    showSearch?: boolean;
};

export function LogFiltersBar({ filters, options, onChange, onReset, showSearch = true }: LogFiltersBarProps) {
    const users = options?.users || [];

    return (
        <div className="flex flex-wrap gap-3 items-end">
            {showSearch && (
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Search</label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            value={filters.search}
                            onChange={(e) => onChange('search', e.target.value)}
                            placeholder="Search logs..."
                            className="h-9 pl-8"
                        />
                    </div>
                </div>
            )}
            <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">From</label>
                <Input type="date" value={filters.from} onChange={(e) => onChange('from', e.target.value)} className="h-9 w-[140px]" />
            </div>
            <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">To</label>
                <Input type="date" value={filters.to} onChange={(e) => onChange('to', e.target.value)} className="h-9 w-[140px]" />
            </div>
            <Select value={filters.userId} onValueChange={(v) => onChange('userId', v)}>
                <SelectTrigger className="h-9 w-[160px]">
                    <SelectValue placeholder="User" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    {users.map((u: LogUser) => (
                        <SelectItem key={u.id} value={u.id}>{u.fullName || u.username}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={filters.module} onValueChange={(v) => onChange('module', v)}>
                <SelectTrigger className="h-9 w-[150px]">
                    <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All modules</SelectItem>
                    {(options?.modules || []).map(m => (
                        <SelectItem key={m} value={m}>{formatModuleLabel(m)}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={filters.entityType} onValueChange={(v) => onChange('entityType', v)}>
                <SelectTrigger className="h-9 w-[150px]">
                    <SelectValue placeholder="Entity" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All entities</SelectItem>
                    {(options?.entityTypes || []).map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={filters.action} onValueChange={(v) => onChange('action', v)}>
                <SelectTrigger className="h-9 w-[140px]">
                    <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    {(options?.actions || []).map(a => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={onReset} className="h-9">
                <X className="h-4 w-4 mr-1" /> Reset
            </Button>
        </div>
    );
}

export const emptyLogFilters: LogFilterState = {
    from: '',
    to: '',
    entityType: 'all',
    action: 'all',
    module: 'all',
    userId: 'all',
    search: '',
};
