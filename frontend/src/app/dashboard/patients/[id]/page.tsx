'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, CalendarPlus, Phone, Mail, MapPin, Activity, Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import { toast } from 'sonner';
import { AppointmentDialog } from './appointment-dialog';

export default function PatientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [patient, setPatient] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [bookingOpen, setBookingOpen] = useState(false);

    const fetchPatientDetails = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/patients/${id}`);
            setPatient(res.data);
        } catch (error: any) {
            toast.error('Failed to load patient details');
            router.push('/dashboard/patients');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchPatientDetails();
    }, [id]);

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(new Date(dateString));
    };

    const formatTime = (dateString: string) => {
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

    const initials = `${patient.firstName?.charAt(0) || ''}${patient.lastName?.charAt(0) || ''}`;

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
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Patient Profile</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">ID: {patient.patientId}</span>
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
                                {patient.firstName} {patient.lastName}
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
                            Clinical History
                        </CardTitle>
                        <CardDescription>Recent appointments and clinical visits</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {(!patient.appointments || patient.appointments.length === 0) ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                <div className="size-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
                                    <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                </div>
                                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No appointments found</p>
                                <p className="text-xs text-slate-500 mt-1">Schedule an appointment to start tracking history.</p>
                            </div>
                        ) : (
                            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
                                {patient.appointments.map((apt: any) => (
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
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${apt.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                                                    apt.status === 'CANCELLED' ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' :
                                                        'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                                    }`}>
                                                    {apt.status}
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
                                                    {apt.amount ? parseFloat(apt.amount).toFixed(2) : '0.00'}
                                                </div>
                                            </div>
                                            {/* Action button inside card */}
                                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-xs font-black uppercase tracking-widest text-[#0EA5E9] bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 transition-all rounded-lg px-4 border border-blue-100 dark:border-blue-900/50 active:scale-95 shadow-sm"
                                                >
                                                    View Case
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <AppointmentDialog
                open={bookingOpen}
                onOpenChange={setBookingOpen}
                patientId={id}
                onSuccess={fetchPatientDetails}
            />
        </div>
    );
}
