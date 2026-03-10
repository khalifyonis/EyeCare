'use client'

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarPlus, Clock, CheckCircle2, Calendar, DollarSign, Search } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { getAppointmentColumns, type AppointmentRow } from './columns';
import { EditAppointmentDialog } from './edit-appointment-dialog';
import { NewAppointmentDialog } from './new-appointment-dialog';
import { toast } from 'sonner';
import { StatsCard } from '@/components/dashboard/stats-card';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import { ServerPagination } from '@/components/dashboard/server-pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { readStoredUser, resolveRoleName } from '@/lib/auth';

type AppointmentStats = {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
    revenueToday: number;
};

function getApiErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') return fallback;

    const maybe = error as {
        response?: {
            data?: {
                message?: unknown;
            };
        };
    };

    const msg = maybe.response?.data?.message;
    return typeof msg === 'string' && msg.trim().length > 0 ? msg : fallback;
}

export default function AppointmentsPage() {
    const router = useRouter();
    const [role, setRole] = useState('');
    const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
    const [stats, setStats] = useState<AppointmentStats>({ total: 0, pending: 0, completed: 0, cancelled: 0, revenueToday: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
    const [doctorFilter, setDoctorFilter] = useState('all');
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRow | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 20;

    useEffect(() => {
        setRole(resolveRoleName(readStoredUser()));
    }, []);

    const canManage = useMemo(() => ['ADMIN', 'SUPERADMIN', 'RECEPTIONIST'].includes(role), [role]);
    const canRecordER = useMemo(() => ['ADMIN', 'SUPERADMIN', 'DOCTOR'].includes(role), [role]);
    const canRecordClinical = useMemo(() => ['ADMIN', 'SUPERADMIN', 'DOCTOR'].includes(role), [role]);

    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get('/appointments/stats');
            setStats(res.data as AppointmentStats);
        } catch {
            console.error('Stats fetch failed');
        }
    }, []);

    const fetchAppointments = useCallback(async (searchTerm = '', status = 'all', pageNum = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.set('search', searchTerm);
            if (status !== 'all') params.set('status', status);
            if (dateFilter) params.set('date', dateFilter);
            if (doctorFilter !== 'all') params.set('doctorId', doctorFilter);
            params.set('page', String(pageNum));
            params.set('limit', String(pageSize));
            const res = await api.get(`/appointments?${params.toString()}`);
            const body = res.data as { data?: AppointmentRow[]; total?: number; page?: number; totalPages?: number };
            setAppointments(Array.isArray(body.data) ? body.data : []);
            setTotal(typeof body.total === 'number' ? body.total : 0);
            setPage(typeof body.page === 'number' ? body.page : 1);
            setTotalPages(typeof body.totalPages === 'number' ? body.totalPages : 1);
        } catch {
            toast.error('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    }, [dateFilter, doctorFilter]);

    useEffect(() => {
        setPage(1);
    }, [search, statusFilter, dateFilter, doctorFilter]);

    useEffect(() => {
        fetchAppointments(search, statusFilter, page);
        fetchStats();
    }, [fetchAppointments, fetchStats, search, statusFilter, page, dateFilter, doctorFilter]);

    const doctors = useMemo(() => {
        const map = new Map<string, string>();
        appointments.forEach((appointment) => {
            const doctor = appointment.doctor;
            if (doctor) {
                map.set(doctor.id || doctor.userId || '', doctor.user?.fullName || doctor.fullName || 'Unknown');
            }
        });
        return Array.from(map.entries()).filter(([id]) => id).sort((a, b) => a[1].localeCompare(b[1]));
    }, [appointments]);

    const filtered = appointments;

    const handleEdit = useCallback((appointment: AppointmentRow) => {
        setSelectedAppointment(appointment);
        setEditOpen(true);
    }, []);

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm('Are you sure you want to delete this appointment?')) return;
        try {
            await api.delete(`/appointments/${id}`);
            toast.success('Appointment deleted');
            fetchAppointments(search, statusFilter, page);
            fetchStats();
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Delete failed'));
        }
    }, [fetchAppointments, fetchStats, search, statusFilter, page]);

    const columns = useMemo(
        () =>
            getAppointmentColumns({
                onEdit: handleEdit,
                onDelete: handleDelete,
                canManage,
                canRecordER,
                canRecordClinical,
                onOpenER: (appointmentId) => router.push(`/dashboard/examinations/er?appointmentId=${appointmentId}`),
                onOpenClinical: (appointmentId) => router.push(`/dashboard/examinations/clinical?appointmentId=${appointmentId}`),
            }),
        [canManage, canRecordER, canRecordClinical, handleDelete, handleEdit, router]
    );

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Appointments</h1>
                    <PageBreadcrumb current="Appointments" />
                </div>
                {canManage && (
                    <Button
                        onClick={() => setCreateOpen(true)}
                        className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold shadow-lg shadow-blue-500/20 px-6 rounded-xl transition-all active:scale-[0.98]"
                    >
                        <CalendarPlus className="w-4 h-4 mr-2" />
                        New Booking
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 w-full min-w-0">
                <StatsCard title="Total Appointments" value={stats.total.toLocaleString()} icon={Calendar} color="blue" trend={{ text: 'Growth', isUp: true }} />
                <StatsCard title="Pending" value={stats.pending.toLocaleString()} icon={Clock} color="amber" trend={{ text: 'Growth', isUp: true }} />
                <StatsCard title="Completed" value={stats.completed.toLocaleString()} icon={CheckCircle2} color="emerald" trend={{ text: 'Growth', isUp: true }} />
                <StatsCard title="Revenue Today" value={`$${(stats.revenueToday ?? 0).toLocaleString()}`} icon={DollarSign} color="rose" trend={{ text: 'Growth', isUp: true }} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search appointments..."
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
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Date</label>
                    <Input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="h-10 rounded-lg border-slate-200 dark:border-slate-800 text-sm"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Doctor</label>
                    <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                        <SelectTrigger className="h-10 rounded-lg border-slate-200 dark:border-slate-800 text-sm">
                            <SelectValue placeholder="All Doctors" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Doctors</SelectItem>
                            {doctors.map(([id, name]) => (
                                <SelectItem key={id} value={id}>
                                    {name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto min-w-0">
                <DataTable
                    columns={columns}
                    data={filtered}
                    loading={loading}
                    onRefresh={() => {
                        fetchAppointments(search, statusFilter, page);
                        fetchStats();
                    }}
                    itemLabel="appointments"
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

            <EditAppointmentDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                appointment={selectedAppointment}
                onSuccess={() => {
                    fetchAppointments(search, statusFilter, page);
                    fetchStats();
                }}
            />
            <NewAppointmentDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                onSuccess={() => {
                    fetchAppointments(search, statusFilter, page);
                    fetchStats();
                }}
            />
        </div>
    );
}
