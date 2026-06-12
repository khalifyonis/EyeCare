'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import {
  AreaChart,
  Area,
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
  TrendingUp,
  DollarSign,
  CreditCard,
  ArrowDownToLine,
  Loader2,
  Filter,
  BarChart3,
} from 'lucide-react';
import ReportLayout from '../_components/report-layout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COLORS = ['#0EA5E9', '#8B5CF6', '#F97316', '#10B981', '#EF4444', '#F59E0B'];

const fmt = (n: number) =>
  `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type TrendData = {
  kpis: {
    totalRevenue: number;
    totalBilled: number;
    totalDiscount: number;
    outstanding: number;
    totalTransactions: number;
    paidTransactions: number;
    collectionRate: number;
  };
  trendChart: Array<{ name: string; revenue: number; transactions: number }>;
  serviceChart: Array<{ name: string; revenue: number; count: number }>;
  methodChart: Array<{ name: string; revenue: number; count: number }>;
  groupBy: string;
};

export default function RevenueTrendPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [groupBy, setGroupBy] = useState('day');
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('groupBy', groupBy);
      const res = await api.get(`/reports/revenue-trend?${params.toString()}`);
      setData(res.data);
    } catch {
      toast.error('Failed to load revenue trend data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, groupBy]);

  const exportPdf = async () => {
    if (!data) return;
    setExportingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, 297, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('AL-IXSAAN Eye Care', 14, 13);
      doc.setFontSize(11);
      doc.text('Revenue Trend & Collection Report', 14, 21);
      doc.setFontSize(9);
      doc.text(`Period: ${from || 'All Time'} — ${to || 'Today'} | Grouped by: ${groupBy.toUpperCase()}`, 14, 27);
      doc.setTextColor(0, 0, 0);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 220, 27);

      let y = 40;
      const kpis = [
        ['Total Revenue Collected', fmt(data.kpis.totalRevenue)],
        ['Total Amount Billed', fmt(data.kpis.totalBilled)],
        ['Total Discounts Given', fmt(data.kpis.totalDiscount)],
        ['Outstanding Receivables', fmt(data.kpis.outstanding)],
        ['Total Transactions', String(data.kpis.totalTransactions)],
        ['Collection Rate', `${data.kpis.collectionRate.toFixed(1)}%`],
      ];
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('KEY PERFORMANCE INDICATORS', 14, y);
      doc.setFont('helvetica', 'normal');
      y += 8;
      for (const [label, val] of kpis) {
        doc.setFontSize(9);
        doc.text(label, 14, y);
        doc.text(val, 140, y);
        y += 6.5;
      }

      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('REVENUE BY SERVICE TYPE', 14, y);
      doc.setFont('helvetica', 'normal');
      y += 7;
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y - 4, 270, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('SERVICE TYPE', 12, y);
      doc.text('TRANSACTIONS', 120, y);
      doc.text('REVENUE', 200, y);
      doc.setFont('helvetica', 'normal');
      y += 6;
      for (const row of data.serviceChart) {
        if (y > 190) { doc.addPage(); y = 20; }
        doc.text(row.name, 12, y);
        doc.text(String(row.count), 120, y);
        doc.text(fmt(row.revenue), 200, y);
        y += 5.5;
      }

      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('REVENUE BY PAYMENT METHOD', 14, y);
      doc.setFont('helvetica', 'normal');
      y += 7;
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y - 4, 270, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT METHOD', 12, y);
      doc.text('TRANSACTIONS', 120, y);
      doc.text('REVENUE', 200, y);
      doc.setFont('helvetica', 'normal');
      y += 6;
      for (const row of data.methodChart) {
        if (y > 190) { doc.addPage(); y = 20; }
        doc.text(row.name, 12, y);
        doc.text(String(row.count), 120, y);
        doc.text(fmt(row.revenue), 200, y);
        y += 5.5;
      }

      doc.save(`revenue-trend-${groupBy}-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const exportCsv = () => {
    if (!data) return;
    const headers = ['Period', 'Revenue', 'Transactions'];
    const lines = data.trendChart.map(r =>
      [`"${r.name}"`, `"${fmt(r.revenue)}"`, `"${r.transactions}"`].join(',')
    );
    const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `revenue-trend-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ReportLayout
      title="Revenue Trend"
      from={from}
      to={to}
      setFrom={setFrom}
      setTo={setTo}
      onRefresh={fetchData}
      exportPdf={exportPdf}
      exportCsv={exportCsv}
      print={() => window.print()}
      exportingPdf={exportingPdf}
      hasData={!!data}
    >
      {/* Group By Filter */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <Filter className="h-3.5 w-3.5" />
          Group By
        </div>
        <Select value={groupBy} onValueChange={setGroupBy}>
          <SelectTrigger className="h-8 w-[140px] text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Daily</SelectItem>
            <SelectItem value="month">Monthly</SelectItem>
            <SelectItem value="year">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0EA5E9]" />
            <p className="text-sm font-medium text-slate-400">Loading revenue data...</p>
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6">

          {/* Premium KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue', value: fmt(data.kpis.totalRevenue), icon: DollarSign, color: 'from-emerald-500 to-teal-600 shadow-emerald-500/25' },
              { label: 'Outstanding', value: fmt(data.kpis.outstanding), icon: ArrowDownToLine, color: 'from-red-500 to-rose-600 shadow-red-500/25' },
              { label: 'Collection Rate', value: `${data.kpis.collectionRate.toFixed(1)}%`, icon: TrendingUp, color: 'from-sky-500 to-blue-600 shadow-sky-500/25' },
              { label: 'Total Discounts', value: fmt(data.kpis.totalDiscount), icon: CreditCard, color: 'from-amber-500 to-orange-600 shadow-amber-500/25' },
            ].map(k => (
              <div key={k.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${k.color} p-5 text-white shadow-lg`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-90">{k.label}</p>
                    <p className="mt-1 text-xl font-bold">{k.value}</p>
                  </div>
                  <div className="rounded-xl bg-white/20 p-2.5"><k.icon className="h-5 w-5" /></div>
                </div>
                <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
              </div>
            ))}
          </div>

          {/* Revenue Trend Area Chart */}
          {data.trendChart.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-sky-500" />
                  Revenue Over Time ({groupBy === 'day' ? 'Daily' : groupBy === 'month' ? 'Monthly' : 'Yearly'})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Collected revenue and transaction volume trend</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trendChart} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 11 }}
                      formatter={(val: number) => [fmt(val), 'Revenue']}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0EA5E9" strokeWidth={2} fill="url(#revenueGrad)" dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Service & Method Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Revenue by Service */}
            {data.serviceChart.length > 0 && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4">Revenue by Service Type</h2>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.serviceChart} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={100} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 11 }}
                        formatter={(val: number) => [fmt(val), 'Revenue']}
                      />
                      <Bar dataKey="revenue" name="Revenue" radius={[0, 6, 6, 0]}>
                        {data.serviceChart.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Revenue by Payment Method */}
            {data.methodChart.length > 0 && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4">Revenue by Payment Method</h2>
                <div className="h-60 flex flex-col items-center justify-center gap-4">
                  <div className="w-44 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie data={data.methodChart} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="revenue" paddingAngle={3}>
                          {data.methodChart.map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} stroke="transparent" />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 11 }}
                          formatter={(val: number) => [fmt(val), 'Revenue']}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full space-y-1.5">
                    {data.methodChart.map((m, idx) => {
                      const total = data.methodChart.reduce((s, x) => s + x.revenue, 0);
                      return (
                        <div key={m.name} className="flex items-center justify-between text-xs px-1">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                            <span className="text-slate-600 dark:text-slate-300 font-medium">{m.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                            <span>{m.count} txns</span>
                            <span className="font-semibold">{total > 0 ? ((m.revenue / total) * 100).toFixed(1) : 0}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Trend Data Table */}
          {data.trendChart.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {groupBy === 'day' ? 'Daily' : groupBy === 'month' ? 'Monthly' : 'Annual'} Revenue Breakdown
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="px-5 py-3 text-left">Period</th>
                      <th className="px-5 py-3 text-right">Transactions</th>
                      <th className="px-5 py-3 text-right">Revenue Collected</th>
                      <th className="px-5 py-3 text-right">Avg per Transaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trendChart.map((row, idx) => (
                      <tr key={row.name} className={`border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/70 dark:hover:bg-slate-900/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30 dark:bg-slate-900/10'}`}>
                        <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-100">{row.name}</td>
                        <td className="px-5 py-3 text-right text-slate-600 dark:text-slate-300">{row.transactions}</td>
                        <td className="px-5 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{fmt(row.revenue)}</td>
                        <td className="px-5 py-3 text-right text-slate-500">{row.transactions > 0 ? fmt(row.revenue / row.transactions) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 font-bold text-sm border-t-2 border-slate-200 dark:border-slate-700">
                      <td className="px-5 py-3">Total</td>
                      <td className="px-5 py-3 text-right">{data.kpis.paidTransactions}</td>
                      <td className="px-5 py-3 text-right text-emerald-600">{fmt(data.kpis.totalRevenue)}</td>
                      <td className="px-5 py-3 text-right">{data.kpis.paidTransactions > 0 ? fmt(data.kpis.totalRevenue / data.kpis.paidTransactions) : '—'}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col items-center gap-3 text-center px-8">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <TrendingUp className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No data yet</p>
            <p className="text-xs text-slate-400 max-w-xs">Select a date range and choose how to group the revenue, then click Refresh.</p>
          </div>
        </div>
      )}
    </ReportLayout>
  );
}
