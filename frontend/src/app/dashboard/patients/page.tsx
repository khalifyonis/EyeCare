'use client'

import { useEffect, useState, useMemo, useCallback } from 'react';
import api from '@/lib/axios';
import { getPatientColumns } from './columns';
import { DataTable } from '@/components/ui/data-table';
import Link from 'next/link';
import { UserPlus, Users, UserCheck, TrendingUp, CalendarDays, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PatientDialog } from './patient-dialog';
import { AppointmentDialog } from './[id]/appointment-dialog';
import { toast } from 'sonner';
import { StatsCard } from '@/components/dashboard/stats-card';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

export default function PatientsPage() {
    const [patients, setPatients] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, today: 0, week: 0, month: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [bookingOpen, setBookingOpen] = useState(false);
    const [bookingPatientId, setBookingPatientId] = useState<string>('');

    const fetchStats = async () => {
        try {
            const res = await api.get('/patients/stats');
            setStats(res.data);
        } catch (err) {
            console.error('Stats fetch failed');
        }
    };

    const fetchPatients = useCallback(async (searchTerm = '') => {
        setLoading(true);
        try {
            const res = await api.get(`/patients${searchTerm ? `?search=${searchTerm}` : ''}`);
            setPatients(res.data);
        } catch (err: any) {
            toast.error('Failed to load patients directory');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try { setUser(JSON.parse(storedUser)); } catch (e) { console.error('Failed to parse user'); }
        }
        fetchPatients();
        fetchStats();
    }, [fetchPatients]);

    useEffect(() => {
        const timer = setTimeout(() => { fetchPatients(search); }, 300);
        return () => clearTimeout(timer);
    }, [search, fetchPatients]);

    const canManage = useMemo(() => {
        const role = user?.roleName?.toUpperCase() || user?.role?.toUpperCase();
        return role === 'ADMIN' || role === 'SUPERADMIN' || role === 'RECEPTIONIST';
    }, [user]);

    const filtered = useMemo(() => {
        let list = [...patients];
        if (statusFilter !== 'all') {
            list = list.filter(p => statusFilter === 'active' ? p.isActive !== false : p.isActive === false);
        }
        list.sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            if (sortBy === 'name-asc') return (a.fullName || '').localeCompare(b.fullName || '');
            if (sortBy === 'name-desc') return (b.fullName || '').localeCompare(a.fullName || '');
            return 0;
        });
        return list;
    }, [patients, statusFilter, sortBy]);

    const handleEdit = (patient: any) => { setSelectedPatient(patient); setDialogOpen(true); };
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this patient record?')) return;
        try {
            await api.delete(`/patients/${id}`);
            toast.success('Patient record deleted');
            fetchPatients(search); fetchStats();
        } catch (error) { toast.error('Delete failed'); }
    };
    const handleBook = (patient: any) => { setBookingPatientId(patient.id); setBookingOpen(true); };

    const columns = useMemo(() => getPatientColumns({
        onEdit: handleEdit, onDelete: handleDelete, onBook: handleBook,
    }), []);

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Patients Management</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage and monitor all patient records</p>
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
                <StatsCard title="Active Today" value={stats.today.toLocaleString()} icon={UserCheck} color="emerald" trend={{ text: 'Growth', isUp: true }} />
                <StatsCard title="New This Month" value={stats.month.toLocaleString()} icon={CalendarDays} color="purple" trend={{ text: 'Growth', isUp: true }} />
                <StatsCard title="Appointments" value={stats.week.toLocaleString()} icon={TrendingUp} color="amber" trend={{ text: 'Growth', isUp: true }} />
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
                    onRefresh={() => { fetchPatients(search); fetchStats(); }}
                    itemLabel="patients"
                    hideSearch
                />
            </div>

            <PatientDialog open={dialogOpen} onOpenChange={setDialogOpen} patient={selectedPatient} onSuccess={() => { fetchPatients(search); fetchStats(); }} />
            <AppointmentDialog open={bookingOpen} onOpenChange={setBookingOpen} patientId={bookingPatientId} onSuccess={() => { fetchPatients(search); fetchStats(); }} />
        </div>
    );
}
