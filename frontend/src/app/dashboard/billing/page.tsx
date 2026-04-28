'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Receipt, Search, MoreVertical, Pencil, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { ServerPagination } from '@/components/dashboard/server-pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusPill, statusToVariant } from '@/components/ui/status-pill';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { readStoredUser, resolveRoleName } from '@/lib/auth';

type BillingStats = {
    total: number;
    paid: number;
    unpaid: number;
    partial: number;
    revenueToday: number;
};

type BillingStatus = 'PAID' | 'UNPAID' | 'PARTIAL' | (string & {});
type ServiceType = 'APPOINTMENT' | 'PHARMACY' | 'OPTICAL' | 'SURGERY' | (string & {});

type BillingRow = {
    id: string;
    referenceNumber?: string | null;
    serviceType: ServiceType;
    finalAmount?: number | string | null;
    status?: BillingStatus | null;
    createdAt?: string | null;
    dueDate?: string | null;
    patient?: {
        id: string;
        fullName?: string | null;
        phone?: string | null;
    } | null;
};

function formatAmount(value?: number | string | null) {
    const num = typeof value === 'number' ? value : parseFloat(String(value || 0));
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function toInvoiceNumber(row: BillingRow) {
    const ref = (row.referenceNumber || '').trim();
    if (ref) return ref;
    const d = row.createdAt ? new Date(row.createdAt) : null;
    const y = d && !Number.isNaN(d.getTime()) ? d.getFullYear() : new Date().getFullYear();
    const m = d && !Number.isNaN(d.getTime()) ? String(d.getMonth() + 1).padStart(2, '0') : '00';
    const suffix = row.id.replace(/-/g, '').slice(0, 6).toUpperCase() || '000000';
    return `INV-${y}${m}-${suffix}`;
}

function formatServiceType(value?: string | null) {
    return (value || 'N/A').replace('_', ' ');
}

function formatDateOnly(value?: string | null) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString();
}

function computeDueDate(row: BillingRow) {
    if (row.dueDate) return formatDateOnly(row.dueDate);
    if ((row.status || '').toUpperCase() === 'PAID') return '—';
    if (!row.createdAt) return '—';
    const created = new Date(row.createdAt);
    if (Number.isNaN(created.getTime())) return '—';
    created.setDate(created.getDate() + 30);
    return created.toLocaleDateString();
}

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
    const [dateFilter, setDateFilter] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize, setPageSize] = useState(20);

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
        async (searchTerm = '', status = 'all', date = '', pageNum = 1) => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (searchTerm) params.set('search', searchTerm);
                if (status !== 'all') params.set('status', status);
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
    }, [search, statusFilter, dateFilter]);

    useEffect(() => {
        const timer = setTimeout(
            () =>
                fetchRows(search, statusFilter, dateFilter, page),
            300
        );
        return () => clearTimeout(timer);
    }, [search, statusFilter, dateFilter, page, fetchRows]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleDelete = useCallback(
        async (id: string) => {
            if (!confirm('Delete this billing record?')) return;
            try {
                await api.delete(`/billing/${id}`);
                toast.success('Billing record deleted');
                fetchRows(search, statusFilter, dateFilter, page);
                fetchStats();
            } catch {
                toast.error('Delete failed');
            }
        },
        [search, statusFilter, dateFilter, page, fetchRows, fetchStats]
    );

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Billing & Invoices</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage invoices and payments</p>
                </div>
                {canManage && (
                    <Button asChild className="h-11 rounded-lg bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold px-5">
                        <Link href="/dashboard/billing/new">
                        <Receipt className="w-4 h-4 mr-2" />
                        Create New Invoice
                        </Link>
                    </Button>
                )}
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-3 sm:gap-4">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                        placeholder="Search by invoice number, patient name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-11 w-full rounded-lg border border-slate-200 bg-white text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-900"
                    />
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-11 w-full sm:w-[160px] rounded-lg border border-slate-200 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
                            <SelectValue placeholder="All status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="UNPAID">Unpaid</SelectItem>
                            <SelectItem value="PARTIAL">Partially Paid</SelectItem>
                            <SelectItem value="PAID">Paid</SelectItem>
                            <SelectItem value="OVERDUE">Overdue</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="h-11 w-full sm:w-[160px] rounded-lg border border-slate-200 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                </div>
            </div>

            <div className="min-w-0">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="overflow-x-auto">
                    <Table className="min-w-[980px]">
                        <TableHeader>
                            <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:bg-slate-900/70">
                                {['INVOICE #', 'PATIENT', 'AMOUNT', 'STATUS', 'DUE DATE', 'DATE', 'ACTIONS'].map((header) => (
                                    <TableHead key={header} className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                        {header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-sm text-slate-500">
                                        Loading invoices...
                                    </TableCell>
                                </TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-sm text-slate-500">
                                        No invoices yet
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((row) => (
                                    <TableRow key={row.id} className="border-slate-100 transition-colors hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-900/40">
                                        <TableCell className="px-4 py-4 align-middle text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                            {toInvoiceNumber(row)}
                                        </TableCell>
                                        <TableCell className="px-4 py-4 align-middle">
                                            <div className="min-w-[180px]">
                                                {row.patient ? (
                                                    <Link href={`/dashboard/patients?view=${row.patient.id}`} className="text-sm font-medium text-slate-900 hover:text-[#0EA5E9] dark:text-slate-100">
                                                        {row.patient.fullName || 'Unknown'}
                                                    </Link>
                                                ) : (
                                                    <span className="text-sm text-slate-500">N/A</span>
                                                )}
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatServiceType(row.serviceType)}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-4 align-middle text-sm font-medium tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                            {formatAmount(row.finalAmount)}
                                        </TableCell>
                                        <TableCell className="px-4 py-4 align-middle">
                                            <StatusPill variant={
                                                ((row.status || '').toUpperCase() !== 'PAID' && row.dueDate && new Date(row.dueDate) < new Date())
                                                    ? 'destructive'
                                                    : statusToVariant(row.status || 'UNPAID')
                                            }>
                                                {((row.status || '').toUpperCase() !== 'PAID' && row.dueDate && new Date(row.dueDate) < new Date())
                                                    ? 'OVERDUE'
                                                    : (row.status || 'UNPAID')
                                                }
                                            </StatusPill>
                                        </TableCell>
                                        <TableCell className="px-4 py-4 align-middle text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                            {computeDueDate(row)}
                                        </TableCell>
                                        <TableCell className="px-4 py-4 align-middle text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                            {formatDateOnly(row.createdAt)}
                                        </TableCell>
                                        <TableCell className="px-4 py-4 align-middle text-right">
                                            {canManage ? (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-44">
                                                        <DropdownMenuItem asChild className="gap-2">
                                                            <Link href={`/dashboard/billing/${row.id}`}>
                                                                <Eye className="h-4 w-4" />
                                                                View
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild className="gap-2">
                                                            <Link href={`/dashboard/billing/${row.id}/edit`}>
                                                                <Pencil className="h-4 w-4" />
                                                                Edit
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild className="gap-2">
                                                            <Link href={`/dashboard/billing/${row.id}/edit?focus=payment`}>
                                                                <Pencil className="h-4 w-4" />
                                                                Record payment
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => void handleDelete(row.id)} className="text-red-600 focus:text-red-600">
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            ) : (
                                                <span className="text-sm text-slate-500">N/A</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    </div>
                </div>
                <ServerPagination
                    page={page}
                    limit={pageSize}
                    total={total}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    onLimitChange={(limit) => { setPageSize(limit); setPage(1); }}
                    disabled={loading}
                    itemLabel="invoices"
                />
            </div>
        </div>
    );
}
