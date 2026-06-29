'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { usePermission } from '@/contexts/permission-context';
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
    Mail,
    Phone,
    AlertCircle,
} from 'lucide-react'

type Appointment = {
    id: string
    bookingNumber?: string | null
    appointmentDate: string
    status: string
    type?: string | null
    location?: string | null
    notes?: string | null
    eyeSide?: string | null
    patient?: {
        id: string;
        fullName?: string | null;
        email?: string | null;
        phone?: string | null;
        emergencyContactName?: string | null;
        emergencyContactPhone?: string | null;
        emergencyContactRelationship?: string | null;
    } | null
    doctor?: { id?: string | null; user?: { fullName?: string | null; email?: string | null } | null } | null
    clinicalExamination?: { surgery?: { date?: string | null; time?: string | null; operatingRoom?: string | null; surgeryType?: string | null } | null } | null
    billings?: Array<{ id: string; invoiceNumber?: string | null; status?: string | null; totalAmount?: number | string | null; finalAmount?: number | string | null; dueDate?: string | null; serviceType?: string | null }> | null
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
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(d)
}

function formatTime(iso?: string | null) {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(d)
}

const STATUS_STYLES: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    SCHEDULED: 'bg-slate-100 text-slate-600 border-slate-200',
    CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-red-50 text-red-700 border-red-200',
}


/* ────────────────────────────────────────────────────
   InfoRow — Clean field display matching reference:
   Icon + Label above Value, NO divider lines, NO bg
   ──────────────────────────────────────────────────── */
function InfoRow({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ElementType
    label: string
    value: React.ReactNode
}) {
    return (
        <div className="flex items-start gap-3 py-3.5">
            <Icon className="h-[18px] w-[18px] text-slate-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
                <p className="text-[13px] text-slate-500 leading-tight">{label}</p>
                <div className="text-[15px] text-slate-800 mt-0.5 break-words">{value}</div>
            </div>
        </div>
    )
}

function money(value?: number | string | null) {
    const n = Number(value || 0)
    return `$${Number.isFinite(n) ? n.toFixed(2) : '0.00'}`
}

export default function AppointmentDetailsPage() {
    const router = useRouter()
    const params = useParams<{ id: string }>()
    const id = params?.id

    const { can } = usePermission();
    const canUpdate = can('appointments', 'canUpdate');

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
    const billing = appt?.billings?.[0] || null

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* ── Page Header — NO background, NO border (matches reference) ── */}
            <div className="px-6 pt-6 pb-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Appointment Details</h1>
                <p className="text-sm text-slate-500 mt-0.5">View and manage appointment information</p>
            </div>

            <div className="mx-auto max-w-5xl px-6 py-4 space-y-5">
                {/* ── Back Link (blue like reference) ── */}
                <Link
                    href="/dashboard/appointments"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0EA5E9] hover:text-[#0c8fd0] transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Appointments
                </Link>

                {/* ── Title Bar ── */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">
                        Appointment: {patientName}
                    </h2>
                    {canUpdate && (
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
                    )}
                </div>

                {/* ── Content ── */}
                {loading ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-6">
                        <div className="h-5 w-44 bg-slate-100 rounded animate-pulse" />
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="h-16 bg-slate-50 rounded animate-pulse" />
                            ))}
                        </div>
                    </div>
                ) : !appt ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                        Appointment not found.
                    </div>
                ) : (
                    <div className="space-y-5">
                        {/* ── Appointment Details Card ── */}
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Appointment Details</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12">
                                {/* Left Column — NO divider lines */}
                                <div>
                                    <InfoRow icon={User} label="Patient Name" value={patientName} />
                                    <InfoRow icon={Hash} label="Patient ID" value={appt.bookingNumber || 'N/A'} />
                                    <InfoRow icon={Stethoscope} label="Doctor" value={`Dr. ${doctorName}`} />
                                    <InfoRow icon={Calendar} label="Date" value={formatDate(appt.appointmentDate)} />
                                    {appt.eyeSide && (
                                        <InfoRow
                                            icon={AlertCircle}
                                            label="Eye Side"
                                            value={
                                                <span className="font-bold text-[#0EA5E9]">
                                                    {appt.eyeSide === 'OD' ? 'Right Eye (OD)' : appt.eyeSide === 'OS' ? 'Left Eye (OS)' : 'Both Eyes (OU)'}
                                                </span>
                                            }
                                        />
                                    )}
                                </div>
                                {/* Right Column — NO divider lines */}
                                <div>
                                    <InfoRow icon={FileText} label="Type" value={appt.type || '—'} />
                                    <InfoRow
                                        icon={Clock}
                                        label="Status"
                                        value={
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[(appt.status || '').toUpperCase()] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                {appt.status?.toLowerCase() || 'pending'}
                                            </span>
                                        }
                                    />
                                    <InfoRow icon={MapPin} label="Location" value={appt.location || 'Not specified'} />
                                    <InfoRow icon={Clock} label="Time" value={formatTime(appt.appointmentDate)} />
                                    {String(appt.type || '').toLowerCase() === 'surgery' && appt.clinicalExamination?.surgery && (
                                        <>
                                            <InfoRow icon={Calendar} label="Surgery Date" value={formatDate(appt.clinicalExamination.surgery.date)} />
                                            <InfoRow icon={Clock} label="Surgery Time" value={appt.clinicalExamination.surgery.time || '—'} />
                                            <InfoRow icon={MapPin} label="Operating Room" value={appt.clinicalExamination.surgery.operatingRoom || '—'} />
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Patient Information Card ── */}
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Patient Information</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12">
                                <div>
                                    <InfoRow icon={Mail} label="Email" value={appt.patient?.email || '—'} />
                                </div>
                                <div>
                                    <InfoRow icon={Phone} label="Phone" value={appt.patient?.phone || '—'} />
                                </div>
                            </div>

                            {(appt.patient?.emergencyContactName || appt.patient?.emergencyContactPhone) && (
                                <div className="mt-6 pt-6 border-t border-slate-100">
                                    <div className="flex items-center gap-2 mb-4">
                                        <AlertCircle className="h-4 w-4 text-amber-500" />
                                        <h4 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider">Emergency Contact</h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-12">
                                        <InfoRow icon={User} label="Contact Name" value={appt.patient?.emergencyContactName || '—'} />
                                        <InfoRow icon={Phone} label="Contact Phone" value={appt.patient?.emergencyContactPhone || '—'} />
                                        <InfoRow icon={User} label="Relationship" value={appt.patient?.emergencyContactRelationship || '—'} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Billing Card ── */}
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <h3 className="text-lg font-bold text-slate-900">Payment & Billing</h3>
                                {billing?.id && (
                                    <Link href={`/dashboard/billing/${billing.id}`} className="text-sm font-medium text-[#0EA5E9] hover:text-[#0c8fd0]">
                                        Open invoice
                                    </Link>
                                )}
                            </div>
                            {billing ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12">
                                    <div>
                                        <InfoRow icon={Hash} label="Invoice" value={billing.invoiceNumber || 'Pending'} />
                                        <InfoRow icon={FileText} label="Service Type" value={billing.serviceType || '—'} />
                                        <InfoRow icon={Clock} label="Status" value={billing.status || 'UNPAID'} />
                                    </div>
                                    <div>
                                        <InfoRow icon={Calendar} label="Total" value={money(billing.totalAmount)} />
                                        <InfoRow icon={Calendar} label="Final Amount" value={money(billing.finalAmount)} />
                                        <InfoRow icon={Clock} label="Due Date" value={billing.dueDate ? formatDate(billing.dueDate) : '—'} />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400">No billing record linked to this appointment.</p>
                            )}
                        </div>

                        {/* ── Additional Information Card ── */}
                        {appt.notes && (
                            <div className="rounded-xl border border-slate-200 bg-white p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Additional Information</h3>
                                <p className="text-[15px] text-slate-600 whitespace-pre-wrap leading-relaxed">{appt.notes}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
