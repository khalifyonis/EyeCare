'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    PieChart as RePieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, DollarSign, CreditCard, BarChart3, Loader2 } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import ReportLayout from '../_components/report-layout';

const COLORS = ['#0EA5E9', '#8B5CF6', '#F97316', '#10B981', '#EF4444', '#F59E0B'];
const SERVICE_COLORS: Record<string, string> = {
    APPOINTMENT: '#0EA5E9',
    SURGERY: '#8B5CF6',
    PHARMACY: '#10B981',
    OPTICAL: '#F97316',
};

type ServiceSummary = {
    serviceType: string;
    label: string;
    count: number;
    revenue: number;
    outstanding: number;
    share: string;
};

type IncomeData = {
    kpis: { totalRevenue: number; totalOutstanding: number; totalInvoices: number; totalServices: number };
    chart1: { name: string; revenue: number; outstanding: number; count: number }[];
    chart2: { name: string; value: number }[];
    trendChart: { name: string; value: number }[];
    summary: ServiceSummary[];
    tableData: any[];
};

const fmt = (n: number) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function IncomeByServicePage() {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [data, setData] = useState<IncomeData | null>(null);
    const [loading, setLoading] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            const res = await api.get(`/reports/income-by-service?${params.toString()}`);
            setData(res.data);
        } catch {
            toast.error('Failed to load income report');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [from, to]);

    const exportPdf = async () => {
        if (!data) return;
        setExportingPdf(true);
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            // Header
            doc.setFillColor(14, 165, 233);
            doc.rect(0, 0, 210, 32, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.text('AL-IXSAAN Eye Care', 14, 13);
            doc.setFontSize(11);
            doc.text('Income by Service Report', 14, 22);
            doc.setFontSize(8);
            doc.text(`Period: ${from || 'All Time'} — ${to || 'Today'}`, 14, 29);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 130, 29);

            let y = 42;
            // KPIs
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('KEY PERFORMANCE INDICATORS', 14, y);
            y += 8;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const kpis = [
                ['Total Revenue (Paid)', fmt(data.kpis.totalRevenue)],
                ['Outstanding Balance', fmt(data.kpis.totalOutstanding)],
                ['Total Invoices', String(data.kpis.totalInvoices)],
            ];
            for (const [label, val] of kpis) {
                doc.text(`${label}: ${val}`, 14, y);
                y += 6;
            }

            y += 4;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text('INCOME BY SERVICE CATEGORY', 14, y);
            y += 8;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setFillColor(241, 245, 249);
            doc.rect(14, y - 4, 182, 7, 'F');
            doc.text('Service', 16, y);
            doc.text('Invoices', 80, y);
            doc.text('Revenue', 110, y);
            doc.text('Outstanding', 145, y);
            doc.text('Share %', 178, y);
            y += 6;

            doc.setFont('helvetica', 'normal');
            for (const s of data.summary) {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.text(s.label, 16, y);
                doc.text(String(s.count), 80, y);
                doc.text(fmt(s.revenue), 110, y);
                doc.text(fmt(s.outstanding), 145, y);
                doc.text(`${s.share}%`, 178, y);
                y += 6;
            }

            // Footer
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            const pages = doc.getNumberOfPages();
            for (let i = 1; i <= pages; i++) {
                doc.setPage(i);
                doc.text('AL-IXSAAN Eye Care Management System — Confidential', 14, 290);
                doc.text(`Page ${i} of ${pages}`, 185, 290);
            }

            doc.save(`income-by-service-${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch { toast.error('PDF export failed'); } finally { setExportingPdf(false); }
    };

    const exportCsv = () => {
        if (!data) return;
        const rows = [['Service', 'Invoices', 'Revenue', 'Outstanding', 'Share %']];
        for (const s of data.summary) {
            rows.push([s.label, String(s.count), String(s.revenue.toFixed(2)), String(s.outstanding.toFixed(2)), `${s.share}%`]);
        }
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `income-by-service-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <ReportLayout
            title="Income by Service"
            from={from} to={to}
            setFrom={setFrom} setTo={setTo}
            onRefresh={fetchData}
            exportPdf={exportPdf}
            exportCsv={exportCsv}
            print={() => window.print()}
            exportingPdf={exportingPdf}
            hasData={!!data}
        >
            {loading && (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                </div>
            )}

            {!loading && !data && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <BarChart3 className="h-12 w-12 mb-3 opacity-40" />
                    <p className="text-base font-medium">Select a date range and click Generate Report</p>
                </div>
            )}

            {!loading && data && (
                <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 p-5 text-white shadow-lg shadow-sky-500/25">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-sky-100">Total Revenue</p>
                                    <p className="mt-1 text-2xl font-bold">{fmt(data.kpis.totalRevenue)}</p>
                                    <p className="mt-1 text-xs text-sky-200">Paid invoices</p>
                                </div>
                                <div className="rounded-xl bg-white/20 p-2.5"><DollarSign className="h-5 w-5" /></div>
                            </div>
                            <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
                        </div>
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 p-5 text-white shadow-lg shadow-red-500/25">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-red-100">Outstanding</p>
                                    <p className="mt-1 text-2xl font-bold">{fmt(data.kpis.totalOutstanding)}</p>
                                    <p className="mt-1 text-xs text-red-200">Unpaid / partial</p>
                                </div>
                                <div className="rounded-xl bg-white/20 p-2.5"><CreditCard className="h-5 w-5" /></div>
                            </div>
                            <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
                        </div>
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg shadow-emerald-500/25">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-emerald-100">Total Invoices</p>
                                    <p className="mt-1 text-2xl font-bold">{data.kpis.totalInvoices.toLocaleString()}</p>
                                    <p className="mt-1 text-xs text-emerald-200">All billing records</p>
                                </div>
                                <div className="rounded-xl bg-white/20 p-2.5"><TrendingUp className="h-5 w-5" /></div>
                            </div>
                            <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
                        </div>
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-5 text-white shadow-lg shadow-violet-500/25">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-violet-100">Service Categories</p>
                                    <p className="mt-1 text-2xl font-bold">{data.kpis.totalServices}</p>
                                    <p className="mt-1 text-xs text-violet-200">Active service types</p>
                                </div>
                                <div className="rounded-xl bg-white/20 p-2.5"><BarChart3 className="h-5 w-5" /></div>
                            </div>
                            <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
                        </div>
                    </div>

                    {/* Service Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {data.summary.map((s) => (
                            <div key={s.serviceType} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{s.label}</span>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${SERVICE_COLORS[s.serviceType]}20`, color: SERVICE_COLORS[s.serviceType] }}>
                                        {s.share}%
                                    </span>
                                </div>
                                <p className="text-xl font-bold text-slate-900 dark:text-white">{fmt(s.revenue)}</p>
                                <p className="text-xs text-slate-500 mt-1">{s.count} invoices · {fmt(s.outstanding)} outstanding</p>
                                <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${s.share}%`, background: SERVICE_COLORS[s.serviceType] || '#0EA5E9' }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Revenue vs Outstanding by Service</h3>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={data.chart1} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <RechartsTooltip formatter={(v: number) => fmt(v)} />
                                    <Legend />
                                    <Bar dataKey="revenue" name="Revenue" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="outstanding" name="Outstanding" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Revenue Distribution</h3>
                            <ResponsiveContainer width="100%" height={240}>
                                <RePieChart>
                                    <Pie data={data.chart2} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                        {data.chart2.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(v: number) => fmt(v)} />
                                </RePieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Revenue Trend */}
                    {data.trendChart.length > 1 && (
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Daily Revenue Trend</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={data.trendChart}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <RechartsTooltip formatter={(v: number) => fmt(v)} />
                                    <Line type="monotone" dataKey="value" name="Revenue" stroke="#0EA5E9" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Detail Table */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Service Revenue Summary</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50">
                                    <tr>
                                        {['Service Category', 'Invoices', 'Total Revenue', 'Outstanding', 'Revenue Share'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {data.summary.map((s) => (
                                        <tr key={s.serviceType} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SERVICE_COLORS[s.serviceType] || '#64748b' }} />
                                                    <span className="font-medium text-slate-800 dark:text-slate-200">{s.label}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{s.count}</td>
                                            <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{fmt(s.revenue)}</td>
                                            <td className="px-4 py-3 text-red-600 dark:text-red-400">{fmt(s.outstanding)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 max-w-20">
                                                        <div className="h-1.5 rounded-full" style={{ width: `${s.share}%`, background: SERVICE_COLORS[s.serviceType] || '#0EA5E9' }} />
                                                    </div>
                                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{s.share}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold">
                                        <td className="px-4 py-3 text-slate-900 dark:text-white">Total</td>
                                        <td className="px-4 py-3">{data.kpis.totalInvoices}</td>
                                        <td className="px-4 py-3 text-emerald-600">{fmt(data.kpis.totalRevenue)}</td>
                                        <td className="px-4 py-3 text-red-600">{fmt(data.kpis.totalOutstanding)}</td>
                                        <td className="px-4 py-3">100%</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </ReportLayout>
    );
}
