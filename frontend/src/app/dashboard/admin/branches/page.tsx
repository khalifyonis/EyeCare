'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/axios';
import { DataTable } from '@/components/ui/data-table';
import { getBranchColumns, type Branch } from './columns';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BranchDialog } from './branch-dialog';
import Link from 'next/link';

export default function BranchesPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

    const fetchBranches = async () => {
        setLoading(true);
        try {
            const response = await api.get('/branches');
            setBranches(response.data);
        } catch (error) {
            toast.error('Failed to load branches');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBranches(); }, []);

    const handleEdit = (branch: Branch) => {
        setEditingBranch(branch);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.delete(`/branches/${id}`);
            toast.success('Branch deleted');
            fetchBranches();
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    const columns = useMemo(() => getBranchColumns({
        onEdit: handleEdit,
        onDelete: handleDelete
    }), []);

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Clinical Branches</h1>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                        <Link href="/dashboard" className="hover:text-[#0EA5E9] transition-colors">Dashboard</Link>
                        <span>›</span>
                        <span>Clinical Branches</span>
                    </div>
                </div>
                <Button onClick={() => { setEditingBranch(null); setIsDialogOpen(true); }} className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold shadow-lg shadow-blue-500/20 px-6 rounded-xl transition-all active:scale-[0.98]">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Branch
                </Button>
            </div>

            <DataTable
                columns={columns}
                data={branches}
                loading={loading}
                onRefresh={fetchBranches}
                searchPlaceholder="Search by name, address or phone..."
                itemLabel="branches"
            />

            <BranchDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                branch={editingBranch}
                onSuccess={fetchBranches}
            />
        </div>
    );
}
