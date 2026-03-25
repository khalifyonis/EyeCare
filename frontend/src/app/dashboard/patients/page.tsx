'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { getPatientColumns, type PatientRow } from './columns';
import { PatientDialog } from './patient-dialog';
import { AppointmentDialog } from './[id]/appointment-dialog';
import { toast } from 'sonner';
import { ServerPagination } from '@/components/dashboard/server-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { UserPlus, Search, Filter, RefreshCcw, Users } from 'lucide-react';

/* ── Skeleton row ─────────────────────────────────────────── */
function SkeletonRow() {
    return (
        <TableRow className="animate-pulse">
            {[160, 180, 80, 120, 120, 100].map((w, i) => (
                <TableCell key={i}>
                    <div className={`h-4 rounded bg-slate-100 dark:bg-slate-800`} style={{ width: w }} />
                    {i === 0 && <div className="h-3 rounded bg-slate-100 dark:bg-slate-800 mt-1.5 w-20" />}
                </TableCell>
            ))}
        </TableRow>
    );
}

export default function PatientsPage() {
    const router = useRouter();

    const [patients, setPatients] = useState<PatientRow[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
    const [bookingOpen, setBookingOpen] = useState(false);
    const [bookingPatientId, setBookingPatientId] = useState('');

    const [user, setUser] = useState<{ roleName?: string; role?: string | { name?: string } } | null>(null);

    const prevSearchRef = useRef(search);
    const prevSortRef = useRef(sortBy);

    /* ── auth ─────────────────────────────────────────────── */
    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) { try { setUser(JSON.parse(stored)); } catch { /* ignore */ } }
    }, []);

    const canManage = useMemo(() => {
        if (!user) return false;
        const r = typeof user.roleName === 'string'
            ? user.roleName
            : typeof user.role === 'string'
                ? user.role
                : typeof (user.role as { name?: string })?.name === 'string'
                    ? (user.role as { name?: string }).name!
                    : '';
        return ['ADMIN', 'SUPERADMIN', 'RECEPTIONIST'].includes(r.toUpperCase());
    }, [user]);

    /* ── fetch ────────────────────────────────────────────── */
    const fetchPatients = useCallback(async (q = '', p = 1) => {
        setLoading(true);
        try {
            const sortMap: Record<string, { sortBy: string; sortOrder: string }> = {
                newest: { sortBy: 'createdAt', sortOrder: 'desc' },
                oldest: { sortBy: 'createdAt', sortOrder: 'asc' },
                'name-asc': { sortBy: 'fullName', sortOrder: 'asc' },
                'name-desc': { sortBy: 'fullName', sortOrder: 'desc' },
            };
            const { sortBy: sb, sortOrder: so } = sortMap[sortBy] ?? sortMap.newest;
            const params = new URLSearchParams({
                page: String(p),
                limit: String(pageSize),
                sortBy: sb,
                sortOrder: so,
            });
            if (q) params.set('search', q);
            if (statusFilter === 'active') params.set('isActive', 'true');
            if (statusFilter === 'inactive') params.set('isActive', 'false');

            const res = await api.get(`/patients?${params}`);
            const body = res.data as { data?: PatientRow[]; total?: number; page?: number; totalPages?: number };
            setPatients(Array.isArray(body.data) ? body.data : []);
            setTotal(typeof body.total === 'number' ? body.total : 0);
            setPage(typeof body.page === 'number' ? body.page : 1);
            setTotalPages(typeof body.totalPages === 'number' ? body.totalPages : 1);
        } catch {
            toast.error('Failed to load patients');
        } finally {
            setLoading(false);
        }
    }, [sortBy, pageSize, statusFilter]);

    useEffect(() => {
        fetchPatients(search, page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchPatients]);

    /* debounced search / sort change resets to page 1 */
    useEffect(() => {
        const changed = prevSearchRef.current !== search || prevSortRef.current !== sortBy;
        prevSearchRef.current = search;
        prevSortRef.current = sortBy;
        const targetPage = changed ? 1 : page;
        if (changed) setPage(1);
        const t = setTimeout(() => fetchPatients(search, targetPage), 300);
        return () => clearTimeout(t);
    }, [search, sortBy, page, fetchPatients]);

    /* ── actions ──────────────────────────────────────────── */
    const handleEdit = (p: PatientRow) => { setSelectedPatient(p); setDialogOpen(true); };
    const handleDelete = async (id: string) => {
        if (!confirm('Delete this patient record? This cannot be undone.')) return;
        try {
            await api.delete(`/patients/${id}`);
            toast.success('Patient deleted');
            fetchPatients(search, page);
        } catch { toast.error('Delete failed'); }
    };
    const handleBook = (p: PatientRow) => { setBookingPatientId(p.id); setBookingOpen(true); };

    const columns = getPatientColumns({ onEdit: handleEdit, onDelete: handleDelete, onBook: handleBook, canManage });

    /* ── render ───────────────────────────────────────────── */
    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 dark:bg-slate-950">
            {/* ── Page header ── */}
            <div className="px-6 pt-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Patients</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Manage your patient records and information</p>
                    </div>
                    {canManage && (
                        <Button
                            onClick={() => router.push('/dashboard/patients/new')}
                            className="h-10 rounded-lg bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold px-4 shadow-sm"
                        >
                            <UserPlus className="w-4 h-4 mr-2" />
                            + Add New Patient
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Toolbar ── */}
            <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                        placeholder="Search patients by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 text-sm border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus-visible:ring-[#0EA5E9]"
                    />
                </div>

                {/* Filter */}
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                        <SelectTrigger className="h-9 w-[130px] text-sm border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All patients</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* count badge */}
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                        <Users className="h-3 w-3" />
                        {total} patient{total !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Sort + Refresh */}
                <div className="flex items-center gap-2 ml-auto">
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="h-9 w-[140px] text-sm border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="name-asc">Name A–Z</SelectItem>
                            <SelectItem value="name-desc">Name Z–A</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100"
                        onClick={() => fetchPatients(search, page)}
                        disabled={loading}
                    >
                        <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="flex-1 overflow-auto px-6 py-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-50">
                                {['PATIENT', 'CONTACT', 'STATUS', 'REGISTRATION DATE', 'ASSIGNED DOCTOR', 'ACTIONS'].map((h) => (
                                    <TableHead key={h} className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3 px-4 whitespace-nowrap">
                                        {h}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading
                                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                                : patients.length === 0
                                    ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-48 text-center">
                                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                                    <Users className="h-10 w-10 opacity-30" />
                                                    <p className="text-sm font-semibold">No patients found</p>
                                                    {canManage && (
                                                        <Button
                                                            size="sm"
                                                            className="mt-1 bg-[#0EA5E9] hover:bg-[#0c96d4] text-white"
                                                            onClick={() => router.push('/dashboard/patients/new')}
                                                        >
                                                            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                                                            Add First Patient
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                    : patients.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            className="border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                                        >
                                            {columns.map((col) => (
                                                <TableCell key={col.id} className="py-3 px-4 align-middle">
                                                    {typeof col.cell === 'function'
                                                        ? (col.cell as Function)({ row: { original: row } })
                                                        : null}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                            }
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="mt-3">
                    <ServerPagination
                        page={page}
                        limit={pageSize}
                        total={total}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        onLimitChange={(l) => { setPageSize(l); setPage(1); }}
                        disabled={loading}
                        itemLabel="patients"
                    />
                </div>
            </div>

            {/* ── Dialogs ── */}
            <PatientDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                patient={selectedPatient}
                onSuccess={() => fetchPatients(search, page)}
            />
            <AppointmentDialog
                open={bookingOpen}
                onOpenChange={setBookingOpen}
                patientId={bookingPatientId}
                onSuccess={() => fetchPatients(search, page)}
            />
        </div>
    );
}
