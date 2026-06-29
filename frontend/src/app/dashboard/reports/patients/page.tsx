'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Users, UserPlus, Calendar, Users2, Loader2,
  Download, Search, FileText, X,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ReportLayout from '../_components/report-layout';
import PatientRecordPreview from './_components/patient-record-preview';
import { downloadPatientMedicalRecord, normalizePatient, type ReportPatient } from '@/lib/patient-report';
import { cn } from '@/lib/utils';

type PatientData = {
  kpis: { totalPatients: number; newInPeriod: number; genderDist: string; avgAge: number };
  chart1: Array<{ name: string; value: number }>;
  chart2: Array<{ name: string; value: number }>;
  tableData: Array<{
    id: string; fullName: string; gender: string | null; dateOfBirth: string;
    phone: string; email: string | null; address: string | null; bloodGroup: string | null; createdAt: string;
  }>;
};

type PatientOption = { id: string; fullName: string; patientNumber?: string; phone?: string };
type TableView = 'all' | 'selected';

const COLORS = ['#0EA5E9', '#8B5CF6', '#10B981', '#F97316', '#EF4444'];

function parsePatientList(res: { data: unknown }): PatientOption[] {
  const body = res.data as { data?: unknown[] } | unknown[];
  const raw = Array.isArray(body) ? body : (body?.data ?? []);
  if (!Array.isArray(raw)) return [];
  return raw.map((p: Record<string, unknown>) => ({
    id: String(p.id),
    fullName: String(p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim()),
    patientNumber: p.patientNumber ? String(p.patientNumber) : undefined,
    phone: p.phone ? String(p.phone) : undefined,
  }));
}

export default function PatientReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [registrySearch, setRegistrySearch] = useState('');
  const [tableView, setTableView] = useState<TableView>('all');
  const [data, setData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const [recordSearch, setRecordSearch] = useState('');
  const [recordSuggestions, setRecordSuggestions] = useState<PatientOption[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [patientRecord, setPatientRecord] = useState<ReportPatient | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [downloadingRecord, setDownloadingRecord] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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

  const loadPatientRecord = useCallback(async (patientId: string) => {
    setLoadingRecord(true);
    try {
      const res = await api.get(`/patients/${patientId}`);
      setPatientRecord(normalizePatient(res.data));
    } catch {
      toast.error('Failed to load patient record');
      setPatientRecord(null);
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  useEffect(() => {
    if (recordSearch.trim().length < 2) { setRecordSuggestions([]); return; }
    const t = setTimeout(async () => {
      setSearchingPatients(true);
      try {
        const params = new URLSearchParams({ limit: '10', search: recordSearch.trim() });
        if (genderFilter !== 'all') params.set('gender', genderFilter);
        const res = await api.get(`/patients?${params.toString()}`);
        setRecordSuggestions(parsePatientList(res));
      } catch {
        setRecordSuggestions([]);
      } finally {
        setSearchingPatients(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [recordSearch, genderFilter]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (selectedPatient) void loadPatientRecord(selectedPatient.id);
    else setPatientRecord(null);
  }, [selectedPatient, loadPatientRecord]);

  const filteredTable = useMemo(() => {
    if (!data?.tableData) return [];
    const q = registrySearch.trim().toLowerCase();
    if (!q) return data.tableData;
    return data.tableData.filter((r) =>
      r.fullName.toLowerCase().includes(q) || r.phone.includes(q) || (r.address || '').toLowerCase().includes(q),
    );
  }, [data, registrySearch]);

  const pickPatient = (p: PatientOption) => {
    setSelectedPatient(p);
    setTableView('selected');
    setRecordSearch('');
    setShowSuggestions(false);
    setRecordSuggestions([]);
  };

  const clearPatient = () => {
    setSelectedPatient(null);
    setPatientRecord(null);
    setTableView('all');
  };

  const handleDownloadMedicalRecord = async () => {
    if (!selectedPatient) { toast.error('Select a patient first'); return; }
    setDownloadingRecord(true);
    try {
      await downloadPatientMedicalRecord(selectedPatient.id);
      toast.success('Medical record downloaded');
    } catch {
      toast.error('Failed to download medical record');
    } finally {
      setDownloadingRecord(false);
    }
  };

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
      doc.text('Patient Registry Report', 14, 22);
      doc.setFontSize(9);
      doc.text(`Period: ${from || 'All Time'} to ${to || 'Today'}`, 14, 28);
      doc.setTextColor(0, 0, 0);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 130, 28);

      let y = 42;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y - 4, 190, 7, 'F');
      doc.text('NAME', 12, y);
      doc.text('GENDER', 55, y);
      doc.text('DOB', 78, y);
      doc.text('PHONE', 110, y);
      doc.text('BLOOD', 142, y);
      doc.text('REGISTERED', 170, y);
      doc.setFont('helvetica', 'normal');
      y += 7;

      const rows = registrySearch.trim()
        ? data.tableData.filter((r) =>
            r.fullName.toLowerCase().includes(registrySearch.toLowerCase()) ||
            r.phone.includes(registrySearch) ||
            (r.address || '').toLowerCase().includes(registrySearch.toLowerCase()),
          )
        : data.tableData;

      for (const row of rows) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(row.fullName.slice(0, 24), 12, y);
        doc.text(row.gender || '-', 55, y);
        doc.text(new Date(row.dateOfBirth).toLocaleDateString(), 78, y);
        doc.text(row.phone, 110, y);
        doc.text(row.bloodGroup || '-', 142, y);
        doc.text(new Date(row.createdAt).toLocaleDateString(), 170, y);
        y += 5.5;
      }

      doc.save(`patients-registry-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('Registry table PDF downloaded');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const exportCsv = () => {
    if (!data?.tableData.length) return;
    const headers = ['Full Name', 'Gender', 'Date of Birth', 'Phone', 'Email', 'Blood Group', 'Address', 'Registered Date'];
    const lines = data.tableData.map((row) =>
      [row.fullName, row.gender || '-', new Date(row.dateOfBirth).toLocaleDateString(), row.phone,
        row.email || '-', row.bloodGroup || '-', row.address || '-', new Date(row.createdAt).toLocaleDateString()]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','),
    );
    const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `patients-registry-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
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
      print={() => window.print()}
      exportingPdf={exportingPdf}
      hasData={!!data}
    >
      <div className="rounded-xl border border-[#0EA5E9]/25 bg-gradient-to-br from-[#0EA5E9]/5 to-white dark:from-[#0EA5E9]/10 dark:to-slate-900 p-5 shadow-sm space-y-4 report-no-print report-tools">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#0EA5E9]" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Patient Medical Record</h2>
          </div>
          <Button
            onClick={() => void handleDownloadMedicalRecord()}
            disabled={!selectedPatient || downloadingRecord}
            className="shrink-0 gap-2 bg-[#0EA5E9] hover:bg-[#0c96d4]"
          >
            {downloadingRecord ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          <div ref={searchRef} className="flex-1 relative">
            <label className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5 block">Search Patient</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Name, patient ID, or phone..."
                value={recordSearch}
                onChange={(e) => { setRecordSearch(e.target.value); setShowSuggestions(true); }}
                onFocus={() => recordSearch.length >= 2 && setShowSuggestions(true)}
                className="pl-9 h-10"
              />
              {searchingPatients && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#0EA5E9]" />}
            </div>
            {showSuggestions && recordSearch.trim().length >= 2 && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
                {recordSuggestions.length === 0 && !searchingPatients ? (
                  <p className="px-4 py-3 text-sm text-slate-400">No patients found</p>
                ) : (
                  recordSuggestions.map((p) => (
                    <button key={p.id} type="button" onClick={() => pickPatient(p)} className="w-full text-left px-4 py-3 hover:bg-[#0EA5E9]/5 border-b last:border-0">
                      <p className="font-semibold text-sm">{p.fullName}</p>
                      <p className="text-xs text-slate-500">{p.patientNumber || '-'} · {p.phone || '-'}</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="w-full lg:w-40">
            <label className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5 block">Gender</label>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedPatient && (
          <Badge className="bg-[#0EA5E9]/10 text-[#0EA5E9] gap-1.5 pl-3 pr-2 w-fit">
            {selectedPatient.fullName}
            {selectedPatient.patientNumber ? ` · ${selectedPatient.patientNumber}` : ''}
            <button type="button" onClick={clearPatient} className="rounded-full hover:bg-[#0EA5E9]/20 p-0.5">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border bg-white dark:bg-slate-900">
          <Loader2 className="h-8 w-8 animate-spin text-[#0EA5E9]" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 report-kpis report-no-print">
            {[
              { label: 'Total Patients', value: data.kpis.totalPatients.toLocaleString(), icon: Users, color: 'from-emerald-500 to-teal-600' },
              { label: 'New in Period', value: data.kpis.newInPeriod.toLocaleString(), icon: UserPlus, color: 'from-sky-500 to-blue-600' },
              { label: 'Gender (M / F)', value: data.kpis.genderDist, icon: Users2, color: 'from-violet-500 to-purple-600' },
              { label: 'Average Age', value: `${data.kpis.avgAge} yrs`, icon: Calendar, color: 'from-amber-500 to-orange-600' },
            ].map((k) => (
              <div key={k.label} className={`rounded-2xl bg-gradient-to-br ${k.color} p-5 text-white shadow-lg`}>
                <p className="text-sm opacity-90">{k.label}</p>
                <p className="text-2xl font-bold mt-1">{k.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 report-charts report-no-print">
            <div className="lg:col-span-2 rounded-2xl border bg-white dark:bg-slate-900 p-5 shadow-sm">
              <h2 className="text-sm font-bold mb-4">Patient Growth Trend</h2>
              <div className="h-64">
                {data.chart1.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.chart1}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="value" stroke="#0EA5E9" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">No data for selected period</div>
                )}
              </div>
            </div>
            <div className="rounded-2xl border bg-white dark:bg-slate-900 p-5 shadow-sm">
              <h2 className="text-sm font-bold mb-4">Age Demographics</h2>
              <div className="h-64">
                {data.chart2.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chart2}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartsTooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {data.chart2.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">No age data</div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden report-print-area">
            <div className="px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-sm font-bold">
                {tableView === 'selected' && selectedPatient
                  ? `Medical Record — ${selectedPatient.fullName}`
                  : 'Period Registry'}
              </h2>
              <div className="flex flex-wrap items-center gap-2 report-no-print">
                <Select
                  value={tableView}
                  onValueChange={(v) => setTableView(v as TableView)}
                >
                  <SelectTrigger className="h-8 w-[180px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All patients (period)</SelectItem>
                    <SelectItem value="selected" disabled={!selectedPatient}>Selected patient record</SelectItem>
                  </SelectContent>
                </Select>
                {tableView === 'all' && (
                  <div className="relative w-full sm:w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Filter..."
                      value={registrySearch}
                      onChange={(e) => setRegistrySearch(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-4">
              {tableView === 'selected' ? (
                <PatientRecordPreview patient={patientRecord} loading={loadingRecord} />
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/60 border-b text-[11px] font-semibold text-slate-500 uppercase">
                        <th className="px-4 py-3 text-left">Patient Name</th>
                        <th className="px-4 py-3 text-left">Gender</th>
                        <th className="px-4 py-3 text-left">DOB</th>
                        <th className="px-4 py-3 text-left">Phone</th>
                        <th className="px-4 py-3 text-left">Blood</th>
                        <th className="px-4 py-3 text-left">Address</th>
                        <th className="px-4 py-3 text-left">Registered</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredTable.length > 0 ? filteredTable.map((row) => (
                        <tr
                          key={row.id}
                          onClick={() => pickPatient({ id: row.id, fullName: row.fullName, phone: row.phone })}
                          className={cn(
                            'cursor-pointer transition-colors',
                            selectedPatient?.id === row.id ? 'bg-[#0EA5E9]/10' : 'hover:bg-slate-50/70 dark:hover:bg-slate-900/40',
                          )}
                        >
                          <td className="px-4 py-3 font-bold text-[#0EA5E9]">{row.fullName}</td>
                          <td className="px-4 py-3 uppercase text-slate-500">{row.gender || '-'}</td>
                          <td className="px-4 py-3 text-slate-500">{new Date(row.dateOfBirth).toLocaleDateString()}</td>
                          <td className="px-4 py-3">{row.phone}</td>
                          <td className="px-4 py-3 font-bold">{row.bloodGroup || '-'}</td>
                          <td className="px-4 py-3 text-slate-500">{row.address || '-'}</td>
                          <td className="px-4 py-3 text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                            {registrySearch ? 'No patients match filter.' : 'No registrations in this period.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center rounded-2xl border text-slate-400 text-sm">
          Set date filters and click Generate Report
        </div>
      )}
    </ReportLayout>
  );
}
