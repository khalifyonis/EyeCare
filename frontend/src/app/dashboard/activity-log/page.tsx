'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/axios';
import { DataTable } from '@/components/ui/data-table';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Activity, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';

type ActivityLogRow = {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    details: string | null;
    createdAt: string;
    user?: { id: string; fullName: string; username: string };
    branch?: { id: string; branchName: string };
};

export default function ActivityLogPage() {
    const [rows, setRows] = useState<ActivityLogRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 20;
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [entityType, setEntityType] = useState('all');
    const [actionFilter, setActionFilter] = useState('all');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit };
            if (from) params.from = from;
            if (to) params.to = to;
            if (entityType !== 'all') params.entityType = entityType;
            if (actionFilter !== 'all') params.action = actionFilter;
            const res = await api.get('/activity-logs', { params });
            const body = res.data as { data?: ActivityLogRow[]; total?: number; totalPages?: number };
            setRows(Array.isArray(body?.data) ? body.data : []);
            setTotal(body?.total ?? 0);
            setTotalPages(body?.totalPages ?? 1);
        } catch {
            toast.error('Failed to load activity logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLogs(); }, [page, from, to, entityType, actionFilter]);

    const columns = useMemo<ColumnDef<ActivityLogRow>[]>(() => [
        {
            accessorKey: 'createdAt',
            header: 'Date & time',
            cell: ({ row }) => (
                <span className="text-sm text-slate-600 dark:text-slate-400">
                    {row.original.createdAt ? new Date(row.original.createdAt).toLocaleString() : '—'}
                </span>
            ),
        },
        {
            accessorKey: 'user',
            header: 'User',
            cell: ({ row }) => (
                <span className="font-medium text-slate-900 dark:text-slate-100">
                    {row.original.user?.fullName || row.original.user?.username || '—'}
                </span>
            ),
        },
        {
            accessorKey: 'action',
            header: 'Action',
            cell: ({ row }) => (
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                    row.original.action === 'LOGIN' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' :
                    row.original.action === 'CREATED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                    row.original.action === 'DELETED' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                    {row.original.action}
                </span>
            ),
        },
        {
            accessorKey: 'entityType',
            header: 'Entity',
            cell: ({ row }) => <span className="text-sm">{row.original.entityType}</span>,
        },
        {
            accessorKey: 'details',
            header: 'Details',
            cell: ({ row }) => <span className="text-sm text-slate-500 dark:text-slate-400">{row.original.details || '—'}</span>,
        },
    ], []);

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="h-7 w-7 text-[#0EA5E9]" />
                        Activity Logs
                    </h1>
                    <PageBreadcrumb current="Activity Logs" />
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchLogs()} disabled={loading} className="h-9">
                    <RefreshCcw className={"h-4 w-4 mr-2 " + (loading ? "animate-spin" : "")} />
                    Refresh
                </Button>
            </div>

            <div className="flex flex-wrap gap-3 items-end">
                <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">From</label>
                    <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[140px]" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">To</label>
                    <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[140px]" />
                </div>
                <Select value={entityType} onValueChange={setEntityType}>
                    <SelectTrigger className="h-9 w-[160px]">
                        <SelectValue placeholder="Entity type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="User">User</SelectItem>
                        <SelectItem value="Billing">Billing</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="h-9 w-[140px]">
                        <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All actions</SelectItem>
                        <SelectItem value="LOGIN">LOGIN</SelectItem>
                        <SelectItem value="CREATED">CREATED</SelectItem>
                        <SelectItem value="DELETED">DELETED</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="min-w-0">
                <DataTable columns={columns} data={rows} loading={loading} onRefresh={fetchLogs} itemLabel="logs" hideSearch />
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
        </div>
    );
}
