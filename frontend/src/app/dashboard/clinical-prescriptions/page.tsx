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

export default function ClinicalPrescriptionsPage() {
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

    const canManage = useMemo(() => {
        return ['ADMIN', 'SUPERADMIN', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'].includes(role);
    }, [role]);

    useEffect(() => {
        setRole(resolveRoleName(readStoredUser()));
    }, []);

    const fetchRows = useCallback(async (searchTerm = '', itemType = 'all', date = '') => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (itemType !== 'all') params.append('itemType', itemType);
            if (date) params.append('date', date);

            const suffix = params.toString() ? `?${params.toString()}` : '';
            const res = await api.get(`/clinical-prescriptions${suffix}`);
            setRows(res.data as PrescriptionRow[]);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Failed to load prescriptions'));
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchClinicalExams = useCallback(async () => {
        try {
            const res = await api.get('/examinations/clinical');
            setClinicalExams((res.data || []) as ClinicalExamForSelection[]);
        } catch {
            setClinicalExams([]);
        }
    }, []);

    useEffect(() => {
        fetchRows('', 'all', '');
    }, [fetchRows]);

    useEffect(() => {
        fetchClinicalExams();
    }, [fetchClinicalExams]);

    useEffect(() => {
        const timer = setTimeout(() => fetchRows(search, itemTypeFilter, dateFilter), 300);
        return () => clearTimeout(timer);
    }, [search, itemTypeFilter, dateFilter, fetchRows]);

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
            await api.delete(`/clinical-prescriptions/${id}`);
            toast.success('Prescription deleted');
            fetchRows(search, itemTypeFilter, dateFilter);
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
                await api.put(`/clinical-prescriptions/${editing.id}`, payload);
                toast.success('Prescription updated');
            } else {
                await api.post('/clinical-prescriptions', payload);
                toast.success('Prescription created');
            }

            setOpen(false);
            setEditing(null);
            setForm(initialForm);
            fetchRows(search, itemTypeFilter, dateFilter);
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
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Clinical Prescriptions</h1>
                    <PageBreadcrumb current="Clinical Prescriptions" />
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
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="PHARMACY">PHARMACY</SelectItem>
                            <SelectItem value="OPTICAL">OPTICAL</SelectItem>
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
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Sort</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="h-10 rounded-lg border-slate-200 dark:border-slate-800 text-sm">
                            <SelectValue placeholder="Newest" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest</SelectItem>
                            <SelectItem value="oldest">Oldest</SelectItem>
                            <SelectItem value="patient-asc">Patient A-Z</SelectItem>
                            <SelectItem value="patient-desc">Patient Z-A</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={filtered}
                loading={loading}
                searchPlaceholder="Search..."
                hideSearch
                itemLabel="prescriptions"
            />

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Prescription' : 'New Prescription'}</DialogTitle>
                        <DialogDescription>
                            {editing ? 'Update prescription details.' : 'Create a new prescription linked to a clinical examination.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold uppercase text-slate-500">Clinical Exam</label>
                            <Select
                                value={form.examId}
                                onValueChange={(v) => setForm((p) => ({ ...p, examId: v }))}
                                disabled={!!editing && !!editingExamLabel}
                            >
                                <SelectTrigger className="mt-1 h-10 rounded-lg border-slate-200 text-sm">
                                    <SelectValue placeholder={editingExamLabel || 'Select clinical exam'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {clinicalExams.map((ex) => {
                                        const booking = ex.appointment?.bookingNumber || 'N/A';
                                        const patient = ex.appointment?.patient?.fullName || 'Unknown';
                                        return (
                                            <SelectItem key={ex.id} value={ex.id}>
                                                {booking} - {patient}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold uppercase text-slate-500">Item Type</label>
                                <Select value={form.itemType} onValueChange={(v) => setForm((p) => ({ ...p, itemType: v }))}>
                                    <SelectTrigger className="mt-1 h-10 rounded-lg border-slate-200 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PHARMACY">PHARMACY</SelectItem>
                                        <SelectItem value="OPTICAL">OPTICAL</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase text-slate-500">Item ID</label>
                                <Input
                                    value={form.itemId}
                                    onChange={(e) => setForm((p) => ({ ...p, itemId: e.target.value }))}
                                    className="mt-1 h-10 rounded-lg border-slate-200 text-sm"
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold uppercase text-slate-500">Quantity</label>
                            <Input
                                value={form.quantity}
                                onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                                className="mt-1 h-10 rounded-lg border-slate-200 text-sm"
                                inputMode="numeric"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold uppercase text-slate-500">Instructions</label>
                            <Textarea
                                value={form.instructions}
                                onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
                                className="mt-1 rounded-lg border-slate-200 text-sm"
                                placeholder="Optional"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={handleSave} disabled={!canManage || saving}>
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
