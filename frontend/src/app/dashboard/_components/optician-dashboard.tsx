'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
    Glasses, AlertTriangle, Package, DollarSign,
    ArrowUpRight, FileText, TrendingDown,
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
    { name: 'Frames', value: 54 }, { name: 'Lenses', value: 45 }, { name: 'Others', value: 29 },
]

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
        { label: 'Orders Today',   value: data?.prescriptionsToday ?? 0, icon: FileText,     color: 'bg-sky-500' },
        { label: 'In Progress',    value: Math.max((data?.prescriptionsToday ?? 0) - (data?.lowStockCount ?? 0), 0), icon: Package, color: 'bg-violet-500' },
        { label: 'Ready for Pickup', value: data?.lowStockCount ?? 0,     icon: Glasses,       color: 'bg-emerald-500' },
        { label: 'Low Stock',       value: data?.lowStockCount ?? 0,      icon: AlertTriangle, color: 'bg-red-500' },
    ], [data])

    const invData = data?.inventoryByType?.length ? data.inventoryByType : DEMO_INVENTORY
    const invTotal = invData.reduce((s, i) => s + i.value, 0)
    const tt = { backgroundColor: 'hsl(var(--popover))', borderRadius: '8px', fontSize: 11, border: 'none', boxShadow: '0 4px 16px -4px rgba(0,0,0,.1)' }

    if (!user) return null

    return (
        <div className="h-full overflow-auto">
            <div className="max-w-[1200px] mx-auto px-3 sm:px-5 py-4 space-y-4">

                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white">
                    Optician Dashboard
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

                {/* Orders + Lens Inventory */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

                    {/* Recent Orders */}
                    <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <Glasses className="h-3.5 w-3.5 text-sky-500" /> Recent Orders
                            </h2>
                            <button onClick={() => router.push('/dashboard/prescriptions')}
                                className="flex items-center gap-0.5 text-[11px] font-semibold text-sky-500 hover:text-sky-600 transition-colors">
                                View All <ArrowUpRight className="h-3 w-3" />
                            </button>
                        </div>
                        {!data?.recentPrescriptions?.length ? (
                            <div className="py-8 text-center text-[13px] text-slate-400">No optical orders yet</div>
                        ) : (
                            <table className="w-full text-[13px]">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                        <th className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 px-4 py-2">Patient</th>
                                        <th className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-2">Qty</th>
                                        <th className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-2 hidden sm:table-cell">Instructions</th>
                                        <th className="text-right text-[10px] font-bold uppercase tracking-wider text-slate-400 px-4 py-2">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.recentPrescriptions.map((rx: any, i: number) => (
                                        <tr key={rx.id} className="border-b last:border-0 border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${AV[i % AV.length]}`}>
                                                        {rx.appointment?.patient?.fullName?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <span className="font-semibold text-slate-700 dark:text-slate-100 truncate">{rx.appointment?.patient?.fullName || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-2.5 font-semibold text-slate-500 tabular-nums">{rx.quantity}</td>
                                            <td className="px-2 py-2.5 text-slate-400 truncate max-w-[120px] hidden sm:table-cell">{rx.instructions || '—'}</td>
                                            <td className="px-4 py-2.5 text-right text-[11px] text-slate-400 tabular-nums">
                                                {new Date(rx.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Lens Inventory Donut */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Lens Inventory</h2>
                        </div>
                        <div className="flex flex-col items-center justify-center flex-1 px-4 py-4 gap-3">
                            <div className="relative w-[150px] h-[150px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={invData} cx="50%" cy="50%"
                                            innerRadius={48} outerRadius={68} paddingAngle={3}
                                            dataKey="value" startAngle={90} endAngle={-270}>
                                            {invData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />)}
                                        </Pie>
                                        <RechartsTooltip contentStyle={tt} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-extrabold text-slate-800 dark:text-white leading-none">{invTotal}</span>
                                    <span className="text-[10px] text-slate-400 mt-0.5">Total Items</span>
                                </div>
                            </div>
                            <div className="w-full space-y-2">
                                {invData.map((item, i) => (
                                    <div key={item.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                            <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300">{item.name}</span>
                                        </div>
                                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stock Alerts */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Stock Alerts
                        </h2>
                        <button onClick={() => router.push('/dashboard/inventory/optical')}
                            className="flex items-center gap-0.5 text-[11px] font-semibold text-sky-500 hover:text-sky-600 transition-colors">
                            Inventory <ArrowUpRight className="h-3 w-3" />
                        </button>
                    </div>
                    <div className="px-4 py-2">
                        {!data?.stockAlerts?.length ? (
                            <p className="py-6 text-center text-[13px] text-slate-400">All stock levels healthy</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                                {data.stockAlerts.map((item: any) => (
                                    <div key={item.id} className="flex items-center gap-2.5 py-2 border-b last:border-0 border-slate-50 dark:border-slate-800/50">
                                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${item.stockQuantity === 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-500' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-500'}`}>
                                            <TrendingDown className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">{item.itemName}</p>
                                            <p className="text-[10px] text-slate-400">{item.brand || item.itemType || 'General'}</p>
                                        </div>
                                        <span className={`text-sm font-bold tabular-nums ${item.stockQuantity === 0 ? 'text-red-500' : 'text-amber-500'}`}>
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
