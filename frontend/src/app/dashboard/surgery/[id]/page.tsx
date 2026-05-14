'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  FileText,
  Scissors,
  User as UserIcon,
} from 'lucide-react';

type SurgeryDetail = {
  id: string;
  surgeryType: string;
  procedure?: string | null;
  eye?: string | null;
  status?: string | null;
  anesthesiaType?: string | null;
  date: string;
  time?: string | null;
  operatingRoom?: string | null;
  cataractDetails?: {
    technique?: string | null;
    iolModel?: string | null;
    iolPower?: number | null;
    targetRefraction?: number | null;
  } | null;
  notes?: string | null;
  createdAt?: string | null;
  surgeon?: { user?: { fullName?: string | null; email?: string | null } | null } | null;
  patient?: { 
    id: string; 
    fullName?: string | null; 
    phone?: string | null; 
    patientNumber?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    emergencyContactRelationship?: string | null;
  } | null;
};

const LABEL_CN = 'text-xs font-semibold uppercase tracking-wide text-slate-500';

function formatShortDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(d);
}

function toEyeLabel(value?: string | null) {
  const v = (value || '').toUpperCase();
  if (v === 'OD' || v === 'RIGHT') return 'OD (Right Eye)';
  if (v === 'OS' || v === 'LEFT') return 'OS (Left Eye)';
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

export default function SurgeryDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<SurgeryDetail | null>(null);

  const displaySurgeryType = useMemo(() => {
    const v = (row?.surgeryType || '').trim();
    if (!v) return '—';
    if (v === 'LASIK/PRK') return 'Refractive Surgery';
    if (v === 'Retinal') return 'Retinal Surgery';
    return v;
  }, [row?.surgeryType]);

  const fetchRow = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/surgeries/${id}`);
      setRow(res.data as SurgeryDetail);
    } catch (e: any) {
      const msg = typeof e?.response?.data?.message === 'string' ? e.response.data.message : undefined;
      toast.error(msg || 'Failed to load surgery');
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRow();
  }, [fetchRow]);

  if (loading) {
    return <div className="w-full min-w-0 p-4 sm:p-6 lg:p-8 text-sm text-slate-500">Loading…</div>;
  }

  if (!row) {
    return (
      <div className="w-full min-w-0 p-4 sm:p-6 lg:p-8 space-y-4">
        <Button variant="ghost" className="h-10 rounded-xl" onClick={() => router.push('/dashboard/surgery')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Surgeries
        </Button>
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-600">Surgery not found.</div>
      </div>
    );
  }

  const patientName = row.patient?.fullName?.trim() || 'Unknown Patient';
  const patientId = toPatientDisplayId(row.patient);
  const surgeonName = row.surgeon?.user?.fullName?.trim() || '—';
  const status = toStatusLabel(row.status);

  return (
    <div className="w-full min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Surgery Details</h1>
          <p className="text-slate-600">{patientName}</p>
        </div>
        <Badge className="rounded-full bg-sky-100 text-[#0EA5E9] border-0 px-3 py-1 text-xs">{status}</Badge>
      </div>

      <Link href="/dashboard/surgery" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
        Back to Surgeries
      </Link>

      {/* Patient Information */}
      <div className="rounded-xl border border-slate-100 bg-white p-6">
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <UserIcon className="h-5 w-5 text-violet-600" />
          Patient Information
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <div className={LABEL_CN}>Patient</div>
            <div className="mt-1 font-semibold text-slate-900">{patientName}</div>
          </div>
          <div>
            <div className={LABEL_CN}>Patient ID</div>
            <div className="mt-1 font-semibold text-slate-900">{patientId}</div>
          </div>
          <div>
            <div className={LABEL_CN}>Phone</div>
            <div className="mt-1 font-semibold text-slate-900">{row.patient?.phone?.trim() || '—'}</div>
          </div>
        </div>

        {(row.patient?.emergencyContactName || row.patient?.emergencyContactPhone) && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className={LABEL_CN + ' mb-3 text-[#0EA5E9]'}>Emergency Contact</div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div>
                <div className={LABEL_CN}>Contact Name</div>
                <div className="mt-1 font-semibold text-slate-900">{row.patient?.emergencyContactName || '—'}</div>
              </div>
              <div>
                <div className={LABEL_CN}>Contact Phone</div>
                <div className="mt-1 font-semibold text-slate-900">{row.patient?.emergencyContactPhone || '—'}</div>
              </div>
              <div>
                <div className={LABEL_CN}>Relationship</div>
                <div className="mt-1 font-semibold text-slate-900">{row.patient?.emergencyContactRelationship || '—'}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Surgery Details */}
      <div className="rounded-xl border border-slate-100 bg-white p-6">
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Scissors className="h-5 w-5 text-violet-600" />
          Surgery Details
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <div className={LABEL_CN}>Surgery Type</div>
            <div className="mt-1 font-semibold text-slate-900">{displaySurgeryType}</div>
          </div>
          <div>
            <div className={LABEL_CN}>Eye</div>
            <div className="mt-1 font-semibold text-slate-900">{toEyeLabel(row.eye)}</div>
          </div>
          <div>
            <div className={LABEL_CN}>Procedure</div>
            <div className="mt-1 font-semibold text-slate-900">{row.procedure?.trim() || '—'}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <div className={LABEL_CN}>Surgeon</div>
            <div className="mt-1 font-semibold text-slate-900">{surgeonName}</div>
          </div>
          <div>
            <div className={LABEL_CN}>Anesthesia Type</div>
            <div className="mt-1 font-semibold text-slate-900">{row.anesthesiaType?.trim() || '—'}</div>
          </div>
          <div />
        </div>
      </div>

      {/* Schedule */}
      <div className="rounded-xl border border-slate-100 bg-white p-6">
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <CalendarIcon className="h-5 w-5 text-violet-600" />
          Schedule
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <div className={LABEL_CN}>Date</div>
            <div className="mt-1 font-semibold text-slate-900">{formatShortDate(row.date)}</div>
          </div>
          <div>
            <div className={LABEL_CN}>Time</div>
            <div className="mt-1 font-semibold text-slate-900">{row.time || '—'}</div>
          </div>
          <div>
            <div className={LABEL_CN}>Operating Room</div>
            <div className="mt-1 font-semibold text-slate-900">{row.operatingRoom?.trim() || '—'}</div>
          </div>
        </div>
      </div>

      {/* Cataract Surgery Details */}
      <div className="rounded-xl border border-slate-100 bg-white p-6">
        <div className="text-xl font-semibold text-slate-900">Cataract Surgery Details</div>

        {row.cataractDetails ? (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div>
              <div className={LABEL_CN}>Technique</div>
              <div className="mt-1 font-semibold text-slate-900">{row.cataractDetails.technique || '—'}</div>
            </div>
            <div>
              <div className={LABEL_CN}>IOL Model</div>
              <div className="mt-1 font-semibold text-slate-900">{row.cataractDetails.iolModel || '—'}</div>
            </div>
            <div>
              <div className={LABEL_CN}>IOL Power (D)</div>
              <div className="mt-1 font-semibold text-slate-900">
                {row.cataractDetails.iolPower === null || row.cataractDetails.iolPower === undefined ? '—' : row.cataractDetails.iolPower}
              </div>
            </div>
            <div>
              <div className={LABEL_CN}>Target Refraction</div>
              <div className="mt-1 font-semibold text-slate-900">
                {row.cataractDetails.targetRefraction === null || row.cataractDetails.targetRefraction === undefined
                  ? '—'
                  : row.cataractDetails.targetRefraction}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-500">—</div>
        )}
      </div>

      {/* Pre-Operative Assessment */}
      <div className="rounded-xl border border-slate-100 bg-white p-6">
        <div className="text-xl font-semibold text-slate-900">Pre-Operative Assessment</div>
        <div className="mt-3 text-sm text-slate-500">—</div>
      </div>

      {/* Operative Notes */}
      <div className="rounded-xl border border-slate-100 bg-white p-6">
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <FileText className="h-5 w-5 text-violet-600" />
          Operative Notes
        </div>
        <div className="mt-3 text-slate-700 whitespace-pre-wrap">{row.notes?.trim() || '—'}</div>
      </div>

      <div className="flex items-center justify-end text-xs text-slate-500">
        Created: {formatShortDate(row.createdAt || null)}
      </div>
    </div>
  );
}
