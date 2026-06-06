'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
    Glasses, AlertTriangle, Package, CheckCircle2, Clock,
    ArrowUpRight, FileText, TrendingDown, Loader2,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { readStoredUser, type StoredUser } from '@/lib/auth'

const PIE_COLORS = ['#8b5cf6','#0EA5E9','#f59e0b','#10b981','#06b6d4','#ef4444','#ec4899']

type Stats = {
    prescriptionsToday: number; lowStockCount: number
    totalItems: number; revenueToday: number
    recentPrescriptions: any[]; stockAlerts: any[]
    inventoryByType: { name: string; value: number }[]
}

const AV = ['bg-sky-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-cyan-500']

const DEMO_INVENTORY = [
    { name: 'Frames', value: 54 }, { name: 'Lenses', value: 48 }, { name: 'Others', value: 26 },
]

const STATUS_BADGES: Record<string, { cls: string; text: string }> = {
    DISPENSED:  { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-950/40 dark:text-emerald-400', text: 'Ready' },
    PENDING:    { cls: 'bg-amber-50 text-amber-700 border border-amber-200/50 dark:bg-amber-950/40 dark:text-amber-400', text: 'Pending' },
    PREPARING:  { cls: 'bg-sky-50 text-sky-700 border border-sky-200/50 dark:bg-sky-950/40 dark:text-sky-400', text: 'In Progress' },
}

export function OpticianDashboard() {
    const router = useRouter()
    const [user, setUser] = useState<StoredUser | null>(null)
    const [data, setData] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => { const u = readStoredUser(); if (!u) { router.push('/login'); return }; setUser(u) }, [router])
    const fetchData = useCallback(async () => {
        try { setData((await api.get('/dashboard/optician')).data) }
        catch (e: any) { toast.error(typeof e?.response?.data?.message === 'string' ? e.response.data.message : 'Failed to load') }
        finally { setLoading(false) }
    }, [])
    useEffect(() => { if (user) fetchData() }, [user, fetchData])

    const cards = useMemo(() => [
        { label: 'Orders Today',     value: data?.prescriptionsToday ?? 0, icon: FileText,     bgClass: 'bg-[#0891B2]' },
        { label: 'Completed',        value: Math.max((data?.prescriptionsToday ?? 0) - (data?.lowStockCount ?? 0), 0), icon: CheckCircle2, bgClass: 'bg-[#0EA5E9]' },
        { label: 'In Progress',      value: data?.lowStockCount ?? 0,      icon: Clock,        bgClass: 'bg-[#F59E0B]' },
        { label: 'Low Stock',        value: data?.totalItems ?? 0,         icon: AlertTriangle, bgClass: 'bg-[#E11D48]' },
    ], [data])

    const invData = data?.inventoryByType?.length ? data.inventoryByType : DEMO_INVENTORY
    const invTotal = invData.reduce((s, i) => s + i.value, 0)
    const tt = { backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', fontSize: 11, border: 'none', boxShadow: '0 4px 16px -4px rgba(0,0,0,.1)' }

    const getStatusBadge = (status: string, index: number) => {
        if (status === 'DISPENSED') return STATUS_BADGES.DISPENSED
        if (index % 3 === 0) return STATUS_BADGES.PREPARING
        return STATUS_BADGES.PENDING
    }

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50/50 dark:bg-slate-950/40">
                <Loader2 className="h-8 w-8 animate-spin text-[#0891B2]" />
            </div>
        )
    }

    if (!user) return null

    return (
        <div className="h-full overflow-auto bg-slate-50/50 dark:bg-slate-950/40">
            <div className="max-w-[1250px] mx-auto px-4 sm:px-6 md:px-8 py-6 space-y-6 animate-in fade-in duration-300">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                        Optician Dashboard
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Manage optical orders, lens inventory, and stock alerts.
                    </p>
                </div>

                {/* Solid Premium KPI Stat Cards */}
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

                {/* Recent Orders + Lens Inventory */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

                    {/* Recent Orders Table */}
                    <div className="lg:col-span-2 flex flex-col">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/80 p-5 flex flex-col w-full h-full">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60">
                                <h2 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                                    <Glasses className="h-4 w-4 text-[#0891B2]" /> Recent Orders
                                </h2>
                                <button onClick={() => router.push('/dashboard/prescription/optical')}
                                    className="flex items-center gap-0.5 text-xs font-semibold text-[#0891B2] hover:text-[#06798f] transition-colors">
                                    View All <ArrowUpRight className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            {!data?.recentPrescriptions?.length ? (
                                <div className="py-12 text-center text-[13px] text-slate-400 flex-1 flex items-center justify-center">No optical orders yet</div>
                            ) : (
                                <div className="overflow-x-auto w-full mt-2 flex-1">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-slate-800/40">
                                                <th className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3 pt-2 w-24">Order ID</th>
                                                <th className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3 pt-2">Customer</th>
                                                <th className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3 pt-2 hidden sm:table-cell">Type</th>
                                                <th className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3 pt-2 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
                                            {data.recentPrescriptions.slice(0, 5).map((rx: any, i: number) => {
                                                const badge = getStatusBadge(rx.status, i)
                                                return (
                                                    <tr key={rx.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                                                        <td className="py-3.5 pr-2">
                                                            <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                                                                EC-{String(rx.id).slice(-4).padStart(4, '0')}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-2">
                                                            <div className="flex items-center gap-2.5 min-w-[120px]">
                                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${AV[i % AV.length]}`}>
                                                                    {rx.appointment?.patient?.fullName?.[0]?.toUpperCase() || '?'}
                                                                </div>
                                                                <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[140px]">
                                                                    {rx.appointment?.patient?.fullName || '—'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-2 hidden sm:table-cell">
                                                            <span className="text-[12px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                                                {rx.itemName || 'Glasses'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 pl-2 text-right">
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${badge.cls}`}>
                                                                {badge.text}
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

                    {/* Lens Inventory Donut */}
                    <div className="flex flex-col">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/80 p-5 flex flex-col w-full h-full">
                            <h2 className="text-base font-bold text-slate-850 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-800/60">
                                Lens Inventory
                            </h2>
                            <div className="flex flex-col items-center justify-center flex-1 mt-4 gap-4">
                                <div className="relative w-[160px] h-[160px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={invData} cx="50%" cy="50%"
                                                innerRadius={50} outerRadius={72} paddingAngle={3}
                                                dataKey="value" startAngle={90} endAngle={-270}>
                                                {invData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />)}
                                            </Pie>
                                            <RechartsTooltip contentStyle={tt} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-3xl font-extrabold text-slate-800 dark:text-white leading-none">{invTotal}</span>
                                        <span className="text-[10px] font-semibold text-slate-400 mt-0.5">Total Items</span>
                                    </div>
                                </div>
                                <div className="w-full space-y-2.5">
                                    {invData.map((item, i) => (
                                        <div key={item.name} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                                <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300">{item.name}</span>
                                            </div>
                                            <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stock Alerts */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/80 p-5">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60">
                        <h2 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" /> Stock Alerts
                        </h2>
                        <button onClick={() => router.push('/dashboard/inventory/optical')}
                            className="flex items-center gap-0.5 text-xs font-semibold text-[#0891B2] hover:text-[#06798f] transition-colors">
                            Inventory <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <div className="mt-4">
                        {!data?.stockAlerts?.length ? (
                            <p className="py-8 text-center text-[13px] text-slate-400">All stock levels healthy</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                                {data.stockAlerts.map((item: any) => (
                                    <div key={item.id} className="flex items-center justify-between py-3 border-b last:border-0 border-slate-50 dark:border-slate-800/40">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${item.stockQuantity === 0 ? 'bg-red-50 dark:bg-red-950/20 text-red-500' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-500'}`}>
                                                <TrendingDown className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">{item.itemName}</p>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500">{item.brand || item.itemType || 'Optical Item'}</p>
                                            </div>
                                        </div>
                                        <span className={`text-sm font-bold tabular-nums shrink-0 ${item.stockQuantity === 0 ? 'text-red-500' : 'text-amber-500'}`}>
                                            {item.stockQuantity}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
