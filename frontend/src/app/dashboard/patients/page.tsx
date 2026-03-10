'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import api from '@/lib/axios';
import { getPatientColumns, type PatientRow } from './columns';
import { DataTable } from '@/components/ui/data-table';
import { UserPlus, Users, UserCheck, TrendingUp, CalendarDays, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PatientDialog } from './patient-dialog';
import { AppointmentDialog } from './[id]/appointment-dialog';
import { toast } from 'sonner';
import { StatsCard } from '@/components/dashboard/stats-card';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import { ServerPagination } from '@/components/dashboard/server-pagination';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

export default function PatientsPage() {
    const [patients, setPatients] = useState<PatientRow[]>([]);
    const [stats, setStats] = useState({ total: 0, today: 0, week: 0, month: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 20;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
    const [user, setUser] = useState<unknown>(null);
    const [bookingOpen, setBookingOpen] = useState(false);
    const [bookingPatientId, setBookingPatientId] = useState<string>('');
    const prevSearchRef = useRef(search);
    const prevSortRef = useRef(sortBy);

    const fetchStats = async () => {
        try {
            const res = await api.get('/patients/stats');
            setStats(res.data);
        } catch {
            console.error('Stats fetch failed');
        }
    };

    const fetchPatients = useCallback(async (searchTerm = '', pageNum = 1) => {
        setLoading(true);
        try {
            const sortMap: Record<string, { sortBy: string; sortOrder: string }> = {
                newest: { sortBy: 'createdAt', sortOrder: 'desc' },
                oldest: { sortBy: 'createdAt', sortOrder: 'asc' },
                'name-asc': { sortBy: 'fullName', sortOrder: 'asc' },
                'name-desc': { sortBy: 'fullName', sortOrder: 'desc' },
            };
            const { sortBy: sb, sortOrder: so } = sortMap[sortBy] || sortMap.newest;
            const params = new URLSearchParams();
            if (searchTerm) params.set('search', searchTerm);
            params.set('page', String(pageNum));
            params.set('limit', String(pageSize));
            params.set('sortBy', sb);
            params.set('sortOrder', so);
            const res = await api.get(`/patients?${params.toString()}`);
            const body = res.data as { data?: PatientRow[]; total?: number; page?: number; totalPages?: number };
            setPatients(Array.isArray(body.data) ? body.data : []);
            setTotal(typeof body.total === 'number' ? body.total : 0);
            setPage(typeof body.page === 'number' ? body.page : 1);
            setTotalPages(typeof body.totalPages === 'number' ? body.totalPages : 1);
        } catch {
            toast.error('Failed to load patients directory');
        } finally {
            setLoading(false);
        }
    }, [sortBy]);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try { setUser(JSON.parse(storedUser)); } catch { console.error('Failed to parse user'); }
        }
        fetchPatients(search, page);
        fetchStats();
    }, [fetchPatients]);

    useEffect(() => {
        setPage(1);
    }, [search, sortBy]);

    useEffect(() => {
        const searchOrSortChanged = prevSearchRef.current !== search || prevSortRef.current !== sortBy;
        prevSearchRef.current = search;
        prevSortRef.current = sortBy;
        const pageToFetch = searchOrSortChanged ? 1 : page;
        const timer = setTimeout(() => { fetchPatients(search, pageToFetch); }, 300);
        return () => clearTimeout(timer);
    }, [search, page, sortBy, fetchPatients]);

    const canManage = useMemo(() => {
        if (!user || typeof user !== 'object') return false;
        const u = user as { roleName?: unknown; role?: unknown };
        const roleValue = typeof u.roleName === 'string'
            ? u.roleName
            : typeof u.role === 'string'
                ? u.role
                : (u.role && typeof u.role === 'object' && typeof (u.role as { name?: unknown }).name === 'string')
                    ? ((u.role as { name?: string }).name || '')
                    : '';

        const roleUpper = roleValue.toUpperCase();
        return roleUpper === 'ADMIN' || roleUpper === 'SUPERADMIN' || roleUpper === 'RECEPTIONIST';
    }, [user]);

    const filtered = useMemo(() => {
        let list = [...patients];
        if (statusFilter !== 'all') {
            list = list.filter(p => statusFilter === 'active' ? p.isActive !== false : p.isActive === false);
        }
        list.sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
            if (sortBy === 'oldest') return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
            if (sortBy === 'name-asc') return (a.fullName || '').localeCompare(b.fullName || '');
            if (sortBy === 'name-desc') return (b.fullName || '').localeCompare(a.fullName || '');
            return 0;
        });
        return list;
    }, [patients, statusFilter, sortBy]);

    const handleEdit = (patient: PatientRow) => { setSelectedPatient(patient); setDialogOpen(true); };
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this patient record?')) return;
        try {
            await api.delete(`/patients/${id}`);
            toast.success('Patient record deleted');
            fetchPatients(search, page);
            fetchStats();
        } catch { toast.error('Delete failed'); }
    };
    const handleBook = (patient: PatientRow) => { setBookingPatientId(patient.id); setBookingOpen(true); };

    const columns = getPatientColumns({
        onEdit: handleEdit, onDelete: handleDelete, onBook: handleBook, canManage,
    });

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Patients</h1>
                    <PageBreadcrumb current="Patients" />
                </div>
                {canManage && (
                    <Button
                        onClick={() => { setSelectedPatient(null); setDialogOpen(true); }}
                        className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold shadow-lg shadow-blue-500/20 px-6 rounded-xl transition-all active:scale-[0.98]"
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        New Patient
                    </Button>
                )}
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 w-full min-w-0">
                <StatsCard title="Total Patients" value={stats.total.toLocaleString()} icon={Users} color="blue" trend={{ text: 'Growth', isUp: true }} />
                <StatsCard title="New Today" value={stats.today.toLocaleString()} icon={CalendarDays} color="emerald" trend={{ text: 'Growth', isUp: true }} />
                <StatsCard title="New This Week" value={stats.week.toLocaleString()} icon={TrendingUp} color="amber" trend={{ text: 'Growth', isUp: true }} />
                <StatsCard title="New This Month" value={stats.month.toLocaleString()} icon={UserCheck} color="purple" trend={{ text: 'Growth', isUp: true }} />
            </div>

            {/* Filter row: Search | Status | Sort By */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Search Patients</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by name, email, or phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-10 rounded-lg border-slate-200 dark:border-slate-800 text-sm"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-10 rounded-lg border-slate-200 dark:border-slate-800 text-sm">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Sort By</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="h-10 rounded-lg border-slate-200 dark:border-slate-800 text-sm">
                            <SelectValue placeholder="Newest First" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto min-w-0">
                <DataTable
                    columns={columns}
                    data={filtered}
                    loading={loading}
                    onRefresh={() => { fetchPatients(search, page); fetchStats(); }}
                    itemLabel="patients"
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

            <PatientDialog open={dialogOpen} onOpenChange={setDialogOpen} patient={selectedPatient} onSuccess={() => { fetchPatients(search, page); fetchStats(); }} />
            <AppointmentDialog open={bookingOpen} onOpenChange={setBookingOpen} patientId={bookingPatientId} onSuccess={() => { fetchPatients(search, page); fetchStats(); }} />
        </div>
    );
}
