'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
    Pill, AlertTriangle, Package, DollarSign,
    ArrowUpRight, FileText, TrendingDown,
} from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    ResponsiveContainer, Tooltip as RechartsTooltip,
} from 'recharts'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { readStoredUser, type StoredUser } from '@/lib/auth'

type Stats = {
    prescriptionsToday: number; lowStockCount: number
    totalItems: number; revenueToday: number
    recentPrescriptions: any[]; stockAlerts: any[]
}

const AV = ['bg-sky-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-cyan-500']

const DEMO_SALES = [
    { month:'Jan', sales:820 }, { month:'Feb', sales:1100 }, { month:'Mar', sales:950 },
    { month:'Apr', sales:1240 }, { month:'May', sales:1080 }, { month:'Jun', sales:1350 },
]

export function PharmacistDashboard() {
    const router = useRouter()
    const [user, setUser] = useState<StoredUser | null>(null)
    const [data, setData] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => { const u = readStoredUser(); if (!u) { router.push('/login'); return }; setUser(u) }, [router])
    const fetchData = useCallback(async () => {
        try { setData((await api.get('/dashboard/pharmacist')).data) }
        catch (e: any) { toast.error(typeof e?.response?.data?.message === 'string' ? e.response.data.message : 'Failed to load') }
        finally { setLoading(false) }
    }, [])
    useEffect(() => { if (user) fetchData() }, [user, fetchData])

    const cards = useMemo(() => [
        { label: 'Prescriptions Today', value: data?.prescriptionsToday ?? 0, icon: FileText,      color: 'bg-sky-500' },
        { label: 'Medicines Sold',       value: data?.totalItems ?? 0,         icon: Pill,           color: 'bg-violet-500' },
        { label: 'Low Stock',            value: data?.lowStockCount ?? 0,      icon: AlertTriangle,  color: 'bg-red-500' },
        { label: 'Revenue',              value: `$${(data?.revenueToday ?? 0).toLocaleString()}`, icon: DollarSign, color: 'bg-emerald-500' },
    ], [data])

    const tt = { backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', fontSize: 11, border: 'none', boxShadow: '0 4px 16px -4px rgba(0,0,0,.1)' }
    if (!user) return null

    return (
        <div className="h-full overflow-auto">
            <div className="max-w-[1200px] mx-auto px-3 sm:px-5 py-4 space-y-4">

                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white">
                    Pharmacy Overview
                </h1>

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

                {/* Prescriptions + Stock Alerts */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

                    {/* Recent Prescriptions */}
                    <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <Pill className="h-3.5 w-3.5 text-sky-500" /> Recent Prescriptions
                            </h2>
                            <button onClick={() => router.push('/dashboard/prescriptions')}
                                className="flex items-center gap-0.5 text-[11px] font-semibold text-sky-500 hover:text-sky-600 transition-colors">
                                View All <ArrowUpRight className="h-3 w-3" />
                            </button>
                        </div>
                        {!data?.recentPrescriptions?.length ? (
                            <div className="py-8 text-center text-[13px] text-slate-400">No pharmacy prescriptions yet</div>
                        ) : (
                            <div className="px-4 py-2">
                                {data.recentPrescriptions.map((rx: any, i: number) => (
                                    <div key={rx.id} className="flex items-center gap-2.5 py-2 border-b last:border-0 border-slate-50 dark:border-slate-800/50">
                                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${AV[i % AV.length]}`}>
                                            {rx.appointment?.patient?.fullName?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">{rx.appointment?.patient?.fullName || '—'}</span>
                                        <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                                        <span className="text-[13px] text-slate-500 dark:text-slate-400">Qty {rx.quantity}</span>
                                        <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                                        <span className="text-[12px] text-slate-400 truncate">{rx.instructions || '—'}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Stock Alerts */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Stock Alerts
                            </h2>
                            <button onClick={() => router.push('/dashboard/inventory/pharmacy')}
                                className="flex items-center gap-0.5 text-[11px] font-semibold text-sky-500 hover:text-sky-600 transition-colors">
                                Inventory <ArrowUpRight className="h-3 w-3" />
                            </button>
                        </div>
                        <div className="px-3 py-2">
                            {!data?.stockAlerts?.length ? (
                                <p className="py-6 text-center text-[13px] text-slate-400">All stock levels healthy</p>
                            ) : data.stockAlerts.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-2.5 py-2 border-b last:border-0 border-slate-50 dark:border-slate-800/50">
                                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${item.stockQuantity === 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-500' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-500'}`}>
                                        <TrendingDown className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">{item.itemName}</p>
                                        <p className="text-[10px] text-slate-400">{item.itemType || 'General'}</p>
                                    </div>
                                    <span className={`text-sm font-bold tabular-nums ${item.stockQuantity === 0 ? 'text-red-500' : 'text-amber-500'}`}>
                                        {item.stockQuantity}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Monthly Sales Chart */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Monthly Sales</h2>
                    </div>
                    <div className="px-2 pb-3 pt-3 h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={DEMO_SALES} margin={{ top:4, right:12, left:-24, bottom:0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="month" tickLine={false} axisLine={false}
                                    tick={{ fill:'hsl(var(--muted-foreground))', fontSize:10, fontWeight:600 }} />
                                <YAxis tickLine={false} axisLine={false}
                                    tick={{ fill:'hsl(var(--muted-foreground))', fontSize:10 }} />
                                <RechartsTooltip contentStyle={tt} formatter={(v: unknown) => [`$${v}`, 'Sales']} />
                                <Bar dataKey="sales" fill="#0EA5E9" radius={[4,4,0,0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    )
}
