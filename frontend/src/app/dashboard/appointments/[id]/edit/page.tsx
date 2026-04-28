'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from 'sonner'
import { ArrowLeft, Calendar, CheckCircle2, FileText, Loader2, MapPin, Stethoscope, User, Clock, ChevronDown } from 'lucide-react'

type Appointment = {
    id: string
    appointmentDate: string
    status: string
    type?: string | null
    location?: string | null
    notes?: string | null
    patientId?: string | null
    doctorId?: string | null
    patient?: { id: string; fullName?: string | null; email?: string | null; phone?: string | null } | null
    doctor?: { id?: string | null; userId?: string | null; user?: { fullName?: string | null; email?: string | null } | null } | null
}

type Patient = { id: string; fullName: string; patientNumber?: string | null; phone?: string | null; email?: string | null }
type Doctor = {
    id: string
    fullName?: string | null
    user?: { fullName?: string | null; email?: string | null } | null
    specialization?: string | null
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
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
]

const HOURS = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'))
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

const GENERATED_TIME_SLOTS = (() => {
    const slots: string[] = []
    const periods = ['AM', 'PM']
    for (const p of periods) {
        for (let h = 1; h <= 12; h++) {
            const hh = h.toString().padStart(2, '0')
            for (let m = 0; m < 60; m += 15) {
                const mm = m.toString().padStart(2, '0')
                slots.push(`${hh}:${mm} ${p}`)
            }
        }
    }
    return slots
})()

function getApiErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') return fallback
    const maybe = error as { response?: { data?: { message?: unknown } } }
    const msg = maybe.response?.data?.message
    return typeof msg === 'string' && msg.trim().length > 0 ? msg : fallback
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
    if (!symptomsLine && !diagnosisLine && !treatmentLine && !freeNotesLine) out.notes = notes
    return out
}

function buildNotes(payload: { symptoms: string[]; diagnosis: string; treatment: string; notes: string }) {
    const parts: string[] = []
    if (payload.symptoms.length) parts.push(`Symptoms: ${payload.symptoms.join(', ')}`)
    if (payload.diagnosis.trim()) parts.push(`Diagnosis: ${payload.diagnosis.trim()}`)
    if (payload.treatment.trim()) parts.push(`Treatment: ${payload.treatment.trim()}`)
    if (payload.notes.trim()) parts.push(`Notes: ${payload.notes.trim()}`)
    return parts.join('\n')
}

function ScrollableColumn({
    options,
    value,
    onChange,
}: {
    options: string[]
    value: string
    onChange: (v: string) => void
}) {
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            const index = options.indexOf(value)
            if (index !== -1) {
                const itemHeight = 40
                scrollRef.current.scrollTop = index * itemHeight
            }
        }
    }, [value, options])

    return (
        <div className="relative h-[200px] w-14">
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-10 bg-slate-100/50 rounded-lg -z-10 pointer-events-none" />
            <div 
                ref={scrollRef}
                className="h-full overflow-y-auto flex flex-col py-20 snap-y snap-mandatory scrollbar-hide relative"
            >
                {options.map((opt) => (
                    <button
                        key={opt}
                        onClick={() => onChange(opt)}
                        className={`flex h-10 w-full shrink-0 items-center justify-center text-base font-bold transition-all snap-center select-none ${
                            value === opt
                                ? 'text-[#0EA5E9] scale-110'
                                : 'text-slate-300 hover:text-slate-400'
                        }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    )
}

function UnifiedTimePicker({
    hour,
    minute,
    period,
    onHourChange,
    onMinuteChange,
    onPeriodChange,
}: {
    hour: string
    minute: string
    period: string
    onHourChange: (v: string) => void
    onMinuteChange: (v: string) => void
    onPeriodChange: (v: string) => void
}) {
    const [tempTime, setTempTime] = useState({ hour, minute, period })
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        if (isOpen) setTempTime({ hour, minute, period })
    }, [isOpen, hour, minute, period])

    const handleOk = () => {
        onHourChange(tempTime.hour)
        onMinuteChange(tempTime.minute)
        onPeriodChange(tempTime.period)
        setIsOpen(false)
    }

    const currentTime = `${hour}:${minute} ${period}`

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className="h-11 w-full justify-between rounded-xl border-slate-200 px-4 text-[15px] font-semibold bg-white hover:bg-slate-50 text-slate-900 shadow-sm"
                >
                    <div className="flex items-center gap-2.5">
                        <Clock className="h-4 w-4 text-[#0EA5E9]" />
                        <span>{currentTime}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-0 rounded-2xl shadow-2xl border-slate-100 bg-white overflow-hidden w-[260px]" align="start">
                <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Time</span>
                    <span className="text-sm font-black text-[#0EA5E9]">{tempTime.hour}:{tempTime.minute} {tempTime.period}</span>
                </div>
                <div className="relative flex items-center justify-center bg-white px-2 py-4">
                    <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
                    
                    <ScrollableColumn options={HOURS} value={tempTime.hour} onChange={(v) => setTempTime(t => ({ ...t, hour: v }))} />
                    <div className="text-2xl font-black text-slate-200 pt-1 mx-1 select-none">:</div>
                    <ScrollableColumn options={MINUTES} value={tempTime.minute} onChange={(v) => setTempTime(t => ({ ...t, minute: v }))} />
                    <div className="w-px h-12 bg-slate-100 mx-3" />
                    <ScrollableColumn options={['AM', 'PM']} value={tempTime.period} onChange={(v) => setTempTime(t => ({ ...t, period: v }))} />
                </div>
                <div className="p-2 border-t border-slate-50 flex gap-2 bg-slate-50/30">
                    <Button variant="ghost" className="flex-1 text-slate-500 font-bold h-9 hover:bg-slate-100 rounded-lg text-xs" onClick={() => setIsOpen(false)}>CANCEL</Button>
                    <Button className="flex-1 bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold h-9 rounded-lg text-xs shadow-md shadow-blue-100" onClick={handleOk}>OK</Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function SymptomTags({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
    const [draft, setDraft] = useState('')
    const add = useCallback((raw: string) => {
        const t = raw.trim()
        if (!t) return
        if (value.some((x) => x.toLowerCase() === t.toLowerCase())) return
        onChange([...value, t])
    }, [onChange, value])

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

export default function EditAppointmentPage() {
    const router = useRouter()
    const params = useParams<{ id: string }>()
    const searchParams = useSearchParams()
    const id = params?.id

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [appt, setAppt] = useState<Appointment | null>(null)

    const [patients, setPatients] = useState<Patient[]>([])
    const [doctors, setDoctors] = useState<Doctor[]>([])
    const [loadingPatients, setLoadingPatients] = useState(true)
    const [loadingDoctors, setLoadingDoctors] = useState(true)

    const [patientId, setPatientId] = useState('')
    const [doctorId, setDoctorId] = useState('')
    const [appointmentType, setAppointmentType] = useState('')
    const [appointmentDate, setAppointmentDate] = useState('')
    const [timeHour, setTimeHour] = useState('09')
    const [timeMinute, setTimeMinute] = useState('00')
    const [timePeriod, setTimePeriod] = useState('AM')
    const [status, setStatus] = useState('SCHEDULED')
    const [location, setLocation] = useState('')
    const [symptoms, setSymptoms] = useState<string[]>([])
    const [diagnosis, setDiagnosis] = useState('')
    const [treatment, setTreatment] = useState('')
    const [freeNotes, setFreeNotes] = useState('')

    useEffect(() => {
        if (!id) return
        let mounted = true
        setLoading(true)
        Promise.all([
            api.get(`/appointments/${id}`),
            api.get('/patients?limit=200'),
            api.get('/doctors?limit=200'),
        ])
            .then(([resA, resP, resD]) => {
                if (!mounted) return
                const body = resA.data as any
                const a: Appointment = body?.data ?? body
                setAppt(a ?? null)

                const patientsBody = resP.data as { data?: Patient[] }
                const doctorsBody = resD.data as { data?: Doctor[] }
                setPatients(Array.isArray(patientsBody.data) ? patientsBody.data : [])
                setDoctors(Array.isArray(doctorsBody.data) ? doctorsBody.data : [])
                setLoadingPatients(false)
                setLoadingDoctors(false)

                const dt = a?.appointmentDate ? new Date(a.appointmentDate) : null
                const dateStr = dt && !Number.isNaN(dt.getTime()) ? dt.toISOString().slice(0, 10) : ''
                
                let h = '09'
                let m = '00'
                let p = 'AM'
                if (dt && !Number.isNaN(dt.getTime())) {
                    let hour = dt.getHours()
                    m = dt.getMinutes().toString().padStart(2, '0')
                    // Round minutes to nearest 5 for the selector
                    const minVal = parseInt(m)
                    const roundedMin = Math.round(minVal / 5) * 5
                    const finalMin = Math.min(roundedMin, 55)
                    m = finalMin.toString().padStart(2, '0')
                    
                    p = hour >= 12 ? 'PM' : 'AM'
                    hour = hour % 12
                    if (hour === 0) hour = 12
                    h = hour.toString().padStart(2, '0')
                }

                setPatientId(a?.patientId || a?.patient?.id || '')
                setDoctorId(a?.doctorId || a?.doctor?.id || a?.doctor?.userId || '')
                setAppointmentType(a?.type || '')
                setAppointmentDate(dateStr)
                setTimeHour(h)
                setTimeMinute(m)
                setTimePeriod(p)
                setStatus(a?.status || 'SCHEDULED')
                setLocation(a?.location || '')

                const parsed = parseAdditionalNotes(a?.notes)
                setSymptoms(parsed.symptoms)
                setDiagnosis(parsed.diagnosis)
                setTreatment(parsed.treatment)
                setFreeNotes(parsed.notes)
            })
            .catch((e) => toast.error(getApiErrorMessage(e, 'Failed to load appointment')))
            .finally(() => { if (mounted) setLoading(false) })
        return () => { mounted = false }
    }, [id])

    const selectedPatient = useMemo(() => patients.find((p) => p.id === patientId), [patients, patientId])
    const selectedDoctor = useMemo(() => doctors.find((d) => d.id === doctorId), [doctors, doctorId])
    const mode = searchParams?.get('mode') || ''

    const displayDoctorName = useMemo(() => {
        const d = selectedDoctor
        return d?.user?.fullName || d?.fullName || 'Unknown'
    }, [selectedDoctor])

    const handleUpdate = async () => {
        if (!id) return
        if (!patientId || !doctorId || !appointmentDate || !appointmentTime || !appointmentType) {
            toast.error('Please complete required fields')
            return
        }
        setSaving(true)
        try {
            // Convert to 24h for API
            let hour = parseInt(timeHour)
            if (timePeriod === 'PM' && hour < 12) hour += 12
            if (timePeriod === 'AM' && hour === 12) hour = 0
            const appointmentTime = `${hour.toString().padStart(2, '0')}:${timeMinute}`

            const dateTime = new Date(`${appointmentDate}T${appointmentTime}:00`)
            await api.put(`/appointments/${id}`, {
                patientId,
                doctorId,
                appointmentDate: dateTime.toISOString(),
                type: appointmentType,
                status,
                location,
                notes: buildNotes({ symptoms, diagnosis, treatment, notes: freeNotes }),
            })
            toast.success('Appointment updated')
            router.push(`/dashboard/appointments/${id}`)
        } catch (e) {
            toast.error(getApiErrorMessage(e, 'Update failed'))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="px-6 pt-6 pb-4 bg-white border-b border-slate-100">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Edit Appointment</h1>
                <p className="text-sm text-slate-500 mt-0.5">Modify appointment</p>
            </div>

            <div className="mx-auto max-w-5xl px-6 py-6 space-y-5">
                <Link
                    href={`/dashboard/appointments/${id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Appointment
                </Link>

                {mode === 'reschedule' && (
                    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-semibold text-orange-700">
                        Reschedule mode: update date & time then save.
                    </div>
                )}

                {loading ? (
                    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-10 flex items-center justify-center gap-2 text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading appointment...
                    </div>
                ) : !appt ? (
                    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-8 text-center text-slate-500 font-medium">
                        Appointment not found.
                    </div>
                ) : (
                    <>
                        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
                            <h3 className="text-sm font-black tracking-tight text-slate-900 mb-4 flex items-center gap-2">
                                <User className="h-4 w-4 text-[#0EA5E9]" />
                                Patient Information
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-800">Patient Name *</Label>
                                    <Select value={patientId} onValueChange={setPatientId} disabled={loadingPatients}>
                                        <SelectTrigger className="h-11 rounded-xl border-slate-200 font-semibold">
                                            <SelectValue placeholder={loadingPatients ? 'Loading...' : 'Select Patient'} />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {patients.map((p) => (
                                                <SelectItem key={p.id} value={p.id} className="cursor-pointer">
                                                    {p.fullName}{p.patientNumber ? ` · ${p.patientNumber}` : ''}{p.phone ? ` · ${p.phone}` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-800">Patient Phone *</Label>
                                        <Input value={selectedPatient?.phone || appt.patient?.phone || ''} readOnly className="h-11 rounded-xl border-slate-200 bg-slate-50" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-800">Patient ID</Label>
                                        <Input value={selectedPatient?.patientNumber || ''} readOnly className="h-11 rounded-xl border-slate-200 bg-slate-50" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
                            <h3 className="text-sm font-black tracking-tight text-slate-900 mb-4 flex items-center gap-2">
                                <Stethoscope className="h-4 w-4 text-[#0EA5E9]" />
                                Doctor Information
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-800">Doctor Name *</Label>
                                    <Select value={doctorId} onValueChange={setDoctorId} disabled={loadingDoctors}>
                                        <SelectTrigger className="h-11 rounded-xl border-slate-200 font-semibold">
                                            <SelectValue placeholder={loadingDoctors ? 'Loading...' : 'Select Doctor'} />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {doctors.map((d) => (
                                                <SelectItem key={d.id} value={d.id} className="cursor-pointer">
                                                Dr. {d.user?.fullName || d.fullName || 'Unknown'}{d.specialization ? ` (${d.specialization})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-800">Doctor Email</Label>
                                <Input value={selectedDoctor?.user?.email || ''} readOnly className="h-11 rounded-xl border-slate-200 bg-slate-50" />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
                            <h3 className="text-sm font-black tracking-tight text-slate-900 mb-4 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-[#0EA5E9]" />
                                Appointment Details
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-800">Date *</Label>
                                    <Input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} className="h-11 rounded-xl border-slate-200" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-800">Time *</Label>
                                    <UnifiedTimePicker
                                        hour={timeHour}
                                        minute={timeMinute}
                                        period={timePeriod}
                                        onHourChange={setTimeHour}
                                        onMinuteChange={setTimeMinute}
                                        onPeriodChange={setTimePeriod}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-800">Type *</Label>
                                    <Select value={appointmentType} onValueChange={setAppointmentType}>
                                        <SelectTrigger className="h-11 rounded-xl border-slate-200 font-semibold">
                                            <SelectValue placeholder="Select Type" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {APPOINTMENT_TYPES.map((t) => (
                                                <SelectItem key={t.value} value={t.value} className="cursor-pointer">
                                                    {t.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-800">Status</Label>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger className="h-11 rounded-xl border-slate-200 font-semibold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {STATUS_OPTIONS.map((s) => (
                                                <SelectItem key={s.value} value={s.value} className="cursor-pointer">
                                                    {s.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 lg:col-span-2">
                                    <Label className="text-sm font-semibold text-slate-800">Location</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input value={location} onChange={(e) => setLocation(e.target.value)} className="h-11 rounded-xl border-slate-200 pl-9" placeholder="Optional location..." />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
                            <h3 className="text-sm font-black tracking-tight text-slate-900 mb-4 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-[#0EA5E9]" />
                                Additional Information
                            </h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-800">Symptoms</Label>
                                    <SymptomTags value={symptoms} onChange={setSymptoms} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-800">Diagnosis</Label>
                                        <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="h-11 rounded-xl border-slate-200" placeholder="Diagnosis..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-800">Treatment</Label>
                                        <Input value={treatment} onChange={(e) => setTreatment(e.target.value)} className="h-11 rounded-xl border-slate-200" placeholder="Treatment..." />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-800">Notes</Label>
                                    <Textarea value={freeNotes} onChange={(e) => setFreeNotes(e.target.value)} className="min-h-[120px] rounded-xl border-slate-200" placeholder="Additional notes..." />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => router.push(`/dashboard/appointments/${id}`)} className="rounded-xl font-semibold text-slate-600">
                                Cancel
                            </Button>
                            <Button onClick={handleUpdate} disabled={saving} className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold rounded-xl px-6">
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Update Appointment
                                    </>
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

