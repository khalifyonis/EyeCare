'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select'
import {
    ArrowLeft,
    CalendarPlus,
    ChevronDown,
    Loader2,
    Search,
    User,
    Calendar,
    Clock,
    FileText,
    CheckCircle2,
    MapPin,
} from 'lucide-react'
import { toast } from 'sonner'

type Patient = {
    id: string
    fullName: string
    patientNumber: string
    phone: string
    email: string
}

type Doctor = {
    id: string
    user: { fullName: string }
    specialization: string
}

const APPOINTMENT_TYPES = [
    { value: 'consultation', label: 'Consultation' },
    { value: 'follow-up', label: 'Follow-up' },
    { value: 'checkup', label: 'Checkup' },
    { value: 'emergency', label: 'Emergency' },
]

const STATUS_OPTIONS = [
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'PENDING', label: 'Pending' },
]

const TIME_SLOTS = (() => {
    const slots: { value: string; label: string }[] = []
    for (let h = 8; h <= 17; h++) {
        for (const m of [0, 30]) {
            if (h === 17 && m === 30) continue
            const hour24 = String(h).padStart(2, '0')
            const min = String(m).padStart(2, '0')
            const period = h >= 12 ? 'PM' : 'AM'
            const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
            slots.push({
                value: `${hour24}:${min}`,
                label: `${hour12}:${min} ${period}`,
            })
        }
    }
    slots.push({ value: '18:00', label: '6:00 PM' })
    return slots
})()

const STEPS = [
    { label: 'Patient Information', icon: User },
    { label: 'Appointment Details', icon: Calendar },
    { label: 'Additional Information', icon: FileText },
    { label: 'Review', icon: CheckCircle2 },
]

function SymptomTags({
    value,
    onChange,
}: {
    value: string[]
    onChange: (v: string[]) => void
}) {
    const [draft, setDraft] = useState('')
    const add = (raw: string) => {
        const t = raw.trim()
        if (!t) return
        if (value.some((x) => x.toLowerCase() === t.toLowerCase())) return
        onChange([...value, t])
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-[#0EA5E9]">
            <div className="flex flex-wrap gap-2">
                {value.map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => onChange(value.filter((x) => x !== t))}
                        className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-bold hover:bg-emerald-100"
                        title="Click to remove"
                    >
                        {t}
                        <span className="ml-2 text-emerald-500">×</span>
                    </button>
                ))}
                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault()
                            add(draft)
                            setDraft('')
                        } else if (e.key === 'Backspace' && !draft && value.length) {
                            onChange(value.slice(0, -1))
                        }
                    }}
                    placeholder="Type a symptom and press Enter..."
                    className="min-w-[180px] flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400 py-1"
                />
            </div>
        </div>
    )
}

function getApiErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') return fallback
    const maybe = error as { response?: { data?: { message?: unknown } } }
    const msg = maybe.response?.data?.message
    return typeof msg === 'string' && msg.trim().length > 0 ? msg : fallback
}

export default function NewAppointmentPage() {
    const router = useRouter()
    const [step, setStep] = useState(0)
    const [submitting, setSubmitting] = useState(false)

    const [patients, setPatients] = useState<Patient[]>([])
    const [doctors, setDoctors] = useState<Doctor[]>([])
    const [loadingPatients, setLoadingPatients] = useState(true)
    const [loadingDoctors, setLoadingDoctors] = useState(true)

    const [patientId, setPatientId] = useState('')
    const [patientSearch, setPatientSearch] = useState('')
    const [patientDropdownOpen, setPatientDropdownOpen] = useState(false)
    const [doctorId, setDoctorId] = useState('')
    const [appointmentType, setAppointmentType] = useState('')
    const [appointmentDate, setAppointmentDate] = useState('')
    const [appointmentTime, setAppointmentTime] = useState('')
    const [status, setStatus] = useState('SCHEDULED')
    const [location, setLocation] = useState('')
    const [manualEmail, setManualEmail] = useState('')
    const [manualPhone, setManualPhone] = useState('')
    const [reason, setReason] = useState('')
    const [symptoms, setSymptoms] = useState<string[]>([])
    const [diagnosis, setDiagnosis] = useState('')
    const [treatment, setTreatment] = useState('')
    const [notes, setNotes] = useState('')
    const patientDropdownRef = useRef<HTMLDivElement | null>(null)

    const buildNotes = useCallback(() => {
        const parts: string[] = []
        if (reason.trim()) parts.push(`Reason: ${reason.trim()}`)
        if (symptoms.length) parts.push(`Symptoms: ${symptoms.join(', ')}`)
        if (diagnosis.trim()) parts.push(`Diagnosis: ${diagnosis.trim()}`)
        if (treatment.trim()) parts.push(`Treatment: ${treatment.trim()}`)
        if (notes.trim()) parts.push(`Notes: ${notes.trim()}`)
        return parts.join('\n')
    }, [diagnosis, notes, reason, symptoms, treatment])

    const fetchPatients = useCallback(async () => {
        setLoadingPatients(true)
        try {
            const res = await api.get('/patients?limit=100')
            const body = res.data as { data?: Patient[] }
            setPatients(Array.isArray(body.data) ? body.data : [])
        } catch {
            toast.error('Failed to load patients')
        } finally {
            setLoadingPatients(false)
        }
    }, [])

    const fetchDoctors = useCallback(async () => {
        setLoadingDoctors(true)
        try {
            const res = await api.get('/doctors?limit=100')
            const body = res.data as { data?: Doctor[] }
            setDoctors(Array.isArray(body.data) ? body.data : [])
        } catch {
            toast.error('Failed to load doctors')
        } finally {
            setLoadingDoctors(false)
        }
    }, [])

    useEffect(() => {
        fetchPatients()
        fetchDoctors()
    }, [fetchPatients, fetchDoctors])

    const selectedPatient = patients.find((p) => p.id === patientId)
    const selectedDoctor = doctors.find((d) => d.id === doctorId)

    useEffect(() => {
        if (selectedPatient) {
            setManualEmail(selectedPatient.email || '')
            setManualPhone(selectedPatient.phone || '')
        }
    }, [selectedPatient])

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (
                patientDropdownRef.current &&
                !patientDropdownRef.current.contains(event.target as Node)
            ) {
                setPatientDropdownOpen(false)
            }
        }

        document.addEventListener('mousedown', handlePointerDown)
        return () => document.removeEventListener('mousedown', handlePointerDown)
    }, [])

    const filteredPatients = patients.filter((p) => {
        const q = patientSearch.trim().toLowerCase()
        if (!q) return false
        return (
            p.fullName.toLowerCase().includes(q) ||
            p.patientNumber.toLowerCase().includes(q) ||
            (p.phone && p.phone.toLowerCase().includes(q))
        )
    })

    const canProceedStep = (s: number): boolean => {
        switch (s) {
            case 0:
                return !!patientId
            case 1:
                return !!doctorId && !!appointmentType && !!appointmentDate && !!appointmentTime
            case 2:
                return !!reason.trim()
            default:
                return true
        }
    }

    const handleNext = () => {
        if (!canProceedStep(step)) {
            toast.error('Please fill in all required fields before continuing.')
            return
        }
        setStep((s) => Math.min(s + 1, 3))
    }

    const handlePrev = () => setStep((s) => Math.max(s - 1, 0))

    const handleSubmit = async () => {
        if (!canProceedStep(0) || !canProceedStep(1) || !canProceedStep(2)) {
            toast.error('Please complete all required fields.')
            return
        }

        setSubmitting(true)
        try {
            const dateTime = new Date(`${appointmentDate}T${appointmentTime}:00`)
            await api.post('/appointments', {
                patientId,
                doctorId,
                appointmentDate: dateTime.toISOString(),
                type: appointmentType,
                notes: buildNotes(),
                location,
                status,
                amount: 0,
            })
            toast.success('Appointment scheduled successfully!')
            router.push('/dashboard/appointments')
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to create appointment'))
        } finally {
            setSubmitting(false)
        }
    }

    const completedSteps = new Set<number>()
    for (let i = 0; i < step; i++) {
        if (canProceedStep(i)) completedSteps.add(i)
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/dashboard/appointments"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-4"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                            <CalendarPlus className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-slate-900">
                                New Appointment
                            </h1>
                            <p className="text-sm text-slate-500">
                                Create a new appointment for a patient
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stepper */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        {STEPS.map((s, i) => (
                            <div key={s.label} className="flex items-center flex-1 last:flex-none">
                                <button
                                    type="button"
                                    onClick={() => setStep(i)}
                                    className="flex flex-col items-center gap-2 group"
                                >
                                    <div
                                        className={`flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                                            completedSteps.has(i)
                                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                                : i === step
                                                  ? 'border-[#0EA5E9] bg-[#0EA5E9] text-white shadow-lg shadow-sky-500/25'
                                                  : 'border-slate-200 bg-white text-slate-500 group-hover:border-slate-300'
                                        }`}
                                    >
                                        {completedSteps.has(i) ? (
                                            <CheckCircle2 className="h-7 w-7" />
                                        ) : (
                                            <s.icon className="h-7 w-7" />
                                        )}
                                    </div>
                                    <span
                                        className={`text-sm font-semibold transition-colors ${
                                            completedSteps.has(i)
                                                ? 'text-emerald-600'
                                                : i === step
                                                  ? 'text-[#0EA5E9]'
                                                  : 'text-slate-600'
                                        }`}
                                    >
                                        {s.label}
                                    </span>
                                </button>
                                {i < STEPS.length - 1 && (
                                    <div
                                        className={`flex-1 h-1 mx-3 mt-[-30px] rounded-full transition-colors ${
                                            completedSteps.has(i) ? 'bg-emerald-400' : 'bg-slate-200/80'
                                        }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step Tabs (Vercel-like) */}
                <div className="mb-6 flex flex-wrap items-center gap-7 border-b border-slate-200 pb-3">
                    {STEPS.map((s, i) => {
                        const Icon = s.icon
                        const active = i === step
                        return (
                            <button
                                key={s.label}
                                type="button"
                                onClick={() => setStep(i)}
                                className={`inline-flex items-center gap-2 text-[15px] font-semibold transition-colors ${
                                    active ? 'text-[#0EA5E9]' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Icon className={`h-[18px] w-[18px] ${active ? 'text-[#0EA5E9]' : 'text-slate-500'}`} />
                                <span className={active ? 'border-b-2 border-[#0EA5E9] pb-3 -mb-3' : ''}>
                                    {s.label}
                                </span>
                            </button>
                        )
                    })}
                </div>

                {/* Card */}
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div className="p-6 sm:p-8">
                        {/* Step 1 */}
                        {step === 0 && (
                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                            <User className="h-4 w-4" />
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-900">
                                            Patient Information
                                        </h2>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-800">
                                        Select Patient <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="relative" ref={patientDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() => setPatientDropdownOpen((prev) => !prev)}
                                            className="flex h-11 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-left text-[15px] transition-colors hover:border-slate-300"
                                        >
                                            <span
                                                className={`inline-flex min-w-0 items-center gap-2 ${
                                                    selectedPatient ? 'text-slate-900' : 'text-slate-400'
                                                }`}
                                            >
                                                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                                                <span className="truncate">
                                                    {selectedPatient
                                                        ? `${selectedPatient.fullName} (${selectedPatient.patientNumber})`
                                                        : 'Search and select a patient...'}
                                                </span>
                                            </span>
                                            <ChevronDown
                                                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                                                    patientDropdownOpen ? 'rotate-180' : ''
                                                }`}
                                            />
                                        </button>

                                        {patientDropdownOpen && (
                                            <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                                                <div className="border-b border-slate-100 p-2">
                                                    <div className="relative">
                                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                        <Input
                                                            autoFocus
                                                            placeholder="Search by name, ID, or phone..."
                                                            value={patientSearch}
                                                            onChange={(e) => setPatientSearch(e.target.value)}
                                                            className="h-10 rounded-lg border-slate-200 pl-9"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="max-h-72 overflow-y-auto p-2">
                                                    {loadingPatients ? (
                                                        <div className="flex items-center gap-2 rounded-lg px-3 py-4 text-sm text-slate-500">
                                                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                                            Loading patients...
                                                        </div>
                                                    ) : !patientSearch.trim() ? (
                                                        <p className="px-3 py-4 text-sm text-slate-500">
                                                            Type to search for a patient.
                                                        </p>
                                                    ) : filteredPatients.length === 0 ? (
                                                        <p className="px-3 py-4 text-sm text-slate-500">
                                                            No patients found.
                                                        </p>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            {filteredPatients.map((p) => (
                                                                <button
                                                                    key={p.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setPatientId(p.id)
                                                                        setPatientDropdownOpen(false)
                                                                        setPatientSearch('')
                                                                    }}
                                                                    className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                                                                        patientId === p.id
                                                                            ? 'border-blue-300 bg-blue-50'
                                                                            : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                                                                    }`}
                                                                >
                                                                    <p className="truncate text-sm font-semibold text-slate-900">
                                                                        {p.fullName}
                                                                    </p>
                                                                    <p className="truncate text-xs text-slate-500">
                                                                        {p.patientNumber}
                                                                        {p.phone ? ` · ${p.phone}` : ''}
                                                                    </p>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-slate-200 pt-5">
                                    <h3 className="text-left text-[31px] font-bold text-slate-900">
                                        Manual Entry <span className="text-slate-500 font-medium">(or)</span>
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-800">
                                            Patient Email <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            placeholder="Enter patient's email address"
                                            value={manualEmail}
                                            onChange={(e) => setManualEmail(e.target.value)}
                                            className="h-11 text-[15px] rounded-lg border-slate-200"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-800">
                                            Patient Phone <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            placeholder="Enter patient's phone number"
                                            value={manualPhone}
                                            onChange={(e) => setManualPhone(e.target.value)}
                                            className="h-11 text-[15px] rounded-lg border-slate-200"
                                        />
                                    </div>
                                </div>

                                {selectedPatient && (
                                    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-5 mt-4">
                                        <h3 className="text-sm font-bold text-slate-800 mb-3">
                                            Selected Patient
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div>
                                                <p className="text-xs text-slate-500">Full Name</p>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {selectedPatient.fullName}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Email</p>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {selectedPatient.email || '—'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Phone</p>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {selectedPatient.phone || '—'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 2 */}
                        {step === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                            <Calendar className="h-4 w-4" />
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-900">
                                            Appointment Details
                                        </h2>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-800">
                                            Doctor <span className="text-red-500">*</span>
                                        </Label>
                                        {loadingDoctors ? (
                                            <div className="flex items-center gap-2 h-11 px-3 rounded-lg border border-slate-200 bg-slate-50">
                                                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                                <span className="text-sm text-slate-400">Loading...</span>
                                            </div>
                                        ) : (
                                            <Select value={doctorId} onValueChange={setDoctorId}>
                                                <SelectTrigger className="h-11 text-[15px] rounded-lg border-slate-200">
                                                    <SelectValue placeholder="Select a doctor" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {doctors.map((d) => (
                                                        <SelectItem key={d.id} value={d.id}>
                                                            {d.user?.fullName || 'Unknown'}{' '}
                                                            {d.specialization ? `— ${d.specialization}` : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-800">
                                            Appointment Type <span className="text-red-500">*</span>
                                        </Label>
                                        <Select value={appointmentType} onValueChange={setAppointmentType}>
                                            <SelectTrigger className="h-11 text-[15px] rounded-lg border-slate-200">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {APPOINTMENT_TYPES.map((t) => (
                                                    <SelectItem key={t.value} value={t.value}>
                                                        {t.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-800">
                                            Appointment Date <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            type="date"
                                            value={appointmentDate}
                                            onChange={(e) => setAppointmentDate(e.target.value)}
                                            className="h-11 text-[15px] rounded-lg border-slate-200"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-800">
                                            Appointment Time <span className="text-red-500">*</span>
                                        </Label>
                                        <Select value={appointmentTime} onValueChange={setAppointmentTime}>
                                            <SelectTrigger className="h-11 text-[15px] rounded-lg border-slate-200">
                                                <SelectValue placeholder="Select time slot" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TIME_SLOTS.map((t) => (
                                                    <SelectItem key={t.value} value={t.value}>
                                                        {t.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-800">
                                            Status
                                        </Label>
                                        <Select value={status} onValueChange={setStatus}>
                                            <SelectTrigger className="h-11 text-[15px] rounded-lg border-slate-200">
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {STATUS_OPTIONS.map((s) => (
                                                    <SelectItem key={s.value} value={s.value}>
                                                        {s.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-800">
                                            Location
                                        </Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                            <Input
                                                placeholder="e.g., Room 101, Building A"
                                                value={location}
                                                onChange={(e) => setLocation(e.target.value)}
                                                className="h-11 pl-10 text-[15px] rounded-lg border-slate-200"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3 */}
                        {step === 2 && (
                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-900">Additional Information</h2>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-800">
                                        Reason for Visit <span className="text-red-500">*</span>
                                    </Label>
                                    <Textarea
                                        placeholder="Describe the reason for the appointment"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        rows={5}
                                        className="text-base rounded-lg border-slate-200 resize-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-800">
                                        Notes <span className="text-slate-400 font-normal">(optional)</span>
                                    </Label>
                                    <Textarea
                                        placeholder="Add any additional notes or comments"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={5}
                                        className="text-base rounded-lg border-slate-200 resize-none"
                                    />
                                </div>

                                <div className="pt-2 border-t border-slate-200 space-y-4">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Clinical (optional)
                                    </p>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-800">Symptoms</Label>
                                        <SymptomTags value={symptoms} onChange={setSymptoms} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-800">Diagnosis</Label>
                                        <Input
                                            placeholder="Diagnosis"
                                            value={diagnosis}
                                            onChange={(e) => setDiagnosis(e.target.value)}
                                            className="h-12 text-base rounded-lg border-slate-200"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-800">Treatment</Label>
                                        <Textarea
                                            placeholder="Treatment plan"
                                            value={treatment}
                                            onChange={(e) => setTreatment(e.target.value)}
                                            rows={4}
                                            className="text-base rounded-lg border-slate-200 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4 */}
                        {step === 3 && (
                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-900">Review</h2>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-5">
                                            <div className="flex items-center gap-2 text-slate-900">
                                                <User className="h-4 w-4 text-[#0EA5E9]" />
                                                <h3 className="text-sm font-bold">Patient Information</h3>
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-28 text-slate-500">Name:</span>
                                                    <span className="font-medium text-slate-900">{selectedPatient?.fullName || 'Not provided'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-28 text-slate-500">Email:</span>
                                                    <span className="font-medium text-slate-900">{manualEmail || selectedPatient?.email || 'Not provided'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-28 text-slate-500">Phone:</span>
                                                    <span className="font-medium text-slate-900">{manualPhone || selectedPatient?.phone || 'Not provided'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-5">
                                            <div className="flex items-center gap-2 text-slate-900">
                                                <Calendar className="h-4 w-4 text-[#0EA5E9]" />
                                                <h3 className="text-sm font-bold">Appointment Details</h3>
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-28 text-slate-500">Doctor:</span>
                                                    <span className="font-medium text-slate-900">{selectedDoctor?.user?.fullName || 'Not provided'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-28 text-slate-500">Type:</span>
                                                    <span className="font-medium text-slate-900">{APPOINTMENT_TYPES.find((t) => t.value === appointmentType)?.label || 'Not provided'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-28 text-slate-500">Date:</span>
                                                    <span className="font-medium text-slate-900">{appointmentDate || 'Not selected'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-28 text-slate-500">Time:</span>
                                                    <span className="font-medium text-slate-900">{TIME_SLOTS.find((t) => t.value === appointmentTime)?.label || 'Not selected'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-28 text-slate-500">Status:</span>
                                                    <span className="font-medium text-slate-900">{STATUS_OPTIONS.find((s) => s.value === status)?.label || 'Scheduled'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 border-t border-slate-100 pt-6">
                                        <div className="flex items-center gap-2 text-slate-900">
                                            <FileText className="h-4 w-4 text-[#0EA5E9]" />
                                            <h3 className="text-sm font-bold">Additional Information</h3>
                                        </div>
                                        <div className="mt-3 space-y-3 text-sm">
                                            <div>
                                                <p className="text-slate-500">Reason for Visit:</p>
                                                <p className="font-medium text-slate-900 whitespace-pre-wrap">{reason || 'Not provided'}</p>
                                            </div>
                                            {notes && (
                                                <div>
                                                    <p className="text-slate-500">Notes:</p>
                                                    <p className="font-medium text-slate-900 whitespace-pre-wrap">{notes}</p>
                                                </div>
                                            )}
                                            {(symptoms.length > 0 || diagnosis || treatment) && (
                                                <div className="pt-3 border-t border-slate-100">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Clinical (optional)</p>
                                                    {symptoms.length > 0 && (
                                                        <div className="mb-2">
                                                            <p className="text-slate-500">Symptoms:</p>
                                                            <div className="flex flex-wrap gap-2 mt-1">
                                                                {symptoms.map((s) => (
                                                                    <span key={s} className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-bold">
                                                                        {s}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {diagnosis && (
                                                        <div className="mb-2">
                                                            <p className="text-slate-500">Diagnosis:</p>
                                                            <p className="font-medium text-slate-900 whitespace-pre-wrap">{diagnosis}</p>
                                                        </div>
                                                    )}
                                                    {treatment && (
                                                        <div>
                                                            <p className="text-slate-500">Treatment:</p>
                                                            <p className="font-medium text-slate-900 whitespace-pre-wrap">{treatment}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-slate-100 px-6 py-5 sm:px-8">
                        <div>
                            {step > 0 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handlePrev}
                                    className="h-11 rounded-lg border-slate-200 text-slate-700 font-semibold px-6"
                                >
                                    Previous
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push('/dashboard/appointments')}
                                className="h-11 rounded-lg border-slate-200 text-slate-700 font-semibold px-6"
                            >
                                Cancel
                            </Button>
                            {step < 3 ? (
                                <Button
                                    type="button"
                                    onClick={handleNext}
                                    className="h-11 rounded-lg bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold px-7"
                                >
                                    Next
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="h-11 rounded-lg bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold px-7"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <CalendarPlus className="mr-2 h-4 w-4" />
                                            Create Appointment
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
