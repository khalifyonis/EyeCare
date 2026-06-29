'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft, CalendarPlus, Edit, Loader2, Trash2,
  User, Phone, Mail, MapPin, FileText,
  Eye, Stethoscope, CalendarDays, AlertTriangle, Pill,
  Activity, Glasses, CreditCard, Clock, DollarSign,
  PlusCircle, Heart, UserX, Shield, Scissors,
  Download,
} from 'lucide-react';
import { resolveRoleName } from '@/lib/auth';
import { usePermission } from '@/contexts/permission-context';
import {
  downloadPatientMedicalRecord,
} from '@/lib/patient-report';

/* ── Types ── */
type UserSimple = {
  fullName: string;
};

type DoctorSimple = {
  user: UserSimple;
};

type PrescriptionSimple = {
  id: string;
  itemType: string;
  itemId?: string;
  itemName?: string;
  quantity: number;
  instructions?: string;
  status: string;
  dispensedAt?: string;
  createdAt: string;
};

type Appointment = {
  id: string;
  appointmentDate?: string;
  type?: string;
  status?: string;
  notes?: string;
  amount?: number;
  bookingNumber?: string;
  doctor?: DoctorSimple;
  clinicalExamination?: {
    diagnosis?: string;
    sphRight?: number; cylRight?: number; axisRight?: number;
    sphLeft?: number; cylLeft?: number; axisLeft?: number;
    examinedBy?: DoctorSimple;
    surgery?: {
      date?: string; eye?: string; surgeryType?: string;
      status?: string; surgeon?: DoctorSimple;
    };
    prescriptions?: PrescriptionSimple[];
  };
  erExamination?: {
    vaRight?: string; vaLeft?: string;
    iopRight?: number; iopLeft?: number;
    recordedBy?: UserSimple;
  };
  prescriptions?: PrescriptionSimple[];
};

type EyeExamination = {
  id: string;
  chiefComplaint: string;
  historyOfPresentIllness?: string;
  vaScale?: string;
  vaUnaidedOD?: string;
  vaUnaidedOS?: string;
  vaBcvaOD?: string;
  vaBcvaOS?: string;
  iopOD?: number;
  iopOS?: number;
  iopMethod?: string;
  anteriorSegmentFindings?: any;
  fundusFindings?: any;
  diagnosis?: string;
  plan?: string;
  stage?: string;
  createdAt: string;
  doctor?: DoctorSimple;
  prescriptions?: PrescriptionSimple[];
};

type OpticalPrescription = {
  id: string;
  type: string;
  status: string;
  expiryDate: string;
  dispensedAt?: string;
  notes?: string;
  odSphere?: string;
  odCylinder?: string;
  odAxis?: number;
  odAdd?: string;
  odPd?: number;
  odPrism?: string;
  osSphere?: string;
  osCylinder?: string;
  osAxis?: number;
  osAdd?: string;
  osPd?: number;
  osPrism?: string;
  lensType?: string;
  lensMaterial?: string;
  frameType?: string;
  coatings?: string[];
  createdAt: string;
  createdBy?: UserSimple;
};

type Surgery = {
  id: string;
  eye: string;
  surgeryType: string;
  date: string;
  cost: number;
  status: string;
  notes?: string;
  surgeon?: DoctorSimple;
  procedure?: string;
  anesthesiaType?: string;
  time?: string;
  operatingRoom?: string;
};

type Billing = {
  id: string;
  serviceType: string;
  totalAmount: number;
  discount?: number;
  invoiceNumber?: string;
  finalAmount: number;
  paymentMethod?: string;
  status: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
  createdBy?: UserSimple;
};

type PatientData = {
  id: string;
  createdAt?: string;
  patientNumber?: string;
  fullName?: string;
  firstName?: string; lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  phone?: string; email?: string;
  address?: string; city?: string; state?: string;
  bloodGroup?: string;
  allergies?: string;
  chiefComplaint?: string;
  currentMedications?: string;
  medicalHistory?: string;
  familyMedicalHistory?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  appointments?: Appointment[];
  eyeExaminations?: EyeExamination[];
  opticalPrescriptions?: OpticalPrescription[];
  surgeries?: Surgery[];
  billings?: Billing[];
  branch?: { branchName?: string };
};

/* ── Helpers ── */
function fmtDate(v?: string | null) {
  if (!v) return 'N/A';
  const d = new Date(v);
  if (isNaN(d.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

function fmtTime(v?: string | null) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function lv(v?: string | null) {
  return (v || '').trim() || 'N/A';
}

function calculateAge(dobStr?: string) {
  if (!dobStr) return 'N/A';
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return 'N/A';
  const diffMs = Date.now() - dob.getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function getSeverity(diag?: string) {
  const d = (diag || '').toLowerCase();
  if (d.includes('cataract') || d.includes('glaucoma') || d.includes('dr') || d.includes('retina') || d.includes('surgery') || d.includes('severe') || d.includes('emergency')) {
    return 'High';
  }
  return 'Low';
}

function statusColor(s?: string) {
  const st = (s || '').toUpperCase();
  if (st === 'COMPLETED' || st === 'PAID' || st === 'DISPENSED' || st === 'FILLED') {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60';
  }
  if (st === 'PENDING' || st === 'SCHEDULED' || st === 'PARTIAL' || st === 'PARTIALLY_PAID') {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60';
  }
  if (st === 'CANCELLED' || st === 'UNPAID') {
    return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60';
  }
  if (st === 'CONFIRMED' || st === 'SCHEDULED' || st === 'ACTIVE') {
    return 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200 dark:border-sky-900/60';
  }
  return 'bg-slate-100 text-slate-800 dark:bg-slate-900/60 dark:text-slate-400 border border-slate-200 dark:border-slate-800';
}

export default function PatientProfilePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sideTab, setSideTab] = useState('info');
  const [exportingReport, setExportingReport] = useState(false);

  const { can, user } = usePermission();
  const role = resolveRoleName(user);
  const canManage = ['ADMIN', 'SUPERADMIN', 'RECEPTIONIST'].includes(role);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const patRes = await api.get(`/patients/${id}`);
        setPatient(patRes.data);
      } catch {
        toast.error('Failed to load patient');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Delete this patient? This cannot be undone.')) return;
    try {
      await api.delete(`/patients/${id}`);
      toast.success('Patient deleted');
      router.push('/dashboard/patients');
    } catch {
      toast.error('Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#0EA5E9]" />
          <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading patient profile...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex h-[75vh] items-center justify-center p-8">
        <Card className="max-w-md w-full border-slate-200 dark:border-slate-800 shadow-xl">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="rounded-full bg-rose-50 dark:bg-rose-950/30 p-4 text-rose-500">
              <UserX className="h-12 w-12" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Patient Not Found</h2>
              <p className="text-sm text-slate-500 mt-1">The patient details could not be retrieved. They may have been deleted or moved.</p>
            </div>
            <Button onClick={() => router.push('/dashboard/patients')} className="w-full gap-2 bg-[#0EA5E9] hover:bg-[#0EA5E9]/90">
              <ArrowLeft className="h-4 w-4" /> Back to Patients
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Medication prescriptions aggregated
  const medications = (() => {
    const list: PrescriptionSimple[] = [];
    patient.appointments?.forEach(apt => {
      apt.prescriptions?.forEach(p => {
        if (!list.some(x => x.id === p.id)) list.push(p);
      });
      apt.clinicalExamination?.prescriptions?.forEach(p => {
        if (!list.some(x => x.id === p.id)) list.push(p);
      });
    });
    patient.eyeExaminations?.forEach(ee => {
      ee.prescriptions?.forEach(p => {
        if (!list.some(x => x.id === p.id)) list.push(p);
      });
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  })();

  const appointments = patient.appointments || [];
  const eyeExaminations = patient.eyeExaminations || [];
  const opticalPrescriptions = patient.opticalPrescriptions || [];
  const surgeries = patient.surgeries || [];
  const billings = patient.billings || [];

  const downloadRecord = async () => {
    setExportingReport(true);
    try {
      await downloadPatientMedicalRecord(id);
      toast.success('Complete medical record downloaded');
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to download medical record');
    } finally {
      setExportingReport(false);
    }
  };

  // Vitals extracted from latest ER examination
  const latestER = appointments.find(a => a.erExamination)?.erExamination;

  // Sidebar count helper
  const getTabCount = (tabId: string) => {
    if (tabId === 'exams') return eyeExaminations.length;
    if (tabId === 'optical-rx') return opticalPrescriptions.length;
    if (tabId === 'prescriptions') return medications.length;
    if (tabId === 'surgeries') return surgeries.length;
    if (tabId === 'appointments') return appointments.length;
    if (tabId === 'billing') return billings.length;
    return 0;
  };

  const SIDEBAR_TABS = [
    { id: 'info', label: 'Patient Info', icon: User },
    { id: 'exams', label: 'Eye Exams', icon: Eye },
    { id: 'optical-rx', label: 'Optical Rx', icon: Glasses },
    { id: 'prescriptions', label: 'Medications', icon: Pill },
    { id: 'surgeries', label: 'Surgeries', icon: Scissors },
    { id: 'appointments', label: 'Appointments', icon: CalendarDays },
    { id: 'billing', label: 'Billing & Invoices', icon: CreditCard },
  ].filter(tab => {
    // Patient Info and Appointments are always visible
    if (tab.id === 'info' || tab.id === 'appointments') return true;
    if (tab.id === 'exams') return can('preliminary_exams', 'canRead') || can('clinical_exams', 'canRead');
    if (tab.id === 'optical-rx') return can('optical_prescriptions', 'canRead');
    if (tab.id === 'prescriptions') return can('medicine_prescriptions', 'canRead');
    if (tab.id === 'surgeries') return can('surgery', 'canRead');
    if (tab.id === 'billing') return can('billing', 'canRead');
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/40 pb-16">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">

        {/* ── Top Header Bar ── */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 dark:border-slate-800/80 pb-6">
          <div className="space-y-1">
            <button
              onClick={() => router.push('/dashboard/patients')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Patients
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                {lv(patient.fullName)}
              </h1>
              <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                {lv(patient.patientNumber)}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Branch: <span className="font-semibold text-slate-700 dark:text-slate-300">{patient.branch?.branchName || 'Default Branch'}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={exportingReport}
              onClick={downloadRecord}
              className="gap-2 border-[#0EA5E9]/30 bg-[#0EA5E9]/5 hover:bg-[#0EA5E9]/10 text-[#0EA5E9]"
            >
              {exportingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/appointments/new?patientId=${id}`)}
              className="gap-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <CalendarPlus className="h-4 w-4 text-[#0EA5E9]" /> Book Visit
            </Button>
            {canManage && (
              <>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/patients?edit=${id}`)}
                  className="gap-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  <Edit className="h-4 w-4 text-amber-500" /> Edit Profile
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="gap-2 bg-rose-500 hover:bg-rose-600 text-white"
                >
                  <Trash2 className="h-4 w-4" /> Delete Patient
                </Button>
              </>
            )}
          </div>
        </div>


        {/* ── Main Tabbed Container ── */}
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Left / Top Sidebar for Tabs */}
          <div className="w-full lg:w-64 shrink-0">
            <nav className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible pb-2.5 lg:pb-0 scrollbar-none rounded-xl border border-slate-200/65 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 p-2 shadow-sm backdrop-blur-md">
              {SIDEBAR_TABS.map(t => {
                const count = getTabCount(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => setSideTab(t.id)}
                    className={`flex items-center justify-between gap-2.5 rounded-lg px-3.5 py-3 text-sm font-semibold transition-all w-full text-left whitespace-nowrap lg:whitespace-normal shrink-0 lg:shrink-1 ${sideTab === t.id
                      ? 'bg-blue-50 text-[#0EA5E9] dark:bg-blue-950/30'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-slate-200'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <t.icon className={`h-4.5 w-4.5 ${sideTab === t.id ? 'text-[#0EA5E9]' : 'text-slate-400'}`} />
                      <span>{t.label}</span>
                    </div>
                    {count > 0 && (
                      <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold ${sideTab === t.id
                        ? 'bg-[#0EA5E9] text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Area Tabs Panels */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* ── Patient Info Tab ── */}
            {sideTab === 'info' && (
              <div className="space-y-6">

                {/* Personal Information + Medical History side-by-side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Personal Information Card */}
                  <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <User className="h-4.5 w-4.5 text-[#0EA5E9]" /> Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
                        <User className="h-4 w-4 text-slate-400" /> {lv(patient.fullName)}
                      </div>
                      <div className="text-slate-600 dark:text-slate-450 font-medium">
                        Gender: {patient.gender === 'FEMALE' ? 'Female' : patient.gender === 'MALE' ? 'Male' : lv(patient.gender)}
                      </div>
                      <div className="text-slate-600 dark:text-slate-450 font-medium">
                        Date of Birth: {fmtDate(patient.dateOfBirth)}
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-450 font-medium">
                        <Phone className="h-4 w-4 text-slate-400" /> {lv(patient.phone)}
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-450 font-medium">
                        <Mail className="h-4 w-4 text-slate-400" /> {lv(patient.email)}
                      </div>
                      <div className="flex items-start gap-2 text-slate-600 dark:text-slate-450 font-medium">
                        <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                        <span>{lv([patient.address, patient.city, patient.state].filter(Boolean).join(', '))}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Medical History Card */}
                  <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Stethoscope className="h-4.5 w-4.5 text-[#0EA5E9]" /> Medical History
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-4.5 w-4.5 mt-0.5 text-amber-500 shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Allergies</p>
                          <p className="text-slate-700 dark:text-slate-200 font-semibold">{lv(patient.allergies)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 border-t border-slate-100 dark:border-slate-800/20 pt-3">
                        <Pill className="h-4.5 w-4.5 mt-0.5 text-blue-500 shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Medications</p>
                          <p className="text-slate-700 dark:text-slate-200 font-semibold">{lv(patient.currentMedications)}</p>
                        </div>
                      </div>
                      <div className="border-t border-slate-100 dark:border-slate-800/20 pt-3 text-slate-600 dark:text-slate-350">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Blood Group</p>
                        <span className="font-extrabold text-slate-850 dark:text-slate-100">{lv(patient.bloodGroup)}</span>
                      </div>
                    </CardContent>
                  </Card>

                </div>

                {/* Emergency Contact (Full width with 3 columns) */}
                <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold text-slate-850 dark:text-white">Emergency Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-slate-600 dark:text-slate-300 py-3">
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Name</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{lv(patient.emergencyContactName)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Relationship</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{lv(patient.emergencyContactRelationship)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Phone</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" /> {lv(patient.emergencyContactPhone)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Patient History Table at the bottom */}
                <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                  <CardHeader className="border-b border-slate-50 dark:border-slate-800/60 pb-3.5 px-6 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-slate-850 dark:text-white">
                      Patient History
                    </CardTitle>
                    <span className="text-xs font-semibold text-slate-400 tracking-wider">Total {appointments.length} Visits</span>
                  </CardHeader>
                  <CardContent className="p-0">
                    {appointments.length === 0 ? (
                      <p className="p-8 text-center text-sm font-semibold text-slate-400">No visits recorded.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              <th className="px-6 py-3">Date Of Visit</th>
                              <th className="px-6 py-3">Diagnosis</th>
                              <th className="px-6 py-3">Severity</th>
                              <th className="px-6 py-3">Visit No.</th>
                              <th className="px-6 py-3">Status</th>
                              <th className="px-6 py-3 text-right">Documents</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                            {appointments.map((apt, idx) => {
                              const diag = apt.clinicalExamination?.diagnosis || apt.notes || 'Routine consultation';
                              const severity = getSeverity(diag);
                              return (
                                <tr key={apt.id} className="hover:bg-slate-50/40 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-600 dark:text-slate-400">{fmtDate(apt.appointmentDate)}</td>
                                  <td className="px-6 py-4 font-semibold text-slate-950 dark:text-white max-w-[240px] truncate">{diag}</td>
                                  <td className="px-6 py-4">
                                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${severity === 'High'
                                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50'
                                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50'
                                      }`}>
                                      {severity}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-xs font-mono font-bold text-slate-500">{appointments.length - idx}</td>
                                  <td className="px-6 py-4">
                                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${apt.status === 'COMPLETED'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50'
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50'
                                      }`}>
                                      {apt.status === 'COMPLETED' ? 'Cured' : 'Under Treatment'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button
                                      onClick={() => setSideTab('exams')}
                                      className="inline-flex items-center gap-1 text-xs font-bold text-[#0EA5E9] hover:underline"
                                    >
                                      <FileText className="h-3.5 w-3.5" /> View Exam
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>
            )}

            {/* ── Eye Examinations Tab ── */}
            {sideTab === 'exams' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Eye Examinations</h3>
                  <Button
                    onClick={() => router.push(`/dashboard/appointments/new?patientId=${id}`)}
                    className="gap-1.5 bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white text-xs font-semibold py-1.5"
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> Book Eye Exam
                  </Button>
                </div>

                {eyeExaminations.length === 0 ? (
                  <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 shadow-none bg-transparent">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                      <Eye className="h-10 w-10 text-slate-400 animate-pulse" />
                      <p className="text-sm font-semibold text-slate-500">No eye examinations found for this patient.</p>
                      <p className="text-xs text-slate-400 max-w-xs">Register a new appointment visit and record eye measurements.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {eyeExaminations.map((exam) => (
                      <Card key={exam.id} className="border-slate-200/60 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/40 p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Examination Date</p>
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{fmtDate(exam.createdAt)} at {fmtTime(exam.createdAt)}</h4>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColor(exam.stage)}`}>
                                {(exam.stage || 'Completed').toUpperCase()}
                              </span>
                              <span className="text-xs text-slate-500">Examined by: <span className="font-semibold text-slate-700 dark:text-slate-300">Dr. {exam.doctor?.user?.fullName || 'Unknown'}</span></span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-6 text-sm">
                          {/* Complaints & History */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chief Complaint</p>
                              <p className="text-slate-800 dark:text-slate-200 mt-1 font-medium bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40">{lv(exam.chiefComplaint)}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">History of Present Illness</p>
                              <p className="text-slate-800 dark:text-slate-200 mt-1 font-medium bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40">{lv(exam.historyOfPresentIllness)}</p>
                            </div>
                          </div>

                          {/* VA & IOP Readings */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800/20 pt-4">
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Visual Acuity (OD / OS)</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg">
                                  <p className="text-[10px] text-slate-400 font-semibold">Unaided (OD / OS)</p>
                                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">OD: {exam.vaUnaidedOD || '—'} | OS: {exam.vaUnaidedOS || '—'}</p>
                                </div>
                                <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg">
                                  <p className="text-[10px] text-slate-400 font-semibold">BCVA (OD / OS)</p>
                                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">OD: {exam.vaBcvaOD || '—'} | OS: {exam.vaBcvaOS || '—'}</p>
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Intraocular Pressure (IOP)</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg">
                                  <p className="text-[10px] text-slate-400 font-semibold">IOP Readings (OD / OS)</p>
                                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">OD: {exam.iopOD ? `${exam.iopOD} mmHg` : '—'} | OS: {exam.iopOS ? `${exam.iopOS} mmHg` : '—'}</p>
                                </div>
                                <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg">
                                  <p className="text-[10px] text-slate-400 font-semibold">IOP Method</p>
                                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{exam.iopMethod || '—'}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Diagnosis & Plan */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800/20 pt-4">
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Diagnosis</p>
                              <p className="text-slate-800 dark:text-slate-200 mt-1 font-bold bg-[#0EA5E9]/5 dark:bg-[#0EA5E9]/10 p-2.5 rounded-lg border border-[#0EA5E9]/10 text-[#0EA5E9]">{lv(exam.diagnosis)}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Management Plan</p>
                              <p className="text-slate-800 dark:text-slate-200 mt-1 font-medium bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40">{lv(exam.plan)}</p>
                            </div>
                          </div>

                          {/* Linked Prescriptions */}
                          {exam.prescriptions && exam.prescriptions.length > 0 && (
                            <div className="border-t border-slate-100 dark:border-slate-800/20 pt-4">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Prescribed Medication</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {exam.prescriptions.map((pr) => (
                                  <div key={pr.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/40">
                                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-2 text-emerald-500">
                                      <Pill className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{pr.itemName || pr.itemType}</p>
                                      <p className="text-xs text-slate-400 mt-0.5">Qty: {pr.quantity} | {pr.instructions || 'No instructions'}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Optical Prescriptions Tab ── */}
            {sideTab === 'optical-rx' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Optical Prescriptions</h3>

                {opticalPrescriptions.length === 0 ? (
                  <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 shadow-none bg-transparent">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                      <Glasses className="h-10 w-10 text-slate-400 animate-pulse" />
                      <p className="text-sm font-semibold text-slate-500">No optical prescriptions found.</p>
                      <p className="text-xs text-slate-400 max-w-xs">Optical prescriptions are generated by doctor visits and optician exams.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {opticalPrescriptions.map((rx) => (
                      <Card key={rx.id} className="border-slate-200/60 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/40 p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Prescription Date</p>
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{fmtDate(rx.createdAt)} (Exp: {fmtDate(rx.expiryDate)})</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColor(rx.status)}`}>
                                {(rx.status || 'Filled').toUpperCase()}
                              </span>
                              <span className="text-xs text-slate-500">By: <span className="font-semibold text-slate-700 dark:text-slate-300">{rx.createdBy?.fullName || 'Doctor'}</span></span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-5">
                          {/* Prescription Grid OD/OS */}
                          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                            <table className="w-full text-sm text-center border-collapse">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                  <th className="px-4 py-3 text-left">Eye (Oculus)</th>
                                  <th className="px-4 py-3">Sphere (SPH)</th>
                                  <th className="px-4 py-3">Cylinder (CYL)</th>
                                  <th className="px-4 py-3">Axis (AX)</th>
                                  <th className="px-4 py-3">Add</th>
                                  <th className="px-4 py-3">PD</th>
                                  <th className="px-4 py-3">Prism</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-xs">
                                <tr className="hover:bg-slate-50/30">
                                  <td className="px-4 py-3 text-left font-sans font-bold text-slate-700 dark:text-slate-300">Right (OD)</td>
                                  <td className="px-4 py-3 text-slate-950 dark:text-white font-semibold">{rx.odSphere || '—'}</td>
                                  <td className="px-4 py-3 text-slate-950 dark:text-white font-semibold">{rx.odCylinder || '—'}</td>
                                  <td className="px-4 py-3 text-slate-950 dark:text-white font-semibold">{rx.odAxis !== undefined && rx.odAxis !== null ? `${rx.odAxis}°` : '—'}</td>
                                  <td className="px-4 py-3 text-slate-950 dark:text-white font-semibold">{rx.odAdd || '—'}</td>
                                  <td className="px-4 py-3 text-slate-950 dark:text-white font-semibold">{rx.odPd || '—'}</td>
                                  <td className="px-4 py-3 text-slate-950 dark:text-white font-semibold">{rx.odPrism || '—'}</td>
                                </tr>
                                <tr className="hover:bg-slate-50/30">
                                  <td className="px-4 py-3 text-left font-sans font-bold text-slate-700 dark:text-slate-300">Left (OS)</td>
                                  <td className="px-4 py-3 text-slate-950 dark:text-white font-semibold">{rx.osSphere || '—'}</td>
                                  <td className="px-4 py-3 text-slate-950 dark:text-white font-semibold">{rx.osCylinder || '—'}</td>
                                  <td className="px-4 py-3 text-slate-950 dark:text-white font-semibold">{rx.osAxis !== undefined && rx.osAxis !== null ? `${rx.osAxis}°` : '—'}</td>
                                  <td className="px-4 py-3 text-slate-950 dark:text-white font-semibold">{rx.osAdd || '—'}</td>
                                  <td className="px-4 py-3 text-slate-950 dark:text-white font-semibold">{rx.osPd || '—'}</td>
                                  <td className="px-4 py-3 text-slate-950 dark:text-white font-semibold">{rx.osPrism || '—'}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Frame & Lens Details */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/40">
                              <p className="text-slate-400 font-semibold uppercase tracking-wider">Prescription Type</p>
                              <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{lv(rx.type)}</p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/40">
                              <p className="text-slate-400 font-semibold uppercase tracking-wider">Lens Material</p>
                              <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{lv(rx.lensMaterial)}</p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/40">
                              <p className="text-slate-400 font-semibold uppercase tracking-wider">Lens / Frame Type</p>
                              <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{rx.lensType || rx.frameType || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/40">
                              <p className="text-slate-400 font-semibold uppercase tracking-wider">Coatings</p>
                              <p className="font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">{rx.coatings && rx.coatings.length > 0 ? rx.coatings.join(', ') : 'None'}</p>
                            </div>
                          </div>

                          {rx.notes && (
                            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs">
                              <span className="font-bold text-slate-400 uppercase tracking-widest">Notes</span>
                              <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed font-medium">{rx.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Medications (Prescriptions) Tab ── */}
            {sideTab === 'prescriptions' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pharmacy Medications</h3>

                {medications.length === 0 ? (
                  <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 shadow-none bg-transparent">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                      <Pill className="h-10 w-10 text-slate-400 animate-pulse" />
                      <p className="text-sm font-semibold text-slate-500">No prescribed medications found.</p>
                      <p className="text-xs text-slate-400 max-w-xs">Medications prescribed during examinations will show up here.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              <th className="px-5 py-3">Prescription Date</th>
                              <th className="px-5 py-3">Medication / Item</th>
                              <th className="px-5 py-3">Quantity</th>
                              <th className="px-5 py-3">Instructions</th>
                              <th className="px-5 py-3">Status</th>
                              <th className="px-5 py-3">Dispense Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {medications.map((pr) => (
                              <tr key={pr.id} className="hover:bg-slate-50/40 transition-colors">
                                <td className="px-5 py-3.5 font-medium whitespace-nowrap text-slate-800 dark:text-slate-200">{fmtDate(pr.createdAt)}</td>
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-2">
                                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-1.5 text-emerald-500">
                                      <Pill className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="font-semibold text-slate-950 dark:text-white">{pr.itemName || pr.itemType}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5 font-bold text-slate-850 dark:text-slate-200">{pr.quantity}</td>
                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 font-medium max-w-[200px] truncate">{pr.instructions || 'No instructions'}</td>
                                <td className="px-5 py-3.5">
                                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${statusColor(pr.status)}`}>
                                    {(pr.status || 'Pending').toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-slate-500 text-xs font-mono">{pr.dispensedAt ? `${fmtDate(pr.dispensedAt)} ${fmtTime(pr.dispensedAt)}` : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ── Surgeries Tab ── */}
            {sideTab === 'surgeries' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Surgeries & Procedures</h3>

                {surgeries.length === 0 ? (
                  <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 shadow-none bg-transparent">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                      <Scissors className="h-10 w-10 text-slate-400 animate-pulse" />
                      <p className="text-sm font-semibold text-slate-500">No surgery records found.</p>
                      <p className="text-xs text-slate-400 max-w-xs">Scheduled or completed ophthalmic surgeries will be displayed here.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {surgeries.map((s) => (
                      <Card key={s.id} className="border-slate-200/60 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/40 p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Surgery Date</p>
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{fmtDate(s.date)} at {s.time || 'TBD'}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColor(s.status)}`}>
                                {(s.status || 'Scheduled').toUpperCase()}
                              </span>
                              <span className="text-xs text-slate-500">Surgeon: <span className="font-semibold text-slate-700 dark:text-slate-300">Dr. {s.surgeon?.user?.fullName || 'Surgeon'}</span></span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4 text-sm">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800/45">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Surgery Type</p>
                              <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{lv(s.surgeryType)}</p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800/45">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Eye Side</p>
                              <p className="font-bold text-[#0EA5E9] dark:text-[#0EA5E9]/90 mt-1">{lv(s.eye)}</p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800/45">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Surgery Cost</p>
                              <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">${Number(s.cost ?? 0).toFixed(2)}</p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800/45">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Anesthesia / OR</p>
                              <p className="font-bold text-slate-850 dark:text-slate-350 mt-1 truncate">{s.anesthesiaType || 'General'} | RM: {s.operatingRoom || 'OR-1'}</p>
                            </div>
                          </div>

                          {s.procedure && (
                            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                              <span className="font-bold text-slate-400 uppercase tracking-widest">Procedure Detail</span>
                              <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed font-semibold">{s.procedure}</p>
                            </div>
                          )}

                          {s.notes && (
                            <div className="p-3.5 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800/40 text-xs">
                              <span className="font-bold text-slate-400 uppercase tracking-widest">Notes</span>
                              <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">{s.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Appointments Tab ── */}
            {sideTab === 'appointments' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Appointments History</h3>
                  <Button
                    onClick={() => router.push(`/dashboard/appointments/new?patientId=${id}`)}
                    className="gap-1.5 bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white text-xs font-semibold py-1.5"
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> Book Appointment
                  </Button>
                </div>

                {appointments.length === 0 ? (
                  <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 shadow-none bg-transparent">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                      <CalendarDays className="h-10 w-10 text-slate-400 animate-pulse" />
                      <p className="text-sm font-semibold text-slate-500">No appointments recorded.</p>
                      <p className="text-xs text-slate-400 max-w-xs">Register new visual consultations or optician visits.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              <th className="px-5 py-3">Visit Date / Time</th>
                              <th className="px-5 py-3">Booking No.</th>
                              <th className="px-5 py-3">Type</th>
                              <th className="px-5 py-3">Diagnosis / Notes</th>
                              <th className="px-5 py-3">Assigned Doctor</th>
                              <th className="px-5 py-3">Status</th>
                              <th className="px-5 py-3">Fee</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {appointments.map((apt) => (
                              <tr key={apt.id} className="hover:bg-slate-50/40 transition-colors">
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  <p className="font-semibold text-slate-900 dark:text-white">{fmtDate(apt.appointmentDate)}</p>
                                  <p className="text-xs text-slate-400 font-mono mt-0.5">{fmtTime(apt.appointmentDate)}</p>
                                </td>
                                <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{apt.bookingNumber || '—'}</td>
                                <td className="px-5 py-3.5 capitalize font-medium text-slate-800 dark:text-slate-350">{apt.type || 'Consultation'}</td>
                                <td className="px-5 py-3.5 max-w-[200px] truncate font-medium text-slate-600 dark:text-slate-400">
                                  {apt.clinicalExamination?.diagnosis || apt.notes || '—'}
                                </td>
                                <td className="px-5 py-3.5 font-semibold text-slate-850 dark:text-slate-200">Dr. {apt.doctor?.user?.fullName || 'Unknown'}</td>
                                <td className="px-5 py-3.5">
                                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${statusColor(apt.status)}`}>
                                    {(apt.status || 'Pending').toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">${Number(apt.amount ?? 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ── Billing & Invoices Tab ── */}
            {sideTab === 'billing' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Billing Records & Invoices</h3>

                {billings.length === 0 ? (
                  <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 shadow-none bg-transparent">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                      <CreditCard className="h-10 w-10 text-slate-400 animate-pulse" />
                      <p className="text-sm font-semibold text-slate-500">No invoices or billing transactions found.</p>
                      <p className="text-xs text-slate-400 max-w-xs">All bills generated for surgery, consultations, pharmacy or optical items will appear here.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              <th className="px-5 py-3">Invoice Number</th>
                              <th className="px-5 py-3">Created Date</th>
                              <th className="px-5 py-3">Service Type</th>
                              <th className="px-5 py-3">Payment Method</th>
                              <th className="px-5 py-3">Billing Status</th>
                              <th className="px-5 py-3">Due Date</th>
                              <th className="px-5 py-3 text-right">Total Amount</th>
                              <th className="px-5 py-3 text-right">Final Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {billings.map((bill) => (
                              <tr key={bill.id} className="hover:bg-slate-50/40 transition-colors">
                                <td className="px-5 py-3.5 font-mono text-xs font-black text-[#0EA5E9]">{bill.invoiceNumber || 'INV-TBD'}</td>
                                <td className="px-5 py-3.5 font-medium whitespace-nowrap text-slate-800 dark:text-slate-200">{fmtDate(bill.createdAt)}</td>
                                <td className="px-5 py-3.5 uppercase font-bold text-xs text-slate-700 dark:text-slate-400">{bill.serviceType}</td>
                                <td className="px-5 py-3.5 uppercase font-semibold text-xs text-slate-600 dark:text-slate-450">{bill.paymentMethod || '—'}</td>
                                <td className="px-5 py-3.5">
                                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${statusColor(bill.status)}`}>
                                    {(bill.status || 'Unpaid').toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">{bill.dueDate ? fmtDate(bill.dueDate) : '—'}</td>
                                <td className="px-5 py-3.5 text-right font-medium text-slate-400 font-mono">${Number(bill.totalAmount).toFixed(2)}</td>
                                <td className="px-5 py-3.5 text-right font-black text-slate-900 dark:text-white font-mono">${Number(bill.finalAmount).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
