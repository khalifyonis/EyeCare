'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft } from 'lucide-react';

type MedicinePrescription = {
  id: string;
  clinicalExamId?: string | null;
  eyeExamId?: string | null;
  itemId?: string | null;
  quantity?: number | null;
  instructions?: string | null;
};

type EyeExamOption = {
  id: string;
  diagnosis?: string | null;
  doctor?: { user?: { fullName?: string | null } | null } | null;
  appointment?: {
    bookingNumber?: string | null;
    patient?: { id: string; fullName?: string | null } | null;
  } | null;
  patient?: { id: string; fullName?: string | null } | null;
};

type PharmacyItem = {
  id: string;
  itemName: string;
  genericName?: string | null;
  itemType?: string | null;
  strength?: string | null;
  stockQuantity?: number | null;
};

type MedicinePrescriptionFormProps = {
  mode: 'create' | 'edit';
  id?: string;
  preselectedExamId?: string;
};

type StructuredInstruction = {
  dosage: string;
  frequency: string;
  duration: string;
  eye: string;
  notes: string;
};

const LABEL_CN = 'text-[12px] font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-200';

const EYE_OPTIONS = [
  { value: 'OD', label: 'OD (Right Eye)' },
  { value: 'OS', label: 'OS (Left Eye)' },
  { value: 'OU', label: 'OU (Both Eyes)' },
] as const;

function medicineLabel(item: PharmacyItem) {
  return item.genericName || item.itemName;
}

function extractField(pattern: RegExp, text: string) {
  const match = text.match(pattern);
  return match?.[1]?.trim() || '';
}

function parseStructuredInstruction(raw?: string | null): StructuredInstruction {
  const text = (raw || '').trim();
  if (!text) return { dosage: '', frequency: '', duration: '', eye: '', notes: '' };

  return {
    dosage: extractField(/(?:^|\||;)\s*Dosage\s*[:=-]\s*([^|;]+)/i, text),
    frequency: extractField(/(?:^|\||;)\s*Frequency\s*[:=-]\s*([^|;]+)/i, text),
    duration: extractField(/(?:^|\||;)\s*Duration\s*[:=-]\s*([^|;]+)/i, text),
    eye: extractField(/(?:^|\||;)\s*Eye\s*[:=-]\s*([^|;]+)/i, text),
    notes: extractField(/(?:^|\||;)\s*(?:Notes?|Instructions?)\s*[:=-]\s*(.+)$/i, text),
  };
}

function buildStructuredInstruction({ dosage, frequency, duration, eye, notes }: StructuredInstruction) {
  const chunks = [
    `Dosage: ${dosage.trim() || 'N/A'}`,
    `Frequency: ${frequency.trim() || 'N/A'}`,
    `Duration: ${duration.trim() || 'N/A'}`,
    `Eye: ${eye.trim() || 'N/A'}`,
  ];

  if (notes.trim()) chunks.push(`Notes: ${notes.trim()}`);
  return chunks.join(' | ');
}

function normalizeEyeValue(raw?: string | null): string {
  const value = (raw || '').trim().toUpperCase();
  if (!value) return '';
  if (value === 'OD' || value === 'RIGHT EYE') return 'OD';
  if (value === 'OS' || value === 'LEFT EYE') return 'OS';
  if (value === 'OU' || value === 'BOTH EYES' || value === 'BOTH EYE') return 'OU';
  return value;
}

export default function MedicinePrescriptionForm({ mode, id, preselectedExamId }: MedicinePrescriptionFormProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);

  const [eyeExams, setEyeExams] = useState<EyeExamOption[]>([]);
  const [items, setItems] = useState<PharmacyItem[]>([]);

  const [examId, setExamId] = useState(preselectedExamId || '');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');
  const [eye, setEye] = useState('');
  const [notes, setNotes] = useState('');

  const fetchEyeExams = useCallback(async () => {
    try {
      const res = await api.get('/eye-examinations', { params: { limit: 300 } });
      const body = res.data as { data?: EyeExamOption[] } | EyeExamOption[];
      const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
      setEyeExams(list);
    } catch {
      setEyeExams([]);
    }
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const res = await api.get('/inventory/pharmacy', { params: { page: 1, limit: 1000 } });
      const body = res.data as { data?: PharmacyItem[] } | PharmacyItem[];
      const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
      setItems(list);
    } catch {
      setItems([]);
    }
  }, []);

  const fetchRow = useCallback(async () => {
    if (mode !== 'edit' || !id) return;
    setLoading(true);

    try {
      const res = await api.get(`/prescription-items/${id}`);
      const row = res.data as MedicinePrescription;

      setExamId(row.eyeExamId || row.clinicalExamId || preselectedExamId || '');
      setItemId(row.itemId || '');
      setQuantity(String(row.quantity || 1));

      const parsed = parseStructuredInstruction(row.instructions);
      setDosage(parsed.dosage);
      setFrequency(parsed.frequency);
      setDuration(parsed.duration);
      setEye(normalizeEyeValue(parsed.eye));
      setNotes(parsed.notes);
    } catch {
      toast.error('Failed to load prescription');
      router.push('/dashboard/prescription/medicine');
    } finally {
      setLoading(false);
    }
  }, [mode, id, preselectedExamId, router]);

  useEffect(() => {
    void fetchEyeExams();
    void fetchItems();
    void fetchRow();
  }, [fetchEyeExams, fetchItems, fetchRow]);

  const selectedItem = useMemo(() => items.find((it) => it.id === itemId) || null, [items, itemId]);

  const onSave = async () => {
    if (!examId) {
      toast.error('Please select an eye examination');
      return;
    }

    if (!itemId) {
      toast.error('Please select a medicine');
      return;
    }

    const qty = Number(quantity || '0');
    if (!Number.isInteger(qty) || qty < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    const payload = {
      examId,
      itemType: 'PHARMACY',
      itemId,
      quantity: qty,
      instructions: buildStructuredInstruction({ dosage, frequency, duration, eye, notes }),
    };

    setSaving(true);
    try {
      if (mode === 'edit' && id) {
        await api.put(`/prescription-items/${id}`, payload);
        toast.success('Medicine prescription updated');
      } else {
        await api.post('/prescription-items', payload);
        toast.success('Medicine prescription created');
      }
      router.push('/dashboard/prescription/medicine');
    } catch {
      toast.error('Failed to save medicine prescription');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading prescription...</div>;

  return (
    <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {mode === 'edit' ? 'Edit Medicine Prescription' : 'New Medicine Prescription'}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {mode === 'edit' ? 'Update medicine prescription details' : 'Create a medicine prescription from eye examination'}
        </p>
      </div>

      <Link href="/dashboard/prescription/medicine" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ChevronLeft className="h-4 w-4" />
        Back to Medicine Prescriptions
      </Link>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 sm:p-6 space-y-5 shadow-sm">
        <div>
          <label className={LABEL_CN}>Eye Examination</label>
          <Select value={examId} onValueChange={setExamId}>
            <SelectTrigger className="mt-1 h-11 rounded-lg border-slate-200 dark:border-slate-800 text-sm font-normal text-slate-600 dark:text-slate-300">
              <SelectValue placeholder="Select eye examination" />
            </SelectTrigger>
            <SelectContent>
              {eyeExams.map((exam) => {
                const patient = exam.patient?.fullName || exam.appointment?.patient?.fullName || 'Unknown';
                const doctor = exam.doctor?.user?.fullName || 'Unknown doctor';
                return (
                  <SelectItem key={exam.id} value={exam.id}>
                    {patient} - {doctor}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className={LABEL_CN}>Medicine</label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger className="mt-1 h-11 rounded-lg border-slate-200 dark:border-slate-800 text-sm font-normal text-slate-600 dark:text-slate-300">
                <SelectValue placeholder="Select medicine" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {medicineLabel(item)}{item.strength ? ` (${item.strength})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className={LABEL_CN}>Quantity</label>
            <Input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 h-11 rounded-lg border-slate-200 dark:border-slate-800 text-sm font-normal text-slate-600 dark:text-slate-300"
              inputMode="numeric"
            />
          </div>
        </div>

        {selectedItem && (
          <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 p-3 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-800 dark:text-slate-100">Selected:</span> {medicineLabel(selectedItem)}
            {selectedItem.itemType ? ` • ${selectedItem.itemType}` : ''}
            {selectedItem.strength ? ` • ${selectedItem.strength}` : ''}
            {typeof selectedItem.stockQuantity === 'number' ? ` • Stock: ${selectedItem.stockQuantity}` : ''}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className={LABEL_CN}>Dosage</label>
            <Input value={dosage} onChange={(e) => setDosage(e.target.value)} className="mt-1 h-11 rounded-lg border-slate-200 dark:border-slate-800 text-sm font-normal text-slate-600 dark:text-slate-300" placeholder="0.5%" />
          </div>
          <div>
            <label className={LABEL_CN}>Frequency</label>
            <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} className="mt-1 h-11 rounded-lg border-slate-200 dark:border-slate-800 text-sm font-normal text-slate-600 dark:text-slate-300" placeholder="Twice daily" />
          </div>
          <div>
            <label className={LABEL_CN}>Duration</label>
            <Input value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1 h-11 rounded-lg border-slate-200 dark:border-slate-800 text-sm font-normal text-slate-600 dark:text-slate-300" placeholder="10 days" />
          </div>
          <div>
            <label className={LABEL_CN}>Eye</label>
            <Select value={eye || '__none__'} onValueChange={(v) => setEye(v === '__none__' ? '' : v)}>
              <SelectTrigger className="mt-1 h-11 rounded-lg border-slate-200 dark:border-slate-800 text-sm font-normal text-slate-600 dark:text-slate-300">
                <SelectValue placeholder="Select eye" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select eye</SelectItem>
                {EYE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
                {eye && !EYE_OPTIONS.some((option) => option.value === eye.toUpperCase()) && (
                  <SelectItem value={eye}>{eye}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className={LABEL_CN}>Notes</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 min-h-[110px] rounded-lg border-slate-200 dark:border-slate-800 text-sm font-normal text-slate-600 dark:text-slate-300" placeholder="Additional advice for patient" />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/prescription/medicine')} disabled={saving} className="h-10 rounded-lg border-slate-200 dark:border-slate-700">
            Cancel
          </Button>
          <Button onClick={() => void onSave()} disabled={saving} className="h-10 rounded-lg bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold px-5">
            {saving ? 'Saving...' : mode === 'edit' ? 'Update Prescription' : 'Create Prescription'}
          </Button>
        </div>
      </div>
    </div>
  );
}
