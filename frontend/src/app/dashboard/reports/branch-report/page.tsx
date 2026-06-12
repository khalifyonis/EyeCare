'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Legend,
} from 'recharts';
import { Building2, DollarSign, Calendar, Users, Loader2, BarChart3 } from 'lucide-react';
import ReportLayout from '../_components/report-layout';

const COLORS = ['#0EA5E9', '#8B5CF6', '#F97316', '#10B981', '#EF4444', '#F59E0B'];
const fmt = (n: number) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type BranchRow = {
    branchId: string;
    branchName: string;
    isActive: boolean;
    revenue: number;
    outstanding: number;
    totalInvoices: number;
    appointments: number;
    surgeries: number;
    patients: number;
    exams: number;
};

type BranchData = {
    kpis: { totalBranches: number; totalRevenue: number; totalAppointments: number; totalPatients: number };
    chart1: { name: string; revenue: number; appointments: number }[];
    chart2: { name: string; value: number }[];
    tableData: BranchRow[];
};

export default function BranchReportPage() {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [data, setData] = useState<BranchData | null>(null);
    const [loading, setLoading] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            const res = await api.get(`/reports/branch-report?${params.toString()}`);
            setData(res.data);
        } catch {
            toast.error('Failed to load branch report');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [from, to]);

    const exportPdf = async () => {
        if (!data) return;
        setExportingPdf(true);
        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            doc.setFillColor(14, 165, 233);
            doc.rect(0, 0, 297, 28, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.text('AL-IXSAAN Eye Care', 14, 12);
            doc.setFontSize(10);
            doc.text('Branch Performance Report', 14, 20);
            doc.setFontSize(8);
            doc.text(`Period: ${from || 'All Time'} — ${to || 'Today'}  |  Generated: ${new Date().toLocaleString()}`, 14, 26);

            let y = 38;
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            const headers = ['Branch', 'Status', 'Revenue', 'Outstanding', 'Invoices', 'Appointments', 'Surgeries', 'Patients', 'Exams'];
            const colW = [50, 20, 30, 30, 20, 25, 20, 20, 20];
            let x = 14;
            doc.setFillColor(241, 245, 249);
            doc.rect(14, y - 5, 269, 7, 'F');
            for (let i = 0; i < headers.length; i++) { doc.text(headers[i], x, y); x += colW[i]; }
            y += 6;
            doc.setFont('helvetica', 'normal');
            for (const row of data.tableData) {
                if (y > 195) { doc.addPage(); y = 20; }
                x = 14;
                const vals = [row.branchName, row.isActive ? 'Active' : 'Inactive', fmt(row.revenue), fmt(row.outstanding), String(row.totalInvoices), String(row.appointments), String(row.surgeries), String(row.patients), String(row.exams)];
                for (let i = 0; i < vals.length; i++) { doc.text(vals[i], x, y); x += colW[i]; }
                y += 6;
            }
            const pages = doc.getNumberOfPages();
            for (let i = 1; i <= pages; i++) {
                doc.setPage(i);
                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);
                doc.text('AL-IXSAAN Eye Care — Confidential', 14, 203);
                doc.text(`Page ${i} of ${pages}`, 275, 203);
            }
            doc.save(`branch-report-${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch { toast.error('Export failed'); } finally { setExportingPdf(false); }
    };

    const exportCsv = () => {
        if (!data) return;
        const rows = [['Branch', 'Status', 'Revenue', 'Outstanding', 'Invoices', 'Appointments', 'Surgeries', 'Patients', 'Exams']];
        for (const r of data.tableData) {
            rows.push([r.branchName, r.isActive ? 'Active' : 'Inactive', r.revenue.toFixed(2), r.outstanding.toFixed(2), String(r.totalInvoices), String(r.appointments), String(r.surgeries), String(r.patients), String(r.exams)]);
        }
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `branch-report-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    return (
        <ReportLayout
            title="Branch Report"
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
                        {[
                            { label: 'Total Branches', value: data.kpis.totalBranches, icon: Building2, color: 'from-sky-500 to-blue-600 shadow-sky-500/25' },
                            { label: 'Total Revenue', value: fmt(data.kpis.totalRevenue), icon: DollarSign, color: 'from-emerald-500 to-teal-600 shadow-emerald-500/25' },
                            { label: 'Total Appointments', value: data.kpis.totalAppointments, icon: Calendar, color: 'from-violet-500 to-purple-600 shadow-violet-500/25' },
                            { label: 'New Patients', value: data.kpis.totalPatients, icon: Users, color: 'from-amber-500 to-orange-600 shadow-amber-500/25' },
                        ].map((kpi) => (
                            <div key={kpi.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${kpi.color} p-5 text-white shadow-lg`}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium opacity-90">{kpi.label}</p>
                                        <p className="mt-1 text-2xl font-bold">{kpi.value}</p>
                                    </div>
                                    <div className="rounded-xl bg-white/20 p-2.5"><kpi.icon className="h-5 w-5" /></div>
                                </div>
                                <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
                            </div>
                        ))}
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Revenue & Appointments by Branch</h3>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={data.chart1}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                                    <RechartsTooltip />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="right" dataKey="appointments" name="Appointments" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Revenue Share by Branch</h3>
                            <ResponsiveContainer width="100%" height={240}>
                                <RePieChart>
                                    <Pie data={data.chart2.filter(d => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                        {data.chart2.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <RechartsTooltip formatter={(v: number) => fmt(v)} />
                                </RePieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Branch Comparison Table */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Branch Performance Comparison</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50">
                                    <tr>
                                        {['Branch', 'Status', 'Revenue', 'Outstanding', 'Invoices', 'Appointments', 'Surgeries', 'Patients', 'Exams'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {data.tableData.length === 0 ? (
                                        <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No branches found</td></tr>
                                    ) : data.tableData.map((row) => (
                                        <tr key={row.branchId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{row.branchName}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${row.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                    {row.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-emerald-600">{fmt(row.revenue)}</td>
                                            <td className="px-4 py-3 text-red-500">{row.outstanding > 0 ? fmt(row.outstanding) : '—'}</td>
                                            <td className="px-4 py-3 text-slate-600">{row.totalInvoices}</td>
                                            <td className="px-4 py-3 text-slate-600">{row.appointments}</td>
                                            <td className="px-4 py-3 text-violet-600 font-semibold">{row.surgeries}</td>
                                            <td className="px-4 py-3 text-sky-600">{row.patients}</td>
                                            <td className="px-4 py-3 text-slate-600">{row.exams}</td>
                                        </tr>
                                    ))}
                                    {data.tableData.length > 0 && (
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold">
                                            <td className="px-4 py-3 text-slate-900 dark:text-white" colSpan={2}>TOTAL</td>
                                            <td className="px-4 py-3 text-emerald-600">{fmt(data.kpis.totalRevenue)}</td>
                                            <td className="px-4 py-3 text-red-500">{fmt(data.tableData.reduce((s, r) => s + r.outstanding, 0))}</td>
                                            <td className="px-4 py-3">{data.tableData.reduce((s, r) => s + r.totalInvoices, 0)}</td>
                                            <td className="px-4 py-3">{data.kpis.totalAppointments}</td>
                                            <td className="px-4 py-3 text-violet-600">{data.tableData.reduce((s, r) => s + r.surgeries, 0)}</td>
                                            <td className="px-4 py-3 text-sky-600">{data.kpis.totalPatients}</td>
                                            <td className="px-4 py-3">{data.tableData.reduce((s, r) => s + r.exams, 0)}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </ReportLayout>
    );
}
