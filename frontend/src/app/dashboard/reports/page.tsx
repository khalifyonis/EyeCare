'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, Loader2, BarChart3, Users, Calendar, Package, AlertTriangle, DollarSign } from 'lucide-react';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import { StatsCard } from '@/components/dashboard/stats-card';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

type ReportType = 'daily-summary' | 'patients' | 'appointments' | 'inventory' | 'billing' | 'expiring-items';

type DailySummary = {
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    newPatients: number;
    totalRevenue: number;
    unpaidInvoices: number;
};

function toNum(v: unknown): number {
    if (typeof v === 'number') return v;
    return parseFloat(String(v || '0')) || 0;
}

function drawHeader(doc: jsPDF, title: string, subtitle?: string) {
    doc.setFillColor(14, 165, 233);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('AL-IXSAAN Eye Care', 14, 14);
    doc.setFontSize(11);
    doc.text(title, 14, 22);
    if (subtitle) {
        doc.setFontSize(9);
        doc.text(subtitle, 14, 28);
    }
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 130, 28);
    return 40;
}

function drawTableHeader(doc: jsPDF, cols: { label: string; x: number }[], y: number): number {
    doc.setFillColor(241, 245, 249);
    doc.rect(10, y - 4, 190, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    for (const c of cols) {
        doc.text(c.label, c.x, y);
    }
    doc.setFont('helvetica', 'normal');
    return y + 7;
}

function checkPage(doc: jsPDF, y: number): number {
    if (y > 270) { doc.addPage(); return 20; }
    return y;
}

export default function ReportsPage() {
    const [reportType, setReportType] = useState<ReportType>('daily-summary');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<DailySummary | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(false);

    const today = new Date().toISOString().slice(0, 10);

    const fetchDailySummary = useCallback(async () => {
        setLoadingSummary(true);
        try {
            const [aptRes, ptRes, billingRes] = await Promise.all([
                api.get(`/appointments?from=${today}&to=${today}&limit=1000`),
                api.get(`/patients?limit=1&page=1`),
                api.get('/billing/stats'),
            ]);
            const apts = (aptRes.data?.data ?? []) as Array<{ status?: string }>;
            const billingStats = billingRes.data as { total?: number; unpaid?: number; revenueToday?: number };

            setSummary({
                totalAppointments: apts.length,
                completedAppointments: apts.filter(a => a.status === 'COMPLETED').length,
                cancelledAppointments: apts.filter(a => a.status === 'CANCELLED').length,
                newPatients: ptRes.data?.total ?? 0,
                totalRevenue: toNum(billingStats.revenueToday),
                unpaidInvoices: billingStats.unpaid ?? 0,
            });
        } catch {
            setSummary(null);
        } finally {
            setLoadingSummary(false);
        }
    }, [today]);

    useEffect(() => {
        fetchDailySummary();
    }, [fetchDailySummary]);

    const needsDates = ['appointments', 'billing'].includes(reportType);

    const downloadPdf = async () => {
        if (needsDates && (!from || !to)) {
            toast.error('Please select From and To dates');
            return;
        }
        setLoading(true);
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            if (reportType === 'daily-summary') {
                const y = drawHeader(doc, 'Daily Clinic Summary', `Date: ${today}`);
                doc.setFontSize(11);
                let cy = y;
                const data = summary || { totalAppointments: 0, completedAppointments: 0, cancelledAppointments: 0, newPatients: 0, totalRevenue: 0, unpaidInvoices: 0 };

                const items = [
                    ['Total Appointments Today', String(data.totalAppointments)],
                    ['Completed', String(data.completedAppointments)],
                    ['Cancelled', String(data.cancelledAppointments)],
                    ['Total Registered Patients', String(data.newPatients)],
                    ['Revenue Today', `$${data.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
                    ['Unpaid Invoices', String(data.unpaidInvoices)],
                ];

                for (const [label, value] of items) {
                    doc.setFont('helvetica', 'bold');
                    doc.text(label, 14, cy);
                    doc.setFont('helvetica', 'normal');
                    doc.text(value, 100, cy);
                    cy += 8;
                }
            } else if (reportType === 'patients') {
                let y = drawHeader(doc, 'Patient List Report');
                const res = await api.get('/patients?limit=2000');
                const rows = (res.data?.data ?? res.data) as Array<{ fullName?: string; phone?: string; gender?: string; dateOfBirth?: string; createdAt?: string }>;
                const data = Array.isArray(rows) ? rows : [];
                doc.text(`Total: ${data.length} patients`, 14, y - 3);
                const cols = [
                    { label: '#', x: 12 },
                    { label: 'NAME', x: 20 },
                    { label: 'PHONE', x: 75 },
                    { label: 'GENDER', x: 115 },
                    { label: 'DOB', x: 140 },
                    { label: 'REGISTERED', x: 170 },
                ];
                y = drawTableHeader(doc, cols, y + 4);
                doc.setFontSize(8);
                let i = 1;
                for (const row of data) {
                    y = checkPage(doc, y);
                    doc.text(String(i++), 12, y);
                    doc.text(String(row.fullName ?? '').slice(0, 30), 20, y);
                    doc.text(String(row.phone ?? '').slice(0, 18), 75, y);
                    doc.text(String(row.gender ?? ''), 115, y);
                    doc.text(row.dateOfBirth ? new Date(row.dateOfBirth).toLocaleDateString() : '', 140, y);
                    doc.text(row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '', 170, y);
                    y += 5.5;
                }
            } else if (reportType === 'appointments') {
                let y = drawHeader(doc, 'Appointments Report', `${from} to ${to}`);
                const res = await api.get(`/appointments?from=${from}&to=${to}&limit=2000`);
                const rows = (res.data?.data ?? res.data) as Array<{
                    bookingNumber?: string; appointmentDate?: string; status?: string;
                    patient?: { fullName?: string }; doctor?: { user?: { fullName?: string } };
                    amount?: number | string;
                }>;
                const data = Array.isArray(rows) ? rows : [];
                doc.text(`Total: ${data.length} appointments`, 14, y - 3);
                const cols = [
                    { label: '#', x: 12 },
                    { label: 'BOOKING', x: 20 },
                    { label: 'DATE', x: 45 },
                    { label: 'PATIENT', x: 75 },
                    { label: 'DOCTOR', x: 120 },
                    { label: 'STATUS', x: 160 },
                    { label: 'AMOUNT', x: 185 },
                ];
                y = drawTableHeader(doc, cols, y + 4);
                doc.setFontSize(8);
                let i = 1;
                for (const row of data) {
                    y = checkPage(doc, y);
                    doc.text(String(i++), 12, y);
                    doc.text(String(row.bookingNumber ?? '').slice(0, 12), 20, y);
                    doc.text(row.appointmentDate ? new Date(row.appointmentDate).toLocaleDateString() : '', 45, y);
                    doc.text(String(row.patient?.fullName ?? '').slice(0, 22), 75, y);
                    doc.text(String(row.doctor?.user?.fullName ?? '').slice(0, 20), 120, y);
                    doc.text(String(row.status ?? ''), 160, y);
                    doc.text(`$${toNum(row.amount).toFixed(2)}`, 185, y);
                    y += 5.5;
                }
            } else if (reportType === 'inventory') {
                let y = drawHeader(doc, 'Inventory Valuation Report');
                const [pharmRes, optRes] = await Promise.all([
                    api.get('/inventory/pharmacy?limit=2000'),
                    api.get('/inventory/optical?limit=2000'),
                ]);
                const pharmItems = (pharmRes.data?.data ?? []) as Array<{ itemName?: string; category?: string; stockQuantity?: number; purchasePrice?: number | string; sellingPrice?: number | string; reorderLevel?: number }>;
                const optItems = (optRes.data?.data ?? []) as Array<{ itemName?: string; brand?: string; stockQuantity?: number; purchasePrice?: number | string; sellingPrice?: number | string; reorderLevel?: number }>;

                const pharmTotal = pharmItems.reduce((s, i) => s + (Number(i.stockQuantity ?? 0) * toNum(i.sellingPrice)), 0);
                const optTotal = optItems.reduce((s, i) => s + (Number(i.stockQuantity ?? 0) * toNum(i.sellingPrice)), 0);
                const pharmLow = pharmItems.filter(i => Number(i.stockQuantity ?? 0) <= Number(i.reorderLevel ?? 0)).length;
                const optLow = optItems.filter(i => Number(i.stockQuantity ?? 0) <= Number(i.reorderLevel ?? 0)).length;

                doc.setFontSize(10);
                doc.text(`Pharmacy: ${pharmItems.length} items | Value: $${pharmTotal.toFixed(2)} | Low stock: ${pharmLow}`, 14, y - 2);
                doc.text(`Optical: ${optItems.length} items | Value: $${optTotal.toFixed(2)} | Low stock: ${optLow}`, 14, y + 5);
                y += 14;

                const cols = [
                    { label: '#', x: 12 },
                    { label: 'ITEM', x: 20 },
                    { label: 'TYPE', x: 80 },
                    { label: 'STOCK', x: 115 },
                    { label: 'PURCHASE', x: 135 },
                    { label: 'SELLING', x: 160 },
                    { label: 'VALUE', x: 185 },
                ];

                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('PHARMACY ITEMS', 14, y);
                doc.setFont('helvetica', 'normal');
                y += 5;
                y = drawTableHeader(doc, cols, y);
                doc.setFontSize(8);
                let i = 1;
                for (const row of pharmItems) {
                    y = checkPage(doc, y);
                    doc.text(String(i++), 12, y);
                    doc.text(String(row.itemName ?? '').slice(0, 30), 20, y);
                    doc.text(String(row.category ?? '').slice(0, 18), 80, y);
                    doc.text(String(row.stockQuantity ?? 0), 115, y);
                    doc.text(`$${toNum(row.purchasePrice).toFixed(2)}`, 135, y);
                    doc.text(`$${toNum(row.sellingPrice).toFixed(2)}`, 160, y);
                    doc.text(`$${(Number(row.stockQuantity ?? 0) * toNum(row.sellingPrice)).toFixed(2)}`, 185, y);
                    y += 5.5;
                }

                y = checkPage(doc, y + 8);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('OPTICAL ITEMS', 14, y);
                doc.setFont('helvetica', 'normal');
                y += 5;
                y = drawTableHeader(doc, cols, y);
                doc.setFontSize(8);
                i = 1;
                for (const row of optItems) {
                    y = checkPage(doc, y);
                    doc.text(String(i++), 12, y);
                    doc.text(String(row.itemName ?? '').slice(0, 30), 20, y);
                    doc.text(String(row.brand ?? '').slice(0, 18), 80, y);
                    doc.text(String(row.stockQuantity ?? 0), 115, y);
                    doc.text(`$${toNum(row.purchasePrice).toFixed(2)}`, 135, y);
                    doc.text(`$${toNum(row.sellingPrice).toFixed(2)}`, 160, y);
                    doc.text(`$${(Number(row.stockQuantity ?? 0) * toNum(row.sellingPrice)).toFixed(2)}`, 185, y);
                    y += 5.5;
                }
            } else if (reportType === 'billing') {
                let y = drawHeader(doc, 'Billing Report', `${from} to ${to}`);
                const res = await api.get(`/billing?from=${from}&to=${to}&limit=2000`);
                const rows = (res.data?.data ?? res.data) as Array<{
                    referenceNumber?: string; serviceType?: string; totalAmount?: number | string;
                    discount?: number | string; finalAmount?: number | string; status?: string;
                    patient?: { fullName?: string }; createdAt?: string;
                }>;
                const data = Array.isArray(rows) ? rows : [];
                const totalRevenue = data.reduce((s, r) => s + toNum(r.finalAmount), 0);
                const paid = data.filter(r => r.status === 'PAID').length;
                doc.text(`Total: ${data.length} invoices | Revenue: $${totalRevenue.toFixed(2)} | Paid: ${paid}`, 14, y - 2);
                y += 4;

                const cols = [
                    { label: '#', x: 12 },
                    { label: 'PATIENT', x: 20 },
                    { label: 'SERVICE', x: 65 },
                    { label: 'TOTAL', x: 100 },
                    { label: 'DISCOUNT', x: 125 },
                    { label: 'FINAL', x: 150 },
                    { label: 'STATUS', x: 175 },
                ];
                y = drawTableHeader(doc, cols, y);
                doc.setFontSize(8);
                let i = 1;
                for (const row of data) {
                    y = checkPage(doc, y);
                    doc.text(String(i++), 12, y);
                    doc.text(String(row.patient?.fullName ?? '').slice(0, 22), 20, y);
                    doc.text(String(row.serviceType ?? ''), 65, y);
                    doc.text(`$${toNum(row.totalAmount).toFixed(2)}`, 100, y);
                    doc.text(`$${toNum(row.discount).toFixed(2)}`, 125, y);
                    doc.text(`$${toNum(row.finalAmount).toFixed(2)}`, 150, y);
                    doc.text(String(row.status ?? ''), 175, y);
                    y += 5.5;
                }
            } else if (reportType === 'expiring-items') {
                let y = drawHeader(doc, 'Expiring Pharmacy Items', 'Items expiring within 90 days');
                const res = await api.get('/inventory/pharmacy?limit=2000');
                const allItems = (res.data?.data ?? []) as Array<{ itemName?: string; category?: string; batchNumber?: string; stockQuantity?: number; expiryDate?: string }>;
                const now = new Date();
                const cutoff = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
                const expiring = allItems.filter(i => {
                    if (!i.expiryDate) return false;
                    const d = new Date(i.expiryDate);
                    return d <= cutoff;
                }).sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());

                const alreadyExpired = expiring.filter(i => new Date(i.expiryDate!) < now).length;
                doc.text(`${expiring.length} items expiring within 90 days (${alreadyExpired} already expired)`, 14, y - 2);
                y += 4;

                const cols = [
                    { label: '#', x: 12 },
                    { label: 'ITEM', x: 20 },
                    { label: 'CATEGORY', x: 75 },
                    { label: 'BATCH', x: 120 },
                    { label: 'STOCK', x: 150 },
                    { label: 'EXPIRY', x: 170 },
                ];
                y = drawTableHeader(doc, cols, y);
                doc.setFontSize(8);
                let i = 1;
                for (const row of expiring) {
                    y = checkPage(doc, y);
                    const expired = new Date(row.expiryDate!) < now;
                    if (expired) doc.setTextColor(220, 38, 38);
                    doc.text(String(i++), 12, y);
                    doc.text(String(row.itemName ?? '').slice(0, 28), 20, y);
                    doc.text(String(row.category ?? '').slice(0, 22), 75, y);
                    doc.text(String(row.batchNumber ?? '').slice(0, 14), 120, y);
                    doc.text(String(row.stockQuantity ?? 0), 150, y);
                    doc.text(new Date(row.expiryDate!).toLocaleDateString(), 170, y);
                    if (expired) doc.setTextColor(0, 0, 0);
                    y += 5.5;
                }
                if (expiring.length === 0) {
                    doc.text('No items expiring within 90 days.', 14, y);
                }
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

            {!loadingSummary && summary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <StatsCard title="Today's appointments" value={String(summary.totalAppointments)} icon={Calendar} color="blue" />
                    <StatsCard title="Total patients" value={String(summary.newPatients)} icon={Users} color="emerald" />
                    <StatsCard title="Revenue today" value={`$${summary.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} icon={DollarSign} color="purple" />
                    <StatsCard title="Unpaid invoices" value={String(summary.unpaidInvoices)} icon={AlertTriangle} color="amber" />
                </div>
            )}

            <div className="max-w-2xl space-y-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="w-5 h-5 text-[#0EA5E9]" />
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Generate Report</h2>
                </div>

                <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Report type</label>
                    <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                        <SelectTrigger className="h-10 rounded-lg">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="daily-summary">Daily clinic summary</SelectItem>
                            <SelectItem value="patients">Patient list</SelectItem>
                            <SelectItem value="appointments">Appointments (date range)</SelectItem>
                            <SelectItem value="billing">Billing / Revenue (date range)</SelectItem>
                            <SelectItem value="inventory">Inventory valuation</SelectItem>
                            <SelectItem value="expiring-items">Expiring pharmacy items</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {needsDates && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">From</label>
                            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-lg" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">To</label>
                            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-lg" />
                        </div>
                    </div>
                )}

                <div className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                    {reportType === 'daily-summary' && 'Summary of today\'s appointments, patients, and revenue.'}
                    {reportType === 'patients' && 'Full list of registered patients with contact details.'}
                    {reportType === 'appointments' && 'Appointments within the selected date range with doctor and status.'}
                    {reportType === 'billing' && 'All invoices in the date range with totals and payment status.'}
                    {reportType === 'inventory' && 'Pharmacy and optical inventory with stock quantities and valuation.'}
                    {reportType === 'expiring-items' && 'Pharmacy items expiring within the next 90 days. Expired items shown in red.'}
                </div>

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
