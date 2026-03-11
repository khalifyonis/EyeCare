'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Users, Eye, CheckCircle2, RefreshCw, ArrowUpRight, Calendar,
} from 'lucide-react'
import {
    AreaChart, Area, LineChart, Line,
    PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
} from 'recharts'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { readStoredUser, type StoredUser } from '@/lib/auth'

/* ─── DEMO / FALLBACK DATA ─── */
const SPARK_TODAY     = [3,5,4,8,6,10,12]
const SPARK_PENDING   = [2,4,3,5,4,6,5]
const SPARK_COMPLETED = [1,3,5,7,6,8,9]
const SPARK_FOLLOWUP  = [1,2,2,3,2,4,3]

const DEMO_SCHEDULE = [
    { id:'s1', time:'09:00 AM', patient:'Sara Khalid',  type:'Eye Checkup', status:'ACTIVE' },
    { id:'s2', time:'10:30 AM', patient:'Omar Hassan',  type:'Follow-Up',   status:'SCHEDULED' },
    { id:'s3', time:'12:00 PM', patient:'Fatima Ali',   type:'Retina Exam', status:'WAITING' },
    { id:'s4', time:'02:00 PM', patient:'Yusuf Ahmed',  type:'Vision Test', status:'SCHEDULED' },
]

const DEMO_RX = [
    { id:'p1', patient:'Sara Khalid',  item:'Eye Drops', date:'Today' },
    { id:'p2', patient:'Omar Hassan',  item:'Glasses',   date:'Yesterday' },
    { id:'p3', patient:'Fatima Ali',   item:'Eye Lens',  date:'2 days ago' },
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
function StatCard({ label, value, loading, icon: Icon, color, sparkColor, sparkData }: {
    label: string; value: number | string; loading: boolean
    icon: React.ElementType; color: string; sparkColor: string; sparkData: number[]
}) {
    const d = sparkData.map((v, i) => ({ i, v }))
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="px-4 pt-3.5 pb-1 flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                        <div className={`h-[22px] w-[22px] rounded-md flex items-center justify-center ${color}`}>
                            <Icon className="h-3 w-3 text-white" />
                        </div>
                        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide truncate">{label}</p>
                    </div>
                    <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-white tabular-nums leading-none">
                        {loading ? <span className="text-lg opacity-40">…</span> : value}
                    </p>
                </div>
            </div>
            <div className="h-10 w-full mt-auto">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={d} margin={{ top:0, right:0, left:0, bottom:0 }}>
                        <defs>
                            <linearGradient id={`sg-${sparkColor.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor={sparkColor} stopOpacity={0.25} />
                                <stop offset="95%" stopColor={sparkColor} stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke={sparkColor} strokeWidth={1.5}
                            fill={`url(#sg-${sparkColor.replace('#','')})`} dot={false} isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

/* ─── MAIN ─── */
export function DoctorDashboard() {
    const router  = useRouter()
    const [user, setUser]       = useState<StoredUser | null>(null)
    const [data, setData]       = useState<any>(null)
    const [loading, setLoading] = useState(true)

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
        today:     (data?.myAppointmentsToday ?? 0) || 4,
        pending:   (data?.myPendingToday ?? 0) || 2,
        completed: (data?.myCompletedToday ?? 0) || 2,
        patients:  (data?.myTotalPatients ?? 0) || 5,
    }), [data])

    const schedule = useMemo(() => {
        if (data?.todaySchedule?.length)
            return data.todaySchedule.map((a: any) => ({
                id: a.id,
                time: new Date(a.appointmentDate).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }),
                patient: a.patient?.fullName ?? '—',
                type: a.clinicalExamination ? 'Clinical Exam' : a.erExamination ? 'ER Exam' : 'Eye Checkup',
                status: a.status,
            }))
        return DEMO_SCHEDULE
    }, [data])

    const rxRows = useMemo(() => {
        if (data?.recentPrescriptions?.length)
            return data.recentPrescriptions.map((rx: any) => ({
                id: rx.id,
                patient: rx.appointment?.patient?.fullName ?? '—',
                item: rx.itemType === 'OPTICAL' ? 'Optical Item' : 'Eye Drops',
                date: new Date(rx.createdAt).toLocaleDateString(),
            }))
        return DEMO_RX
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
                    <StatCard label="Today Patients" value={stats.today}     loading={loading} icon={Users}        color="bg-sky-500"     sparkColor="#0EA5E9" sparkData={SPARK_TODAY} />
                    <StatCard label="Pending Exams"  value={stats.pending}   loading={loading} icon={Eye}          color="bg-violet-500"  sparkColor="#8b5cf6" sparkData={SPARK_PENDING} />
                    <StatCard label="Completed"      value={stats.completed} loading={loading} icon={CheckCircle2} color="bg-emerald-500" sparkColor="#10b981" sparkData={SPARK_COMPLETED} />
                    <StatCard label="Follow Ups"     value={stats.patients}  loading={loading} icon={RefreshCw}    color="bg-orange-500"  sparkColor="#f59e0b" sparkData={SPARK_FOLLOWUP} />
                </div>

                {/* Schedule + Patient Summary */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

                    {/* Today's Schedule */}
                    <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-sky-500" /> Today&apos;s Schedule
                            </h2>
                            <button type="button" onClick={() => router.push('/dashboard/appointments')}
                                className="flex items-center gap-0.5 text-[11px] font-semibold text-sky-500 hover:text-sky-600 transition-colors">
                                View All <ArrowUpRight className="h-3 w-3" />
                            </button>
                        </div>
                        <table className="w-full text-[13px]">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                    <th className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 px-4 py-2 w-[80px]">Time</th>
                                    <th className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-2">Patient</th>
                                    <th className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-2 hidden sm:table-cell">Type</th>
                                    <th className="text-right text-[10px] font-bold uppercase tracking-wider text-slate-400 px-4 py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schedule.map((r: any, i: number) => (
                                    <tr key={r.id} className="border-b last:border-0 border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-300 tabular-nums">{r.time}</td>
                                        <td className="px-2 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${AV[i % AV.length]}`}>
                                                    {r.patient?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                                                </div>
                                                <span className="font-semibold text-slate-700 dark:text-slate-100">{r.patient}</span>
                                            </div>
                                        </td>
                                        <td className="px-2 py-2.5 hidden sm:table-cell">
                                            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />{r.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right"><Dot status={r.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Patient Summary */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Patient Summary</h2>
                            <p className="text-[11px] text-slate-400">This Week</p>
                        </div>
                        <div className="flex flex-col items-center justify-center flex-1 px-4 py-4 gap-3">
                            <div className="relative w-[160px] h-[160px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={summary} cx="50%" cy="50%"
                                            innerRadius={52} outerRadius={72} paddingAngle={3}
                                            dataKey="value" startAngle={90} endAngle={-270}>
                                            {summary.map((s) => <Cell key={s.name} fill={s.color} stroke="transparent" />)}
                                        </Pie>
                                        <RechartsTooltip contentStyle={tt} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-extrabold text-slate-800 dark:text-white leading-none">{total}</span>
                                    <span className="text-[10px] text-slate-400 mt-0.5">Total Patients</span>
                                </div>
                            </div>
                            <div className="w-full space-y-2">
                                {summary.map(s => (
                                    <div key={s.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                            <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300">{s.name}</span>
                                        </div>
                                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">{s.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Prescriptions + Examination Stats */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

                    {/* Recent Prescriptions */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Recent Prescriptions</h2>
                            <button type="button" onClick={() => router.push('/dashboard/prescriptions')}
                                className="flex items-center gap-0.5 text-[11px] font-semibold text-sky-500 hover:text-sky-600 transition-colors">
                                View All <ArrowUpRight className="h-3 w-3" />
                            </button>
                        </div>
                        <div className="px-4 py-2">
                            {rxRows.map((rx: any, i: number) => (
                                <div key={rx.id} className="flex items-center gap-2.5 py-2 border-b last:border-0 border-slate-50 dark:border-slate-800/50">
                                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${AV[(i+2) % AV.length]}`}>
                                        {rx.patient?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                                    </div>
                                    <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">{rx.patient}</span>
                                    <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                                    <span className="text-[13px] text-slate-500 dark:text-slate-400 truncate">{rx.item}</span>
                                    <span className="ml-auto text-[11px] text-slate-400 tabular-nums shrink-0">{rx.date}</span>
                                </div>
                            ))}
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
