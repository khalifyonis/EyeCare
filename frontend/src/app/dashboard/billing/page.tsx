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
    const pageSize = 20;
    const [createOpen, setCreateOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [selectedBilling, setSelectedBilling] = useState<BillingRow | null>(null);

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
        []
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

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Billing
                    </h1>
                    <PageBreadcrumb current="Billing" />
                </div>
                {canManage && (
                    <Button
                        onClick={() => setCreateOpen(true)}
                        className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold shadow-lg shadow-blue-500/20 px-6 rounded-xl"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Patient, ref #..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-10 rounded-lg"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-10 rounded-lg">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="UNPAID">Unpaid</SelectItem>
                            <SelectItem value="PARTIAL">Partial</SelectItem>
                            <SelectItem value="PAID">Paid</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Service type</label>
                    <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                        <SelectTrigger className="h-10 rounded-lg">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="APPOINTMENT">Appointment</SelectItem>
                            <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                            <SelectItem value="OPTICAL">Optical</SelectItem>
                            <SelectItem value="SURGERY">Surgery</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Date</label>
                    <Input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="h-10 rounded-lg"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto min-w-0">
                <DataTable
                    columns={columns}
                    data={rows}
                    loading={loading}
                    onRefresh={refresh}
                    itemLabel="invoices"
                    hideSearch
                />
                <ServerPagination
                    page={page}
                    limit={pageSize}
                    total={total}
                    totalPages={totalPages}
                    onPageChange={setPage}
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
