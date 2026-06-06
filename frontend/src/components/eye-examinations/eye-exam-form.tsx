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

type OpticalPrescriptionState = {
  enabled: boolean;
  type: 'SPECTACLES' | 'CONTACT_LENS' | 'BOTH';
  lensType: string;
  lensMaterial: string;
  frameType: string;
  validityMonths: string;
  notes: string;
  addOD: string;
  addOS: string;
  pdOD: string;
  pdOS: string;
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
  opticalPrescription: OpticalPrescriptionState;
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
  stage?: 'PRELIMINARY' | 'CLINICAL' | 'COMPLETED';
  isPartialSave?: boolean;
  appointmentId?: string;
};

type EyeExamFormProps = {
  mode: 'create' | 'edit';
  initialData?: EyeExamFormInitialData | null;
  submitting: boolean;
  onSubmit: (payload: EyeExamFormSubmitPayload) => Promise<any>;
  cancelHref: string;
  stage?: 'PRELIMINARY' | 'CLINICAL' | 'ALL';
  appointmentId?: string;
};

type TabKey = 'basic' | 'va' | 'refraction' | 'iop' | 'optical' | 'anterior' | 'fundus' | 'diagnosis' | 'medicine';

type ValidationErrors = {
  patient?: string;
  chiefComplaint?: string;
};

const ALL_TABS: Array<{ id: TabKey; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: 'basic', label: 'Basic Info', icon: FileText },
  { id: 'va', label: 'Visual Acuity', icon: Eye },
  { id: 'refraction', label: 'Refraction', icon: Glasses },
  { id: 'iop', label: 'IOP', icon: Activity },
  { id: 'optical', label: 'Optical Rx', icon: Glasses },
  { id: 'anterior', label: 'Anterior Segment', icon: Target },
  { id: 'fundus', label: 'Fundus', icon: Eye },
  { id: 'diagnosis', label: 'Assessment', icon: FileText },
  { id: 'medicine', label: 'Medicine Rx', icon: Activity },
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
const emptyMedication = (): MedicationItem => ({ itemId: '', name: '', dosage: '', frequency: '', duration: '', eye: 'OU' });
const emptyEyeFindings = (): EyeFindingsState => ({ OD: '', OS: '' });

const CLINICAL_SUGGESTIONS: Record<string, string[]> = {
  lidsLashes: ['Normal', 'Dry Eye (Meibomitis)', 'Blepharitis', 'Ptosis', 'Trichiasis'],
  conjunctiva: ['Normal', 'Hyperemia', 'Pinguecula', 'Pterygium', 'Follicles'],
  cornea: ['Normal', 'Dry Eye (K-Sicca)', 'SPK', 'Infiltrate', 'Abrasion', 'Edema'],
  anteriorChamber: ['Normal', 'Deep & Quiet', 'Cells 1+', 'Flare', 'Hyphema', 'Shallow'],
  iris: ['Normal', 'Rubeosis', 'PI (Iridotomy)', 'Synechiae', 'Nevi'],
  lens: ['Normal', 'NS Cataract 1+', 'Cortical Spoke', 'PCIOL', 'Pseudoexfoliation'],
  opticDisc: ['Normal', 'Pale', 'Disc Edema', 'Notched', 'Tilted'],
  cupDiscRatio: ['0.3', '0.5', '0.7', '0.8', '0.9'],
  macula: ['Normal', 'Drusen', 'ERM', 'Macular Hole', 'Exudates', 'CSCR'],
  vessels: ['Normal', 'Tortuous', 'A/V Nicking', 'Attenuated', 'Hemorrhages'],
  periphery: ['Normal', 'Lattice', 'Retinal Hole', 'Tear', 'Degeneration', 'WSP'],
};

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
    recommended: false,
    interval: '1 month',
    reason: '',
  },
  targetIopOD: '',
  targetIopOS: '',
  opticalPrescription: {
    enabled: false,
    type: 'SPECTACLES',
    lensType: 'Single Vision',
    lensMaterial: 'CR-39',
    frameType: 'Full Rim',
    validityMonths: '12',
    notes: '',
    addOD: '+0.00',
    addOS: '+0.00',
    pdOD: '32',
    pdOS: '32',
  },
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
    opticalPrescription: defaults.opticalPrescription,
  };
}

export default function EyeExamForm({ mode, initialData, submitting, onSubmit, cancelHref, stage = 'ALL', appointmentId: propAppointmentId }: EyeExamFormProps) {
  const router = useRouter();

  const tabs = useMemo(() => {
    if (stage === 'PRELIMINARY') {
      return ALL_TABS.filter((t) => ['basic', 'va', 'refraction', 'iop', 'optical'].includes(t.id));
    }
    if (stage === 'CLINICAL') {
      return ALL_TABS.filter((t) => ['basic', 'anterior', 'fundus', 'diagnosis', 'medicine'].includes(t.id));
    }
    return ALL_TABS;
  }, [stage]);

  const [activeTab, setActiveTab] = useState<TabKey>(() => tabs[0]?.id || 'basic');
  const [form, setForm] = useState<ExamFormState>(() => buildInitialFormState(initialData));
  const [errors, setErrors] = useState<ValidationErrors>({});

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState(initialData?.patientName ?? '');
  const [patientOpen, setPatientOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(initialData?.patientId ?? '');

  const [doctorId, setDoctorId] = useState(initialData?.doctorId ?? '');

  const [pharmacyItems, setPharmacyItems] = useState<any[]>([]);
  const [medicineSearch, setMedicineSearch] = useState('');

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

      try {
        const pharmacyRes = await api.get('/inventory/pharmacy?limit=1000');
        if (!cancelled) {
          setPharmacyItems(pharmacyRes.data?.data ?? pharmacyRes.data ?? []);
        }
      } catch (err) {
        console.error('Failed to load pharmacy items', err);
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

  const updateMedication = (index: number, key: keyof MedicationItem, value: any) => {
    setForm((prev) => ({
      ...prev,
      medications: prev.medications.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }));
  };

  const markAnteriorNormal = () => {
    setForm((prev) => ({
      ...prev,
      anteriorSegment: {
        ...prev.anteriorSegment,
        lidsLashes: { OD: prev.anteriorSegment.lidsLashes.OD || 'Normal', OS: prev.anteriorSegment.lidsLashes.OS || 'Normal' },
        conjunctiva: { OD: prev.anteriorSegment.conjunctiva.OD || 'Normal', OS: prev.anteriorSegment.conjunctiva.OS || 'Normal' },
        cornea: { OD: prev.anteriorSegment.cornea.OD || 'Normal', OS: prev.anteriorSegment.cornea.OS || 'Normal' },
        anteriorChamber: { OD: prev.anteriorSegment.anteriorChamber.OD || 'Normal', OS: prev.anteriorSegment.anteriorChamber.OS || 'Normal' },
        iris: { OD: prev.anteriorSegment.iris.OD || 'Normal', OS: prev.anteriorSegment.iris.OS || 'Normal' },
        lens: { OD: prev.anteriorSegment.lens.OD || 'Normal', OS: prev.anteriorSegment.lens.OS || 'Normal' },
      },
    }));
  };

  const markFundusNormal = () => {
    setForm((prev) => ({
      ...prev,
      fundus: {
        ...prev.fundus,
        opticDisc: { OD: prev.fundus.opticDisc.OD || 'Normal', OS: prev.fundus.opticDisc.OS || 'Normal' },
        cupDiscRatio: { OD: prev.fundus.cupDiscRatio.OD || '0.3', OS: prev.fundus.cupDiscRatio.OS || '0.3' },
        macula: { OD: prev.fundus.macula.OD || 'Normal', OS: prev.fundus.macula.OS || 'Normal' },
        vessels: { OD: prev.fundus.vessels.OD || 'Normal', OS: prev.fundus.vessels.OS || 'Normal' },
        periphery: { OD: prev.fundus.periphery.OD || 'Normal', OS: prev.fundus.periphery.OS || 'Normal' },
      },
    }));
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
      appointmentId: propAppointmentId,
      stage: stage === 'PRELIMINARY' ? 'PRELIMINARY' : 'COMPLETED',
    };

    const res = await onSubmit(payload);

    // Integrated Prescription Workflow: Save Optical Prescription if enabled
    if (form.opticalPrescription?.enabled && res?.id) {
      try {
        await api.post('/prescriptions', {
          patientId: selectedPatientId,
          type: form.opticalPrescription.type,
          validityMonths: Number(form.opticalPrescription.validityMonths),
          notes: form.opticalPrescription.notes || null,
          odSphere: form.refraction.sphereOD,
          odCylinder: form.refraction.cylinderOD,
          odAxis: Number(form.refraction.axisOD) || 0,
          odAdd: form.opticalPrescription.addOD,
          odPd: Number(form.opticalPrescription.pdOD) || 0,
          odPrism: '0',
          osSphere: form.refraction.sphereOS,
          osCylinder: form.refraction.cylinderOS,
          osAxis: Number(form.refraction.axisOS) || 0,
          osAdd: form.opticalPrescription.addOS,
          osPd: Number(form.opticalPrescription.pdOS) || 0,
          osPrism: '0',
          lensType: form.opticalPrescription.lensType,
          lensMaterial: form.opticalPrescription.lensMaterial,
          frameType: form.opticalPrescription.frameType,
          appointmentId: propAppointmentId,
          examId: res.id,
        });
        toast.success('Optical prescription created successfully');
      } catch (err) {
        console.error('Failed to create integrated prescription', err);
        toast.error('Exam saved, but failed to create optical prescription');
      }
    }

    // Integrated Medicine Prescriptions
    if (form.medications.length > 0 && res?.id) {
      let medSuccess = 0;
      for (const med of form.medications) {
        if (!med.name) continue;
        try {
          await api.post('/prescription-items', {
            examId: res.id,
            itemType: 'PHARMACY',
            itemId: med.itemId || null,
            itemName: med.name || null,
            quantity: med.quantity || 1,
            instructions: buildStructuredInstruction({
              dosage: med.dosage,
              frequency: med.frequency,
              duration: med.duration,
              eye: med.eye === 'NONE' ? 'N/A' : med.eye,
              notes: med.notes || '',
            }),
          });
          medSuccess++;
        } catch (err) {
          console.error('Failed to create medicine prescription', err);
        }
      }
      if (medSuccess > 0) {
        toast.success(`${medSuccess} medicine prescription(s) created`);
      }
    }
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
            {tabs.map((tab) => (
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
              <div className="space-y-6">
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-4">
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
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
                        'h-11 w-full rounded-lg border px-4 text-sm transition-all focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none',
                        errors.chiefComplaint ? 'border-red-300' : 'border-gray-200'
                      )}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">History of Present Illness</label>
                    <textarea
                      value={form.historyOfPresentIllness}
                      onChange={(event) => setForm((prev) => ({ ...prev, historyOfPresentIllness: event.target.value }))}
                      placeholder="Detailed history..."
                      rows={5}
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm transition-all focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'va' && (
              <div className="space-y-6">
                <div className="flex items-center gap-6 rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">Method:</span>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      checked={form.visualAcuity.method === 'snellen'}
                      onChange={() =>
                        setForm((prev) => ({
                          ...prev,
                          visualAcuity: { ...prev.visualAcuity, method: 'snellen' },
                        }))
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">Snellen</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      checked={form.visualAcuity.method === 'logmar'}
                      onChange={() =>
                        setForm((prev) => ({
                          ...prev,
                          visualAcuity: { ...prev.visualAcuity, method: 'logmar' },
                        }))
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">LogMAR</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Uncorrected VA */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h4 className="mb-4 text-sm font-bold text-gray-800 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                      Uncorrected Visual Acuity
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Distance OD</label>
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
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                          placeholder="20/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Distance OS</label>
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
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                          placeholder="20/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Near OD</label>
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
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                          placeholder="J1"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Near OS</label>
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
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                          placeholder="J1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* BCVA */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h4 className="mb-4 text-sm font-bold text-gray-800 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                      Best Corrected Visual Acuity (BCVA)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Distance OD</label>
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
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                          placeholder="20/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Distance OS</label>
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
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                          placeholder="20/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Near OD</label>
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
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                          placeholder="J1"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Near OS</label>
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
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                          placeholder="J1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pinhole */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h4 className="mb-4 text-sm font-bold text-gray-800 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500"></div>
                    Pinhole Visual Acuity
                  </h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">OD</label>
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
                        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                        placeholder="20/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">OS</label>
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
                        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                        placeholder="20/20"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'refraction' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* OD */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h4 className="mb-4 text-sm font-bold text-gray-800 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                      Right Eye (OD)
                    </h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Sphere</label>
                        <input
                          type="text"
                          value={form.refraction.sphereOD}
                          onChange={(event) => setForm((prev) => ({ ...prev, refraction: { ...prev.refraction, sphereOD: event.target.value } }))}
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                          placeholder="e.g. -2.00"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Cylinder</label>
                        <input
                          type="text"
                          value={form.refraction.cylinderOD}
                          onChange={(event) => setForm((prev) => ({ ...prev, refraction: { ...prev.refraction, cylinderOD: event.target.value } }))}
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                          placeholder="e.g. -0.75"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Axis</label>
                        <input
                          type="text"
                          value={form.refraction.axisOD}
                          onChange={(event) => setForm((prev) => ({ ...prev, refraction: { ...prev.refraction, axisOD: event.target.value } }))}
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                          placeholder="e.g. 180"
                        />
                      </div>
                    </div>
                  </div>

                  {/* OS */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h4 className="mb-4 text-sm font-bold text-gray-800 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                      Left Eye (OS)
                    </h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Sphere</label>
                        <input
                          type="text"
                          value={form.refraction.sphereOS}
                          onChange={(event) => setForm((prev) => ({ ...prev, refraction: { ...prev.refraction, sphereOS: event.target.value } }))}
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                          placeholder="e.g. -1.50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Cylinder</label>
                        <input
                          type="text"
                          value={form.refraction.cylinderOS}
                          onChange={(event) => setForm((prev) => ({ ...prev, refraction: { ...prev.refraction, cylinderOS: event.target.value } }))}
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                          placeholder="e.g. -0.50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Axis</label>
                        <input
                          type="text"
                          value={form.refraction.axisOS}
                          onChange={(event) => setForm((prev) => ({ ...prev, refraction: { ...prev.refraction, axisOS: event.target.value } }))}
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                          placeholder="e.g. 170"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 text-xs font-medium text-gray-500 text-center">
                  Enter auto-refraction or subjective refraction values for each eye.
                </div>
              </div>
            )}

            {activeTab === 'iop' && (
              <div className="space-y-6">
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">OD (mmHg)</label>
                      <input
                        type="number"
                        value={form.iop.OD}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            iop: { ...prev.iop, OD: event.target.value },
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm transition-all focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                        placeholder="e.g., 16"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">OS (mmHg)</label>
                      <input
                        type="number"
                        value={form.iop.OS}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            iop: { ...prev.iop, OS: event.target.value },
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm transition-all focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                        placeholder="e.g., 16"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Method</label>
                      <select
                        value={form.iop.method}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            iop: { ...prev.iop, method: event.target.value },
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm transition-all focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none bg-white"
                      >
                        {IOP_METHODS.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {Number(form.iop.OD) > 21 || Number(form.iop.OS) > 21 ? (
                    <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                      <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      <p className="text-xs font-medium text-amber-800">
                        Notice: Elevated intraocular pressure detected (&gt;21 mmHg). Consider further clinical correlation or glaucoma screening.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {activeTab === 'anterior' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Slit Lamp Findings</h3>
                  <button
                    type="button"
                    onClick={markAnteriorNormal}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    Mark All Normal
                  </button>
                </div>

                {/* Column Headers */}
                <div className="hidden md:grid md:grid-cols-[160px_1fr_1fr] gap-4 px-4 pb-1">
                  <div className="text-xs font-medium text-gray-400 uppercase">Structure</div>
                  <div className="text-xs font-medium text-gray-400 uppercase text-center">OD (Right Eye)</div>
                  <div className="text-xs font-medium text-gray-400 uppercase text-center">OS (Left Eye)</div>
                </div>

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
                    <div key={field.key} className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[160px_1fr_1fr] md:items-center">
                        <div className="text-sm font-medium text-gray-700">{field.label}</div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-400 md:hidden">OD (Right Eye)</label>
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
                            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 placeholder:text-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                            placeholder="Normal / findings"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-400 md:hidden">OS (Left Eye)</label>
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
                            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 placeholder:text-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                            placeholder="Normal / findings"
                          />
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-gray-100 pt-2 md:pl-[160px]">
                        {CLINICAL_SUGGESTIONS[field.key]?.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                anteriorSegment: {
                                  ...prev.anteriorSegment,
                                  [field.key]: {
                                    OD: prev.anteriorSegment[field.key as keyof Omit<AnteriorSegmentState, 'notes'>].OD || s,
                                    OS: prev.anteriorSegment[field.key as keyof Omit<AnteriorSegmentState, 'notes'>].OS || s,
                                  },
                                },
                              }));
                            }}
                            className="rounded-full bg-gray-50 px-2.5 py-0.5 text-[11px] text-gray-500 border border-gray-200 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          >
                            {s}
                          </button>
                        ))}
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
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                    placeholder="Additional slit lamp notes..."
                  />
                </div>
              </div>
            )}

            {activeTab === 'fundus' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Posterior Segment Findings</h3>
                  <button
                    type="button"
                    onClick={markFundusNormal}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    Mark All Normal
                  </button>
                </div>

                {/* Column Headers */}
                <div className="hidden md:grid md:grid-cols-[160px_1fr_1fr] gap-4 px-4 pb-1">
                  <div className="text-xs font-medium text-gray-400 uppercase">Structure</div>
                  <div className="text-xs font-medium text-gray-400 uppercase text-center">OD (Right Eye)</div>
                  <div className="text-xs font-medium text-gray-400 uppercase text-center">OS (Left Eye)</div>
                </div>

                {[
                  { key: 'opticDisc', label: 'Optic Disc' },
                  { key: 'cupDiscRatio', label: 'Cup/Disc Ratio' },
                  { key: 'macula', label: 'Macula' },
                  { key: 'vessels', label: 'Vessels' },
                  { key: 'periphery', label: 'Periphery' },
                ].map((field) => {
                  const value = form.fundus[field.key as keyof Omit<FundusState, 'notes'>] as EyeFindingsState;
                  return (
                    <div key={field.key} className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[160px_1fr_1fr] md:items-center">
                        <div className="text-sm font-medium text-gray-700">{field.label}</div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-400 md:hidden">OD (Right Eye)</label>
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
                            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 placeholder:text-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                            placeholder="Normal / findings"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-400 md:hidden">OS (Left Eye)</label>
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
                            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 placeholder:text-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                            placeholder="Normal / findings"
                          />
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-gray-100 pt-2 md:pl-[160px]">
                        {CLINICAL_SUGGESTIONS[field.key]?.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                fundus: {
                                  ...prev.fundus,
                                  [field.key]: {
                                    OD: prev.fundus[field.key as keyof Omit<FundusState, 'notes'>].OD || s,
                                    OS: prev.fundus[field.key as keyof Omit<FundusState, 'notes'>].OS || s,
                                  },
                                },
                              }));
                            }}
                            className="rounded-full bg-gray-50 px-2.5 py-0.5 text-[11px] text-gray-500 border border-gray-200 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          >
                            {s}
                          </button>
                        ))}
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
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                    placeholder="Additional posterior segment notes..."
                  />
                </div>
              </div>
            )}

            {activeTab === 'optical' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-6 flex items-center justify-between rounded-xl border border-sky-100 bg-sky-50/50 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                      <Glasses className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Optical Prescription</h3>
                      <p className="text-xs text-gray-500">Create prescription directly in this report</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Enable Rx</span>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        opticalPrescription: { ...prev.opticalPrescription, enabled: !prev.opticalPrescription.enabled }
                      }))}
                      className={cn(
                        "relative h-5 w-10 rounded-full transition-colors",
                        form.opticalPrescription.enabled ? "bg-blue-600" : "bg-gray-200"
                      )}
                    >
                      <div className={cn(
                        "absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition-all shadow-sm",
                        form.opticalPrescription.enabled ? "translate-x-5" : "translate-x-0"
                      )} />
                    </button>
                  </div>
                </div>

                {form.opticalPrescription.enabled ? (
                  <div className="mb-6 space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-4">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.1em] text-gray-400 flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                          Right Eye (OD)
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Sphere</label>
                            <input type="text" value={form.refraction.sphereOD} readOnly className="h-10 w-full rounded-lg border border-gray-100 bg-gray-50 px-3 text-sm font-bold text-gray-700 cursor-not-allowed" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Cylinder</label>
                            <input type="text" value={form.refraction.cylinderOD} readOnly className="h-10 w-full rounded-lg border border-gray-100 bg-gray-50 px-3 text-sm font-bold text-gray-700 cursor-not-allowed" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Axis</label>
                            <input type="text" value={form.refraction.axisOD} readOnly className="h-10 w-full rounded-lg border border-gray-100 bg-gray-50 px-3 text-sm font-bold text-gray-700 cursor-not-allowed" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Add</label>
                            <input
                              type="text"
                              value={form.opticalPrescription.addOD}
                              onChange={(e) => setForm(prev => ({ ...prev, opticalPrescription: { ...prev.opticalPrescription, addOD: e.target.value } }))}
                              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none"
                              placeholder="+0.00"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">PD</label>
                            <input
                              type="text"
                              value={form.opticalPrescription.pdOD}
                              onChange={(e) => setForm(prev => ({ ...prev, opticalPrescription: { ...prev.opticalPrescription, pdOD: e.target.value } }))}
                              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none"
                              placeholder="32"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.1em] text-gray-400 flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                          Left Eye (OS)
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Sphere</label>
                            <input type="text" value={form.refraction.sphereOS} readOnly className="h-10 w-full rounded-lg border border-gray-100 bg-gray-50 px-3 text-sm font-bold text-gray-700 cursor-not-allowed" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Cylinder</label>
                            <input type="text" value={form.refraction.cylinderOS} readOnly className="h-10 w-full rounded-lg border border-gray-100 bg-gray-50 px-3 text-sm font-bold text-gray-700 cursor-not-allowed" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Axis</label>
                            <input type="text" value={form.refraction.axisOS} readOnly className="h-10 w-full rounded-lg border border-gray-100 bg-gray-50 px-3 text-sm font-bold text-gray-700 cursor-not-allowed" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Add</label>
                            <input
                              type="text"
                              value={form.opticalPrescription.addOS}
                              onChange={(e) => setForm(prev => ({ ...prev, opticalPrescription: { ...prev.opticalPrescription, addOS: e.target.value } }))}
                              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none"
                              placeholder="+0.00"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">PD</label>
                            <input
                              type="text"
                              value={form.opticalPrescription.pdOS}
                              onChange={(e) => setForm(prev => ({ ...prev, opticalPrescription: { ...prev.opticalPrescription, pdOS: e.target.value } }))}
                              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none"
                              placeholder="32"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 pt-4 border-t border-gray-50">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Lens Type</label>
                        <select
                          value={form.opticalPrescription.lensType}
                          onChange={(e) => setForm(prev => ({ ...prev, opticalPrescription: { ...prev.opticalPrescription, lensType: e.target.value } }))}
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none bg-white"
                        >
                          <option value="Single Vision">Single Vision</option>
                          <option value="Bifocal">Bifocal</option>
                          <option value="Progressive">Progressive</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Material</label>
                        <select
                          value={form.opticalPrescription.lensMaterial}
                          onChange={(e) => setForm(prev => ({ ...prev, opticalPrescription: { ...prev.opticalPrescription, lensMaterial: e.target.value } }))}
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none bg-white"
                        >
                          <option value="CR-39">CR-39</option>
                          <option value="Polycarbonate">Polycarbonate</option>
                          <option value="High Index">High Index</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Validity</label>
                        <select
                          value={form.opticalPrescription.validityMonths}
                          onChange={(e) => setForm(prev => ({ ...prev, opticalPrescription: { ...prev.opticalPrescription, validityMonths: e.target.value } }))}
                          className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none bg-white"
                        >
                          <option value="6">6 Months</option>
                          <option value="12">12 Months</option>
                          <option value="24">24 Months</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/30 py-12 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                      <Glasses className="h-6 w-6" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900">Optical Prescription Not Enabled</h4>
                    <p className="mt-1 text-xs text-gray-500 max-w-[240px]">Use the toggle above to enable and fill out the prescription.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'diagnosis' && (
              <div className="space-y-6">
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-500"></div>
                      Diagnosis
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          diagnosis: [...prev.diagnosis, emptyDiagnosis()],
                        }))
                      }
                      className="flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Diagnosis
                    </button>
                  </div>

                  <div className="space-y-3">
                    {form.diagnosis.map((item, index) => (
                      <div key={`diagnosis-${index}`} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px_40px] items-end pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(event) => {
                              const next = [...form.diagnosis];
                              next[index].description = event.target.value;
                              setForm((prev) => ({ ...prev, diagnosis: next }));
                            }}
                            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                            placeholder="e.g. Primary open-angle glaucoma"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Eye</label>
                          <select
                            value={item.eye}
                            onChange={(event) => {
                              const next = [...form.diagnosis];
                              next[index].eye = event.target.value as 'OD' | 'OS' | 'OU';
                              setForm((prev) => ({ ...prev, diagnosis: next }));
                            }}
                            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none bg-white"
                          >
                            <option value="OD">OD (Right)</option>
                            <option value="OS">OS (Left)</option>
                            <option value="OU">OU (Both)</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const next = form.diagnosis.filter((_, i) => i !== index);
                            setForm((prev) => ({ ...prev, diagnosis: next }));
                          }}
                          className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h4 className="mb-4 text-sm font-bold text-gray-800 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"></div>
                    Management Plan
                  </h4>
                  <textarea
                    value={form.plan}
                    onChange={(event) => setForm((prev) => ({ ...prev, plan: event.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                    rows={4}
                    placeholder="Treatment plan, further workup, referrals..."
                  />
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={form.followUp.recommended}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            followUp: { ...prev.followUp, recommended: event.target.checked },
                          }))
                        }
                        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">Follow-up Recommended</span>
                    </label>

                    {form.followUp.recommended && (
                      <div className="flex flex-1 flex-wrap gap-4 animate-in fade-in slide-in-from-left-2">
                        <div className="flex-1 min-w-[150px] space-y-1">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Interval</label>
                          <select
                            value={form.followUp.interval}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                followUp: { ...prev.followUp, interval: event.target.value },
                              }))
                            }
                            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none bg-white"
                          >
                            {FOLLOW_UP_INTERVALS.map((interval) => (
                              <option key={interval} value={interval}>
                                {interval.replace(/(^\w)|(\s\w)/g, (m) => m.toUpperCase())}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex-[2] min-w-[200px] space-y-1">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</label>
                          <input
                            type="text"
                            value={form.followUp.reason}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                followUp: { ...prev.followUp, reason: event.target.value },
                              }))
                            }
                            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                            placeholder="e.g. IOP check, visual field..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'medicine' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Medicine Prescription</h3>
                      <p className="text-xs text-gray-500">Enable and create pharmacy prescriptions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Enable Rx</span>
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, medications: prev.medications.length === 0 ? [emptyMedication()] : prev.medications }))}
                        className={cn(
                          "relative h-5 w-10 rounded-full transition-colors",
                          form.medications.length > 0 ? "bg-blue-600" : "bg-gray-200"
                        )}
                      >
                        <div className={cn(
                          "absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition-all shadow-sm",
                          form.medications.length > 0 ? "translate-x-5" : "translate-x-0"
                        )} />
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={form.medications.length === 0}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          medications: [...prev.medications, emptyMedication()],
                        }))
                      }
                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-all disabled:opacity-30 disabled:grayscale"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Medication
                    </button>
                  </div>
                </div>

                {form.medications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/30 py-12 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                      <Activity className="h-6 w-6" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900">No Medications Prescribed</h4>
                    <p className="mt-1 text-xs text-gray-500 max-w-[240px]">Use the toggle above to enable and start adding medications.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {form.medications.map((item, index) => (
                      <div key={`medication-${index}`} className="relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              medications: prev.medications.filter((_, i) => i !== index),
                            }))
                          }
                          className="absolute right-4 top-4 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>

                        <div className="grid grid-cols-1 gap-5">
                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            <div className="lg:col-span-2 space-y-1">
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Medicine Name</label>
                              <select
                                value={item.itemId}
                                onChange={(e) => {
                                  const p = pharmacyItems.find((x) => x.id === e.target.value);
                                  const next = [...form.medications];
                                  
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
                                    name: p?.itemName || '',
                                    category: p?.category || p?.itemType || '',
                                    eye: isTopical ? 'OU' : 'NONE',
                                  };
                                  setForm((prev) => ({ ...prev, medications: next }));
                                }}
                                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none bg-white"
                              >
                                <option value="">Select from inventory</option>
                                {pharmacyItems.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.itemName} {p.strength ? `(${p.strength})` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity</label>
                              <input
                                type="number"
                                value={item.quantity || 1}
                                onChange={(e) => updateMedication(index, 'quantity', parseInt(e.target.value) || 0)}
                                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none"
                                placeholder="1"
                                min="1"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                            <div className="space-y-1">
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Dosage</label>
                              <input
                                type="text"
                                value={item.dosage}
                                onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none"
                                placeholder="e.g. 0.5%"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Frequency</label>
                              <input
                                type="text"
                                value={item.frequency}
                                onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none"
                                placeholder="e.g. BD (Twice daily)"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</label>
                              <input
                                type="text"
                                value={item.duration}
                                onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none"
                                placeholder="e.g. 7 days"
                              />
                            </div>
                            {item.eye !== 'NONE' && (
                              <div className="space-y-1">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Eye</label>
                                <select
                                  value={item.eye}
                                  onChange={(e) => updateMedication(index, 'eye', e.target.value as any)}
                                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-blue-500 focus:outline-none bg-white"
                                >
                                  <option value="OD">OD (Right Eye)</option>
                                  <option value="OS">OS (Left Eye)</option>
                                  <option value="OU">OU (Both Eyes)</option>
                                </select>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes / Instructions</label>
                            <textarea
                              value={item.notes || ''}
                              onChange={(e) => updateMedication(index, 'notes', e.target.value)}
                              rows={2}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                              placeholder="Additional advice for patient..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                {submitting ? 'Saving...' : 'Save Examination'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
