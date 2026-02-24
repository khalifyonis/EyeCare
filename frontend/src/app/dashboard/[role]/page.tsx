'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Users,
    Calendar,
    Eye,
    Package,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    Clock,
} from 'lucide-react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    AreaChart,
    Area,
} from 'recharts'

// Chart data
const revenueData = [
    { month: 'Jan', revenue: 4200, appointments: 65, exams: 42 },
    { month: 'Feb', revenue: 5800, appointments: 78, exams: 56 },
    { month: 'Mar', revenue: 4800, appointments: 72, exams: 48 },
    { month: 'Apr', revenue: 6200, appointments: 88, exams: 64 },
    { month: 'May', revenue: 7500, appointments: 95, exams: 72 },
    { month: 'Jun', revenue: 6800, appointments: 82, exams: 58 },
    { month: 'Jul', revenue: 8200, appointments: 102, exams: 78 },
    { month: 'Aug', revenue: 7800, appointments: 98, exams: 74 },
    { month: 'Sep', revenue: 9200, appointments: 115, exams: 86 },
    { month: 'Oct', revenue: 8500, appointments: 108, exams: 82 },
    { month: 'Nov', revenue: 10200, appointments: 128, exams: 96 },
    { month: 'Dec', revenue: 9800, appointments: 122, exams: 88 },
]

const serviceData = [
    { name: 'Eye Exams', value: 35, color: '#8b5cf6' },
    { name: 'Glasses', value: 25, color: '#06b6d4' },
    { name: 'Contacts', value: 20, color: '#f59e0b' },
    { name: 'Surgery', value: 12, color: '#10b981' },
    { name: 'Follow-up', value: 8, color: '#ef4444' },
]

const recentPatients = [
    { name: 'Ahmed Ali', visit: 'Eye Exam', time: '10:00 AM', status: 'Completed', avatar: 'A' },
    { name: 'Sarah Omer', visit: 'Follow-up', time: '11:30 AM', status: 'In Progress', avatar: 'S' },
    { name: 'Mohamed Hassan', visit: 'Consultation', time: '2:00 PM', status: 'Waiting', avatar: 'M' },
    { name: 'Fatima Yusuf', visit: 'Glasses Fitting', time: '3:30 PM', status: 'Scheduled', avatar: 'F' },
    { name: 'Omar Ibrahim', visit: 'Surgery Consult', time: '4:00 PM', status: 'Scheduled', avatar: 'O' },
]

const statusColors: Record<string, string> = {
    Completed: 'bg-emerald-500/20 text-emerald-400',
    'In Progress': 'bg-blue-500/20 text-blue-400',
    Waiting: 'bg-amber-500/20 text-amber-400',
    Scheduled: 'bg-violet-500/20 text-violet-400',
}

const topDoctors = [
    { name: 'Dr. Amina', patients: 142, rating: 4.9, specialty: 'Ophthalmology' },
    { name: 'Dr. Yusuf', patients: 128, rating: 4.8, specialty: 'Optometry' },
    { name: 'Dr. Hana', patients: 115, rating: 4.7, specialty: 'Retina' },
    { name: 'Dr. Ali', patients: 98, rating: 4.6, specialty: 'Pediatric' },
]

export default function DashboardPage() {
    const router = useRouter()
    const params = useParams()
    const role = (params.role as string || '').toUpperCase()
    const [user, setUser] = useState<{ fullName: string; role: string } | null>(null)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedUser = localStorage.getItem('user')
            if (storedUser) {
                setUser(JSON.parse(storedUser))
            } else {
                router.push('/login')
            }
        }
    }, [router])

    if (!user) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    const stats = [
        {
            title: 'Total Patients',
            value: '1,284',
            trend: '+12.5%',
            up: true,
            icon: Users,
            gradient: 'from-violet-600 to-indigo-600',
        },
        {
            title: 'Appointments Today',
            value: '24',
            trend: '+3',
            up: true,
            icon: Calendar,
            gradient: 'from-cyan-500 to-blue-600',
        },
        {
            title: 'Eye Exams',
            value: '156',
            trend: '+8.3%',
            up: true,
            icon: Eye,
            gradient: 'from-emerald-500 to-teal-600',
        },
        {
            title: 'Pending Orders',
            value: '42',
            trend: '-2.1%',
            up: false,
            icon: Package,
            gradient: 'from-rose-500 to-pink-600',
        },
    ]

    return (
        <div className="space-y-6">
            {/* Page Title */}
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Welcome back, {user.fullName} 👋
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Here&apos;s what&apos;s happening in your {role.toLowerCase()} dashboard today.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Last updated: just now</span>
                </div>
            </div>

            {/* Gradient Stat Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div
                        key={stat.title}
                        className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${stat.gradient} p-5 text-white shadow-lg transition-transform hover:scale-[1.02]`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-white/80">{stat.title}</p>
                                <p className="text-3xl font-bold">{stat.value}</p>
                                <div className="flex items-center gap-1 text-xs font-medium text-white/90">
                                    {stat.up ? (
                                        <TrendingUp className="h-3.5 w-3.5" />
                                    ) : (
                                        <TrendingDown className="h-3.5 w-3.5" />
                                    )}
                                    <span>{stat.trend} from last month</span>
                                </div>
                            </div>
                            <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                                <stat.icon className="h-6 w-6" />
                            </div>
                        </div>
                        {/* Decorative circle */}
                        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
                        <div className="absolute -right-2 -bottom-6 h-20 w-20 rounded-full bg-white/5" />
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
                {/* Revenue Bar Chart */}
                <Card className="lg:col-span-4 border-border/40">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-semibold">Monthly Revenue</CardTitle>
                        <select className="rounded-md border border-border/50 bg-muted/50 px-2 py-1 text-xs text-muted-foreground outline-none">
                            <option>This Year</option>
                            <option>Last Year</option>
                        </select>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={revenueData} barGap={4}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        tickLine={false}
                                        axisLine={false}
                                        className="text-xs fill-muted-foreground"
                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                        tickFormatter={(v) => `$${v / 1000}k`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px',
                                            color: 'hsl(var(--foreground))',
                                            fontSize: '12px',
                                        }}
                                        formatter={(value: any) => [`$${Number(value || 0).toLocaleString()}`, '']}
                                    />
                                    <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Revenue" />
                                    <Bar dataKey="appointments" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Appointments" />
                                    <Bar dataKey="exams" fill="#10b981" radius={[4, 4, 0, 0]} name="Exams" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Donut Chart */}
                <Card className="lg:col-span-3 border-border/40">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold">Top Services</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={serviceData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={60}
                                        outerRadius={95}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {serviceData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px',
                                            color: 'hsl(var(--foreground))',
                                            fontSize: '12px',
                                        }}
                                        formatter={(value: any) => [`${value}%`, '']}
                                    />
                                    <Legend
                                        iconType="circle"
                                        iconSize={8}
                                        wrapperStyle={{ fontSize: '12px' }}
                                        formatter={(value) => (
                                            <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {/* Recent Patients */}
                <Card className="border-border/40">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base font-semibold">Recent Patients</CardTitle>
                        <button className="text-xs text-primary hover:underline flex items-center gap-1">
                            View All <ArrowUpRight className="h-3 w-3" />
                        </button>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="space-y-3">
                            {recentPatients.map((patient, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50"
                                >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600/20 to-indigo-600/20 text-sm font-semibold text-violet-400">
                                        {patient.avatar}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{patient.name}</p>
                                        <p className="text-xs text-muted-foreground">{patient.visit}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[patient.status]}`}>
                                            {patient.status}
                                        </span>
                                        <p className="text-xs text-muted-foreground mt-0.5">{patient.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Doctors */}
                <Card className="border-border/40">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base font-semibold">Top Doctors</CardTitle>
                        <button className="text-xs text-primary hover:underline flex items-center gap-1">
                            View All <ArrowUpRight className="h-3 w-3" />
                        </button>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="space-y-3">
                            {topDoctors.map((doctor, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50"
                                >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-600/20 text-sm font-semibold text-emerald-400">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{doctor.name}</p>
                                        <p className="text-xs text-muted-foreground">{doctor.specialty}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="flex items-center gap-1 text-sm font-medium">
                                            <span className="text-amber-400">★</span>
                                            {doctor.rating}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{doctor.patients} patients</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
