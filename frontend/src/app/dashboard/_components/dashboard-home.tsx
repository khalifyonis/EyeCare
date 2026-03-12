'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    type ColumnDef,
} from '@tanstack/react-table'
import {
    Users, Calendar, Eye,
    TrendingUp, TrendingDown, ArrowUpRight, UserPlus, CalendarCheck, AlertTriangle, Package,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableRow,
} from '@/components/ui/table'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { readStoredUser, type StoredUser } from '@/lib/auth'
import { resolveActiveBranch } from '@/lib/branches'

type DueFollowUp = {
    id: string
    dueDate: string
    sourceType: string
    patient?: { id: string; fullName: string | null; phone?: string | null } | null
    branch?: { branchName: string } | null
}

type AlertItem = {
    id: string
    itemName: string
    itemType?: string | null
    stockQuantity: number
    reorderLevel?: number
    expiryDate?: string | null
    category?: 'pharmacy' | 'optical'
}

type InventoryAlerts = {
    pharmacyLowStockCount: number
    opticalLowStockCount: number
    pharmacyLowStock: AlertItem[]
    opticalLowStock: AlertItem[]
    expiringPharmacy: AlertItem[]
    expiringCount: number
}

type DashboardStats = {
    totalPatients: number
    appointmentsToday: number
    totalDoctors: number
    totalExams: number
    dueFollowUps?: DueFollowUp[]
    overdueFollowUpsCount?: number
    inventoryAlerts?: InventoryAlerts
}

const initialStats: DashboardStats = {
    totalPatients: 0,
    appointmentsToday: 0,
    totalDoctors: 0,
    totalExams: 0,
    dueFollowUps: [],
    overdueFollowUpsCount: 0,
    inventoryAlerts: undefined,
}

const revenueData = [
    { month: 'Jan', revenue: 4000, appointments: 240, exams: 180 },
    { month: 'Feb', revenue: 3000, appointments: 139, exams: 120 },
    { month: 'Mar', revenue: 5000, appointments: 380, exams: 220 },
    { month: 'Apr', revenue: 4780, appointments: 390, exams: 200 },
    { month: 'May', revenue: 5890, appointments: 480, exams: 280 },
    { month: 'Jun', revenue: 4390, appointments: 380, exams: 230 },
    { month: 'Jul', revenue: 4490, appointments: 430, exams: 250 },
    { month: 'Aug', revenue: 5200, appointments: 490, exams: 300 },
    { month: 'Sep', revenue: 6800, appointments: 560, exams: 340 },
    { month: 'Oct', revenue: 7100, appointments: 610, exams: 380 },
    { month: 'Nov', revenue: 9200, appointments: 720, exams: 450 },
    { month: 'Dec', revenue: 8900, appointments: 690, exams: 420 },
]

const serviceData = [
    { name: 'Contacts', value: 35, count: 449, color: '#f59e0b' },
    { name: 'Eye Exams', value: 25, count: 321, color: '#8b5cf6' },
    { name: 'Follow-up', value: 20, count: 257, color: '#0EA5E9' },
    { name: 'Glasses', value: 12, count: 154, color: '#06b6d4' },
    { name: 'Surgery', value: 8, count: 103, color: '#10b981' },
]

const mainRecentPatients = [
    { id: '1', name: 'Ahmed Ali', visit: 'Eye Exam', status: 'Completed', time: '10:00 AM', avatar: 'A' },
    { id: '2', name: 'Sarah Omer', visit: 'Follow up', status: 'In Progress', time: '11:30 AM', avatar: 'S' },
    { id: '3', name: 'Mohamed Hassan', visit: 'Consultation', status: 'Waiting', time: '2:00 PM', avatar: 'M' },
    { id: '4', name: 'Fatima Yusuf', visit: 'Glasses Fitting', status: 'Scheduled', time: '3:30 PM', avatar: 'F' },
]

const branchRecentPatients = [
    { id: '1', name: 'Asha Noor', visit: 'Consultation', status: 'Scheduled', time: '9:00 AM', avatar: 'A' },
    { id: '2', name: 'Ibrahim Aden', visit: 'Eye Test', status: 'Waiting', time: '11:00 AM', avatar: 'I' },
    { id: '3', name: 'Hodan Ali', visit: 'Follow up', status: 'In Progress', time: '1:15 PM', avatar: 'H' },
    { id: '4', name: 'Abdirahman Yusuf', visit: 'Review', status: 'Completed', time: '4:00 PM', avatar: 'A' },
]

const mainTopDoctors = [
    { name: 'Dr. Amina', specialty: 'Ophthalmology', rating: 4.9, patients: 142 },
    { name: 'Dr. Yusuf', specialty: 'Optometry', rating: 4.8, patients: 128 },
    { name: 'Dr. Hana', specialty: 'Retina', rating: 4.7, patients: 115 },
    { name: 'Dr. Ali', specialty: 'Pediatric', rating: 4.6, patients: 98 },
]

const branchTopDoctors = [
    { name: 'Dr. Rahma', specialty: 'General Eye Care', rating: 4.9, patients: 74 },
    { name: 'Dr. Osman', specialty: 'Cornea', rating: 4.8, patients: 69 },
    { name: 'Dr. Najma', specialty: 'Optometry', rating: 4.7, patients: 63 },
    { name: 'Dr. Bashir', specialty: 'Glaucoma', rating: 4.6, patients: 58 },
]

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    Completed: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-500' },
    'In Progress': { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-800 dark:text-blue-300', dot: 'bg-blue-500' },
    Waiting: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-800 dark:text-amber-300', dot: 'bg-amber-500' },
    Scheduled: { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-800 dark:text-violet-300', dot: 'bg-violet-500' },
}

function DonutLegend() {
    return (
        <div className="pt-1 space-y-1">
            {serviceData.map((item) => (
                <div key={item.name} className="grid items-center gap-x-2" style={{ gridTemplateColumns: '12px 1fr 45px 45px' }}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] font-semibold text-foreground/80 truncate">{item.name}</span>
                    <span className="text-[10px] font-bold text-muted-foreground tabular-nums text-right">{item.count}</span>
                    <span className="text-[10px] font-black tabular-nums text-right" style={{ color: item.color }}>{item.value}%</span>
                </div>
            ))}
        </div>
    )
}

export function DashboardHome() {
    const router = useRouter()
    const [user, setUser] = useState<StoredUser | null>(null)
    const [stats, setStats] = useState<DashboardStats>(initialStats)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const storedUser = readStoredUser()
        if (!storedUser) {
            router.push('/login')
            return
        }

        const activeBranch = resolveActiveBranch(storedUser)
        const nextUser = activeBranch ? { ...storedUser, activeBranch } : storedUser
        setUser(nextUser)

        if (activeBranch?.id) {
            localStorage.setItem('activeBranchId', activeBranch.id)
            localStorage.setItem('user', JSON.stringify(nextUser))
        }
    }, [router])

    const fetchDashboardStats = useCallback(async (showToast = false) => {
        try {
            const response = await api.get('/dashboard/stats')
            setStats({
                totalPatients: Number(response.data?.totalPatients || 0),
                appointmentsToday: Number(response.data?.appointmentsToday || 0),
                totalDoctors: Number(response.data?.totalDoctors || 0),
                totalExams: Number(response.data?.totalExams || 0),
                dueFollowUps: Array.isArray(response.data?.dueFollowUps) ? response.data.dueFollowUps : [],
                overdueFollowUpsCount: Number(response.data?.overdueFollowUpsCount ?? 0),
                inventoryAlerts: response.data?.inventoryAlerts,
            })
            if (showToast) toast.success('Dashboard refreshed')
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to load dashboard data')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (!user) return
        fetchDashboardStats()
    }, [user, fetchDashboardStats])

    const isMainBranch = useMemo(() => {
        const branchName = String(user?.activeBranch?.branchName || '').toLowerCase()
        return branchName.includes('main') || !branchName
    }, [user])

    const recentPatientsData = useMemo(() => (isMainBranch ? mainRecentPatients : branchRecentPatients), [isMainBranch])
    const topDoctors = useMemo(() => (isMainBranch ? mainTopDoctors : branchTopDoctors), [isMainBranch])

    const patientColumns = useMemo<ColumnDef<(typeof recentPatientsData)[number]>[]>(() => [
        {
            accessorKey: 'name',
            cell: ({ row }) => {
                const patient = row.original
                return (
                    <div className="flex items-center gap-3 group px-1">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0EA5E9]/10 text-xs font-black text-[#0EA5E9] group-hover:scale-105 transition-transform">
                            {patient.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate tracking-tight">{patient.name}</p>
                            <p className="text-xs text-muted-foreground/70 font-medium">{patient.visit}</p>
                            <p className="text-[10px] text-muted-foreground/60 font-medium mt-0.5 uppercase tracking-widest">{patient.time}</p>
                        </div>
                    </div>
                )
            },
        },
        {
            accessorKey: 'status',
            cell: ({ row }) => {
                const status = row.original.status
                const styleConfig = statusConfig[status] ?? statusConfig.Scheduled
                return (
                    <div className="flex justify-end">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${styleConfig.bg} ${styleConfig.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${styleConfig.dot}`} />
                            {status}
                        </span>
                    </div>
                )
            },
        },
    ], [recentPatientsData])

    const table = useReactTable({
        data: recentPatientsData,
        columns: patientColumns,
        getCoreRowModel: getCoreRowModel(),
    })

    const statCards = [
        { title: 'Total Patients', value: stats.totalPatients, trend: '+12.5%', up: true, icon: Users, gradient: 'from-violet-600 to-indigo-600' },
        { title: 'Appointments Today', value: stats.appointmentsToday, trend: '+3', up: true, icon: Calendar, gradient: 'from-cyan-500 to-[#0EA5E9]' },
        { title: 'Doctors', value: stats.totalDoctors, trend: '+8.3%', up: true, icon: Users, gradient: 'from-emerald-500 to-teal-600' },
        // Last card uses a warmer, near-red gradient like the sample dashboard
        { title: 'Clinical Exams', value: stats.totalExams, trend: '-2.1%', up: false, icon: Eye, gradient: 'from-rose-500 to-red-500' },
    ]

    const totalPatientsForDonut = serviceData.reduce((sum, item) => sum + item.count, 0)
    const tooltipStyle = {
        backgroundColor: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: '8px',
        color: 'hsl(var(--foreground))',
        fontSize: '12px',
    }

    if (!user) return null

    return (
        <div className="flex-1 overflow-auto min-w-0 bg-muted/30 dark:bg-background/50">
            <div className="max-w-[1600px] mx-auto w-full min-w-0">
                <div className="px-6 lg:px-8 pb-8 pt-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                        {statCards.map((card, index) => (
                            <div
                                key={card.title}
                                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-5 text-white shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 group`}
                                style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
                            >
                                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700" />

                                <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-bold text-white/80 uppercase tracking-widest">{card.title}</p>
                                            <p className="text-3xl font-black leading-none tracking-tighter">{loading ? '...' : Number(card.value).toLocaleString()}</p>
                                        </div>
                                        <div className="rounded-xl bg-white/15 p-2.5 backdrop-blur-lg border border-white/10 shadow-lg">
                                            <card.icon className="h-5 w-5 text-white" />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold backdrop-blur-md border border-white/10">
                                            {card.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                            {card.trend}
                                        </div>
                                        <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Growth</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                        <Card className="lg:col-span-4 border-none shadow-xl bg-white dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <CardTitle className="text-sm font-bold tracking-tight">
                                        Monthly Analytics
                                    </CardTitle>
                                </div>
                                <div className="relative">
                                    <select className="appearance-none text-[11px] font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 pl-3 pr-8 py-1.5 text-slate-600 dark:text-slate-300 outline-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm">
                                        <option>This Year</option>
                                        <option>Last Year</option>
                                    </select>
                                    <ArrowUpRight className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none rotate-90" />
                                </div>
                            </CardHeader>
                            <CardContent className="px-5 pb-5 pt-4">
                                <div className="h-[220px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={revenueData}
                                            barCategoryGap={24}
                                            barGap={3}
                                            margin={{ top: 10, right: 8, left: -10, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-slate-800" />
                                            <XAxis
                                                dataKey="month"
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 600 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 600 }}
                                                domain={[0, 10000]}
                                                ticks={[0, 2500, 5000, 7500, 10000]}
                                                tickFormatter={(value) => `$${value / 1000}k`}
                                            />
                                            <RechartsTooltip
                                                cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }}
                                                contentStyle={{
                                                    ...tooltipStyle,
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    boxShadow: '0 10px 30px -5px rgba(15,23,42,0.15)',
                                                }}
                                            />
                                            {/* Sample: tall blue bar, then two short bars (purple, green) to its right */}
                                            <Bar
                                                dataKey="revenue"
                                                name="Revenue"
                                                fill="#7C3AED"
                                                radius={[8, 8, 8, 8]}
                                                maxBarSize={20}
                                            />
                                            <Bar
                                                dataKey="appointments"
                                                name="Appointments"
                                                fill="#a855f7"
                                                radius={[4, 4, 4, 4]}
                                                maxBarSize={5}
                                            />
                                            <Bar
                                                dataKey="exams"
                                                name="Exams"
                                                fill="#22c55e"
                                                radius={[4, 4, 4, 4]}
                                                maxBarSize={5}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-3 border-none shadow-xl bg-white dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                            <CardHeader className="py-4 px-5 border-b border-slate-100 dark:border-slate-800">
                                <CardTitle className="text-sm font-bold tracking-tight uppercase">Top Services</CardTitle>
                            </CardHeader>
                            <CardContent className="px-5 pb-5 pt-3">
                                <div className="flex flex-col items-center justify-center space-y-6">
                                    <div className="h-[150px] w-full max-w-[150px] relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={serviceData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value" startAngle={90} endAngle={-270}>
                                                    {serviceData.map((entry, index) => <Cell key={index} fill={entry.color} stroke="transparent" />)}
                                                </Pie>
                                                <RechartsTooltip contentStyle={{ ...tooltipStyle, borderRadius: '10px', border: 'none', boxShadow: '0 8px 24px -4px rgba(0,0,0,0.1)' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-[8px] uppercase font-bold text-muted-foreground tracking-widest">Total</span>
                                            <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{totalPatientsForDonut}</span>
                                        </div>
                                    </div>
                                    <div className="w-full"><DonutLegend /></div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-4 border-none shadow-xl bg-white dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden flex flex-col">
                            <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4 shrink-0 border-b border-slate-100 dark:border-slate-800">
                                <CardTitle className="text-[12px] font-black uppercase tracking-[0.1em] text-muted-foreground">Recent Patients</CardTitle>
                                <div className="flex items-center gap-2">
                                    <button title="Quick Register Patient" className="flex items-center gap-1 bg-[#0EA5E9] hover:bg-[#0c8cc7] text-[9px] font-bold px-2 py-1 rounded-lg transition-colors shadow-sm text-white">
                                        <UserPlus className="h-3 w-3" />
                                        <span className="hidden sm:inline">Register</span>
                                    </button>
                                    <button className="text-[9px] text-[#0EA5E9] font-bold hover:text-[#0c8cc7] transition-colors flex items-center gap-1 bg-blue-500/5 px-2 py-1 rounded-lg uppercase">
                                        VIEW ALL <ArrowUpRight className="h-2.5 w-2.5" />
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-1">
                                <Table>
                                    <TableBody>
                                        {table.getRowModel().rows.map((row) => (
                                            <TableRow key={row.id} className="hover:bg-accent border-none transition-colors duration-150 group cursor-default">
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell key={cell.id} className="py-2">
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-3 border-none shadow-xl bg-white dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4 shrink-0 border-b border-slate-100 dark:border-slate-800">
                                <CardTitle className="text-[12px] font-black uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-2">
                                    <CalendarCheck className="h-3.5 w-3.5 text-[#0EA5E9]" />
                                    Due follow-ups this week
                                </CardTitle>
                                <Link href="/dashboard/patients" className="text-[9px] text-[#0EA5E9] font-bold hover:text-[#0c8cc7] transition-colors flex items-center gap-1 bg-blue-500/5 px-2 py-1 rounded-lg uppercase">
                                    Patients <ArrowUpRight className="h-2.5 w-2.5" />
                                </Link>
                            </CardHeader>
                            <CardContent className="px-3 pb-2.5 pt-1.5 space-y-1">
                                {(stats.overdueFollowUpsCount ?? 0) > 0 && (
                                    <p className="text-[10px] font-bold text-red-600 dark:text-red-400 px-2 py-1 rounded bg-red-50 dark:bg-red-950/30">
                                        {stats.overdueFollowUpsCount} overdue
                                    </p>
                                )}
                                {(stats.dueFollowUps?.length ?? 0) === 0 ? (
                                    <p className="text-[11px] text-muted-foreground px-2 py-2">No follow-ups due this week.</p>
                                ) : (
                                    stats.dueFollowUps?.slice(0, 5).map((f) => (
                                        <Link
                                            key={f.id}
                                            href={`/dashboard/patients/${f.patient?.id ?? '#'}`}
                                            className="flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-accent transition-colors duration-150 group cursor-pointer"
                                        >
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0EA5E9]/10 text-[10px] font-bold text-[#0EA5E9]">
                                                {f.sourceType?.slice(0, 1) ?? '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate">{f.patient?.fullName ?? 'Unknown'}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {f.dueDate ? new Date(f.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'} · {f.sourceType}
                                                </p>
                                            </div>
                                            <ArrowUpRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-[#0EA5E9] shrink-0" />
                                        </Link>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                        <Card className="lg:col-span-4 border-none shadow-xl bg-white dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden flex flex-col">
                            <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4 shrink-0 border-b border-slate-100 dark:border-slate-800">
                                <CardTitle className="text-[12px] font-black uppercase tracking-[0.1em] text-muted-foreground">Top Doctors</CardTitle>
                                <button className="text-[9px] text-[#0EA5E9] font-bold hover:text-[#0c8cc7] transition-colors flex items-center gap-1 bg-blue-500/5 px-2 py-1 rounded-lg uppercase">
                                    VIEW ALL <ArrowUpRight className="h-2.5 w-2.5" />
                                </button>
                            </CardHeader>
                            <CardContent className="px-3 pb-2.5 pt-1.5 space-y-1">
                                {topDoctors.map((doctor, index) => (
                                    <div key={doctor.name} className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-accent transition-colors duration-150 group cursor-default">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0EA5E9]/10 text-xs font-black text-[#0EA5E9] group-hover:scale-105 transition-transform">{index + 1}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold truncate tracking-tight">{doctor.name}</p>
                                            <p className="text-[10px] text-muted-foreground/70 font-medium">{doctor.specialty}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="flex items-center justify-end gap-1 text-xs font-black text-amber-500">
                                                <span className="text-[9px] text-muted-foreground/50 font-medium mr-1 uppercase">⭐</span>
                                                {doctor.rating}
                                            </div>
                                            <p className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-widest leading-none mt-1">{doctor.patients} pts</p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Inventory Alerts – only show if there's something to flag */}
                        {stats.inventoryAlerts && (stats.inventoryAlerts.pharmacyLowStockCount > 0 || stats.inventoryAlerts.opticalLowStockCount > 0 || stats.inventoryAlerts.expiringCount > 0) && (
                            <Card className="lg:col-span-3 border-none shadow-xl bg-white dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden flex flex-col">
                                <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4 shrink-0 border-b border-slate-100 dark:border-slate-800">
                                    <CardTitle className="text-[12px] font-black uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-2">
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                        Inventory Alerts
                                    </CardTitle>
                                    <Link href="/dashboard/inventory/pharmacy" className="text-[9px] text-[#0EA5E9] font-bold hover:text-[#0c8cc7] transition-colors flex items-center gap-1 bg-blue-500/5 px-2 py-1 rounded-lg uppercase">
                                        Inventory <ArrowUpRight className="h-2.5 w-2.5" />
                                    </Link>
                                </CardHeader>

                                {/* Summary badges */}
                                <div className="flex gap-2 px-4 pt-3 pb-1 flex-wrap">
                                    {stats.inventoryAlerts.pharmacyLowStockCount > 0 && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                            {stats.inventoryAlerts.pharmacyLowStockCount} pharmacy low
                                        </span>
                                    )}
                                    {stats.inventoryAlerts.opticalLowStockCount > 0 && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                            {stats.inventoryAlerts.opticalLowStockCount} optical low
                                        </span>
                                    )}
                                    {stats.inventoryAlerts.expiringCount > 0 && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                                            {stats.inventoryAlerts.expiringCount} expiring ≤30d
                                        </span>
                                    )}
                                </div>

                                <CardContent className="px-3 pb-2.5 pt-1 space-y-0 overflow-y-auto max-h-[300px]">
                                    {/* Low stock – pharmacy */}
                                    {stats.inventoryAlerts.pharmacyLowStock.map((item) => (
                                        <div key={`ph-${item.id}`} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-accent transition-colors group">
                                            <div className="h-7 w-7 shrink-0 rounded-lg flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-500">
                                                <TrendingDown className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate text-slate-700 dark:text-slate-200">{item.itemName}</p>
                                                <p className="text-[10px] text-muted-foreground/70">Pharmacy · reorder at {item.reorderLevel}</p>
                                            </div>
                                            <span className="text-sm font-black tabular-nums text-red-500 shrink-0">{item.stockQuantity}</span>
                                        </div>
                                    ))}
                                    {/* Low stock – optical */}
                                    {stats.inventoryAlerts.opticalLowStock.map((item) => (
                                        <div key={`op-${item.id}`} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-accent transition-colors group">
                                            <div className="h-7 w-7 shrink-0 rounded-lg flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 text-amber-500">
                                                <Package className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate text-slate-700 dark:text-slate-200">{item.itemName}</p>
                                                <p className="text-[10px] text-muted-foreground/70">Optical · reorder at {item.reorderLevel}</p>
                                            </div>
                                            <span className="text-sm font-black tabular-nums text-amber-500 shrink-0">{item.stockQuantity}</span>
                                        </div>
                                    ))}
                                    {/* Expiring items */}
                                    {stats.inventoryAlerts.expiringPharmacy.map((item) => (
                                        <div key={`ex-${item.id}`} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-accent transition-colors group">
                                            <div className="h-7 w-7 shrink-0 rounded-lg flex items-center justify-center bg-orange-100 dark:bg-orange-900/30 text-orange-500">
                                                <AlertTriangle className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate text-slate-700 dark:text-slate-200">{item.itemName}</p>
                                                <p className="text-[10px] text-muted-foreground/70">
                                                    Expires {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                                </p>
                                            </div>
                                            <span className="text-[10px] font-bold tabular-nums text-orange-500 shrink-0">{item.stockQuantity} left</span>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
