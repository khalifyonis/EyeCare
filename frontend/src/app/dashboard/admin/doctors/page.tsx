'use client'

import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/lib/axios';
import { getDoctorColumns } from './columns';
import { DataTable } from '@/components/ui/data-table';
import { UserPlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { UserDialog } from '../users/user-dialog';
import Link from 'next/link';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

export default function DoctorsPage() {
    const [doctors, setDoctors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [specFilter, setSpecFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name-asc');

    const fetchDoctors = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/doctors');
            setDoctors(res.data);
        } catch (err: any) {
            toast.error('Failed to load doctors list');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

    const specializations = useMemo(() => {
        const specs = new Set(doctors.map(d => d.specialization).filter(Boolean));
        return Array.from(specs).sort();
    }, [doctors]);

    const filtered = useMemo(() => {
        let list = [...doctors];
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(d =>
                d.fullName?.toLowerCase().includes(q) ||
                d.email?.toLowerCase().includes(q) ||
                d.licenseNumber?.toLowerCase().includes(q)
            );
        }
        if (specFilter !== 'all') list = list.filter(d => d.specialization === specFilter);
        if (statusFilter !== 'all') list = list.filter(d => statusFilter === 'active' ? d.isActive : !d.isActive);
        list.sort((a, b) => {
            if (sortBy === 'name-asc') return (a.fullName || '').localeCompare(b.fullName || '');
            if (sortBy === 'name-desc') return (b.fullName || '').localeCompare(a.fullName || '');
            return 0;
        });
        return list;
    }, [doctors, search, specFilter, statusFilter, sortBy]);

    const handleEdit = (doctor: any) => { setSelectedDoctor(doctor); setDialogOpen(true); };
    const handleDelete = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this doctor?')) return;
        try {
            await api.delete(`/users/${userId}`);
            toast.success('Doctor deleted successfully');
            fetchDoctors();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete doctor');
        }
    };

    const columns = getDoctorColumns({ onEdit: handleEdit, onDelete: handleDelete });

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Doctors Management</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage all doctors in the system</p>
                </div>
                <Button
                    onClick={() => { setSelectedDoctor(null); setDialogOpen(true); }}
                    className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold shadow-lg shadow-blue-500/20 px-6 rounded-xl transition-all active:scale-[0.98]"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add New Doctor
                </Button>
            </div>

            {/* Filter row: Search | Specialization | Status | Sort By */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Search Doctors</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by name, email, or spe..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-10 rounded-lg border-slate-200 dark:border-slate-800 text-sm"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Specialization</label>
                    <Select value={specFilter} onValueChange={setSpecFilter}>
                        <SelectTrigger className="h-10 rounded-lg border-slate-200 dark:border-slate-800 text-sm">
                            <SelectValue placeholder="All Specializations" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Specializations</SelectItem>
                            {specializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
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
                            <SelectValue placeholder="Name (A-Z)" />
                        </SelectTrigger>
                        <SelectContent>
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
                    onRefresh={fetchDoctors}
                    itemLabel="doctors"
                    hideSearch
                />
            </div>

            <UserDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                user={selectedDoctor}
                onSuccess={fetchDoctors}
            />
        </div>
    );
}
