'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Receipt, DollarSign, Search, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { getBillingColumns, type BillingRow } from './columns';
import { BillingDialog } from './billing-dialog';
import { RecordPaymentDialog } from './record-payment-dialog';
import { toast } from 'sonner';
import { StatsCard } from '@/components/dashboard/stats-card';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import { ServerPagination } from '@/components/dashboard/server-pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { readStoredUser, resolveRoleName } from '@/lib/auth';

type BillingStats = {
    total: number;
    unpaid: number;
    paid: number;
    partial: number;
    revenueToday: number;
};

export default function BillingPage() {
    const [role, setRole] = useState('');
    const [rows, setRows] = useState<BillingRow[]>([]);
    const [stats, setStats] = useState<BillingStats>({
        total: 0,
        unpaid: 0,
        paid: 0,
        partial: 0,
        revenueToday: 0,
    });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [createOpen, setCreateOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [selectedBilling, setSelectedBilling] = useState<BillingRow | null>(null);
    const [selectionKey, setSelectionKey] = useState(0);

    useEffect(() => {
        setRole(resolveRoleName(readStoredUser()));
    }, []);

    const canManage = useMemo(
        () => ['ADMIN', 'SUPERADMIN', 'RECEPTIONIST'].includes(role),
        [role]
    );

    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get('/billing/stats');
            setStats(res.data as BillingStats);
        } catch {
            console.error('Billing stats fetch failed');
        }
    }, []);

    const fetchRows = useCallback(
        async (searchTerm = '', status = 'all', serviceType = 'all', date = '', pageNum = 1) => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (searchTerm) params.set('search', searchTerm);
                if (status !== 'all') params.set('status', status);
                if (serviceType !== 'all') params.set('serviceType', serviceType);
                if (date) params.set('date', date);
                params.set('page', String(pageNum));
                params.set('limit', String(pageSize));
                const res = await api.get(`/billing?${params.toString()}`);
                const body = res.data as {
                    data?: BillingRow[];
                    total?: number;
                    page?: number;
                    totalPages?: number;
                };
                setRows(Array.isArray(body?.data) ? body.data : []);
                setTotal(typeof body.total === 'number' ? body.total : 0);
                setPage(typeof body.page === 'number' ? body.page : 1);
                setTotalPages(typeof body.totalPages === 'number' ? body.totalPages : 1);
            } catch {
                toast.error('Failed to load billing');
            } finally {
                setLoading(false);
            }
        },
        [pageSize]
    );

    useEffect(() => {
        setPage(1);
    }, [search, statusFilter, serviceTypeFilter, dateFilter]);

    useEffect(() => {
        const timer = setTimeout(
            () =>
                fetchRows(search, statusFilter, serviceTypeFilter, dateFilter, page),
            300
        );
        return () => clearTimeout(timer);
    }, [search, statusFilter, serviceTypeFilter, dateFilter, page, fetchRows]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleRecordPayment = (row: BillingRow) => {
        setSelectedBilling(row);
        setPaymentOpen(true);
    };

    const handleDelete = useCallback(
        async (id: string) => {
            if (!confirm('Delete this billing record?')) return;
            try {
                await api.delete(`/billing/${id}`);
                toast.success('Billing record deleted');
                fetchRows(search, statusFilter, serviceTypeFilter, dateFilter, page);
                fetchStats();
            } catch {
                toast.error('Delete failed');
            }
        },
        [search, statusFilter, serviceTypeFilter, dateFilter, page, fetchRows, fetchStats]
    );

    const handleDeleteSelected = async (selected: BillingRow[]) => {
        if (selected.length === 0) return;
        if (!confirm(`Delete ${selected.length} selected invoice(s)? This cannot be undone.`)) return;
        let done = 0;
        let failed = 0;
        for (const row of selected) {
            try {
                await api.delete(`/billing/${row.id}`);
                done++;
            } catch {
                failed++;
            }
        }
        if (done) {
            toast.success(failed ? `Deleted ${done} invoice(s). ${failed} failed.` : `Deleted ${done} invoice(s).`);
            setSelectionKey((k) => k + 1);
            fetchRows(search, statusFilter, serviceTypeFilter, dateFilter, page);
            fetchStats();
        }
        if (failed) {
            toast.error(`Failed to delete ${failed} invoice(s).`);
        }
    };

    const handleExportSelected = (selected: BillingRow[]) => {
        if (selected.length === 0) return;
        const headers = ['Invoice #', 'Patient', 'Service type', 'Status', 'Total', 'Date'];
        const escape = (v: string) => (v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
        const rowsCsv = selected.map((r) => {
            const patient = r.patient?.fullName || '';
            const date = r.createdAt || '';
            const total = typeof r.totalAmount === 'number' ? r.totalAmount.toFixed(2) : String(r.totalAmount || '');
            return [
                escape(r.referenceNumber || r.id?.slice(0, 8) || ''),
                escape(patient),
                escape(r.serviceType || ''),
                escape(r.status || ''),
                escape(total),
                escape(date),
            ].join(',');
        });
        const csv = [headers.join(','), ...rowsCsv].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `billing-selected-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${selected.length} item${selected.length === 1 ? '' : 's'}.`);
    };

    const columns = useMemo(
        () =>
            getBillingColumns({
                onRecordPayment: handleRecordPayment,
                onDelete: handleDelete,
                canManage,
            }),
        [canManage, handleDelete]
    );

    const refresh = () => {
        fetchRows(search, statusFilter, serviceTypeFilter, dateFilter, page);
        fetchStats();
    };

    const quickActions = [
        { id: 'delete', label: 'Delete selected', onClick: handleDeleteSelected, variant: 'destructive' as const },
        { id: 'download', label: 'Download selected', onClick: handleExportSelected, variant: 'default' as const },
    ];

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Billing
                    </h1>
                    <PageBreadcrumb current="Billing" />
                </div>
                {canManage && (
                    <Button
                        onClick={() => setCreateOpen(true)}
                        className="h-10 rounded-lg bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold px-4"
                    >
                        <Receipt className="w-4 h-4 mr-2" />
                        New invoice
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                <StatsCard
                    title="Total invoices"
                    value={stats.total.toLocaleString()}
                    icon={Receipt}
                    color="blue"
                />
                <StatsCard
                    title="Unpaid"
                    value={stats.unpaid.toLocaleString()}
                    icon={AlertCircle}
                    color="amber"
                />
                <StatsCard
                    title="Paid"
                    value={stats.paid.toLocaleString()}
                    icon={CreditCard}
                    color="emerald"
                />
                <StatsCard
                    title="Revenue today"
                    value={`$${Number(stats.revenueToday || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                    icon={DollarSign}
                    color="purple"
                />
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-3 sm:gap-4">
                <div className="relative w-full md:w-[260px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                        placeholder="Search invoices..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 w-full rounded-md border border-slate-200 bg-white text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-900"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-10 w-full md:w-[150px] rounded-md border border-slate-200 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="UNPAID">Unpaid</SelectItem>
                        <SelectItem value="PARTIAL">Partial</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                    <SelectTrigger className="h-10 w-full md:w-[150px] rounded-md border border-slate-200 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <SelectValue placeholder="Service type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="APPOINTMENT">Appointment</SelectItem>
                        <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                        <SelectItem value="OPTICAL">Optical</SelectItem>
                        <SelectItem value="SURGERY">Surgery</SelectItem>
                    </SelectContent>
                </Select>
                <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="h-10 w-full md:w-[150px] rounded-md border border-slate-200 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900"
                />
            </div>

            <div className="min-w-0">
                <DataTable
                    columns={columns}
                    data={rows}
                    loading={loading}
                    onRefresh={refresh}
                    itemLabel="invoices"
                    hideSearch
                    hidePagination
                    enableRowSelection
                    quickActions={quickActions}
                    selectionKey={selectionKey}
                    emptyMessage="No invoices yet"
                    emptyDescription="Click 'New invoice' to create your first billing record."
                />
                <ServerPagination
                    page={page}
                    limit={pageSize}
                    total={total}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    onLimitChange={(limit) => { setPageSize(limit); setPage(1); }}
                    disabled={loading}
                />
            </div>

            <BillingDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={refresh} />
            <RecordPaymentDialog
                open={paymentOpen}
                onOpenChange={setPaymentOpen}
                billing={selectedBilling}
                onSuccess={refresh}
            />
        </div>
    );
}
