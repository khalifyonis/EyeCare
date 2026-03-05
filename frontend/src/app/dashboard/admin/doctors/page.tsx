'use client'

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';
import { getDoctorColumns } from './columns';
import { DataTable } from '@/components/ui/data-table';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UserDialog } from '../users/user-dialog';
import Link from 'next/link';

export default function DoctorsPage() {
    const [doctors, setDoctors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

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

    useEffect(() => {
        fetchDoctors();
    }, [fetchDoctors]);

    const handleEdit = (doctor: any) => {
        setSelectedDoctor(doctor);
        setDialogOpen(true);
    };

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

    const columns = getDoctorColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Medical Team</h1>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                        <Link href="/dashboard" className="hover:text-[#0EA5E9] transition-colors">Dashboard</Link>
                        <span>›</span>
                        <span>Medical Team</span>
                    </div>
                </div>
                <Button
                    onClick={() => { setSelectedDoctor(null); setDialogOpen(true); }}
                    className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold shadow-lg shadow-blue-500/20 px-6 rounded-xl transition-all active:scale-[0.98]"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Doctor
                </Button>
            </div>

            <DataTable
                columns={columns}
                data={doctors}
                loading={loading}
                onRefresh={fetchDoctors}
                searchPlaceholder="Search by name, email, or license..."
                itemLabel="doctors"
            />

            <UserDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                user={selectedDoctor}
                onSuccess={fetchDoctors}
            />
        </div>
    );
}
