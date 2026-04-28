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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
    Plus,
} from 'lucide-react'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { toast } from 'sonner'

type Patient = {
    id: string
    fullName?: string | null
    patientNumber?: string | null
    phone?: string | null
    email?: string | null
}

type Doctor = {
    id: string
    doctorId?: string
    fullName?: string | null
    user?: { fullName?: string | null } | null
    specialization?: string | null
}

function getDoctorName(doctor?: Doctor | null): string {
    if (!doctor) return 'Unknown'
    return doctor.fullName || doctor.user?.fullName || 'Unknown'
}

function getDoctorRecordId(doctor?: Doctor | null): string {
    if (!doctor) return ''
    return doctor.doctorId || doctor.id
}

function getApiErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') return fallback
    const maybe = error as { response?: { data?: { message?: unknown } } }
    const msg = maybe.response?.data?.message
    return typeof msg === 'string' && msg.trim().length > 0 ? msg : fallback
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

const STEPS = [
    { label: 'Patient Information', icon: User },
    { label: 'Appointment Details', icon: Calendar },
    { label: 'Additional Information', icon: FileText },
    { label: 'Review', icon: CheckCircle2 },
]

const SOMALIA_STATES = [
    'Banaadir', 'Galmudug', 'Hirshabelle', 'Jubaland', 'Puntland', 'South West State', 'Somaliland',
]

const SOMALIA_CITIES = [
    'Mogadishu', 'Hargeisa', 'Bosaso', 'Galkayo', 'Borama', 'Merca', 'Jamame', 'Kismayo', 'Baidoa',
    'Jowhar', 'Las Anod', 'Dhusamareb', 'Beledweyne', 'Garowe', 'Berbera',
].sort()

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

    // Ensure the selected item is centered on mount or value change
    useEffect(() => {
        if (scrollRef.current) {
            const index = options.indexOf(value)
            if (index !== -1) {
                const itemHeight = 40 // flex h-10
                scrollRef.current.scrollTop = index * itemHeight
            }
        }
    }, [value, options])

    return (
        <div className="relative h-[200px] w-14">
            {/* Center Highlight Bar (Shared across columns usually, but here per column for simplicity) */}
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-10 bg-slate-100/50 rounded-lg -z-10 pointer-events-none" />
            
            <div 
                ref={scrollRef}
                className="h-full overflow-y-auto flex flex-col py-20 snap-y snap-mandatory scrollbar-hide relative"
                onScroll={(e) => {
                    // This could be used for real-time value updates if needed, 
                    // but we'll stick to button clicks or 'OK' confirmation for stability.
                }}
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

    // Sync temp state when opening
    useEffect(() => {
        if (isOpen) {
            setTempTime({ hour, minute, period })
        }
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
                    className="h-11 w-full justify-between rounded-xl border-slate-200 px-4 text-[15px] font-semibold bg-white hover:bg-slate-50 text-slate-900 shadow-sm transition-all"
                >
                    <div className="flex items-center gap-2.5">
                        <Clock className="h-4 w-4 text-[#0EA5E9]" />
                        <span>{currentTime}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-0 rounded-2xl shadow-2xl border-slate-100 bg-white overflow-hidden w-[260px]" align="start">
                {/* Header/Indicator Row */}
                <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Time</span>
                    <span className="text-sm font-black text-[#0EA5E9]">{tempTime.hour}:{tempTime.minute} {tempTime.period}</span>
                </div>

                {/* The Wheel */}
                <div className="relative flex items-center justify-center bg-white px-2 py-4">
                    {/* Visual Fading Gradients */}
                    <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
                    
                    <ScrollableColumn 
                        options={HOURS} 
                        value={tempTime.hour} 
                        onChange={(v) => setTempTime(t => ({ ...t, hour: v }))} 
                    />
                    <div className="text-2xl font-black text-slate-200 pt-1 mx-1 select-none">:</div>
                    <ScrollableColumn 
                        options={MINUTES} 
                        value={tempTime.minute} 
                        onChange={(v) => setTempTime(t => ({ ...t, minute: v }))} 
                    />
                    <div className="w-px h-12 bg-slate-100 mx-3" />
                    <ScrollableColumn 
                        options={['AM', 'PM']} 
                        value={tempTime.period} 
                        onChange={(v) => setTempTime(t => ({ ...t, period: v }))} 
                    />
                </div>

                {/* Actions */}
                <div className="p-2 border-t border-slate-50 flex gap-2 bg-slate-50/30">
                    <Button 
                        variant="ghost" 
                        className="flex-1 text-slate-500 font-bold h-9 hover:bg-slate-100 rounded-lg text-xs"
                        onClick={() => setIsOpen(false)}
                    >
                        CANCEL
                    </Button>
                    <Button 
                        className="flex-1 bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold h-9 rounded-lg text-xs shadow-md shadow-blue-100"
                        onClick={handleOk}
                    >
                        OK
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

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

function QuickAddPatientForm({
    onSuccess,
    onCancel,
}: {
    onSuccess: (p: Patient) => void
    onCancel: () => void
}) {
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        gender: 'MALE',
        dateOfBirth: '',
        address: '',
        city: '',
        state: '',
    })

    const handleSave = async () => {
        if (!form.firstName || !form.lastName || !form.phone || !form.dateOfBirth) {
            toast.error('Please fill in all required fields')
            return
        }
        setSaving(true)
        try {
            const fullName = `${form.firstName} ${form.lastName}`.trim()
            const res = await api.post('/patients', {
                ...form,
                fullName,
            })
            toast.success('Patient created successfully')
            onSuccess(res.data)
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Failed to create patient'))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-4 py-4 overflow-y-auto max-h-[calc(100vh-140px)] px-1 scrollbar-hide">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Name *</Label>
                    <Input
                        className="h-9 text-sm"
                        placeholder="First Name"
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name *</Label>
                    <Input
                        className="h-9 text-sm"
                        placeholder="Last Name"
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone *</Label>
                    <Input
                        className="h-9 text-sm"
                        placeholder="Phone"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gender *</Label>
                    <Select
                        value={form.gender}
                        onValueChange={(v) => setForm({ ...form, gender: v })}
                    >
                        <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="MALE">Male</SelectItem>
                            <SelectItem value="FEMALE">Female</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date of Birth *</Label>
                    <Input
                        className="h-9 text-sm"
                        type="date"
                        value={form.dateOfBirth}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</Label>
                    <Input
                        className="h-9 text-sm"
                        type="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Address</Label>
                <Input
                    className="h-9 text-sm"
                    placeholder="Physical Address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">City</Label>
                    <Select
                        value={form.city}
                        onValueChange={(v) => setForm({ ...form, city: v })}
                    >
                        <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="City" />
                        </SelectTrigger>
                        <SelectContent>
                            {SOMALIA_CITIES.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">State</Label>
                    <Select
                        value={form.state}
                        onValueChange={(v) => setForm({ ...form, state: v })}
                    >
                        <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="State" />
                        </SelectTrigger>
                        <SelectContent>
                            {SOMALIA_STATES.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex gap-3 pt-6 sticky bottom-0 bg-white border-t mt-4 pb-2">
                <Button variant="outline" className="flex-1 rounded-xl font-bold" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    className="flex-1 bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold rounded-xl"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Patient'}
                </Button>
            </div>
        </div>
    )
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
    const [timeHour, setTimeHour] = useState('09')
    const [timeMinute, setTimeMinute] = useState('00')
    const [timePeriod, setTimePeriod] = useState('AM')
    const [status, setStatus] = useState('SCHEDULED')
    const [location, setLocation] = useState('')
    const [reason, setReason] = useState('')
    const [symptoms, setSymptoms] = useState<string[]>([])
    const [diagnosis, setDiagnosis] = useState('')
    const [treatment, setTreatment] = useState('')
    const [notes, setNotes] = useState('')
    const [quickAddOpen, setQuickAddOpen] = useState(false)
    const patientDropdownRef = useRef<HTMLDivElement | null>(null)

    // Today's date string for min attribute on date picker
    const todayStr = new Date().toISOString().split('T')[0]

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
            const body = res.data as { data?: Doctor[] } | Doctor[]
            const rows = Array.isArray(body)
                ? body
                : Array.isArray((body as { data?: Doctor[] }).data)
                    ? (body as { data?: Doctor[] }).data!
                    : []
            setDoctors(rows)
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
    const selectedDoctor = doctors.find((d) => getDoctorRecordId(d) === doctorId)

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
        if (!q) return true
        const fullName = String(p.fullName || '').toLowerCase()
        const patientNumber = String(p.patientNumber || '').toLowerCase()
        const phone = String(p.phone || '').toLowerCase()
        return (
            fullName.includes(q) ||
            patientNumber.includes(q) ||
            phone.includes(q)
        )
    })

    const isDateInPast = (dateStr: string): boolean => {
        if (!dateStr) return false
        const selected = new Date(dateStr + 'T00:00:00')
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return selected < today
    }

    const canProceedStep = (s: number): boolean => {
        switch (s) {
            case 0:
                return !!patientId
            case 1:
                return !!doctorId && !!appointmentType && !!appointmentDate && !!timeHour && !!timeMinute && !!timePeriod && !isDateInPast(appointmentDate)
            case 2:
                return !!reason.trim()
            default:
                return true
        }
    }

    const handleNext = () => {
        if (step === 1 && isDateInPast(appointmentDate)) {
            toast.error('Appointment date cannot be in the past. Please select today or a future date.')
            return
        }
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

        if (isDateInPast(appointmentDate)) {
            toast.error('Appointment date cannot be in the past. Please go back and select a valid date.')
            return
        }

        setSubmitting(true)
        try {
            // Convert to 24h format for the API
            let hour = parseInt(timeHour)
            if (timePeriod === 'PM' && hour < 12) hour += 12
            if (timePeriod === 'AM' && hour === 12) hour = 0
            const appointmentTime = `${hour.toString().padStart(2, '0')}:${timeMinute}`

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
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Header at Top */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        New Appointment
                    </h1>
                    <p className="text-sm text-slate-500">
                        Create a new appointment for a patient
                    </p>
                </div>

                {/* Back Button below Header */}
                <Link
                    href="/dashboard/appointments"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Link>

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
                                        className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-200 ${completedSteps.has(i)
                                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                                : i === step
                                                    ? 'border-[#0EA5E9] bg-[#0EA5E9] text-white shadow-lg shadow-sky-500/25'
                                                    : 'border-slate-200 bg-white text-slate-500 group-hover:border-slate-300'
                                            }`}
                                    >
                                        {completedSteps.has(i) ? (
                                            <CheckCircle2 className="h-5 w-5" />
                                        ) : (
                                            <s.icon className="h-5 w-5" />
                                        )}
                                    </div>
                                    <span
                                        className={`text-sm font-semibold transition-colors ${completedSteps.has(i)
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
                                        className={`flex-1 h-1 mx-3 mt-[-26px] rounded-full transition-colors ${completedSteps.has(i) ? 'bg-emerald-400' : 'bg-slate-200/80'
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
                                className={`inline-flex items-center gap-2 text-[15px] font-semibold transition-colors ${active ? 'text-[#0EA5E9]' : 'text-slate-600 hover:text-slate-900'
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
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-semibold text-slate-800">
                                            Select Patient <span className="text-red-500">*</span>
                                        </Label>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setQuickAddOpen(true)}
                                            className="h-8 gap-1.5 text-xs font-bold text-[#0EA5E9] hover:bg-sky-50 hover:text-[#0EA5E9]"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            New Patient
                                        </Button>
                                    </div>
                                    <div className="relative" ref={patientDropdownRef}>
                                        <div className="relative">
                                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <Input
                                                value={
                                                    patientDropdownOpen
                                                        ? patientSearch
                                                        : selectedPatient
                                                            ? `${selectedPatient.fullName || 'Unknown Patient'} (${selectedPatient.patientNumber || 'No ID'})`
                                                            : patientSearch
                                                }
                                                onFocus={() => setPatientDropdownOpen(true)}
                                                onChange={(e) => {
                                                    setPatientDropdownOpen(true)
                                                    setPatientSearch(e.target.value)
                                                }}
                                                placeholder="Search by name, phone, or ID..."
                                                className="h-11 rounded-lg border-slate-200 pl-9 pr-10 text-[15px]"
                                            />
                                            <ChevronDown
                                                className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${patientDropdownOpen ? 'rotate-180' : ''
                                                    }`}
                                            />
                                        </div>

                                        {patientDropdownOpen && (
                                            <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                                                <div className="max-h-72 overflow-y-auto p-2">
                                                    {loadingPatients ? (
                                                        <div className="flex items-center gap-2 rounded-lg px-3 py-4 text-sm text-slate-500">
                                                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                                            Loading patients...
                                                        </div>
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
                                                                        setPatientSearch('')
                                                                        setPatientDropdownOpen(false)
                                                                    }}
                                                                    className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${patientId === p.id
                                                                            ? 'border-blue-300 bg-blue-50'
                                                                            : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                                                                        }`}
                                                                >
                                                                    <p className="truncate text-sm font-semibold text-slate-900">
                                                                        {p.fullName || 'Unknown Patient'}
                                                                    </p>
                                                                    <p className="truncate text-xs text-slate-500">
                                                                        {p.patientNumber || 'No ID'}
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
                                                <p className="text-xs text-slate-500">Phone</p>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {selectedPatient.phone || '—'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Patient ID</p>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {selectedPatient.patientNumber || '—'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <Sheet open={quickAddOpen} onOpenChange={setQuickAddOpen}>
                            <SheetContent className="sm:max-w-md overflow-y-auto scrollbar-hide">
                                <SheetHeader>
                                    <SheetTitle>Quick Add Patient</SheetTitle>
                                    <SheetDescription>
                                        Create a new patient record without leaving this page.
                                    </SheetDescription>
                                </SheetHeader>
                                <QuickAddPatientForm
                                    onCancel={() => setQuickAddOpen(false)}
                                    onSuccess={(newPat) => {
                                        setPatients((prev) => [newPat, ...prev])
                                        setPatientId(newPat.id)
                                        setQuickAddOpen(false)
                                        setPatientSearch('')
                                    }}
                                />
                            </SheetContent>
                        </Sheet>

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
                                                        <SelectItem key={`${d.id}-${d.doctorId || ''}`} value={getDoctorRecordId(d)}>
                                                            {getDoctorName(d)}{' '}
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
                                            min={todayStr}
                                            onChange={(e) => setAppointmentDate(e.target.value)}
                                            className={`h-11 text-[15px] rounded-lg ${appointmentDate && isDateInPast(appointmentDate) ? 'border-red-400 ring-1 ring-red-300' : 'border-slate-200'}`}
                                        />
                                        {appointmentDate && isDateInPast(appointmentDate) && (
                                            <p className="text-xs text-red-500 mt-1 font-medium">Appointment date cannot be in the past</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-800">
                                            Appointment Time <span className="text-red-500">*</span>
                                        </Label>
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
                                                    <span className="w-28 text-slate-500">Phone:</span>
                                                    <span className="font-medium text-slate-900">{selectedPatient?.phone || 'Not provided'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-28 text-slate-500">Patient ID:</span>
                                                    <span className="font-medium text-slate-900">{selectedPatient?.patientNumber || 'Not provided'}</span>
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
                                                    <span className="font-medium text-slate-900">{getDoctorName(selectedDoctor) || 'Not provided'}</span>
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
                                                    <span className="font-medium text-slate-900">{timeHour}:{timeMinute} {timePeriod}</span>
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
