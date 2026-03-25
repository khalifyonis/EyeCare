'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import {
    Loader2, CalendarPlus, Phone, MapPin, Activity,
    Calendar as CalendarIcon, Clock, User2, Stethoscope,
    Scissors, CalendarCheck, Eye, Droplets, UserCheck,
    Pencil, ArrowLeft, Heart, AlertTriangle, Glasses,
    FileText, Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppointmentDialog } from './appointment-dialog';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

/* ── Types ── */
type SurgeryRecord = {
    id: string; eyeSide?: string | null; surgeryType?: string | null;
    surgeryDate?: string | null; status?: string | null;
    surgeon?: { user?: { fullName?: string | null } | null } | null;
};
type ClinicalExam = {
    id: string; diagnosis?: string | null; managementPlan?: string | null;
    surgery?: SurgeryRecord | null; prescriptions?: Array<{ id: string }>;
};
type AppointmentRecord = {
    id: string; bookingNumber?: string | null; appointmentDate?: string | null;
    amount?: number | string | null; status?: string | null;
    doctor?: { user?: { fullName?: string | null } | null } | null;
    clinicalExamination?: ClinicalExam | null;
    erExamination?: { id: string } | null;
};
type FollowUpRecord = {
    id: string; dueDate: string; status: string;
    sourceType: string; notes?: string | null;
};
type RefractionRecord = {
    date: string; doctorName: string;
    sphRight?: number | string | null; cylRight?: number | string | null; axisRight?: number | null;
    sphLeft?: number | string | null; cylLeft?: number | string | null; axisLeft?: number | null;
    diagnosis?: string | null;
};
type IopRecord = {
    date: string; recordedBy: string;
    vaRight?: string | null; vaLeft?: string | null;
    iopRight?: number | string | null; iopLeft?: number | string | null;
};
type SurgeryHistoryRecord = {
    date: string; eyeSide: string; surgeryType: string;
    status: string; surgeonName: string; notes?: string | null;
};
type EyeHistory = {
    refractionHistory: RefractionRecord[];
    iopHistory: IopRecord[];
    surgeries: SurgeryHistoryRecord[];
};
type PatientDetail = {
    id: string; patientNumber?: string | null; fullName?: string | null;
    firstName?: string | null; lastName?: string | null;
    phone?: string | null; email?: string | null; dateOfBirth?: string | null;
    gender?: string | null; address?: string | null; city?: string | null;
    state?: string | null; zipCode?: string | null;
    bloodGroup?: string | null; isActive?: boolean;
    allergies?: string | null; chiefComplaint?: string | null;
    currentMedications?: string | null; medicalHistory?: string | null;
    familyMedicalHistory?: string | null;
    emergencyContactName?: string | null;
    emergencyContactRelationship?: string | null;
    emergencyContactPhone?: string | null;
    assignedDoctor?: { user?: { fullName?: string | null } | null } | null;
    createdAt?: string | null; appointments?: AppointmentRecord[];
};

/* ── Helpers ── */
const money = (v?: number | string | null) => {
    const n = Number(v ?? 0); return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};
const fmtR = (v?: number | string | null) => {
    if (v == null || v === '') return '--';
    const n = Number(v); return Number.isFinite(n) ? (n >= 0 ? '+' : '') + n.toFixed(2) : '--';
};
const statusCls = (s?: string | null) => {
    const v = (s || 'PENDING').toUpperCase();
    if (v === 'COMPLETED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (v === 'CANCELLED') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
};

function InfoItem({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }) {
    return (
        <div className="flex items-start gap-3 py-2">
            {Icon && (
                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-slate-400" />
                </div>
            )}
            <div className="min-w-0">
                <p className="text-xs text-slate-400 font-medium">{label}</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5 break-words">{value || 'Not provided'}</p>
            </div>
        </div>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">{children}</h3>;
}

function EmptyState({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3">
                <Icon className="w-6 h-6 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm text-slate-400 font-medium">{text}</p>
        </div>
    );
}

/* ── Page ── */
export default function PatientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [patient, setPatient] = useState<PatientDetail | null>(null);
    const [followUps, setFollowUps] = useState<FollowUpRecord[]>([]);
    const [eyeHistory, setEyeHistory] = useState<EyeHistory>({ refractionHistory: [], iopHistory: [], surgeries: [] });
    const [loading, setLoading] = useState(true);
    const [bookingOpen, setBookingOpen] = useState(false);
    const [eyeTab, setEyeTab] = useState<'refraction' | 'iop' | 'surgeries' | 'chart'>('refraction');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [pr, fr, er] = await Promise.all([
                api.get(`/patients/${id}`),
                api.get(`/follow-ups/patient/${id}?status=all`).catch(() => ({ data: [] })),
                api.get(`/patients/${id}/eye-history`).catch(() => ({ data: { refractionHistory: [], iopHistory: [], surgeries: [] } })),
            ]);
            setPatient(pr.data);
            setFollowUps(Array.isArray(fr.data) ? fr.data : []);
            setEyeHistory(er.data || { refractionHistory: [], iopHistory: [], surgeries: [] });
        } catch {
            toast.error('Failed to load patient');
            router.push('/dashboard/patients');
        } finally { setLoading(false); }
    }, [id, router]);

    useEffect(() => { if (id) fetchData(); }, [id, fetchData]);

    const fmt = (d?: string | null) => d ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d)) : 'N/A';
    const fmtT = (d?: string | null) => d ? new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : 'N/A';

    if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
    if (!patient) return null;

    const fullName = patient.fullName || 'Unknown';
    const age = patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / 31557600000) : null;
    const patientId = patient.patientNumber || `PAT-${patient.id.slice(0, 5).toUpperCase()}`;
    const totalVisits = patient.appointments?.length ?? 0;
    const lastIOP = eyeHistory.iopHistory[0];
    const pendingFU = followUps.filter(f => f.status === 'PENDING' || f.status === 'OVERDUE');
    const totalExams = eyeHistory.refractionHistory.length + eyeHistory.iopHistory.length;

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">

            {/* ── Header ── */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                <div className="max-w-7xl mx-auto">
                    <button onClick={() => router.push('/dashboard/patients')} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors mb-3">
                        <ArrowLeft className="w-4 h-4" /> Back to Patients
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{fullName}</h1>
                            <p className="text-sm text-slate-400 mt-0.5">ID: {patientId}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" className="gap-2 rounded-xl h-10 font-semibold text-sm border-slate-200" onClick={() => router.push(`/dashboard/patients`)}>
                                <Pencil className="w-4 h-4" /> Edit
                            </Button>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-10 rounded-xl gap-2 px-5" onClick={() => setBookingOpen(true)}>
                                <CalendarPlus className="w-4 h-4" /> Book Appointment
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

                {/* ── Personal Information ── */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
                    <SectionTitle>Personal Information</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
                        <InfoItem icon={User2} label="Full Name" value={fullName} />
                        <InfoItem icon={MapPin} label="Address" value={[patient.address, patient.city, patient.state, patient.zipCode].filter(Boolean).join(', ')} />
                        <InfoItem icon={User2} label="Gender" value={patient.gender ? patient.gender.charAt(0) + patient.gender.slice(1).toLowerCase() : 'N/A'} />
                        <InfoItem icon={FileText} label="Email" value={patient.email || 'Not provided'} />
                        <InfoItem icon={UserCheck} label="Assigned Doctor" value={patient.assignedDoctor?.user?.fullName || 'Not assigned'} />
                        <InfoItem icon={Droplets} label="Blood Group" value={patient.bloodGroup || 'N/A'} />
                        <InfoItem icon={Phone} label="Phone" value={patient.phone || 'Not provided'} />
                        <InfoItem icon={CalendarIcon} label="Date of Birth" value={patient.dateOfBirth ? `${fmt(patient.dateOfBirth)} (${age} yrs)` : 'N/A'} />
                        <InfoItem icon={Activity} label="Status" value={patient.isActive !== false ? 'Active' : 'Inactive'} />
                    </div>
                </div>

                {/* ── Ocular History Summary ── */}
                <div>
                    <SectionTitle>Ocular History Summary</SectionTitle>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { icon: Eye, label: 'Eye Exams', count: totalExams, bg: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-500' },
                            { icon: Glasses, label: 'Prescriptions', count: patient.appointments?.reduce((sum, a) => sum + (a.clinicalExamination?.prescriptions?.length || 0), 0) ?? 0, bg: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-500' },
                            { icon: Scissors, label: 'Surgeries', count: eyeHistory.surgeries.length, bg: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600' },
                            { icon: CalendarCheck, label: 'Appointments', count: totalVisits, bg: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-500' },
                        ].map(({ icon: Icon, label, count, bg, iconColor }) => (
                            <div key={label} className={`${bg} rounded-2xl p-5 border border-slate-100 dark:border-slate-800`}>
                                <Icon className={`w-6 h-6 ${iconColor} mb-3`} />
                                <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">{count}</p>
                                <p className={`text-xs font-semibold mt-1.5 ${iconColor}`}>{label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Medical History ── */}
                {(patient.allergies || patient.currentMedications || patient.medicalHistory || patient.familyMedicalHistory || patient.chiefComplaint) && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
                        <SectionTitle>Medical History</SectionTitle>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                            {patient.allergies && <InfoItem icon={AlertTriangle} label="Allergies" value={patient.allergies} />}
                            {patient.chiefComplaint && <InfoItem icon={Heart} label="Chief Complaint" value={patient.chiefComplaint} />}
                            {patient.currentMedications && <InfoItem icon={Shield} label="Current Medications" value={patient.currentMedications} />}
                            {patient.medicalHistory && <InfoItem icon={FileText} label="Medical History" value={patient.medicalHistory} />}
                            {patient.familyMedicalHistory && <InfoItem icon={FileText} label="Family Medical History" value={patient.familyMedicalHistory} />}
                        </div>
                    </div>
                )}

                {/* ── Emergency Contact ── */}
                {(patient.emergencyContactName || patient.emergencyContactPhone) && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
                        <SectionTitle>Emergency Contact</SectionTitle>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-1">
                            <InfoItem icon={User2} label="Name" value={patient.emergencyContactName || 'Not provided'} />
                            <InfoItem icon={Heart} label="Relationship" value={patient.emergencyContactRelationship || 'Not provided'} />
                            <InfoItem icon={Phone} label="Phone" value={patient.emergencyContactPhone || 'Not provided'} />
                        </div>
                    </div>
                )}

                {/* ── Patient Current Vitals (IOP/VA) ── */}
                <div>
                    <SectionTitle>Patient Current Vitals</SectionTitle>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'IOP Right', value: lastIOP?.iopRight != null ? `${Number(lastIOP.iopRight).toFixed(1)}` : '--', unit: 'mmHg', sub: lastIOP ? fmt(lastIOP.date) : 'No readings' },
                            { label: 'IOP Left', value: lastIOP?.iopLeft != null ? `${Number(lastIOP.iopLeft).toFixed(1)}` : '--', unit: 'mmHg', sub: lastIOP ? fmt(lastIOP.date) : 'No readings' },
                            { label: 'VA Right', value: lastIOP?.vaRight || '--', unit: '', sub: lastIOP ? 'Last recorded' : 'No readings' },
                            { label: 'VA Left', value: lastIOP?.vaLeft || '--', unit: '', sub: lastIOP ? 'Last recorded' : 'No readings' },
                        ].map(({ label, value, unit, sub }) => (
                            <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{value}</span>
                                    {unit && <span className="text-sm font-medium text-slate-400">{unit}</span>}
                                </div>
                                <p className="text-xs mt-2 font-medium text-emerald-500">{sub}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Patient History ── */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                        <SectionTitle>Patient History</SectionTitle>
                        <span className="text-sm text-slate-400 font-medium">Total {totalVisits} Visit{totalVisits !== 1 ? 's' : ''}</span>
                    </div>
                    {totalVisits === 0 ? (
                        <EmptyState icon={CalendarIcon} text="No visits recorded yet. Book an appointment to get started." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Date Of Visit</th>
                                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Diagnosis</th>
                                        <th className="px-5 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Records</th>
                                        <th className="px-5 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Doctor</th>
                                        <th className="px-5 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                        <th className="px-5 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {patient.appointments?.map((apt) => {
                                        const clin = apt.clinicalExamination;
                                        return (
                                            <tr key={apt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <div className="font-semibold text-slate-800 dark:text-white">{fmt(apt.appointmentDate)}</div>
                                                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5"><Clock className="w-3 h-3" />{fmtT(apt.appointmentDate)}</div>
                                                </td>
                                                <td className="px-5 py-4 max-w-[200px]"><span className="text-slate-600 dark:text-slate-300 truncate block">{clin?.diagnosis || '—'}</span></td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                        {apt.erExamination && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">ER</span>}
                                                        {clin && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1"><Stethoscope className="w-3 h-3" />Clinical</span>}
                                                        {clin?.surgery && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1"><Scissors className="w-3 h-3" />Surgery</span>}
                                                        {!apt.erExamination && !clin && <span className="text-xs text-slate-300">—</span>}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-center text-slate-600 dark:text-slate-300 whitespace-nowrap">Dr. {apt.doctor?.user?.fullName || 'N/A'}</td>
                                                <td className="px-5 py-4 text-center"><span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusCls(apt.status)}`}>{apt.status || 'PENDING'}</span></td>
                                                <td className="px-5 py-4 text-right font-semibold text-slate-700 dark:text-slate-200">${money(apt.amount)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ── Eye History + Follow-ups ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Eye History */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                            <Eye className="w-5 h-5 text-blue-500" />
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Eye History</h3>
                        </div>
                        <div className="p-6">
                            <div className="flex gap-2 mb-5 flex-wrap">
                                {([
                                    { key: 'refraction', label: `Refraction (${eyeHistory.refractionHistory.length})` },
                                    { key: 'iop', label: `IOP / VA (${eyeHistory.iopHistory.length})` },
                                    { key: 'surgeries', label: `Surgeries (${eyeHistory.surgeries.length})` },
                                    { key: 'chart', label: 'SPH Trend' },
                                ] as const).map((t) => (
                                    <button key={t.key} onClick={() => setEyeTab(t.key)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${eyeTab === t.key ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200'}`}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {eyeTab === 'refraction' && (eyeHistory.refractionHistory.length === 0
                                ? <EmptyState icon={Eye} text="No refraction records yet." />
                                : (
                                    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                                        <table className="w-full text-xs">
                                            <thead><tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-400 uppercase tracking-wider">
                                                <th className="px-3 py-2.5 text-left font-semibold">Date</th><th className="px-3 py-2.5 text-left font-semibold">Doctor</th>
                                                <th className="px-3 py-2.5 text-center font-semibold" colSpan={3}>Right Eye</th>
                                                <th className="px-3 py-2.5 text-center font-semibold" colSpan={3}>Left Eye</th>
                                                <th className="px-3 py-2.5 text-left font-semibold">Diagnosis</th>
                                            </tr></thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {eyeHistory.refractionHistory.map((r, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                        <td className="px-3 py-2.5 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{fmt(r.date)}</td>
                                                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">Dr. {r.doctorName}</td>
                                                        <td className="px-3 py-2.5 text-center font-mono">{fmtR(r.sphRight)}</td>
                                                        <td className="px-3 py-2.5 text-center font-mono">{fmtR(r.cylRight)}</td>
                                                        <td className="px-3 py-2.5 text-center">{r.axisRight ?? '--'}</td>
                                                        <td className="px-3 py-2.5 text-center font-mono">{fmtR(r.sphLeft)}</td>
                                                        <td className="px-3 py-2.5 text-center font-mono">{fmtR(r.cylLeft)}</td>
                                                        <td className="px-3 py-2.5 text-center">{r.axisLeft ?? '--'}</td>
                                                        <td className="px-3 py-2.5 text-slate-500 max-w-[140px] truncate">{r.diagnosis || '--'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            )}

                            {eyeTab === 'iop' && (eyeHistory.iopHistory.length === 0
                                ? <EmptyState icon={Activity} text="No IOP / VA records yet." />
                                : (
                                    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                                        <table className="w-full text-xs">
                                            <thead><tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-400 uppercase tracking-wider">
                                                <th className="px-3 py-2.5 text-left font-semibold">Date</th><th className="px-3 py-2.5 text-left font-semibold">By</th>
                                                <th className="px-3 py-2.5 text-center font-semibold">VA R</th><th className="px-3 py-2.5 text-center font-semibold">VA L</th>
                                                <th className="px-3 py-2.5 text-center font-semibold">IOP R</th><th className="px-3 py-2.5 text-center font-semibold">IOP L</th>
                                            </tr></thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {eyeHistory.iopHistory.map((r, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                        <td className="px-3 py-2.5 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{fmt(r.date)}</td>
                                                        <td className="px-3 py-2.5 text-slate-500">{r.recordedBy}</td>
                                                        <td className="px-3 py-2.5 text-center">{r.vaRight || '--'}</td>
                                                        <td className="px-3 py-2.5 text-center">{r.vaLeft || '--'}</td>
                                                        <td className="px-3 py-2.5 text-center font-mono">{r.iopRight != null ? Number(r.iopRight).toFixed(1) : '--'}</td>
                                                        <td className="px-3 py-2.5 text-center font-mono">{r.iopLeft != null ? Number(r.iopLeft).toFixed(1) : '--'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            )}

                            {eyeTab === 'surgeries' && (eyeHistory.surgeries.length === 0
                                ? <EmptyState icon={Scissors} text="No surgeries on record." />
                                : (
                                    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                                        <table className="w-full text-xs">
                                            <thead><tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-400 uppercase tracking-wider">
                                                <th className="px-3 py-2.5 text-left font-semibold">Date</th><th className="px-3 py-2.5 text-left font-semibold">Type</th>
                                                <th className="px-3 py-2.5 text-center font-semibold">Eye</th><th className="px-3 py-2.5 text-center font-semibold">Status</th>
                                                <th className="px-3 py-2.5 text-left font-semibold">Surgeon</th><th className="px-3 py-2.5 text-left font-semibold">Notes</th>
                                            </tr></thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {eyeHistory.surgeries.map((s, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                        <td className="px-3 py-2.5 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{fmt(s.date)}</td>
                                                        <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200">{s.surgeryType}</td>
                                                        <td className="px-3 py-2.5 text-center"><span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold uppercase text-[10px] border border-blue-200">{s.eyeSide}</span></td>
                                                        <td className="px-3 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] border ${statusCls(s.status)}`}>{s.status}</span></td>
                                                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">Dr. {s.surgeonName}</td>
                                                        <td className="px-3 py-2.5 text-slate-400 max-w-[140px] truncate">{s.notes || '--'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            )}

                            {eyeTab === 'chart' && (eyeHistory.refractionHistory.length < 2
                                ? <EmptyState icon={Activity} text="At least 2 refraction records needed for the trend chart." />
                                : (
                                    <div>
                                        <p className="text-xs text-slate-400 mb-3">SPH trend over time (Right = blue, Left = violet)</p>
                                        <ResponsiveContainer width="100%" height={220}>
                                            <LineChart data={eyeHistory.refractionHistory.map(r => ({ date: fmt(r.date), sphR: r.sphRight != null ? Number(r.sphRight) : null, sphL: r.sphLeft != null ? Number(r.sphLeft) : null }))} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                                <YAxis tick={{ fontSize: 10 }} />
                                                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: unknown) => fmtR(v as number)} />
                                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                                <Line type="monotone" dataKey="sphR" name="SPH Right" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                                                <Line type="monotone" dataKey="sphL" name="SPH Left" stroke="#7c3aed" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* Follow-ups */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden h-fit">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <CalendarCheck className="w-4 h-4 text-blue-500" />
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Follow-ups</h3>
                            </div>
                            {pendingFU.length > 0 && <span className="text-xs font-bold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">{pendingFU.length}</span>}
                        </div>
                        <div className="p-4">
                            {pendingFU.length === 0 ? (
                                <EmptyState icon={CalendarCheck} text="No pending follow-ups" />
                            ) : (
                                <ul className="space-y-3">
                                    {pendingFU.map((f) => (
                                        <li key={f.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{fmt(f.dueDate)}</span>
                                                {f.status === 'OVERDUE' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">Overdue</span>}
                                            </div>
                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider inline-block">{f.sourceType}</span>
                                            {f.notes && <p className="text-xs text-slate-500 truncate">{f.notes}</p>}
                                            <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-8 rounded-lg" onClick={() => setBookingOpen(true)}>
                                                <CalendarPlus className="w-3 h-3 mr-1.5" />Book
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <AppointmentDialog open={bookingOpen} onOpenChange={setBookingOpen} patientId={id} onSuccess={fetchData} />
        </div>
    );
}
