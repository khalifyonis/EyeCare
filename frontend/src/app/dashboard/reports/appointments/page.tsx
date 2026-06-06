'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import {
  LineChart,
  Line,
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
  Calendar,
  CheckCircle,
  XCircle,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import ReportLayout from '../_components/report-layout';

type AppointmentData = {
  kpis: {
    totalAppointments: number;
    completionRate: number;
    cancellationRate: number;
    avgPerDay: number;
  };
  chart1: Array<{ name: string; total: number; completed: number; cancelled: number }>;
  chart2: Array<{ name: string; value: number }>;
  tableData: Array<{
    id: string;
    bookingNumber: string | null;
    appointmentDate: string;
    status: string;
    amount: string | number;
    type: string | null;
    patient: { fullName: string } | null;
    doctor: { user: { fullName: string } } | null;
  }>;
};

const COLORS = ['#0EA5E9', '#10B981', '#EF4444', '#F97316', '#8B5CF6'];

export default function AppointmentReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await api.get(`/reports/appointments?${params.toString()}`);
      setData(res.data);
    } catch {
      toast.error('Failed to load appointments report');
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
      
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, 210, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('AL-IXSAAN Eye Care', 14, 14);
      doc.setFontSize(11);
      doc.text('Appointments Performance & Booking Logs', 14, 22);
      doc.setFontSize(9);
      doc.text(`Period: ${from || 'All Time'} to ${to || 'Today'}`, 14, 28);
      doc.setTextColor(0, 0, 0);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 130, 28);

      let y = 42;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('BOOKINGS SUMMARY STATISTICS', 14, y);
      doc.setFont('helvetica', 'normal');
      y += 8;

      const items = [
        ['Total Bookings Count', String(data.kpis.totalAppointments)],
        ['Completion Rate', `${data.kpis.completionRate.toFixed(1)}%`],
        ['Cancellation Rate', `${data.kpis.cancellationRate.toFixed(1)}%`],
        ['Average Bookings Per Day', `${data.kpis.avgPerDay.toFixed(1)}`],
      ];

      for (const [label, val] of items) {
        doc.text(label, 14, y);
        doc.text(val, 120, y);
        y += 7;
      }

      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('DETAILED APPOINTMENT BOOKING LIST', 14, y);
      doc.setFont('helvetica', 'normal');
      y += 6;

      // Table headers
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y - 4, 190, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('BOOKING #', 12, y);
      doc.text('DATE & TIME', 45, y);
      doc.text('PATIENT', 85, y);
      doc.text('DOCTOR', 125, y);
      doc.text('TYPE', 160, y);
      doc.text('STATUS', 182, y);
      doc.setFont('helvetica', 'normal');
      y += 7;

      for (const row of data.tableData) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(row.bookingNumber || '—', 12, y);
        doc.text(new Date(row.appointmentDate).toLocaleString(), 45, y);
        doc.text(String(row.patient?.fullName || 'Unknown').slice(0, 20), 85, y);
        doc.text(String(row.doctor?.user.fullName || '—').slice(0, 18), 125, y);
        doc.text(row.type || 'consultation', 160, y);
        doc.text(row.status, 182, y);
        y += 5.5;
      }

      doc.save(`appointments-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const exportCsv = () => {
    if (!data || !data.tableData.length) return;
    const headers = ['Booking Number', 'Date', 'Patient Name', 'Doctor Name', 'Type', 'Amount', 'Status'];
    const lines = data.tableData.map(row => {
      const cells = [
        row.bookingNumber || '—',
        new Date(row.appointmentDate).toLocaleString(),
        row.patient?.fullName || 'Unknown',
        row.doctor?.user.fullName || '—',
        row.type || 'consultation',
        Number(row.amount).toFixed(2),
        row.status
      ];
      return cells.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `appointments-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <ReportLayout
      title="Appointment Analytics"
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
            <p className="text-sm font-medium text-slate-400">Loading appointment reports...</p>
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Bookings"
              value={String(data.kpis.totalAppointments)}
              icon={Calendar}
              color="blue"
            />
            <StatsCard
              title="Completion Rate"
              value={`${data.kpis.completionRate.toFixed(1)}%`}
              icon={CheckCircle}
              color="emerald"
            />
            <StatsCard
              title="Cancellation Rate"
              value={`${data.kpis.cancellationRate.toFixed(1)}%`}
              icon={XCircle}
              color="rose"
            />
            <StatsCard
              title="Average per Day"
              value={data.kpis.avgPerDay.toFixed(1)}
              icon={TrendingUp}
              color="purple"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Bookings Trend chart */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">Booking Volume Trend</h2>
              </div>
              <div className="h-64">
                {data.chart1.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.chart1} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          borderRadius: 8,
                          border: '1px solid hsl(var(--border))',
                          fontSize: 11,
                        }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="total" name="Total Booked" stroke="#0EA5E9" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="completed" name="Completed" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="cancelled" name="Cancelled" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    No booking trend logs found in this timeframe
                  </div>
                )}
              </div>
            </div>

            {/* Appointment Status Distribution */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col">
              <div className="mb-4">
                <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">Status Distribution</h2>
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
                  <div className="text-xs text-slate-400 text-center">
                    No status metrics found for selected period
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bookings Datatable */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">Booking Registry Logs</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <th className="px-5 py-3 text-left">Booking #</th>
                    <th className="px-5 py-3 text-left">Date & Time</th>
                    <th className="px-5 py-3 text-left">Patient</th>
                    <th className="px-5 py-3 text-left">Assigned Doctor</th>
                    <th className="px-5 py-3 text-left">Visit Type</th>
                    <th className="px-5 py-3 text-right">Fee</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {data.tableData.length > 0 ? (
                    data.tableData.map((row) => {
                      const completed = row.status === 'COMPLETED';
                      const cancelled = row.status === 'CANCELLED';
                      const statusClasses = completed
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
                        : cancelled
                        ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-700'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-700';

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-100">{row.bookingNumber || '—'}</td>
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{new Date(row.appointmentDate).toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-slate-700 dark:text-slate-200 font-semibold">{row.patient?.fullName || 'Unknown'}</td>
                          <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 font-medium">{row.doctor?.user.fullName || '—'}</td>
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 uppercase font-medium">{row.type || 'consultation'}</td>
                          <td className="px-5 py-3.5 text-right text-slate-700 dark:text-slate-200 font-bold tabular-nums">${Number(row.amount).toFixed(2)}</td>
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
                      <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">
                        No appointments found matching filters.
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
          Please apply date filters to retrieve appointments.
        </div>
      )}
    </ReportLayout>
  );
}
