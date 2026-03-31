'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/axios';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Calendar as CalendarIcon, ChevronLeft, User as UserIcon, Scissors, Search, Clock } from 'lucide-react';

type PatientOption = {
  id: string;
  fullName?: string | null;
  patientNumber?: string | null;
};

type DoctorOption = {
  doctorId: string;
  fullName: string;
};

const LABEL_CN = 'text-xs font-semibold uppercase tracking-wide text-slate-500';

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

const SURGERY_TYPES = [
  'Cataract Surgery',
  'Refractive Surgery',
  'Retinal Surgery',
  'Glaucoma Surgery',
  'Corneal Surgery',
  'Oculoplastic',
  'Strabismus',
  'Other',
] as const;

type SurgeryType = (typeof SURGERY_TYPES)[number];

const PROCEDURES: Record<SurgeryType, string[]> = {
  'Cataract Surgery': ['Phacoemulsification + IOL', 'ECCE + IOL', 'SICS + IOL', 'IOL Exchange', 'Secondary IOL'],
  'Refractive Surgery': ['LASIK', 'PRK', 'SMILE', 'ICL'],
  'Retinal Surgery': ['Vitrectomy', 'Retinal Detachment Repair', 'Membrane Peel', 'Macular Hole Repair'],
  'Glaucoma Surgery': ['Trabeculectomy', 'Tube Shunt', 'MIGS'],
  'Corneal Surgery': ['Corneal Transplant', 'Cross-linking', 'Pterygium Excision'],
  Oculoplastic: ['Blepharoplasty', 'Ptosis Repair', 'DCR'],
  Strabismus: ['Strabismus Repair', 'Botox Injection'],
  Other: ['Other'],
};

const CATARACT_TECHNIQUES = ['Phacoemulsification', 'Femtosecond Laser', 'ECCE', 'SICS'];

function normalizeTypeParam(input: string): SurgeryType | null {
  const raw = (input || '').trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'cataract' || raw === 'cataract surgery') return 'Cataract Surgery';
  if (raw === 'refractive' || raw === 'refractive surgery' || raw === 'lasik' || raw === 'prk' || raw === 'lasik/prk')
    return 'Refractive Surgery';
  if (raw === 'retinal' || raw === 'retinal surgery') return 'Retinal Surgery';
  if (raw === 'glaucoma' || raw === 'glaucoma surgery') return 'Glaucoma Surgery';
  if (raw === 'corneal' || raw === 'corneal surgery') return 'Corneal Surgery';
  if (raw === 'oculoplastic') return 'Oculoplastic';
  if (raw === 'strabismus') return 'Strabismus';
  if (raw === 'other') return 'Other';
  return null;
}

export default function ScheduleSurgeryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [saving, setSaving] = useState(false);

  const [patientQuery, setPatientQuery] = useState('');
  const [patientOpen, setPatientOpen] = useState(false);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [patient, setPatient] = useState<PatientOption | null>(null);

  const [doctors, setDoctors] = useState<DoctorOption[]>([]);

  const [surgeryType, setSurgeryType] = useState<SurgeryType>('Cataract Surgery');
  const [eye, setEye] = useState('OD');
  const [procedure, setProcedure] = useState('');
  const [surgeonId, setSurgeonId] = useState('');
  const [anesthesiaType, setAnesthesiaType] = useState('Topical');

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [operatingRoom, setOperatingRoom] = useState('');

  const [technique, setTechnique] = useState('Phacoemulsification');
  const [iolModel, setIolModel] = useState('');
  const [iolPower, setIolPower] = useState<number | ''>('');
  const [targetRefraction, setTargetRefraction] = useState<number | ''>('');

  const [notes, setNotes] = useState('');

  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const procedureOptions = useMemo(() => {
    return PROCEDURES[surgeryType] || [];
  }, [surgeryType]);

  useEffect(() => {
    const type = searchParams?.get('type') || '';
    const normalized = normalizeTypeParam(type);
    if (normalized) setSurgeryType(normalized);
  }, [searchParams]);

  useEffect(() => {
    setProcedure('');
  }, [surgeryType]);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await api.get('/doctors');
      const list = (res.data || []) as Array<{ doctorId?: unknown; fullName?: unknown }>;
      const formatted = list
        .filter((d) => typeof d.doctorId === 'string' && typeof d.fullName === 'string')
        .map((d) => ({ doctorId: d.doctorId as string, fullName: d.fullName as string }));
      setDoctors(formatted);
    } catch {
      setDoctors([]);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const fetchPatients = useCallback(
    async (q: string) => {
      const query = q.trim();
      if (query.length < 2) {
        setPatientOptions([]);
        return;
      }
      setPatientLoading(true);
      try {
        const params = new URLSearchParams({ search: query, limit: '10' });
        const res = await api.get(`/patients?${params.toString()}`);
        const body = res.data as { data?: unknown };
        const data = Array.isArray((body as any).data) ? ((body as any).data as any[]) : [];
        const formatted: PatientOption[] = data
          .filter((p) => typeof p?.id === 'string')
          .map((p) => ({
            id: p.id as string,
            fullName: typeof p.fullName === 'string' ? p.fullName : null,
            patientNumber: typeof p.patientNumber === 'string' ? p.patientNumber : null,
          }));
        setPatientOptions(formatted);
      } catch {
        setPatientOptions([]);
      } finally {
        setPatientLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const t = setTimeout(() => {
      fetchPatients(patientQuery);
    }, 250);
    return () => clearTimeout(t);
  }, [patientQuery, fetchPatients]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(el)) {
        setPatientOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const showCataractDetails = surgeryType === 'Cataract Surgery';

  const onSubmit = async () => {
    if (!patient?.id) return toast.error('Patient is required');
    if (!procedure.trim()) return toast.error('Procedure is required');
    if (!surgeonId) return toast.error('Surgeon is required');
    if (!date) return toast.error('Date is required');
    if (!time) return toast.error('Time is required');

    setSaving(true);
    try {
      const payload: any = {
        patientId: patient.id,
        surgeryType,
        eye,
        procedure,
        surgeonId,
        anesthesiaType,
        date,
        time,
        operatingRoom: operatingRoom.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (showCataractDetails) {
        payload.cataractDetails = {
          technique,
          iolModel: iolModel.trim() || undefined,
          iolPower: iolPower === '' ? undefined : iolPower,
          targetRefraction: targetRefraction === '' ? undefined : targetRefraction,
        };
      }

      await api.post('/surgeries', payload);
      toast.success('Surgery scheduled');
      router.push('/dashboard/surgery');
    } catch (e: any) {
      const msg = typeof e?.response?.data?.message === 'string' ? e.response.data.message : undefined;
      toast.error(msg || 'Failed to schedule surgery');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Schedule Surgery</h1>
        <p className="text-slate-600">Schedule new eye surgery</p>
      </div>

      <Link href="/dashboard/surgery" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ChevronLeft className="h-4 w-4" />
        Back to Surgeries
      </Link>

      {/* A. Patient Information */}
      <div className="rounded-xl border border-slate-100 bg-white p-6" ref={wrapperRef}>
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <UserIcon className="h-5 w-5 text-[#0EA5E9]" />
          Patient Information
        </div>

        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search patient by name or ID..."
            className="h-11 pl-9"
            value={patientQuery}
            onChange={(e) => {
              setPatientQuery(e.target.value);
              setPatientOpen(true);
            }}
            onFocus={() => setPatientOpen(true)}
          />

          {(patientOpen && (patientLoading || patientOptions.length > 0)) && (
            <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {patientLoading ? (
                <div className="p-3 text-sm text-slate-500">Searching…</div>
              ) : (
                patientOptions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full px-4 py-3 text-left hover:bg-slate-50"
                    onClick={() => {
                      setPatient(p);
                      setPatientQuery(p.fullName?.trim() || '');
                      setPatientOpen(false);
                    }}
                  >
                    <div className="font-medium text-slate-900">{p.fullName || 'Unknown Patient'}</div>
                    <div className="text-sm text-slate-500">ID: {toPatientDisplayId(p)}</div>
                  </button>
                ))
              )}
            </div>
          )}

          {patient && (
            <div className="mt-3 text-sm text-slate-600">
              Selected: <span className="font-semibold text-slate-900">{patient.fullName || 'Unknown Patient'}</span> ({toPatientDisplayId(patient)})
            </div>
          )}
        </div>
      </div>

      {/* B. Surgery Details */}
      <div className="rounded-xl border border-slate-100 bg-white p-6">
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Scissors className="h-5 w-5 text-[#0EA5E9]" />
          Surgery Details
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <div className={LABEL_CN}>Surgery Type</div>
            <Select value={surgeryType} onValueChange={(v) => setSurgeryType(v as SurgeryType)}>
              <SelectTrigger className="mt-2 h-11">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {SURGERY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className={LABEL_CN}>Eye</div>
            <Select value={eye} onValueChange={setEye}>
              <SelectTrigger className="mt-2 h-11">
                <SelectValue placeholder="Select eye" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OD">OD (Right Eye)</SelectItem>
                <SelectItem value="OS">OS (Left Eye)</SelectItem>
                <SelectItem value="BOTH">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className={LABEL_CN}>Procedure</div>
            <Select value={procedure} onValueChange={setProcedure}>
              <SelectTrigger className="mt-2 h-11">
                <SelectValue placeholder="Select procedure" />
              </SelectTrigger>
              <SelectContent>
                {procedureOptions.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <div className={LABEL_CN}>Surgeon</div>
            <Select value={surgeonId} onValueChange={setSurgeonId}>
              <SelectTrigger className="mt-2 h-11">
                <SelectValue placeholder="Select surgeon" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.doctorId} value={d.doctorId}>
                    {d.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className={LABEL_CN}>Anesthesia Type</div>
            <Select value={anesthesiaType} onValueChange={setAnesthesiaType}>
              <SelectTrigger className="mt-2 h-11">
                <SelectValue placeholder="Select anesthesia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Topical">Topical</SelectItem>
                <SelectItem value="Local (Retrobulbar/Peribulbar)">Local (Retrobulbar/Peribulbar)</SelectItem>
                <SelectItem value="General">General</SelectItem>
                <SelectItem value="IV Sedation">IV Sedation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* C. Schedule */}
      <div className="rounded-xl border border-slate-100 bg-white p-6">
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <CalendarIcon className="h-5 w-5 text-[#0EA5E9]" />
          Schedule
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <div className={LABEL_CN}>Date *</div>
            <div className="relative mt-2">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 pr-9" />
              <CalendarIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div>
            <div className={LABEL_CN}>Time *</div>
            <div className="relative mt-2">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11 pr-9" />
              <Clock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div>
            <div className={LABEL_CN}>Operating Room</div>
            <Input
              placeholder="e.g., OR-1"
              value={operatingRoom}
              onChange={(e) => setOperatingRoom(e.target.value)}
              className="mt-2 h-11"
            />
          </div>
        </div>
      </div>

      {/* D. Cataract Surgery Details (Conditional) */}
      <div
        className={`rounded-xl border border-slate-100 bg-white p-6 transition-all duration-200 ${
          showCataractDetails ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none h-0 overflow-hidden p-0 border-0'
        }`}
      >
        {showCataractDetails && (
          <>
            <div className="text-xl font-semibold text-slate-900">Cataract Surgery Details</div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
              <div>
                <div className={LABEL_CN}>Technique</div>
                <Select value={technique} onValueChange={setTechnique}>
                  <SelectTrigger className="mt-2 h-11">
                    <SelectValue placeholder="Select technique" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATARACT_TECHNIQUES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className={LABEL_CN}>IOL Model</div>
                <Input
                  placeholder="e.g., Alcon SN60WF"
                  value={iolModel}
                  onChange={(e) => setIolModel(e.target.value)}
                  className="mt-2 h-11"
                />
              </div>

              <div>
                <div className={LABEL_CN}>IOL Power (D)</div>
                <Input
                  type="number"
                  value={iolPower}
                  onChange={(e) => setIolPower(e.target.value === '' ? '' : Number(e.target.value))}
                  className="mt-2 h-11"
                />
              </div>

              <div>
                <div className={LABEL_CN}>Target Refraction</div>
                <Input
                  type="number"
                  value={targetRefraction}
                  onChange={(e) => setTargetRefraction(e.target.value === '' ? '' : Number(e.target.value))}
                  className="mt-2 h-11"
                />
              </div>
            </div>

          </>
        )}
      </div>

      {/* E. Pre-Operative Notes */}
      <div className="rounded-xl border border-slate-100 bg-white p-6">
        <div className="text-lg font-semibold text-slate-900">Pre-Operative Notes</div>
        <Textarea
          className="mt-3 min-h-[120px]"
          placeholder="Pre-operative instructions, special considerations..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" asChild className="h-11 rounded-xl">
          <Link href="/dashboard/surgery">Cancel</Link>
        </Button>
        <Button
          className="h-11 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
          disabled={saving}
          onClick={onSubmit}
        >
          Schedule Surgery
        </Button>
      </div>
    </div>
  );
}
