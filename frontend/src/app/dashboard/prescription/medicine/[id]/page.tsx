'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

type MedicinePrescription = {
  id: string;
  itemId?: string | null;
  quantity?: number | null;
  instructions?: string | null;
  createdAt?: string;
  appointment?: {
    patient?: { id: string; fullName?: string | null; phone?: string | null } | null;
  } | null;
  eyeExam?: {
    patient?: { id: string; fullName?: string | null; phone?: string | null } | null;
  } | null;
};

type PharmacyItem = {
  id: string;
  itemName: string;
  genericName?: string | null;
  itemType?: string | null;
  strength?: string | null;
};

type StructuredInstruction = {
  dosage: string;
  frequency: string;
  duration: string;
  eye: string;
  notes: string;
};

function cleanValue(value?: string | null) {
  const text = (value || '').trim();
  if (!text || text.toLowerCase() === 'n/a') return '—';
  return text;
}

function extractInstructionField(pattern: RegExp, raw: string) {
  const match = raw.match(pattern);
  return cleanValue(match?.[1] || '');
}

function parseInstruction(raw?: string | null, fallbackStrength?: string | null): StructuredInstruction {
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

  return {
    dosage,
    frequency,
    duration,
    eye,
    notes,
  };
}

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

function medicineLabel(item?: PharmacyItem | null) {
  if (!item) return 'Unknown Medicine';
  return item.genericName || item.itemName;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{value || '—'}</p>
    </div>
  );
}

export default function MedicinePrescriptionDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id || '';

  const [row, setRow] = useState<MedicinePrescription | null>(null);
  const [item, setItem] = useState<PharmacyItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    let mounted = true;
    setLoading(true);

    const load = async () => {
      try {
        const res = await api.get(`/prescription-items/${id}`);
        const data = res.data as MedicinePrescription;

        let resolvedItem: PharmacyItem | null = null;
        if (data.itemId) {
          const inv = await api.get('/inventory/pharmacy', { params: { page: 1, limit: 1000 } });
          const body = inv.data as { data?: PharmacyItem[] } | PharmacyItem[];
          const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
          resolvedItem = list.find((i) => i.id === data.itemId) || null;
        }

        if (mounted) {
          setRow(data);
          setItem(resolvedItem);
        }
      } catch {
        toast.error('Failed to load medicine prescription');
        if (mounted) router.push('/dashboard/prescription/medicine');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [id, router]);

  const parsed = useMemo(() => parseInstruction(row?.instructions, item?.strength), [row?.instructions, item?.strength]);
  const patient = row?.appointment?.patient || row?.eyeExam?.patient || null;

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading medicine prescription...</div>;
  if (!row) return <div className="p-8 text-sm text-slate-500">Medicine prescription not found.</div>;

  return (
    <div className="w-full min-w-0 space-y-6 p-4 sm:p-5 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Medicine Prescription</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review prescription details and treatment instructions</p>
      </div>

      <Link href="/dashboard/prescription/medicine" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
        Back to Medicine Prescriptions
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Patient Information Section */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
          <h2 className="mb-6 text-lg font-semibold text-slate-900 dark:text-slate-100">Patient Information</h2>
          <div className="space-y-5">
            <Field label="Patient Name" value={patient?.fullName || '—'} />
            <Field label="Phone Number" value={patient?.phone || '—'} />
            <div className="pt-2">
               <Link href={`/dashboard/patients?view=${patient?.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                 View Patient Profile {"->"}
               </Link>
            </div>
          </div>
        </div>

        {/* Prescription Metadata Section */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
          <h2 className="mb-6 text-lg font-semibold text-slate-900 dark:text-slate-100">Prescription Info</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Prescribed Date" value={formatDate(row.createdAt)} />
            <Field label="Status" value={row.quantity ? 'Active' : 'N/A'} />
            <Field label="Quantity" value={String(row.quantity ?? 0)} />
          </div>
        </div>
      </div>

      {/* Treatment Details Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
        <h2 className="mb-6 text-lg font-semibold text-slate-900 dark:text-slate-100">Treatment Details</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Medicine" value={medicineLabel(item)} />
          <Field label="Type" value={item?.itemType || 'General'} />
          <Field label="Strength" value={item?.strength || '—'} />
          <Field label="Dosage" value={parsed.dosage} />
          <Field label="Frequency" value={parsed.frequency} />
          <Field label="Duration" value={parsed.duration} />
          <Field label="Eye" value={parsed.eye} />
        </div>

        {parsed.notes !== '—' && (
          <div className="mt-8 rounded-lg border border-slate-100 bg-slate-50/50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            <span className="font-bold text-slate-900 dark:text-slate-100">Notes:</span> {parsed.notes}
          </div>
        )}
      </div>
    </div>
  );
}
