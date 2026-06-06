'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import {
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  Loader2 
} from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import ReportLayout from '../_components/report-layout';

type OperationalData = {
  kpis: {
    avgAppointmentsPerDay: number;
    followUpCompliance: number;
    overdueFollowUps: number;
    activeDoctors: number;
  };
  chart1: Array<{ name: string; value: number }>;
  chart2: Array<{ name: string; value: number }>;
  tableData: Array<{
    id: string;
    dueDate: string;
    status: string;
    sourceType: string;
    notes: string | null;
    patient: { fullName: string } | null;
    branch: { branchName: string } | null;
  }>;
};

const COLORS = ['#0EA5E9', '#8B5CF6', '#F97316', '#10B981', '#EF4444'];

export default function OperationalReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<OperationalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await api.get(`/reports/operational?${params.toString()}`);
      setData(res.data);
    } catch {
      toast.error('Failed to load operational report data');
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
      
      // Draw premium header
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, 210, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('AL-IXSAAN Eye Care', 14, 14);
      doc.setFontSize(11);
      doc.text('Operational Efficiency & Follow-Up Report', 14, 22);
      doc.setFontSize(9);
      doc.text(`Period: ${from || 'All Time'} to ${to || 'Today'}`, 14, 28);
      doc.setTextColor(0, 0, 0);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 130, 28);

      let y = 42;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('OPERATIONAL KEY METRICS', 14, y);
      doc.setFont('helvetica', 'normal');
      y += 8;

      const items = [
        ['Avg Appointments Per Day', data.kpis.avgAppointmentsPerDay.toFixed(1)],
        ['Follow-Up Compliance Rate', `${data.kpis.followUpCompliance.toFixed(1)}%`],
        ['Overdue Follow-Up Count', String(data.kpis.overdueFollowUps)],
        ['Active Doctors Count', String(data.kpis.activeDoctors)],
      ];

      for (const [label, val] of items) {
        doc.text(label, 14, y);
        doc.text(val, 120, y);
        y += 7;
      }

      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('DETAILED FOLLOW-UP LOG', 14, y);
      doc.setFont('helvetica', 'normal');
      y += 6;

      // Table headers
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y - 4, 190, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('DUE DATE', 12, y);
      doc.text('PATIENT', 42, y);
      doc.text('SOURCE', 85, y);
      doc.text('BRANCH', 115, y);
      doc.text('NOTES', 145, y);
      doc.text('STATUS', 182, y);
      doc.setFont('helvetica', 'normal');
      y += 7;

      for (const row of data.tableData) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(new Date(row.dueDate).toLocaleDateString(), 12, y);
        doc.text(row.patient?.fullName.slice(0, 22) || 'Unknown', 42, y);
        doc.text(row.sourceType, 85, y);
        doc.text(row.branch?.branchName.slice(0, 18) || '—', 115, y);
        doc.text((row.notes || '—').slice(0, 22), 145, y);
        doc.text(row.status, 182, y);
        y += 5.5;
      }

      doc.save(`operational-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const exportCsv = () => {
    if (!data || !data.tableData.length) return;
    const headers = ['Due Date', 'Patient Name', 'Source Type', 'Branch', 'Notes', 'Status'];
    const lines = data.tableData.map(row => {
      const cells = [
        new Date(row.dueDate).toLocaleDateString(),
        row.patient?.fullName || 'Unknown',
        row.sourceType,
        row.branch?.branchName || '—',
        row.notes || '—',
        row.status
      ];
      return cells.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `operational-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <ReportLayout
      title="Operational Reports"
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
      {loading ? (
        <div className="flex h-64 items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0EA5E9]" />
            <p className="text-sm font-medium text-slate-400">Loading operational reports...</p>
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Avg Appointments/Day"
              value={data.kpis.avgAppointmentsPerDay.toFixed(1)}
              icon={TrendingUp}
              color="blue"
            />
            <StatsCard
              title="Follow-Up Compliance"
              value={`${data.kpis.followUpCompliance.toFixed(1)}%`}
              icon={CheckCircle}
              color="emerald"
            />
            <StatsCard
              title="Overdue Follow-Ups"
              value={String(data.kpis.overdueFollowUps)}
              icon={AlertTriangle}
              color="rose"
            />
            <StatsCard
              title="Active Doctors"
              value={String(data.kpis.activeDoctors)}
              icon={Users}
              color="purple"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Doctor Workload */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">Doctor Workload</h2>
                <p className="text-xs text-slate-400">Number of appointments assigned per doctor in period</p>
              </div>
              <div className="h-64">
                {data.chart1.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chart1} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        formatter={(val: any) => [val, 'Appointments']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          borderRadius: 8,
                          border: '1px solid hsl(var(--border))',
                          fontSize: 11,
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {data.chart1.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    No doctor appointment assignments recorded in selected period
                  </div>
                )}
              </div>
            </div>

            {/* Follow-Up Status Pie Chart */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col">
              <div className="mb-4">
                <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">Follow-Up Statuses</h2>
                <p className="text-xs text-slate-400">Distribution of patient follow-up scheduling status</p>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                {data.chart2.length > 0 ? (
                  <>
                    <div className="w-40 h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={data.chart2}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                          >
                            {data.chart2.map((s, idx) => (
                              <Cell key={s.name} fill={COLORS[idx % COLORS.length]} stroke="transparent" />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--background))',
                              borderRadius: 8,
                              border: '1px solid hsl(var(--border))',
                              fontSize: 11,
                            }}
                          />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full space-y-1.5">
                      {data.chart2.map((s, idx) => {
                        const total = data.chart2.reduce((sum, item) => sum + item.value, 0);
                        return (
                          <div key={s.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                              <span className="text-slate-600 dark:text-slate-200 uppercase">{s.name}</span>
                            </div>
                            <span className="text-slate-500 dark:text-slate-300 font-medium">
                              {s.value} ({Math.round((s.value / (total || 1)) * 100)}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-slate-400 text-center flex-1 flex items-center justify-center">
                    No follow-ups recorded in this timeframe
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Follow-Ups Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">Follow-Up Compliance Registry</h2>
              <p className="text-xs text-slate-400">Detailed list of due follow-ups matched by filters</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <th className="px-5 py-3 text-left">Due Date</th>
                    <th className="px-5 py-3 text-left">Patient</th>
                    <th className="px-5 py-3 text-left">Source Type</th>
                    <th className="px-5 py-3 text-left">Branch</th>
                    <th className="px-5 py-3 text-left">Notes</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {data.tableData.length > 0 ? (
                    data.tableData.map((row) => {
                      const statusClasses =
                        row.status === 'DONE'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
                          : row.status === 'OVERDUE'
                          ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-700'
                          : row.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-700'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-100">{new Date(row.dueDate).toLocaleDateString()}</td>
                          <td className="px-5 py-3.5 text-slate-700 dark:text-slate-200 font-semibold">{row.patient?.fullName || 'Unknown'}</td>
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 uppercase font-medium">{row.sourceType}</td>
                          <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 font-medium">{row.branch?.branchName || '—'}</td>
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 max-w-xs truncate">{row.notes || '—'}</td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusClasses}`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                        No follow-up records found matching filters.
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
          Please apply date filters to load operational results.
        </div>
      )}
    </ReportLayout>
  );
}
