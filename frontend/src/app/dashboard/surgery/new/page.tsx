'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Calendar as CalendarIcon, ChevronLeft, User as UserIcon, Scissors, Search, Clock, AlertCircle, Pill, X, PlusCircle } from 'lucide-react';

type MedicationItem = {
  itemId: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  eye: 'OD' | 'OS' | 'OU' | 'NONE';
  quantity?: number;
  notes?: string;
  category?: string;
};

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

  const [technique, setTechnique] = useState('Phacoemulsification');
  const [iolModel, setIolModel] = useState('');
  const [iolPower, setIolPower] = useState<number | ''>('');
  const [targetRefraction, setTargetRefraction] = useState<number | ''>('');

  const [notes, setNotes] = useState('');
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  // Prescription states
  const [medicines, setMedicines] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<MedicationItem[]>([]);

  const emptyMedication = (): MedicationItem => ({ itemId: '', name: '', dosage: '', frequency: '', duration: '', eye: 'OU' });

  const updateMedication = (index: number, key: keyof MedicationItem, value: any) => {
    setPrescriptions((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item))
    );
  };

  const addMedication = () => {
    setPrescriptions((prev) => [...prev, emptyMedication()]);
  };

  const removeMedication = (index: number) => {
    setPrescriptions((prev) => prev.filter((_, i) => i !== index));
  };

  const buildStructuredInstruction = (data: { dosage: string; frequency: string; duration: string; eye: string; notes: string }) => {
    const parts = [];
    if (data.dosage) parts.push(`Dosage: ${data.dosage}`);
    if (data.frequency) parts.push(`Frequency: ${data.frequency}`);
    if (data.duration) parts.push(`Duration: ${data.duration}`);
    if (data.eye && data.eye !== 'N/A' && data.eye !== 'NONE') parts.push(`Eye: ${data.eye}`);
    if (data.notes) parts.push(`Notes: ${data.notes}`);
    return parts.join(' | ');
  };

  const now = new Date();
  const defaultDate = now.toISOString().split('T')[0];
  const defaultTime = now.toTimeString().split(' ')[0].slice(0, 5);

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [operatingRoom, setOperatingRoom] = useState('');

  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const procedureOptions = useMemo(() => {
    return PROCEDURES[surgeryType] || [];
  }, [surgeryType]);

  useEffect(() => {
    const type = searchParams?.get('type') || '';
    const normalized = normalizeTypeParam(type);
    if (normalized) setSurgeryType(normalized);

    const pid = searchParams?.get('patientId');
    const pname = searchParams?.get('patientName');
    const aid = searchParams?.get('appointmentId');
    if (pid) {
      setPatient({ id: pid, fullName: pname });
      if (pname) setPatientQuery(pname);
    }
    if (aid) {
      setAppointmentId(aid);
      // Fetch appointment to get the assigned doctor (surgeon)
      api.get(`/appointments/${aid}`).then(res => {
        const apptData = res.data?.data || res.data;
        if (apptData?.doctorId) {
          setSurgeonId(apptData.doctorId);
        }
        if (apptData?.eyeSide) {
          // Normalize eyeSide to the values expected by the surgery form (OD, OS, BOTH)
          const normalizedEye = apptData.eyeSide === 'OU' ? 'BOTH' : apptData.eyeSide;
          setEye(normalizedEye);
        }
      }).catch(err => console.error("Failed to fetch appointment details:", err));
    }
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

  useEffect(() => {
    api.get('/inventory/pharmacy?limit=1000').then(res => {
      const items = res.data?.data || res.data || [];
      setMedicines(Array.isArray(items) ? items : []);
    }).catch(() => setMedicines([]));
  }, []);

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
      const rxPayload = prescriptions
        .filter(med => med.itemId && med.name)
        .map(med => ({
          itemId: med.itemId,
          itemName: med.name,
          quantity: med.quantity || 1,
          instructions: buildStructuredInstruction({
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            eye: med.eye === 'NONE' ? 'N/A' : med.eye,
            notes: med.notes || '',
          })
        }));

      const payload: any = {
        patientId: patient.id,
        appointmentId: appointmentId || undefined,
        surgeryType,
        eye,
        procedure,
        surgeonId,
        anesthesiaType,
        date,
        time,
        status: 'completed',
        notes: notes.trim() || undefined,
        prescriptions: rxPayload.length > 0 ? rxPayload : undefined,
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
      toast.success('Surgery report saved');
      router.push('/dashboard/surgery');
    } catch (e: any) {
      const msg = typeof e?.response?.data?.message === 'string' ? e.response.data.message : undefined;
      toast.error(msg || 'Failed to save surgery report');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Surgery Clinical Report</h1>
        <p className="text-slate-600">Document the details of the eye surgery procedure</p>
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
          {/* 1. Surgery Type */}
          <div>
            <div className={LABEL_CN}>Surgery Type</div>
            <Select value={surgeryType} onValueChange={(v) => setSurgeryType(v as SurgeryType)}>
              <SelectTrigger className="mt-2 h-11">
                <SelectValue placeholder="Select surgery type" />
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

          {/* 2. Eye Selection */}
          <div>
            <div className={LABEL_CN}>Eye</div>
            <Select 
              value={eye} 
              onValueChange={setEye}
              disabled={!!appointmentId}
            >
              <SelectTrigger className={`mt-2 h-11 ${appointmentId ? 'bg-slate-50 border-slate-200 cursor-not-allowed' : ''}`}>
                <SelectValue placeholder="Select eye" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OD">OD (Right Eye)</SelectItem>
                <SelectItem value="OS">OS (Left Eye)</SelectItem>
                <SelectItem value="BOTH">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 3. Procedure */}
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
            <Select 
              value={surgeonId} 
              onValueChange={setSurgeonId}
              disabled={!!appointmentId}
            >
              <SelectTrigger className={`mt-2 h-11 ${appointmentId ? 'bg-slate-50 border-slate-200 cursor-not-allowed' : ''}`}>
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
            {appointmentId && (
              <p className="mt-1.5 text-[11px] text-[#0EA5E9] font-medium flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Linked to appointment surgeon
              </p>
            )}
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

      {/* C. Surgery Notes */}
      <div className="rounded-xl border border-slate-100 bg-white p-6">
        <div className="text-lg font-semibold text-slate-900">Post-Operative & Procedure Notes</div>
        <Textarea
          className="mt-3 min-h-[120px]"
          placeholder="Procedure details, surgical findings, post-operative instructions..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Post-Operative Medications */}
      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0EA5E9] text-white shadow-sm">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Post-Operative Medications</h3>
              <p className="text-xs text-gray-500">Enable and prescribe post-operative medications</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Enable Rx</span>
              <button
                type="button"
                onClick={() => setPrescriptions(prev => prev.length === 0 ? [emptyMedication()] : [])}
                className={cn(
                  "relative h-5 w-10 rounded-full transition-colors",
                  prescriptions.length > 0 ? "bg-[#0EA5E9]" : "bg-gray-200"
                )}
              >
                <div className={cn(
                  "absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition-all shadow-sm",
                  prescriptions.length > 0 ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>

            <button
              type="button"
              disabled={prescriptions.length === 0}
              onClick={addMedication}
              className="flex items-center gap-2 rounded-lg bg-[#0EA5E9] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#0284C7] transition-all disabled:opacity-30 disabled:grayscale"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add Medication
            </button>
          </div>
        </div>

        {prescriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-100 bg-white py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
              <Pill className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">No Medications Prescribed</h4>
            <p className="mt-1 text-xs text-slate-500 max-w-[240px]">Use the toggle above to enable and start adding medications.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {prescriptions.map((item, index) => (
              <div key={`medication-${index}`} className="relative rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                <button
                  type="button"
                  onClick={() => removeMedication(index)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="grid grid-cols-1 gap-5">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-1">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Medicine Name</label>
                      <select
                        value={item.itemId}
                        onChange={(e) => {
                          const p = medicines.find((x) => x.id === e.target.value);
                          const next = [...prescriptions];
                          
                          const fullName = (p?.itemName || '').toLowerCase();
                          const type = (p?.itemType || '').toLowerCase();
                          const cat = (p?.category || '').toLowerCase();
                          const isTopical = [fullName, type, cat].some(s => 
                            s.includes('drop') || 
                            s.includes('ointment') || 
                            s.includes('gel') || 
                            s.includes('sol') || 
                            s.includes('susp') ||
                            s.includes('cream') ||
                            s.includes('gtt') ||
                            s.includes('inj')
                          );

                          next[index] = {
                            ...next[index],
                            itemId: p?.id || '',
                            name: p?.itemName || p?.genericName || '',
                            category: p?.category || p?.itemType || '',
                            eye: isTopical ? 'OU' : 'NONE',
                          };
                          setPrescriptions(next);
                        }}
                        className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none bg-white"
                      >
                        <option value="">Select from inventory</option>
                        {medicines.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.itemName} {p.strength ? `(${p.strength})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Quantity</label>
                      <input
                        type="number"
                        value={item.quantity || 1}
                        onChange={(e) => updateMedication(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                        placeholder="1"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Dosage</label>
                      <input
                        type="text"
                        value={item.dosage}
                        onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                        className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                        placeholder="e.g. 0.5%"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Frequency</label>
                      <input
                        type="text"
                        value={item.frequency}
                        onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                        className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                        placeholder="e.g. BD (Twice daily)"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Duration</label>
                      <input
                        type="text"
                        value={item.duration}
                        onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                        className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                        placeholder="e.g. 7 days"
                      />
                    </div>
                    {item.eye !== 'NONE' && (
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Eye</label>
                        <select
                          value={item.eye}
                          onChange={(e) => updateMedication(index, 'eye', e.target.value as any)}
                          className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none bg-white"
                        >
                          <option value="OD">OD (Right Eye)</option>
                          <option value="OS">OS (Left Eye)</option>
                          <option value="OU">OU (Both Eyes)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes / Instructions</label>
                    <textarea
                      value={item.notes || ''}
                      onChange={(e) => updateMedication(index, 'notes', e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                      placeholder="Additional advice for patient..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* D. Cataract Surgery Details (Conditional) */}
      <div
        className={`rounded-xl border border-slate-100 bg-white p-6 transition-all duration-200 ${showCataractDetails ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none h-0 overflow-hidden p-0 border-0'
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

      {/* The previous notes section is now handled above */}

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
          Save Surgery Report
        </Button>
      </div>
    </div>
  );
}
