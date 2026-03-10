'use client';

import { useState } from 'react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileDown, Loader2 } from 'lucide-react';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

type ReportType = 'patients' | 'appointments';

export default function ReportsPage() {
    const [reportType, setReportType] = useState<ReportType>('patients');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [loading, setLoading] = useState(false);

    const downloadPdf = async () => {
        setLoading(true);
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const title = reportType === 'patients' ? 'Patient List Report' : 'Appointments Report';
            doc.setFontSize(16);
            doc.text(title, 14, 20);
            doc.setFontSize(10);

            if (reportType === 'patients') {
                const res = await api.get('/patients?limit=2000');
                const data = (res.data?.data ?? res.data) as Array<{ fullName?: string; phone?: string; gender?: string; createdAt?: string }>;
                const rows = Array.isArray(data) ? data : [];
                doc.text(`Total: ${rows.length} patients`, 14, 28);
                let y = 36;
                doc.setFontSize(9);
                doc.text('Name', 14, y);
                doc.text('Phone', 70, y);
                doc.text('Gender', 110, y);
                doc.text('Added', 140, y);
                y += 6;
                for (const row of rows.slice(0, 150)) {
                    if (y > 270) { doc.addPage(); y = 20; }
                    doc.text(String(row.fullName ?? '').slice(0, 35), 14, y);
                    doc.text(String(row.phone ?? '').slice(0, 18), 70, y);
                    doc.text(String(row.gender ?? ''), 110, y);
                    doc.text(row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '', 140, y);
                    y += 6;
                }
                if (rows.length > 150) doc.text(`... and ${rows.length - 150} more`, 14, y + 4);
            } else {
                if (!from || !to) {
                    toast.error('Please select From and To dates for appointments report');
                    setLoading(false);
                    return;
                }
                const res = await api.get(`/appointments?from=${from}&to=${to}&limit=2000`);
                const data = (res.data?.data ?? res.data) as Array<{
                    bookingNumber?: string;
                    appointmentDate?: string;
                    status?: string;
                    patient?: { fullName?: string };
                    doctor?: { user?: { fullName?: string } };
                }>;
                const rows = Array.isArray(data) ? data : [];
                doc.text(`From ${from} to ${to} — Total: ${rows.length} appointments`, 14, 28);
                let y = 36;
                doc.setFontSize(9);
                doc.text('Booking #', 14, y);
                doc.text('Date', 40, y);
                doc.text('Patient', 70, y);
                doc.text('Doctor', 120, y);
                doc.text('Status', 170, y);
                y += 6;
                for (const row of rows.slice(0, 150)) {
                    if (y > 270) { doc.addPage(); y = 20; }
                    doc.text(String(row.bookingNumber ?? '').slice(0, 12), 14, y);
                    doc.text(row.appointmentDate ? new Date(row.appointmentDate).toLocaleDateString() : '', 40, y);
                    doc.text(String(row.patient?.fullName ?? '').slice(0, 22), 70, y);
                    doc.text(String(row.doctor?.user?.fullName ?? '').slice(0, 22), 120, y);
                    doc.text(String(row.status ?? ''), 170, y);
                    y += 6;
                }
                if (rows.length > 150) doc.text(`... and ${rows.length - 150} more`, 14, y + 4);
            }

            doc.save(`${reportType}-report-${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.success('Report downloaded');
        } catch (e) {
            toast.error('Failed to generate report');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Medical Reports
                </h1>
                <PageBreadcrumb current="Reports" />
            </div>

            <div className="max-w-xl space-y-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Report type</label>
                    <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value as ReportType)}
                        className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                    >
                        <option value="patients">Patient list</option>
                        <option value="appointments">Appointments (date range)</option>
                    </select>
                </div>

                {reportType === 'appointments' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">From</label>
                            <Input
                                type="date"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="h-10 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">To</label>
                            <Input
                                type="date"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="h-10 rounded-lg"
                            />
                        </div>
                    </div>
                )}

                <Button
                    onClick={downloadPdf}
                    disabled={loading}
                    className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold shadow-lg shadow-blue-500/20 px-6 rounded-xl"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileDown className="w-4 h-4 mr-2" />}
                    Download PDF
                </Button>
            </div>
        </div>
    );
}
