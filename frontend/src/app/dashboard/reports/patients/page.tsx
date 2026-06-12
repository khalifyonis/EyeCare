'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { 
  Users, 
  UserPlus, 
  Calendar,
  Users2,
  Loader2,
  Filter,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReportLayout from '../_components/report-layout';

type PatientData = {
  kpis: {
    totalPatients: number;
    newInPeriod: number;
    genderDist: string;
    avgAge: number;
  };
  chart1: Array<{ name: string; value: number }>;
  chart2: Array<{ name: string; value: number }>;
  tableData: Array<{
    id: string;
    fullName: string;
    gender: string | null;
    dateOfBirth: string;
    phone: string;
    email: string | null;
    address: string | null;
    bloodGroup: string | null;
    createdAt: string;
  }>;
};

const COLORS = ['#0EA5E9', '#8B5CF6', '#10B981', '#F97316', '#EF4444'];

export default function PatientReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [data, setData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (genderFilter !== 'all') params.set('gender', genderFilter);
      const res = await api.get(`/reports/patients?${params.toString()}`);
      setData(res.data);
    } catch {
      toast.error('Failed to load patient analytics data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, genderFilter]);

  const exportPdf = async () => {
    if (!data) return;
    setExportingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, 210, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('AL-IXSAAN Eye Care', 14, 14);
      doc.setFontSize(11);
      doc.text('Patient Demographics & Registration Report', 14, 22);
      doc.setFontSize(9);
      doc.text(`Period: ${from || 'All Time'} to ${to || 'Today'}`, 14, 28);
      doc.setTextColor(0, 0, 0);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 130, 28);

      let y = 42;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('PATIENT DEMOGRAPHIC STATISTICS', 14, y);
      doc.setFont('helvetica', 'normal');
      y += 8;

      const items = [
        ['Total Registered Patients', String(data.kpis.totalPatients)],
        ['New Registrations in Selected Period', String(data.kpis.newInPeriod)],
        ['Gender Breakdown (Male/Female)', data.kpis.genderDist],
        ['Average Patient Age', `${data.kpis.avgAge} years`],
      ];

      for (const [label, val] of items) {
        doc.text(label, 14, y);
        doc.text(val, 120, y);
        y += 7;
      }

      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('NEW REGISTRATIONS LOG IN PERIOD', 14, y);
      doc.setFont('helvetica', 'normal');
      y += 6;

      // Table headers
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y - 4, 190, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('NAME', 12, y);
      doc.text('GENDER', 55, y);
      doc.text('DATE OF BIRTH', 78, y);
      doc.text('PHONE', 110, y);
      doc.text('BLOOD GROUP', 142, y);
      doc.text('REGISTERED DATE', 170, y);
      doc.setFont('helvetica', 'normal');
      y += 7;

      for (const row of data.tableData) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(row.fullName.slice(0, 24), 12, y);
        doc.text(row.gender || '—', 55, y);
        doc.text(new Date(row.dateOfBirth).toLocaleDateString(), 78, y);
        doc.text(row.phone, 110, y);
        doc.text(row.bloodGroup || '—', 142, y);
        doc.text(new Date(row.createdAt).toLocaleDateString(), 170, y);
        y += 5.5;
      }

      doc.save(`patients-demographics-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const exportCsv = () => {
    if (!data || !data.tableData.length) return;
    const headers = ['Full Name', 'Gender', 'Date of Birth', 'Phone', 'Email', 'Blood Group', 'Address', 'Registered Date'];
    const lines = data.tableData.map(row => {
      const cells = [
        row.fullName,
        row.gender || '—',
        new Date(row.dateOfBirth).toLocaleDateString(),
        row.phone,
        row.email || '—',
        row.bloodGroup || '—',
        row.address || '—',
        new Date(row.createdAt).toLocaleDateString()
      ];
      return cells.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patients-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <ReportLayout
      title="Patient Analytics"
      from={from}
      to={to}
      setFrom={setFrom}
      setTo={setTo}
      onRefresh={fetchData}
      exportPdf={exportPdf}
      exportCsv={exportCsv}
      print={handlePrint}
      exportingPdf={exportingPdf}
      hasData={!!data}
    >
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <Filter className="h-3.5 w-3.5" />
          Filters
        </div>
        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger className="h-8 w-[150px] text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <SelectValue placeholder="All Genders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genders</SelectItem>
            <SelectItem value="MALE">Male</SelectItem>
            <SelectItem value="FEMALE">Female</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0EA5E9]" />
            <p className="text-sm font-medium text-slate-400">Loading patient analytics...</p>
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6">

          {/* Premium KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Patients', value: data.kpis.totalPatients.toLocaleString(), icon: Users, color: 'from-emerald-500 to-teal-600 shadow-emerald-500/25' },
              { label: 'New in Period', value: data.kpis.newInPeriod.toLocaleString(), icon: UserPlus, color: 'from-sky-500 to-blue-600 shadow-sky-500/25' },
              { label: 'Gender (M / F)', value: data.kpis.genderDist, icon: Users2, color: 'from-violet-500 to-purple-600 shadow-violet-500/25' },
              { label: 'Average Age', value: `${data.kpis.avgAge} yrs`, icon: Calendar, color: 'from-amber-500 to-orange-600 shadow-amber-500/25' },
            ].map(k => (
              <div key={k.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${k.color} p-5 text-white shadow-lg`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-90">{k.label}</p>
                    <p className="mt-1 text-2xl font-bold">{k.value}</p>
                  </div>
                  <div className="rounded-xl bg-white/20 p-2.5"><k.icon className="h-5 w-5" /></div>
                </div>
                <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* New Signups Line Chart */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">Patient Growth Trend</h2>
                <p className="text-xs text-slate-400">New patient registration logs over selected period</p>
              </div>
              <div className="h-64">
                {data.chart1.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.chart1} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        formatter={(val: any) => [val, 'New Patients']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          borderRadius: 8,
                          border: '1px solid hsl(var(--border))',
                          fontSize: 11,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#0EA5E9"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    No new registration trend data for this timeframe
                  </div>
                )}
              </div>
            </div>

            {/* Age Range Distribution Bar Chart */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col">
              <div className="mb-4">
                <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">Age Demographics</h2>
                <p className="text-xs text-slate-400">Active patients count categorized by age ranges</p>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                {data.chart2.length > 0 ? (
                  <div className="w-full h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.chart2} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} />
                        <RechartsTooltip
                          formatter={(val: any) => [val, 'Patients']}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            borderRadius: 8,
                            border: '1px solid hsl(var(--border))',
                            fontSize: 11,
                          }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {data.chart2.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 text-center">
                    No age demographic logs found
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Registrations Logs Datatable */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">Period Registry Logs</h2>
              <p className="text-xs text-slate-400">Listing of patients registered inside the date limits</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <th className="px-5 py-3 text-left">Patient Name</th>
                    <th className="px-5 py-3 text-left">Gender</th>
                    <th className="px-5 py-3 text-left">Date of Birth</th>
                    <th className="px-5 py-3 text-left">Phone No</th>
                    <th className="px-5 py-3 text-left">Blood Group</th>
                    <th className="px-5 py-3 text-left">Address</th>
                    <th className="px-5 py-3 text-left">Reg Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {data.tableData.length > 0 ? (
                    data.tableData.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-100">{row.fullName}</td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-medium uppercase">{row.gender || '—'}</td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{new Date(row.dateOfBirth).toLocaleDateString()}</td>
                        <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 font-medium">{row.phone}</td>
                        <td className="px-5 py-3.5 text-center text-slate-600 dark:text-slate-300 font-bold">{row.bloodGroup || '—'}</td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-medium">{row.address || '—'}</td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{new Date(row.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">
                        No registrations logged in this duration.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
          Please apply date filters to render patient metrics.
        </div>
      )}
    </ReportLayout>
  );
}
