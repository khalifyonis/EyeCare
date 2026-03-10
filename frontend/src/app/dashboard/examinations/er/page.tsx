'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';

import api from '@/lib/axios';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import { ServerPagination } from '@/components/dashboard/server-pagination';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { readStoredUser, resolveRoleName } from '@/lib/auth';

import { getERExaminationColumns, type ERExaminationRow } from './columns';

const toNumberOrUndefined = (value: string) => (value === '' ? undefined : Number(value));

const initialForm = {
    appointmentId: '',
    vaRight: '',
    vaLeft: '',
    phRight: '',
    phLeft: '',
    iopRight: '',
    iopLeft: '',
    notes: '',
};

type AppointmentForSelection = {
    id: string;
    bookingNumber?: string | null;
    patient?: { id: string; fullName?: string | null } | null;
    erExamination?: { id: string } | null;
};

function getApiErrorMessage(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null) return undefined;
    const maybe = error as { response?: { data?: { message?: unknown } } };
    const message = maybe.response?.data?.message;
    return typeof message === 'string' ? message : undefined;
}

export default function ERExaminationsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [rows, setRows] = useState<ERExaminationRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 20;

    const [role, setRole] = useState('');
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<ERExaminationRow | null>(null);
    const [form, setForm] = useState(initialForm);
    const [prefillHandled, setPrefillHandled] = useState(false);

    const [appointments, setAppointments] = useState<AppointmentForSelection[]>([]);

    const canManage = useMemo(() => ['ADMIN', 'SUPERADMIN', 'DOCTOR', 'RECEPTIONIST'].includes(role), [role]);
    const canRecordClinical = useMemo(() => ['ADMIN', 'SUPERADMIN', 'DOCTOR'].includes(role), [role]);

    useEffect(() => {
        setRole(resolveRoleName(readStoredUser()));
    }, []);

    const fetchRows = useCallback(async (searchTerm = '', status = 'all', date = '', pageNum = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.set('search', searchTerm);
            if (status !== 'all') params.set('appointmentStatus', status);
            if (date) params.set('date', date);
            params.set('page', String(pageNum));
            params.set('limit', String(pageSize));
            const res = await api.get(`/examinations/er?${params.toString()}`);
            const body = res.data as { data?: ERExaminationRow[]; total?: number; page?: number; totalPages?: number };
            setRows(Array.isArray(body?.data) ? body.data : []);
            setTotal(typeof body.total === 'number' ? body.total : 0);
            setTotalPages(typeof body.totalPages === 'number' ? body.totalPages : 1);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error) || 'Failed to load ER examinations');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAppointments = useCallback(async () => {
        try {
            const res = await api.get('/examinations?appointmentStatus=PENDING');
            setAppointments(res.data as AppointmentForSelection[]);
        } catch {
            setAppointments([]);
        }
    }, []);

    useEffect(() => {
        setPage(1);
    }, [search, statusFilter, dateFilter]);

    useEffect(() => {
        const timer = setTimeout(() => fetchRows(search, statusFilter, dateFilter, page), 300);
        return () => clearTimeout(timer);
    }, [search, statusFilter, dateFilter, page, fetchRows]);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    const preselectedAppointmentId = searchParams.get('appointmentId') || '';
    useEffect(() => {
        if (!canManage || !preselectedAppointmentId || prefillHandled) return;
        setEditing(null);
        setForm({ ...initialForm, appointmentId: preselectedAppointmentId });
        setOpen(true);
        setPrefillHandled(true);
    }, [canManage, preselectedAppointmentId, prefillHandled]);

    const selectableAppointments = useMemo(() => {
        return appointments.filter((appointment) => {
            if (editing && appointment.id === editing.appointmentId) return true;
            return !appointment.erExamination;
        });
    }, [appointments, editing]);

    const openCreate = useCallback(() => {
        setEditing(null);
        setForm({ ...initialForm, appointmentId: preselectedAppointmentId || '' });
        setOpen(true);
    }, [preselectedAppointmentId]);

    const openEdit = useCallback((row: ERExaminationRow) => {
        setEditing(row);
        setForm({
            appointmentId: row.appointmentId,
            vaRight: row.vaRight ?? '',
            vaLeft: row.vaLeft ?? '',
            phRight: row.phRight ?? '',
            phLeft: row.phLeft ?? '',
            iopRight: row.iopRight != null ? String(row.iopRight) : '',
            iopLeft: row.iopLeft != null ? String(row.iopLeft) : '',
            notes: row.notes ?? '',
        });
        setOpen(true);
    }, []);

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm('Delete this ER examination?')) return;
        try {
            await api.delete(`/examinations/er/${id}`);
            toast.success('ER examination deleted');
            fetchRows(search, statusFilter, dateFilter, page);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error) || 'Delete failed');
        }
    }, [fetchRows, search, statusFilter, dateFilter, page]);

    const handleSave = async () => {
        if (!editing && !form.appointmentId) {
            toast.error('Please select an appointment');
            return;
        }

        const payload = {
            ...(editing ? {} : { appointmentId: form.appointmentId }),
            vaRight: form.vaRight || null,
            vaLeft: form.vaLeft || null,
            phRight: form.phRight || null,
            phLeft: form.phLeft || null,
            iopRight: toNumberOrUndefined(form.iopRight),
            iopLeft: toNumberOrUndefined(form.iopLeft),
            notes: form.notes || null,
        };

        setSaving(true);
        try {
            if (editing) {
                await api.put(`/examinations/er/${editing.id}`, payload);
                toast.success('ER examination updated');
            } else {
                await api.post('/examinations/er', payload);
                toast.success('ER examination created');
            }
            setOpen(false);
            setEditing(null);
            setForm(initialForm);
            fetchRows(search, statusFilter, dateFilter);
            fetchAppointments();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error) || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const openClinicalForAppointment = useCallback((appointmentId: string) => {
        const id = (appointmentId || '').trim();
        if (!id) return;
        router.push(`/dashboard/examinations/clinical?appointmentId=${id}`);
    }, [router]);

    const filtered = useMemo(() => {
        const list = [...rows];
        list.sort((a, b) => {
            const aTime = new Date(a.createdAt).getTime();
            const bTime = new Date(b.createdAt).getTime();
            if (sortBy === 'newest') return bTime - aTime;
            if (sortBy === 'oldest') return aTime - bTime;
            if (sortBy === 'patient-asc') {
                return (a.appointment?.patient?.fullName || '').localeCompare(b.appointment?.patient?.fullName || '');
            }
            if (sortBy === 'patient-desc') {
                return (b.appointment?.patient?.fullName || '').localeCompare(a.appointment?.patient?.fullName || '');
            }
            return 0;
        });
        return list;
    }, [rows, sortBy]);

    const columns = useMemo(() => {
        return getERExaminationColumns({
            canManage,
            canOpenClinical: canRecordClinical,
            onOpenClinical: openClinicalForAppointment,
            onEdit: openEdit,
            onDelete: handleDelete,
        });
    }, [canManage, canRecordClinical, openClinicalForAppointment, openEdit, handleDelete]);

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">ER Examinations</h1>
                    <PageBreadcrumb current="ER Examinations" />
                </div>
                {canManage && (
                    <Button
                        onClick={openCreate}
                        className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold shadow-lg shadow-blue-500/20 px-6 rounded-xl transition-all active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New ER Record
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by booking, patient, phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-10 rounded-lg border-slate-200 dark:border-slate-800 text-sm"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-10 rounded-lg border-slate-200 dark:border-slate-800 text-sm">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
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
                    onRefresh={() => fetchRows(search, statusFilter, dateFilter, page)}
                    itemLabel="er records"
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
                        <DialogTitle className="text-xl font-black">{editing ? 'Update ER Examination' : 'Create ER Examination'}</DialogTitle>
                        <DialogDescription>
                            {editing ? 'Update ER findings for this appointment.' : 'Insert a new ER examination record.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                        <div className="space-y-3.5">
                            <label className="text-xs font-medium text-slate-500">Appointment</label>
                            {editing ? (
                                <Input
                                    disabled
                                    value={`${editing.appointment?.bookingNumber || 'N/A'} - ${editing.appointment?.patient?.fullName || 'Unknown'}`}
                                />
                            ) : (
                                <Select
                                    value={form.appointmentId}
                                    onValueChange={(value) => setForm((prev) => ({ ...prev, appointmentId: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select appointment" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {selectableAppointments.map((appointment) => (
                                            <SelectItem key={appointment.id} value={appointment.id}>
                                                {appointment.bookingNumber || 'N/A'} - {appointment.patient?.fullName || 'Unknown'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Input
                                    placeholder="VA Right"
                                    value={form.vaRight}
                                    onChange={(e) => setForm((prev) => ({ ...prev, vaRight: e.target.value }))}
                                />
                                <Input
                                    placeholder="VA Left"
                                    value={form.vaLeft}
                                    onChange={(e) => setForm((prev) => ({ ...prev, vaLeft: e.target.value }))}
                                />
                                <Input
                                    placeholder="PH Right"
                                    value={form.phRight}
                                    onChange={(e) => setForm((prev) => ({ ...prev, phRight: e.target.value }))}
                                />
                                <Input
                                    placeholder="PH Left"
                                    value={form.phLeft}
                                    onChange={(e) => setForm((prev) => ({ ...prev, phLeft: e.target.value }))}
                                />
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="IOP Right"
                                    value={form.iopRight}
                                    onChange={(e) => setForm((prev) => ({ ...prev, iopRight: e.target.value }))}
                                />
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="IOP Left"
                                    value={form.iopLeft}
                                    onChange={(e) => setForm((prev) => ({ ...prev, iopLeft: e.target.value }))}
                                />
                            </div>

                            <Textarea
                                placeholder="ER Notes"
                                value={form.notes}
                                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                                className="min-h-[96px]"
                            />
                        </div>
                    </div>

                    <DialogFooter className="p-4 sm:p-5 border-t bg-slate-50/50">
                        <Button variant="ghost" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white"
                        >
                            {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
