'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import {
  ArrowLeft,
  CalendarPlus,
  ChevronRight,
  Eye,
  Loader2,
  Receipt,
  Scissors,
  Calendar,
  Wallet,
  RotateCcw,
  User,
} from 'lucide-react';

type Paginated<T> = {
  data?: T[];
  total?: number;
};

type PatientDetail = {
  id: string;
  fullName?: string | null;
  patientNumber?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  allergies?: string | null;
  currentMedications?: string | null;
  medicalHistory?: string | null;
  familyMedicalHistory?: string | null;
  appointments?: AppointmentRecord[];
};

type DoctorRef = { user?: { fullName?: string | null } | null };

type SurgeryRef = {
  id: string;
  surgeryType?: string | null;
  surgeryDate?: string | null;
  status?: string | null;
};

type ClinicalRef = {
  id: string;
  diagnosis?: string | null;
  surgery?: SurgeryRef | null;
};

type AppointmentRecord = {
  id: string;
  appointmentDate?: string | null;
  status?: string | null;
  amount?: number | string | null;
  doctor?: DoctorRef | null;
  clinicalExamination?: ClinicalRef | null;
};

type EyeExam = {
  id: string;
  chiefComplaint?: string | null;
  createdAt?: string | null;
  vaUnaidedOD?: string | null;
  vaUnaidedOS?: string | null;
  vaBcvaOD?: string | null;
  vaBcvaOS?: string | null;
  iopOD?: number | null;
  iopOS?: number | null;
  refractionSphereOD?: string | null;
  refractionSphereOS?: string | null;
  doctor?: DoctorRef | null;
  patient?: { id?: string | null } | null;
};

type OpticalPrescription = {
  id: string;
  createdAt?: string | null;
  status?: string | null;
  type?: string | null;
  odSphere?: string | null;
  odCylinder?: string | null;
  odAxis?: number | null;
  odAdd?: string | null;
  odPd?: number | null;
  osSphere?: string | null;
  osCylinder?: string | null;
  osAxis?: number | null;
  osAdd?: string | null;
  osPd?: number | null;
};

type FollowUpRecord = {
  id: string;
  dueDate?: string | null;
  sourceType?: 'EXAMINATION' | 'PRESCRIPTION' | 'SURGERY' | 'OPTICAL' | string;
  status?: 'PENDING' | 'DONE' | 'CANCELLED' | 'OVERDUE' | string;
  notes?: string | null;
};

type SectionKey = 'patient-info' | 'eye-exams' | 'prescriptions' | 'surgeries' | 'appointments' | 'billing' | 'followups';
type EyeHistoryTabKey = 'refraction' | 'iop-va' | 'surgeries' | 'sph-trend';

function formatDate(input?: string | null): string {
  if (!input) return 'N/A';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }).format(d);
}

function formatTime(input?: string | null): string {
  if (!input) return '--:--';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '--:--';
  return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(d);
}

function formatVA(exam: EyeExam): string {
  const od = exam.vaBcvaOD || exam.vaUnaidedOD || '-';
  const os = exam.vaBcvaOS || exam.vaUnaidedOS || '-';
  return `VA: OD ${od} | OS ${os}`;
}

function formatGender(value?: string | null): string {
  const g = String(value || '').toUpperCase();
  if (g === 'MALE') return 'Male';
  if (g === 'FEMALE') return 'Female';
  return 'N/A';
}

function formatPatientIdentifier(patient: PatientDetail): string {
  const pn = (patient.patientNumber || '').trim();
  if (pn) return pn;

  return 'N/A';
}

function formatSystemId(value?: string | null): string {
  const raw = String(value || '').trim();
  if (!raw) return 'N/A';
  if (raw.length <= 16) return raw;
  return `${raw.slice(0, 8)}…${raw.slice(-4)}`;
}

function toTypeLabel(type?: string | null): string {
  const v = String(type || '').toUpperCase();
  if (v === 'SPECTACLES') return 'Spectacles';
  if (v === 'CONTACT_LENS') return 'Contact Lens';
  if (v === 'BOTH') return 'Both';
  return type || 'N/A';
}

function hasAnyRefraction(prefix: 'od' | 'os', row: OpticalPrescription): boolean {
  const sphere = prefix === 'od' ? row.odSphere : row.osSphere;
  const cylinder = prefix === 'od' ? row.odCylinder : row.osCylinder;
  const axis = prefix === 'od' ? row.odAxis : row.osAxis;
  const add = prefix === 'od' ? row.odAdd : row.osAdd;
  const pd = prefix === 'od' ? row.odPd : row.osPd;
  return !!(
    (sphere && String(sphere).trim()) ||
    (cylinder && String(cylinder).trim()) ||
    (add && String(add).trim()) ||
    (typeof axis === 'number' && !Number.isNaN(axis)) ||
    (typeof pd === 'number' && !Number.isNaN(pd))
  );
}

function formatEyeSummary(prefix: 'od' | 'os', row: OpticalPrescription): string {
  if (!hasAnyRefraction(prefix, row)) return '-';
  const sphere = prefix === 'od' ? row.odSphere : row.osSphere;
  const cylinder = prefix === 'od' ? row.odCylinder : row.osCylinder;
  const axis = prefix === 'od' ? row.odAxis : row.osAxis;
  const add = prefix === 'od' ? row.odAdd : row.osAdd;
  const pd = prefix === 'od' ? row.odPd : row.osPd;

  const parts: string[] = [];
  if (sphere) parts.push(`${sphere}`);
  if (cylinder) parts.push(`${cylinder}`);
  if (typeof axis === 'number' && !Number.isNaN(axis)) parts.push(`x ${axis}deg`);
  if (add) parts.push(`Add ${add}`);
  if (typeof pd === 'number' && !Number.isNaN(pd)) parts.push(`PD ${pd}`);
  return parts.join(' ');
}

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>('patient-info');
  const [eyeHistoryTab, setEyeHistoryTab] = useState<EyeHistoryTabKey>('refraction');

  const [eyeExams, setEyeExams] = useState<EyeExam[]>([]);
  const [rxRows, setRxRows] = useState<OpticalPrescription[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([]);

  const fetchPatient = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/patients/${id}`);
      setPatient(res.data as PatientDetail);
    } catch {
      toast.error('Failed to load patient');
      router.push('/dashboard/patients');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const fetchEyeExams = useCallback(async () => {
    try {
      const res = await api.get('/eye-examinations', { params: { patientId: id, page: 1, limit: 50 } });
      const body = res.data as Paginated<EyeExam> | EyeExam[];
      const rows = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
      const filtered = rows.filter((row) => !row.patient?.id || row.patient.id === id);
      setEyeExams(filtered);
    } catch {
      setEyeExams([]);
    }
  }, [id]);

  const fetchPrescriptions = useCallback(async () => {
    try {
      const res = await api.get('/prescriptions', { params: { patientId: id, page: 1, limit: 50 } });
      const body = res.data as Paginated<OpticalPrescription> | OpticalPrescription[];
      const rows = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
      setRxRows(rows);
    } catch {
      setRxRows([]);
    }
  }, [id]);

  const fetchFollowUps = useCallback(async () => {
    try {
      const res = await api.get(`/follow-ups/patient/${id}`);
      const body = res.data as FollowUpRecord[];
      const rows = Array.isArray(body) ? body : [];
      const unique = new Map<string, FollowUpRecord>();
      for (const row of rows) {
        const key = `${row.dueDate || ''}|${row.sourceType || ''}|${(row.notes || '').trim()}`;
        if (!unique.has(key)) unique.set(key, row);
      }
      setFollowUps(Array.from(unique.values()));
    } catch {
      setFollowUps([]);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    void fetchPatient();
    void fetchEyeExams();
    void fetchPrescriptions();
    void fetchFollowUps();
  }, [id, fetchPatient, fetchEyeExams, fetchPrescriptions, fetchFollowUps]);

  const surgeries = useMemo(() => {
    if (!patient?.appointments) return [] as SurgeryRef[];
    return patient.appointments
      .map((a) => a.clinicalExamination?.surgery)
      .filter((s): s is SurgeryRef => Boolean(s && s.id));
  }, [patient]);

  const billRows = useMemo(() => {
    if (!patient?.appointments) return [] as AppointmentRecord[];
    return patient.appointments.filter((a) => Number(a.amount ?? 0) > 0);
  }, [patient]);

  const patientHistoryRows = useMemo(() => {
    const rows = (patient?.appointments || []).map((a) => ({
      id: a.id,
      date: a.appointmentDate,
      doctor: a.doctor?.user?.fullName || 'Unknown',
      diagnosis: a.clinicalExamination?.diagnosis || 'N/A',
      status: a.status || 'PENDING',
    }));
    return rows.slice(0, 8);
  }, [patient?.appointments]);

  const medicalHistoryItems = useMemo(() => {
    const all = (patient?.appointments || [])
      .map((a) => (a.clinicalExamination?.diagnosis || '').trim())
      .filter(Boolean);
    const unique = Array.from(new Set(all));
    return unique.slice(0, 6);
  }, [patient?.appointments]);

  const pendingFollowUps = useMemo(
    () => followUps.filter((f) => String(f.status || '').toUpperCase() === 'PENDING' || String(f.status || '').toUpperCase() === 'OVERDUE'),
    [followUps]
  );

  const eyeHistoryTabs = useMemo(
    () => [
      { key: 'refraction' as const, label: 'Refraction', count: eyeExams.length },
      { key: 'iop-va' as const, label: 'IOP / VA', count: eyeExams.length },
      { key: 'surgeries' as const, label: 'Surgeries', count: surgeries.length },
      { key: 'sph-trend' as const, label: 'SPH Trend', count: eyeExams.length },
    ],
    [eyeExams.length, surgeries.length]
  );

  const latestExam = useMemo(() => {
    if (eyeExams.length === 0) return null;
    return [...eyeExams].sort((a, b) => {
      const ad = new Date(a.createdAt || 0).getTime();
      const bd = new Date(b.createdAt || 0).getTime();
      return bd - ad;
    })[0];
  }, [eyeExams]);

  const sectionItems = useMemo(
    () => [
      { key: 'patient-info' as const, label: 'Patient Info', icon: User },
      { key: 'eye-exams' as const, label: 'Eye Exams', icon: Eye, count: eyeExams.length },
      { key: 'prescriptions' as const, label: 'Prescriptions', icon: Receipt, count: rxRows.length },
      { key: 'surgeries' as const, label: 'Surgeries', icon: Scissors, count: surgeries.length },
      { key: 'appointments' as const, label: 'Appointments', icon: Calendar, count: patient?.appointments?.length || 0 },
      { key: 'billing' as const, label: 'Billing', icon: Wallet, count: billRows.length },
      { key: 'followups' as const, label: 'Follow-ups', icon: RotateCcw, count: pendingFollowUps.length },
    ],
    [eyeExams.length, rxRows.length, surgeries.length, patient?.appointments?.length, billRows.length, pendingFollowUps.length]
  );

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0EA5E9]" />
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Patient Details</h1>
        <p className="text-base text-slate-600">View and manage patient information</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <Button variant="ghost" className="px-0 text-[#0EA5E9] hover:text-[#0284C7]" onClick={() => router.push('/dashboard/patients')}>
            <ArrowLeft className="h-4 w-4" />
            Back to Patients
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{patient.fullName || 'Patient'}</h1>
          <p className="text-base text-slate-500">ID: {formatPatientIdentifier(patient)}</p>
          <p className="text-sm text-slate-400">System ID: {formatSystemId(patient.id)}</p>
        </div>

        <Button
          className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white h-11 px-5"
          onClick={() => {
            router.push(`/dashboard/appointments/new?patientId=${encodeURIComponent(id)}`);
          }}
        >
          <CalendarPlus className="h-4 w-4" />
          Book Appointment
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-3 border-slate-200">
          <CardContent className="p-4">
            <div className="space-y-2">
              {sectionItems.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveSection(item.key)}
                    className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 transition-colors ${
                      active ? 'bg-sky-50 border-sky-200 text-[#0284C7]' : 'bg-white border-transparent hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-base font-medium">{item.label}</span>
                    </span>
                    {typeof item.count === 'number' && <span className="rounded-full bg-slate-100 px-2 text-sm text-slate-600">{item.count}</span>}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-9 border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
              {activeSection === 'patient-info' && 'Personal Information'}
              {activeSection === 'eye-exams' && 'Eye Examinations'}
              {activeSection === 'prescriptions' && 'Optical Prescriptions'}
              {activeSection === 'surgeries' && 'Surgeries'}
              {activeSection === 'appointments' && 'Appointments'}
              {activeSection === 'billing' && 'Billing'}
              {activeSection === 'followups' && 'Follow-ups'}
            </CardTitle>

            {activeSection === 'eye-exams' && (
              <Button variant="ghost" className="text-[#0EA5E9]" onClick={() => router.push('/dashboard/eye-examinations/new')}>
                + New Exam
              </Button>
            )}

            {activeSection === 'appointments' && (
              <Button
                variant="ghost"
                className="text-[#0EA5E9]"
                onClick={() => {
                  router.push(`/dashboard/appointments/new?patientId=${encodeURIComponent(id)}`);
                }}
              >
                + New Appointment
              </Button>
            )}
          </CardHeader>

          <CardContent>
            {activeSection === 'patient-info' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Name</p>
                    <p className="text-lg font-semibold text-slate-900">{patient.fullName || 'N/A'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Patient ID</p>
                    <p className="text-lg font-semibold text-slate-900">{formatPatientIdentifier(patient)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Gender</p>
                    <p className="text-base font-medium text-slate-800">{formatGender(patient.gender)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Date of Birth</p>
                    <p className="text-base font-medium text-slate-800">{formatDate(patient.dateOfBirth)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Phone</p>
                    <p className="text-base font-medium text-slate-800">{patient.phone || 'N/A'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Email</p>
                    <p className="text-base font-medium text-slate-800">{patient.email || 'N/A'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
                    <p className="text-sm text-slate-500">Address</p>
                    <p className="text-base font-medium text-slate-800">{patient.address || 'N/A'}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-lg font-semibold text-slate-900 mb-3">Ocular History Summary</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                      <p className="text-sm text-emerald-700">Eye Exams</p>
                      <p className="text-xl font-semibold text-emerald-800">{eyeExams.length}</p>
                    </div>
                    <div className="rounded-xl bg-sky-50 border border-sky-100 p-3">
                      <p className="text-sm text-sky-700">Prescriptions</p>
                      <p className="text-xl font-semibold text-sky-800">{rxRows.length}</p>
                    </div>
                    <div className="rounded-xl bg-violet-50 border border-violet-100 p-3">
                      <p className="text-sm text-violet-700">Surgeries</p>
                      <p className="text-xl font-semibold text-violet-800">{surgeries.length}</p>
                    </div>
                    <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                      <p className="text-sm text-amber-700">Follow-ups</p>
                      <p className="text-xl font-semibold text-amber-800">{pendingFollowUps.length}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-lg font-semibold text-slate-900 mb-3">Medical History</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Allergies</p>
                      <p className="text-sm text-slate-800 mt-1">{patient.allergies || 'No known allergies'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Current Medications</p>
                      <p className="text-sm text-slate-800 mt-1">{patient.currentMedications || 'None documented'}</p>
                    </div>
                  </div>
                  {(patient.medicalHistory || patient.familyMedicalHistory || medicalHistoryItems.length > 0) && (
                    <div className="mt-3 rounded-lg border border-slate-200 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Notes</p>
                      <p className="text-sm text-slate-700 mt-1">
                        {patient.medicalHistory || patient.familyMedicalHistory || medicalHistoryItems.join(', ') || 'N/A'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-lg font-semibold text-slate-900 mb-3">Patient Current Vitals</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">IOP Right</p>
                      <p className="text-xl font-semibold text-slate-900 mt-1">{latestExam?.iopOD ?? '-'}</p>
                      <p className="text-xs text-emerald-600 mt-0.5">mmHg</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">IOP Left</p>
                      <p className="text-xl font-semibold text-slate-900 mt-1">{latestExam?.iopOS ?? '-'}</p>
                      <p className="text-xs text-emerald-600 mt-0.5">mmHg</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">VA Right</p>
                      <p className="text-xl font-semibold text-slate-900 mt-1">{latestExam?.vaBcvaOD || latestExam?.vaUnaidedOD || '-'}</p>
                      <p className="text-xs text-emerald-600 mt-0.5">latest</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">VA Left</p>
                      <p className="text-xl font-semibold text-slate-900 mt-1">{latestExam?.vaBcvaOS || latestExam?.vaUnaidedOS || '-'}</p>
                      <p className="text-xs text-emerald-600 mt-0.5">latest</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <p className="text-lg font-semibold text-slate-900">Patient History</p>
                    <span className="text-sm text-slate-500">Total {patientHistoryRows.length} Visits</span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs uppercase tracking-wide">Date and Time</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide">Diagnosis</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide">Doctor</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide">Status</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide text-right">Fee</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patientHistoryRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-slate-500 py-8">No history records found.</TableCell>
                        </TableRow>
                      ) : (
                        patientHistoryRows.map((row) => {
                          const apt = (patient.appointments || []).find((x) => x.id === row.id);
                          const fee = Number(apt?.amount || 0);
                          const st = String(row.status || '').toUpperCase();
                          return (
                            <TableRow key={row.id}>
                              <TableCell>
                                <div className="text-sm font-medium text-slate-700">{formatDate(row.date)}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{formatTime(row.date)}</div>
                              </TableCell>
                              <TableCell className="text-sm text-slate-700">{row.diagnosis}</TableCell>
                              <TableCell className="text-sm text-slate-700">{row.doctor}</TableCell>
                              <TableCell>
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                  st === 'COMPLETED'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : st === 'PENDING'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {st || 'PENDING'}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm text-slate-700 text-right">${fee.toFixed(2)}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <div className="xl:col-span-2 rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                      <p className="text-lg font-semibold text-slate-900">Eye History</p>
                      <div className="flex items-center gap-2 text-xs">
                        {eyeHistoryTabs.map((tab) => {
                          const active = eyeHistoryTab === tab.key;
                          return (
                            <button
                              key={tab.key}
                              type="button"
                              onClick={() => setEyeHistoryTab(tab.key)}
                              className={`rounded-md px-2 py-1 transition-colors ${
                                active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {tab.label} ({tab.count})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {eyeHistoryTab === 'refraction' && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs uppercase tracking-wide">Date</TableHead>
                            <TableHead className="text-xs uppercase tracking-wide">Doctor</TableHead>
                            <TableHead className="text-xs uppercase tracking-wide">Right Eye</TableHead>
                            <TableHead className="text-xs uppercase tracking-wide">Left Eye</TableHead>
                            <TableHead className="text-xs uppercase tracking-wide">Diagnosis</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {eyeExams.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-slate-500 py-8">No refraction records found.</TableCell>
                            </TableRow>
                          ) : (
                            eyeExams.slice(0, 6).map((exam) => (
                              <TableRow key={exam.id}>
                                <TableCell>
                                  <div className="text-sm font-medium text-slate-700">{formatDate(exam.createdAt)}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">{formatTime(exam.createdAt)}</div>
                                </TableCell>
                                <TableCell className="text-sm">{exam.doctor?.user?.fullName || 'Unknown'}</TableCell>
                                <TableCell className="text-sm">{exam.vaBcvaOD || exam.vaUnaidedOD || '-'}</TableCell>
                                <TableCell className="text-sm">{exam.vaBcvaOS || exam.vaUnaidedOS || '-'}</TableCell>
                                <TableCell className="text-sm">{exam.chiefComplaint || '-'}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    )}

                    {eyeHistoryTab === 'iop-va' && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs uppercase tracking-wide">Date</TableHead>
                            <TableHead className="text-xs uppercase tracking-wide">Doctor</TableHead>
                            <TableHead className="text-xs uppercase tracking-wide">IOP OD</TableHead>
                            <TableHead className="text-xs uppercase tracking-wide">IOP OS</TableHead>
                            <TableHead className="text-xs uppercase tracking-wide">VA</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {eyeExams.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-slate-500 py-8">No IOP/VA records found.</TableCell>
                            </TableRow>
                          ) : (
                            eyeExams.slice(0, 6).map((exam) => (
                              <TableRow key={exam.id}>
                                <TableCell className="text-sm">{formatDate(exam.createdAt)}</TableCell>
                                <TableCell className="text-sm">{exam.doctor?.user?.fullName || 'Unknown'}</TableCell>
                                <TableCell className="text-sm">{exam.iopOD ?? '-'}</TableCell>
                                <TableCell className="text-sm">{exam.iopOS ?? '-'}</TableCell>
                                <TableCell className="text-sm">OD {exam.vaBcvaOD || exam.vaUnaidedOD || '-'} | OS {exam.vaBcvaOS || exam.vaUnaidedOS || '-'}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    )}

                    {eyeHistoryTab === 'surgeries' && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs uppercase tracking-wide">Date</TableHead>
                            <TableHead className="text-xs uppercase tracking-wide">Type</TableHead>
                            <TableHead className="text-xs uppercase tracking-wide">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {surgeries.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-slate-500 py-8">No surgery records found.</TableCell>
                            </TableRow>
                          ) : (
                            surgeries.slice(0, 6).map((row) => (
                              <TableRow key={row.id}>
                                <TableCell className="text-sm">{formatDate(row.surgeryDate)}</TableCell>
                                <TableCell className="text-sm">{row.surgeryType || 'N/A'}</TableCell>
                                <TableCell className="text-sm">{row.status || 'PENDING'}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    )}

                    {eyeHistoryTab === 'sph-trend' && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs uppercase tracking-wide">Date</TableHead>
                            <TableHead className="text-xs uppercase tracking-wide">Doctor</TableHead>
                            <TableHead className="text-xs uppercase tracking-wide">SPH OD</TableHead>
                            <TableHead className="text-xs uppercase tracking-wide">SPH OS</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {eyeExams.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-slate-500 py-8">No SPH trend records found.</TableCell>
                            </TableRow>
                          ) : (
                            eyeExams.slice(0, 6).map((exam) => (
                              <TableRow key={exam.id}>
                                <TableCell className="text-sm">{formatDate(exam.createdAt)}</TableCell>
                                <TableCell className="text-sm">{exam.doctor?.user?.fullName || 'Unknown'}</TableCell>
                                <TableCell className="text-sm">{exam.refractionSphereOD || '-'}</TableCell>
                                <TableCell className="text-sm">{exam.refractionSphereOS || '-'}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-lg font-semibold text-slate-900">Follow-ups</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{pendingFollowUps.length}</span>
                    </div>
                    {pendingFollowUps.length === 0 ? (
                      <p className="text-sm text-slate-500">No pending follow-ups.</p>
                    ) : (
                      <div className="space-y-3">
                        {pendingFollowUps.slice(0, 3).map((fu) => (
                          <div key={fu.id} className="rounded-lg border border-slate-200 p-3">
                            <p className="text-sm font-semibold text-slate-900">{formatDate(fu.dueDate)}</p>
                            <p className="text-xs uppercase tracking-wide text-blue-700 mt-1">{String(fu.sourceType || 'follow-up').toLowerCase()}</p>
                            <p className="text-sm text-slate-600 mt-1">{fu.notes || 'Follow-up note'}</p>
                            <div className="mt-2 flex justify-end">
                              <Button
                                size="sm"
                                className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                                onClick={() => {
                                  router.push(`/dashboard/appointments/new?patientId=${encodeURIComponent(id)}`);
                                }}
                              >
                                Book
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'eye-exams' && (
              <div className="space-y-3">
                {eyeExams.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 p-6 text-slate-500">No eye examinations found.</div>
                ) : (
                  eyeExams.map((exam) => (
                    <button
                      key={exam.id}
                      type="button"
                      onClick={() => router.push(`/dashboard/eye-examinations/${exam.id}`)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-semibold text-slate-900">{exam.chiefComplaint || 'Eye examination'}</p>
                          <p className="text-base text-slate-500">{formatDate(exam.createdAt)}</p>
                          <p className="text-base text-slate-600">{formatVA(exam)}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {activeSection === 'prescriptions' && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">Date</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">Type</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">OD</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">OS</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">Status</TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-600">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rxRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-500 py-8">No prescriptions found.</TableCell>
                      </TableRow>
                    ) : (
                      rxRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-sm">{formatDate(row.createdAt)}</TableCell>
                          <TableCell className="text-sm">{toTypeLabel(row.type)}</TableCell>
                          <TableCell className="text-sm text-slate-700">{formatEyeSummary('od', row)}</TableCell>
                          <TableCell className="text-sm text-slate-700">{formatEyeSummary('os', row)}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              {String(row.status || 'filled').toLowerCase()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/dashboard/prescriptions/${row.id}`} className="text-sm text-[#0EA5E9] hover:text-[#0284C7] font-medium">
                              View
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {activeSection === 'surgeries' && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {surgeries.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-slate-500 py-8">No surgeries found.</TableCell></TableRow>
                    ) : (
                      surgeries.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{formatDate(row.surgeryDate)}</TableCell>
                          <TableCell>{row.surgeryType || 'N/A'}</TableCell>
                          <TableCell>{row.status || 'PENDING'}</TableCell>
                          <TableCell className="text-right">
                            <Link href={`/dashboard/surgery/${row.id}`} className="text-[#0EA5E9] hover:text-[#0284C7] font-medium">View</Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {activeSection === 'appointments' && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">Date</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">Time</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">Doctor</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">Type</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-600">Status</TableHead>
                      <TableHead className="text-right" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(patient.appointments || []).length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-8">No appointments found.</TableCell></TableRow>
                    ) : (
                      (patient.appointments || []).map((row) => {
                        const status = String(row.status || 'PENDING').toUpperCase();
                        const typeLabel = row.clinicalExamination?.surgery
                          ? 'surgery'
                          : 'consultation';
                        return (
                        <TableRow key={row.id}>
                          <TableCell className="text-sm text-slate-700">{formatDate(row.appointmentDate)}</TableCell>
                          <TableCell className="text-sm text-slate-700">{formatTime(row.appointmentDate)}</TableCell>
                          <TableCell className="text-sm text-slate-700">{row.doctor?.user?.fullName || 'Unknown'}</TableCell>
                          <TableCell className="text-sm text-slate-700">{typeLabel}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : status === 'CONFIRMED'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : status === 'PENDING'
                                      ? 'bg-amber-100 text-amber-700'
                                      : status === 'CANCELLED'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {status.toLowerCase()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/dashboard/appointments/${row.id}`} className="text-[#0EA5E9] hover:text-[#0284C7] font-medium">View</Link>
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {activeSection === 'billing' && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billRows.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center text-slate-500 py-8">No billing records found.</TableCell></TableRow>
                    ) : (
                      billRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{formatDate(row.appointmentDate)}</TableCell>
                          <TableCell>{Number(row.amount || 0).toFixed(2)}</TableCell>
                          <TableCell>{row.status || 'PENDING'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {activeSection === 'followups' && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Due Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {followUps.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-8">No follow-ups found.</TableCell></TableRow>
                    ) : (
                      followUps.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{formatDate(row.dueDate)}</TableCell>
                          <TableCell>{String(row.sourceType || '').toLowerCase() || 'follow-up'}</TableCell>
                          <TableCell>{String(row.status || '').toLowerCase() || 'pending'}</TableCell>
                          <TableCell>{row.notes || '-'}</TableCell>
                          <TableCell className="text-right">
                            {(String(row.status || '').toUpperCase() === 'PENDING' || String(row.status || '').toUpperCase() === 'OVERDUE') && (
                              <Button
                                size="sm"
                                className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                                onClick={() => {
                                  router.push(`/dashboard/appointments/new?patientId=${encodeURIComponent(id)}`);
                                }}
                              >
                                Book
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
