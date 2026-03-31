'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ServerPagination } from '@/components/dashboard/server-pagination';

import { CheckCircle2, Download, Glasses, Pencil, Plus, Search, Trash2, XCircle } from 'lucide-react';

type OpticalPrescription = {
    id: string;
    type: 'SPECTACLES' | 'CONTACT_LENS' | 'BOTH' | string;
    status: 'FILLED' | 'DISPENSED' | string;
    createdAt: string;
    expiryDate: string;
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
    expired: number;
};

function formatDate(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }).format(d);
}

function toTypeLabel(type: string): string {
    if (type === 'CONTACT_LENS') return 'Contact Lens';
    if (type === 'SPECTACLES') return 'Spectacles';
    if (type === 'BOTH') return 'Both';
    return type || '—';
}

function computeStatusLabel(row: OpticalPrescription): { label: string; tone: 'neutral' | 'danger' } {
    const now = new Date();
    const expiry = new Date(row.expiryDate);
    const expired = !Number.isNaN(expiry.getTime()) && expiry < now;

    if ((row.status || '').toUpperCase() === 'DISPENSED') return { label: 'dispensed', tone: 'neutral' };
    if (expired) return { label: 'expired', tone: 'danger' };
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
    if (!hasAnyRefraction(prefix, row)) return <span className="text-slate-400 tracking-tight">—</span>;

    const sphere = prefix === 'od' ? row.odSphere : row.osSphere;
    const cylinder = prefix === 'od' ? row.odCylinder : row.osCylinder;
    const axis = prefix === 'od' ? row.odAxis : row.osAxis;
    const add = prefix === 'od' ? row.odAdd : row.osAdd;
    const pd = prefix === 'od' ? row.odPd : row.osPd;

    return (
        <div className="flex items-center gap-3 whitespace-nowrap py-1">
            <div className="flex items-center gap-1.5 text-[14px] font-black text-slate-900 dark:text-slate-100 italic tracking-tight">
               <span>{sphere || '0.00'}</span>
               <span className="text-slate-300 dark:text-slate-700 font-light">/</span>
               <span>{cylinder || '0.00'}</span>
               <span className="text-slate-300 dark:text-slate-700 font-light">x</span>
               <span>{axis ? `${axis}°` : '0°'}</span>
            </div>
            {(add || pd) && (
              <div className="flex items-center gap-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-3">
                  {add && <span className="flex items-center gap-1">Add <span className="text-[#0EA5E9]">{add}</span></span>}
                  {pd && <span className="flex items-center gap-1">PD <span className="text-[#0EA5E9]">{pd}</span></span>}
              </div>
            )}
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
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [type, setType] = useState('all');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const [rows, setRows] = useState<OpticalPrescription[]>([]);
    const [stats, setStats] = useState<Stats>({ total: 0, active: 0, dispensed: 0, expired: 0 });
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get('/prescriptions/stats');
            setStats(res.data as Stats);
        } catch {
            setStats({ total: 0, active: 0, dispensed: 0, expired: 0 });
        }
    }, []);

    const fetchRows = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit: pageSize };
            if (search) params.search = search;
            if (status !== 'all') params.status = status;
            if (type !== 'all') params.type = type;
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
    }, [search, status, type, page, pageSize]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        const t = setTimeout(() => void fetchRows(), 250);
        return () => clearTimeout(t);
    }, [fetchRows]);

    useEffect(() => {
        setPage(1);
    }, [search, status, type, pageSize]);

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

    const statCards = useMemo(() => ([
        {
            label: 'Total Prescriptions',
            value: stats.total,
            icon: Glasses,
            valueClassName: 'text-slate-900 dark:text-slate-100',
            iconClassName: 'text-[#0EA5E9]',
            iconWrapClassName: 'bg-sky-50 dark:bg-sky-900/30 ring-1 ring-sky-100 dark:ring-sky-900/50',
            cardClassName: 'border-sky-100 dark:border-sky-900/50 bg-gradient-to-br from-sky-50/70 dark:from-sky-900/20 via-white dark:via-slate-900 to-white dark:to-slate-900',
            labelClassName: 'text-sky-700 dark:text-sky-400',
        },
        {
            label: 'Active',
            value: stats.active,
            icon: CheckCircle2,
            valueClassName: 'text-[#0284C7] dark:text-sky-400',
            iconClassName: 'text-[#0284C7] dark:text-sky-400',
            iconWrapClassName: 'bg-sky-50 dark:bg-sky-900/30 ring-1 ring-sky-100 dark:ring-sky-900/50',
            cardClassName: 'border-sky-100 dark:border-sky-900/50 bg-gradient-to-br from-sky-50/70 dark:from-sky-900/20 via-white dark:via-slate-900 to-white dark:to-slate-900',
            labelClassName: 'text-sky-700 dark:text-sky-400',
        },
        {
            label: 'Dispensed',
            value: stats.dispensed,
            icon: Glasses,
            valueClassName: 'text-blue-600 dark:text-blue-400',
            iconClassName: 'text-blue-600 dark:text-blue-400',
            iconWrapClassName: 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-100 dark:ring-blue-900/50',
            cardClassName: 'border-blue-100 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/70 dark:from-blue-900/20 via-white dark:via-slate-900 to-white dark:to-slate-900',
            labelClassName: 'text-blue-700 dark:text-blue-400',
        },
        {
            label: 'Expired',
            value: stats.expired,
            icon: XCircle,
            valueClassName: 'text-rose-600 dark:text-rose-400',
            iconClassName: 'text-rose-600 dark:text-rose-400',
            iconWrapClassName: 'bg-rose-50 dark:bg-rose-900/30 ring-1 ring-rose-100 dark:ring-rose-900/50',
            cardClassName: 'border-rose-100 dark:border-rose-900/50 bg-gradient-to-br from-rose-50/70 dark:from-rose-900/20 via-white dark:via-slate-900 to-white dark:to-slate-900',
            labelClassName: 'text-rose-700 dark:text-rose-400',
        },
    ]), [stats]);

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Optical Prescriptions</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage optical prescriptions</p>
                </div>
                <Button asChild className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white h-10 rounded-lg px-5">
                    <Link href="/dashboard/prescriptions/new">
                        <Plus className="h-4 w-4" />
                        New Prescription
                    </Link>
                </Button>
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
                            <SelectItem value="EXPIRED">Expired</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger className="h-10 w-full sm:w-[160px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                            <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="SPECTACLES">Spectacles</SelectItem>
                            <SelectItem value="CONTACT_LENS">Contact Lens</SelectItem>
                            <SelectItem value="BOTH">Both</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {statCards.map(({ label, value, icon: Icon, valueClassName, iconClassName, iconWrapClassName, cardClassName, labelClassName }) => (
                    <div key={label} className={`rounded-xl border dark:border-slate-800 p-4 sm:p-5 shadow-sm ${cardClassName}`}>
                        <div className="flex items-start justify-between">
                            <p className={`text-sm font-semibold ${labelClassName}`}>{label}</p>
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconWrapClassName}`}>
                                <Icon className={`h-5 w-5 ${iconClassName}`} />
                            </div>
                        </div>
                        <p className={`mt-3 text-4xl font-bold leading-none ${valueClassName}`}>{value}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/80 dark:bg-slate-900/80 hover:bg-slate-50/80 dark:hover:bg-slate-900/80 border-slate-200 dark:border-slate-800">
                            {['PATIENT', 'TYPE', 'OD (RIGHT)', 'OS (LEFT)', 'DATE', 'EXPIRY', 'STATUS', 'ACTIONS'].map((h) => (
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
                                    <TableRow key={row.id} className="border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                        <TableCell className="py-4 px-4">
                                            <div className="min-w-[180px]">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{patientName}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">ID: {patientDisplayId}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4 px-4 text-sm text-slate-700 dark:text-slate-300">{toTypeLabel(row.type)}</TableCell>
                                        <TableCell className="py-2.5 px-4">{renderEyeSummary('od', row)}</TableCell>
                                        <TableCell className="py-2.5 px-4">{renderEyeSummary('os', row)}</TableCell>
                                        <TableCell className="py-4 px-4 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatDate(row.createdAt)}</TableCell>
                                        <TableCell className="py-4 px-4 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatDate(row.expiryDate)}</TableCell>
                                        <TableCell className="py-4 px-4">
                                            <Badge
                                                variant="secondary"
                                                className={
                                                    statusInfo.tone === 'danger'
                                                        ? 'rounded-full bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 px-3 py-1 font-semibold'
                                                        : 'rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1 font-semibold'
                                                }
                                            >
                                                {statusInfo.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                <Link href={`/dashboard/prescriptions/${row.id}`} className="text-sm font-medium text-[#0EA5E9] hover:text-[#0284C7] hover:underline">
                                                    View
                                                </Link>
                                                <Link
                                                    href={`/dashboard/prescriptions/${row.id}/edit`}
                                                    className="inline-flex items-center text-slate-500 hover:text-[#0EA5E9]"
                                                    aria-label="Edit"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                                <button
                                                    type="button"
                                                    className="text-slate-500 hover:text-slate-900"
                                                    aria-label="Download"
                                                    onClick={async () => {
                                                        try {
                                                            const res = await api.get(`/prescriptions/${row.id}`);
                                                            await downloadJson(`optical-prescription-${row.id}.json`, res.data);
                                                        } catch {
                                                            toast.error('Download failed');
                                                        }
                                                    }}
                                                >
                                                    <Download className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="text-slate-500 hover:text-red-600 disabled:opacity-50"
                                                    aria-label="Delete"
                                                    disabled={deletingId === row.id}
                                                    onClick={() => void handleDelete(row.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
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
