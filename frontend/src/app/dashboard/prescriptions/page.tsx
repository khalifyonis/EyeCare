'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/axios';
import { toast } from 'sonner';

import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Package, AlertTriangle } from 'lucide-react';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import { ServerPagination } from '@/components/dashboard/server-pagination';

import { getPrescriptionColumns, type PrescriptionRow } from './columns';
import { readStoredUser, resolveRoleName } from '@/lib/auth';

type ClinicalExamForSelection = {
    id: string;
    diagnosis?: string | null;
    appointment?: {
        id: string;
        bookingNumber?: string | null;
        patient?: { id: string; fullName?: string | null } | null;
    } | null;
};

type InventoryItem = {
    id: string;
    itemName: string;
    itemType?: string | null;
    category?: string | null;
    brand?: string | null;
    stockQuantity: number;
    sellingPrice?: number | string | null;
};

const initialForm = {
    examId: '',
    itemType: 'PHARMACY',
    itemId: '',
    quantity: '1',
    instructions: '',
};

function getApiErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') return fallback;
    const maybe = error as { response?: { data?: { message?: unknown } } };
    const msg = maybe.response?.data?.message;
    return typeof msg === 'string' && msg.trim() ? msg : fallback;
}

export default function PrescriptionsPage() {
    const searchParams = useSearchParams();

    const [search, setSearch] = useState('');
    const [itemTypeFilter, setItemTypeFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
    const [sortBy, setSortBy] = useState('newest');

    const [rows, setRows] = useState<PrescriptionRow[]>([]);
    const [loading, setLoading] = useState(true);

    const [role, setRole] = useState('');
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<PrescriptionRow | null>(null);
    const [form, setForm] = useState(initialForm);
    const [prefillHandled, setPrefillHandled] = useState(false);

    const [clinicalExams, setClinicalExams] = useState<ClinicalExamForSelection[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [itemSearch, setItemSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [selectionKey, setSelectionKey] = useState(0);

    const canManage = useMemo(() => {
        return ['ADMIN', 'SUPERADMIN', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'].includes(role);
    }, [role]);

    useEffect(() => {
        setRole(resolveRoleName(readStoredUser()));
    }, []);

    const fetchRows = useCallback(async (searchTerm = '', itemType = 'all', date = '', pageNum = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.set('search', searchTerm);
            if (itemType !== 'all') params.set('itemType', itemType);
            if (date) params.set('date', date);
            params.set('page', String(pageNum));
            params.set('limit', String(pageSize));
            const res = await api.get(`/prescriptions?${params.toString()}`);
            const body = res.data as { data?: PrescriptionRow[]; total?: number; page?: number; totalPages?: number };
            setRows(Array.isArray(body?.data) ? body.data : []);
            setTotal(typeof body.total === 'number' ? body.total : 0);
            setPage(typeof body.page === 'number' ? body.page : 1);
            setTotalPages(typeof body.totalPages === 'number' ? body.totalPages : 1);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Failed to load prescriptions'));
        } finally {
            setLoading(false);
        }
    }, [pageSize]);

    const fetchClinicalExams = useCallback(async () => {
        try {
            const res = await api.get('/examinations/clinical?limit=500');
            const body = res.data as { data?: ClinicalExamForSelection[] };
            setClinicalExams(Array.isArray(body?.data) ? body.data : []);
        } catch {
            setClinicalExams([]);
        }
    }, []);

    const fetchInventoryItems = useCallback(async (type: string, searchTerm = '') => {
        try {
            const endpoint = type === 'OPTICAL' ? '/inventory/optical' : '/inventory/pharmacy';
            const params = new URLSearchParams();
            params.set('limit', '200');
            if (searchTerm) params.set('search', searchTerm);
            const res = await api.get(`${endpoint}?${params.toString()}`);
            const body = res.data as { data?: InventoryItem[] };
            setInventoryItems(Array.isArray(body?.data) ? body.data : []);
        } catch {
            setInventoryItems([]);
        }
    }, []);

    useEffect(() => {
        setPage(1);
    }, [search, itemTypeFilter, dateFilter]);

    useEffect(() => {
        const timer = setTimeout(() => fetchRows(search, itemTypeFilter, dateFilter, page), 300);
        return () => clearTimeout(timer);
    }, [search, itemTypeFilter, dateFilter, page, fetchRows]);

    useEffect(() => {
        fetchClinicalExams();
    }, [fetchClinicalExams]);

    useEffect(() => {
        if (open) {
            fetchInventoryItems(form.itemType, itemSearch);
        }
    }, [open, form.itemType, itemSearch, fetchInventoryItems]);

    const preselectedExamId = searchParams.get('examId') || '';
    useEffect(() => {
        if (!canManage || !preselectedExamId || prefillHandled) return;
        setEditing(null);
        setForm({ ...initialForm, examId: preselectedExamId });
        setOpen(true);
        setPrefillHandled(true);
    }, [canManage, preselectedExamId, prefillHandled]);

    const openCreate = useCallback(() => {
        setEditing(null);
        setForm({ ...initialForm, examId: preselectedExamId || '' });
        setItemSearch('');
        setOpen(true);
    }, [preselectedExamId]);

    const openEdit = useCallback((row: PrescriptionRow) => {
        setEditing(row);
        setForm({
            examId: row.examId,
            itemType: row.itemType || 'PHARMACY',
            itemId: row.itemId || '',
            quantity: String(row.quantity || 1),
            instructions: row.instructions || '',
        });
        setItemSearch('');
        setOpen(true);
    }, []);

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm('Delete this prescription? Stock will be restored if an item was linked.')) return;
        try {
            await api.delete(`/prescriptions/${id}`);
            toast.success('Prescription deleted');
            fetchRows(search, itemTypeFilter, dateFilter, page);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Delete failed'));
        }
    }, [fetchRows, search, itemTypeFilter, dateFilter, page]);

    const handleDeleteSelected = async (selected: PrescriptionRow[]) => {
        if (selected.length === 0) return;
        if (!confirm(`Delete ${selected.length} selected prescription(s)? This cannot be undone.`)) return;
        let done = 0;
        let failed = 0;
        for (const row of selected) {
            try {
                await api.delete(`/prescriptions/${row.id}`);
                done++;
            } catch {
                failed++;
            }
        }
        if (done) {
            toast.success(failed ? `Deleted ${done} prescription(s). ${failed} failed.` : `Deleted ${done} prescription(s).`);
            setSelectionKey((k) => k + 1);
            fetchRows(search, itemTypeFilter, dateFilter, page);
        }
        if (failed) {
            toast.error(`Failed to delete ${failed} prescription(s).`);
        }
    };

    const handleExportSelected = (selected: PrescriptionRow[]) => {
        if (selected.length === 0) return;
        const headers = ['Booking #', 'Patient', 'Item type', 'Item name', 'Quantity', 'Created at'];
        const escape = (v: string) => (v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
        const rowsCsv = selected.map((r) => {
            const booking = r.appointment?.bookingNumber || '';
            const patient = r.appointment?.patient?.fullName || '';
            const itemName = r._itemName || '';
            const created = r.createdAt || '';
            return [
                escape(booking),
                escape(patient),
                escape(r.itemType || ''),
                escape(itemName),
                String(r.quantity ?? ''),
                escape(created),
            ].join(',');
        });
        const csv = [headers.join(','), ...rowsCsv].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `prescriptions-selected-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${selected.length} item${selected.length === 1 ? '' : 's'}.`);
    };

    const handleSave = async () => {
        if (!form.examId) {
            toast.error('Please select a clinical examination');
            return;
        }

        const quantityNumber = Number(form.quantity || '0');
        if (!Number.isInteger(quantityNumber) || quantityNumber < 1) {
            toast.error('Quantity must be at least 1');
            return;
        }

        const payload = {
            ...(editing ? {} : { examId: form.examId }),
            ...(editing && form.examId !== editing.examId ? { examId: form.examId } : {}),
            itemType: form.itemType,
            itemId: form.itemId || null,
            quantity: quantityNumber,
            instructions: form.instructions || null,
        };

        setSaving(true);
        try {
            if (editing) {
                await api.put(`/prescriptions/${editing.id}`, payload);
                toast.success('Prescription updated');
            } else {
                await api.post('/prescriptions', payload);
                toast.success('Prescription created');
            }

            setOpen(false);
            setEditing(null);
            setForm(initialForm);
            fetchRows(search, itemTypeFilter, dateFilter, page);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Save failed'));
        } finally {
            setSaving(false);
        }
    };

    const filtered = useMemo(() => {
        const list = [...rows];
        list.sort((a, b) => {
            const aTime = new Date(a.createdAt).getTime();
            const bTime = new Date(b.createdAt).getTime();
            if (sortBy === 'newest') return bTime - aTime;
            if (sortBy === 'oldest') return aTime - bTime;
            if (sortBy === 'patient-asc') return (a.appointment?.patient?.fullName || '').localeCompare(b.appointment?.patient?.fullName || '');
            if (sortBy === 'patient-desc') return (b.appointment?.patient?.fullName || '').localeCompare(a.appointment?.patient?.fullName || '');
            return 0;
        });
        return list;
    }, [rows, sortBy]);

    const columns = useMemo(() => getPrescriptionColumns({
        canManage,
        onEdit: openEdit,
        onDelete: handleDelete,
    }), [canManage, openEdit, handleDelete]);

    const quickActions = [
        { id: 'delete', label: 'Delete selected', onClick: handleDeleteSelected, variant: 'destructive' as const },
        { id: 'download', label: 'Download selected', onClick: handleExportSelected, variant: 'default' as const },
    ];

    const editingExamLabel = useMemo(() => {
        if (!editing?.appointment?.patient) return '';
        const booking = editing.appointment?.bookingNumber || 'N/A';
        const patient = editing.appointment.patient.fullName || 'Unknown';
        return `${booking} - ${patient}`;
    }, [editing]);

    const selectedItem = useMemo(() => {
        if (!form.itemId) return null;
        return inventoryItems.find((i) => i.id === form.itemId) ?? null;
    }, [form.itemId, inventoryItems]);

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Prescriptions</h1>
                    <PageBreadcrumb current="Prescriptions" />
                </div>
                {canManage && (
                    <Button
                        onClick={openCreate}
                        className="h-10 rounded-lg bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold px-4"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Prescription
                    </Button>
                )}
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-3 sm:gap-4">
                <div className="relative w-full md:w-[260px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                        placeholder="Search prescriptions..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 w-full rounded-md border border-slate-200 bg-white text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-900"
                    />
                </div>
                <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
                    <SelectTrigger className="h-10 w-full md:w-[150px] rounded-md border border-slate-200 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                        <SelectItem value="OPTICAL">Optical</SelectItem>
                    </SelectContent>
                </Select>
                <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="h-10 w-full md:w-[150px] rounded-md border border-slate-200 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900"
                />
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-10 w-full md:w-[150px] rounded-md border border-slate-200 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                        <SelectItem value="patient-asc">Patient (A-Z)</SelectItem>
                        <SelectItem value="patient-desc">Patient (Z-A)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="min-w-0">
                <DataTable
                    columns={columns}
                    data={filtered}
                    loading={loading}
                    onRefresh={() => fetchRows(search, itemTypeFilter, dateFilter, page)}
                    itemLabel="prescriptions"
                    hideSearch
                    hidePagination
                    enableRowSelection
                    quickActions={quickActions}
                    selectionKey={selectionKey}
                    emptyMessage="No prescriptions yet"
                    emptyDescription="Click 'New Prescription' to write the first prescription from a clinical examination."
                />
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

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="w-[95vw] max-w-2xl rounded-2xl p-0 overflow-hidden flex flex-col max-h-[90vh] bg-background">
                    <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-slate-200 dark:border-slate-800">
                        <DialogTitle className="text-xl font-black">{editing ? 'Update Prescription' : 'Create Prescription'}</DialogTitle>
                        <DialogDescription>
                            {editing ? 'Edit prescription details.' : 'Create a prescription from a clinical examination.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="space-y-2 sm:col-span-2">
                                <label className="block mb-1 text-sm font-medium text-slate-800 dark:text-slate-100">Clinical examination</label>
                                {editing ? (
                                    <Input disabled value={editingExamLabel} />
                                ) : (
                                    <Select value={form.examId} onValueChange={(value) => setForm((prev) => ({ ...prev, examId: value }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select clinical examination" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clinicalExams.map((exam) => (
                                                <SelectItem key={exam.id} value={exam.id}>
                                                    {(exam.appointment?.bookingNumber || 'N/A') + ' — ' + (exam.appointment?.patient?.fullName || 'Unknown')}
                                                    {exam.diagnosis ? ` (${exam.diagnosis.slice(0, 40)})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            <div>
                                <label className="block mb-1 text-sm font-medium text-slate-800 dark:text-slate-100">Item type</label>
                                <Select
                                    value={form.itemType}
                                    onValueChange={(value) => {
                                        setForm((prev) => ({ ...prev, itemType: value, itemId: '' }));
                                        setItemSearch('');
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PHARMACY">Pharmacy (Medication)</SelectItem>
                                        <SelectItem value="OPTICAL">Optical (Eyewear / Lens)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="block mb-1 text-sm font-medium text-slate-800 dark:text-slate-100">Quantity</label>
                                <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={form.quantity}
                                    onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                                />
                            </div>

                            <div className="sm:col-span-2 space-y-2">
                                <label className="block mb-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                                    {form.itemType === 'PHARMACY' ? 'Select Medication' : 'Select Optical Item'}
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder={form.itemType === 'PHARMACY' ? 'Search medications...' : 'Search optical items...'}
                                        value={itemSearch}
                                        onChange={(e) => setItemSearch(e.target.value)}
                                        className="pl-9 h-10 rounded-lg text-sm"
                                    />
                                </div>
                                <div className="border rounded-lg max-h-48 overflow-y-auto bg-white dark:bg-slate-950">
                                    {inventoryItems.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-slate-400">
                                            No {form.itemType === 'PHARMACY' ? 'medications' : 'optical items'} found.
                                            Add items in Inventory first.
                                        </div>
                                    ) : (
                                        inventoryItems.map((item) => {
                                            const isSelected = form.itemId === item.id;
                                            const lowStock = Number(item.stockQuantity) <= 0;
                                            const price = typeof item.sellingPrice === 'number' ? item.sellingPrice : parseFloat(String(item.sellingPrice || '0'));
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setForm((prev) => ({ ...prev, itemId: isSelected ? '' : item.id }))}
                                                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 border-b last:border-b-0 transition-colors ${
                                                        isSelected
                                                            ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200'
                                                            : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                                                    } ${lowStock ? 'opacity-60' : ''}`}
                                                >
                                                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                                        isSelected ? 'bg-[#0EA5E9] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                    }`}>
                                                        <Package className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                                                            {item.itemName}
                                                            {item.itemType ? <span className="text-xs font-normal text-slate-400 ml-1">({item.itemType})</span> : ''}
                                                        </div>
                                                        <div className="text-xs text-slate-500 truncate">
                                                            {form.itemType === 'PHARMACY'
                                                                ? (item.category || 'Uncategorized')
                                                                : (item.brand || 'No brand')
                                                            }
                                                            {' · '}
                                                            ${price.toFixed(2)}
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className={`text-xs font-bold ${lowStock ? 'text-red-500' : 'text-emerald-600'}`}>
                                                            {item.stockQuantity} in stock
                                                        </div>
                                                        {lowStock && <AlertTriangle className="inline h-3 w-3 text-red-400" />}
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                                {selectedItem && (
                                    <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 text-sm">
                                        <span className="font-semibold text-blue-700 dark:text-blue-300">Selected: </span>
                                        <span className="text-blue-600 dark:text-blue-400">
                                            {selectedItem.itemName}
                                            {selectedItem.itemType ? ` (${selectedItem.itemType})` : ''}
                                            {' — '}
                                            {selectedItem.stockQuantity} in stock
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block mb-1 text-sm font-medium text-slate-800 dark:text-slate-100">Instructions</label>
                                <Textarea
                                    placeholder="e.g. Take 1 tablet twice daily after meals"
                                    value={form.instructions}
                                    onChange={(e) => setForm((prev) => ({ ...prev, instructions: e.target.value }))}
                                    className="min-h-[88px]"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
                        <Button variant="ghost" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white">
                            {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
