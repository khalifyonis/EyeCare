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
import { Plus, Search } from 'lucide-react';
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
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 20;

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
    }, []);

    const fetchClinicalExams = useCallback(async () => {
        try {
            const res = await api.get('/examinations/clinical?limit=500');
            const body = res.data as { data?: ClinicalExamForSelection[] };
            setClinicalExams(Array.isArray(body?.data) ? body.data : []);
        } catch {
            setClinicalExams([]);
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
        setOpen(true);
    }, []);

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm('Delete this prescription?')) return;
        try {
            await api.delete(`/prescriptions/${id}`);
            toast.success('Prescription deleted');
            fetchRows(search, itemTypeFilter, dateFilter, page);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Delete failed'));
        }
    }, [fetchRows, search, itemTypeFilter, dateFilter]);

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

    const editingExamLabel = useMemo(() => {
        if (!editing?.appointment?.patient) return '';
        const booking = editing.appointment?.bookingNumber || 'N/A';
        const patient = editing.appointment.patient.fullName || 'Unknown';
        return `${booking} - ${patient}`;
    }, [editing]);

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Prescriptions</h1>
                    <PageBreadcrumb current="Prescriptions" />
                </div>
                {canManage && (
                    <Button
                        onClick={openCreate}
                        className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold shadow-lg shadow-blue-500/20 px-6 rounded-xl transition-all active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Prescription
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by patient, booking, instructions..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-10 rounded-lg border-slate-200 dark:border-slate-800 text-sm"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Type</label>
                    <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
                        <SelectTrigger className="h-10 rounded-lg border-slate-200 dark:border-slate-800 text-sm">
                            <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                            <SelectItem value="OPTICAL">Optical</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Date</label>
                    <Input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="h-10 rounded-lg border-slate-200 dark:border-slate-800 text-sm"
                    />
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
                            <SelectItem value="patient-asc">Patient (A-Z)</SelectItem>
                            <SelectItem value="patient-desc">Patient (Z-A)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto min-w-0">
                <DataTable
                    columns={columns}
                    data={filtered}
                    loading={loading}
                    onRefresh={() => fetchRows(search, itemTypeFilter, dateFilter, page)}
                    itemLabel="prescriptions"
                    hideSearch
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

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="w-[95vw] max-w-2xl rounded-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                    <DialogHeader className="p-4 sm:p-5 pb-3 border-b">
                        <DialogTitle className="text-xl font-black">{editing ? 'Update Prescription' : 'Create Prescription'}</DialogTitle>
                        <DialogDescription>
                            {editing ? 'Edit prescription details.' : 'Create a prescription from a clinical examination.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="space-y-2 sm:col-span-2">
                                <label className="text-xs font-medium text-slate-500">Clinical Examination</label>
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
                                                    {(exam.appointment?.bookingNumber || 'N/A') + ' - ' + (exam.appointment?.patient?.fullName || 'Unknown')}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Item Type</label>
                                <Select value={form.itemType} onValueChange={(value) => setForm((prev) => ({ ...prev, itemType: value }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                                        <SelectItem value="OPTICAL">Optical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Quantity</label>
                                <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={form.quantity}
                                    onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Item ID (Optional)</label>
                                <Input
                                    placeholder="e.g. stock item id"
                                    value={form.itemId}
                                    onChange={(e) => setForm((prev) => ({ ...prev, itemId: e.target.value }))}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Instructions</label>
                                <Textarea
                                    placeholder="Usage instructions"
                                    value={form.instructions}
                                    onChange={(e) => setForm((prev) => ({ ...prev, instructions: e.target.value }))}
                                    className="min-h-[88px]"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-4 sm:p-5 border-t bg-slate-50/50">
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
