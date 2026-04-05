'use client';

import { useEffect, useMemo, useState, type ComponentType, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowLeft, ChevronDown, Eye, FileText, Glasses, Loader2, Plus, Save, Search, Target, User, X } from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/axios';
import { cn } from '@/lib/utils';

type Patient = {
  id: string;
  fullName: string;
  patientNumber?: string | null;
  dateOfBirth?: string | null;
};

type Doctor = {
  id: string;
  doctorId?: string;
  userId?: string;
  fullName?: string | null;
};

type DiagnosisItem = {
  icdCode: string;
  description: string;
  eye: 'OD' | 'OS' | 'OU';
};

type MedicationItem = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  eye: 'OD' | 'OS' | 'OU';
};

type FollowUpState = {
  recommended: boolean;
  interval: string;
  reason: string;
};

type VisualAcuityState = {
  method: 'snellen' | 'logmar';
  uncorrected: {
    distance: { OD: string; OS: string };
    near: { OD: string; OS: string };
  };
  corrected: {
    distance: { OD: string; OS: string };
    near: { OD: string; OS: string };
  };
  pinhole: { OD: string; OS: string };
};

type IopState = {
  OD: string;
  OS: string;
  method: string;
  time: string;
};

type RefractionState = {
  sphereOD: string;
  sphereOS: string;
  cylinderOD: string;
  cylinderOS: string;
  axisOD: string;
  axisOS: string;
};

type EyeFindingsState = {
  OD: string;
  OS: string;
};

type AnteriorSegmentState = {
  lidsLashes: EyeFindingsState;
  conjunctiva: EyeFindingsState;
  cornea: EyeFindingsState;
  anteriorChamber: EyeFindingsState;
  iris: EyeFindingsState;
  lens: EyeFindingsState;
  notes: string;
};

type FundusState = {
  opticDisc: EyeFindingsState;
  cupDiscRatio: EyeFindingsState;
  macula: EyeFindingsState;
  vessels: EyeFindingsState;
  periphery: EyeFindingsState;
  notes: string;
};

type ExamFormState = {
  chiefComplaint: string;
  historyOfPresentIllness: string;
  visualAcuity: VisualAcuityState;
  refraction: RefractionState;
  iop: IopState;
  anteriorSegment: AnteriorSegmentState;
  fundus: FundusState;
  diagnosis: DiagnosisItem[];
  plan: string;
  medications: MedicationItem[];
  followUp: FollowUpState;
  targetIopOD: string;
  targetIopOS: string;
};

type AssessmentMeta = {
  diagnosisItems: DiagnosisItem[];
  medications: MedicationItem[];
  followUp: FollowUpState;
};

export type EyeExamFormInitialData = {
  patientId?: string;
  patientName?: string;
  doctorId?: string;
  chiefComplaint?: string | null;
  historyOfPresentIllness?: string | null;
  vaScale?: string | null;
  vaUnaidedOD?: string | null;
  vaUnaidedOS?: string | null;
  vaUnaidedNearOD?: string | null;
  vaUnaidedNearOS?: string | null;
  vaBcvaOD?: string | null;
  vaBcvaOS?: string | null;
  vaBcvaNearOD?: string | null;
  vaBcvaNearOS?: string | null;
  vaPinholeOD?: string | null;
  vaPinholeOS?: string | null;
  refractionSphereOD?: string | null;
  refractionSphereOS?: string | null;
  refractionCylinderOD?: string | null;
  refractionCylinderOS?: string | null;
  refractionAxisOD?: string | null;
  refractionAxisOS?: string | null;
  iopOD?: number | null;
  iopOS?: number | null;
  iopMethod?: string | null;
  iopTime?: string | null;
  targetIopOD?: number | null;
  targetIopOS?: number | null;
  diagnosis?: string | null;
  plan?: string | null;
  nextVisitReason?: string | null;
  anteriorSegmentFindings?: unknown;
  fundusFindings?: unknown;
};

export type EyeExamFormSubmitPayload = {
  patientId: string;
  doctorId: string;
  chiefComplaint: string;
  historyOfPresentIllness?: string;
  vaScale: 'SNELLEN' | 'LOGMAR';
  vaUnaidedOD?: string;
  vaUnaidedOS?: string;
  vaUnaidedNearOD?: string;
  vaUnaidedNearOS?: string;
  vaBcvaOD?: string;
  vaBcvaOS?: string;
  vaBcvaNearOD?: string;
  vaBcvaNearOS?: string;
  vaPinholeOD?: string;
  vaPinholeOS?: string;
  refractionSphereOD?: string;
  refractionSphereOS?: string;
  refractionCylinderOD?: string;
  refractionCylinderOS?: string;
  refractionAxisOD?: string;
  refractionAxisOS?: string;
  iopOD?: number;
  iopOS?: number;
  iopMethod?: string;
  iopTime?: string;
  targetIopOD?: number;
  targetIopOS?: number;
  diagnosis?: string;
  plan?: string;
  followUpDate?: string;
  nextVisitReason?: string;
  anteriorSegmentFindings?: unknown;
  fundusFindings?: unknown;
};

type EyeExamFormProps = {
  mode: 'create' | 'edit';
  initialData?: EyeExamFormInitialData | null;
  submitting: boolean;
  onSubmit: (payload: EyeExamFormSubmitPayload) => Promise<void>;
  cancelHref: string;
};

type TabKey = 'basic' | 'va' | 'refraction' | 'iop' | 'anterior' | 'fundus' | 'diagnosis';

type ValidationErrors = {
  patient?: string;
  chiefComplaint?: string;
};

const TABS: Array<{ id: TabKey; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: 'basic', label: 'Basic Info', icon: FileText },
  { id: 'va', label: 'Visual Acuity', icon: Eye },
  { id: 'refraction', label: 'Refraction', icon: Glasses },
  { id: 'iop', label: 'IOP', icon: Activity },
  { id: 'anterior', label: 'Anterior Segment', icon: Target },
  { id: 'fundus', label: 'Fundus', icon: Eye },
  { id: 'diagnosis', label: 'Assessment', icon: FileText },
];

const IOP_METHODS = [
  { value: 'goldmann', label: 'Goldmann Applanation' },
  { value: 'tonopen', label: 'Tonopen' },
  { value: 'icare', label: 'iCare Rebound' },
  { value: 'ncT', label: 'Non-Contact (Air Puff)' },
  { value: 'palpation', label: 'Digital Palpation' },
] as const;

const FOLLOW_UP_INTERVALS = ['1 week', '2 weeks', '1 month', '3 months', '6 months', '1 year'];

const emptyDiagnosis = (): DiagnosisItem => ({ icdCode: '', description: '', eye: 'OU' });
const emptyMedication = (): MedicationItem => ({ name: '', dosage: '', frequency: '', duration: '', eye: 'OU' });
const emptyEyeFindings = (): EyeFindingsState => ({ OD: '', OS: '' });

const defaultFormState = (): ExamFormState => ({
  chiefComplaint: '',
  historyOfPresentIllness: '',
  visualAcuity: {
    method: 'snellen',
    uncorrected: {
      distance: { OD: '', OS: '' },
      near: { OD: '', OS: '' },
    },
    corrected: {
      distance: { OD: '', OS: '' },
      near: { OD: '', OS: '' },
    },
    pinhole: { OD: '', OS: '' },
  },
  refraction: {
    sphereOD: '',
    sphereOS: '',
    cylinderOD: '',
    cylinderOS: '',
    axisOD: '',
    axisOS: '',
  },
  anteriorSegment: {
    lidsLashes: emptyEyeFindings(),
    conjunctiva: emptyEyeFindings(),
    cornea: emptyEyeFindings(),
    anteriorChamber: emptyEyeFindings(),
    iris: emptyEyeFindings(),
    lens: emptyEyeFindings(),
    notes: '',
  },
  fundus: {
    opticDisc: emptyEyeFindings(),
    cupDiscRatio: emptyEyeFindings(),
    macula: emptyEyeFindings(),
    vessels: emptyEyeFindings(),
    periphery: emptyEyeFindings(),
    notes: '',
  },
  iop: {
    OD: '',
    OS: '',
    method: 'goldmann',
    time: new Date().toISOString(),
  },
  diagnosis: [emptyDiagnosis()],
  plan: '',
  medications: [],
  followUp: {
    recommended: true,
    interval: '1 month',
    reason: '',
  },
  targetIopOD: '',
  targetIopOS: '',
});

function toInputString(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function toOptionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function toOptionalInt(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  if (Number.isNaN(num)) return undefined;
  return Math.trunc(num);
}

function parseDiagnosisString(value: string | null | undefined): DiagnosisItem[] {
  const raw = (value || '').trim();
  if (!raw) return [emptyDiagnosis()];

  const rows = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [icdCode = '', description = '', eye = 'OU'] = line.split('|').map((part) => part.trim());
      const normalizedEye = eye === 'OD' || eye === 'OS' ? eye : 'OU';
      return { icdCode, description, eye: normalizedEye as 'OD' | 'OS' | 'OU' };
    });

  return rows.length > 0 ? rows : [emptyDiagnosis()];
}

function serializeDiagnosis(items: DiagnosisItem[]): string {
  const rows = items
    .filter((item) => item.icdCode.trim() || item.description.trim())
    .map((item) => [item.icdCode.trim(), item.description.trim(), item.eye].filter(Boolean).join(' | '));

  return rows.join('\n');
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseEyeFindings(value: unknown): EyeFindingsState {
  if (!isObjectLike(value)) return emptyEyeFindings();
  return {
    OD: String(value.OD || ''),
    OS: String(value.OS || ''),
  };
}

function parseAnteriorSegmentState(value: unknown): AnteriorSegmentState {
  if (!isObjectLike(value)) {
    return {
      lidsLashes: emptyEyeFindings(),
      conjunctiva: emptyEyeFindings(),
      cornea: emptyEyeFindings(),
      anteriorChamber: emptyEyeFindings(),
      iris: emptyEyeFindings(),
      lens: emptyEyeFindings(),
      notes: '',
    };
  }

  return {
    lidsLashes: parseEyeFindings(value.lidsLashes),
    conjunctiva: parseEyeFindings(value.conjunctiva),
    cornea: parseEyeFindings(value.cornea),
    anteriorChamber: parseEyeFindings(value.anteriorChamber),
    iris: parseEyeFindings(value.iris),
    lens: parseEyeFindings(value.lens),
    notes: String(value.notes || ''),
  };
}

function parseFundusState(value: unknown): FundusState {
  if (!isObjectLike(value)) {
    return {
      opticDisc: emptyEyeFindings(),
      cupDiscRatio: emptyEyeFindings(),
      macula: emptyEyeFindings(),
      vessels: emptyEyeFindings(),
      periphery: emptyEyeFindings(),
      notes: '',
    };
  }

  return {
    opticDisc: parseEyeFindings(value.opticDisc),
    cupDiscRatio: parseEyeFindings(value.cupDiscRatio),
    macula: parseEyeFindings(value.macula),
    vessels: parseEyeFindings(value.vessels),
    periphery: parseEyeFindings(value.periphery),
    notes: String(value.notes || ''),
  };
}

function parseAssessmentMeta(findings: unknown): AssessmentMeta | null {
  if (!isObjectLike(findings)) return null;
  const maybeMeta = findings._assessment;
  if (!isObjectLike(maybeMeta)) return null;

  const diagnosisItems = Array.isArray(maybeMeta.diagnosisItems)
    ? maybeMeta.diagnosisItems
        .map((item) => {
          if (!isObjectLike(item)) return null;
          const eye = item.eye === 'OD' || item.eye === 'OS' ? item.eye : 'OU';
          return {
            icdCode: String(item.icdCode || ''),
            description: String(item.description || ''),
            eye,
          } as DiagnosisItem;
        })
        .filter((item): item is DiagnosisItem => item !== null)
    : [];

  const medications = Array.isArray(maybeMeta.medications)
    ? maybeMeta.medications
        .map((item) => {
          if (!isObjectLike(item)) return null;
          const eye = item.eye === 'OD' || item.eye === 'OS' ? item.eye : 'OU';
          return {
            name: String(item.name || ''),
            dosage: String(item.dosage || ''),
            frequency: String(item.frequency || ''),
            duration: String(item.duration || ''),
            eye,
          } as MedicationItem;
        })
        .filter((item): item is MedicationItem => item !== null)
    : [];

  const followUp = isObjectLike(maybeMeta.followUp)
    ? {
        recommended: Boolean(maybeMeta.followUp.recommended ?? true),
        interval: String(maybeMeta.followUp.interval || '1 month'),
        reason: String(maybeMeta.followUp.reason || ''),
      }
    : { recommended: true, interval: '1 month', reason: '' };

  return {
    diagnosisItems: diagnosisItems.length > 0 ? diagnosisItems : [emptyDiagnosis()],
    medications,
    followUp,
  };
}

function mergeAssessmentMeta(findings: unknown, meta: AssessmentMeta): Record<string, unknown> {
  const base = isObjectLike(findings) ? findings : {};
  return {
    ...base,
    _assessment: meta,
  };
}

function addIntervalToNow(interval: string): string | undefined {
  const date = new Date();
  const normalized = interval.toLowerCase();

  if (normalized === '1 week') date.setDate(date.getDate() + 7);
  else if (normalized === '2 weeks') date.setDate(date.getDate() + 14);
  else if (normalized === '1 month') date.setMonth(date.getMonth() + 1);
  else if (normalized === '3 months') date.setMonth(date.getMonth() + 3);
  else if (normalized === '6 months') date.setMonth(date.getMonth() + 6);
  else if (normalized === '1 year') date.setFullYear(date.getFullYear() + 1);
  else return undefined;

  return date.toISOString();
}

function buildInitialFormState(initialData?: EyeExamFormInitialData | null): ExamFormState {
  const defaults = defaultFormState();
  if (!initialData) return defaults;

  const parsedAssessment = parseAssessmentMeta(initialData.anteriorSegmentFindings);

  return {
    chiefComplaint: initialData.chiefComplaint ?? '',
    historyOfPresentIllness: initialData.historyOfPresentIllness ?? '',
    visualAcuity: {
      method: initialData.vaScale === 'LOGMAR' ? 'logmar' : 'snellen',
      uncorrected: {
        distance: {
          OD: initialData.vaUnaidedOD ?? '',
          OS: initialData.vaUnaidedOS ?? '',
        },
        near: {
          OD: initialData.vaUnaidedNearOD ?? '',
          OS: initialData.vaUnaidedNearOS ?? '',
        },
      },
      corrected: {
        distance: {
          OD: initialData.vaBcvaOD ?? '',
          OS: initialData.vaBcvaOS ?? '',
        },
        near: {
          OD: initialData.vaBcvaNearOD ?? '',
          OS: initialData.vaBcvaNearOS ?? '',
        },
      },
      pinhole: {
        OD: initialData.vaPinholeOD ?? '',
        OS: initialData.vaPinholeOS ?? '',
      },
    },
    refraction: {
      sphereOD: initialData.refractionSphereOD ?? '',
      sphereOS: initialData.refractionSphereOS ?? '',
      cylinderOD: initialData.refractionCylinderOD ?? '',
      cylinderOS: initialData.refractionCylinderOS ?? '',
      axisOD: initialData.refractionAxisOD ?? '',
      axisOS: initialData.refractionAxisOS ?? '',
    },
    iop: {
      OD: toInputString(initialData.iopOD),
      OS: toInputString(initialData.iopOS),
      method: initialData.iopMethod || defaults.iop.method,
      time: initialData.iopTime || defaults.iop.time,
    },
    anteriorSegment: parseAnteriorSegmentState(initialData.anteriorSegmentFindings),
    fundus: parseFundusState(initialData.fundusFindings),
    diagnosis: parsedAssessment?.diagnosisItems || parseDiagnosisString(initialData.diagnosis),
    plan: initialData.plan ?? '',
    medications: parsedAssessment?.medications || [],
    followUp: parsedAssessment?.followUp || {
      recommended: Boolean(initialData.nextVisitReason),
      interval: defaults.followUp.interval,
      reason: initialData.nextVisitReason ?? '',
    },
    targetIopOD: toInputString(initialData.targetIopOD),
    targetIopOS: toInputString(initialData.targetIopOS),
  };
}

export default function EyeExamForm({ mode, initialData, submitting, onSubmit, cancelHref }: EyeExamFormProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>('basic');
  const [form, setForm] = useState<ExamFormState>(() => buildInitialFormState(initialData));
  const [errors, setErrors] = useState<ValidationErrors>({});

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState(initialData?.patientName ?? '');
  const [patientOpen, setPatientOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(initialData?.patientId ?? '');

  const [doctorId, setDoctorId] = useState(initialData?.doctorId ?? '');

  useEffect(() => {
    let cancelled = false;

    const loadReferenceData = async () => {
      try {
        const patientRes = await api.get('/patients?limit=200');
        if (!cancelled) {
          setPatients(patientRes.data?.data ?? patientRes.data ?? []);
        }
      } catch {
        if (!cancelled) {
          setPatients([]);
        }
      }

      try {
        const doctorRes = await api.get('/doctors?limit=200');
        const list: Doctor[] = doctorRes.data?.data ?? doctorRes.data ?? [];

        if (!cancelled) {
          setDoctorId((prev) => {
            if (prev) return prev;

            let parsedUser: { id?: string } | null = null;
            if (typeof window !== 'undefined') {
              const rawUser = localStorage.getItem('user');
              if (rawUser) {
                try {
                  parsedUser = JSON.parse(rawUser) as { id?: string };
                } catch {
                  parsedUser = null;
                }
              }
            }

            const matchedDoctor = parsedUser?.id
              ? list.find((doctor) => doctor.userId === parsedUser?.id || doctor.id === parsedUser?.id)
              : undefined;

            return matchedDoctor?.doctorId || list[0]?.doctorId || '';
          });
        }
      } catch {
        // Keep existing doctor selection state if doctor lookup fails.
      }
    };

    void loadReferenceData();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPatients = useMemo(() => {
    if (!patientOpen) return [];

    if (!patientSearch.trim()) return patients.slice(0, 20);

    const term = patientSearch.toLowerCase();
    return patients
      .filter(
        (patient) =>
          patient.fullName.toLowerCase().includes(term) ||
          patient.patientNumber?.toLowerCase().includes(term) ||
          patient.id.toLowerCase().includes(term)
      )
      .slice(0, 30);
  }, [patientOpen, patientSearch, patients]);

  const canSubmit = Boolean(selectedPatientId);

  const selectedMethod = IOP_METHODS.find((method) => method.value === form.iop.method);
  const highIop = Number(form.iop.OD) > 21 || Number(form.iop.OS) > 21;

  const updateMedication = (index: number, key: keyof MedicationItem, value: string) => {
    setForm((prev) => ({
      ...prev,
      medications: prev.medications.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: ValidationErrors = {};
    let nextTab: TabKey | undefined;

    if (!selectedPatientId) {
      nextErrors.patient = 'Please select a patient';
    }

    if (!form.chiefComplaint.trim()) {
      nextErrors.chiefComplaint = 'Chief complaint is required';
      nextTab = 'basic';
    }

    if (!doctorId) {
      toast.error('Examining doctor is required');
      return;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      if (nextTab && activeTab !== nextTab) setActiveTab(nextTab);
      toast.error(Object.values(nextErrors).join(', '));
      return;
    }

    setErrors({});

    const diagnosisText = serializeDiagnosis(form.diagnosis);
    const assessmentMeta: AssessmentMeta = {
      diagnosisItems: form.diagnosis,
      medications: form.medications,
      followUp: form.followUp,
    };

    const payload: EyeExamFormSubmitPayload = {
      patientId: selectedPatientId,
      doctorId,
      chiefComplaint: form.chiefComplaint.trim(),
      historyOfPresentIllness: toOptionalString(form.historyOfPresentIllness),
      vaScale: form.visualAcuity.method === 'logmar' ? 'LOGMAR' : 'SNELLEN',
      vaUnaidedOD: toOptionalString(form.visualAcuity.uncorrected.distance.OD),
      vaUnaidedOS: toOptionalString(form.visualAcuity.uncorrected.distance.OS),
      vaUnaidedNearOD: toOptionalString(form.visualAcuity.uncorrected.near.OD),
      vaUnaidedNearOS: toOptionalString(form.visualAcuity.uncorrected.near.OS),
      vaBcvaOD: toOptionalString(form.visualAcuity.corrected.distance.OD),
      vaBcvaOS: toOptionalString(form.visualAcuity.corrected.distance.OS),
      vaBcvaNearOD: toOptionalString(form.visualAcuity.corrected.near.OD),
      vaBcvaNearOS: toOptionalString(form.visualAcuity.corrected.near.OS),
      vaPinholeOD: toOptionalString(form.visualAcuity.pinhole.OD),
      vaPinholeOS: toOptionalString(form.visualAcuity.pinhole.OS),
      refractionSphereOD: toOptionalString(form.refraction.sphereOD),
      refractionSphereOS: toOptionalString(form.refraction.sphereOS),
      refractionCylinderOD: toOptionalString(form.refraction.cylinderOD),
      refractionCylinderOS: toOptionalString(form.refraction.cylinderOS),
      refractionAxisOD: toOptionalString(form.refraction.axisOD),
      refractionAxisOS: toOptionalString(form.refraction.axisOS),
      iopOD: toOptionalInt(form.iop.OD),
      iopOS: toOptionalInt(form.iop.OS),
      iopMethod: toOptionalString(form.iop.method),
      iopTime: toOptionalString(form.iop.time),
      targetIopOD: toOptionalInt(form.targetIopOD),
      targetIopOS: toOptionalInt(form.targetIopOS),
      diagnosis: diagnosisText || undefined,
      plan: toOptionalString(form.plan),
      followUpDate: form.followUp.recommended ? addIntervalToNow(form.followUp.interval) : undefined,
      nextVisitReason: form.followUp.recommended ? toOptionalString(form.followUp.reason) : undefined,
      anteriorSegmentFindings: mergeAssessmentMeta(
        {
          lidsLashes: form.anteriorSegment.lidsLashes,
          conjunctiva: form.anteriorSegment.conjunctiva,
          cornea: form.anteriorSegment.cornea,
          anteriorChamber: form.anteriorSegment.anteriorChamber,
          iris: form.anteriorSegment.iris,
          lens: form.anteriorSegment.lens,
          notes: toOptionalString(form.anteriorSegment.notes) || '',
        },
        assessmentMeta
      ),
      fundusFindings: {
        opticDisc: form.fundus.opticDisc,
        cupDiscRatio: form.fundus.cupDiscRatio,
        macula: form.fundus.macula,
        vessels: form.fundus.vessels,
        periphery: form.fundus.periphery,
        notes: toOptionalString(form.fundus.notes) || '',
      },
    };

    await onSubmit(payload);
  };

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={() => {
            if (cancelHref.startsWith('/')) {
              router.push(cancelHref);
              return;
            }
            router.back();
          }}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-sky-600 hover:text-sky-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">{mode === 'edit' ? 'Edit Eye Examination' : 'New Eye Examination'}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{mode === 'edit' ? 'Update comprehensive eye examination record' : 'Create comprehensive eye examination record'}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={cn('rounded-xl border bg-white p-6 shadow-sm', errors.patient ? 'border-red-300' : 'border-gray-100')}>
          <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold text-slate-900">
            <User className="h-5 w-5 text-blue-600" />
            Patient Information
            <span className="text-base text-red-500">*</span>
          </h3>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={patientSearch}
              onChange={(event) => {
                const value = event.target.value;
                setPatientSearch(value);
                setPatientOpen(true);
                if (selectedPatientId) setSelectedPatientId('');
                if (errors.patient) setErrors((prev) => ({ ...prev, patient: undefined }));
              }}
              onFocus={() => setPatientOpen(true)}
              onBlur={() => window.setTimeout(() => setPatientOpen(false), 150)}
              placeholder="Search patients by name or ID..."
              className="h-12 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            {patientOpen && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setSelectedPatientId(patient.id);
                        setPatientSearch(patient.fullName);
                        setPatientOpen(false);
                        if (errors.patient) setErrors((prev) => ({ ...prev, patient: undefined }));
                      }}
                      className={cn(
                        'block w-full px-3 py-2 text-left text-sm hover:bg-gray-50',
                        selectedPatientId === patient.id && 'bg-blue-50 text-blue-700'
                      )}
                    >
                      {patient.fullName}
                      {patient.patientNumber ? <span className="text-gray-500"> - {patient.patientNumber}</span> : null}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-3 text-sm text-gray-500">No patients found</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex overflow-x-auto border-b">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap px-6 py-4 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 bg-blue-50/50 text-blue-600'
                    : 'border-b-2 border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Chief Complaint <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.chiefComplaint}
                    onChange={(event) => {
                      const value = event.target.value;
                      setForm((prev) => ({ ...prev, chiefComplaint: value }));
                      if (errors.chiefComplaint && value.trim()) {
                        setErrors((prev) => ({ ...prev, chiefComplaint: undefined }));
                      }
                    }}
                    placeholder="e.g., Blurred vision, eye pain, routine checkup"
                    className={cn(
                      'h-12 w-full rounded-lg border px-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500',
                      errors.chiefComplaint ? 'border-red-300' : 'border-gray-200'
                    )}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">History of Present Illness</label>
                  <textarea
                    value={form.historyOfPresentIllness}
                    onChange={(event) => setForm((prev) => ({ ...prev, historyOfPresentIllness: event.target.value }))}
                    placeholder="Detailed history..."
                    rows={5}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {activeTab === 'va' && (
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={form.visualAcuity.method === 'snellen'}
                      onChange={() =>
                        setForm((prev) => ({
                          ...prev,
                          visualAcuity: { ...prev.visualAcuity, method: 'snellen' },
                        }))
                      }
                      className="text-blue-600"
                    />
                    Snellen
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={form.visualAcuity.method === 'logmar'}
                      onChange={() =>
                        setForm((prev) => ({
                          ...prev,
                          visualAcuity: { ...prev.visualAcuity, method: 'logmar' },
                        }))
                      }
                      className="text-blue-600"
                    />
                    LogMAR
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <h4 className="mb-4 text-xl font-semibold text-gray-800">Uncorrected Visual Acuity</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Distance OD</label>
                        <input
                          type="text"
                          value={form.visualAcuity.uncorrected.distance.OD}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              visualAcuity: {
                                ...prev.visualAcuity,
                                uncorrected: {
                                  ...prev.visualAcuity.uncorrected,
                                  distance: { ...prev.visualAcuity.uncorrected.distance, OD: event.target.value },
                                },
                              },
                            }))
                          }
                          className="h-11 w-full rounded-lg border border-gray-200 px-4 text-base"
                          placeholder="20/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Distance OS</label>
                        <input
                          type="text"
                          value={form.visualAcuity.uncorrected.distance.OS}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              visualAcuity: {
                                ...prev.visualAcuity,
                                uncorrected: {
                                  ...prev.visualAcuity.uncorrected,
                                  distance: { ...prev.visualAcuity.uncorrected.distance, OS: event.target.value },
                                },
                              },
                            }))
                          }
                          className="h-11 w-full rounded-lg border border-gray-200 px-4 text-base"
                          placeholder="20/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Near OD</label>
                        <input
                          type="text"
                          value={form.visualAcuity.uncorrected.near.OD}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              visualAcuity: {
                                ...prev.visualAcuity,
                                uncorrected: {
                                  ...prev.visualAcuity.uncorrected,
                                  near: { ...prev.visualAcuity.uncorrected.near, OD: event.target.value },
                                },
                              },
                            }))
                          }
                          className="h-11 w-full rounded-lg border border-gray-200 px-4 text-base"
                          placeholder="J1"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Near OS</label>
                        <input
                          type="text"
                          value={form.visualAcuity.uncorrected.near.OS}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              visualAcuity: {
                                ...prev.visualAcuity,
                                uncorrected: {
                                  ...prev.visualAcuity.uncorrected,
                                  near: { ...prev.visualAcuity.uncorrected.near, OS: event.target.value },
                                },
                              },
                            }))
                          }
                          className="h-11 w-full rounded-lg border border-gray-200 px-4 text-base"
                          placeholder="J1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-blue-50 p-4">
                    <h4 className="mb-4 text-xl font-semibold text-gray-800">Best Corrected Visual Acuity (BCVA)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Distance OD</label>
                        <input
                          type="text"
                          value={form.visualAcuity.corrected.distance.OD}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              visualAcuity: {
                                ...prev.visualAcuity,
                                corrected: {
                                  ...prev.visualAcuity.corrected,
                                  distance: { ...prev.visualAcuity.corrected.distance, OD: event.target.value },
                                },
                              },
                            }))
                          }
                          className="h-11 w-full rounded-lg border border-gray-200 px-4 text-base"
                          placeholder="20/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Distance OS</label>
                        <input
                          type="text"
                          value={form.visualAcuity.corrected.distance.OS}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              visualAcuity: {
                                ...prev.visualAcuity,
                                corrected: {
                                  ...prev.visualAcuity.corrected,
                                  distance: { ...prev.visualAcuity.corrected.distance, OS: event.target.value },
                                },
                              },
                            }))
                          }
                          className="h-11 w-full rounded-lg border border-gray-200 px-4 text-base"
                          placeholder="20/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Near OD</label>
                        <input
                          type="text"
                          value={form.visualAcuity.corrected.near.OD}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              visualAcuity: {
                                ...prev.visualAcuity,
                                corrected: {
                                  ...prev.visualAcuity.corrected,
                                  near: { ...prev.visualAcuity.corrected.near, OD: event.target.value },
                                },
                              },
                            }))
                          }
                          className="h-11 w-full rounded-lg border border-gray-200 px-4 text-base"
                          placeholder="J1"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Near OS</label>
                        <input
                          type="text"
                          value={form.visualAcuity.corrected.near.OS}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              visualAcuity: {
                                ...prev.visualAcuity,
                                corrected: {
                                  ...prev.visualAcuity.corrected,
                                  near: { ...prev.visualAcuity.corrected.near, OS: event.target.value },
                                },
                              },
                            }))
                          }
                          className="h-11 w-full rounded-lg border border-gray-200 px-4 text-base"
                          placeholder="J1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-yellow-50 p-4">
                  <h4 className="mb-4 text-xl font-semibold text-gray-800">Pinhole Visual Acuity</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm text-gray-600">OD</label>
                      <input
                        type="text"
                        value={form.visualAcuity.pinhole.OD}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            visualAcuity: {
                              ...prev.visualAcuity,
                              pinhole: { ...prev.visualAcuity.pinhole, OD: event.target.value },
                            },
                          }))
                        }
                        className="h-11 w-full rounded-lg border border-gray-200 px-4 text-base"
                        placeholder="20/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-gray-600">OS</label>
                      <input
                        type="text"
                        value={form.visualAcuity.pinhole.OS}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            visualAcuity: {
                              ...prev.visualAcuity,
                              pinhole: { ...prev.visualAcuity.pinhole, OS: event.target.value },
                            },
                          }))
                        }
                        className="h-11 w-full rounded-lg border border-gray-200 px-4 text-base"
                        placeholder="20/20"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'refraction' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <h4 className="mb-4 text-sm font-semibold text-gray-700">Right Eye (OD)</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Sphere</label>
                        <input
                          type="text"
                          value={form.refraction.sphereOD}
                          onChange={(event) => setForm((prev) => ({ ...prev, refraction: { ...prev.refraction, sphereOD: event.target.value } }))}
                          className="h-11 w-full rounded-lg border border-gray-200 px-4 text-base"
                          placeholder="e.g. -2.00"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Cylinder</label>
                        <input
                          type="text"
                          value={form.refraction.cylinderOD}
                          onChange={(event) => setForm((prev) => ({ ...prev, refraction: { ...prev.refraction, cylinderOD: event.target.value } }))}
                          className="h-11 w-full rounded-lg border border-gray-200 px-4 text-base"
                          placeholder="e.g. -0.75"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Axis</label>
                        <input
                          type="text"
                          value={form.refraction.axisOD}
                          onChange={(event) => setForm((prev) => ({ ...prev, refraction: { ...prev.refraction, axisOD: event.target.value } }))}
                          className="h-11 w-full rounded-lg border border-gray-200 px-4 text-base"
                          placeholder="e.g. 180"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-blue-50 p-4">
                    <h4 className="mb-4 text-sm font-semibold text-gray-700">Left Eye (OS)</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Sphere</label>
                        <input
                          type="text"
                          value={form.refraction.sphereOS}
                          onChange={(event) => setForm((prev) => ({ ...prev, refraction: { ...prev.refraction, sphereOS: event.target.value } }))}
                          className="h-11 w-full rounded-lg border border-gray-200 px-4 text-base"
                          placeholder="e.g. -1.50"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Cylinder</label>
                        <input
                          type="text"
                          value={form.refraction.cylinderOS}
                          onChange={(event) => setForm((prev) => ({ ...prev, refraction: { ...prev.refraction, cylinderOS: event.target.value } }))}
                          className="h-11 w-full rounded-lg border border-gray-200 px-4 text-base"
                          placeholder="e.g. -0.50"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Axis</label>
                        <input
                          type="text"
                          value={form.refraction.axisOS}
                          onChange={(event) => setForm((prev) => ({ ...prev, refraction: { ...prev.refraction, axisOS: event.target.value } }))}
                          className="h-11 w-full rounded-lg border border-gray-200 px-4 text-base"
                          placeholder="e.g. 170"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
                  Enter auto-refraction or subjective refraction values for each eye.
                </div>
              </div>
            )}

            {activeTab === 'iop' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">OD (mmHg)</label>
                    <input
                      type="number"
                      value={form.iop.OD}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          iop: { ...prev.iop, OD: event.target.value },
                        }))
                      }
                      className="h-12 w-full rounded-lg border border-gray-200 px-4 text-base"
                      placeholder="e.g., 16"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">OS (mmHg)</label>
                    <input
                      type="number"
                      value={form.iop.OS}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          iop: { ...prev.iop, OS: event.target.value },
                        }))
                      }
                      className="h-12 w-full rounded-lg border border-gray-200 px-4 text-base"
                      placeholder="e.g., 16"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Method</label>
                    <select
                      value={form.iop.method}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          iop: { ...prev.iop, method: event.target.value },
                        }))
                      }
                      className="h-12 w-full rounded-lg border border-gray-200 px-4 text-base"
                    >
                      {IOP_METHODS.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {highIop && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="font-medium text-red-800">Warning: Elevated IOP detected. Consider further glaucoma workup.</p>
                  </div>
                )}

                {selectedMethod && <p className="text-sm text-gray-500">Selected method: {selectedMethod.label}</p>}
              </div>
            )}

            {activeTab === 'anterior' && (
              <div className="space-y-4">
                {[
                  { key: 'lidsLashes', label: 'Lids & Lashes' },
                  { key: 'conjunctiva', label: 'Conjunctiva' },
                  { key: 'cornea', label: 'Cornea' },
                  { key: 'anteriorChamber', label: 'Anterior Chamber' },
                  { key: 'iris', label: 'Iris' },
                  { key: 'lens', label: 'Lens' },
                ].map((field) => {
                  const value = form.anteriorSegment[field.key as keyof Omit<AnteriorSegmentState, 'notes'>] as EyeFindingsState;
                  return (
                    <div key={field.key} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-5 md:items-center">
                      <div className="text-sm font-medium text-gray-700 md:col-span-1">{field.label}</div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs text-gray-500">OD</label>
                        <input
                          type="text"
                          value={value.OD}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              anteriorSegment: {
                                ...prev.anteriorSegment,
                                [field.key]: {
                                  ...(prev.anteriorSegment[field.key as keyof Omit<AnteriorSegmentState, 'notes'>] as EyeFindingsState),
                                  OD: event.target.value,
                                },
                              },
                            }))
                          }
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                          placeholder="Normal / findings"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs text-gray-500">OS</label>
                        <input
                          type="text"
                          value={value.OS}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              anteriorSegment: {
                                ...prev.anteriorSegment,
                                [field.key]: {
                                  ...(prev.anteriorSegment[field.key as keyof Omit<AnteriorSegmentState, 'notes'>] as EyeFindingsState),
                                  OS: event.target.value,
                                },
                              },
                            }))
                          }
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                          placeholder="Normal / findings"
                        />
                      </div>
                    </div>
                  );
                })}

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Anterior Segment Notes</label>
                  <textarea
                    value={form.anteriorSegment.notes}
                    onChange={(event) => setForm((prev) => ({ ...prev, anteriorSegment: { ...prev.anteriorSegment, notes: event.target.value } }))}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-base"
                    placeholder="Additional slit lamp notes..."
                  />
                </div>
              </div>
            )}

            {activeTab === 'fundus' && (
              <div className="space-y-4">
                {[
                  { key: 'opticDisc', label: 'Optic Disc' },
                  { key: 'cupDiscRatio', label: 'Cup/Disc Ratio' },
                  { key: 'macula', label: 'Macula' },
                  { key: 'vessels', label: 'Vessels' },
                  { key: 'periphery', label: 'Periphery' },
                ].map((field) => {
                  const value = form.fundus[field.key as keyof Omit<FundusState, 'notes'>] as EyeFindingsState;
                  return (
                    <div key={field.key} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-5 md:items-center">
                      <div className="text-sm font-medium text-gray-700 md:col-span-1">{field.label}</div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs text-gray-500">OD</label>
                        <input
                          type="text"
                          value={value.OD}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              fundus: {
                                ...prev.fundus,
                                [field.key]: {
                                  ...(prev.fundus[field.key as keyof Omit<FundusState, 'notes'>] as EyeFindingsState),
                                  OD: event.target.value,
                                },
                              },
                            }))
                          }
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                          placeholder="Normal / findings"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs text-gray-500">OS</label>
                        <input
                          type="text"
                          value={value.OS}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              fundus: {
                                ...prev.fundus,
                                [field.key]: {
                                  ...(prev.fundus[field.key as keyof Omit<FundusState, 'notes'>] as EyeFindingsState),
                                  OS: event.target.value,
                                },
                              },
                            }))
                          }
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                          placeholder="Normal / findings"
                        />
                      </div>
                    </div>
                  );
                })}

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Fundus Notes</label>
                  <textarea
                    value={form.fundus.notes}
                    onChange={(event) => setForm((prev) => ({ ...prev, fundus: { ...prev.fundus, notes: event.target.value } }))}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-base"
                    placeholder="Additional posterior segment notes..."
                  />
                </div>
              </div>
            )}

            {activeTab === 'diagnosis' && (
              <div className="space-y-6">
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">Diagnosis</label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          diagnosis: [...prev.diagnosis, emptyDiagnosis()],
                        }))
                      }
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="h-4 w-4" /> Add Diagnosis
                    </button>
                  </div>

                  {form.diagnosis.map((item, index) => (
                    <div key={`diagnosis-${index}`} className="mb-4 grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 md:grid-cols-4">
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">ICD Code</label>
                        <input
                          type="text"
                          value={item.icdCode}
                          onChange={(event) => {
                            const next = [...form.diagnosis];
                            next[index].icdCode = event.target.value;
                            setForm((prev) => ({ ...prev, diagnosis: next }));
                          }}
                          className="h-10 w-full rounded-lg border border-gray-200 px-3"
                          placeholder="H40.10"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs text-gray-500">Description</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(event) => {
                            const next = [...form.diagnosis];
                            next[index].description = event.target.value;
                            setForm((prev) => ({ ...prev, diagnosis: next }));
                          }}
                          className="h-10 w-full rounded-lg border border-gray-200 px-3"
                          placeholder="Primary open-angle glaucoma"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Eye</label>
                        <select
                          value={item.eye}
                          onChange={(event) => {
                            const next = [...form.diagnosis];
                            next[index].eye = event.target.value as 'OD' | 'OS' | 'OU';
                            setForm((prev) => ({ ...prev, diagnosis: next }));
                          }}
                          className="h-10 w-full rounded-lg border border-gray-200 px-3"
                        >
                          <option value="OD">OD (Right)</option>
                          <option value="OS">OS (Left)</option>
                          <option value="OU">OU (Both)</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Plan</label>
                  <textarea
                    value={form.plan}
                    onChange={(event) => setForm((prev) => ({ ...prev, plan: event.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-base"
                    rows={4}
                    placeholder="Treatment plan, further workup, referrals..."
                  />
                </div>

                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">Medications</label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          medications: [...prev.medications, emptyMedication()],
                        }))
                      }
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="h-4 w-4" /> Add Medication
                    </button>
                  </div>

                  {form.medications.map((item, index) => (
                    <div key={`medication-${index}`} className="mb-3 grid grid-cols-1 items-end gap-3 rounded-lg bg-gray-50 p-3 md:grid-cols-6">
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Medication</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(event) => updateMedication(index, 'name', event.target.value)}
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                          placeholder="Latanoprost"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Dosage</label>
                        <input
                          type="text"
                          value={item.dosage}
                          onChange={(event) => updateMedication(index, 'dosage', event.target.value)}
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                          placeholder="0.005%"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Frequency</label>
                        <input
                          type="text"
                          value={item.frequency}
                          onChange={(event) => updateMedication(index, 'frequency', event.target.value)}
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                          placeholder="Once daily"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Duration</label>
                        <input
                          type="text"
                          value={item.duration}
                          onChange={(event) => updateMedication(index, 'duration', event.target.value)}
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                          placeholder="3 months"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Eye</label>
                        <select
                          value={item.eye}
                          onChange={(event) => updateMedication(index, 'eye', event.target.value)}
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
                        >
                          <option value="OD">OD</option>
                          <option value="OS">OS</option>
                          <option value="OU">OU</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            medications: prev.medications.filter((_, medicationIndex) => medicationIndex !== index),
                          }))
                        }
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.followUp.recommended}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            followUp: { ...prev.followUp, recommended: event.target.checked },
                          }))
                        }
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Follow-up Recommended</span>
                    </label>
                  </div>

                  {form.followUp.recommended && (
                    <>
                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Interval</label>
                        <select
                          value={form.followUp.interval}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              followUp: { ...prev.followUp, interval: event.target.value },
                            }))
                          }
                          className="h-11 w-full rounded-lg border border-gray-200 px-3"
                        >
                          {FOLLOW_UP_INTERVALS.map((interval) => (
                            <option key={interval} value={interval}>
                              {interval.replace(/(^\w)|(\s\w)/g, (m) => m.toUpperCase())}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm text-gray-600">Reason</label>
                        <input
                          type="text"
                          value={form.followUp.reason}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              followUp: { ...prev.followUp, reason: event.target.value },
                            }))
                          }
                          className="h-11 w-full rounded-lg border border-gray-200 px-3"
                          placeholder="IOP check, visual field..."
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => {
              if (cancelHref.startsWith('/')) {
                router.push(cancelHref);
                return;
              }
              router.back();
            }}
            className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {mode === 'edit' ? 'Update Examination' : 'Save Examination'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
