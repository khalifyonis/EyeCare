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
import { Checkbox } from '@/components/ui/checkbox';

interface Exam {
  id: string;
  chiefComplaint?: string | null;
  vaBcvaOD?: string | null;
  vaBcvaOS?: string | null;
  iopOD?: number | null;
  iopOS?: number | null;
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

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const pageIds = exams.map((e) => e.id);
  const allSelected = pageIds.length > 0 && pageIds.every((examId) => selected[examId]);
  const someSelected = pageIds.some((examId) => selected[examId]) && !allSelected;

  const toggleAll = (checked: boolean) => {
    setSelected((prev) => {
      const next = { ...prev };
      for (const examId of pageIds) next[examId] = checked;
      return next;
    });
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => ({ ...prev, [id]: checked }));
  };

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

  useEffect(() => {
    setSelected({});
  }, [page, pageSize, search, dateFilter]);

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
      <div className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Eye Examinations</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage comprehensive eye examination records</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, count, grad, icon: Icon }) => (
            <div key={label} className={`rounded-xl bg-gradient-to-br ${grad} p-4 text-white shadow-md`}>
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium opacity-90">{label}</p>
                <Icon className="h-5 w-5 opacity-80" />
              </div>
              <p className="text-2xl font-bold mt-1">{count}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by patient name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full sm:w-40" />
          <Link href="/dashboard/eye-examinations/new">
            <Button className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Eye Exam
            </Button>
          </Link>
        </div>

        <div>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="w-10 px-3 py-3">
                      <Checkbox
                        aria-label="Select all"
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={(e) => toggleAll(e.target.checked)}
                      />
                    </TableHead>
                    {['PATIENT & ID', 'CHIEF COMPLAINT', 'VA (BCVA)', 'IOP', 'DATE', 'EXAMINER', 'ACTIONS'].map((head) => (
                      <TableHead key={head} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                        {head}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-16 text-center">
                        <div className="inline-flex items-center gap-2 text-slate-500">
                          <Loader2 className="h-5 w-5 animate-spin" /> Loading examinations...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : exams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-16 text-center text-slate-500">
                        No examinations found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    exams.map((e) => {
                      const patientLabel = e.patient?.patientNumber ?? e.patient?.id ?? '—';
                      const patientName = e.patient?.fullName?.trim() || 'Unknown Patient';
                      return (
                        <TableRow key={e.id} className="hover:bg-slate-50/40">
                          <TableCell className="w-10 px-3 py-3 align-middle">
                            <Checkbox
                              aria-label={`Select exam ${e.id}`}
                              checked={!!selected[e.id]}
                              onChange={(ev) => toggleOne(e.id, (ev.target as HTMLInputElement).checked)}
                            />
                          </TableCell>

                          <TableCell className="px-4 py-3">
                            <div className="min-w-[180px]">
                              <p className="text-sm font-semibold text-slate-900 truncate">{patientName}</p>
                              <p className="text-xs text-slate-500">ID: {patientLabel}</p>
                            </div>
                          </TableCell>

                          <TableCell className="px-4 py-3">
                            <p className="min-w-[180px] text-sm text-slate-700 truncate">{e.chiefComplaint ?? '—'}</p>
                          </TableCell>

                          <TableCell className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                            OD {e.vaBcvaOD ?? '—'} | OS {e.vaBcvaOS ?? '—'}
                          </TableCell>

                          <TableCell className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                            OD {e.iopOD ?? '—'} | OS {e.iopOS ?? '—'}
                          </TableCell>

                          <TableCell className="px-4 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">
                            {formatDate(e.createdAt)}
                          </TableCell>

                          <TableCell className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                            {formatDoctorName(e.doctor?.user?.fullName)}
                          </TableCell>

                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <button
                                className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                onClick={() => {
                                  router.push(`/dashboard/eye-examinations/${e.id}`);
                                }}
                              >
                                View
                              </button>
                              <button
                                className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                onClick={() => {
                                  router.push(`/dashboard/eye-examinations/${e.id}/edit`);
                                }}
                              >
                                Edit
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/dashboard/eye-examinations/${e.id}`}>View Details</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/dashboard/eye-examinations/${e.id}/edit`} className="flex items-center gap-2">
                                      <Pencil className="h-4 w-4" />
                                      Edit Examination
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-700"
                                    onClick={() => void handleDelete(e.id)}
                                    disabled={deletingId === e.id}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {deletingId === e.id ? 'Deleting...' : 'Delete'}
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
