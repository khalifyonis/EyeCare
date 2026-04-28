'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  Eye,
  Calendar,
  TrendingUp,
  FileText,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
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

interface Exam {
  id: string;
  examId?: string;
  chiefComplaint?: string | null;
  vaBcvaOD?: string | null;
  vaBcvaOS?: string | null;
  iopOD?: number | null;
  iopOS?: number | null;
  amount?: number | string | null;
  createdAt?: string | null;
  patient?: { id: string; fullName?: string | null; patientNumber?: string | null } | null;
  doctor?: { user?: { fullName?: string | null } | null } | null;
}

interface Stats {
  todays: number;
  thisWeek: number;
  highIop: number;
  total: number;
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

export default function EyeExaminationsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/eye-examinations/stats');
      setStats(res.data);
    } catch {
      setStats({ todays: 0, thisWeek: 0, highIop: 0, total: 0 });
    }
  }, []);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: pageSize, page };
      if (search) params.search = search;
      if (dateFilter) params.date = dateFilter;
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
  }, [search, dateFilter, page, pageSize]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const t = setTimeout(fetchExams, 200);
    return () => clearTimeout(t);
  }, [fetchExams]);

  useEffect(() => {
    setPage(1);
  }, [search, dateFilter, pageSize]);

  const handleDelete = async (id: string) => {
    const ok = window.confirm('Delete this examination? This cannot be undone.');
    if (!ok) return;

    setDeletingId(id);
    try {
      await api.delete(`/eye-examinations/${id}`);
      toast.success('Examination deleted');
      setPage(1);
      await fetchExams();
      await fetchStats();
    } catch {
      toast.error('Failed to delete examination');
    } finally {
      setDeletingId(null);
    }
  };

  const statCards = [
    { label: "Today's Exams", count: stats?.todays ?? 0, grad: 'from-[#3B82F6] to-[#60A5FA]', icon: Eye },
    { label: 'This Week', count: stats?.thisWeek ?? 0, grad: 'from-[#14B8A6] to-[#2DD4BF]', icon: Calendar },
    { label: 'High IOP Cases', count: stats?.highIop ?? 0, grad: 'from-[#8B5CF6] to-[#A78BFA]', icon: TrendingUp },
    { label: 'Total Records', count: stats?.total ?? 0, grad: 'from-[#F97316] to-[#FB923C]', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Eye Examinations</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage comprehensive eye examination records</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(({ label, count, grad, icon: Icon }) => (
            <div key={label} className={`min-h-[110px] rounded-2xl bg-gradient-to-br ${grad} p-5 text-white shadow-md`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium opacity-90 sm:text-[15px]">{label}</p>
                <Icon className="h-5 w-5 shrink-0 opacity-80" />
              </div>
              <p className="mt-2 text-3xl font-bold leading-none sm:text-[32px]">{count}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by patient name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
            />
          </div>
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full lg:w-44 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800" />
          <Link href="/dashboard/eye-examinations/new" className="w-full lg:w-auto">
            <Button className="w-full bg-[#0EA5E9] text-white hover:bg-[#0284C7] lg:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Eye Exam
            </Button>
          </Link>
        </div>

        <div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-slate-900/80 hover:bg-slate-50/80 dark:hover:bg-slate-900/80 border-slate-200 dark:border-slate-800">
                    {['PATIENT & ID', 'CHIEF COMPLAINT', 'VA (BCVA)', 'IOP', 'AMOUNT', 'DATE / EXAMINER', 'ACTIONS'].map((head) => (
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
                          <Loader2 className="h-5 w-5 animate-spin" /> Loading examinations...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : exams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center text-slate-500">
                        No examinations found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    exams.map((e) => {
                      const examId = resolveExamId(e);
                      const patientLabel = e.patient?.patientNumber ?? e.patient?.id ?? '—';
                      const patientName = e.patient?.fullName?.trim() || 'Unknown Patient';
                      return (
                        <TableRow key={examId || `${patientName}-${formatDate(e.createdAt)}`} className="border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/40 dark:hover:bg-slate-800/40">
                          <TableCell className="px-4 py-3">
                            <div className="min-w-[180px]">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 truncate">{patientName}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">ID: {patientLabel}</p>
                            </div>
                          </TableCell>

                          <TableCell className="px-4 py-3">
                            <p className="min-w-0 text-sm text-slate-700 dark:text-slate-300 truncate">{e.chiefComplaint ?? '—'}</p>
                          </TableCell>

                          <TableCell className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            OD {e.vaBcvaOD ?? '—'} | OS {e.vaBcvaOS ?? '—'}
                          </TableCell>

                          <TableCell className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            OD {e.iopOD ?? '—'} | OS {e.iopOS ?? '—'}
                          </TableCell>

                          <TableCell className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            <span className="font-semibold text-slate-900 dark:text-slate-200 tabular-nums">
                                ${Number(e.amount || 0).toFixed(2)}
                            </span>
                          </TableCell>

                          <TableCell className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            <div className="space-y-1">
                              <p>{formatDate(e.createdAt)}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{formatDoctorName(e.doctor?.user?.fullName)}</p>
                            </div>
                          </TableCell>

                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <button
                                className="rounded-md px-2 py-1 text-sm font-medium text-sky-600 hover:bg-sky-50 hover:text-sky-700"
                                onClick={() => {
                                  if (!examId) {
                                    toast.error('Invalid examination record');
                                    return;
                                  }
                                  router.push(`/dashboard/eye-examinations/${examId}`);
                                }}
                              >
                                View
                              </button>
                              <button
                                className="rounded-md px-2 py-1 text-sm font-medium text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                onClick={() => {
                                  if (!examId) {
                                    toast.error('Cannot edit: examination id is missing');
                                    return;
                                  }
                                  router.push(`/dashboard/eye-examinations/${examId}/edit`);
                                }}
                              >
                                Edit
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link href={examId ? `/dashboard/eye-examinations/${examId}` : '/dashboard/eye-examinations'}>View Details</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={examId ? `/dashboard/eye-examinations/${examId}/edit` : '/dashboard/eye-examinations'} className="flex items-center gap-2">
                                      <Pencil className="h-4 w-4" />
                                      Edit Examination
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-700"
                                    onClick={() => {
                                      if (!examId) {
                                        toast.error('Cannot delete: examination id is missing');
                                        return;
                                      }
                                      void handleDelete(examId);
                                    }}
                                    disabled={!examId || deletingId === examId}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {deletingId === examId ? 'Deleting...' : 'Delete'}
                                  </DropdownMenuItem>
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
    </div>
  );
}
