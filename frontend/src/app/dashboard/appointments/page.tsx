'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSocket } from '@/contexts/socket-context';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Search,
    CalendarPlus,
    Clock,
    User2,
    MapPin,
    MoreVertical,
    Plus,
    Filter,
    RefreshCcw,
    UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { Pencil, Calendar as CalendarIcon, Ban, Trash2 } from 'lucide-react';
import { usePermission } from '@/contexts/permission-context';
import { ServerPagination } from '@/components/dashboard/server-pagination';
import { Badge } from '@/components/ui/badge';

/* ── Types ─────────────────────────────────────────────────── */

interface Appointment {
    id: string;
    bookingNumber?: string | null;
    appointmentDate?: string | null;
    amount?: number | string | null;
    status?: string | null;
    type?: string | null;
    location?: string | null;
    doctorId?: string | null;
    patient?: {
        id: string;
        fullName?: string | null;
        phone?: string | null;
        patientNumber?: string | null;
    } | null;
    doctor?: {
        id?: string | null;
        userId?: string | null;
        fullName?: string | null;
        user?: { fullName?: string | null } | null;
    } | null;
    clinicalExamination?: {
        surgery?: {
            date: string;
            operatingRoom?: string | null;
            time?: string | null;
        } | null;
    } | null;
    billings?: {
        id: string;
        finalAmount?: number | string | null;
        status?: string | null;
    }[];
}

interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    pages: number;
    totalPages?: number;
}

/* ── Helpers ───────────────────────────────────────────────── */

const STATUS_OPTIONS = ['all', 'SCHEDULED', 'RECEIVED', 'EXAMINING', 'COMPLETED', 'CANCELLED'] as const;

const TYPE_STYLES: Record<string, string> = {
    consultation: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    'follow-up': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    checkup: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    emergency: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    surgery: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900 dark:text-violet-200 dark:border-violet-700',
};

const STATUS_STYLES: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    RECEIVED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    EXAMINING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
    IN_SURGERY: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
    PENDING: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700',
};

function formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
}

function formatTime(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(d);
}

function doctorName(a: Appointment): string {
    const name = a.doctor?.user?.fullName || a.doctor?.fullName || 'Unassigned';
    return name.replace(/^Dr\.\s+/i, '');
}

function getApiError(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') return fallback;
    const e = error as { response?: { data?: { message?: unknown } } };
    const msg = e.response?.data?.message;
    return typeof msg === 'string' && msg.trim() ? msg : fallback;
}

function getLocalDateValue(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function isToday(iso: string | null | undefined): boolean {
    if (!iso) return false;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

/* ── Skeleton ──────────────────────────────────────────────── */

function SkeletonRow() {
    return (
        <TableRow className="animate-pulse border-slate-100 dark:border-slate-800">
            {[200, 130, 90, 100, 90, 110, 90, 80].map((w, i) => (
                <TableCell key={i}>
                    <div className="h-4 rounded bg-slate-100 dark:bg-slate-800" style={{ width: w }} />
                    {i === 0 && <div className="h-3 rounded bg-slate-100 dark:bg-slate-800 mt-1.5 w-24" />}
                </TableCell>
            ))}
        </TableRow>
    );
}

/* ── Page ──────────────────────────────────────────────────── */

export default function AppointmentsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const { can } = usePermission();

    const canCreate = can('appointments', 'canCreate');
    const canUpdate = can('appointments', 'canUpdate');
    const canDelete = can('appointments', 'canDelete');

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta>({ total: 0, page: 1, limit: 20, pages: 1 });
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [doctors, setDoctors] = useState<any[]>([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [doctorFilter, setDoctorFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const { socket } = useSocket();

    useEffect(() => {
        const dateParam = searchParams.get('date');
        const statusParam = searchParams.get('status');
        if (dateParam === 'today') {
            const today = getLocalDateValue();
            setDateFrom(today);
            setDateTo(today);
        }
        if (statusParam) setStatusFilter(statusParam);
    }, [searchParams]);

    /* ── Fetch ─────────────────────────────────────────────── */

    useEffect(() => {
        api.get('/doctors').then(res => setDoctors(res.data)).catch(() => { });
    }, []);

    const buildParams = useCallback(() => {
        const params: Record<string, string | number> = { page, limit: pageSize, _ts: Date.now() };
        const trimmedSearch = search.trim();
        const hasSearch = trimmedSearch.length > 0;
        const hasExplicitFilter = statusFilter !== 'all' || doctorFilter !== 'all' || Boolean(dateFrom) || Boolean(dateTo);

        if (hasSearch) params.search = trimmedSearch;
        if (statusFilter !== 'all') params.status = statusFilter;
        if (doctorFilter !== 'all') params.doctorId = doctorFilter;
        if (dateFrom) params.from = dateFrom;
        if (dateTo) params.to = dateTo;

        // Default list behavior: show only today's appointments until user searches or filters.
        if (!hasSearch && !hasExplicitFilter) {
            const today = getLocalDateValue();
            params.from = today;
            params.to = today;
        }
        return params;
    }, [search, statusFilter, doctorFilter, dateFrom, dateTo, page, pageSize]);

    const applyResponse = useCallback((body: { data?: Appointment[]; pagination?: PaginationMeta }) => {
        setAppointments(Array.isArray(body.data) ? body.data : []);
        if (body.pagination) {
            const p = body.pagination;
            setPagination({
                total: p.total ?? 0,
                page: p.page ?? page,
                limit: p.limit ?? pageSize,
                pages: p.pages ?? p.totalPages ?? 1,
                totalPages: p.totalPages ?? p.pages ?? 1,
            });
        }
    }, [page, pageSize]);

    // Full fetch with loading skeleton (only for initial load and manual refresh)
    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/appointments', {
                params: buildParams(),
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            applyResponse(res.data);
        } catch {
            toast.error('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    }, [buildParams, applyResponse]);

    // Silent fetch — no loading skeleton, no flickering (for polling & socket events)
    const silentFetch = useCallback(async () => {
        try {
            const res = await api.get('/appointments', {
                params: buildParams(),
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            applyResponse(res.data);
        } catch {
            // Silently ignore errors during background refresh
        }
    }, [buildParams, applyResponse]);

    /* ── Real-time ─────────────────────────────────────────── */

    useEffect(() => {
        if (!socket) return;

        const handleCreate = (data: any) => {
            toast.info(`New appointment created for ${data.patient?.fullName || 'a patient'}`);
            silentFetch();
        };

        const handleUpdate = () => {
            silentFetch();
        };

        socket.on('appointment:created', handleCreate);
        socket.on('appointment:updated', handleUpdate);
        socket.on('appointment:deleted', handleUpdate);

        return () => {
            socket.off('appointment:created', handleCreate);
            socket.off('appointment:updated', handleUpdate);
            socket.off('appointment:deleted', handleUpdate);
        };
    }, [socket, silentFetch]);

    useEffect(() => { setPage(1); }, [search, statusFilter, dateFrom, dateTo, pageSize]);
    useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

    /* ── Polling fallback: silent refresh every 10s for cross-device sync ── */
    useEffect(() => {
        const interval = setInterval(() => {
            silentFetch();
        }, 10000);
        return () => clearInterval(interval);
    }, [silentFetch]);

    /* ── Actions ───────────────────────────────────────────── */

    const handleCheckIn = async (id: string, patientName: string) => {
        try {
            await api.put(`/appointments/${id}/arrival`);
            toast.success(`${patientName || 'Patient'} checked in successfully`);
            fetchAppointments();
        } catch (error) {
            toast.error(getApiError(error, 'Check-in failed'));
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm('Cancel this appointment?')) return;
        try {
            await api.put(`/appointments/${id}`, { status: 'CANCELLED' });
            toast.success('Appointment cancelled');
            fetchAppointments();
        } catch (error) {
            toast.error(getApiError(error, 'Cancel failed'));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this appointment?')) return;
        try {
            await api.delete(`/appointments/${id}`);
            toast.success('Appointment deleted');
            // Real-time listener will refresh the list, but we refresh anyway for safety
            fetchAppointments();
        } catch (error) {
            toast.error('Failed to delete appointment');
        }
    };


    /* ── Render ─────────────────────────────────────────────── */

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Appointments</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage and schedule patient appointments</p>
                    </div>
                    {canCreate && (
                        <Button
                            onClick={() => router.push('/dashboard/appointments/new')}
                            className="h-11 rounded-lg bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold px-6 shadow-sm transition-all active:scale-95"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Add New Appointment
                        </Button>
                    )}
                </div>
            </div>

            {/* Toolbar */}
            <div className="px-6 py-3 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <Input
                            placeholder="Search appointments by patient or doctor..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9 text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-9 w-[130px] text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-[#0f172a] dark:border-slate-800">
                                <SelectItem value="all">All Status</SelectItem>
                                {STATUS_OPTIONS.map((s) => (
                                    <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="h-9 w-[140px] text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                            placeholder="From"
                        />

                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="h-9 w-[140px] text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                            placeholder="To"
                        />

                    </div>

                    {/* Refresh */}
                    <div className="ml-auto">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                            onClick={() => fetchAppointments()}
                            disabled={loading}
                        >
                            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Table card */}
            <div className="px-6 py-5">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 dark:bg-slate-900/70 hover:bg-slate-50 dark:hover:bg-slate-900/70 border-slate-200 dark:border-slate-800">
                                {['PATIENT & ID', 'DOCTOR', 'DATE & TIME', 'TYPE', 'STATUS', 'PAYMENT', 'ACTIONS'].map((h) => (
                                    <TableHead
                                        key={h}
                                        className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide py-3 px-4 whitespace-nowrap"
                                    >
                                        {h}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                            ) : appointments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-60 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                                                <CalendarPlus className="h-7 w-7 opacity-40" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-500">No appointments found</p>
                                                <p className="text-xs text-slate-400 mt-0.5">Try adjusting your filters or add a new appointment</p>
                                            </div>
                                            {canCreate && (
                                                <Button
                                                    size="sm"
                                                    className="mt-1 bg-[#0EA5E9] hover:bg-[#0c96d4] text-white"
                                                    onClick={() => router.push('/dashboard/appointments/new')}
                                                >
                                                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                                                    Add Appointment
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                appointments.map((a) => (
                                    <TableRow key={a.id} className="group border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                                        {/* PATIENT */}
                                        <TableCell className="py-3 px-4">
                                            <div className="flex flex-col gap-1">
                                                <p className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate">
                                                    {a.patient?.fullName || 'Unknown Patient'}
                                                </p>
                                                <Badge variant="outline" className="w-fit font-mono text-[9px] text-slate-500 border-slate-200 bg-slate-50/50 dark:bg-slate-900/50 dark:border-slate-800">
                                                    {a.patient?.patientNumber || 'PAT-PENDING'}
                                                </Badge>
                                            </div>
                                        </TableCell>

                                        {/* DOCTOR */}
                                        <TableCell className="py-3 px-4">
                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                                Dr. {doctorName(a)}
                                            </p>
                                        </TableCell>

                                        {/* DATE & TIME */}
                                        <TableCell className="py-3 px-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-slate-700 dark:text-slate-200">{formatDate(a.appointmentDate)}</span>
                                                {formatTime(a.appointmentDate) && (
                                                    <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                                        <Clock className="h-3 w-3" />
                                                        {formatTime(a.appointmentDate)}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* TYPE */}
                                        <TableCell className="py-3 px-4">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide border ${TYPE_STYLES[a.type?.toLowerCase() || 'consultation']}`}>
                                                {a.type || 'Consultation'}
                                            </span>
                                        </TableCell>

                                        {/* STATUS */}
                                        <TableCell className="py-3 px-4">
                                            {(() => {
                                                const rawStatus = a.status || 'PENDING';
                                                const isSurgery = a.type?.toLowerCase() === 'surgery';
                                                const displayStatus = (isSurgery && rawStatus === 'EXAMINING') ? 'IN_SURGERY' : rawStatus;
                                                const label = displayStatus === 'IN_SURGERY' ? 'In Surgery' : displayStatus;

                                                return (
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide border ${STATUS_STYLES[displayStatus] || STATUS_STYLES.PENDING}`}>
                                                        {label}
                                                    </span>
                                                );
                                            })()}
                                        </TableCell>

                                        {/* PAYMENT */}
                                        <TableCell className="py-3 px-4">
                                            {a.billings && a.billings.length > 0 ? (
                                                <div className="text-sm">
                                                    <div className="font-medium">{a.billings[0].status}</div>
                                                    <div className="text-xs text-slate-500">{a.billings[0].finalAmount != null ? `$${Number(a.billings[0].finalAmount).toFixed(2)}` : '$0.00'}</div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-500">No Billing</span>
                                            )}
                                        </TableCell>

                                        {/* ACTIONS */}
                                        <TableCell className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                {/* Check-In Button — only for today's PENDING/SCHEDULED appointments */}
                                                {canUpdate && isToday(a.appointmentDate) && (a.status === 'PENDING' || a.status === 'SCHEDULED') && (
                                                    <button
                                                        onClick={() => handleCheckIn(a.id, a.patient?.fullName || '')}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                                                        title="Mark patient as arrived"
                                                    >
                                                        <UserCheck className="h-3.5 w-3.5" />
                                                        Check In
                                                    </button>
                                                )}
                                                {/* Already checked-in badge */}
                                                {a.status === 'RECEIVED' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                                                        <UserCheck className="h-3.5 w-3.5" />
                                                        Arrived
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => router.push(`/dashboard/appointments/${a.id}`)}
                                                    className="text-sm font-medium text-sky-600 hover:text-sky-700 hover:underline transition-colors"
                                                >
                                                    View
                                                </button>
                                                {canUpdate && (
                                                    <button
                                                        onClick={() => router.push(`/dashboard/appointments/${a.id}/edit`)}
                                                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                                            <MoreVertical className="h-4 w-4 text-slate-400" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56 dark:bg-[#0f172a] dark:border-slate-800">
                                                        <DropdownMenuItem asChild className="cursor-pointer">
                                                            <Link href={`/dashboard/appointments/${a.id}`}>View Details</Link>
                                                        </DropdownMenuItem>
                                                        {canUpdate && (
                                                            <DropdownMenuItem asChild className="cursor-pointer">
                                                                <Link href={`/dashboard/appointments/${a.id}/edit`} className="flex items-center gap-2">
                                                                    <Pencil className="h-4 w-4" />
                                                                    Edit Appointment
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canUpdate && (
                                                            <DropdownMenuItem asChild className="cursor-pointer">
                                                                <Link href={`/dashboard/appointments/${a.id}/edit?mode=reschedule`} className="flex items-center gap-2">
                                                                    <CalendarIcon className="h-4 w-4" />
                                                                    Reschedule
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        )}
                                                        {/* Check-In from dropdown too */}
                                                        {canUpdate && isToday(a.appointmentDate) && (a.status === 'PENDING' || a.status === 'SCHEDULED') && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleCheckIn(a.id, a.patient?.fullName || '')}
                                                                className="cursor-pointer text-amber-600 focus:text-amber-500 dark:focus:text-amber-400 focus:bg-amber-50 dark:focus:bg-amber-900/20"
                                                            >
                                                                <UserCheck className="h-4 w-4 mr-2" />
                                                                Check In (Mark Arrived)
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canUpdate && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleCancel(a.id)}
                                                                className="cursor-pointer text-red-600 focus:text-red-400 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20"
                                                            >
                                                                <Ban className="h-4 w-4 mr-2" />
                                                                Cancel Appointment
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canDelete && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(a.id)}
                                                                className="text-red-600 focus:text-red-400 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20 cursor-pointer"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete Appointment
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="mt-3">
                    <ServerPagination
                        page={page}
                        limit={pageSize}
                        total={pagination.total}
                        totalPages={pagination.totalPages ?? pagination.pages ?? 1}
                        onPageChange={setPage}
                        onLimitChange={(l) => {
                            setPageSize(l);
                            setPage(1);
                        }}
                        disabled={loading}
                        itemLabel="appointments"
                    />
                </div>
            </div>

        </div>
    );
}
