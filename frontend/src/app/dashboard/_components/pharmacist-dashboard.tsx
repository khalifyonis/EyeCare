'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
    Pill, AlertTriangle, Package, DollarSign,
    ArrowUpRight, FileText, TrendingDown, CalendarX, Loader2
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
    expiringItems?: any[]; expiringCount?: number
}

const AV = ['bg-sky-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500']

const DEMO_SALES = [
    { month: 'Jan', sales: 820 }, { month: 'Feb', sales: 1100 }, { month: 'Mar', sales: 950 },
    { month: 'Apr', sales: 1240 }, { month: 'May', sales: 1080 }, { month: 'Jun', sales: 1350 },
]

export function PharmacistDashboard() {
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
            setData((await api.get('/dashboard/pharmacist')).data)
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
            label: 'Prescriptions Today', 
            value: data?.prescriptionsToday ?? 0, 
            icon: FileText, 
            bgClass: 'bg-[#0EA5E9]'
        },
        { 
            label: 'Medicines Sold', 
            value: data?.totalItems ?? 0, 
            icon: Pill, 
            bgClass: 'bg-[#6366F1]'
        },
        { 
            label: 'Low Stock', 
            value: data?.lowStockCount ?? 0, 
            icon: AlertTriangle, 
            bgClass: 'bg-[#EC4899]'
        },
        { 
            label: 'Revenue', 
            value: `$${(data?.revenueToday ?? 0).toLocaleString()}`, 
            icon: DollarSign, 
            bgClass: 'bg-[#F97316]'
        },
    ], [data])

    // Shorten long prescription instruction strings into compact, human-friendly parts.
    const shortenInstructions = (raw?: string | null) => {
        if (!raw) return '—'
        const parts = raw.split('|').map(p => p.trim()).filter(Boolean)
        const out: string[] = []

        for (const p of parts) {
            const lower = p.toLowerCase()
            if (lower.startsWith('dosage')) {
                const v = p.split(':').slice(1).join(':').trim()
                if (v) out.push(v)
                continue
            }
            if (lower.startsWith('frequency')) {
                const v = p.split(':').slice(1).join(':').trim()
                if (v) {
                    const sh = v.replace(/twice\s+daily/i, '2x/day')
                                .replace(/once\s+daily/i, '1x/day')
                                .replace(/three\s+times\s+daily/i, '3x/day')
                                .replace(/four\s+times\s+daily/i, '4x/day')
                                .replace(/nightly/i, 'nightly')
                    out.push(sh)
                }
                continue
            }
            if (lower.startsWith('duration')) {
                const v = p.split(':').slice(1).join(':').trim()
                if (v) {
                    const num = v.match(/(\d+)/)
                    if (num) {
                        const isWeek = v.toLowerCase().includes('week')
                        const isMonth = v.toLowerCase().includes('month')
                        const unit = isWeek ? 'w' : (isMonth ? 'mo' : 'd')
                        out.push(`${num[1]}${unit}`)
                    } else {
                        out.push(v)
                    }
                }
                continue
            }
            if (lower.startsWith('eye')) {
                const v = p.split(':').slice(1).join(':').trim()
                if (v && v.toUpperCase() !== 'N/A') {
                    out.push(v.toUpperCase())
                }
                continue
            }
        }

        if (out.length) return out.join(' • ')
        return raw.length > 25 ? raw.slice(0, 22) + '...' : raw
    }

    const getStatusBadge = (status: string, index: number) => {
        if (status === 'DISPENSED') {
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50 shrink-0">
                    Prepared
                </span>
            )
        }
        if (index % 2 === 0) {
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 shrink-0">
                    Pending
                </span>
            )
        } else {
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200/50 shrink-0">
                    Preparing
                </span>
            )
        }
    }

    const getStockLevelBadge = (qty: number, reorderLevel: number) => {
        if (qty === 0) {
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200/40 dark:bg-red-950/30 dark:text-red-400 shrink-0">
                    Low
                </span>
            )
        }
        if (qty <= reorderLevel / 2) {
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200/40 dark:bg-red-950/30 dark:text-red-400 shrink-0">
                    Low
                </span>
            )
        }
        if (qty <= reorderLevel) {
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200/40 dark:bg-amber-950/30 dark:text-amber-400 shrink-0">
                    Medium
                </span>
            )
        }
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/40 dark:bg-emerald-950/30 dark:text-emerald-400 shrink-0">
                Normal
            </span>
        )
    }

    const tt = { backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', fontSize: 11, border: 'none', boxShadow: '0 4px 16px -4px rgba(0,0,0,.1)' }

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50/50 dark:bg-slate-950/40">
                <Loader2 className="h-8 w-8 animate-spin text-[#0EA5E9]" />
            </div>
        )
    }

    if (!user) return null

    return (
        <div className="h-full overflow-auto bg-slate-50/50 dark:bg-slate-950/40">
            <div className="max-w-[1250px] mx-auto px-4 sm:px-6 md:px-8 py-6 space-y-6 animate-in fade-in duration-300">
                
                {/* Header Title */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                        Pharmacy Overview
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Real-time prescription tracking, sales metrics, and stock alerts.
                    </p>
                </div>

                {/* Solid Premium Stat Cards (Vibrant, matching Eye Surgery page style) */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-5">
                    {cards.map(c => (
                        <div key={c.label} className={`${c.bgClass} text-white rounded-2xl p-6 shadow-md hover:shadow-lg hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[120px]`}>
                            <div className="flex justify-between items-start">
                                <span className="text-sm font-semibold opacity-90 tracking-wide">
                                    {c.label}
                                </span>
                                <c.icon className="h-6 w-6 opacity-80" />
                            </div>
                            <div className="text-3.5xl font-extrabold tracking-tight mt-4 leading-none">
                                {c.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Prescriptions + Stock Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Recent Prescriptions Table */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/80 p-5 flex flex-col">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60">
                            <h2 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                                <Pill className="h-4 w-4 text-[#0EA5E9]" /> Recent Prescriptions
                            </h2>
                            <button onClick={() => router.push('/dashboard/prescription/medicine')}
                                className="flex items-center gap-0.5 text-xs font-semibold text-[#0EA5E9] hover:text-[#0c96d4] transition-colors">
                                View All <ArrowUpRight className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        
                        {!data?.recentPrescriptions?.length ? (
                            <div className="py-12 text-center text-[13px] text-slate-400">No pharmacy prescriptions created today</div>
                        ) : (
                            <div className="overflow-x-auto w-full mt-2">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-800/40">
                                            <th className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3 pt-2">Patient</th>
                                            <th className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3 pt-2">Medicines</th>
                                            <th className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3 pt-2">Qty</th>
                                            <th className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3 pt-2 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
                                        {data.recentPrescriptions.map((rx: any, i: number) => (
                                            <tr key={rx.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                                                <td className="py-3.5 pr-2">
                                                    <div className="flex items-center gap-2.5 min-w-[140px]">
                                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${AV[i % AV.length]}`}>
                                                            {rx.appointment?.patient?.fullName?.[0]?.toUpperCase() || '?'}
                                                        </div>
                                                        <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
                                                            {rx.appointment?.patient?.fullName || '—'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-2">
                                                    <div className="flex items-center gap-2 min-w-[170px]">
                                                        <span className="h-2 w-2 rounded-full bg-[#0EA5E9] shrink-0" />
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[155px]">
                                                                {rx.itemName || 'Medicine'}
                                                            </span>
                                                            <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[155px]">
                                                                {shortenInstructions(rx.instructions)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-2">
                                                    <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-400">
                                                        {rx.quantity} {rx.quantity > 1 ? 'Boxes' : 'Box'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 pl-2 text-right">
                                                    {getStatusBadge(rx.status, i)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Stock Alerts Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/80 p-5 flex flex-col">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60">
                            <h2 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-500" /> Stock Alerts
                            </h2>
                            <button onClick={() => router.push('/dashboard/inventory/pharmacy')}
                                className="flex items-center gap-0.5 text-xs font-semibold text-[#0EA5E9] hover:text-[#0c96d4] transition-colors">
                                Inventory <ArrowUpRight className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <div className="space-y-3.5 mt-4 flex-1 overflow-auto">
                            {!data?.stockAlerts?.length ? (
                                <p className="py-8 text-center text-[13px] text-slate-400">All stock levels healthy</p>
                            ) : data.stockAlerts.map((item: any) => (
                                <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0 border-slate-50 dark:border-slate-800/40">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="h-8 w-8 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-500 flex items-center justify-center shrink-0">
                                            <TrendingDown className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">{item.itemName}</p>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500">{item.itemType || 'Pharmacy Item'}</p>
                                        </div>
                                    </div>
                                    {getStockLevelBadge(item.stockQuantity, item.reorderLevel)}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Monthly Sales Area/Bar Chart */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/80 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-slate-850 dark:text-slate-100">Monthly Sales</h2>
                    </div>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={DEMO_SALES} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.2}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800/40" />
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }} />
                                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                                <RechartsTooltip contentStyle={tt} formatter={(v: unknown) => [`$${v}`, 'Sales']} />
                                <Bar dataKey="sales" fill="url(#colorSales)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Expiring Items Section */}
                {(data?.expiringCount ?? 0) > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-orange-200 dark:border-orange-900/30 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-orange-100 dark:border-orange-900/20 bg-orange-50/40 dark:bg-orange-950/10">
                            <h2 className="text-sm font-bold text-orange-700 dark:text-orange-355 flex items-center gap-1.5">
                                <CalendarX className="h-4 w-4" /> Expiring Within 30 Days ({data?.expiringCount})
                            </h2>
                            <button onClick={() => router.push('/dashboard/inventory/pharmacy')}
                                className="flex items-center gap-0.5 text-xs font-semibold text-[#0EA5E9] hover:text-[#0c96d4] transition-colors">
                                Inventory <ArrowUpRight className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <div className="px-5 py-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                                {data?.expiringItems?.map((item: any) => {
                                    const daysLeft = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / 86400000)
                                    return (
                                        <div key={item.id} className="flex items-center justify-between py-2.5 border-b last:border-0 border-slate-50 dark:border-slate-800/40">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${daysLeft <= 7 ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
                                                    <CalendarX className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">{item.itemName}</p>
                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(item.expiryDate).toLocaleDateString()} · {item.stockQuantity} left</p>
                                                </div>
                                            </div>
                                            <span className={`text-xs font-bold tabular-nums shrink-0 ${daysLeft <= 7 ? 'text-red-500' : 'text-orange-550'}`}>
                                                {daysLeft}d left
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
