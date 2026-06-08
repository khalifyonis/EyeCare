'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '@/lib/axios';
import { DataTable } from '@/components/ui/data-table';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import { Button } from '@/components/ui/button';
import { Shield, RefreshCcw, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import type { AuditLogRow, LogFilters, PaginatedResponse } from '@/lib/types/logs';
import { ActionBadge } from '@/components/logs/action-badge';
import { AuditDetailSheet } from '@/components/logs/audit-detail-sheet';
import { LogFiltersBar, emptyLogFilters, type LogFilterState } from '@/components/logs/log-filters';
import { formatLogDate, formatModuleLabel } from '@/lib/logging-utils';
import { hasPermission } from '@/lib/permissions';

export default function AuditLogPage() {
    const [rows, setRows] = useState<AuditLogRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [filterOptions, setFilterOptions] = useState<LogFilters | null>(null);
    const [filters, setFilters] = useState<LogFilterState>(emptyLogFilters);
    const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const limit = 20;
    const canRead = hasPermission('logs', 'canRead');

    const buildParams = useCallback(() => {
        const params: Record<string, string | number> = { page, limit };
        if (filters.from) params.from = filters.from;
        if (filters.to) params.to = filters.to;
        if (filters.entityType !== 'all') params.entityType = filters.entityType;
        if (filters.action !== 'all') params.action = filters.action;
        if (filters.module !== 'all') params.module = filters.module;
        if (filters.userId !== 'all') params.userId = filters.userId;
        if (filters.search.trim()) params.search = filters.search.trim();
        return params;
    }, [page, limit, filters]);

    const fetchLogs = async () => {
        if (!canRead) return;
        setLoading(true);
        try {
            const res = await api.get('/audit-logs', { params: buildParams() });
            const body = res.data as PaginatedResponse<AuditLogRow>;
            setRows(Array.isArray(body?.data) ? body.data : []);
            setTotal(body?.total ?? 0);
            setTotalPages(body?.totalPages ?? 1);
        } catch {
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    const fetchFilters = async () => {
        try {
            const res = await api.get('/audit-logs/filters');
            setFilterOptions(res.data);
        } catch { /* optional */ }
    };

    useEffect(() => { fetchFilters(); }, []);
    useEffect(() => { setPage(1); }, [filters.from, filters.to, filters.entityType, filters.action, filters.module, filters.userId, filters.search]);
    useEffect(() => { fetchLogs(); }, [page, filters, canRead]);

    const handleFilterChange = (key: keyof LogFilterState, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleExport = async () => {
        try {
            const params = buildParams();
            delete params.page;
            delete params.limit;
            const res = await api.get('/audit-logs/export', { params, responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('Audit logs exported');
        } catch {
            toast.error('Export failed');
        }
    };

    const openDetail = (log: AuditLogRow) => {
        setSelectedLog(log);
        setDetailOpen(true);
    };

    const columns = useMemo<ColumnDef<AuditLogRow>[]>(() => [
        {
            accessorKey: 'createdAt',
            header: 'Date & Time',
            cell: ({ row }) => (
                <span className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {formatLogDate(row.original.createdAt)}
                </span>
            ),
        },
        {
            accessorKey: 'user',
            header: 'User',
            cell: ({ row }) => (
                <div>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                        {row.original.user?.fullName || row.original.user?.username || '—'}
                    </span>
                    {row.original.user?.role && (
                        <p className="text-[10px] text-slate-400">{row.original.user.role}</p>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'action',
            header: 'Action',
            cell: ({ row }) => <ActionBadge action={row.original.action} />,
        },
        {
            accessorKey: 'module',
            header: 'Module',
            cell: ({ row }) => <span className="text-sm">{formatModuleLabel(row.original.module)}</span>,
        },
        {
            accessorKey: 'entityType',
            header: 'Entity',
            cell: ({ row }) => (
                <div>
                    <span className="text-sm">{row.original.entityType}</span>
                    {row.original.entityId && (
                        <p className="text-[10px] text-slate-400 font-mono">#{row.original.entityId.slice(0, 8)}</p>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'summary',
            header: 'Summary',
            cell: ({ row }) => (
                <span className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                    {row.original.summary || '—'}
                </span>
            ),
        },
        {
            id: 'changes',
            header: 'Changes',
            cell: ({ row }) => {
                const count = row.original.changedFields?.length || 0;
                return count > 0 ? (
                    <span className="text-xs font-medium text-amber-600">{count} field{count !== 1 ? 's' : ''}</span>
                ) : <span className="text-xs text-slate-400">—</span>;
            },
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <Button variant="ghost" size="sm" className="h-8" onClick={() => openDetail(row.original)}>
                    <Eye className="h-4 w-4" />
                </Button>
            ),
        },
    ], []);

    if (!canRead) {
        return (
            <div className="p-6">
                <p className="text-slate-500">You do not have permission to view audit logs.</p>
            </div>
        );
    }

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="h-7 w-7 text-violet-500" />
                        Audit Trail
                    </h1>
                    <PageBreadcrumb current="Audit Trail" />
                    <p className="mt-1 text-sm text-slate-500">Security-focused change history with before/after comparison.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExport} className="h-9">
                        <Download className="h-4 w-4 mr-2" /> Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => fetchLogs()} disabled={loading} className="h-9">
                        <RefreshCcw className={'h-4 w-4 mr-2 ' + (loading ? 'animate-spin' : '')} />
                        Refresh
                    </Button>
                </div>
            </div>

            <LogFiltersBar
                filters={filters}
                options={filterOptions}
                onChange={handleFilterChange}
                onReset={() => setFilters(emptyLogFilters)}
            />

            <div className="min-w-0">
                <DataTable
                    columns={columns}
                    data={rows}
                    loading={loading}
                    onRefresh={fetchLogs}
                    itemLabel="audit entries"
                    hideSearch
                />
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Page {page} of {totalPages} ({total} total)</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                    </div>
                </div>
            )}

            <AuditDetailSheet log={selectedLog} open={detailOpen} onOpenChange={setDetailOpen} />
        </div>
    );
}
