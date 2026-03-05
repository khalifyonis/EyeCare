'use client'

import { useEffect, useState, useMemo, useCallback } from 'react';
import api from '@/lib/axios';
import { getPatientColumns } from './columns';
import { DataTable } from '@/components/ui/data-table';
import Link from 'next/link';
import { UserPlus, Users, UserCheck, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PatientDialog } from './patient-dialog';
import { AppointmentDialog } from './[id]/appointment-dialog';
import { toast } from 'sonner';
import { StatsCard } from '@/components/dashboard/stats-card';
import { TableToolbar } from '@/components/dashboard/table-toolbar';

export default function PatientsPage() {
    const [patients, setPatients] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, today: 0, month: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
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
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error('Failed to parse user');
            }
        }
        fetchPatients();
        fetchStats();
    }, [fetchPatients]);

    // Handle debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPatients(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search, fetchPatients]);

    const canManage = useMemo(() => {
        const role = user?.roleName?.toUpperCase() || user?.role?.toUpperCase();
        return role === 'ADMIN' || role === 'SUPERADMIN' || role === 'RECEPTIONIST';
    }, [user]);

    const handleEdit = (patient: any) => {
        setSelectedPatient(patient);
        setDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this patient record?')) return;
        try {
            await api.delete(`/patients/${id}`);
            toast.success('Patient record deleted');
            fetchPatients(search);
            fetchStats();
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    const handleBook = (patient: any) => {
        setBookingPatientId(patient.id);
        setBookingOpen(true);
    };

    const columns = useMemo(() => getPatientColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
        onBook: handleBook,
    }), []);

    return (
        <div className="p-4 md:p-6 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Patients Directory</h1>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                        <Link href="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link>
                        <span>›</span>
                        <span>Patient Records</span>
                    </div>
                </div>
                {canManage && (
                    <Button
                        onClick={() => { setSelectedPatient(null); setDialogOpen(true); }}
                        className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 px-6 rounded-xl transition-all active:scale-95 h-11"
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        New Patient
                    </Button>
                )}
            </div>

            {/* Stats Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatsCard
                    title="Total Patients"
                    value={stats.total}
                    icon={Users}
                    color="blue"
                    trend={{ value: 'Active Database', isUp: true }}
                />
                <StatsCard
                    title="Registered Today"
                    value={stats.today}
                    icon={UserCheck}
                    color="emerald"
                    trend={{ value: 'New Checkins', isUp: true }}
                />
                <StatsCard
                    title="This Month"
                    value={stats.month}
                    icon={TrendingUp}
                    color="purple"
                    trend={{ value: 'Growth', isUp: true }}
                />
            </div>

            {/* Toolbar Area */}
            <TableToolbar
                search={search}
                onSearchChange={setSearch}
                placeholder="Search by ID, Name, Phone or Email..."
            />

            {/* Table Area */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <DataTable
                    columns={columns}
                    data={patients}
                    loading={loading}
                    onRefresh={() => { fetchPatients(search); fetchStats(); }}
                    itemLabel="patients"
                />
            </div>

            <PatientDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                patient={selectedPatient}
                onSuccess={() => { fetchPatients(search); fetchStats(); }}
            />

            <AppointmentDialog
                open={bookingOpen}
                onOpenChange={setBookingOpen}
                patientId={bookingPatientId}
                onSuccess={() => { fetchPatients(search); fetchStats(); }}
            />
        </div >
    );
}
