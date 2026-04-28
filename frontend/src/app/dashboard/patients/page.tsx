'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, RefreshCcw, Search, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/axios';
import { ServerPagination } from '@/components/dashboard/server-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { readStoredUser, resolveRoleName } from '@/lib/auth';

import { getPatientColumns, type PatientRow } from './columns';
import PatientForm, { type PatientFormData } from './patient-form';

type PageMode = 'list' | 'form';

function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0] || '';
}

function mapDetailToForm(detail: any): PatientFormData {
  const fullName = (detail.fullName || '').trim();
  const firstName = (detail.firstName || '').trim() || fullName.split(/\s+/)[0] || '';
  const lastName = (detail.lastName || '').trim() || fullName.split(/\s+/).slice(1).join(' ') || '';

  return {
    firstName,
    lastName,
    dateOfBirth: toDateInputValue(detail.dateOfBirth),
    gender: (detail.gender || '').toUpperCase() === 'FEMALE' ? 'FEMALE' : 'MALE',
    phone: detail.phone || '',
    email: detail.email || '',
    address: detail.address || '',
    city: detail.city || '',
    state: detail.state || '',
    bloodGroup: detail.bloodGroup || '',
    allergies: detail.allergies || '',
    currentMedications: detail.currentMedications || '',
    medicalHistory: detail.medicalHistory || '',
    familyMedicalHistory: detail.familyMedicalHistory || '',
    emergencyContactName: detail.emergencyContactName || '',
    emergencyContactRelationship: detail.emergencyContactRelationship || '',
    emergencyContactPhone: detail.emergencyContactPhone || '',
  };
}

export default function PatientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<PageMode>('list');
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formInitialData, setFormInitialData] = useState<PatientFormData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const role = useMemo(() => resolveRoleName(readStoredUser()), []);
  const canManage = ['ADMIN', 'SUPERADMIN', 'RECEPTIONIST'].includes(role);

  const setListMode = useCallback(() => {
    setMode('list');
    setSelectedPatientId(null);
    setFormInitialData(null);
    router.replace('/dashboard/patients');
  }, [router]);

  const fetchPatients = useCallback(async (q = '', p = 1) => {
    setLoading(true);
    try {
      const sortMap: Record<string, { sortBy: string; sortOrder: string }> = {
        newest: { sortBy: 'createdAt', sortOrder: 'desc' },
        oldest: { sortBy: 'createdAt', sortOrder: 'asc' },
        'name-asc': { sortBy: 'fullName', sortOrder: 'asc' },
        'name-desc': { sortBy: 'fullName', sortOrder: 'desc' },
      };
      const selectedSort = sortMap[sortBy] ?? sortMap.newest;
      const params = new URLSearchParams({
        page: String(p),
        limit: String(pageSize),
        sortBy: selectedSort.sortBy,
        sortOrder: selectedSort.sortOrder,
      });
      if (q) params.set('search', q);
      if (statusFilter === 'active') params.set('isActive', 'true');
      if (statusFilter === 'inactive') params.set('isActive', 'false');

      const res = await api.get(`/patients?${params.toString()}`);
      const body = res.data as { data?: PatientRow[]; total?: number; page?: number; totalPages?: number };
      setPatients(Array.isArray(body.data) ? body.data : []);
      setTotal(typeof body.total === 'number' ? body.total : 0);
      setPage(typeof body.page === 'number' ? body.page : 1);
      setTotalPages(typeof body.totalPages === 'number' ? body.totalPages : 1);
    } catch {
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [pageSize, sortBy, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, sortBy, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchPatients(search, page);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, sortBy, page, fetchPatients]);

  const openCreate = useCallback(() => {
    setFormMode('create');
    setFormInitialData(null);
    setSelectedPatientId(null);
    setMode('form');
    router.replace('/dashboard/patients?new=1');
  }, [router]);

  const openEdit = useCallback(async (id: string) => {
    setDetailsLoading(true);
    let detail;
    try {
      const res = await api.get(`/patients/${id}`);
      detail = res.data;
    } catch {
      toast.error('Failed to load patient data');
      setDetailsLoading(false);
      return;
    } finally {
      setDetailsLoading(false);
    }

    setSelectedPatientId(id);
    setFormMode('edit');
    setFormInitialData(mapDetailToForm(detail));
    setMode('form');
    router.replace(`/dashboard/patients?edit=${encodeURIComponent(id)}`);
  }, [router]);

  const handleView = useCallback((patient: PatientRow) => {
    router.push(`/dashboard/patients/${patient.id}`);
  }, [router]);

  const handleEdit = useCallback((patient: PatientRow) => {
    void openEdit(patient.id);
  }, [openEdit]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this patient record? This cannot be undone.')) return;
    try {
      await api.delete(`/patients/${id}`);
      toast.success('Patient deleted');
      await fetchPatients(search, page);
      if (selectedPatientId === id) setListMode();
    } catch {
      toast.error('Delete failed');
    }
  }, [fetchPatients, page, search, selectedPatientId, setListMode]);

  const handleBook = useCallback((patient: PatientRow) => {
    router.push(`/dashboard/appointments/new?patientId=${encodeURIComponent(patient.id)}`);
  }, [router]);

  const handleFormSubmit = useCallback(async (data: PatientFormData) => {
    const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();
    const payload = {
      ...data,
      fullName,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: data.phone.trim(),
      email: data.email.trim() || null,
      address: data.address.trim() || null,
      city: data.city.trim() || null,
      state: data.state.trim() || null,
      bloodGroup: data.bloodGroup || null,
      allergies: data.allergies || null,
      currentMedications: data.currentMedications || null,
      medicalHistory: data.medicalHistory || null,
      familyMedicalHistory: data.familyMedicalHistory || null,
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactRelationship: data.emergencyContactRelationship || null,
      emergencyContactPhone: data.emergencyContactPhone || null,
    };

    setSubmitting(true);
    try {
      if (formMode === 'edit' && selectedPatientId) {
        await api.put(`/patients/${selectedPatientId}`, payload);
        toast.success('Patient updated successfully');
      } else {
        await api.post('/patients', payload);
        toast.success('Patient registered successfully');
      }

      await fetchPatients(search, page);
      setListMode();
    } catch (error: any) {
      const message = error.response?.data?.message || (formMode === 'edit' ? 'Failed to update patient' : 'Failed to save patient');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [fetchPatients, formMode, page, search, selectedPatientId, setListMode]);

  const handledParamRef = useRef<string | null>(null);

  useEffect(() => {
    const viewId = searchParams.get('view');
    const editId = searchParams.get('edit');
    const createFlag = searchParams.get('new');

    const paramKey = editId ? `edit:${editId}` : viewId ? `view:${viewId}` : createFlag === '1' ? 'new' : 'list';

    if (handledParamRef.current === paramKey) return;
    handledParamRef.current = paramKey;

    if (editId) {
      void openEdit(editId);
      return;
    }

    if (viewId) {
      router.replace(`/dashboard/patients/${viewId}`);
      return;
    }

    if (createFlag === '1') {
      setFormMode('create');
      setFormInitialData(null);
      setMode('form');
      return;
    }

    setMode('list');
  }, [searchParams, openEdit, router]);

  const columns = getPatientColumns({
    onView: handleView,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onBook: handleBook,
    canManage,
  });

  if (mode === 'form') {
    return (
      <PatientForm
        mode={formMode}
        submitting={submitting}
        initialData={formInitialData}
        onSubmit={handleFormSubmit}
        onCancel={setListMode}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 bg-white px-6 pb-4 pt-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Patients</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Manage your patient records and information</p>
          </div>
          {canManage && (
            <Button
              onClick={openCreate}
              className="h-11 rounded-lg bg-[#0EA5E9] px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0c96d4] active:scale-95"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              + Add New Patient
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center">
        <div className="relative min-w-[280px] flex-1 sm:min-w-[350px] sm:max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search patients by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 border-slate-300 bg-white pl-10 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
            <SelectTrigger className="h-9 w-[150px] border-slate-300 bg-white text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 [&>span]:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All patients</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 w-[160px] border-slate-300 bg-white text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 [&>span]:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 border border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            onClick={() => void fetchPatients(search, page)}
            disabled={loading}
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="flex-1 px-6 py-4">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:bg-slate-900/70">
                {['PATIENT', 'CONTACT', 'STATUS', 'REGISTRATION DATE', 'ADDRESS', 'ACTIONS'].map((header) => (
                  <TableHead key={header} className="whitespace-nowrap px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-sm text-slate-500">
                      Loading patients...
                    </TableCell>
                  </TableRow>
                )
                : patients.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <Users className="h-10 w-10 opacity-30" />
                          <p className="text-sm font-semibold">No patients found</p>
                          {canManage && (
                            <Button
                              size="sm"
                              className="mt-1 bg-[#0EA5E9] text-white hover:bg-[#0c96d4]"
                              onClick={openCreate}
                            >
                              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                              Add First Patient
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                  : patients.map((row) => (
                    <TableRow key={row.id} className="border-slate-100 transition-colors hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-900/40">
                      {columns.map((col) => (
                        <TableCell key={col.id} className="px-4 py-4 align-middle">
                          {typeof col.cell === 'function' ? (col.cell as Function)({ row: { original: row } }) : null}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-3">
          <ServerPagination
            page={page}
            limit={pageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            onLimitChange={(limit) => { setPageSize(limit); setPage(1); }}
            disabled={loading}
            itemLabel="patients"
          />
        </div>
      </div>
    </div>
  );
}
