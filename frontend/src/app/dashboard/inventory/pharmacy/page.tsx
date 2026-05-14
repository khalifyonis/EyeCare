'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pill, Package, Search, AlertTriangle, Ban, CalendarDays, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataTable } from '@/components/ui/data-table';
import { getPharmacyColumns, type PharmacyRow } from './columns';
import { PharmacyItemDialog } from './pharmacy-item-dialog';
import { ReceiveStockDialog } from '../receive-stock-dialog';
import { TransactionHistoryDialog } from '../transaction-history-dialog';
import { AdjustStockDialog } from '../adjust-stock-dialog';
import { toast } from 'sonner';
import { StatsCard } from '@/components/dashboard/stats-card';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import { ServerPagination } from '@/components/dashboard/server-pagination';

import { PharmacyTabs } from '../../_components/pharmacy-tabs';
import { PharmacyKpiCard } from '../../_components/pharmacy-kpi-card';

type PharmacyStats = { 
    total: number; 
    lowStock: number;
    outOfStock: number;
    expiringSoon: number;
};

export default function PharmacyInventoryPage() {
    const [rows, setRows] = useState<PharmacyRow[]>([]);
    const [stats, setStats] = useState<PharmacyStats>({ total: 0, lowStock: 0, outOfStock: 0, expiringSoon: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<PharmacyRow | null>(null);
    const [selectionKey, setSelectionKey] = useState(0);
    const [receiveOpen, setReceiveOpen] = useState(false);
    const [receivingItem, setReceivingItem] = useState<PharmacyRow | null>(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyItem, setHistoryItem] = useState<PharmacyRow | null>(null);
    const [adjustOpen, setAdjustOpen] = useState(false);
    const [adjustingItem, setAdjustingItem] = useState<PharmacyRow | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get('/inventory/pharmacy/stats');
            setStats(res.data as PharmacyStats);
        } catch {
            toast.error('Failed to load pharmacy stats');
        }
    }, []);

    const fetchRows = useCallback(
        async (searchTerm = '', category = '', pageNum = 1) => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (searchTerm) params.set('search', searchTerm);
                if (category) params.set('category', category);
                params.set('page', String(pageNum));
                params.set('limit', String(pageSize));
                const res = await api.get(`/inventory/pharmacy?${params.toString()}`);
                const body = res.data as {
                    data?: PharmacyRow[];
                    total?: number;
                    page?: number;
                    totalPages?: number;
                };
                setRows(Array.isArray(body?.data) ? body.data : []);
                setTotal(typeof body.total === 'number' ? body.total : 0);
                setPage(typeof body.page === 'number' ? body.page : 1);
                setTotalPages(typeof body.totalPages === 'number' ? body.totalPages : 1);
            } catch {
                toast.error('Failed to load pharmacy inventory');
            } finally {
                setLoading(false);
            }
        },
        [pageSize]
    );

    useEffect(() => {
        setPage(1);
    }, [search, categoryFilter]);

    useEffect(() => {
        const timer = setTimeout(() => fetchRows(search, categoryFilter, page), 300);
        return () => clearTimeout(timer);
    }, [search, categoryFilter, page, fetchRows]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleEdit = (row: PharmacyRow) => {
        setEditingItem(row);
        setDialogOpen(true);
    };

    const handleReceive = (row: PharmacyRow) => {
        setReceivingItem(row);
        setReceiveOpen(true);
    };

    const handleHistory = (row: PharmacyRow) => {
        setHistoryItem(row);
        setHistoryOpen(true);
    };

    const handleAdjust = (row: PharmacyRow) => {
        setAdjustingItem(row);
        setAdjustOpen(true);
    };

    const handleDelete = useCallback(
        async (id: string) => {
            if (!confirm('Delete this pharmacy item?')) return;
            try {
                await api.delete(`/inventory/pharmacy/${id}`);
                toast.success('Item deleted');
                fetchRows(search, categoryFilter, page);
                fetchStats();
            } catch {
                toast.error('Delete failed');
            }
        },
        [search, categoryFilter, page, fetchRows, fetchStats]
    );

    const handleDeleteSelected = async (selected: PharmacyRow[]) => {
        if (selected.length === 0) return;
        if (!confirm(`Delete ${selected.length} selected pharmacy item(s)? This cannot be undone.`)) return;
        let done = 0;
        let failed = 0;
        for (const row of selected) {
            try {
                await api.delete(`/inventory/pharmacy/${row.id}`);
                done++;
            } catch {
                failed++;
            }
        }
        if (done) {
            toast.success(failed ? `Deleted ${done} item(s). ${failed} failed.` : `Deleted ${done} item(s).`);
            setSelectionKey((k) => k + 1);
            fetchRows(search, categoryFilter, page);
            fetchStats();
        }
        if (failed) {
            toast.error(`Failed to delete ${failed} item(s).`);
        }
    };

    const handleExportSelected = (selected: PharmacyRow[]) => {
        if (selected.length === 0) return;
        const headers = ['Item name', 'Category', 'Type', 'Stock', 'Reorder level', 'Selling price'];
        const escape = (v: string) => (v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
        const rowsCsv = selected.map((r) => {
            const selling =
                typeof r.sellingPrice === 'number'
                    ? r.sellingPrice.toFixed(2)
                    : String(r.sellingPrice || '');
            return [
                escape(r.itemName || ''),
                escape(r.category || ''),
                escape(r.itemType || ''),
                String(r.stockQuantity ?? ''),
                String(r.reorderLevel ?? ''),
                escape(selling),
            ].join(',');
        });
        const csv = [headers.join(','), ...rowsCsv].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pharmacy-items-selected-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${selected.length} item${selected.length === 1 ? '' : 's'}.`);
    };

    const columns = useMemo(
        () =>
            getPharmacyColumns({
                onEdit: handleEdit,
                onDelete: handleDelete,
                onReceive: handleReceive,
                onHistory: handleHistory,
                onAdjust: handleAdjust,
            }),
        [handleDelete]
    );

    const refresh = () => {
        fetchRows(search, categoryFilter, page);
        fetchStats();
    };

    const quickActions = [
        { id: 'delete', label: 'Delete selected', onClick: handleDeleteSelected, variant: 'destructive' as const },
        { id: 'download', label: 'Download selected', onClick: handleExportSelected, variant: 'default' as const },
    ];

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-4 min-h-screen bg-slate-50/50 dark:bg-slate-950">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                        Pharmacy Inventory
                    </h1>
                    <PageBreadcrumb current="Pharmacy Inventory" />
                </div>
                <Button
                    onClick={() => {
                        setEditingItem(null);
                        setDialogOpen(true);
                    }}
                    className="h-10 rounded-lg bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold px-4"
                >
                    <Pill className="w-4 h-4 mr-2" />
                    Add item
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <PharmacyKpiCard
                    title="Total Items"
                    value={stats.total.toLocaleString()}
                    icon={Package}
                    tone="indigo"
                />
                <PharmacyKpiCard
                    title="Low Stock"
                    value={stats.lowStock.toLocaleString()}
                    icon={AlertTriangle}
                    tone="orange"
                />
                <PharmacyKpiCard
                    title="Out of Stock"
                    value={stats.outOfStock.toLocaleString()}
                    icon={Ban}
                    tone="red"
                />
                <PharmacyKpiCard
                    title="Expiring Soon"
                    value={stats.expiringSoon.toLocaleString()}
                    icon={CalendarDays}
                    tone="amber"
                />
            </div>

            <PharmacyTabs />

            <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 flex-1">
                        <div className="relative w-full md:w-[260px]">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            <Input
                                placeholder="Search inventory..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 h-10 bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-1 focus-visible:ring-[#0EA5E9]"
                            />
                        </div>
                        <Input
                            placeholder="Category filter..."
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="h-10 w-full md:w-[160px] bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-1 focus-visible:ring-[#0EA5E9]"
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-800"
                        onClick={refresh}
                        disabled={loading}
                    >
                        <RefreshCcw className={cn("h-4 w-4 text-slate-500", loading && "animate-spin")} />
                    </Button>
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
                        quickActions={quickActions}
                        selectionKey={selectionKey}
                        emptyMessage="No pharmacy items yet"
                        emptyDescription="Click 'Add item' to add your first medication to the inventory."
                    />
                    <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                        <ServerPagination
                            page={page}
                            limit={pageSize}
                            total={total}
                            totalPages={totalPages}
                            onPageChange={setPage}
                            onLimitChange={(limit) => { setPageSize(limit); setPage(1); }}
                            disabled={loading}
                        />
                    </div>
                </div>
            </div>

            <PharmacyItemDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                item={editingItem}
                onSuccess={refresh}
            />

            <ReceiveStockDialog
                open={receiveOpen}
                onOpenChange={setReceiveOpen}
                itemId={receivingItem?.id ?? null}
                itemName={receivingItem?.itemName ?? ''}
                inventoryType="pharmacy"
                currentStock={receivingItem?.stockQuantity}
                purchasePrice={receivingItem?.purchasePrice}
                onSuccess={refresh}
            />

            <TransactionHistoryDialog
                open={historyOpen}
                onOpenChange={setHistoryOpen}
                itemId={historyItem?.id ?? null}
                itemName={historyItem?.itemName ?? ''}
                inventoryType="pharmacy"
            />

            <AdjustStockDialog
                open={adjustOpen}
                onOpenChange={setAdjustOpen}
                itemId={adjustingItem?.id ?? null}
                itemName={adjustingItem?.itemName ?? ''}
                inventoryType="pharmacy"
                currentStock={adjustingItem?.stockQuantity}
                purchasePrice={adjustingItem?.purchasePrice}
                onSuccess={refresh}
            />
        </div>
    );
}
