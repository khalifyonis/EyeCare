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
  Activity, 
  Scissors, 
  RotateCcw,
  Loader2,
  Filter,
  Users,
  ClipboardList,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReportLayout from '../_components/report-layout';

type ClinicalData = {
  kpis: {
    totalExaminations: number;
    surgeriesDone: number;
    prescriptions: number;
    followUpRate: number;
  };
  chart1: Array<{ name: string; exams: number; surgeries: number }>;
  chart2: Array<{ name: string; value: number }>;
  tableData: Array<{
    id: string;
    date: string;
    patient: string;
    doctor: string;
    type: 'Eye Examination' | 'Surgery';
    details: string;
    status: string;
  }>;
  doctors?: { id: string; user: { fullName: string } }[];
};

const COLORS = ['#0EA5E9', '#8B5CF6', '#F97316', '#10B981', '#EF4444'];

export default function ClinicalReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<ClinicalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [clinicalType, setClinicalType] = useState<'all' | 'exams' | 'surgeries'>('all');
  const [doctorId, setDoctorId] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (clinicalType !== 'all') params.set('type', clinicalType);
      if (doctorId !== 'all') params.set('doctorId', doctorId);
      const res = await api.get(`/reports/clinical?${params.toString()}`);
      setData(res.data);
    } catch {
      toast.error('Failed to load clinical reports');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, clinicalType, doctorId]);

  // Filter table data in memory
  const getFilteredTableData = () => {
    if (!data) return [];
    return data.tableData.filter((row) => {
      if (clinicalType === 'exams') return row.type === 'Eye Examination';
      if (clinicalType === 'surgeries') return row.type === 'Surgery';
      return true;
    });
  };

  const exportPdf = async () => {
    if (!data) return;
    setExportingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const filteredTable = getFilteredTableData();
      
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, 210, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('AL-IXSAAN Eye Care', 14, 14);
      doc.setFontSize(11);
      
      let typeText = 'All Clinical Analytics';
      if (clinicalType === 'exams') typeText = 'Eye Examinations Analytics';
      if (clinicalType === 'surgeries') typeText = 'Surgeries Analytics';
      doc.text(typeText, 14, 22);
      
      doc.setFontSize(9);
      doc.text(`Period: ${from || 'All Time'} to ${to || 'Today'}`, 14, 28);
      doc.setTextColor(0, 0, 0);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 130, 28);

      let y = 42;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('CLINICAL PERFORMANCE METRICS', 14, y);
      doc.setFont('helvetica', 'normal');
      y += 8;

      const items = [];
      if (clinicalType === 'all' || clinicalType === 'exams') {
        items.push(['Total Eye Examinations', String(data.kpis.totalExaminations)]);
      }
      if (clinicalType === 'all' || clinicalType === 'surgeries') {
        items.push(['Surgeries Completed', String(data.kpis.surgeriesDone)]);
      }
      items.push(['Clinical Prescriptions Issued', String(data.kpis.prescriptions)]);
      items.push(['Patient Follow-up Compliance Rate', `${data.kpis.followUpRate.toFixed(1)}%`]);

      for (const [label, val] of items) {
        doc.text(label, 14, y);
        doc.text(val, 120, y);
        y += 7;
      }

      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('CASE LOGS RECORD', 14, y);
      doc.setFont('helvetica', 'normal');
      y += 6;

      // Table headers
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y - 4, 190, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('DATE', 12, y);
      doc.text('TYPE', 35, y);
      doc.text('PATIENT', 68, y);
      doc.text('DOCTOR', 108, y);
      doc.text('DIAGNOSIS / PROCEDURE', 142, y);
      doc.text('STATUS', 182, y);
      doc.setFont('helvetica', 'normal');
      y += 7;

      for (const row of filteredTable) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(new Date(row.date).toLocaleDateString(), 12, y);
        doc.text(row.type, 35, y);
        doc.text(String(row.patient || 'Unknown').slice(0, 20), 68, y);
        doc.text(String(row.doctor || '—').slice(0, 18), 108, y);
        doc.text(String(row.details || '—').slice(0, 24), 142, y);
        doc.text(row.status, 182, y);
        y += 5.5;
      }

      doc.save(`clinical-report-${clinicalType}-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const exportCsv = () => {
    const filteredTable = getFilteredTableData();
    if (!filteredTable.length) return;
    const headers = ['Date', 'Type', 'Patient Name', 'Doctor Name', 'Diagnosis / Details', 'Status'];
    const lines = filteredTable.map(row => {
      const cells = [
        new Date(row.date).toLocaleDateString(),
        row.type,
        row.patient || 'Unknown',
        row.doctor || '—',
        row.details || '—',
        row.status
      ];
      return cells.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clinical-report-${clinicalType}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredTable = getFilteredTableData();

  return (
    <ReportLayout
      title="Clinical Analytics"
      from={from}
      to={to}
      setFrom={setFrom}
      setTo={setTo}
      onRefresh={fetchData}
      exportPdf={exportPdf}
      exportCsv={exportCsv}
      print={handlePrint}
      exportingPdf={exportingPdf}
      hasData={filteredTable.length > 0}
    >
      {loading ? (
        <div className="flex h-64 items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0EA5E9]" />
            <p className="text-sm font-medium text-slate-400">Loading clinical analytics...</p>
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 report-no-print">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </div>
            <Select value={clinicalType} onValueChange={(v) => setClinicalType(v as any)}>
              <SelectTrigger className="h-8 w-[170px] text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clinical</SelectItem>
                <SelectItem value="exams">Eye Examinations</SelectItem>
                <SelectItem value="surgeries">Surgeries</SelectItem>
              </SelectContent>
            </Select>
            {data.doctors && data.doctors.length > 0 && (
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
          </div>

          {/* Premium KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { show: clinicalType !== 'surgeries', label: 'Eye Examinations', value: data.kpis.totalExaminations, icon: Activity, color: 'from-emerald-500 to-teal-600 shadow-emerald-500/25' },
              { show: clinicalType !== 'exams', label: 'Surgeries Done', value: data.kpis.surgeriesDone, icon: Scissors, color: 'from-violet-500 to-purple-600 shadow-violet-500/25' },
              { show: true, label: 'Prescriptions', value: data.kpis.prescriptions, icon: ClipboardList, color: 'from-sky-500 to-blue-600 shadow-sky-500/25' },
              { show: true, label: 'Follow-up Rate', value: `${data.kpis.followUpRate.toFixed(1)}%`, icon: RotateCcw, color: 'from-amber-500 to-orange-600 shadow-amber-500/25' },
            ].filter(k => k.show).map(k => (
              <div key={k.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${k.color} p-5 text-white shadow-lg`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-90">{k.label}</p>
                    <p className="mt-1 text-2xl font-bold">{typeof k.value === 'number' ? k.value.toLocaleString() : k.value}</p>
                  </div>
                  <div className="rounded-xl bg-white/20 p-2.5"><k.icon className="h-5 w-5" /></div>
                </div>
                <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Clinical Volume Trend */}
            <div className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm ${
              clinicalType === 'exams' ? 'lg:col-span-3' : 'lg:col-span-2'
            }`}>
              <div className="mb-4">
                <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">Clinical Volumes</h2>
                <p className="text-xs text-slate-400">Trend of eye examinations and surgeries performed</p>
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
                      {(clinicalType === 'all' || clinicalType === 'exams') && (
                        <Line
                          type="monotone"
                          dataKey="exams"
                          name="Eye Exams"
                          stroke="#0EA5E9"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      )}
                      {(clinicalType === 'all' || clinicalType === 'surgeries') && (
                        <Line
                          type="monotone"
                          dataKey="surgeries"
                          name="Surgeries"
                          stroke="#F97316"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    No diagnostics trend data in selected period
                  </div>
                )}
              </div>
            </div>

            {/* Surgery Types Distribution */}
            {clinicalType !== 'exams' && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col">
                <div className="mb-4">
                  <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">Surgery Categories</h2>
                  <p className="text-xs text-slate-400">Completed surgical procedure types distribution</p>
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
                                <span className="text-slate-600 dark:text-slate-200 capitalize">{s.name}</span>
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
                      No surgery distribution statistics found in selected date range
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Clinical Cases Datatable */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">Case Logs Summary</h2>
              <p className="text-xs text-slate-400">Eye examinations and surgeries records</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <th className="px-5 py-3 text-left">Date</th>
                    <th className="px-5 py-3 text-left">Type</th>
                    <th className="px-5 py-3 text-left">Patient</th>
                    <th className="px-5 py-3 text-left">Doctor/Surgeon</th>
                    <th className="px-5 py-3 text-left">Diagnosis / Procedures</th>
                    <th className="px-5 py-3 text-center">Status / Stage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredTable.length > 0 ? (
                    filteredTable.map((row, idx) => {
                      const typeClasses = row.type === 'Eye Examination'
                        ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                        : 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
                      
                      const completed = row.status === 'COMPLETED' || row.status === 'completed' || row.status === 'DONE';
                      const statusClasses = completed
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';

                      return (
                        <tr key={row.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{new Date(row.date).toLocaleDateString()}</td>
                          <td className="px-5 py-3.5 font-medium">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${typeClasses}`}>
                              {row.type}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-700 dark:text-slate-200 font-semibold">{row.patient || 'Unknown'}</td>
                          <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 font-medium">{row.doctor || '—'}</td>
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-medium">{row.details || '—'}</td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusClasses}`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                        No clinical case files logged for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:bg-slate-800 text-slate-400 text-sm">
          Please apply date filters to render clinical cases.
        </div>
      )}
    </ReportLayout>
  );
}
