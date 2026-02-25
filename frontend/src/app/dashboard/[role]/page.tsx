'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'
import {
    Users, Calendar, Eye, Package,
    TrendingUp, TrendingDown, ArrowUpRight, Clock, UserPlus,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

// Donut chart with actual patient counts
const serviceData = [
    { name: 'Contacts', value: 35, count: 449, color: '#f59e0b' },
    { name: 'Eye Exams', value: 25, count: 321, color: '#8b5cf6' },
    { name: 'Follow-up', value: 20, count: 257, color: '#0EA5E9' },
    { name: 'Glasses', value: 12, count: 154, color: '#06b6d4' },
    { name: 'Surgery', value: 8, count: 103, color: '#10b981' },
]
const totalPatients = serviceData.reduce((s, d) => s + d.count, 0)

const recentPatients = [
    { name: 'Ahmed Ali', visit: 'Eye Exam', status: 'Completed', time: '10:00 AM', avatar: 'A' },
    { name: 'Sarah Omer', visit: 'Follow up', status: 'In Progress', time: '11:30 AM', avatar: 'S' },
    { name: 'Mohamed Hassan', visit: 'Consultation', status: 'Waiting', time: '2:00 PM', avatar: 'M' },
    { name: 'Fatima Yusuf', visit: 'Glasses Fitting', status: 'Scheduled', time: '3:30 PM', avatar: 'F' },
]

const topDoctors = [
    { name: 'Dr. Amina', specialty: 'Ophthalmology', rating: 4.9, patients: 142 },
    { name: 'Dr. Yusuf', specialty: 'Optometry', rating: 4.8, patients: 128 },
    { name: 'Dr. Hana', specialty: 'Retina', rating: 4.7, patients: 115 },
    { name: 'Dr. Ali', specialty: 'Pediatric', rating: 4.6, patients: 98 },
]

// WCAG AA compliant pill-shaped status badges
const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    'Completed': { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-500' },
    'In Progress': { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-800 dark:text-blue-300', dot: 'bg-blue-500' },
    'Waiting': { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-800 dark:text-amber-300', dot: 'bg-amber-500' },
    'Scheduled': { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-800 dark:text-violet-300', dot: 'bg-violet-500' },
}

// Custom donut chart legend — CSS grid for perfect column alignment
function DonutLegend() {
    return (
        <div className="pt-1 space-y-1">
            {serviceData.map((d) => (
                <div
                    key={d.name}
                    className="grid items-center gap-x-2"
                    style={{ gridTemplateColumns: '12px 1fr 45px 45px' }}
                >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-[11px] font-semibold text-foreground/80 truncate">{d.name}</span>
                    <span className="text-[10px] font-bold text-muted-foreground tabular-nums text-right">{d.count}</span>
                    <span
                        className="text-[10px] font-black tabular-nums text-right"
                        style={{ color: d.color }}
                    >
                        {d.value}%
                    </span>
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
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold tracking-tight">
                    Welcome back, {user.fullName} 👋
                </h1>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0 bg-muted/30 px-2 py-1 rounded-md">
                    <Clock className="h-3 w-3 text-[#0EA5E9]" />
                    <span>Last updated: just now</span>
                </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stats.map((s, i) => (
                    <div
                        key={s.title}
                        className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${s.gradient} p-4 text-white shadow-lg glow-hover hover:scale-[1.02] transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-4`}
                        style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
                    >
                        <div className="flex items-center justify-between relative z-10">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest">{s.title}</p>
                                <p className="text-2xl font-black leading-none tracking-tight">{s.value}</p>
                                {/* WCAG AA: white/90 text on colored background passes ≥ 4.5:1 */}
                                <div className={`flex items-center gap-1 text-[9px] font-bold rounded-full px-1.5 py-0.5 w-fit mt-1 backdrop-blur-sm ${s.up ? 'bg-white/20 text-white' : 'bg-black/20 text-white/90'}`}>
                                    {s.up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                                    {s.trend}
                                </div>
                            </div>
                            <div className="rounded-xl bg-white/20 p-2 backdrop-blur-md border border-white/20 shadow-inner">
                                <s.icon className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-white/10 blur-xl" />
                        <div className="absolute -right-1 -bottom-5 h-16 w-16 rounded-full bg-white/5 blur-lg" />
                    </div>
                ))}
            </div>

            {/* ── Charts row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">

                {/* Bar chart */}
                <Card className="lg:col-span-4 glass-card border-none overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b border-white/10 dark:border-white/5">
                        <div>
                            <CardTitle className="text-sm font-bold tracking-tight">Monthly Analytics</CardTitle>
                            {/* Bar chart legend */}
                            <div className="flex items-center gap-3 mt-1">
                                {[
                                    { color: '#0EA5E9', label: 'Revenue' },
                                    { color: '#8b5cf6', label: 'Apts' },
                                    { color: '#10b981', label: 'Exams' },
                                ].map((l) => (
                                    <div key={l.label} className="flex items-center gap-1">
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                                        <span className="text-[10px] text-muted-foreground font-semibold">{l.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <select className="text-[11px] font-bold rounded-lg border border-white/20 bg-white/10 dark:bg-black/20 px-2 py-1 text-muted-foreground outline-none cursor-pointer hover:bg-white/20 transition-colors">
                            <option>This Year</option>
                            <option>Last Year</option>
                        </select>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 pt-4">
                        <div className="h-[188px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={revenueData} barGap={2} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted-foreground/10" />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600 }} />
                                    <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600 }} tickFormatter={(v) => `$${v / 1000}k`} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                                        contentStyle={{ ...tooltipStyle }}
                                        formatter={(v: any, name?: string) => [`${name === 'revenue' ? '$' : ''}${Number(v).toLocaleString()}`, (name ?? '').charAt(0).toUpperCase() + (name ?? '').slice(1)]}
                                    />
                                    <Bar dataKey="revenue" fill="#0EA5E9" radius={[4, 4, 0, 0]} minPointSize={6} name="Revenue" />
                                    <Bar dataKey="appointments" fill="#8b5cf6" radius={[4, 4, 0, 0]} minPointSize={6} name="Appointments" />
                                    <Bar dataKey="exams" fill="#10b981" radius={[4, 4, 0, 0]} minPointSize={6} name="Exams" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Donut chart with custom legend */}
                <Card className="lg:col-span-3 glass-card border-none overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                    <CardHeader className="py-3 px-4 border-b border-white/10 dark:border-white/5">
                        <CardTitle className="text-sm font-bold tracking-tight">Service Distribution</CardTitle>
                        <p className="text-[10px] text-muted-foreground font-semibold">n={totalPatients} total visits</p>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 pt-2">
                        <div className="flex items-center gap-4">
                            {/* Donut */}
                            <div className="h-[160px] w-[160px] shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={serviceData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={48}
                                            outerRadius={72}
                                            paddingAngle={3}
                                            dataKey="value"
                                            startAngle={90}
                                            endAngle={-270}
                                        >
                                            {serviceData.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ ...tooltipStyle }}
                                            formatter={(v: any, _name?: string, props?: any) => [`${props?.payload?.count ?? v} patients (${v}%)`, props?.payload?.name ?? '']}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            {/* Custom legend */}
                            <div className="flex-1 min-w-0">
                                <DonutLegend />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Bottom row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-4">

                {/* Recent Patients */}
                <Card className="glass-card glow-hover border-border/40 shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between py-3 px-4 shrink-0 border-b border-white/10 dark:border-white/5">
                        <CardTitle className="text-sm font-bold uppercase tracking-tight">Recent Patients</CardTitle>
                        <div className="flex items-center gap-2">
                            {/* Quick Action: Instant Register */}
                            <button
                                title="Quick Register Patient"
                                className="flex items-center gap-1 bg-[#0EA5E9] hover:bg-[#0c8cc7] text-white text-[10px] font-bold px-2 py-1 rounded-md transition-colors shadow-sm"
                            >
                                <UserPlus className="h-3 w-3" />
                                <span className="hidden sm:inline">Register</span>
                            </button>
                            <button className="text-[11px] text-[#0EA5E9] font-bold hover:text-[#0c8cc7] transition-colors flex items-center gap-1 bg-blue-500/5 px-2 py-1 rounded-md">
                                VIEW ALL <ArrowUpRight className="h-3 w-3" />
                            </button>
                        </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 pt-2 space-y-1">
                        {recentPatients.map((p, i) => {
                            const sc = statusConfig[p.status] ?? statusConfig['Scheduled']
                            return (
                                <div key={i} className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 hover:bg-accent transition-colors duration-150 group cursor-default">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#0EA5E9]/10 text-sm font-black text-[#0EA5E9] group-hover:scale-110 transition-transform">
                                        {p.avatar}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold truncate tracking-tight">{p.name}</p>
                                        <p className="text-xs text-muted-foreground/70 font-medium">{p.visit}</p>
                                        <p className="text-[10px] text-muted-foreground/60 font-medium mt-0.5 uppercase tracking-widest">{p.time}</p>
                                    </div>
                                    {/* Pill-shaped WCAG AA badge */}
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                                        {p.status}
                                    </span>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>

                {/* Top Doctors */}
                <Card className="glass-card glow-hover border-border/40 shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between py-3 px-4 shrink-0 border-b border-white/10 dark:border-white/5">
                        <CardTitle className="text-sm font-bold uppercase tracking-tight">Top Doctors</CardTitle>
                        <button className="text-[11px] text-[#0EA5E9] font-bold hover:text-[#0c8cc7] transition-colors flex items-center gap-1 bg-blue-500/5 px-2 py-1 rounded-md">
                            VIEW ALL <ArrowUpRight className="h-3 w-3" />
                        </button>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 pt-2 space-y-1">
                        {topDoctors.map((d, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 hover:bg-accent transition-colors duration-150 group cursor-default">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-sm font-black text-emerald-600 group-hover:scale-110 transition-transform">
                                    {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold truncate tracking-tight">{d.name}</p>
                                    <p className="text-xs text-muted-foreground/70 font-medium">{d.specialty}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="flex items-center justify-end gap-1 text-sm font-black text-amber-500">
                                        <span className="text-[10px] text-muted-foreground font-medium mr-1 uppercase">Rating</span>
                                        ★ {d.rating}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest leading-none mt-1">{d.patients} PATIENTS</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
