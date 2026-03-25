'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
    Calendar,
    Filter,
    RefreshCcw,
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
import { ServerPagination } from '@/components/dashboard/server-pagination';

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
    } | null;
    doctor?: {
        id?: string | null;
        userId?: string | null;
        fullName?: string | null;
        user?: { fullName?: string | null } | null;
    } | null;
}

interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    pages: number;
    totalPages?: number;
}

/* ── Helpers ───────────────────────────────────────────────── */

const STATUS_OPTIONS = ['PENDING', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const;

const TYPE_STYLES: Record<string, string> = {
    consultation: 'bg-blue-50 text-blue-700',
    'follow-up': 'bg-violet-50 text-violet-700',
    checkup: 'bg-green-50 text-green-700',
    emergency: 'bg-red-50 text-red-700',
};

const STATUS_STYLES: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    SCHEDULED: 'bg-slate-100 text-slate-700 border-slate-200',
    CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    COMPLETED: 'bg-blue-50 text-blue-700 border-blue-200',
    CANCELLED: 'bg-red-50 text-red-700 border-red-200',
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
    return a.doctor?.user?.fullName || a.doctor?.fullName || 'Unassigned';
}

function getApiError(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') return fallback;
    const e = error as { response?: { data?: { message?: unknown } } };
    const msg = e.response?.data?.message;
    return typeof msg === 'string' && msg.trim() ? msg : fallback;
}

/* ── Skeleton ──────────────────────────────────────────────── */

function SkeletonRow() {
    return (
        <TableRow className="animate-pulse">
            {[200, 130, 90, 100, 120, 110].map((w, i) => (
                <TableCell key={i}>
                    <div className="h-4 rounded bg-slate-100" style={{ width: w }} />
                    {i === 0 && <div className="h-3 rounded bg-slate-100 mt-1.5 w-24" />}
                </TableCell>
            ))}
        </TableRow>
    );
}

/* ── Page ──────────────────────────────────────────────────── */

export default function AppointmentsPage() {
    const router = useRouter();

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta>({ total: 0, page: 1, limit: 20, pages: 1 });
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    /* ── Fetch ─────────────────────────────────────────────── */

    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit: pageSize };
            if (search) params.search = search;
            if (statusFilter !== 'all') params.status = statusFilter;
            if (dateFrom) params.from = dateFrom;
            if (dateTo) params.to = dateTo;

            const res = await api.get('/appointments', { params });
            const body = res.data as { data?: Appointment[]; pagination?: PaginationMeta };
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
        } catch {
            toast.error('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, dateFrom, dateTo, page, pageSize]);

    useEffect(() => { setPage(1); }, [search, statusFilter, dateFrom, dateTo, pageSize]);
    useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

    /* ── Actions ───────────────────────────────────────────── */

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
            fetchAppointments();
        } catch (error) {
            toast.error(getApiError(error, 'Delete failed'));
        }
    };

    /* ── Render ─────────────────────────────────────────────── */

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 bg-white border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Appointments</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Manage and schedule patient appointments</p>
                    </div>
                    <Button
                        onClick={() => router.push('/dashboard/appointments/new')}
                        className="h-10 rounded-lg bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold px-4 shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-1.5" />
                        + Add New Appointment
                    </Button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="px-6 py-3 bg-white border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <Input
                            placeholder="Search appointments by patient or doctor..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9 text-sm border-slate-200 bg-slate-50 focus-visible:ring-[#0EA5E9]"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-9 w-[130px] text-sm border-slate-200 bg-slate-50">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
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
                            className="h-9 w-[140px] text-sm border-slate-200 bg-slate-50"
                            placeholder="From"
                        />

                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="h-9 w-[140px] text-sm border-slate-200 bg-slate-50"
                            placeholder="To"
                        />

                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 whitespace-nowrap">
                            <Calendar className="h-3 w-3" />
                            {pagination.total} appointment{pagination.total !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* Refresh */}
                    <div className="ml-auto">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 border border-slate-200 bg-slate-50 hover:bg-slate-100"
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
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                {['PATIENT & DOCTOR', 'DATE & TIME', 'TYPE', 'STATUS', 'LOCATION', 'ACTIONS'].map((h) => (
                                    <TableHead
                                        key={h}
                                        className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4 whitespace-nowrap"
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
                                    <TableCell colSpan={6} className="h-60 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                                                <CalendarPlus className="h-7 w-7 opacity-40" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-500">No appointments found</p>
                                                <p className="text-xs text-slate-400 mt-0.5">Try adjusting your filters or add a new appointment</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                className="mt-1 bg-[#0EA5E9] hover:bg-[#0c96d4] text-white"
                                                onClick={() => router.push('/dashboard/appointments/new')}
                                            >
                                                <Plus className="h-3.5 w-3.5 mr-1.5" />
                                                Add Appointment
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                appointments.map((a) => (
                                    <TableRow key={a.id} className="group">
                                        {/* PATIENT & DOCTOR */}
                                        <TableCell className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                                    <User2 className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-sm text-slate-900 truncate">
                                                        {a.patient?.fullName || 'Unknown Patient'}
                                                    </p>
                                                    <p className="text-xs text-slate-400 truncate">
                                                        {a.patient?.id ? `ID: ${a.patient.id.slice(0, 8)}` : '—'}
                                                    </p>
                                                    <p className="text-xs text-slate-500 truncate">
                                                        Dr. {doctorName(a)}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* DATE & TIME */}
                                        <TableCell className="py-3 px-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-slate-800">{formatDate(a.appointmentDate)}</span>
                                                {formatTime(a.appointmentDate) && (
                                                    <span className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                                                        <Clock className="h-3 w-3" />
                                                        {formatTime(a.appointmentDate)}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* TYPE */}
                                        <TableCell className="py-3 px-4">
                                            {a.type ? (
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[a.type.toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>
                                                    {a.type}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </TableCell>

                                        {/* STATUS */}
                                        <TableCell className="py-3 px-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[a.status || ''] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                {a.status || 'PENDING'}
                                            </span>
                                        </TableCell>

                                        {/* LOCATION */}
                                        <TableCell className="py-3 px-4">
                                            {a.location ? (
                                                <span className="flex items-center gap-1.5 text-sm text-slate-600">
                                                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                    <span className="truncate max-w-[140px]">{a.location}</span>
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </TableCell>

                                        {/* ACTIONS */}
                                        <TableCell className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => router.push(`/dashboard/appointments/${a.id}`)}
                                                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => router.push(`/dashboard/appointments/${a.id}/edit`)}
                                                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                                >
                                                    Edit
                                                </button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                                            <MoreVertical className="h-4 w-4 text-slate-400" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56">
                                                        <DropdownMenuItem asChild className="cursor-pointer">
                                                            <Link href={`/dashboard/appointments/${a.id}`}>View Details</Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild className="cursor-pointer">
                                                            <Link href={`/dashboard/appointments/${a.id}/edit`} className="flex items-center gap-2">
                                                                <Pencil className="h-4 w-4" />
                                                                Edit Appointment
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild className="cursor-pointer">
                                                            <Link href={`/dashboard/appointments/${a.id}/edit?mode=reschedule`} className="flex items-center gap-2">
                                                                <CalendarIcon className="h-4 w-4" />
                                                                Reschedule
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleCancel(a.id)}
                                                            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                                        >
                                                            <Ban className="h-4 w-4 mr-2" />
                                                            Cancel Appointment
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(a.id)}
                                                            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete Appointment
                                                        </DropdownMenuItem>
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
