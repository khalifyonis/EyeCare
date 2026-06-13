'use client';

// Optical prescriptions module (glasses/contact lens prescription records)

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ServerPagination } from '@/components/dashboard/server-pagination';
import { OpticalKpiCard } from '../../optical-shop/_components/optical-kpi-card';

import { CheckCircle2, Download, Glasses, MoreVertical, Plus, Search, Trash2, XCircle, ShoppingCart, Eye, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { readStoredUser, resolveRoleName } from '@/lib/auth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type OpticalPrescription = {
    id: string;
    type: 'SPECTACLES' | string;
    status: 'FILLED' | 'DISPENSED' | string;
    createdAt: string;
    patient?: { id: string; fullName?: string | null; patientNumber?: string | null } | null;

    odSphere?: string | null;
    odCylinder?: string | null;
    odAxis?: number | null;
    odAdd?: string | null;
    odPd?: number | null;
    odPrism?: string | null;

    osSphere?: string | null;
    osCylinder?: string | null;
    osAxis?: number | null;
    osAdd?: string | null;
    osPd?: number | null;
    osPrism?: string | null;
};

type Paginated<T> = {
    data?: T[];
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
};

type Stats = {
    total: number;
    active: number;
    dispensed: number;
    issuedToday: number;
};

function formatDate(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }).format(d);
}

function toTypeLabel(type: string): string {
    return 'Spectacles';
}

function computeStatusLabel(row: OpticalPrescription): { label: string; tone: 'neutral' } {
    if ((row.status || '').toUpperCase() === 'DISPENSED') return { label: 'dispensed', tone: 'neutral' };
    return { label: 'active', tone: 'neutral' };
}

function hasAnyRefraction(prefix: 'od' | 'os', row: OpticalPrescription): boolean {
    const sphere = prefix === 'od' ? row.odSphere : row.osSphere;
    const cylinder = prefix === 'od' ? row.odCylinder : row.osCylinder;
    const axis = prefix === 'od' ? row.odAxis : row.osAxis;
    const add = prefix === 'od' ? row.odAdd : row.osAdd;
    const pd = prefix === 'od' ? row.odPd : row.osPd;

    return !!(
        (sphere && String(sphere).trim()) ||
        (cylinder && String(cylinder).trim()) ||
        (add && String(add).trim()) ||
        (typeof axis === 'number' && !Number.isNaN(axis)) ||
        (typeof pd === 'number' && !Number.isNaN(pd))
    );
}

function renderEyeSummary(prefix: 'od' | 'os', row: OpticalPrescription) {
    if (!hasAnyRefraction(prefix, row)) return <span className="text-sm text-slate-400">—</span>;

    const sphere = prefix === 'od' ? row.odSphere : row.osSphere;
    const cylinder = prefix === 'od' ? row.odCylinder : row.osCylinder;
    const axis = prefix === 'od' ? row.odAxis : row.osAxis;
    const add = prefix === 'od' ? row.odAdd : row.osAdd;
    const pd = prefix === 'od' ? row.odPd : row.osPd;

    const hasAdd = !!(add && String(add).trim());
    const hasPd = typeof pd === 'number' && !Number.isNaN(pd);
    const axisLabel = typeof axis === 'number' && !Number.isNaN(axis) ? `${axis}°` : '—';

    const detailTokens: string[] = [`x ${axisLabel}`];
    if (hasAdd) detailTokens.push(String(add));
    if (hasPd) detailTokens.push(String(pd));

    const primary = `${sphere || '—'} / ${cylinder || '—'}`;
    const secondary = detailTokens.join(' · ');

    return (
        <div className="py-1">
            <p className="text-sm font-normal text-slate-700 dark:text-slate-300">
                {primary}
            </p>
            <p className="mt-0.5 text-xs font-normal text-slate-500 dark:text-slate-400">
                {secondary}
            </p>
        </div>
    );
}

async function downloadJson(filename: string, data: unknown) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export default function OpticalPrescriptionsPage() {
    const router = useRouter();
    const role = useMemo(() => resolveRoleName(readStoredUser()), []);
    const canManage = useMemo(() => {
        if (role === 'OPTICIAN') return false; // Opticians can only view and dispense
        return ['ADMIN', 'SUPERADMIN', 'DOCTOR'].includes(role);
    }, [role]);

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const type = 'SPECTACLES';
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [rows, setRows] = useState<OpticalPrescription[]>([]);
    const [stats, setStats] = useState<Stats>({ total: 0, active: 0, dispensed: 0, issuedToday: 0 });
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get('/prescriptions/stats');
            setStats(res.data as Stats);
        } catch {
            setStats({ total: 0, active: 0, dispensed: 0, issuedToday: 0 });
        }
    }, []);

    const fetchRows = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit: pageSize };
            if (search) params.search = search;
            if (status !== 'all') params.status = status;
            params.type = type;
            if (dateFrom) params.from = dateFrom;
            if (dateTo) params.to = dateTo;
            if (!dateFrom && !dateTo) {
                params.todayOnly = '1';
            }
            const res = await api.get('/prescriptions', { params });
            const body = res.data as Paginated<OpticalPrescription>;
            setRows(body.data ?? []);
            setTotal(body.total ?? 0);
            setTotalPages(body.totalPages ?? 1);
        } catch {
            toast.error('Failed to load prescriptions');
            setRows([]);
            setTotal(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [search, status, type, page, pageSize, dateFrom, dateTo]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        const t = setTimeout(() => void fetchRows(), 250);
        return () => clearTimeout(t);
    }, [fetchRows, dateFrom, dateTo]);

    useEffect(() => {
        setPage(1);
    }, [search, status, pageSize, dateFrom, dateTo]);

    const handleDelete = async (id: string) => {
        const ok = window.confirm('Delete this prescription? This cannot be undone.');
        if (!ok) return;

        setDeletingId(id);
        try {
            await api.delete(`/prescriptions/${id}`);
            toast.success('Prescription deleted');
            await fetchRows();
            await fetchStats();
        } catch {
            toast.error('Failed to delete prescription');
        } finally {
            setDeletingId(null);
        }
    };
    const handleDispenseClick = (presc: any) => {
        router.push(`/dashboard/billing/new?serviceType=OPTICAL&prescriptionId=${presc.id}`);
    };

    const statCards = useMemo(() => ([
        { title: 'Total Prescriptions', value: stats.total, icon: Glasses, tone: 'blue' as const },
        { title: 'Active', value: stats.active, icon: CheckCircle2, tone: 'emerald' as const },
        { title: 'Dispensed', value: stats.dispensed, icon: Glasses, tone: 'amber' as const },
        { title: 'Issued Today', value: stats.issuedToday || 0, icon: Plus, tone: 'rose' as const },
    ]), [stats]);

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Optical Prescriptions</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage optical prescriptions</p>
                </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by patient name or presc"
                        className="h-10 pl-9 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50"
                    />
                </div>

                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="h-10 w-full sm:w-[160px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="DISPENSED">Dispensed</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md px-2 h-10">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="bg-transparent border-none text-sm outline-none w-32 dark:text-slate-200"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md px-2 h-10">
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="bg-transparent border-none text-sm outline-none w-32 dark:text-slate-200"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {statCards.map(({ title, value, icon, tone }) => (
                    <OpticalKpiCard key={title} title={title} value={value} icon={icon} tone={tone} />
                ))}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/80 dark:bg-slate-900/80 hover:bg-slate-50/80 dark:hover:bg-slate-900/80 border-slate-200 dark:border-slate-800">
                            {['PATIENT & ID', 'OD (RIGHT)', 'OS (LEFT)', 'DATE', 'STATUS', 'ACTIONS'].map((h) => (
                                <TableHead key={h} className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3 px-4 whitespace-nowrap">
                                    {h}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-56 text-center text-slate-500">Loading...</TableCell>
                            </TableRow>
                        ) : rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-56 text-center text-slate-500">No prescriptions found.</TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row) => {
                                const patientName = row.patient?.fullName?.trim() || 'Unknown';
                                const patientDisplayId = (() => {
                                    const number = row.patient?.patientNumber?.trim();
                                    if (number) return number;

                                    const raw = (row.patient?.id || '').replace(/-/g, '');
                                    if (!raw) return '—';

                                    return `PAT-${raw.slice(0, 8).toUpperCase()}`;
                                })();
                                const statusInfo = computeStatusLabel(row);

                                return (
                                    <TableRow key={row.id} className="border-slate-100 dark:border-slate-800/60">
                                        <TableCell className="py-4 px-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{patientName}</span>
                                                <Badge variant="outline" className="w-fit font-mono text-[9px] text-slate-500 border-slate-200 bg-slate-50/50 dark:bg-slate-900/50 dark:border-slate-800">
                                                    {row.patient?.patientNumber || 'PAT-PENDING'}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-2.5 px-4">{renderEyeSummary('od', row)}</TableCell>
                                        <TableCell className="py-2.5 px-4">{renderEyeSummary('os', row)}</TableCell>
                                        <TableCell className="py-4 px-4 text-sm font-normal text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDate(row.createdAt)}</TableCell>
                                        <TableCell className="py-4 px-4">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                {statusInfo.label}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-4 px-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <Link 
                                                    href={`/dashboard/prescription/optical/${row.id}`}
                                                    className="text-sm font-medium text-[#0EA5E9] hover:underline"
                                                >
                                                    View
                                                </Link>
                                                <Link 
                                                    href={`/dashboard/prescription/optical/${row.id}/edit`}
                                                    className="text-sm font-medium text-emerald-600 hover:underline"
                                                >
                                                    Edit
                                                </Link>

                                                {statusInfo.label === 'active' && canManage && (
                                                    <Button 
                                                        size="sm"
                                                        onClick={() => void handleDispenseClick(row)}
                                                        className="h-7 px-3 bg-[#0EA5E9] hover:bg-[#0c96d4] text-white text-[11px] font-bold rounded-md shadow-sm"
                                                    >
                                                        Sell
                                                    </Button>
                                                )}

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreVertical className="h-4 w-4 text-slate-400" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xl">
                                                        <DropdownMenuItem onClick={async () => {
                                                            try {
                                                                const res = await api.get(`/prescriptions/${row.id}`);
                                                                downloadJson(`optical-prescription-${row.id}.json`, res.data);
                                                            } catch {
                                                                toast.error('Download failed');
                                                            }
                                                        }} className="flex items-center gap-2 p-3 font-medium">
                                                            Download
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => void handleDelete(row.id)} className="flex items-center gap-2 p-3 font-medium text-red-600 focus:text-red-600">
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="mt-3">
                <ServerPagination
                    page={page}
                    limit={pageSize}
                    total={total}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    onLimitChange={(limit) => {
                        setPageSize(limit);
                        setPage(1);
                    }}
                    disabled={loading}
                    itemLabel="prescriptions"
                />
            </div>

        </div>
    );
}


