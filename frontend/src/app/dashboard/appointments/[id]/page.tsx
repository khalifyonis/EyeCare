'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
    ArrowLeft,
    Calendar,
    Clock,
    FileText,
    MapPin,
    Pencil,
    Stethoscope,
    User,
    Hash,
} from 'lucide-react'

type Appointment = {
    id: string
    appointmentDate: string
    status: string
    type?: string | null
    location?: string | null
    notes?: string | null
    patient?: { id: string; fullName?: string | null; email?: string | null; phone?: string | null } | null
    doctor?: { id?: string | null; user?: { fullName?: string | null; email?: string | null } | null } | null
}

function getApiErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') return fallback
    const maybe = error as { response?: { data?: { message?: unknown } } }
    const msg = maybe.response?.data?.message
    return typeof msg === 'string' && msg.trim().length > 0 ? msg : fallback
}

function formatDate(iso?: string | null) {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(d)
}

function formatTime(iso?: string | null) {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(d)
}

const STATUS_STYLES: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    SCHEDULED: 'bg-slate-100 text-slate-700 border-slate-200',
    CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    COMPLETED: 'bg-blue-50 text-blue-700 border-blue-200',
    CANCELLED: 'bg-red-50 text-red-700 border-red-200',
}

function parseAdditionalNotes(notes: string | null | undefined) {
    const out = { symptoms: [] as string[], diagnosis: '', treatment: '', notes: '' }
    if (!notes) return out
    const lines = notes.split('\n')
    const getLine = (prefix: string) => lines.find((l) => l.toLowerCase().startsWith(prefix.toLowerCase() + ':'))
    const symptomsLine = getLine('symptoms')
    const diagnosisLine = getLine('diagnosis')
    const treatmentLine = getLine('treatment')
    const freeNotesLine = getLine('notes')

    if (symptomsLine) {
        const raw = symptomsLine.split(':').slice(1).join(':').trim()
        out.symptoms = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : []
    }
    if (diagnosisLine) out.diagnosis = diagnosisLine.split(':').slice(1).join(':').trim()
    if (treatmentLine) out.treatment = treatmentLine.split(':').slice(1).join(':').trim()
    if (freeNotesLine) out.notes = freeNotesLine.split(':').slice(1).join(':').trim()

    if (!symptomsLine && !diagnosisLine && !treatmentLine && !freeNotesLine) {
        out.notes = notes
    }
    return out
}

function InfoCell({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ElementType
    label: string
    value: React.ReactNode
}) {
    return (
        <div className="flex items-start gap-3 py-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-slate-500">{label}</p>
                <div className="text-sm font-medium text-slate-900 break-words">{value}</div>
            </div>
        </div>
    )
}

export default function AppointmentDetailsPage() {
    const router = useRouter()
    const params = useParams<{ id: string }>()
    const id = params?.id

    const [loading, setLoading] = useState(true)
    const [appt, setAppt] = useState<Appointment | null>(null)

    useEffect(() => {
        if (!id) return
        let mounted = true
        setLoading(true)
        api.get(`/appointments/${id}`)
            .then((res) => {
                const body = res.data as { data?: Appointment } | Appointment
                const a = (body as any)?.data ?? body
                if (mounted) setAppt(a ?? null)
            })
            .catch((e) => toast.error(getApiErrorMessage(e, 'Failed to load appointment')))
            .finally(() => { if (mounted) setLoading(false) })
        return () => { mounted = false }
    }, [id])

    const patientName = appt?.patient?.fullName || 'Unknown Patient'
    const doctorName = appt?.doctor?.user?.fullName || 'Unassigned'
    const parsed = useMemo(() => parseAdditionalNotes(appt?.notes), [appt?.notes])

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="px-6 pt-6 pb-4 bg-white border-b border-slate-100">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Appointment Details</h1>
                <p className="text-sm text-slate-500 mt-0.5">View and manage appointment information</p>
            </div>

            <div className="mx-auto max-w-6xl px-6 py-6 space-y-5">
                <Link
                    href="/dashboard/appointments"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Appointments
                </Link>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-slate-500">Appointment</p>
                        <h2 className="text-xl font-black tracking-tight text-slate-900">{patientName}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => router.push(`/dashboard/appointments/${id}/edit`)}
                            className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold gap-1.5"
                        >
                            <Pencil className="h-4 w-4" />
                            Edit Appointment
                        </Button>
                        <Button
                            onClick={() => router.push(`/dashboard/appointments/${id}/edit?mode=reschedule`)}
                            className="bg-[#F97316] hover:bg-[#ea6a12] text-white font-semibold gap-1.5"
                        >
                            <Calendar className="h-4 w-4" />
                            Reschedule
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
                        <div className="h-5 w-44 bg-slate-100 rounded animate-pulse" />
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="h-[84px] rounded-xl border border-slate-100 bg-white">
                                    <div className="h-full w-full bg-slate-50/70 animate-pulse rounded-xl" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : !appt ? (
                    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-8 text-center text-slate-500 font-medium">
                        Appointment not found.
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
                            <h3 className="text-sm font-bold text-slate-900 mb-2">Appointment Details</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                                <div className="sm:pr-6 divide-y divide-slate-100">
                                    <InfoCell icon={User} label="Patient Name" value={patientName} />
                                    <InfoCell icon={Hash} label="Patient ID" value={appt.patient?.id ? appt.patient.id.slice(0, 8) : '—'} />
                                    <InfoCell icon={Stethoscope} label="Doctor" value={`Dr. ${doctorName}`} />
                                    <InfoCell icon={Calendar} label="Date" value={formatDate(appt.appointmentDate)} />
                                </div>
                                <div className="sm:pl-6 divide-y divide-slate-100">
                                    <InfoCell icon={FileText} label="Type" value={appt.type || '—'} />
                                    <InfoCell
                                        icon={Clock}
                                        label="Status"
                                        value={
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[(appt.status || '').toUpperCase()] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                                {appt.status}
                                            </span>
                                        }
                                    />
                                    <InfoCell icon={MapPin} label="Location" value={appt.location || 'Not specified'} />
                                    <InfoCell icon={Clock} label="Time" value={formatTime(appt.appointmentDate)} />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
                            <h3 className="text-sm font-bold text-slate-900 mb-2">Patient Information</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                                <div className="sm:pr-6">
                                    <InfoCell icon={FileText} label="Email" value={appt.patient?.email || '—'} />
                                </div>
                                <div className="sm:pl-6">
                                    <InfoCell icon={PhoneIcon} label="Phone" value={appt.patient?.phone || '—'} />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
                            <h3 className="text-sm font-black tracking-tight text-slate-900 mb-4">Symptoms</h3>
                            {parsed.symptoms.length ? (
                                <div className="flex flex-wrap gap-2">
                                    {parsed.symptoms.map((s) => (
                                        <span key={s} className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-bold">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 font-medium">—</p>
                            )}
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
                            <h3 className="text-sm font-black tracking-tight text-slate-900 mb-4">Diagnosis & Treatment</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <InfoCell icon={FileText} label="Diagnosis" value={parsed.diagnosis || '—'} />
                                <InfoCell icon={FileText} label="Treatment" value={parsed.treatment || '—'} />
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
                            <h3 className="text-sm font-black tracking-tight text-slate-900 mb-2">Notes</h3>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{parsed.notes || appt.notes || '—'}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function PhoneIcon(props: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={props.className ?? 'h-4 w-4'}>
            <path
                d="M5.5 3.5h3l1.5 4-2 1.5c1 2.5 3.5 5 6 6l1.5-2 4 1.5v3c0 1.1-.9 2-2 2C11 20 4 13 4 5.5c0-1.1.9-2 2-2Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

