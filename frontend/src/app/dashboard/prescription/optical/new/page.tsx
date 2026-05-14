'use client';

import type { ComponentType } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Eye, FilePlus, Glasses, User } from 'lucide-react';

type Patient = {
  id: string;
  fullName?: string | null;
  patientNumber?: string | null;
};

type PrescriptionType = 'SPECTACLES' | 'CONTACT_LENS' | 'BOTH';

type EyeRefraction = {
  sphere: string;
  cylinder: string;
  axis: string;
  add: string;
  pd: string;
  prism: string;
};

const REFRACTION_FIELDS = [
  ['Sphere', 'sphere'],
  ['Cylinder', 'cylinder'],
  ['Axis', 'axis'],
  ['Add', 'add'],
  ['PD', 'pd'],
  ['Prism', 'prism'],
] as const satisfies ReadonlyArray<readonly [string, keyof EyeRefraction]>;

const COATING_OPTIONS = [
  'Anti Reflective',
  'Blue Light',
  'Photochromic',
  'Scratch Resistant',
  'Hydrophobic',
  'UV Protection',
] as const;

const LABEL_CN = 'text-xs font-semibold uppercase text-slate-500';

function SectionHeader({ icon: Icon, title }: { icon: ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
      <Icon className="h-4 w-4 text-[#0EA5E9]" />
      {title}
    </div>
  );
}

function compactPatientLabel(p: Patient): string {
  const name = (p.fullName || '').trim() || 'Unknown Patient';
  const id = p.patientNumber || p.id;
  return `${name} (${id})`;
}

export default function NewPrescriptionPage() {
  const router = useRouter();

  const [patientQuery, setPatientQuery] = useState('');
  const [patientOpen, setPatientOpen] = useState(false);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);

  const type: PrescriptionType = 'SPECTACLES';

  const [od, setOd] = useState<EyeRefraction>({ sphere: '+0.00', cylinder: '0.00', axis: '180', add: '+0.00', pd: '32', prism: '0' });
  const [os, setOs] = useState<EyeRefraction>({ sphere: '+0.00', cylinder: '0.00', axis: '180', add: '+0.00', pd: '32', prism: '0' });

  const [lensType, setLensType] = useState('Single Vision');
  const [lensMaterial, setLensMaterial] = useState('CR-39');
  const [frameType, setFrameType] = useState('Full Rim');
  const [coatings, setCoatings] = useState<string[]>([]);

  const [validityMonths, setValidityMonths] = useState('12');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const fetchPatients = useCallback(async (q: string) => {
    const query = q.trim();
    if (!query) {
      setPatientResults([]);
      return;
    }

    setPatientLoading(true);
    try {
      const res = await api.get('/patients', { params: { search: query } });
      const body = res.data as unknown;
      const list: unknown[] = Array.isArray(body)
        ? body
        : (typeof body === 'object' && body !== null && 'data' in body && Array.isArray((body as { data?: unknown }).data))
          ? ((body as { data: unknown[] }).data)
          : [];

      const mapped: Patient[] = list
        .map((row) => {
          const r = row as Record<string, unknown>;
          const fullName = typeof r.fullName === 'string' ? r.fullName : null;
          const patientNumber = typeof r.patientNumber === 'string' ? r.patientNumber : null;
          return { id: String(r.id ?? ''), fullName, patientNumber };
        })
        .filter((p) => p.id)
        .slice(0, 10);
      setPatientResults(mapped);
    } catch {
      setPatientResults([]);
    } finally {
      setPatientLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!patientOpen) return;
    const t = setTimeout(() => void fetchPatients(patientQuery), 250);
    return () => clearTimeout(t);
  }, [patientQuery, patientOpen, fetchPatients]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('patientId');
    const pname = params.get('patientName');

    if (pid) {
      setPatient({ id: pid, fullName: pname || 'Selected Patient' });
    }

    const sphereOD = params.get('sphereOD');
    const cylinderOD = params.get('cylinderOD');
    const axisOD = params.get('axisOD');
    if (sphereOD || cylinderOD || axisOD) {
      setOd(prev => ({
        ...prev,
        sphere: sphereOD || prev.sphere,
        cylinder: cylinderOD || prev.cylinder,
        axis: axisOD || prev.axis,
      }));
    }

    const sphereOS = params.get('sphereOS');
    const cylinderOS = params.get('cylinderOS');
    const axisOS = params.get('axisOS');
    if (sphereOS || cylinderOS || axisOS) {
      setOs(prev => ({
        ...prev,
        sphere: sphereOS || prev.sphere,
        cylinder: cylinderOS || prev.cylinder,
        axis: axisOS || prev.axis,
      }));
    }
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!patientOpen) return;
      const target = e.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setPatientOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [patientOpen]);

  const toggleCoating = (label: string) => {
    setCoatings((prev) => (prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]));
  };

  const canSave = useMemo(() => {
    return !!patient && !saving;
  }, [patient, saving]);

  const onSave = async () => {
    if (!patient) {
      toast.error('Please select a patient');
      return;
    }

    const validity = Number(validityMonths);
    if (!Number.isFinite(validity) || validity < 1) {
      toast.error('Validity must be at least 1 month');
      return;
    }

    setSaving(true);
    try {
      await api.post('/prescriptions', {
        patientId: patient.id,
        type,
        validityMonths: validity,
        notes: notes || null,

        odSphere: od.sphere,
        odCylinder: od.cylinder,
        odAxis: Number(od.axis),
        odAdd: od.add,
        odPd: Number(od.pd),
        odPrism: od.prism,

        osSphere: os.sphere,
        osCylinder: os.cylinder,
        osAxis: Number(os.axis),
        osAdd: os.add,
        osPd: Number(os.pd),
        osPrism: os.prism,

        lensType,
        lensMaterial,
        frameType,
        coatings,
      });

      toast.success('Prescription created');
      router.push('/dashboard/prescription/optical');
    } catch {
      toast.error('Failed to save prescription');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">New Prescription</h1>
        <p className="mt-1 text-sm text-slate-500">Create a new optical prescription for a patient</p>
      </div>

      <Link href="/dashboard/prescription/optical" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
        <span aria-hidden>←</span> Back to Prescriptions
      </Link>

      {/* A. Patient Information */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <SectionHeader icon={User} title="Patient Information" />
        <div className="mt-4" ref={dropdownRef}>
          <label className={LABEL_CN}>Patient</label>
          <div className="relative mt-1">
            <Input
              value={patientOpen ? patientQuery : patient ? compactPatientLabel(patient) : ''}
              onChange={(e) => {
                setPatientQuery(e.target.value);
                setPatientOpen(true);
              }}
              onFocus={() => setPatientOpen(true)}
              placeholder="Search patient by name or ID..."
              className="h-11 border-slate-200"
            />

            {patientOpen && (
              <div className="absolute z-50 mt-2 w-full rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="max-h-64 overflow-auto">
                  {patientLoading ? (
                    <div className="px-3 py-3 text-sm text-slate-500">Searching…</div>
                  ) : patientQuery.trim() && patientResults.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-slate-500">No patients found</div>
                  ) : (
                    patientResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => {
                          setPatient(p);
                          setPatientOpen(false);
                          setPatientQuery('');
                        }}
                      >
                        <div className="font-medium text-slate-900">{p.fullName || 'Unknown Patient'}</div>
                        <div className="text-xs text-slate-500">{p.patientNumber || p.id}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* B. Prescription Type - Removed as only Spectacles are used */}
      <input type="hidden" value="SPECTACLES" />

      {/* C. Refraction Data */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <SectionHeader icon={Eye} title="Refraction Data" />

        <div className="mt-4 space-y-6">
          <div>
            <div className="text-sm font-semibold text-slate-900">OD (Right Eye)</div>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {REFRACTION_FIELDS.map(([label, key]) => (
                <div key={key}>
                  <label className={LABEL_CN}>{label}</label>
                  <Input
                    className="mt-1 h-11 border-slate-200"
                    value={od[key]}
                    onChange={(e) => setOd((p) => ({ ...p, [key]: e.target.value } as EyeRefraction))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-900">OS (Left Eye)</div>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {REFRACTION_FIELDS.map(([label, key]) => (
                <div key={key}>
                  <label className={LABEL_CN}>{label}</label>
                  <Input
                    className="mt-1 h-11 border-slate-200"
                    value={os[key]}
                    onChange={(e) => setOs((p) => ({ ...p, [key]: e.target.value } as EyeRefraction))}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* D. Spectacle Details */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="text-lg font-semibold text-slate-900">Spectacle Details</div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className={LABEL_CN}>Lens Type</label>
            <Select value={lensType} onValueChange={setLensType}>
              <SelectTrigger className="mt-1 h-11 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Single Vision">Single Vision</SelectItem>
                <SelectItem value="Bifocal">Bifocal</SelectItem>
                <SelectItem value="Progressive">Progressive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className={LABEL_CN}>Lens Material</label>
            <Select value={lensMaterial} onValueChange={setLensMaterial}>
              <SelectTrigger className="mt-1 h-11 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CR-39">CR-39</SelectItem>
                <SelectItem value="Polycarbonate">Polycarbonate</SelectItem>
                <SelectItem value="High Index">High Index</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className={LABEL_CN}>Frame Type</label>
            <Select value={frameType} onValueChange={setFrameType}>
              <SelectTrigger className="mt-1 h-11 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Full Rim">Full Rim</SelectItem>
                <SelectItem value="Half Rim">Half Rim</SelectItem>
                <SelectItem value="Rimless">Rimless</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-5">
          <label className={LABEL_CN}>Coatings</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {COATING_OPTIONS.map((c) => {
              const active = coatings.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCoating(c)}
                  className={
                    active
                      ? 'rounded-full border border-[#0EA5E9] bg-sky-50/60 px-3 py-1.5 text-sm font-medium text-sky-700'
                      : 'rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50'
                  }
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* E. Validity & Notes */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={LABEL_CN}>Validity (months)</label>
            <Select value={validityMonths} onValueChange={setValidityMonths}>
              <SelectTrigger className="mt-1 h-11 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 months</SelectItem>
                <SelectItem value="12">12 months</SelectItem>
                <SelectItem value="24">24 months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className={LABEL_CN}>Notes</label>
            <Textarea
              className="mt-1 min-h-[44px] border-slate-200"
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={() => router.push('/dashboard/prescription/optical')} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={!canSave}
            className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
          >
            <FilePlus className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save Prescription'}
          </Button>
        </div>
      </div>
    </div>
  );
}
