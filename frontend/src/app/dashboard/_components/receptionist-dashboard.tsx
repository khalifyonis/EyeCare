'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Calendar, UserPlus, Clock, Users,
    ArrowUpRight, Receipt, AlertCircle, CheckCircle2, Loader2,
    ChevronRight,
} from 'lucide-react'
import { BarChart, Bar, Cell, XAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { readStoredUser, type StoredUser } from '@/lib/auth'

type Stats = {
    appointmentsToday: number; newPatientsToday: number
    pendingToday: number; completedToday: number
    todayQueue: any[]; recentPatients: any[]; unpaidBillings: number
}

const STATUS_MAP: Record<string, { badgeClass: string; text: string }> = {
    PENDING:   { badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-400', text: 'Waiting' },
    SCHEDULED: { badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200/50 dark:bg-amber-950/30 dark:text-amber-400', text: 'Waiting' },
    CONFIRMED: { badgeClass: 'bg-sky-50 text-sky-700 border border-sky-200/50 dark:bg-sky-950/30 dark:text-sky-450', text: 'Confirmed' },
    RECEIVED:  { badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-950/30 dark:text-emerald-400', text: 'Checked In' },
    EXAMINING: { badgeClass: 'bg-sky-50 text-sky-700 border border-sky-200/50 dark:bg-sky-950/30 dark:text-sky-400', text: 'Progress' },
    COMPLETED: { badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-950/30 dark:text-emerald-400', text: 'Completed' },
    CANCELLED: { badgeClass: 'bg-red-50 text-red-700 border border-red-200/50 dark:bg-red-950/30 dark:text-red-400', text: 'Denied' },
}

const AV = ['bg-sky-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500']

export function ReceptionistDashboard() {
    const router = useRouter()
    const [user, setUser] = useState<StoredUser | null>(null)
    const [data, setData] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const u = readStoredUser()
        if (!u) {
            router.push('/login')
            return
        }
        setUser(u)
    }, [router])

    const fetchData = useCallback(async () => {
        try {
            setData((await api.get('/dashboard/receptionist')).data)
        } catch (e: any) {
            toast.error(typeof e?.response?.data?.message === 'string' ? e.response.data.message : 'Failed to load')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (user) fetchData()
    }, [user, fetchData])

    const cards = useMemo(() => [
        { 
            label: 'Appointments Today', 
            value: data?.appointmentsToday ?? 0, 
            icon: Calendar, 
            bgClass: 'bg-[#06B6D4]',
        },
        { 
            label: 'Walk-Ins', 
            value: Math.max((data?.appointmentsToday ?? 0) - (data?.newPatientsToday ?? 0), 0), 
            icon: UserPlus, 
            bgClass: 'bg-[#8B5CF6]',
        },
        { 
            label: 'Checked In', 
            value: data?.completedToday ?? 0, 
            icon: CheckCircle2, 
            bgClass: 'bg-[#10B981]',
        },
        { 
            label: 'Pending', 
            value: data?.pendingToday ?? 0, 
            icon: Clock, 
            bgClass: 'bg-[#F59E0B]',
        },
    ], [data])

    const visitors = useMemo(() => [
        { label: 'Walk-ins', value: Math.max((data?.appointmentsToday ?? 0) - (data?.newPatientsToday ?? 0), 0), color: '#0EA5E9' },
        { label: 'New Patients', value: data?.newPatientsToday ?? 0, color: '#8b5cf6' },
        { label: 'Completed', value: data?.completedToday ?? 0, color: '#10b981' },
    ], [data])

    const quickActions = [
        { label: 'Register Patient', icon: UserPlus, href: '/dashboard/patients', iconBg: 'bg-[#10B981]/15 dark:bg-[#10B981]/20', iconColor: 'text-[#10B981]' },
        { label: 'Book Appointment', icon: Calendar, href: '/dashboard/appointments', iconBg: 'bg-[#0EA5E9]/15 dark:bg-[#0EA5E9]/20', iconColor: 'text-[#0EA5E9]' },
        { label: 'Check in Patient', icon: Clock, href: '/dashboard/appointments', iconBg: 'bg-[#F97316]/15 dark:bg-[#F97316]/20', iconColor: 'text-[#F97316]' },
        { label: 'Print Receipt', icon: Receipt, href: '/dashboard/billing', iconBg: 'bg-[#6366F1]/15 dark:bg-[#6366F1]/20', iconColor: 'text-[#6366F1]' },
    ]

    const getGreeting = () => {
        const hr = new Date().getHours()
        if (hr < 12) return 'Good Morning'
        if (hr < 17) return 'Good Afternoon'
        return 'Good Evening'
    }

    const totalVisitors = useMemo(() => {
        if (!data) return 0
        const walkins = Math.max(data.appointmentsToday - data.newPatientsToday, 0)
        return walkins + data.newPatientsToday
    }, [data])

    const tt = { backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', fontSize: 11, border: 'none', boxShadow: '0 4px 16px -4px rgba(0,0,0,.1)' }

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50/50 dark:bg-slate-950/40">
                <Loader2 className="h-8 w-8 animate-spin text-[#0EA5E9]" />
            </div>
        )
    }

    if (!user) return null

    const firstName = user.fullName?.split(' ')[0] || 'Receptionist'

    return (
        <div className="h-full overflow-auto bg-slate-50/50 dark:bg-slate-950/40">
            <div className="max-w-[1250px] mx-auto px-4 sm:px-6 md:px-8 py-6 space-y-6 animate-in fade-in duration-300">
                
                {/* Greeting Banner */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                            {getGreeting()}, {firstName}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            Welcome back to the front desk. Manage patient check-ins and bookings.
                        </p>
                    </div>
                    {data && data.unpaidBillings > 0 && (
                        <button onClick={() => router.push('/dashboard/billing')}
                            className="flex items-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-1.5 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors animate-pulse">
                            <AlertCircle className="h-3.5 w-3.5" /> {data.unpaidBillings} Unpaid Invoices
                        </button>
                    )}
                </div>

                {/* KPI Stat Cards — solid vibrant colored backgrounds */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {cards.map(c => (
                        <div key={c.label} className={`${c.bgClass} text-white rounded-2xl p-5 shadow-md hover:shadow-lg hover:scale-[1.015] transition-all duration-300 flex flex-col justify-between min-h-[110px]`}>
                            <div className="flex justify-between items-start">
                                <span className="text-[11px] font-semibold opacity-90 tracking-wide">
                                    {c.label}
                                </span>
                                <c.icon className="h-5 w-5 opacity-80" />
                            </div>
                            <p className="text-[30px] font-extrabold tracking-tight mt-3 leading-none">
                                {c.value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Row 1: Today's Queue & Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    
                    {/* Today's Queue (limited to 5 records for dashboard layout) */}
                    <div className="lg:col-span-2 flex flex-col">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/80 p-5 flex flex-col w-full h-full justify-between">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60">
                                <h2 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-[#0EA5E9]" /> Today&apos;s Queue
                                </h2>
                                <button onClick={() => router.push('/dashboard/appointments')}
                                    className="flex items-center gap-0.5 text-xs font-semibold text-[#0EA5E9] hover:text-[#0c96d4] transition-colors">
                                    View All <ArrowUpRight className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            {!data?.todayQueue?.length ? (
                                <div className="py-12 text-center text-[13px] text-slate-400 flex-1 flex items-center justify-center">No appointments in queue</div>
                            ) : (
                                <div className="overflow-x-auto w-full mt-2 flex-1">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-slate-800/40">
                                                <th className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3 pt-2 w-12">No.</th>
                                                <th className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3 pt-2">Patient</th>
                                                <th className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3 pt-2">Time</th>
                                                <th className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3 pt-2 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
                                            {data.todayQueue.slice(0, 5).map((a: any, i: number) => {
                                                const s = STATUS_MAP[a.status] ?? STATUS_MAP.PENDING
                                                return (
                                                    <tr key={a.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                                                        <td className="py-3.5 pr-2 font-bold text-slate-400 tabular-nums">
                                                            {String(i + 1).padStart(2, '0')}
                                                        </td>
                                                        <td className="py-3.5 px-2">
                                                            <div className="flex items-center gap-2.5 min-w-[140px]">
                                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${AV[i % AV.length]}`}>
                                                                    {a.patient?.fullName?.[0]?.toUpperCase() || '?'}
                                                                </div>
                                                                <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">
                                                                    {a.patient?.fullName || '—'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-2">
                                                            <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                                                                {new Date(a.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 pl-2 text-right">
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${s.badgeClass}`}>
                                                                {s.text}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions — clean vertical list with colored icons, matching mockup */}
                    <div className="flex flex-col">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/80 p-5 flex flex-col w-full h-full">
                            <h2 className="text-base font-bold text-slate-850 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-800/60">
                                Quick Actions
                            </h2>
                            <div className="flex flex-col mt-1 flex-1 justify-center">
                                {quickActions.map((a, i) => (
                                    <button key={a.label} onClick={() => router.push(a.href)}
                                        className={`flex items-center gap-3 w-full py-3.5 px-1 text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg group ${i < quickActions.length - 1 ? 'border-b border-slate-100/80 dark:border-slate-800/40' : ''}`}>
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${a.iconBg} ${a.iconColor}`}>
                                            <a.icon className="h-4 w-4" />
                                        </div>
                                        <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 flex-1 truncate">
                                            {a.label}
                                        </span>
                                        <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Row 2: Upcoming Appointments & Today's Visitors */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    
                    {/* Upcoming Appointments (Timeline schedule visual matching mockup) */}
                    <div className="lg:col-span-2 flex flex-col">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/80 p-5 w-full h-full flex flex-col justify-between">
                            <h2 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2 mb-4">
                                <Calendar className="h-4 w-4 text-[#0EA5E9]" /> Upcoming Appointments
                            </h2>
                            <div className="relative mt-2 flex-1">
                                {/* Timeline Grid Background lines */}
                                <div className="absolute left-16 top-0 bottom-0 right-0 grid grid-cols-4 border-l border-slate-100 dark:border-slate-800/40 pointer-events-none">
                                    <div className="border-r border-slate-100 dark:border-slate-800/40" />
                                    <div className="border-r border-slate-100 dark:border-slate-800/40" />
                                    <div className="border-r border-slate-100 dark:border-slate-800/40" />
                                    <div className="border-r border-slate-100 dark:border-slate-800/40" />
                                </div>
                                
                                {/* Timeline Labels */}
                                <div className="flex justify-between text-[10px] font-extrabold text-slate-400 dark:text-slate-500 pl-16 mb-4">
                                    <span>10 AM</span>
                                    <span>12 PM</span>
                                    <span>2 PM</span>
                                    <span>4 PM</span>
                                </div>

                                {/* Timeline Slots */}
                                <div className="space-y-4">
                                    <div className="flex items-center">
                                        <span className="w-14 text-xs font-bold text-slate-450 dark:text-slate-500 tabular-nums">10:00 AM</span>
                                        <div className="flex-1 ml-2 relative h-8">
                                            <div className="absolute left-[5%] w-[40%] h-full bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 rounded-xl px-3 flex items-center shadow-sm">
                                                <span className="text-[11px] font-bold text-[#0EA5E9] truncate">Sarah Omar (Checkup)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-14 text-xs font-bold text-slate-450 dark:text-slate-500 tabular-nums">11:30 AM</span>
                                        <div className="flex-1 ml-2 relative h-8">
                                            <div className="absolute left-[30%] w-[35%] h-full bg-[#6366F1]/10 border border-[#6366F1]/30 rounded-xl px-3 flex items-center shadow-sm">
                                                <span className="text-[11px] font-bold text-[#6366F1] truncate">Mohamed Hassan (Retina)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-14 text-xs font-bold text-slate-450 dark:text-slate-500 tabular-nums">01:30 PM</span>
                                        <div className="flex-1 ml-2 relative h-8">
                                            <div className="absolute left-[50%] w-[40%] h-full bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl px-3 flex items-center shadow-sm">
                                                <span className="text-[11px] font-bold text-[#10B981] truncate">Fatima Yusuf (Follow Up)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-14 text-xs font-bold text-slate-450 dark:text-slate-500 tabular-nums">03:00 PM</span>
                                        <div className="flex-1 ml-2 relative h-8">
                                            <div className="absolute left-[70%] w-[25%] h-full bg-[#F97316]/10 border border-[#F97316]/30 rounded-xl px-3 flex items-center shadow-sm">
                                                <span className="text-[11px] font-bold text-[#F97316] truncate">Ahmed Ali (Vision)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Today's Visitors Bar Chart */}
                    <div className="flex flex-col">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/80 p-5 w-full h-full flex flex-col justify-between">
                            <div className="flex flex-col mb-4">
                                <h2 className="text-base font-bold text-slate-850 dark:text-slate-100">
                                    Today&apos;s Visitors
                                </h2>
                                <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-105 tracking-tight leading-none mt-2">
                                    {totalVisitors} Total
                                </span>
                            </div>
                            <div className="h-[180px] w-full mt-2 flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={visitors} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <XAxis dataKey="label" tickLine={false} axisLine={false}
                                            tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }} />
                                        <RechartsTooltip contentStyle={tt}
                                            formatter={(value?: number, name?: string) => [String(value ?? 0), typeof name === 'string' ? name : 'Count']} />
                                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                            {visitors.map(e => <Cell key={e.label} fill={e.color} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
