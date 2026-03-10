'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { getSurgeryColumns, type SurgeryRow } from './columns';
import { readStoredUser, resolveRoleName, type StoredUser } from '@/lib/auth';

type ClinicalExamForSelection = {
    id: string;
    appointmentId: string;
    appointment?: {
        id: string;
        bookingNumber?: string | null;
        patient?: { id: string; fullName?: string | null } | null;
        status?: string | null;
    } | null;
};

type DoctorOption = {
    doctorId: string;
    fullName: string;
    branchId?: string;
};

const initialForm = {
    examId: '',
    eyeSide: 'RIGHT',
    surgeryType: '',
    surgeryDate: '',
    cost: '',
    status: 'PENDING',
    notes: '',
    surgeonId: '',
};

function getApiErrorMessage(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null) return undefined;
    const maybe = error as {
        response?: { status?: number; data?: { message?: unknown } };
    };
    const message = maybe.response?.data?.message;
    if (typeof message === 'string' && message.trim()) return message;

    const status = maybe.response?.status;
    if (status === 401) return 'Not signed in';
    if (status === 403) return 'Forbidden';
    if (status === 404) return 'API not found';
    return undefined;
}

function toDatetimeLocal(iso: string | null | undefined) {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';

    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mi = pad(date.getMinutes());

    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function SurgeriesPage() {
    const searchParams = useSearchParams();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
    const [sortBy, setSortBy] = useState('newest');

    const [rows, setRows] = useState<SurgeryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [allExamIds, setAllExamIds] = useState<string[]>([]);

    const [user, setUser] = useState<StoredUser | null>(null);
    const [role, setRole] = useState('');

    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<SurgeryRow | null>(null);
    const [form, setForm] = useState(initialForm);
    const [prefillHandled, setPrefillHandled] = useState(false);

    const [clinicalExams, setClinicalExams] = useState<ClinicalExamForSelection[]>([]);
    const [doctors, setDoctors] = useState<DoctorOption[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 20;

    const lastLoadErrorRef = useRef<{ msg: string; at: number }>({ msg: '', at: 0 });

    const canManage = useMemo(() => ['ADMIN', 'SUPERADMIN', 'DOCTOR'].includes(role), [role]);

    useEffect(() => {
        const storedUser = readStoredUser();
        setUser(storedUser);
        setRole(resolveRoleName(storedUser));
    }, []);

    const fetchRows = useCallback(async (searchTerm = '', status = 'all', date = '', pageNum = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.set('search', searchTerm);
            if (status !== 'all') params.set('status', status);
            if (date) params.set('date', date);
            params.set('page', String(pageNum));
            params.set('limit', String(pageSize));
            const res = await api.get(`/surgeries?${params.toString()}`);
            const body = res.data as { data?: SurgeryRow[]; total?: number; page?: number; totalPages?: number };
            setRows(Array.isArray(body?.data) ? body.data : []);
            setTotal(typeof body.total === 'number' ? body.total : 0);
            setPage(typeof body.page === 'number' ? body.page : 1);
            setTotalPages(typeof body.totalPages === 'number' ? body.totalPages : 1);
        } catch (error: unknown) {
            const msg = getApiErrorMessage(error) || 'Load failed';
            const now = Date.now();
            const last = lastLoadErrorRef.current;
            const isDuplicate = last.msg === msg && now - last.at < 1500;
            if (!isDuplicate) {
                lastLoadErrorRef.current = { msg, at: now };
                toast.error(msg);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAllSurgeries = useCallback(async () => {
        try {
            const res = await api.get('/surgeries?limit=1000');
            const body = res.data as { data?: SurgeryRow[] };
            const list = Array.isArray(body?.data) ? body.data : [];
            setAllExamIds(list.map((row) => row.examId).filter(Boolean));
        } catch {
            setAllExamIds([]);
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

    const fetchDoctors = useCallback(async () => {
        try {
            const res = await api.get('/doctors?limit=500');
            const body = res.data as { data?: Array<{ doctorId?: unknown; fullName?: unknown; branchId?: unknown }> };
            const list = Array.isArray(body?.data) ? body.data : [];
            const formatted: DoctorOption[] = list
                .filter((doctor) => typeof doctor.doctorId === 'string' && typeof doctor.fullName === 'string')
                .map((doctor) => ({
                    doctorId: doctor.doctorId as string,
                    fullName: doctor.fullName as string,
                    branchId: typeof doctor.branchId === 'string' ? doctor.branchId : undefined,
                }));
            setDoctors(formatted);
        } catch {
            setDoctors([]);
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
        fetchAllSurgeries();
        fetchClinicalExams();
        fetchDoctors();
    }, [fetchAllSurgeries, fetchClinicalExams, fetchDoctors]);

    const preselectedExamId = searchParams.get('examId') || '';
    useEffect(() => {
        if (!canManage || !preselectedExamId || prefillHandled) return;
        setEditing(null);
        setForm({ ...initialForm, examId: preselectedExamId });
        setOpen(true);
        setPrefillHandled(true);
    }, [canManage, preselectedExamId, prefillHandled]);

    const usedExamIds = useMemo(() => new Set(allExamIds), [allExamIds]);

    const selectableClinicalExams = useMemo(() => {
        return clinicalExams.filter((exam) => {
            if (editing && exam.id === editing.examId) return true;
            return !usedExamIds.has(exam.id);
        });
    }, [clinicalExams, usedExamIds, editing]);

    const selectableDoctors = useMemo(() => {
        if (!user?.branchId) return doctors;
        return doctors.filter((doctor) => !doctor.branchId || doctor.branchId === user.branchId);
    }, [doctors, user?.branchId]);

    const openCreate = useCallback(() => {
        setEditing(null);
        setForm({ ...initialForm, examId: preselectedExamId || '' });
        setOpen(true);
    }, [preselectedExamId]);

    const openEdit = useCallback((row: SurgeryRow) => {
        setEditing(row);
        setForm({
            examId: row.examId,
            eyeSide: row.eyeSide || 'RIGHT',
            surgeryType: row.surgeryType || '',
            surgeryDate: toDatetimeLocal(row.surgeryDate),
            cost: row.cost != null ? String(row.cost) : '',
            status: String(row.status || 'PENDING'),
            notes: row.notes ?? '',
            surgeonId: row.surgeon?.id ? String(row.surgeon.id) : '',
        });
        setOpen(true);
    }, []);

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm('Delete this surgery?')) return;
        try {
            await api.delete(`/surgeries/${id}`);
            toast.success('Surgery deleted');
            fetchRows(search, statusFilter, dateFilter, page);
            fetchAllSurgeries();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error) || 'Delete failed');
        }
    }, [fetchAllSurgeries, fetchRows, search, statusFilter, dateFilter]);

    const handleSave = async () => {
        if (!editing && !form.examId) {
            toast.error('Please select a clinical examination');
            return;
        }
        if (!form.surgeryType.trim()) {
            toast.error('Surgery type is required');
            return;
        }
        if (!form.surgeryDate) {
            toast.error('Surgery date is required');
            return;
        }
        if (!form.surgeonId) {
            toast.error('Please select a surgeon');
            return;
        }

        const costNumber = form.cost === '' ? 0 : Number(form.cost);
        if (!Number.isFinite(costNumber) || costNumber < 0) {
            toast.error('Invalid cost');
            return;
        }

        const date = new Date(form.surgeryDate);
        if (Number.isNaN(date.getTime())) {
            toast.error('Invalid date/time');
            return;
        }

        const payload = {
            ...(editing ? {} : { examId: form.examId }),
            eyeSide: form.eyeSide,
            surgeryType: form.surgeryType,
            surgeryDate: date.toISOString(),
            cost: costNumber,
            status: form.status,
            notes: form.notes || null,
            surgeonId: form.surgeonId,
        };

        setSaving(true);
        try {
            if (editing) {
                await api.put(`/surgeries/${editing.id}`, payload);
                toast.success('Surgery updated');
            } else {
                await api.post('/surgeries', payload);
                toast.success('Surgery scheduled');
            }

            setOpen(false);
            setEditing(null);
            setForm(initialForm);
            fetchRows(search, statusFilter, dateFilter, page);
            fetchAllSurgeries();
            fetchClinicalExams();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error) || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const filtered = useMemo(() => {
        const list = [...rows];
        list.sort((a, b) => {
            const aTime = new Date(a.surgeryDate).getTime();
            const bTime = new Date(b.surgeryDate).getTime();

            if (sortBy === 'newest') return bTime - aTime;
            if (sortBy === 'oldest') return aTime - bTime;

            if (sortBy === 'patient-asc') {
                return (a.clinicalExam?.appointment?.patient?.fullName || '').localeCompare(
                    b.clinicalExam?.appointment?.patient?.fullName || ''
                );
            }
            if (sortBy === 'patient-desc') {
                return (b.clinicalExam?.appointment?.patient?.fullName || '').localeCompare(
                    a.clinicalExam?.appointment?.patient?.fullName || ''
                );
            }

            return 0;
        });

        return list;
    }, [rows, sortBy]);

    const columns = useMemo(
        () =>
            getSurgeryColumns({
                canManage,
                onEdit: openEdit,
                onDelete: handleDelete,
            }),
        [canManage, openEdit, handleDelete]
    );

    const editingAppointmentLabel = useMemo(() => {
        if (!editing?.clinicalExam?.appointment) return '';
        const booking = editing.clinicalExam.appointment.bookingNumber || 'N/A';
        const patient = editing.clinicalExam.appointment.patient?.fullName || 'Unknown';
        return `${booking} - ${patient}`;
    }, [editing]);

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Surgeries</h1>
                    <PageBreadcrumb current="Surgeries" />
                </div>
                {canManage && (
                    <Button
                        onClick={openCreate}
                        className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold shadow-lg shadow-blue-500/20 px-6 rounded-xl transition-all active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Schedule Surgery
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by booking, patient, surgeon, type..."
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
                    itemLabel="surgeries"
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
                        <DialogTitle className="text-xl font-black">{editing ? 'Update Surgery' : 'Schedule Surgery'}</DialogTitle>
                        <DialogDescription>
                            {editing ? 'Edit surgery details.' : 'Create a surgery for a clinical exam.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="space-y-3 sm:col-span-2">
                                <label className="text-xs font-medium text-slate-500">Clinical Examination</label>
                                {editing ? (
                                    <Input disabled value={editingAppointmentLabel} />
                                ) : (
                                    <Select value={form.examId} onValueChange={(value) => setForm((prev) => ({ ...prev, examId: value }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select clinical examination" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {selectableClinicalExams.map((exam) => (
                                                <SelectItem key={exam.id} value={exam.id}>
                                                    {(exam.appointment?.bookingNumber || 'N/A') + ' - ' + (exam.appointment?.patient?.fullName || 'Unknown')}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Eye Side</label>
                                <Select value={form.eyeSide} onValueChange={(value) => setForm((prev) => ({ ...prev, eyeSide: value }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select side" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RIGHT">Right</SelectItem>
                                        <SelectItem value="LEFT">Left</SelectItem>
                                        <SelectItem value="BOTH">Both</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
                                <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PENDING">Pending</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-medium text-slate-500 mb-1 block">Surgery Type</label>
                                    <Input
                                        placeholder="e.g., Cataract surgery"
                                        value={form.surgeryType}
                                        onChange={(e) => setForm((prev) => ({ ...prev, surgeryType: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1 block">Cost</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={form.cost}
                                        onChange={(e) => setForm((prev) => ({ ...prev, cost: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1 block">Surgery Date & Time</label>
                                    <Input
                                        type="datetime-local"
                                        value={form.surgeryDate}
                                        onChange={(e) => setForm((prev) => ({ ...prev, surgeryDate: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1 block">Surgeon</label>
                                    <Select value={form.surgeonId} onValueChange={(value) => setForm((prev) => ({ ...prev, surgeonId: value }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select surgeon" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {selectableDoctors.map((doctor) => (
                                                <SelectItem key={doctor.doctorId} value={doctor.doctorId}>
                                                    {doctor.fullName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Notes</label>
                                <Textarea
                                    placeholder="Optional notes"
                                    value={form.notes}
                                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
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
                            {saving ? 'Saving...' : editing ? 'Update' : 'Schedule'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
