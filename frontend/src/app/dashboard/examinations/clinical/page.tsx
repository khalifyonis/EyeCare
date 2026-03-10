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

import { getClinicalExaminationColumns, type ClinicalExaminationRow } from './columns';

const toNumberOrUndefined = (value: string) => (value === '' ? undefined : Number(value));
const toIntegerOrUndefined = (value: string) => (value === '' ? undefined : parseInt(value, 10));

const initialForm = {
    appointmentId: '',
    sphRight: '',
    cylRight: '',
    axisRight: '',
    sphLeft: '',
    cylLeft: '',
    axisLeft: '',
    diagnosis: '',
    managementPlan: '',
};

type AppointmentForSelection = {
    id: string;
    bookingNumber?: string | null;
    patient?: { id: string; fullName?: string | null } | null;
    clinicalExamination?: { id: string } | null;
};

function getApiErrorMessage(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null) return undefined;
    const maybe = error as { response?: { data?: { message?: unknown } } };
    const message = maybe.response?.data?.message;
    return typeof message === 'string' ? message : undefined;
}

export default function ClinicalExaminationsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [rows, setRows] = useState<ClinicalExaminationRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 20;

    const [role, setRole] = useState('');
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<ClinicalExaminationRow | null>(null);
    const [form, setForm] = useState(initialForm);
    const [prefillHandled, setPrefillHandled] = useState(false);

    const [appointments, setAppointments] = useState<AppointmentForSelection[]>([]);

    const canManage = useMemo(() => ['ADMIN', 'SUPERADMIN', 'DOCTOR'].includes(role), [role]);
    const canCreatePrescription = useMemo(
        () => ['ADMIN', 'SUPERADMIN', 'DOCTOR', 'OPTICIAN', 'PHARMACIST'].includes(role),
        [role]
    );

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
            const res = await api.get(`/examinations/clinical?${params.toString()}`);
            const body = res.data as { data?: ClinicalExaminationRow[]; total?: number; page?: number; totalPages?: number };
            setRows(Array.isArray(body?.data) ? body.data : []);
            setTotal(typeof body.total === 'number' ? body.total : 0);
            setPage(typeof body.page === 'number' ? body.page : 1);
            setTotalPages(typeof body.totalPages === 'number' ? body.totalPages : 1);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error) || 'Failed to load clinical examinations');
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
            return !appointment.clinicalExamination;
        });
    }, [appointments, editing]);

    const openCreate = useCallback(() => {
        setEditing(null);
        setForm({ ...initialForm, appointmentId: preselectedAppointmentId || '' });
        setOpen(true);
    }, [preselectedAppointmentId]);

    const openEdit = useCallback((row: ClinicalExaminationRow) => {
        setEditing(row);
        setForm({
            appointmentId: row.appointmentId,
            sphRight: row.sphRight != null ? String(row.sphRight) : '',
            cylRight: row.cylRight != null ? String(row.cylRight) : '',
            axisRight: row.axisRight != null ? String(row.axisRight) : '',
            sphLeft: row.sphLeft != null ? String(row.sphLeft) : '',
            cylLeft: row.cylLeft != null ? String(row.cylLeft) : '',
            axisLeft: row.axisLeft != null ? String(row.axisLeft) : '',
            diagnosis: row.diagnosis ?? '',
            managementPlan: row.managementPlan ?? '',
        });
        setOpen(true);
    }, []);

    const openSurgeryForExam = useCallback(
        (examId: string) => {
            const id = (examId || '').trim();
            if (!id) return;
            router.push(`/dashboard/surgeries?examId=${id}`);
        },
        [router]
    );

    const openPrescriptionForExam = useCallback(
        (examId: string) => {
            const id = (examId || '').trim();
            if (!id) return;
            router.push(`/dashboard/prescriptions?examId=${id}`);
        },
        [router]
    );

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm('Delete this Clinical examination?')) return;
        try {
            await api.delete(`/examinations/clinical/${id}`);
            toast.success('Clinical examination deleted');
            fetchRows(search, statusFilter, dateFilter, page);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error) || 'Delete failed');
        }
    }, [fetchRows, search, statusFilter, dateFilter]);

    const handleSave = async () => {
        if (!editing && !form.appointmentId) {
            toast.error('Please select an appointment');
            return;
        }

        const payload = {
            ...(editing ? {} : { appointmentId: form.appointmentId }),
            sphRight: toNumberOrUndefined(form.sphRight),
            cylRight: toNumberOrUndefined(form.cylRight),
            axisRight: toIntegerOrUndefined(form.axisRight),
            sphLeft: toNumberOrUndefined(form.sphLeft),
            cylLeft: toNumberOrUndefined(form.cylLeft),
            axisLeft: toIntegerOrUndefined(form.axisLeft),
            diagnosis: form.diagnosis || null,
            managementPlan: form.managementPlan || null,
        };

        setSaving(true);
        try {
            if (editing) {
                await api.put(`/examinations/clinical/${editing.id}`, payload);
                toast.success('Clinical examination updated');
            } else {
                await api.post('/examinations/clinical', payload);
                toast.success('Clinical examination created');
            }
            setOpen(false);
            setEditing(null);
            setForm(initialForm);
            fetchRows(search, statusFilter, dateFilter, page);
            fetchAppointments();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error) || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const filtered = useMemo(() => {
        const list = [...rows];
        list.sort((a, b) => {
            const aTime = new Date(a.examinedAt).getTime();
            const bTime = new Date(b.examinedAt).getTime();
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
        return getClinicalExaminationColumns({
            canManage,
            canOpenSurgery: canManage,
            canOpenPrescription: canCreatePrescription,
            onOpenSurgery: openSurgeryForExam,
            onOpenPrescription: openPrescriptionForExam,
            onEdit: openEdit,
            onDelete: handleDelete,
        });
    }, [
        canManage,
        canCreatePrescription,
        openSurgeryForExam,
        openPrescriptionForExam,
        openEdit,
        handleDelete,
    ]);

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Clinical Examinations</h1>
                    <PageBreadcrumb current="Clinical Examinations" />
                </div>
                {canManage && (
                    <Button
                        onClick={openCreate}
                        className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold shadow-lg shadow-blue-500/20 px-6 rounded-xl transition-all active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Clinical Record
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by booking, patient, diagnosis..."
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
                    onRefresh={() => {
                        fetchRows(search, statusFilter, dateFilter, page);
                        fetchAppointments();
                    }}
                    itemLabel="clinical examinations"
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
                <DialogContent className="sm:max-w-[680px] rounded-2xl flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-4">
                        <DialogTitle className="text-xl font-black">{editing ? 'Edit Clinical Examination' : 'New Clinical Examination'}</DialogTitle>
                        <DialogDescription className="font-medium mt-1">
                            {editing ? 'Update clinical exam details.' : 'Record a new clinical examination for an appointment.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-6 py-2 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Appointment</label>
                            <Select
                                value={form.appointmentId}
                                onValueChange={(value) => setForm((prev) => ({ ...prev, appointmentId: value }))}
                                disabled={!!editing}
                            >
                                <SelectTrigger className="rounded-xl border-slate-200 focus:ring-[#0EA5E9] font-bold h-11">
                                    <SelectValue placeholder={editing ? 'Appointment fixed for edit' : 'Select appointment'} />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-200">
                                    {selectableAppointments.map((a) => {
                                        const booking = a.bookingNumber || 'N/A';
                                        const patient = a.patient?.fullName || 'Unknown';
                                        return (
                                            <SelectItem key={a.id} value={a.id} className="font-bold cursor-pointer">
                                                {booking} - {patient}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Right Eye (SPH/CYL/AXIS)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <Input
                                        value={form.sphRight}
                                        onChange={(e) => setForm((p) => ({ ...p, sphRight: e.target.value }))}
                                        placeholder="SPH"
                                        className="rounded-xl"
                                    />
                                    <Input
                                        value={form.cylRight}
                                        onChange={(e) => setForm((p) => ({ ...p, cylRight: e.target.value }))}
                                        placeholder="CYL"
                                        className="rounded-xl"
                                    />
                                    <Input
                                        value={form.axisRight}
                                        onChange={(e) => setForm((p) => ({ ...p, axisRight: e.target.value }))}
                                        placeholder="AXIS"
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Left Eye (SPH/CYL/AXIS)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <Input
                                        value={form.sphLeft}
                                        onChange={(e) => setForm((p) => ({ ...p, sphLeft: e.target.value }))}
                                        placeholder="SPH"
                                        className="rounded-xl"
                                    />
                                    <Input
                                        value={form.cylLeft}
                                        onChange={(e) => setForm((p) => ({ ...p, cylLeft: e.target.value }))}
                                        placeholder="CYL"
                                        className="rounded-xl"
                                    />
                                    <Input
                                        value={form.axisLeft}
                                        onChange={(e) => setForm((p) => ({ ...p, axisLeft: e.target.value }))}
                                        placeholder="AXIS"
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Diagnosis</label>
                            <Textarea
                                value={form.diagnosis}
                                onChange={(e) => setForm((p) => ({ ...p, diagnosis: e.target.value }))}
                                placeholder="Diagnosis"
                                className="rounded-xl"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Management Plan</label>
                            <Textarea
                                value={form.managementPlan}
                                onChange={(e) => setForm((p) => ({ ...p, managementPlan: e.target.value }))}
                                placeholder="Plan"
                                className="rounded-xl"
                            />
                        </div>
                    </div>

                    <DialogFooter className="p-6 pt-4 gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl" disabled={saving}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="rounded-xl bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold"
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
