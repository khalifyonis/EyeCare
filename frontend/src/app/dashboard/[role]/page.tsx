'use client'

import { useEffect, useState, useMemo } from 'react'
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
    Users, Calendar, Eye, Package,
    TrendingUp, TrendingDown, ArrowUpRight, Clock, UserPlus,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableRow,
} from '@/components/ui/table'

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
const totalPatients = serviceData.reduce((s, d) => s + d.count, 0)

const recentPatientsData = [
    { id: '1', name: 'Ahmed Ali', visit: 'Eye Exam', status: 'Completed', time: '10:00 AM', avatar: 'A' },
    { id: '2', name: 'Sarah Omer', visit: 'Follow up', status: 'In Progress', time: '11:30 AM', avatar: 'S' },
    { id: '3', name: 'Mohamed Hassan', visit: 'Consultation', status: 'Waiting', time: '2:00 PM', avatar: 'M' },
    { id: '4', name: 'Fatima Yusuf', visit: 'Glasses Fitting', status: 'Scheduled', time: '3:30 PM', avatar: 'F' },
]

const topDoctors = [
    { name: 'Dr. Amina', specialty: 'Ophthalmology', rating: 4.9, patients: 142 },
    { name: 'Dr. Yusuf', specialty: 'Optometry', rating: 4.8, patients: 128 },
    { name: 'Dr. Hana', specialty: 'Retina', rating: 4.7, patients: 115 },
    { name: 'Dr. Ali', specialty: 'Pediatric', rating: 4.6, patients: 98 },
]

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    'Completed': { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-500' },
    'In Progress': { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-800 dark:text-blue-300', dot: 'bg-blue-500' },
    'Waiting': { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-800 dark:text-amber-300', dot: 'bg-amber-500' },
    'Scheduled': { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-800 dark:text-violet-300', dot: 'bg-violet-500' },
}

function DonutLegend() {
    return (
        <div className="pt-1 space-y-1">
            {serviceData.map((d) => (
                <div key={d.name} className="grid items-center gap-x-2" style={{ gridTemplateColumns: '12px 1fr 45px 45px' }}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-[11px] font-semibold text-foreground/80 truncate">{d.name}</span>
                    <span className="text-[10px] font-bold text-muted-foreground tabular-nums text-right">{d.count}</span>
                    <span className="text-[10px] font-black tabular-nums text-right" style={{ color: d.color }}>{d.value}%</span>
                </div>
            ))}
        </div>
    )
}

export default function DashboardPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        setUser(JSON.parse(stored))
    }, [router])

    // ── Recent Patients mini-table (no pagination/search) ────────────────────

    const patientColumns = useMemo<ColumnDef<any>[]>(() => [
        {
            accessorKey: 'name',
            cell: ({ row }) => {
                const p = row.original;
                return (
                    <div className="flex items-center gap-3 group px-1">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0EA5E9]/10 text-xs font-black text-[#0EA5E9] group-hover:scale-105 transition-transform">
                            {p.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate tracking-tight">{p.name}</p>
                            <p className="text-xs text-muted-foreground/70 font-medium">{p.visit}</p>
                            <p className="text-[10px] text-muted-foreground/60 font-medium mt-0.5 uppercase tracking-widest">{p.time}</p>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'status',
            cell: ({ row }) => {
                const status = row.original.status;
                const sc = statusConfig[status] ?? statusConfig['Scheduled'];
                return (
                    <div className="flex justify-end">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                            {status}
                        </span>
                    </div>
                );
            },
        },
    ], []);

    const table = useReactTable({
        data: recentPatientsData,
        columns: patientColumns,
        getCoreRowModel: getCoreRowModel(),
    });

    if (!user) return null

    const stats = [
        { title: 'Total Patients', value: '1,284', trend: '+12.5%', up: true, icon: Users, gradient: 'from-violet-600 to-indigo-600' },
        { title: 'Appointments Today', value: '24', trend: '+3', up: true, icon: Calendar, gradient: 'from-cyan-500 to-[#0EA5E9]' },
        { title: 'Eye Exams', value: '156', trend: '+8.3%', up: true, icon: Eye, gradient: 'from-emerald-500 to-teal-600' },
        { title: 'Pending Orders', value: '42', trend: '-2.1%', up: false, icon: Package, gradient: 'from-amber-500 to-orange-500' },
    ]

    const tooltipStyle = {
        backgroundColor: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: '8px',
        color: 'hsl(var(--foreground))',
        fontSize: '12px',
    }

    return (
        <div className="space-y-3 animate-in fade-in duration-500">

            {/* ── Title row ── */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-2">
                <div className="space-y-0.5">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome back, {user.fullName} 👋</h1>
                    <p className="text-xs text-muted-foreground font-medium">Here's what's happening in your admin dashboard today.</p>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-full w-fit">
                    <Clock className="h-3 w-3 text-[#0EA5E9]" />
                    <span className="uppercase tracking-wider">Last updated: just now</span>
                </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s, i) => (
                    <div
                        key={s.title}
                        className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${s.gradient} p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-4 group`}
                        style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
                    >
                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 -mr-3 -mt-3 w-16 h-16 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-colors" />

                        <div className="relative z-10 flex flex-col justify-between h-full">
                            <div className="flex items-start justify-between">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">{s.title}</p>
                                    <p className="text-2xl font-black leading-tight tracking-tight">{s.value}</p>
                                </div>
                                <div className="rounded-xl bg-white/20 p-2 backdrop-blur-md border border-white/10 shadow-md">
                                    <s.icon className="h-4 w-4 text-white" />
                                </div>
                            </div>

                            <div className="mt-3 flex items-center gap-2">
                                <div className={`flex items-center gap-1 text-[8px] font-black rounded-full px-1.5 py-0.5 backdrop-blur-md border border-white/10 ${s.up ? 'bg-white/20 text-white' : 'bg-black/20 text-white'}`}>
                                    {s.up ? <TrendingUp className="h-2 w-2" /> : <TrendingDown className="h-2 w-2" />}
                                    {s.trend}
                                </div>
                                <span className="text-[8px] font-bold text-white/50 lowercase tracking-tight">vs last month</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Charts row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
                <Card className="lg:col-span-4 border-none shadow-xl bg-white dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <CardHeader className="flex flex-row items-center justify-between py-5 px-6 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <CardTitle className="text-base font-bold tracking-tight">Monthly Revenue</CardTitle>
                        </div>
                        <div className="relative">
                            <select className="appearance-none text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 pl-3 pr-8 py-2 text-slate-600 dark:text-slate-300 outline-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm">
                                <option>This Year</option>
                                <option>Last Year</option>
                            </select>
                            <ArrowUpRight className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none rotate-90" />
                        </div>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 pt-4">
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={revenueData} barGap={0} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#6366f1" stopOpacity={1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-slate-800" />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 600 }} dy={10} />
                                    <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 600 }} tickFormatter={(v) => `$${v / 1000}k`} />
                                    <RechartsTooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                        contentStyle={{ ...tooltipStyle, borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)' }}
                                        formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Revenue']}
                                    />
                                    <Bar dataKey="revenue" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={32} />
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
                                            {serviceData.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ ...tooltipStyle, borderRadius: '10px', border: 'none', boxShadow: '0 8px 24px -4px rgba(0,0,0,0.1)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-[8px] uppercase font-bold text-muted-foreground tracking-widest">Total</span>
                                    <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{totalPatients}</span>
                                </div>
                            </div>
                            <div className="w-full"><DonutLegend /></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Bottom row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-4">

                {/* Recent Patients — powered by TanStack */}
                <Card className="border-none shadow-xl bg-white dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4 shrink-0 border-b border-slate-100 dark:border-slate-800">
                        <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Recent Patients</CardTitle>
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

                {/* Top Doctors */}
                <Card className="border-none shadow-xl bg-white dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4 shrink-0 border-b border-slate-100 dark:border-slate-800">
                        <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Top Doctors</CardTitle>
                        <button className="text-[9px] text-[#0EA5E9] font-bold hover:text-[#0c8cc7] transition-colors flex items-center gap-1 bg-blue-500/5 px-2 py-1 rounded-lg uppercase">
                            VIEW ALL <ArrowUpRight className="h-2.5 w-2.5" />
                        </button>
                    </CardHeader>
                    <CardContent className="px-3 pb-2.5 pt-1.5 space-y-1">
                        {topDoctors.map((d, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-accent transition-colors duration-150 group cursor-default">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-xs font-black text-emerald-600 group-hover:scale-105 transition-transform">{i + 1}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold truncate tracking-tight">{d.name}</p>
                                    <p className="text-[10px] text-muted-foreground/70 font-medium">{d.specialty}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="flex items-center justify-end gap-1 text-xs font-black text-amber-500">
                                        <span className="text-[9px] text-muted-foreground/50 font-medium mr-1 uppercase">★</span>
                                        {d.rating}
                                    </div>
                                    <p className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-widest leading-none mt-1">{d.patients} pts</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div >
    )
}
