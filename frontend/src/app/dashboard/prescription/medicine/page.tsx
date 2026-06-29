'use client';

// Medicine prescriptions module (pharmacy medication prescriptions)

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/axios';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ServerPagination } from '@/components/dashboard/server-pagination';
import { OpticalKpiCard } from '../../optical-shop/_components/optical-kpi-card';
import { Search, MoreVertical, Trash2, FileText, CheckCircle2, Clock3, CalendarDays, ShoppingCart, Eye, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type MedicinePrescription = {
  id: string;
  itemType: 'PHARMACY' | string;
  itemId?: string | null;
  itemName?: string | null;
  quantity?: number | null;
  instructions?: string | null;
  createdAt?: string;
  appointmentId?: string | null;
  appointment?: {
    bookingNumber?: string | null;
    patient?: { id: string; fullName?: string | null; phone?: string | null; patientNumber?: string | null } | null;
  } | null;
  clinicalExam?: {
    id: string;
    diagnosis?: string | null;
  } | null;
  eyeExam?: {
    id: string;
    diagnosis?: string | null;
    patient?: { id: string; fullName?: string | null; phone?: string | null; patientNumber?: string | null } | null;
  } | null;
  status: 'PENDING' | 'DISPENSED';
  billings?: any[];
};

type PharmacyItem = {
  id: string;
  itemName: string;
  genericName?: string | null;
  itemType?: string | null;
  strength?: string | null;
  sellingPrice?: number | string | null;
};

function formatDate(iso?: string) {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function isToday(iso?: string) {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function medicineLabel(item?: PharmacyItem | null) {
  if (!item) return 'Unknown Medicine';
  return item.genericName || item.itemName;
}

type ParsedInstruction = {
  dosage: string;
  frequency: string;
  duration: string;
  eye: string;
  notes: string;
};

type DerivedStatus = 'ACTIVE' | 'COMPLETED';

function cleanValue(value?: string | null) {
  const text = (value || '').trim();
  if (!text || text.toLowerCase() === 'n/a') return '—';
  return text;
}

function extractInstructionField(pattern: RegExp, raw: string) {
  const match = raw.match(pattern);
  return cleanValue(match?.[1] || '');
}

function parseInstruction(raw?: string | null, fallbackStrength?: string | null): ParsedInstruction {
  const text = (raw || '').trim();

  if (!text) {
    return {
      dosage: cleanValue(fallbackStrength),
      frequency: '—',
      duration: '—',
      eye: '—',
      notes: '—',
    };
  }

  const dosage = extractInstructionField(/(?:^|\||;)\s*Dosage\s*[:=-]\s*([^|;]+)/i, text);
  const frequency = extractInstructionField(/(?:^|\||;)\s*Frequency\s*[:=-]\s*([^|;]+)/i, text);
  const duration = extractInstructionField(/(?:^|\||;)\s*Duration\s*[:=-]\s*([^|;]+)/i, text);
  const eye = extractInstructionField(/(?:^|\||;)\s*Eye\s*[:=-]\s*([^|;]+)/i, text);
  const notes = extractInstructionField(/(?:^|\||;)\s*(?:Notes?|Instructions?)\s*[:=-]\s*(.+)$/i, text);

  const inferredFrequency = cleanValue(text.match(/(once daily|twice daily|thrice daily|daily|every\s+\d+\s*hours?|bid|tid|qid)/i)?.[1] || '');
  const inferredDuration = cleanValue(text.match(/(\d+\s*(?:day|days|week|weeks|month|months))/i)?.[1] || '');
  const inferredEye = cleanValue(text.match(/\b(OD|OS|OU|right eye|left eye|both eyes?)\b/i)?.[1] || '');

  return {
    dosage: dosage !== '—' ? dosage : cleanValue(fallbackStrength),
    frequency: frequency !== '—' ? frequency : inferredFrequency,
    duration: duration !== '—' ? duration : inferredDuration,
    eye: eye !== '—' ? eye.toUpperCase() : inferredEye.toUpperCase() || '—',
    notes,
  };
}

function parseDurationDays(durationText: string): number | null {
  const text = durationText.trim().toLowerCase();
  if (!text || text === '—') return null;

  const match = text.match(/(\d+)\s*(day|days|week|weeks|month|months)/i);
  if (!match) return null;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const unit = match[2].toLowerCase();
  if (unit.startsWith('day')) return amount;
  if (unit.startsWith('week')) return amount * 7;
  if (unit.startsWith('month')) return amount * 30;
  return null;
}

export default function MedicinePrescriptionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<MedicinePrescription[]>([]);
  const [items, setItems] = useState<PharmacyItem[]>([]);
  const [itemMap, setItemMap] = useState<Record<string, PharmacyItem>>({});

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dispenseFilter, setDispenseFilter] = useState<'all' | 'PENDING' | 'DISPENSED'>('all');
  const [viewAll, setViewAll] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const view = searchParams.get('view');
    const status = (searchParams.get('status') || '').toUpperCase();
    if (view === 'all') setViewAll(true);
    if (status === 'PENDING' || status === 'DISPENSED') setDispenseFilter(status);
  }, [searchParams]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      if (!viewAll && !dateFrom && !dateTo) {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        params.date = `${year}-${month}-${day}`;
      }
      if (dispenseFilter !== 'all') params.status = dispenseFilter;
      const res = await api.get('/prescription-items', { params });
      setRows(Array.isArray(res.data) ? (res.data as MedicinePrescription[]) : []);
    } catch {
      toast.error('Failed to load medicine prescriptions');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo, viewAll, dispenseFilter]);

  const fetchItems = useCallback(async () => {
    try {
      const res = await api.get('/inventory/pharmacy', { params: { page: 1, limit: 1000 } });
      const body = res.data as { data?: PharmacyItem[] } | PharmacyItem[];
      const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
      setItems(list);
      const map: Record<string, PharmacyItem> = {};
      for (const item of list) {
        map[item.id] = item;
      }
      setItemMap(map);
    } catch {
      setItems([]);
      setItemMap({});
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchRows();
    }, 250);
    return () => clearTimeout(t);
  }, [fetchRows]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this medicine prescription?')) return;
    try {
      await api.delete(`/prescription-items/${id}`);
      toast.success('Medicine prescription deleted');
      await fetchRows();
    } catch {
      toast.error('Failed to delete medicine prescription');
    }
  }, [fetchRows]);
  
  const handleDispenseClick = useCallback((presc: any) => {
    router.push(`/dashboard/billing/new?serviceType=PHARMACY&prescriptionId=${presc.row.id}`);
  }, [router]);

  const medicineTypes = useMemo(() => {
    const values = new Set<string>();
    for (const item of items) {
      const t = (item.itemType || '').trim();
      if (t) values.add(t);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const normalizedRows = useMemo(() => {
    return rows.map((row) => {
      const item = row.itemId ? itemMap[row.itemId] : (row.itemName ? { id: '', itemName: row.itemName } as PharmacyItem : undefined);
      const structured = parseInstruction(row.instructions, item?.strength);
      const hasRequiredFields = [structured.dosage, structured.frequency, structured.duration, structured.eye].every((v) => v !== '—');
      const durationDays = parseDurationDays(structured.duration);

      let status: DerivedStatus = 'ACTIVE';
      if (hasRequiredFields && durationDays != null) {
        const createdAtMs = new Date(row.createdAt || 0).getTime();
        if (Number.isFinite(createdAtMs) && createdAtMs > 0) {
          const endAtMs = createdAtMs + durationDays * 24 * 60 * 60 * 1000;
          status = endAtMs < Date.now() ? 'COMPLETED' : 'ACTIVE';
        }
      }

      return {
        row,
        item,
        structured,
        status,
        patientId: row.appointment?.patient?.id || row.eyeExam?.patient?.id,
        patientName: row.appointment?.patient?.fullName || row.eyeExam?.patient?.fullName || 'Unknown',
      };
    });
  }, [rows, itemMap]);

  const filteredRows = useMemo(() => {
    const byType = typeFilter === 'all'
      ? normalizedRows
      : normalizedRows.filter(({ item }) => {
          const t = (item?.itemType || '').trim();
          return t === typeFilter;
        });

    const byStatus = statusFilter === 'all'
      ? byType
      : byType.filter(({ status }) => status === statusFilter);

    return [...byStatus].sort((a, b) => {
      const ad = new Date(a.row.createdAt || 0).getTime();
      const bd = new Date(b.row.createdAt || 0).getTime();
      return bd - ad;
    });
  }, [normalizedRows, typeFilter, statusFilter]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, typeFilter, statusFilter, dispenseFilter, pageSize]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const stats = useMemo(() => {
    const active = filteredRows.filter(({ status }) => status === 'ACTIVE').length;
    const completed = filteredRows.filter(({ status }) => status === 'COMPLETED').length;
    const issuedToday = filteredRows.filter(({ row }) => isToday(row.createdAt)).length;
    return { active, completed, issuedToday };
  }, [filteredRows]);

  const statCards = useMemo(() => ([
    { title: 'Total Prescriptions', value: total, icon: FileText, tone: 'blue' as const },
    { title: 'Active', value: stats.active, icon: Clock3, tone: 'emerald' as const },
    { title: 'Completed', value: stats.completed, icon: CheckCircle2, tone: 'blue' as const },
    { title: 'Issued', value: stats.issuedToday, icon: CalendarDays, tone: 'rose' as const },
  ]), [total, stats]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={10} className="h-24 text-center text-sm text-slate-500">Loading medicine prescriptions...</TableCell>
        </TableRow>
      );
    }

    if (pagedRows.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={10} className="h-24 text-center text-sm text-slate-500">No medicine prescriptions found</TableCell>
        </TableRow>
      );
    }

    return pagedRows.map(({ row, item, structured, patientId, patientName, status }) => {
      const statusText = status === 'COMPLETED' ? 'completed' : 'active';
      return (
      <TableRow key={row.id} className="border-slate-100 dark:border-slate-800">
        <TableCell className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{patientName}</span>
            <Badge variant="outline" className="w-fit font-mono text-[9px] text-slate-500 border-slate-200 bg-slate-50/50 dark:bg-slate-900/50 dark:border-slate-800">
              {row.appointment?.patient?.patientNumber || row.eyeExam?.patient?.patientNumber || 'PAT-PENDING'}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="px-4 py-3">
          <div className="text-sm font-normal text-slate-900 dark:text-slate-100">{medicineLabel(item)}</div>
          <div className="text-xs text-slate-400 font-normal">{item?.strength || item?.itemType || 'General'}</div>
        </TableCell>
        <TableCell className="px-4 py-3 text-sm font-normal text-slate-600 dark:text-slate-300">{structured.dosage}</TableCell>
        <TableCell className="px-4 py-3 text-sm font-normal text-slate-600 dark:text-slate-300">{structured.frequency}</TableCell>
        <TableCell className="px-4 py-3 text-sm font-normal text-slate-600 dark:text-slate-300">{structured.duration}</TableCell>
        <TableCell className="px-4 py-3 text-sm font-normal text-slate-600 dark:text-slate-300 uppercase">{structured.eye}</TableCell>
        <TableCell className="px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {statusText}
          </span>
        </TableCell>
        <TableCell className="px-4 py-3 text-sm font-normal text-slate-600 dark:text-slate-300">{row.quantity ?? 0}</TableCell>
        <TableCell className="px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {row.status === 'DISPENSED' || (row.billings && row.billings.length > 0) ? 'DONE' : 'DUE'}
          </span>
        </TableCell>
        <TableCell className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-3">
              <Link 
                 href={`/dashboard/prescription/medicine/${row.id}`}
                 className="text-sm font-medium text-[#0EA5E9] hover:underline"
               >
                 View
               </Link>
              <Link 
                href={`/dashboard/prescription/medicine/${row.id}/edit`}
                className="text-sm font-medium text-emerald-600 hover:underline"
              >
                Edit
              </Link>
 
             {row.status !== 'DISPENSED' && (!row.billings || row.billings.length === 0) && (
                <Button
                   size="sm"
                   onClick={() => void handleDispenseClick({ row, item, patientName })}
                   className="h-7 px-3 bg-[#0EA5E9] hover:bg-[#0c96d4] text-white text-[11px] font-bold rounded-md shadow-sm"
                 >
                   Sell
                 </Button>
             )}
             
             <div className="flex items-center gap-1">
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => void handleDelete(row.id)}
                      className="text-red-600 focus:text-red-600"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
             </div>
          </div>
        </TableCell>
      </TableRow>
    );
    });
  }, [loading, pagedRows, handleDelete, handleDispenseClick]);

  return (
    <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Medicine Prescriptions</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage medicine prescriptions with clear treatment details</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient, medicine..."
            className="h-10 pl-9 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50"
          />
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-10 w-full sm:w-[160px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {medicineTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dispenseFilter} onValueChange={(v) => setDispenseFilter(v as 'all' | 'PENDING' | 'DISPENSED')}>
            <SelectTrigger className="h-10 w-full sm:w-[160px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
              <SelectValue placeholder="All dispense" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dispense</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="DISPENSED">Dispensed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-full sm:w-[160px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ title, value, icon, tone }) => (
          <OpticalKpiCard key={title} title={title} value={value} icon={icon} tone={tone} />
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 dark:bg-slate-900/80 hover:bg-slate-50/80 dark:hover:bg-slate-900/80 border-slate-200 dark:border-slate-800">
              <TableHead className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3 px-4 whitespace-nowrap">PATIENT & ID</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3 px-4 whitespace-nowrap">MEDICINE</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3 px-4 whitespace-nowrap">DOSAGE</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3 px-4 whitespace-nowrap">FREQ</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3 px-4 whitespace-nowrap">DUR</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3 px-4 whitespace-nowrap">EYE</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3 px-4 whitespace-nowrap">STATUS</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3 px-4 whitespace-nowrap">QTY</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3 px-4 whitespace-nowrap">DISPENSE</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider py-3 px-4 text-right whitespace-nowrap">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{content}</TableBody>
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
          itemLabel="prescriptions"
        />
      </div>


    </div>
  );
}
