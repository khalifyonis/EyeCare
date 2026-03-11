'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Calendar, UserPlus, Clock, Users,
    ArrowUpRight, Receipt, AlertCircle, CheckCircle2,
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

const STATUS: Record<string, { dot: string; text: string }> = {
    PENDING:   { dot: 'bg-amber-400',   text: 'text-amber-600 dark:text-amber-400' },
    COMPLETED: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
    CANCELLED: { dot: 'bg-red-500',     text: 'text-red-500' },
}

const AV = ['bg-sky-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-cyan-500']

export function ReceptionistDashboard() {
    const router = useRouter()
    const [user, setUser] = useState<StoredUser | null>(null)
    const [data, setData] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => { const u = readStoredUser(); if (!u) { router.push('/login'); return }; setUser(u) }, [router])
    const fetchData = useCallback(async () => {
        try { setData((await api.get('/dashboard/receptionist')).data) }
        catch (e: any) { toast.error(typeof e?.response?.data?.message === 'string' ? e.response.data.message : 'Failed to load') }
        finally { setLoading(false) }
    }, [])
    useEffect(() => { if (user) fetchData() }, [user, fetchData])

    const cards = useMemo(() => [
        { label: 'Appointments Today', value: data?.appointmentsToday ?? 0, icon: Calendar,    color: 'bg-sky-500' },
        { label: 'Walk-Ins',           value: Math.max((data?.appointmentsToday ?? 0) - (data?.newPatientsToday ?? 0), 0), icon: UserPlus, color: 'bg-violet-500' },
        { label: 'Checked In',         value: data?.completedToday ?? 0,    icon: CheckCircle2, color: 'bg-emerald-500' },
        { label: 'Pending',            value: data?.pendingToday ?? 0,      icon: Clock,        color: 'bg-amber-500' },
    ], [data])

    const visitors = useMemo(() => [
        { label: 'Walk-ins',      value: Math.max((data?.appointmentsToday ?? 0) - (data?.newPatientsToday ?? 0), 0), color: '#0EA5E9' },
        { label: 'New Patients',  value: data?.newPatientsToday ?? 0, color: '#8b5cf6' },
        { label: 'Completed',     value: data?.completedToday ?? 0,   color: '#10b981' },
    ], [data])

    const quickActions = [
        { label: 'Register Patient', icon: UserPlus, href: '/dashboard/patients',     color: 'bg-emerald-500 hover:bg-emerald-600' },
        { label: 'Book Appointment',  icon: Calendar, href: '/dashboard/appointments', color: 'bg-sky-500 hover:bg-sky-600' },
        { label: 'Print Receipt',     icon: Receipt,  href: '/dashboard/billing',      color: 'bg-violet-500 hover:bg-violet-600' },
    ]

    const tt = { backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', fontSize: 11, border: 'none', boxShadow: '0 4px 16px -4px rgba(0,0,0,.1)' }
    if (!user) return null

    return (
        <div className="h-full overflow-auto">
            <div className="max-w-[1200px] mx-auto px-3 sm:px-5 py-4 space-y-4">

                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white">
                        Good Morning, {user.fullName?.split(' ')[0] || 'Receptionist'}
                    </h1>
                    {data && data.unpaidBillings > 0 && (
                        <button onClick={() => router.push('/dashboard/billing')}
                            className="flex items-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-1.5 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors">
                            <AlertCircle className="h-3.5 w-3.5" /> {data.unpaidBillings} Unpaid
                        </button>
                    )}
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {cards.map(c => (
                        <div key={c.label} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 px-4 py-3.5">
                            <div className="flex items-center gap-1.5 mb-1">
                                <div className={`h-[22px] w-[22px] rounded-md flex items-center justify-center ${c.color}`}>
                                    <c.icon className="h-3 w-3 text-white" />
                                </div>
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide truncate">{c.label}</p>
                            </div>
                            <p className="text-2xl font-extrabold text-slate-800 dark:text-white tabular-nums leading-none">
                                {loading ? '…' : c.value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Queue + Quick Actions */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

                    {/* Today's Queue */}
                    <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-sky-500" /> Today&apos;s Queue
                            </h2>
                            <button onClick={() => router.push('/dashboard/appointments')}
                                className="flex items-center gap-0.5 text-[11px] font-semibold text-sky-500 hover:text-sky-600 transition-colors">
                                View All <ArrowUpRight className="h-3 w-3" />
                            </button>
                        </div>
                        {!data?.todayQueue?.length ? (
                            <div className="py-8 text-center text-sm text-slate-400">No appointments in queue</div>
                        ) : (
                            <table className="w-full text-[13px]">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                        <th className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 px-4 py-2 w-8">#</th>
                                        <th className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-2">Patient</th>
                                        <th className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-2">Time</th>
                                        <th className="text-right text-[10px] font-bold uppercase tracking-wider text-slate-400 px-4 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.todayQueue.map((a: any, i: number) => {
                                        const s = STATUS[a.status] ?? STATUS.PENDING
                                        return (
                                            <tr key={a.id} className="border-b last:border-0 border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                                                <td className="px-4 py-2.5 font-bold text-slate-400 tabular-nums">{String(i+1).padStart(2,'0')}</td>
                                                <td className="px-2 py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${AV[i % AV.length]}`}>
                                                            {a.patient?.fullName?.[0]?.toUpperCase() || '?'}
                                                        </div>
                                                        <span className="font-semibold text-slate-700 dark:text-slate-100 truncate">{a.patient?.fullName || '—'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2.5 font-semibold text-slate-500 tabular-nums">
                                                    {new Date(a.appointmentDate).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                                                </td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <span className={`h-[7px] w-[7px] rounded-full ${s.dot}`} />
                                                        <span className={`text-[12px] font-semibold ${s.text}`}>{a.status}</span>
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Quick Actions</h2>
                        </div>
                        <div className="p-3 space-y-2">
                            {quickActions.map(a => (
                                <button key={a.label} onClick={() => router.push(a.href)}
                                    className={`flex items-center gap-2.5 w-full ${a.color} text-white rounded-lg px-3.5 py-2.5 text-[13px] font-bold transition-all shadow-sm hover:shadow-md`}>
                                    <a.icon className="h-4 w-4" /> {a.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Visitors Chart + Recent Patients */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Today&apos;s Visitors</h2>
                        </div>
                        <div className="px-2 pb-3 pt-3 h-[160px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={visitors} margin={{ top:4, right:8, left:-10, bottom:10 }}>
                                    <XAxis dataKey="label" tickLine={false} axisLine={false}
                                        tick={{ fill:'hsl(var(--muted-foreground))', fontSize:10, fontWeight:600 }} />
                                    <RechartsTooltip contentStyle={tt}
                                        formatter={(value?: number, name?: string) => [String(value ?? 0), typeof name === 'string' ? name : 'Count']} />
                                    <Bar dataKey="value" radius={[5,5,0,0]}>
                                        {visitors.map(e => <Cell key={e.label} fill={e.color} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5 text-sky-500" /> Recent Patients
                            </h2>
                            <button onClick={() => router.push('/dashboard/patients')}
                                className="flex items-center gap-0.5 text-[11px] font-semibold text-sky-500 hover:text-sky-600 transition-colors">
                                View All <ArrowUpRight className="h-3 w-3" />
                            </button>
                        </div>
                        <div className="px-3 py-2">
                            {!data?.recentPatients?.length ? (
                                <p className="py-6 text-center text-[13px] text-slate-400">No patients registered yet</p>
                            ) : data.recentPatients.map((p: any, i: number) => (
                                <div key={p.id} className="flex items-center gap-2.5 py-2 border-b last:border-0 border-slate-50 dark:border-slate-800/50">
                                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${AV[(i+3) % AV.length]}`}>
                                        {p.fullName?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">{p.fullName}</p>
                                        <p className="text-[10px] text-slate-400">{p.phone || '—'}</p>
                                    </div>
                                    <span className="text-[10px] text-slate-400 tabular-nums shrink-0">{new Date(p.createdAt).toLocaleDateString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
