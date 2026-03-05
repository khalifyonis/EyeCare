'use client'

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { CalendarPlus, Clock, CheckCircle2, DollarSign } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { getAppointmentColumns } from './columns';
import { EditAppointmentDialog } from './edit-appointment-dialog';
import { toast } from 'sonner';
import { StatsCard } from '@/components/dashboard/stats-card';
import { TableToolbar } from '@/components/dashboard/table-toolbar';
import Link from 'next/link';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';

export default function AppointmentsPage() {
    const router = useRouter();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [stats, setStats] = useState({ pending: 0, completed: 0, revenueToday: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [editOpen, setEditOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

    const fetchStats = async () => {
        try {
            const res = await api.get('/appointments/stats');
            setStats(res.data);
        } catch (err) {
            console.error('Stats fetch failed');
        }
    };

    const fetchAppointments = useCallback(async (searchTerm = '', status = 'all') => {
        setLoading(true);
        try {
            let url = `/appointments?search=${searchTerm}`;
            if (status !== 'all') url += `&status=${status}`;

            const res = await api.get(url);
            setAppointments(res.data);
        } catch (error) {
            toast.error('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAppointments(search, statusFilter);
        fetchStats();
    }, [fetchAppointments]);

    // Debounced search & filter effect
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAppointments(search, statusFilter);
        }, 300);
        return () => clearTimeout(timer);
    }, [search, statusFilter, fetchAppointments]);

    const handleEdit = (appointment: any) => {
        setSelectedAppointment(appointment);
        setEditOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this appointment?')) return;
        try {
            await api.delete(`/appointments/${id}`);
            toast.success('Appointment deleted');
            fetchAppointments(search, statusFilter);
            fetchStats();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Delete failed');
        }
    };

    const columns = useMemo(() => getAppointmentColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
    }), []);

    return (
        <div className="p-4 md:p-6 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Appointment Schedule</h1>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                        <Link href="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link>
                        <span>›</span>
                        <span>Appointment Schedule</span>
                    </div>
                </div>
                <Button
                    onClick={() => router.push('/dashboard/patients')}
                    className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold shadow-lg shadow-blue-500/20 px-6 rounded-xl transition-all active:scale-[0.98]"
                >
                    <CalendarPlus className="w-4 h-4 mr-2" />
                    New Booking
                </Button>
            </div>

            {/* Stats Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatsCard
                    title="Pending Visits"
                    value={stats.pending}
                    icon={Clock}
                    color="amber"
                    trend={{ value: 'Awaiting Care', isUp: true }}
                />
                <StatsCard
                    title="Completed Today"
                    value={stats.completed}
                    icon={CheckCircle2}
                    color="emerald"
                    trend={{ value: 'Daily Progress', isUp: true }}
                />
                <StatsCard
                    title="Revenue (Today)"
                    value={`$${stats.revenueToday.toLocaleString()}`}
                    icon={DollarSign}
                    color="rose"
                    trend={{ value: 'Live Tracking', isUp: true }}
                />
            </div>

            {/* Toolbar Area */}
            <TableToolbar
                search={search}
                onSearchChange={setSearch}
                placeholder="Search by Booking #, Patient or Doctor..."
                hasActiveFilters={statusFilter !== 'all'}
                onClearFilters={() => { setSearch(''); setStatusFilter('all'); }}
            >
                <div className="w-[160px]">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9 rounded-lg bg-slate-50 border-none dark:bg-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                            <SelectItem value="all" className="text-[11px] font-bold uppercase">All Statuses</SelectItem>
                            <SelectItem value="PENDING" className="text-[11px] font-bold uppercase text-amber-600">Pending</SelectItem>
                            <SelectItem value="COMPLETED" className="text-[11px] font-bold uppercase text-emerald-600">Completed</SelectItem>
                            <SelectItem value="CANCELLED" className="text-[11px] font-bold uppercase text-rose-600">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </TableToolbar>

            {/* Table Area */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <DataTable
                    columns={columns}
                    data={appointments}
                    loading={loading}
                    onRefresh={() => { fetchAppointments(search, statusFilter); fetchStats(); }}
                    itemLabel="appointments"
                />
            </div>

            <EditAppointmentDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                appointment={selectedAppointment}
                onSuccess={() => { fetchAppointments(search, statusFilter); fetchStats(); }}
            />
        </div>
    );
}
