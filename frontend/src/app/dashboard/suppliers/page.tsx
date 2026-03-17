'use client';
import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/axios';
import { DataTable } from '@/components/ui/data-table';
import { getSupplierColumns, type Supplier } from './columns';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { SupplierDialog } from './supplier-dialog';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [search, setSearch] = useState('');

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/suppliers?limit=1000');
            const body = res.data as { data?: Supplier[]; suppliers?: Supplier[] };
            const list = Array.isArray(body?.data) ? body.data : Array.isArray(body?.suppliers) ? body.suppliers : [];
            setSuppliers(list);
        } catch {
            toast.error('Failed to load suppliers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSuppliers(); }, []);

    const filtered = useMemo(() => {
        if (!search.trim()) return suppliers;
        const q = search.toLowerCase();
        return suppliers.filter(s =>
            s.name?.toLowerCase().includes(q) ||
            s.phone?.toLowerCase().includes(q) ||
            s.email?.toLowerCase().includes(q) ||
            s.address?.toLowerCase().includes(q)
        );
    }, [suppliers, search]);

    const handleEdit = (s: Supplier) => { setEditingSupplier(s); setIsDialogOpen(true); };
    const handleDelete = async (id: string) => {
        if (!confirm('Delete this supplier?')) return;
        try {
            await api.delete('/suppliers/' + id);
            toast.success('Supplier deleted');
            fetchSuppliers();
        } catch { toast.error('Delete failed'); }
    };

    const columns = useMemo(() => getSupplierColumns({ onEdit: handleEdit, onDelete: handleDelete }), []);

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Suppliers</h1>
                    <PageBreadcrumb current="Suppliers" />
                </div>
                <Button
                    onClick={() => { setEditingSupplier(null); setIsDialogOpen(true); }}
                    className="h-10 rounded-lg bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold px-4"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Supplier
                </Button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="relative w-full md:w-[280px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                        placeholder="Search suppliers..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 w-full rounded-md border border-slate-200 bg-white text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-900"
                    />
                </div>
            </div>

            <div className="min-w-0">
                <DataTable
                    columns={columns}
                    data={filtered}
                    loading={loading}
                    onRefresh={fetchSuppliers}
                    itemLabel="suppliers"
                    hideSearch
                    enableRowSelection
                />
            </div>

            <SupplierDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                supplier={editingSupplier}
                onSuccess={fetchSuppliers}
            />
        </div>
    );
}
