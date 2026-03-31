'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/axios';
import { DataTable } from '@/components/ui/data-table';
import { getBranchColumns, type Branch } from './columns';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { BranchDialog } from './branch-dialog';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

export default function BranchesPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name-asc');

    const fetchBranches = async () => {
        setLoading(true);
        try {
            const response = await api.get('/branches?limit=1000');
            const body = response.data as { data?: Branch[]; total?: number };
            setBranches(Array.isArray(body?.data) ? body.data : []);
        } catch (error) {
            toast.error('Failed to load branches');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBranches(); }, []);

    const filtered = useMemo(() => {
        let list = [...branches];
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(b =>
                b.branchName?.toLowerCase().includes(q) ||
                b.address?.toLowerCase().includes(q) ||
                b.phone?.toLowerCase().includes(q)
            );
        }
        if (statusFilter !== 'all') {
            list = list.filter(b => statusFilter === 'active' ? b.isActive !== false : b.isActive === false);
        }
        list.sort((a, b) => {
            if (sortBy === 'name-asc') return (a.branchName || '').localeCompare(b.branchName || '');
            if (sortBy === 'name-desc') return (b.branchName || '').localeCompare(a.branchName || '');
            return 0;
        });
        return list;
    }, [branches, search, statusFilter, sortBy]);

    const handleEdit = (branch: Branch) => { setEditingBranch(branch); setIsDialogOpen(true); };
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.delete(`/branches/${id}`);
            toast.success('Branch deleted');
            fetchBranches();
        } catch (error) { toast.error('Delete failed'); }
    };

    const columns = useMemo(() => getBranchColumns({ onEdit: handleEdit, onDelete: handleDelete }), []);

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Branches</h1>
                    <PageBreadcrumb current="Branches" />
                </div>
                <Button onClick={() => { setEditingBranch(null); setIsDialogOpen(true); }} className="h-10 rounded-lg bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold px-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Branch
                </Button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-3 sm:gap-4">
                <div className="relative w-full md:w-[260px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                        placeholder="Search branches..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-[#0EA5E9]"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-10 w-full md:w-[150px] rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-sm shadow-sm focus:ring-[#0EA5E9]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-10 w-full md:w-[150px] rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-sm shadow-sm focus:ring-[#0EA5E9]">
                        <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                        <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="min-w-0">
                <DataTable
                    columns={columns}
                    data={filtered}
                    loading={loading}
                    onRefresh={fetchBranches}
                    itemLabel="branches"
                    hideSearch
                    enableRowSelection
                />
            </div>

            <BranchDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} branch={editingBranch} onSuccess={fetchBranches} />
        </div>
    );
}
