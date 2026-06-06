'use client';
// Force rebuild


import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/contexts/socket-context';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  Eye,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  Stethoscope,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { Badge } from '@/components/ui/badge';
import { readStoredUser, resolveRoleName } from '@/lib/auth';

interface Exam {
  id: string;
  examId?: string;
  chiefComplaint?: string | null;
  vaBcvaOD?: string | null;
  vaBcvaOS?: string | null;
  iopOD?: number | null;
  iopOS?: number | null;
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

export default function PreliminaryExamPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const { socket } = useSocket();

  const canWrite = useMemo(() => {
    const user = readStoredUser();
    const role = resolveRoleName(user);
    return ['ADMIN', 'SUPERADMIN', 'DOCTOR'].includes(role);
  }, []);

  const isOptometrist = useMemo(() => {
    const user = readStoredUser();
    const role = resolveRoleName(user);
    return role === 'DOCTOR' && user?.doctor?.specialization?.toUpperCase() === 'OPTOMETRY';
  }, []);

  useEffect(() => {
    api.get('/doctors').then(res => setDoctors(res.data)).catch(() => {});
  }, []);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        limit: pageSize,
        page,
        stage: 'PRELIMINARY',
      };
      if (search) params.search = search;
      if (doctorFilter !== 'all') params.doctorId = doctorFilter;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      
      if (!search && doctorFilter === 'all' && !dateFrom && !dateTo) {
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
  }, [search, dateFrom, dateTo, doctorFilter, page, pageSize]);

  useEffect(() => {
    const t = setTimeout(fetchExams, 200);
    return () => clearTimeout(t);
  }, [fetchExams]);

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, doctorFilter, pageSize]);

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

  const handlePromoteToClinical = async (examId: string) => {
    try {
      await api.put(`/eye-examinations/${examId}`, { stage: 'CLINICAL' });
      toast.success('Moved to Clinical Stage');
      fetchExams();
    } catch {
      toast.error('Failed to move to clinical stage');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Preliminary Examinations</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Initial testing &amp; measurements — VA, Refraction, IOP</p>
              </div>
            </div>
          </div>
          {canWrite && (
            <Link href="/dashboard/eye-examinations/new?stage=PRELIMINARY">
              <Button className="bg-[#0EA5E9] text-white hover:bg-[#0284C7]">
                <Plus className="mr-2 h-4 w-4" />
                New Eye Exam
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search patients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 h-10 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md px-2 h-10">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent border-none text-sm outline-none w-32 dark:text-slate-200"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-md px-2 h-10">
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent border-none text-sm outline-none w-32 dark:text-slate-200"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 dark:bg-slate-900/80 hover:bg-slate-50/80 dark:hover:bg-slate-900/80 border-slate-200 dark:border-slate-800">
                {['PATIENT & ID', 'DOCTOR', 'COMPLAINT', 'VA (BCVA)', 'IOP', 'DATE', 'ACTIONS'].map((head) => (
                  <TableHead key={head} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {head}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <div className="inline-flex items-center gap-2 text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin" /> Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : exams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center text-slate-500">
                    No preliminary examinations found.
                  </TableCell>
                </TableRow>
              ) : (
                exams.map((e) => {
                  const examId = resolveExamId(e);
                  const patientIdLabel = e.patient?.patientNumber || 'PAT-PENDING';
                  const patientName = e.patient?.fullName?.trim() || 'Unknown Patient';
                  const drName = e.doctor?.user?.fullName || '—';
                  return (
                    <TableRow key={examId} className="border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/40 dark:hover:bg-slate-800/40">
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 truncate">{patientName}</p>
                          <Badge variant="outline" className="w-fit font-mono text-[9px] text-slate-500 border-slate-200 bg-slate-50/50 dark:bg-slate-900/50 dark:border-slate-800">
                            {patientIdLabel}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <p className="text-sm text-slate-700 dark:text-slate-300 truncate">Dr. {drName.replace(/^Dr\.\s+/i, '')}</p>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <p className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{e.chiefComplaint ?? '—'}</p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex gap-2">
                          <span className="text-[10px] font-bold text-slate-400">OD</span> {e.vaBcvaOD ?? '—'}
                          <span className="text-slate-200">|</span>
                          <span className="text-[10px] font-bold text-slate-400">OS</span> {e.vaBcvaOS ?? '—'}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex gap-2">
                          <span className="text-[10px] font-bold text-slate-400">OD</span> {e.iopOD ?? '—'}
                          <span className="text-slate-200">|</span>
                          <span className="text-[10px] font-bold text-slate-400">OS</span> {e.iopOS ?? '—'}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatDate(e.createdAt)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="rounded-md px-2 py-1 text-sm font-medium text-sky-600 hover:bg-sky-50"
                            onClick={() => router.push(`/dashboard/eye-examinations/${examId}`)}
                          >
                            View
                          </button>
                          {canWrite && (
                            <button
                              className="rounded-md px-2 py-1 text-sm font-medium text-emerald-600 hover:bg-emerald-50"
                              onClick={() => router.push(`/dashboard/eye-examinations/${examId}/edit?stage=PRELIMINARY`)}
                            >
                              Edit
                            </button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
                                <MoreVertical className="h-4 w-4 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              {canWrite && !isOptometrist && (
                                <DropdownMenuItem onClick={() => handlePromoteToClinical(examId)}>
                                  <Stethoscope className="mr-2 h-4 w-4" />
                                  Move to Clinical
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/eye-examinations/${examId}`}>View Details</Link>
                              </DropdownMenuItem>
                              {canWrite && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/eye-examinations/${examId}/edit?stage=PRELIMINARY`} className="flex items-center gap-2">
                                    <Pencil className="h-4 w-4" />
                                    Edit Examination
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              {canWrite && (
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-700"
                                  onClick={() => void handleDelete(examId)}
                                  disabled={deletingId === examId}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {deletingId === examId ? 'Deleting...' : 'Delete'}
                                </DropdownMenuItem>
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

        <div className="mt-3 overflow-hidden">
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
