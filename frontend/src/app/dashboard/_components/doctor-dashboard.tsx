'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Users, Eye, CheckCircle2, RefreshCw, ArrowUpRight, Calendar, Activity, UserPlus
} from 'lucide-react'
import Link from 'next/link'
import {
    LineChart, Line,
    XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
} from 'recharts'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { readStoredUser, type StoredUser } from '@/lib/auth'



const DEMO_SCHEDULE = [
    { id:'s1', time:'09:00 AM', patient:'Sara Khalid',  type:'Eye Checkup', status:'ACTIVE' },
    { id:'s2', time:'10:30 AM', patient:'Omar Hassan',  type:'Follow-Up',   status:'SCHEDULED' },
    { id:'s3', time:'12:00 PM', patient:'Fatima Ali',   type:'Retina Exam', status:'WAITING' },
    { id:'s4', time:'02:00 PM', patient:'Yusuf Ahmed',  type:'Vision Test', status:'SCHEDULED' },
]

const DEMO_RX = [
    { id:'p1', patient:'Sara Khalid',  item:'Eye Drops', date:'Today' },
    { id:'p2', patient:'Omar Hassan',  item:'Antibiotic',   date:'Yesterday' },
    { id:'p3', patient:'Fatima Ali',   item:'Pain Relief',  date:'2 days ago' },
]

const DEMO_SUMMARY = [
    { name:'New',       value:14, color:'#3b82f6' },
    { name:'Return',    value:12, color:'#f97316' },
    { name:'Follow Up', value:10, color:'#10b981' },
]

const DEMO_EXAM_STATS = [
    { day:'Mon', exams:4 }, { day:'Tue', exams:7 }, { day:'Wed', exams:5 },
    { day:'Thu', exams:9 }, { day:'Fri', exams:6 }, { day:'Sat', exams:11 }, { day:'Sun', exams:8 },
]

/* ─── STATUS DOT ─── */
const STATUS: Record<string, { label: string; dot: string; text: string }> = {
    ACTIVE:    { label: 'Active',    dot: 'bg-blue-500',    text: 'text-blue-600 dark:text-blue-400' },
    SCHEDULED: { label: 'Scheduled', dot: 'bg-amber-400',   text: 'text-amber-600 dark:text-amber-400' },
    WAITING:   { label: 'Waiting',   dot: 'bg-red-500',     text: 'text-red-500' },
    PENDING:   { label: 'Pending',   dot: 'bg-amber-400',   text: 'text-amber-600 dark:text-amber-400' },
    COMPLETED: { label: 'Completed', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
    CANCELLED: { label: 'Cancelled', dot: 'bg-slate-400',   text: 'text-slate-500' },
}
function Dot({ status }: { status: string }) {
    const s = STATUS[status] ?? STATUS.PENDING
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={`h-[7px] w-[7px] rounded-full ${s.dot}`} />
            <span className={`text-[12px] font-semibold ${s.text}`}>{s.label}</span>
        </span>
    )
}

const AV = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-cyan-500']

/* ─── STAT CARD ─── */
function StatCard({ label, value, loading, icon: Icon, bgClass }: {
    label: string; value: number | string; loading: boolean
    icon: React.ElementType; bgClass: string
}) {
    return (
        <div className={`${bgClass} text-white rounded-2xl p-5 shadow-md hover:shadow-lg hover:scale-[1.015] transition-all duration-300 flex flex-col justify-between min-h-[110px]`}>
            <div className="flex justify-between items-start">
                <span className="text-[11px] font-semibold opacity-90 tracking-wide">
                    {label}
                </span>
                <Icon className="h-5 w-5 opacity-80" />
            </div>
            <p className="text-[30px] font-extrabold tracking-tight mt-3 leading-none">
                {loading ? <span className="text-lg opacity-40">…</span> : value}
            </p>
        </div>
    )
}

/* ─── MAIN ─── */
export function DoctorDashboard() {
    const router  = useRouter()
    const [user, setUser]       = useState<StoredUser | null>(null)
    const [data, setData]       = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const isOptometrist = useMemo(() => {
        return user?.doctor?.specialization?.toUpperCase() === 'OPTOMETRY'
    }, [user])

    useEffect(() => {
        const u = readStoredUser()
        if (!u) { router.push('/login'); return }
        setUser(u)
    }, [router])

    const fetchData = useCallback(async () => {
        try { setData((await api.get('/dashboard/doctor')).data) }
        catch (e: any) {
            toast.error(typeof e?.response?.data?.message === 'string' ? e.response.data.message : 'Failed to load dashboard')
        } finally { setLoading(false) }
    }, [])

    useEffect(() => { if (user) fetchData() }, [user, fetchData])

    const stats = useMemo(() => ({
        today:     data?.myAppointmentsToday ?? 0,
        pending:   data?.myPendingToday ?? 0,
        completed: data?.myCompletedToday ?? 0,
        patients:  data?.myTotalPatients ?? 0,
    }), [data])

    const schedule = useMemo(() => {
        if (data?.todaySchedule?.length) {
            return data.todaySchedule
                .filter((a: any) => ['RECEIVED', 'EXAMINING', 'IN_SURGERY'].includes(a.status))
                .map((a: any) => ({
                    id: a.id,
                    time: new Date(a.appointmentDate).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }),
                    patient: a.patient?.fullName ?? '—',
                    patientId: a.patient?.id || a.patientId,
                    type: a.type?.toLowerCase() === 'surgery' 
                        ? 'Surgery' 
                        : a.eyeExamination?.stage === 'PRELIMINARY'
                            ? 'Ready for Doctor'
                            : a.clinicalExamination 
                                ? 'Clinical Exam' 
                                : a.erExamination 
                                    ? 'ER Exam' 
                                    : 'Eye Checkup',
                    status: a.status,
                    eyeExaminationId: a.eyeExamination?.id || null,
                }))
        }
        return []
    }, [data])

    const rxRows = useMemo(() => {
        if (data?.recentPrescriptions?.length)
            return data.recentPrescriptions.map((rx: any) => ({
                id: rx.id,
                patient: rx.appointment?.patient?.fullName ?? '—',
                item: 'Medicine',
                date: new Date(rx.createdAt).toLocaleDateString(),
            }))
        return []
    }, [data])

    const surgeries = useMemo(() => {
        return (data?.upcomingSurgeries || []).map((s: any) => ({
            id: s.id,
            patient: s.patient?.fullName || '—',
            type: s.surgeryType,
            date: new Date(s.date).toLocaleDateString(),
            time: new Date(s.date).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }),
            eye: s.eye,
        }))
    }, [data])

    const summary = DEMO_SUMMARY

    const total = useMemo(() => summary.reduce((s, i) => s + i.value, 0), [summary])

    const tt = { backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', fontSize: 11, border: 'none', boxShadow: '0 4px 16px -4px rgba(0,0,0,.1)' }

    if (!user) return null

    return (
        <div className="h-full overflow-auto">
            <div className="max-w-[1200px] mx-auto px-3 sm:px-5 py-4 space-y-4">

                {/* Header */}
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white">
                    Welcome Back, Dr. {user.fullName?.split(' ').slice(-1)[0] || user.fullName || 'Doctor'}
                </h1>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard label="Today Patients" value={stats.today}     loading={loading} icon={Users}        bgClass="bg-[#3B82F6]" />
                    <StatCard label="Pending Exams"  value={stats.pending}   loading={loading} icon={Eye}          bgClass="bg-[#EC4899]" />
                    <StatCard label="Completed"      value={stats.completed} loading={loading} icon={CheckCircle2} bgClass="bg-[#10B981]" />
                    <StatCard label="Follow Ups"     value={stats.patients}  loading={loading} icon={RefreshCw}    bgClass="bg-[#8B5CF6]" />
                </div>

                {/* Schedule + Patient Summary */}
                <div className={`grid grid-cols-1 ${isOptometrist ? 'xl:grid-cols-1' : 'xl:grid-cols-3'} gap-4`}>

                    {/* Today's Appointments */}
                    <div className={`${isOptometrist ? 'xl:col-span-1' : 'xl:col-span-2'} bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden`}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-sky-500" /> Today&apos;s Appointments
                            </h2>
                            <button type="button" onClick={() => router.push('/dashboard/appointments')}
                                className="flex items-center gap-0.5 text-[11px] font-semibold text-sky-500 hover:text-sky-600 transition-colors">
                                View All <ArrowUpRight className="h-3 w-3" />
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-[13px]">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                        <th className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 px-4 py-2 w-[80px]">Time</th>
                                        <th className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-2">Patient</th>
                                        <th className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-2 hidden sm:table-cell">Type</th>
                                        <th className="text-right text-[10px] font-bold uppercase tracking-wider text-slate-400 px-4 py-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {schedule.length > 0 ? schedule.map((r: any, i: number) => (
                                        <tr key={r.id} className="border-b last:border-0 border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors group">
                                            <td className="px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-300 tabular-nums">{r.time}</td>
                                            <td className="px-2 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm ${AV[i % AV.length]}`}>
                                                        {r.patient?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700 dark:text-slate-100 leading-tight">{r.patient}</span>
                                                        <Dot status={r.status} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2 py-2.5 hidden sm:table-cell">
                                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                    {r.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await api.put(`/appointments/${r.id}/arrival`)

                                                            const isSurgery = r.type?.toUpperCase() === 'SURGERY'
                                                            let url = isSurgery 
                                                                ? `/dashboard/surgery/new?patientId=${r.patientId}&patientName=${encodeURIComponent(r.patient)}&appointmentId=${r.id}`
                                                                : `/dashboard/eye-examinations/new?patientId=${r.patientId}&patientName=${encodeURIComponent(r.patient)}&appointmentId=${r.id}&stage=PRELIMINARY`

                                                            if (!isSurgery && r.eyeExaminationId) {
                                                                // For optometrists we only navigate to preliminary edit. For ophthalmologists we navigate to clinical.
                                                                url = isOptometrist 
                                                                    ? `/dashboard/eye-examinations/${r.eyeExaminationId}/edit?stage=PRELIMINARY`
                                                                    : `/dashboard/eye-examinations/${r.eyeExaminationId}/edit?stage=CLINICAL`
                                                            }
                                                            router.push(url)
                                                        } catch (err) {
                                                            toast.error('Failed to start procedure')
                                                        }
                                                    }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-bold transition-all shadow-sm hover:shadow-md active:scale-95"
                                                >
                                                    {r.type?.toUpperCase() === 'SURGERY' ? (
                                                        <>
                                                            <Activity className="h-3.5 w-3.5" />
                                                            Perform Surgery
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Eye className="h-3.5 w-3.5" />
                                                            Examine Patient
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-10 text-center text-slate-400 font-medium italic">
                                                No appointments scheduled for today
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Upcoming Surgeries */}
                    {!isOptometrist && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
                            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                    <Activity className="h-3.5 w-3.5 text-rose-500" /> Upcoming Surgeries
                                </h2>
                                <Link href="/dashboard/surgery" className="text-[10px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider">
                                    View All
                                </Link>
                            </div>
                            <div className="flex-1 overflow-y-auto max-h-[300px]">
                                {surgeries.length > 0 ? surgeries.map((s: any, i: number) => (
                                    <div key={s.id} className="p-3 border-b last:border-0 border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-start justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 font-bold text-[10px]">
                                                    {s.eye}
                                                </div>
                                                <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{s.patient}</span>
                                            </div>
                                            <span className="text-[11px] font-black text-rose-500 tabular-nums">{s.time}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-medium text-slate-500 truncate mr-2">{s.type}</span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{s.date}</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="flex flex-col items-center justify-center h-full py-10 px-4 text-center">
                                        <Activity className="h-8 w-8 text-slate-200 mb-2" />
                                        <p className="text-xs font-medium text-slate-400 italic">No surgeries scheduled</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Recent Prescriptions + Examination Stats */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

                    {/* Recent Prescriptions */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Recent Prescriptions</h2>
                            <button type="button" onClick={() => router.push(isOptometrist ? '/dashboard/prescription/optical' : '/dashboard/prescription/medicine')}
                                className="flex items-center gap-0.5 text-[11px] font-semibold text-sky-500 hover:text-sky-600 transition-colors">
                                View All
                            </button>
                        </div>
                        <div className="px-4 py-2">
                            {rxRows.length > 0 ? rxRows.map((rx: any, i: number) => (
                                <div key={rx.id} className="flex items-center gap-2.5 py-2 border-b last:border-0 border-slate-50 dark:border-slate-800/50">
                                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${AV[(i+2) % AV.length]}`}>
                                        {rx.patient?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                                    </div>
                                    <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">{rx.patient}</span>
                                    <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                                    <span className="text-[13px] text-slate-500 dark:text-slate-400 truncate">{rx.item}</span>
                                    <span className="ml-auto text-[11px] text-slate-400 tabular-nums shrink-0">{rx.date}</span>
                                </div>
                            )) : (
                                <div className="py-8 text-center text-xs text-slate-450 italic">No prescriptions created today</div>
                            )}
                        </div>
                    </div>

                    {/* Examination Stats */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Examination Stats</h2>
                        </div>
                        <div className="px-2 pb-3 pt-3 h-[170px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={DEMO_EXAM_STATS} margin={{ top:4, right:12, left:-24, bottom:0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="day" tickLine={false} axisLine={false}
                                        tick={{ fill:'hsl(var(--muted-foreground))', fontSize:10, fontWeight:600 }} />
                                    <YAxis tickLine={false} axisLine={false}
                                        tick={{ fill:'hsl(var(--muted-foreground))', fontSize:10 }} />
                                    <RechartsTooltip contentStyle={tt} formatter={(v: unknown) => [String(v), 'Exams']} />
                                    <Line type="monotone" dataKey="exams" stroke="#0EA5E9" strokeWidth={2}
                                        dot={{ fill:'#0EA5E9', r:3, strokeWidth:0 }} activeDot={{ r:5 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
