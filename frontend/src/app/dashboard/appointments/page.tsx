'use client'

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarPlus, Clock, CheckCircle2, Calendar, XCircle, Search } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { getAppointmentColumns } from './columns';
import { EditAppointmentDialog } from './edit-appointment-dialog';
import { toast } from 'sonner';
import { StatsCard } from '@/components/dashboard/stats-card';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

export default function AppointmentsPage() {
    const router = useRouter();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, cancelled: 0, revenueToday: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
    const [doctorFilter, setDoctorFilter] = useState('all');
    const [editOpen, setEditOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

    const fetchStats = async () => {
        try {
            const res = await api.get('/appointments/stats');
            setStats(res.data);
        } catch (err) { console.error('Stats fetch failed'); }
    };

    const fetchAppointments = useCallback(async (searchTerm = '', status = 'all') => {
        setLoading(true);
        try {
            let url = `/appointments?search=${searchTerm}`;
            if (status !== 'all') url += `&status=${status}`;
            const res = await api.get(url);
            setAppointments(res.data);
        } catch (error) { toast.error('Failed to load appointments'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAppointments(search, statusFilter); fetchStats(); }, [fetchAppointments]);
    useEffect(() => {
        const timer = setTimeout(() => { fetchAppointments(search, statusFilter); }, 300);
        return () => clearTimeout(timer);
    }, [search, statusFilter, fetchAppointments]);

    const doctors = useMemo(() => {
        const map = new Map<string, string>();
        appointments.forEach(a => {
            const doc = a.doctor;
            if (doc) map.set(doc.id || doc.userId, doc.user?.fullName || doc.fullName || 'Unknown');
        });
        return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    }, [appointments]);

    const filtered = useMemo(() => {
        let list = [...appointments];
        if (dateFilter) {
            list = list.filter(a => a.appointmentDate?.startsWith(dateFilter));
        }
        if (doctorFilter !== 'all') {
            list = list.filter(a => {
                const docId = a.doctor?.id || a.doctor?.userId;
                return docId === doctorFilter;
            });
        }
        return list;
    }, [appointments, dateFilter, doctorFilter]);

    const handleEdit = (appointment: any) => { setSelectedAppointment(appointment); setEditOpen(true); };
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this appointment?')) return;
        try {
            await api.delete(`/appointments/${id}`);
            toast.success('Appointment deleted');
            fetchAppointments(search, statusFilter); fetchStats();
        } catch (error: any) { toast.error(error.response?.data?.message || 'Delete failed'); }
    };

    const columns = useMemo(() => getAppointmentColumns({ onEdit: handleEdit, onDelete: handleDelete }), []);

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Appointments Management</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage all appointments in the system</p>
                </div>
                <Button
                    onClick={() => router.push('/dashboard/patients')}
                    className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold shadow-lg shadow-blue-500/20 px-6 rounded-xl transition-all active:scale-[0.98]"
                >
                    <CalendarPlus className="w-4 h-4 mr-2" />
                    New Booking
                </Button>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 w-full min-w-0">
                <StatsCard title="Total Appointments" value={stats.total.toLocaleString()} icon={Calendar} color="blue" trend={{ text: 'Growth', isUp: true }} />
                <StatsCard title="Pending" value={stats.pending.toLocaleString()} icon={Clock} color="amber" trend={{ text: 'Growth', isUp: true }} />
                <StatsCard title="Today's Appointments" value={stats.completed.toLocaleString()} icon={CheckCircle2} color="emerald" trend={{ text: 'Growth', isUp: true }} />
                <StatsCard title="Revenue Today" value={`$${(stats.revenueToday ?? 0).toLocaleString()}`} icon={XCircle} color="rose" trend={{ text: '0 appointments today', isUp: false }} />
            </div>

            {/* Filter row: Search | Status | Date | Doctor */}
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
                            {doctors.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
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
                    onRefresh={() => { fetchAppointments(search, statusFilter); fetchStats(); }}
                    itemLabel="appointments"
                    hideSearch
                />
            </div>

            <EditAppointmentDialog open={editOpen} onOpenChange={setEditOpen} appointment={selectedAppointment} onSuccess={() => { fetchAppointments(search, statusFilter); fetchStats(); }} />
        </div>
    );
}
