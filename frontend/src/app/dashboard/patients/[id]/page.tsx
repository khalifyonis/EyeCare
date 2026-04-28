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
  Activity, Scissors,
} from 'lucide-react';
import { readStoredUser, resolveRoleName } from '@/lib/auth';

/* ── types ── */
type Appointment = {
  id: string;
  appointmentDate?: string;
  type?: string;
  status?: string;
  notes?: string;
  amount?: number;
  bookingNumber?: string;
  doctor?: { user?: { fullName?: string } };
  clinicalExamination?: {
    diagnosis?: string;
    sphRight?: number; cylRight?: number; axisRight?: number;
    sphLeft?: number; cylLeft?: number; axisLeft?: number;
    examinedBy?: { user?: { fullName?: string } };
    surgery?: {
      date?: string; eye?: string; surgeryType?: string;
      status?: string; surgeon?: { user?: { fullName?: string } };
    };
    prescriptions?: { id: string; itemType?: string; quantity?: number; instructions?: string }[];
  };
  erExamination?: {
    vaRight?: string; vaLeft?: string;
    iopRight?: number; iopLeft?: number;
    recordedBy?: { fullName?: string };
  };
};

type PatientData = {
  id: string;
  patientNumber?: string;
  fullName?: string;
  firstName?: string; lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  phone?: string; email?: string;
  address?: string; city?: string; state?: string;
  bloodGroup?: string;
  allergies?: string;
  currentMedications?: string;
  medicalHistory?: string;
  familyMedicalHistory?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  appointments?: Appointment[];
  branch?: { branchName?: string };
};

type EyeHistory = {
  refractionHistory: {
    date?: string; doctorName?: string; diagnosis?: string;
    sphRight?: number; cylRight?: number; axisRight?: number;
    sphLeft?: number; cylLeft?: number; axisLeft?: number;
  }[];
  iopHistory: {
    date?: string; recordedBy?: string;
    vaRight?: string; vaLeft?: string;
    iopRight?: number; iopLeft?: number;
  }[];
  surgeries: {
    date?: string; eye?: string; surgeryType?: string;
    status?: string; surgeonName?: string; notes?: string;
  }[];
};

/* ── helpers ── */
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
function lv(v?: string | null) { return (v || '').trim() || 'N/A'; }
function statusColor(s?: string) {
  const st = (s || '').toUpperCase();
  if (st === 'COMPLETED') return 'bg-emerald-100 text-emerald-700';
  if (st === 'PENDING' || st === 'SCHEDULED') return 'bg-amber-100 text-amber-700';
  if (st === 'CANCELLED') return 'bg-red-100 text-red-600';
  if (st === 'CONFIRMED') return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-600';
}

const SIDEBAR_TABS = [
  { id: 'info', label: 'Patient Info', icon: User },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays },
  { id: 'eye-history', label: 'Eye History', icon: Eye },
];

const EYE_TABS = [
  { id: 'refraction', label: 'Refraction' },
  { id: 'iop-va', label: 'IOP / VA' },
  { id: 'surgeries', label: 'Surgeries' },
];

export default function PatientProfilePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [eyeHistory, setEyeHistory] = useState<EyeHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [sideTab, setSideTab] = useState('info');
  const [eyeTab, setEyeTab] = useState('refraction');

  const role = resolveRoleName(readStoredUser());
  const canManage = ['ADMIN', 'SUPERADMIN', 'RECEPTIONIST'].includes(role);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const [patRes, ehRes] = await Promise.all([
          api.get(`/patients/${id}`),
          api.get(`/patients/${id}/eye-history`).catch(() => ({ data: null })),
        ]);
        setPatient(patRes.data);
        if (ehRes.data) setEyeHistory(ehRes.data);
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
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0EA5E9]" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        Patient not found.{' '}
        <button onClick={() => router.push('/dashboard/patients')} className="text-[#0EA5E9] underline">
          Back to patients
        </button>
      </div>
    );
  }

  const appointments = patient.appointments || [];
  const exams = appointments.filter(a => a.clinicalExamination);
  const surgeries = appointments.filter(a => a.clinicalExamination?.surgery);
  const latestER = appointments.find(a => a.erExamination)?.erExamination;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">

        {/* ── Top Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => router.push('/dashboard/patients')}
              className="mb-2 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Patients
            </button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {lv(patient.fullName)}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Patient ID: {lv(patient.patientNumber)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/appointments/new?patientId=${id}`)}
              className="gap-2"
            >
              <CalendarPlus className="h-4 w-4" /> Book
            </Button>
            {canManage && (
              <>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/patients?edit=${id}`)}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" /> Edit
                </Button>
                <Button variant="destructive" onClick={handleDelete} className="gap-2">
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Eye, label: 'Eye Exams', count: exams.length, color: 'text-emerald-500' },
            { icon: FileText, label: 'Prescriptions', count: exams.reduce((n, a) => n + (a.clinicalExamination?.prescriptions?.length || 0), 0), color: 'text-blue-500' },
            { icon: Scissors, label: 'Surgeries', count: surgeries.length, color: 'text-orange-500' },
            { icon: CalendarDays, label: 'Appointments', count: appointments.length, color: 'text-indigo-500' },
          ].map(s => (
            <Card key={s.label} className="border-slate-200 dark:border-slate-800">
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`rounded-lg bg-slate-50 dark:bg-slate-900 p-2.5 ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.count}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Main Content ── */}
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Sidebar Tabs */}
          <div className="w-full lg:w-52 shrink-0">
            <nav className="flex flex-row lg:flex-col gap-1 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-2">
              {SIDEBAR_TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSideTab(t.id)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all w-full text-left ${
                    sideTab === t.id
                      ? 'bg-blue-50 text-[#0EA5E9] dark:bg-blue-900/30'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* ── Patient Info Tab ── */}
            {sideTab === 'info' && (
              <>
                {/* Personal + Medical cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <User className="h-4 w-4 text-[#0EA5E9]" /> Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2.5 text-sm">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <User className="h-4 w-4 text-slate-400" /> {lv(patient.fullName)}
                      </div>
                      <div className="text-slate-600 dark:text-slate-300">Gender: {patient.gender === 'FEMALE' ? 'Female' : patient.gender === 'MALE' ? 'Male' : lv(patient.gender)}</div>
                      <div className="text-slate-600 dark:text-slate-300">Date of Birth: {fmtDate(patient.dateOfBirth)}</div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Phone className="h-4 w-4 text-slate-400" /> {lv(patient.phone)}
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Mail className="h-4 w-4 text-slate-400" /> {lv(patient.email)}
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <MapPin className="h-4 w-4 text-slate-400" /> {lv([patient.address, patient.city, patient.state].filter(Boolean).join(', '))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-[#0EA5E9]" /> Medical History
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Allergies</p>
                          <p className="text-slate-700 dark:text-slate-200">{lv(patient.allergies)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Pill className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Current Medications</p>
                          <p className="text-slate-700 dark:text-slate-200">{lv(patient.currentMedications)}</p>
                        </div>
                      </div>
                      <div className="text-slate-600 dark:text-slate-300">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Blood Group</p>
                        {lv(patient.bloodGroup)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Current Vitals (latest IOP/VA) */}
                {latestER && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4 text-[#0EA5E9]" /> Patient Current Vitals
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                          <p className="text-xs font-semibold text-slate-500 uppercase">IOP Right</p>
                          <p className="text-xl font-bold text-slate-900 dark:text-white">{latestER.iopRight ?? 'N/A'} <span className="text-xs font-normal text-slate-400">mmHg</span></p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                          <p className="text-xs font-semibold text-slate-500 uppercase">IOP Left</p>
                          <p className="text-xl font-bold text-slate-900 dark:text-white">{latestER.iopLeft ?? 'N/A'} <span className="text-xs font-normal text-slate-400">mmHg</span></p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                          <p className="text-xs font-semibold text-slate-500 uppercase">VA Right</p>
                          <p className="text-xl font-bold text-slate-900 dark:text-white">{latestER.vaRight ?? 'N/A'}</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                          <p className="text-xs font-semibold text-slate-500 uppercase">VA Left</p>
                          <p className="text-xl font-bold text-slate-900 dark:text-white">{latestER.vaLeft ?? 'N/A'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Emergency Contact */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Emergency Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <div>Name: {lv(patient.emergencyContactName)}</div>
                    <div>Relationship: {lv(patient.emergencyContactRelationship)}</div>
                    <div>Phone: {lv(patient.emergencyContactPhone)}</div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* ── Appointments Tab ── */}
            {sideTab === 'appointments' && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-[#0EA5E9]" /> Patient History
                    </CardTitle>
                    <span className="text-xs font-semibold text-slate-500">Total {appointments.length} Visits</span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {appointments.length === 0 ? (
                    <p className="p-6 text-center text-sm text-slate-400">No appointments found.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-y border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50">
                            {['DATE AND TIME', 'VISIT NO', 'DIAGNOSIS', 'DOCTOR', 'STATUS', 'FEE'].map(h => (
                              <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {appointments.map(apt => (
                            <tr key={apt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <p className="font-medium text-slate-800 dark:text-slate-200">{fmtDate(apt.appointmentDate)}</p>
                                <p className="text-xs text-slate-400">{fmtTime(apt.appointmentDate)}</p>
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-xs">{apt.bookingNumber || '—'}</td>
                              <td className="px-4 py-3 max-w-[200px] truncate text-slate-600 dark:text-slate-300">
                                {apt.clinicalExamination?.diagnosis || apt.notes?.slice(0, 50) || '—'}
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                Dr. {apt.doctor?.user?.fullName || 'Unknown'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColor(apt.status)}`}>
                                  {(apt.status || 'N/A').toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                                ${(apt.amount ?? 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Eye History Tab ── */}
            {sideTab === 'eye-history' && (
              <>
                {/* Sub-tabs */}
                <div className="flex gap-2 flex-wrap">
                  {EYE_TABS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setEyeTab(t.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        eyeTab === t.id
                          ? 'bg-[#0EA5E9] text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {t.label} ({
                        t.id === 'refraction' ? (eyeHistory?.refractionHistory?.length ?? 0)
                        : t.id === 'iop-va' ? (eyeHistory?.iopHistory?.length ?? 0)
                        : (eyeHistory?.surgeries?.length ?? 0)
                      })
                    </button>
                  ))}
                </div>

                {/* Refraction */}
                {eyeTab === 'refraction' && (
                  <Card>
                    <CardContent className="p-0">
                      {!eyeHistory?.refractionHistory?.length ? (
                        <p className="p-6 text-center text-sm text-slate-400">No refraction records found.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50">
                                {['DATE', 'DOCTOR', 'RIGHT EYE', 'LEFT EYE', 'DIAGNOSIS'].map(h => (
                                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {eyeHistory.refractionHistory.map((r, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">{fmtDate(r.date)}</td>
                                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.doctorName}</td>
                                  <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                                    SPH {r.sphRight ?? '—'} / CYL {r.cylRight ?? '—'} / AX {r.axisRight ?? '—'}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                                    SPH {r.sphLeft ?? '—'} / CYL {r.cylLeft ?? '—'} / AX {r.axisLeft ?? '—'}
                                  </td>
                                  <td className="px-4 py-3 max-w-[200px] truncate text-slate-600 dark:text-slate-300">{r.diagnosis || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* IOP / VA */}
                {eyeTab === 'iop-va' && (
                  <Card>
                    <CardContent className="p-0">
                      {!eyeHistory?.iopHistory?.length ? (
                        <p className="p-6 text-center text-sm text-slate-400">No IOP / VA records found.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50">
                                {['DATE', 'RECORDED BY', 'IOP RIGHT', 'IOP LEFT', 'VA RIGHT', 'VA LEFT'].map(h => (
                                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {eyeHistory.iopHistory.map((r, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">{fmtDate(r.date)}</td>
                                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.recordedBy || '—'}</td>
                                  <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{r.iopRight ?? '—'} <span className="text-xs font-normal text-slate-400">mmHg</span></td>
                                  <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{r.iopLeft ?? '—'} <span className="text-xs font-normal text-slate-400">mmHg</span></td>
                                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{r.vaRight || '—'}</td>
                                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{r.vaLeft || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Surgeries */}
                {eyeTab === 'surgeries' && (
                  <Card>
                    <CardContent className="p-0">
                      {!eyeHistory?.surgeries?.length ? (
                        <p className="p-6 text-center text-sm text-slate-400">No surgery records found.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50">
                                {['DATE', 'EYE SIDE', 'TYPE', 'SURGEON', 'STATUS'].map(h => (
                                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {eyeHistory.surgeries.map((s, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">{fmtDate(s.date)}</td>
                                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.eye || '—'}</td>
                                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.surgeryType || '—'}</td>
                                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.surgeonName || '—'}</td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColor(s.status)}`}>
                                      {(s.status || 'N/A').toUpperCase()}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
