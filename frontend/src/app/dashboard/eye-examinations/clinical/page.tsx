'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/contexts/socket-context';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Plus,
  Stethoscope,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { readStoredUser, resolveRoleName } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ServerPagination } from '@/components/dashboard/server-pagination';

interface Exam {
  id: string;
  examId?: string;
  chiefComplaint?: string | null;
  diagnosis?: string | null;
  plan?: string | null;
  stage?: string | null;
  createdAt?: string | null;
  patient?: { id: string; fullName?: string | null; patientNumber?: string | null } | null;
  doctor?: { user?: { fullName?: string | null } | null } | null;
}

interface PaginatedEyeExamResponse {
  data?: Exam[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }).format(d);
}

function formatDoctorName(raw: string | null | undefined): string {
  if (!raw) return '—';
  const value = raw.trim();
  if (!value) return '—';
  const lower = value.toLowerCase();
  if (lower.startsWith('dr.') || lower.startsWith('dr ')) return value;
  return `Dr. ${value}`;
}

function resolveExamId(exam: Exam): string {
  const primary = typeof exam.id === 'string' ? exam.id.trim() : '';
  if (primary) return primary;
  const fallback = typeof exam.examId === 'string' ? exam.examId.trim() : '';
  return fallback;
}

function getLocalDateValue(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ClinicalExamPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const { socket } = useSocket();

  // Checked-in/Examining queue states
  const [todayQueue, setTodayQueue] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);

  useEffect(() => {
    const fetchQueue = async () => {
      setQueueLoading(true);
      try {
        const today = getLocalDateValue();
        const res = await api.get('/appointments', { params: { date: today, status: 'EXAMINING', limit: 50 } });
        const data = res.data?.data || res.data || [];
        setTodayQueue(Array.isArray(data) ? data : []);
      } catch {
        setTodayQueue([]);
      } finally {
        setQueueLoading(false);
      }
    };
    fetchQueue();
    if (socket) {
      socket.on('appointment:updated', fetchQueue);
      return () => { socket.off('appointment:updated', fetchQueue); };
    }
  }, [socket]);

  const canWrite = useMemo(() => {
    return hasPermission('clinical_exams', 'canCreate');
  }, []);

  useEffect(() => {
    api.get('/doctors').then(res => setDoctors(res.data)).catch(() => {});
  }, []);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      let stage = 'CLINICAL,COMPLETED';
      if (statusFilter === 'in_progress') stage = 'CLINICAL';
      if (statusFilter === 'completed') stage = 'COMPLETED';

      const params: Record<string, string | number> = {
        limit: pageSize,
        page,
        stage,
      };
      if (search) params.search = search;
      if (doctorFilter !== 'all') params.doctorId = doctorFilter;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      
      if (!search && doctorFilter === 'all' && statusFilter === 'all' && !dateFrom && !dateTo) {
        params.date = getLocalDateValue();
      }

      const res = await api.get('/eye-examinations', { params });
      const body = res.data as PaginatedEyeExamResponse;
      setExams(body.data ?? []);
      setTotal(body.total ?? 0);
      setTotalPages(body.totalPages ?? 1);
    } catch {
      toast.error('Failed to load examinations');
      setExams([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo, doctorFilter, statusFilter, page, pageSize]);

  useEffect(() => {
    const t = setTimeout(fetchExams, 200);
    return () => clearTimeout(t);
  }, [fetchExams]);

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, doctorFilter, statusFilter, pageSize]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchExams();
    socket.on('exam:created', handleUpdate);
    socket.on('exam:updated', handleUpdate);
    socket.on('exam:deleted', handleUpdate);
    return () => {
      socket.off('exam:created', handleUpdate);
      socket.off('exam:updated', handleUpdate);
      socket.off('exam:deleted', handleUpdate);
    };
  }, [socket, fetchExams]);

  const handleDelete = async (id: string) => {
    const ok = window.confirm('Delete this examination? This cannot be undone.');
    if (!ok) return;
    setDeletingId(id);
    try {
      await api.delete(`/eye-examinations/${id}`);
      toast.success('Examination deleted');
      setPage(1);
      await fetchExams();
    } catch {
      toast.error('Failed to delete examination');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="border-b border-gray-200 bg-white px-6 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <Stethoscope className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Clinical Examinations</h1>
                <p className="mt-1 text-sm text-gray-500">Comprehensive evaluation and clinical documentation</p>
              </div>
            </div>
          </div>
          {canWrite && (
            <Link href="/dashboard/eye-examinations/new?stage=CLINICAL">
              <Button className="bg-blue-600 px-6 font-bold text-white hover:bg-blue-700 shadow-sm transition-all hover:shadow-md">
                <Plus className="mr-2 h-4 w-4" />
                New Eye Exam
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Patients Ready for Doctor Today */}
      {todayQueue.length > 0 && (
        <div className="px-6 pt-5 pb-1 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/20">
          <h2 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Patients Ready for Doctor ({todayQueue.length})
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
            {todayQueue.map((appt: any) => {
              const hasExam = appt.eyeExamination?.id;
              return (
                <button
                  key={appt.id}
                  onClick={() => {
                    if (hasExam) {
                      router.push(`/dashboard/eye-examinations/${appt.eyeExamination.id}/edit?stage=CLINICAL`);
                    } else {
                      const pid = appt.patient?.id || appt.patientId;
                      const pname = appt.patient?.fullName || '';
                      router.push(`/dashboard/eye-examinations/new?stage=CLINICAL&patientId=${pid}&patientName=${encodeURIComponent(pname)}&appointmentId=${appt.id}`);
                    }
                  }}
                  className="flex-shrink-0 min-w-[220px] rounded-xl border border-blue-100 dark:border-blue-950 bg-gradient-to-br from-white to-blue-50/20 dark:from-slate-900 dark:to-blue-950/10 p-3.5 text-left hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800 transition-all duration-200 group relative overflow-hidden"
                >
                  <div className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-450 transition-colors">
                    {appt.patient?.fullName || 'Unknown Patient'}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono tracking-wider">
                    {appt.patient?.patientNumber || 'PAT-PENDING'}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-450 border border-blue-100/50 dark:border-blue-900/30">
                      {hasExam ? 'CONTINUE EXAM' : 'NEW EXAM'}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                      {new Date(appt.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search patients by name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white border-gray-200 h-10 text-sm focus:ring-1 focus:ring-blue-100 focus:border-blue-400"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="pl-9 pr-3 h-10 rounded-lg border border-gray-200 bg-white text-sm outline-none w-40 focus:ring-1 focus:ring-blue-100 focus:border-blue-400"
              />
            </div>
            <span className="text-gray-400 font-medium">to</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="pl-9 pr-3 h-10 rounded-lg border border-gray-200 bg-white text-sm outline-none w-40 focus:ring-1 focus:ring-blue-100 focus:border-blue-400"
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-gray-200">
                {['PATIENT & ID', 'DOCTOR', 'COMPLAINT', 'DIAGNOSIS', 'DATE', 'ACTIONS'].map((head) => (
                  <TableHead key={head} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">
                    {head}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <div className="inline-flex items-center gap-2 text-gray-500">
                      <Loader2 className="h-5 w-5 animate-spin" /> Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : exams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center text-gray-500">
                    No clinical examinations found.
                  </TableCell>
                </TableRow>
              ) : (
                exams.map((e) => {
                  const examId = resolveExamId(e);
                  const patientIdLabel = e.patient?.patientNumber || e.patient?.id || 'PENDING';
                  const patientName = e.patient?.fullName?.trim() || 'Unknown Patient';
                  const drName = e.doctor?.user?.fullName || '—';
                  return (
                    <TableRow key={examId} className="border-gray-100 hover:bg-gray-50/40 transition-colors">
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-sm font-bold text-gray-900 truncate">{patientName}</p>
                          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{patientIdLabel}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-700 truncate">{formatDoctorName(drName)}</p>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <p className="text-sm text-gray-600 truncate max-w-[120px]">{e.chiefComplaint ?? '—'}</p>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <p className="text-sm text-gray-600 truncate max-w-[150px]">{e.diagnosis ?? '—'}</p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap font-medium">
                        {formatDate(e.createdAt)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <button
                            className="rounded-lg px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100"
                            onClick={() => router.push(`/dashboard/eye-examinations/${examId}`)}
                          >
                            View
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-gray-200 shadow-lg">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/eye-examinations/${examId}`} className="text-xs font-medium">View Details</Link>
                              </DropdownMenuItem>
                              {canWrite && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/eye-examinations/${examId}/edit?stage=CLINICAL`} className="flex items-center gap-2 text-xs font-medium">
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edit Examination
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              {canWrite && (
                                <>
                                  <div className="h-px bg-gray-100 my-1" />
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-700 text-xs font-medium"
                                    onClick={() => void handleDelete(examId)}
                                    disabled={deletingId === examId}
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                                    {deletingId === examId ? 'Deleting...' : 'Delete'}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4">
          <ServerPagination
            page={page}
            limit={pageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setPageSize(l);
              setPage(1);
            }}
            disabled={loading}
            itemLabel="examinations"
          />
        </div>
      </div>
    </div>
  );
}
