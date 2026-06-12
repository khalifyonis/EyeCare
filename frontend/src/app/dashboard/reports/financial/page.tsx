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
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { 
  DollarSign, 
  FileText, 
  TrendingUp, 
  AlertTriangle,
  Loader2,
  Filter,
} from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReportLayout from '../_components/report-layout';

type FinancialData = {
  kpis: {
    totalRevenue: number;
    outstanding: number;
    totalInvoices: number;
    avgInvoice: number;
  };
  chart1: Array<{ name: string; value: number }>;
  chart2: Array<{ name: string; value: number }>;
  chart3?: Array<{ name: string; value: number }>;
  tableData: Array<{
    id: string;
    createdAt: string;
    status: string;
    finalAmount: string | number;
    totalAmount: string | number;
    discount: string | number;
    serviceType: string;
    invoiceNumber: string | null;
    paymentMethod: string | null;
    patient: { fullName: string; patientNumber?: string } | null;
    appointment?: { doctor?: { id: string; user?: { fullName: string } } } | null;
    surgery?: { surgeon?: { id: string; user?: { fullName: string } } } | null;
    createdBy?: { id: string; fullName: string } | null;
    branch?: { branchName: string } | null;
  }>;
  doctors?: { id: string; user: { fullName: string } }[];
  users?: { id: string; fullName: string; role: string }[];
};

const COLORS = ['#0EA5E9', '#8B5CF6', '#F97316', '#10B981', '#EF4444'];

export default function FinancialReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [doctorId, setDoctorId] = useState('all');
  const [userId, setUserId] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (doctorId !== 'all') params.set('doctorId', doctorId);
      if (userId !== 'all') params.set('userId', userId);
      if (paymentMethod !== 'all') params.set('paymentMethod', paymentMethod);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await api.get(`/reports/financial-enhanced?${params.toString()}`);
      setData(res.data);
    } catch {
      toast.error('Failed to load financial report data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, doctorId, userId, paymentMethod, statusFilter]);

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
      doc.text('Financial Analysis & Invoice Report', 14, 22);
      doc.setFontSize(9);
      doc.text(`Period: ${from || 'All Time'} to ${to || 'Today'}`, 14, 28);
      doc.setTextColor(0, 0, 0);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 130, 28);

      let y = 42;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('KEY PERFORMANCE INDICATORS', 14, y);
      doc.setFont('helvetica', 'normal');
      y += 8;

      const items = [
        ['Total Revenue (Paid Invoices)', `$${data.kpis.totalRevenue.toFixed(2)}`],
        ['Average Invoice Value', `$${data.kpis.avgInvoice.toFixed(2)}`],
        ['Outstanding Balance', `$${data.kpis.outstanding.toFixed(2)}`],
        ['Total Invoiced Count', String(data.kpis.totalInvoices)],
      ];

      for (const [label, val] of items) {
        doc.text(label, 14, y);
        doc.text(val, 120, y);
        y += 7;
      }

      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('DETAILED INVOICE TRANSACTION LOG', 14, y);
      doc.setFont('helvetica', 'normal');
      y += 6;

      // Table headers
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y - 4, 190, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE NO', 12, y);
      doc.text('DATE', 42, y);
      doc.text('PATIENT', 68, y);
      doc.text('SERVICE TYPE', 115, y);
      doc.text('FINAL AMOUNT', 150, y);
      doc.text('STATUS', 182, y);
      doc.setFont('helvetica', 'normal');
      y += 7;

      let idx = 1;
      for (const row of data.tableData) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(row.invoiceNumber || '—', 12, y);
        doc.text(new Date(row.createdAt).toLocaleDateString(), 42, y);
        doc.text(row.patient?.fullName.slice(0, 24) || 'Unknown', 68, y);
        doc.text(row.serviceType, 115, y);
        doc.text(`$${Number(row.finalAmount).toFixed(2)}`, 150, y);
        doc.text(row.status, 182, y);
        y += 5.5;
        idx++;
      }

      doc.save(`financial-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const exportCsv = () => {
    if (!data || !data.tableData.length) return;
    const headers = ['Invoice Number', 'Date', 'Patient Name', 'Service Type', 'Discount', 'Total Amount', 'Final Amount', 'Status', 'Payment Method'];
    const lines = data.tableData.map(row => {
      const cells = [
        row.invoiceNumber || '—',
        new Date(row.createdAt).toLocaleDateString(),
        row.patient?.fullName || 'Unknown',
        row.serviceType,
        Number(row.discount).toFixed(2),
        Number(row.totalAmount).toFixed(2),
        Number(row.finalAmount).toFixed(2),
        row.status,
        row.paymentMethod || '—'
      ];
      return cells.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financial-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <ReportLayout
      title="Financial Reports"
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
      {/* Advanced Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <Filter className="h-3.5 w-3.5" />
          Advanced Filters
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[150px] text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="UNPAID">Unpaid</SelectItem>
            <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger className="h-8 w-[160px] text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <SelectValue placeholder="Payment Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="CASH">Cash</SelectItem>
            <SelectItem value="CARD">Card</SelectItem>
            <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
            <SelectItem value="INSURANCE">Insurance</SelectItem>
          </SelectContent>
        </Select>
        {data?.doctors && data.doctors.length > 0 && (
          <Select value={doctorId} onValueChange={setDoctorId}>
            <SelectTrigger className="h-8 w-[180px] text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <SelectValue placeholder="All Doctors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Doctors</SelectItem>
              {data.doctors.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.user.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {data?.users && data.users.length > 0 && (
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="h-8 w-[180px] text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <SelectValue placeholder="All Staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {data.users.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0EA5E9]" />
            <p className="text-sm font-medium text-slate-400">Loading financial reports...</p>
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Revenue"
              value={`$${data.kpis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={DollarSign}
              color="emerald"
            />
            <StatsCard
              title="Average Invoice"
              value={`$${data.kpis.avgInvoice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={TrendingUp}
              color="blue"
            />
            <StatsCard
              title="Outstanding Balances"
              value={`$${data.kpis.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={AlertTriangle}
              color="amber"
            />
            <StatsCard
              title="Total Invoices"
              value={String(data.kpis.totalInvoices)}
              icon={FileText}
              color="purple"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Revenue Trend Line Chart */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">Revenue Trend</h2>
              </div>
              <div className="h-64">
                {data.chart1.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.chart1} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Revenue']}
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
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    No revenue trend data in selected period
                  </div>
                )}
              </div>
            </div>

            {/* Revenue by Service Donut Chart */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col">
              <div className="mb-4">
                <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">Revenue by Service</h2>
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
                            formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Revenue']}
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
                              ${s.value.toFixed(2)} ({Math.round((s.value / (total || 1)) * 100)}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-slate-400">No category share data available</div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Method Chart */}
          {data.chart3 && data.chart3.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4">Revenue by Payment Method</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.chart3}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RechartsTooltip formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
                  <Bar dataKey="value" name="Revenue" fill="#0EA5E9" radius={[4, 4, 0, 0]}>
                    {data.chart3.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detailed Invoices Datatable */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">Detailed Transaction Log</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <th className="px-5 py-3 text-left">Invoice No</th>
                    <th className="px-5 py-3 text-left">Date</th>
                    <th className="px-5 py-3 text-left">Patient</th>
                    <th className="px-5 py-3 text-left">Doctor</th>
                    <th className="px-5 py-3 text-left">Service Type</th>
                    <th className="px-5 py-3 text-left">Payment</th>
                    <th className="px-5 py-3 text-right">Discount</th>
                    <th className="px-5 py-3 text-right">Total</th>
                    <th className="px-5 py-3 text-right">Final Amount</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {data.tableData.length > 0 ? (
                    data.tableData.map((row) => {
                      const statusClasses =
                        row.status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
                          : row.status === 'UNPAID'
                          ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-700'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-700';
                      const doctorName = row.appointment?.doctor?.user?.fullName || row.surgery?.surgeon?.user?.fullName || '—';
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-100">{row.invoiceNumber || '—'}</td>
                          <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{new Date(row.createdAt).toLocaleDateString()}</td>
                          <td className="px-5 py-3 text-slate-700 dark:text-slate-200 font-medium">{row.patient?.fullName || 'Unknown'}</td>
                          <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">{doctorName}</td>
                          <td className="px-5 py-3 text-slate-500 dark:text-slate-400 font-medium uppercase">{row.serviceType}</td>
                          <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs">{row.paymentMethod || '—'}</td>
                          <td className="px-5 py-3 text-right text-slate-500 dark:text-slate-400 tabular-nums">${Number(row.discount).toFixed(2)}</td>
                          <td className="px-5 py-3 text-right text-slate-500 dark:text-slate-400 tabular-nums">${Number(row.totalAmount).toFixed(2)}</td>
                          <td className="px-5 py-3 text-right text-slate-800 dark:text-slate-100 font-bold tabular-nums">${Number(row.finalAmount).toFixed(2)}</td>
                          <td className="px-5 py-3 text-center">
                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusClasses}`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-5 py-8 text-center text-sm text-slate-400">
                        No financial records found for this period.
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
          Please apply date filters or generate to load financial results.
        </div>
      )}
    </ReportLayout>
  );
}
