'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronRight,
  Clock,
  Plus,
  Scissors,
  Search,
  Eye,
} from 'lucide-react';
import { ServerPagination } from '@/components/dashboard/server-pagination';

function CataractRefIcon({ className }: { className?: string }) {
  const g1 = useId();
  const g2 = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={g1} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#60A5FA" />
          <stop offset="0.55" stopColor="#2563EB" />
          <stop offset="1" stopColor="#0EA5E9" />
        </linearGradient>
        <linearGradient id={g2} x1="10" y1="8" x2="22" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#E0F2FE" stopOpacity="0.95" />
          <stop offset="1" stopColor="#93C5FD" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path
        d="M16 3 28.5 12.7 16 29 3.5 12.7 16 3Z"
        fill={`url(#${g1})`}
        stroke="#1D4ED8"
        strokeOpacity="0.35"
        strokeWidth="1"
      />
      <path d="M16 3 28.5 12.7 16 16 3.5 12.7 16 3Z" fill={`url(#${g2})`} />
      <path d="M16 16 28.5 12.7 16 29 16 16Z" fill="#0284C7" fillOpacity="0.35" />
      <path d="M16 16 3.5 12.7 16 29 16 16Z" fill="#0EA5E9" fillOpacity="0.22" />
    </svg>
  );
}

function LasikRefIcon({ className }: { className?: string }) {
  const g1 = useId();
  const g2 = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={g1} cx="16" cy="16" r="14" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FBCFE8" />
          <stop offset="0.6" stopColor="#F472B6" />
          <stop offset="1" stopColor="#EC4899" />
        </radialGradient>
        <linearGradient id={g2} x1="19" y1="8" x2="29" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#60A5FA" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <circle cx="14" cy="18" r="10" fill="none" stroke={`url(#${g1})`} strokeWidth="3.5" />
      <circle cx="14" cy="18" r="5.5" fill="none" stroke="#FDBA74" strokeWidth="3" strokeOpacity="0.9" />
      <circle cx="14" cy="18" r="2.2" fill="#111827" fillOpacity="0.9" />
      <path d="M18.5 7.5 28 12l-7 7-3-3 7-7Z" fill={`url(#${g2})`} />
      <path d="M20.2 10.1 24.8 14.7" stroke="#E0F2FE" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

function RetinalRefIcon({ className }: { className?: string }) {
  const g1 = useId();
  const g2 = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={g1} cx="16" cy="16" r="13" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FDE68A" />
          <stop offset="0.55" stopColor="#FDBA74" />
          <stop offset="1" stopColor="#FB7185" stopOpacity="0.95" />
        </radialGradient>
        <radialGradient id={g2} cx="16" cy="16" r="7" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FEF3C7" />
          <stop offset="0.6" stopColor="#A16207" />
          <stop offset="1" stopColor="#422006" />
        </radialGradient>
      </defs>
      <path
        d="M2.6 16c3.8-6.2 9.4-9.6 13.4-9.6S25.6 9.8 29.4 16c-3.8 6.2-9.4 9.6-13.4 9.6S6.4 22.2 2.6 16Z"
        fill="#F8FAFC"
        stroke="#CBD5E1"
        strokeWidth="1"
      />
      <circle cx="16" cy="16" r="7.6" fill={`url(#${g1})`} />
      <circle cx="16" cy="16" r="4.4" fill={`url(#${g2})`} />
      <circle cx="16" cy="16" r="1.6" fill="#111827" fillOpacity="0.9" />
      <circle cx="21.5" cy="13" r="1.2" fill="#FFFFFF" opacity="0.95" />
    </svg>
  );
}

type SurgeryRow = {
  id: string;
  surgeryType: string;
  procedure?: string | null;
  eye?: string | null;
  status?: string | null;
  date: string;
  time?: string | null;
  surgeon?: { user?: { fullName?: string | null } | null } | null;
  patient?: { id: string; fullName?: string | null; patientNumber?: string | null } | null;
};

type SurgeryListResponse = {
  data: SurgeryRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats?: {
    todaysSurgeries?: number;
    scheduled?: number;
    completed?: number;
    totalProcedures?: number;
  };
};

const LABEL_CN = 'text-xs font-semibold uppercase tracking-wide text-slate-500';

function formatShortDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(d);
}

function surgeryCodeFromId(id: string): string {
  const compact = (id || '').replace(/-/g, '');
  if (!compact) return 'SRG-00000000';
  const tail = compact.slice(-8);
  const numeric = Number.parseInt(tail, 16);
  const code = Number.isNaN(numeric) ? 0 : (numeric % 90000000) + 10000000;
  return `SRG-${code}`;
}

function toPatientDisplayId(patient?: { id: string; patientNumber?: string | null } | null): string {
  const number = patient?.patientNumber?.trim();
  if (number) return number;

  const compact = (patient?.id || '').replace(/-/g, '');
  if (!compact) return 'PAT-00000';

  const tail = compact.slice(-8);
  const numeric = Number.parseInt(tail, 16);
  const code = Number.isNaN(numeric) ? 0 : (numeric % 90000) + 10000;
  return `PAT-${code}`;
}

function toEyeLabel(value?: string | null) {
  const v = (value || '').toUpperCase();
  if (v === 'OD' || v === 'RIGHT') return 'OD';
  if (v === 'OS' || v === 'LEFT') return 'OS';
  if (v === 'BOTH') return 'Both';
  return value || '—';
}

function toStatusLabel(value?: string | null) {
  const v = (value || '').toLowerCase();
  if (!v) return 'scheduled';
  if (v === 'pending') return 'scheduled';
  if (v === 'canceled') return 'cancelled';
  return v;
}

export default function SurgeryListPage() {
  const [rows, setRows] = useState<SurgeryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [stats, setStats] = useState({ todaysSurgeries: 0, scheduled: 0, completed: 0, totalProcedures: 0 });

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const typeOptions = useMemo(() => {
    const base = [
      'Cataract Surgery',
      'Refractive Surgery',
      'Retinal Surgery',
      'Glaucoma Surgery',
      'Corneal Surgery',
      'Oculoplastic',
      'Strabismus',
      'Other',
      // Legacy stored values
      'LASIK/PRK',
      'Retinal',
    ];
    const fromRows = Array.from(new Set(rows.map((r) => r.surgeryType).filter(Boolean)));
    return Array.from(new Set([...base, ...fromRows]));
  }, [rows]);

  const displaySurgeryType = useCallback((value?: string | null) => {
    const v = (value || '').trim();
    if (!v) return '—';
    if (v === 'LASIK/PRK') return 'Refractive Surgery';
    if (v === 'Retinal') return 'Retinal Surgery';
    return v;
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (dateFilter) params.set('date', dateFilter);

      const suffix = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/surgeries${suffix}`);
      const body = res.data as SurgeryListResponse;
      setRows(Array.isArray(body.data) ? body.data : []);
      setStats({
        todaysSurgeries: body.stats?.todaysSurgeries ?? 0,
        scheduled: body.stats?.scheduled ?? 0,
        completed: body.stats?.completed ?? 0,
        totalProcedures: body.stats?.totalProcedures ?? 0,
      });
    } catch {
      toast.error('Failed to load surgeries');
      setRows([]);
      setStats({ todaysSurgeries: 0, scheduled: 0, completed: 0, totalProcedures: 0 });
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter, dateFilter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    const t = setTimeout(fetchRows, 250);
    return () => clearTimeout(t);
  }, [search, typeFilter, statusFilter, dateFilter, fetchRows]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, statusFilter, dateFilter, pageSize]);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pagedRows = rows.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  return (
    <div className="w-full min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Eye Surgery</h1>
        <p className="text-slate-600 dark:text-slate-400">Surgical procedures management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl p-5 text-white bg-gradient-to-r from-sky-600 to-cyan-400">
          <CalendarIcon className="absolute right-5 top-5 h-8 w-8 opacity-90" />
          <div className="text-sm font-medium/relaxed">Today's Surgeries</div>
          <div className="mt-3 text-4xl font-bold">{stats.todaysSurgeries}</div>
        </div>
        <div className="relative overflow-hidden rounded-xl p-5 text-white bg-gradient-to-r from-indigo-600 to-violet-500">
          <Clock className="absolute right-5 top-5 h-8 w-8 opacity-90" />
          <div className="text-sm font-medium/relaxed">Scheduled</div>
          <div className="mt-3 text-4xl font-bold">{stats.scheduled}</div>
        </div>
        <div className="relative overflow-hidden rounded-xl p-5 text-white bg-gradient-to-r from-rose-600 to-pink-500">
          <CheckCircle2 className="absolute right-5 top-5 h-8 w-8 opacity-90" />
          <div className="text-sm font-medium/relaxed">Completed</div>
          <div className="mt-3 text-4xl font-bold">{stats.completed}</div>
        </div>
        <div className="relative overflow-hidden rounded-xl p-5 text-white bg-gradient-to-r from-amber-500 to-orange-400">
          <Scissors className="absolute right-5 top-5 h-8 w-8 opacity-90" />
          <div className="text-sm font-medium/relaxed">Total Procedures</div>
          <div className="mt-3 text-4xl font-bold">{stats.totalProcedures}</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/surgery/new?type=cataract"
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <CataractRefIcon className="h-8 w-8" />
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">Cataract</div>
              <div className="text-sm font-normal text-slate-900 dark:text-slate-400">Schedule Surgery</div>
            </div>
          </div>
        </Link>
        <Link
          href="/dashboard/surgery/new?type=refractive"
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <LasikRefIcon className="h-8 w-8" />
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">LASIK/PRK</div>
              <div className="text-sm font-normal text-slate-900 dark:text-slate-400">Refractive procedure</div>
            </div>
          </div>
        </Link>
        <Link
          href="/dashboard/surgery/new?type=retinal"
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <RetinalRefIcon className="h-8 w-8" />
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">Retinal</div>
              <div className="text-sm font-normal text-slate-900 dark:text-slate-400">Vitreoretinal surgery</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Toolbar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_180px_200px_auto] lg:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by patient..."
              className="pl-9 h-11 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {typeOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <CalendarIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-11 pr-9 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50"
              aria-label="Date"
            />
          </div>

          <Button asChild className="h-11 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
            <Link href="/dashboard/surgery/new">
              <Plus className="h-4 w-4" />
              Schedule Surgery
            </Link>
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 dark:bg-slate-900/80 hover:bg-slate-50/80 dark:hover:bg-slate-900/80 border-slate-200 dark:border-slate-800">
              {['PATIENT', 'SURGERY TYPE', 'EYE', 'STATUS', 'SCHEDULED', 'ACTIONS'].map((h) => (
                <TableHead
                  key={h}
                  className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3 px-4 whitespace-nowrap"
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-56 text-center text-slate-500">Loading…</TableCell>
              </TableRow>
            ) : pagedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-56 text-center text-slate-500">No surgeries found.</TableCell>
              </TableRow>
            ) : (
              pagedRows.map((r) => {
                const patientName = r.patient?.fullName?.trim() || 'Unknown Patient';
                const patientId = toPatientDisplayId(r.patient);
                const srg = surgeryCodeFromId(r.id);
                const surgeonName = r.surgeon?.user?.fullName?.trim() || '—';
                const status = toStatusLabel(r.status);

                return (
                  <TableRow key={r.id} className="border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <TableCell className="py-4 px-4">
                      <div className="flex items-center gap-3 min-w-[220px]">
                        <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                          <Eye className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-200 truncate">{patientName}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 truncate">{srg} | ID: {patientId}</div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-4 px-4 text-sm text-slate-700 whitespace-nowrap">
                      {displaySurgeryType(r.surgeryType)}
                    </TableCell>

                    <TableCell className="py-4 px-4 text-sm text-slate-700 whitespace-nowrap">
                      {toEyeLabel(r.eye)}
                    </TableCell>

                    <TableCell className="py-4 px-4">
                      <Badge
                        className={
                          status === 'completed'
                            ? 'rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0 px-3 py-1 text-xs font-semibold'
                            : status === 'cancelled'
                              ? 'rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-0 px-3 py-1 text-xs font-semibold'
                              : 'rounded-full bg-sky-100 dark:bg-sky-900/30 text-[#0EA5E9] dark:text-sky-400 border-0 px-3 py-1 text-xs font-semibold'
                        }
                      >
                        {status}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-4 px-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-200">{formatShortDate(r.date)}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">Dr. {surgeonName}</div>
                    </TableCell>

                    <TableCell className="py-4 px-4 whitespace-nowrap">
                      <Link
                        href={`/dashboard/surgery/${r.id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-[#0EA5E9] hover:text-[#0284C7] hover:underline"
                      >
                        View
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
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
          onLimitChange={(limit) => {
            setPageSize(limit);
            setPage(1);
          }}
          disabled={loading}
          itemLabel="surgeries"
        />
      </div>
    </div>
  );
}
