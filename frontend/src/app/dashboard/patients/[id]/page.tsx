'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, CalendarPlus, Phone, Mail, MapPin, Activity, Calendar as CalendarIcon, Clock, User, Stethoscope, Scissors, CalendarCheck, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { AppointmentDialog } from './appointment-dialog';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type SurgeryRecord = {
    id: string;
    eyeSide?: string | null;
    surgeryType?: string | null;
    surgeryDate?: string | null;
    status?: string | null;
    surgeon?: { user?: { fullName?: string | null } | null } | null;
};

type ClinicalExaminationRecord = {
    id: string;
    diagnosis?: string | null;
    managementPlan?: string | null;
    examinedAt?: string | null;
    examinedBy?: { user?: { fullName?: string | null } | null } | null;
    surgery?: SurgeryRecord | null;
    prescriptions?: Array<{ id: string }>;
};

type ERExaminationRecord = {
    id: string;
    createdAt?: string | null;
    recordedBy?: { fullName?: string | null } | null;
};

type AppointmentRecord = {
    id: string;
    bookingNumber?: string | null;
    appointmentDate?: string | null;
    amount?: number | string | null;
    status?: string | null;
    doctor?: { user?: { fullName?: string | null } | null } | null;
    clinicalExamination?: ClinicalExaminationRecord | null;
    erExamination?: ERExaminationRecord | null;
};

type FollowUpRecord = {
    id: string;
    dueDate: string;
    status: string;
    sourceType: string;
    notes?: string | null;
    branch?: { id: string; branchName: string } | null;
};

type RefractionRecord = {
    date: string;
    doctorName: string;
    sphRight?: number | string | null;
    cylRight?: number | string | null;
    axisRight?: number | null;
    sphLeft?: number | string | null;
    cylLeft?: number | string | null;
    axisLeft?: number | null;
    diagnosis?: string | null;
};

type IopRecord = {
    date: string;
    recordedBy: string;
    vaRight?: string | null;
    vaLeft?: string | null;
    iopRight?: number | string | null;
    iopLeft?: number | string | null;
};

type SurgeryHistoryRecord = {
    date: string;
    eyeSide: string;
    surgeryType: string;
    status: string;
    surgeonName: string;
    notes?: string | null;
};

type EyeHistory = {
    refractionHistory: RefractionRecord[];
    iopHistory: IopRecord[];
    surgeries: SurgeryHistoryRecord[];
};

type PatientDetail = {
    id: string;
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    address?: string | null;
    appointments?: AppointmentRecord[];
};

const money = (value?: number | string | null) => {
    const amount = typeof value === 'number' ? value : Number(value ?? 0);
    return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
};

const fmtRefraction = (v?: number | string | null) => {
    if (v === null || v === undefined || v === '') return '—';
    const n = Number(v);
    if (!Number.isFinite(n)) return '—';
    return (n >= 0 ? '+' : '') + n.toFixed(2);
};

const statusClass = (status?: string | null) => {
    const value = (status || 'PENDING').toUpperCase();
    if (value === 'COMPLETED') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400';
    if (value === 'CANCELLED') return 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400';
};

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

    const fetchPatientDetails = useCallback(async () => {
        setLoading(true);
        try {
            const [patientRes, followUpsRes, eyeHistoryRes] = await Promise.all([
                api.get(`/patients/${id}`),
                api.get(`/follow-ups/patient/${id}?status=all`).catch(() => ({ data: [] })),
                api.get(`/patients/${id}/eye-history`).catch(() => ({ data: { refractionHistory: [], iopHistory: [], surgeries: [] } })),
            ]);
            setPatient(patientRes.data);
            setFollowUps(Array.isArray(followUpsRes.data) ? followUpsRes.data : []);
            setEyeHistory(eyeHistoryRes.data || { refractionHistory: [], iopHistory: [], surgeries: [] });
        } catch {
            toast.error('Failed to load patient details');
            router.push('/dashboard/patients');
        } finally {
            setLoading(false);
        }
    }, [id, router]);

    useEffect(() => {
        if (id) fetchPatientDetails();
    }, [id, fetchPatientDetails]);

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return 'N/A';
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(new Date(dateString));
    };

    const formatTime = (dateString?: string | null) => {
        if (!dateString) return 'N/A';
        return new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateString));
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center animate-in fade-in duration-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#0EA5E9]" />
            </div>
        );
    }

    if (!patient) return null;

    const fullName = patient.fullName || '';
    const initials = fullName.split(/\s+/).map((s: string) => s.charAt(0)).join('').slice(0, 2).toUpperCase() || fullName.charAt(0).toUpperCase();

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-slate-500 hover:text-[#0EA5E9] hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 transition-all active:scale-90"
                        onClick={() => router.push('/dashboard/patients')}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Patient Record</h1>
                        <PageBreadcrumb current="Patient Record" />
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">ID: #{String(patient.id).slice(0, 8)}</span>
                        </div>
                    </div>
                </div>
                <Button
                    className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white text-xs font-bold shadow-md shadow-blue-500/10 px-5 rounded-xl transition-all active:scale-[0.98] h-10"
                    onClick={() => setBookingOpen(true)}
                >
                    <CalendarPlus className="w-4 h-4 mr-2" />
                    Book Appointment
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Patient Profile Overview */}
                <Card className="md:col-span-1 shadow-xl border-blue-100/50 dark:border-slate-800 relative overflow-hidden h-fit">
                    <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-[#0EA5E9]/20 to-transparent"></div>
                    <CardContent className="pt-8 pb-6 text-center space-y-4 relative z-10">
                        <div className="size-28 mx-auto rounded-full overflow-hidden border-4 border-white dark:border-slate-900 bg-gradient-to-br from-[#0EA5E9] to-[#0c96d4] shadow-2xl flex items-center justify-center">
                            <span className="text-4xl font-black text-white">{initials.toUpperCase()}</span>
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">
                                {fullName}
                            </h2>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                                {patient.gender} • {patient.dateOfBirth ? `${new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} YRS` : 'N/A'}
                            </p>
                        </div>
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-6 mt-6 space-y-4 text-left">
                            <div className="flex items-center gap-3 text-sm">
                                <Phone className="w-4 h-4 text-[#0EA5E9]" />
                                <span className="font-medium text-slate-700 dark:text-slate-300">{patient.phone}</span>
                            </div>
                            {patient.email && (
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="w-4 h-4 text-[#0EA5E9]" />
                                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{patient.email}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-3 text-sm">
                                <CalendarIcon className="w-4 h-4 text-[#0EA5E9]" />
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                    DOB: {formatDate(patient.dateOfBirth)}
                                </span>
                            </div>
                            {patient.address && (
                                <div className="flex items-start gap-3 text-sm">
                                    <MapPin className="w-4 h-4 text-[#0EA5E9] shrink-0 mt-0.5" />
                                    <span className="font-medium text-slate-700 dark:text-slate-300 leading-tight">{patient.address}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Right Column: Appointments Timeline */}
                <Card className="md:col-span-2 shadow-xl border-blue-100/50 dark:border-slate-800">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Activity className="w-5 h-5 text-[#0EA5E9]" />
                            Digital Medical Record
                        </CardTitle>
                        <CardDescription>Appointments, exams, surgeries</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {(!patient.appointments || patient.appointments.length === 0) ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                <div className="size-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
                                    <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                </div>
                                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No record yet</p>
                                <p className="text-xs text-slate-500 mt-1">Create an appointment to start.</p>
                            </div>
                        ) : (
                            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
                                {patient.appointments.map((apt) => {
                                    const clinical = apt.clinicalExamination;
                                    const surgery = clinical?.surgery;
                                    const hasER = !!apt.erExamination;
                                    const hasClinical = !!clinical;

                                    return (
                                    <div key={apt.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                                        {/* Marker */}
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-950 bg-blue-100 dark:bg-blue-900/50 text-[#0EA5E9] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-transform duration-300 group-hover:scale-110">
                                            <Activity className="w-4 h-4" />
                                        </div>

                                        {/* Content */}
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:border-blue-200 dark:group-hover:border-blue-900/50 text-left">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-50 text-[#0EA5E9] uppercase tracking-widest">
                                                        {apt.bookingNumber || 'N/A'}
                                                    </span>
                                                    <span className="text-xs font-black uppercase tracking-widest text-[#0EA5E9]">
                                                        {formatDate(apt.appointmentDate)}
                                                    </span>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${statusClass(apt.status)}`}>
                                                    {apt.status || 'PENDING'}
                                                </span>
                                            </div>
                                            <div className="space-y-2 mt-3">
                                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                    <Clock className="w-4 h-4 text-slate-400" />
                                                    {formatTime(apt.appointmentDate)}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                    <User className="w-4 h-4 text-slate-400" />
                                                    Dr. {apt.doctor?.user?.fullName || 'Unknown'}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                    <span className="w-4 text-center font-bold text-emerald-500">$</span>
                                                    {money(apt.amount)}
                                                </div>
                                            </div>

                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {hasER && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300 uppercase tracking-wider">
                                                        ER
                                                    </span>
                                                )}
                                                {hasClinical && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 uppercase tracking-wider">
                                                        <Stethoscope className="w-3 h-3" />
                                                        Clinical
                                                    </span>
                                                )}
                                                {surgery && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 uppercase tracking-wider">
                                                        <Scissors className="w-3 h-3" />
                                                        Surgery {surgery.status || 'PENDING'}
                                                    </span>
                                                )}
                                            </div>

                                            {(clinical?.diagnosis || clinical?.managementPlan || surgery || (clinical?.prescriptions?.length || 0) > 0) && (
                                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                                                    {clinical?.diagnosis && <p><span className="font-bold">Dx:</span> {clinical.diagnosis}</p>}
                                                    {clinical?.managementPlan && <p><span className="font-bold">Plan:</span> {clinical.managementPlan}</p>}
                                                    {surgery && (
                                                        <p>
                                                            <span className="font-bold">Surgery:</span> {surgery.surgeryType || 'N/A'} ({surgery.eyeSide || 'N/A'}) • {formatDate(surgery.surgeryDate)} • Dr. {surgery.surgeon?.user?.fullName || 'Unknown'}
                                                        </p>
                                                    )}
                                                    {(clinical?.prescriptions?.length || 0) > 0 && (
                                                        <p><span className="font-bold">Rx:</span> {clinical?.prescriptions?.length} item(s)</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Follow-ups */}
            <Card className="shadow-xl border-blue-100/50 dark:border-slate-800">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <CalendarCheck className="w-5 h-5 text-[#0EA5E9]" />
                        Follow-ups
                    </CardTitle>
                    <CardDescription>Pending and overdue follow-ups. Book an appointment to complete.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {followUps.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400 py-4">No follow-ups on record.</p>
                    ) : followUps.filter((f) => f.status === 'PENDING' || f.status === 'OVERDUE').length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400 py-4">No pending or overdue follow-ups.</p>
                    ) : (
                        <ul className="space-y-3">
                            {followUps
                                .filter((f) => f.status === 'PENDING' || f.status === 'OVERDUE')
                                .map((f) => (
                                    <li
                                        key={f.id}
                                        className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30"
                                    >
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                {formatDate(f.dueDate)}
                                            </span>
                                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 uppercase tracking-wider">
                                                {f.sourceType}
                                            </span>
                                            {f.status === 'OVERDUE' && (
                                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                                    Overdue
                                                </span>
                                            )}
                                            {f.notes && (
                                                <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                                                    {f.notes}
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white text-xs font-bold"
                                            onClick={() => setBookingOpen(true)}
                                        >
                                            <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />
                                            Book appointment
                                        </Button>
                                    </li>
                                ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            {/* Eye History */}
            <Card className="shadow-xl border-blue-100/50 dark:border-slate-800">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Eye className="w-5 h-5 text-[#0EA5E9]" />
                        Eye History
                    </CardTitle>
                    <CardDescription>Refraction, IOP / VA readings, and surgeries over time.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    {/* Tab bar */}
                    <div className="flex gap-1 mb-4 flex-wrap">
                        {([
                            { key: 'refraction', label: `Refraction (${eyeHistory.refractionHistory.length})` },
                            { key: 'iop', label: `IOP / VA (${eyeHistory.iopHistory.length})` },
                            { key: 'surgeries', label: `Surgeries (${eyeHistory.surgeries.length})` },
                            { key: 'chart', label: 'SPH Trend' },
                        ] as const).map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setEyeTab(t.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    eyeTab === t.key
                                        ? 'bg-[#0EA5E9] text-white shadow'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Refraction table */}
                    {eyeTab === 'refraction' && (
                        eyeHistory.refractionHistory.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">No refraction records yet.</p>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            <th className="px-3 py-2.5 text-left font-semibold">Date</th>
                                            <th className="px-3 py-2.5 text-left font-semibold">Doctor</th>
                                            <th className="px-3 py-2.5 text-center font-semibold" colSpan={3}>Right Eye</th>
                                            <th className="px-3 py-2.5 text-center font-semibold" colSpan={3}>Left Eye</th>
                                            <th className="px-3 py-2.5 text-left font-semibold">Diagnosis</th>
                                        </tr>
                                        <tr className="bg-slate-50/60 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest">
                                            <th className="px-3 pb-2" />
                                            <th className="px-3 pb-2" />
                                            <th className="px-3 pb-2 text-center">SPH</th>
                                            <th className="px-3 pb-2 text-center">CYL</th>
                                            <th className="px-3 pb-2 text-center">AXIS</th>
                                            <th className="px-3 pb-2 text-center">SPH</th>
                                            <th className="px-3 pb-2 text-center">CYL</th>
                                            <th className="px-3 pb-2 text-center">AXIS</th>
                                            <th className="px-3 pb-2" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {eyeHistory.refractionHistory.map((r, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                                <td className="px-3 py-2.5 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatDate(r.date)}</td>
                                                <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">Dr. {r.doctorName}</td>
                                                <td className="px-3 py-2.5 text-center font-mono text-slate-700 dark:text-slate-200">{fmtRefraction(r.sphRight)}</td>
                                                <td className="px-3 py-2.5 text-center font-mono text-slate-700 dark:text-slate-200">{fmtRefraction(r.cylRight)}</td>
                                                <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{r.axisRight ?? '—'}</td>
                                                <td className="px-3 py-2.5 text-center font-mono text-slate-700 dark:text-slate-200">{fmtRefraction(r.sphLeft)}</td>
                                                <td className="px-3 py-2.5 text-center font-mono text-slate-700 dark:text-slate-200">{fmtRefraction(r.cylLeft)}</td>
                                                <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{r.axisLeft ?? '—'}</td>
                                                <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 max-w-[180px] truncate">{r.diagnosis || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}

                    {/* IOP / VA table */}
                    {eyeTab === 'iop' && (
                        eyeHistory.iopHistory.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">No IOP / VA records yet.</p>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            <th className="px-3 py-2.5 text-left font-semibold">Date</th>
                                            <th className="px-3 py-2.5 text-left font-semibold">Recorded By</th>
                                            <th className="px-3 py-2.5 text-center font-semibold">VA Right</th>
                                            <th className="px-3 py-2.5 text-center font-semibold">VA Left</th>
                                            <th className="px-3 py-2.5 text-center font-semibold">IOP Right</th>
                                            <th className="px-3 py-2.5 text-center font-semibold">IOP Left</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {eyeHistory.iopHistory.map((r, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                                <td className="px-3 py-2.5 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatDate(r.date)}</td>
                                                <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{r.recordedBy}</td>
                                                <td className="px-3 py-2.5 text-center text-slate-700 dark:text-slate-200">{r.vaRight || '—'}</td>
                                                <td className="px-3 py-2.5 text-center text-slate-700 dark:text-slate-200">{r.vaLeft || '—'}</td>
                                                <td className="px-3 py-2.5 text-center font-mono text-slate-700 dark:text-slate-200">{r.iopRight != null ? Number(r.iopRight).toFixed(1) : '—'}</td>
                                                <td className="px-3 py-2.5 text-center font-mono text-slate-700 dark:text-slate-200">{r.iopLeft != null ? Number(r.iopLeft).toFixed(1) : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}

                    {/* Surgeries table */}
                    {eyeTab === 'surgeries' && (
                        eyeHistory.surgeries.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">No surgeries on record.</p>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            <th className="px-3 py-2.5 text-left font-semibold">Date</th>
                                            <th className="px-3 py-2.5 text-left font-semibold">Type</th>
                                            <th className="px-3 py-2.5 text-center font-semibold">Eye</th>
                                            <th className="px-3 py-2.5 text-center font-semibold">Status</th>
                                            <th className="px-3 py-2.5 text-left font-semibold">Surgeon</th>
                                            <th className="px-3 py-2.5 text-left font-semibold">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {eyeHistory.surgeries.map((s, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                                <td className="px-3 py-2.5 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatDate(s.date)}</td>
                                                <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200">{s.surgeryType}</td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-bold uppercase text-[10px]">
                                                        {s.eyeSide}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                                        s.status === 'COMPLETED'
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                            : s.status === 'CANCELLED'
                                                            ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                            : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                    }`}>
                                                        {s.status}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">Dr. {s.surgeonName}</td>
                                                <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 max-w-[160px] truncate">{s.notes || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}

                    {/* SPH Trend Chart */}
                    {eyeTab === 'chart' && (
                        eyeHistory.refractionHistory.length < 2 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                                At least 2 refraction records are needed to display the trend chart.
                            </p>
                        ) : (
                            <div className="pt-2">
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">SPH values over time (Right eye = blue, Left eye = purple)</p>
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart
                                        data={eyeHistory.refractionHistory.map((r) => ({
                                            date: formatDate(r.date),
                                            sphR: r.sphRight != null ? Number(r.sphRight) : null,
                                            sphL: r.sphLeft != null ? Number(r.sphLeft) : null,
                                        }))}
                                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip
                                            contentStyle={{ fontSize: 11, borderRadius: 8 }}
                                            formatter={(val: unknown) => fmtRefraction(val as number)}
                                        />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                        <Line type="monotone" dataKey="sphR" name="SPH Right" stroke="#0EA5E9" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                                        <Line type="monotone" dataKey="sphL" name="SPH Left" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )
                    )}
                </CardContent>
            </Card>

            <AppointmentDialog
                open={bookingOpen}
                onOpenChange={setBookingOpen}
                patientId={id}
                onSuccess={fetchPatientDetails}
            />
        </div>
    );
}
