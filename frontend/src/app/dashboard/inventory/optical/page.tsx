'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Glasses, Package, Search, AlertTriangle } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { getOpticalColumns, type OpticalRow } from './columns';
import { OpticalItemDialog } from './optical-item-dialog';
import { toast } from 'sonner';
import { StatsCard } from '@/components/dashboard/stats-card';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import { ServerPagination } from '@/components/dashboard/server-pagination';

type OpticalStats = { total: number; lowStock: number };

export default function OpticalInventoryPage() {
    const [rows, setRows] = useState<OpticalRow[]>([]);
    const [stats, setStats] = useState<OpticalStats>({ total: 0, lowStock: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [itemTypeFilter, setItemTypeFilter] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 20;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<OpticalRow | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get('/inventory/optical/stats');
            setStats(res.data as OpticalStats);
        } catch {
            toast.error('Failed to load optical stats');
        }
    }, []);

    const fetchRows = useCallback(
        async (searchTerm = '', itemType = '', pageNum = 1) => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (searchTerm) params.set('search', searchTerm);
                if (itemType) params.set('itemType', itemType);
                params.set('page', String(pageNum));
                params.set('limit', String(pageSize));
                const res = await api.get(`/inventory/optical?${params.toString()}`);
                const body = res.data as {
                    data?: OpticalRow[];
                    total?: number;
                    page?: number;
                    totalPages?: number;
                };
                setRows(Array.isArray(body?.data) ? body.data : []);
                setTotal(typeof body.total === 'number' ? body.total : 0);
                setPage(typeof body.page === 'number' ? body.page : 1);
                setTotalPages(typeof body.totalPages === 'number' ? body.totalPages : 1);
            } catch {
                toast.error('Failed to load optical inventory');
            } finally {
                setLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        setPage(1);
    }, [search, itemTypeFilter]);

    useEffect(() => {
        const timer = setTimeout(() => fetchRows(search, itemTypeFilter, page), 300);
        return () => clearTimeout(timer);
    }, [search, itemTypeFilter, page, fetchRows]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleEdit = (row: OpticalRow) => {
        setEditingItem(row);
        setDialogOpen(true);
    };

    const handleDelete = useCallback(
        async (id: string) => {
            if (!confirm('Delete this optical item?')) return;
            try {
                await api.delete(`/inventory/optical/${id}`);
                toast.success('Item deleted');
                fetchRows(search, itemTypeFilter, page);
                fetchStats();
            } catch {
                toast.error('Delete failed');
            }
        },
        [search, itemTypeFilter, page, fetchRows, fetchStats]
    );

    const columns = useMemo(
        () =>
            getOpticalColumns({
                onEdit: handleEdit,
                onDelete: handleDelete,
            }),
        [handleDelete]
    );

    const refresh = () => {
        fetchRows(search, itemTypeFilter, page);
        fetchStats();
    };

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Optical Inventory
                    </h1>
                    <PageBreadcrumb current="Optical Inventory" />
                </div>
                <Button
                    onClick={() => {
                        setEditingItem(null);
                        setDialogOpen(true);
                    }}
                    className="h-10 rounded-lg bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold px-4"
                >
                    <Glasses className="w-4 h-4 mr-2" />
                    Add item
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
                <StatsCard
                    title="Total items"
                    value={stats.total.toLocaleString()}
                    icon={Package}
                    color="blue"
                />
                <StatsCard
                    title="Low stock"
                    value={stats.lowStock.toLocaleString()}
                    icon={AlertTriangle}
                    color="amber"
                />
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-3 sm:gap-4">
                <div className="relative w-full md:w-[260px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                        placeholder="Search optical..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 w-full rounded-md border border-slate-200 bg-white text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-900"
                    />
                </div>
                <Input
                    placeholder="Type"
                    value={itemTypeFilter}
                    onChange={(e) => setItemTypeFilter(e.target.value)}
                    className="h-10 w-full md:w-[150px] rounded-md border border-slate-200 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900"
                />
            </div>

            <div className="min-w-0">
                <DataTable
                    columns={columns}
                    data={rows}
                    loading={loading}
                    onRefresh={refresh}
                    itemLabel="items"
                    hideSearch
                    hidePagination
                    enableRowSelection
                    emptyMessage="No optical items yet"
                    emptyDescription="Click 'Add item' to add your first eyewear or lens to the inventory."
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

            <OpticalItemDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                item={editingItem}
                onSuccess={refresh}
            />
        </div>
    );
}
