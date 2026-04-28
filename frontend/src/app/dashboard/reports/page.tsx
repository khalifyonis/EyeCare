'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, Loader2, BarChart3, Users, Calendar, Package, AlertTriangle, DollarSign, Printer, FileSpreadsheet } from 'lucide-react';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import { StatsCard } from '@/components/dashboard/stats-card';
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
    ResponsiveContainer,
} from 'recharts';

type ReportType = 'daily-summary' | 'patients' | 'appointments' | 'inventory' | 'billing' | 'examinations' | 'follow-ups';

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
    const [reportRows, setReportRows] = useState<Array<{
        id: string;
        date: string;
        patient: string;
        doctor: string;
        service: string;
        amount: string;
        status: string;
        expiryStatus?: string;
    }>>([]);
    const [reportLoading, setReportLoading] = useState(false);
    const [tableSearch, setTableSearch] = useState('');
    const [tableStatusFilter, setTableStatusFilter] = useState<'all' | 'PENDING' | 'COMPLETED' | 'CANCELLED'>('all');
    const [followUpStatusFilter, setFollowUpStatusFilter] = useState<'all' | 'PENDING' | 'OVERDUE' | 'DONE' | 'CANCELLED'>('all');
    const [examTypeFilter, setExamTypeFilter] = useState<'all' | 'Eye Examination' | 'Surgery'>('all');
    const [inventoryTypeFilter, setInventoryTypeFilter] =
        useState<'all' | 'pharmacy' | 'optical' | 'expiring'>('all');
    const [followUpKpis, setFollowUpKpis] = useState({ totalCount: 0, overdueCount: 0, doneCount: 0, completionRate: 0 });

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

    useEffect(() => {
        const loadTable = async () => {
            setReportLoading(true);
            try {
                const now = new Date();
                const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
                const defaultTo = now.toISOString().slice(0, 10);
                const fromDate = from || defaultFrom;
                const toDate = to || defaultTo;

                if (reportType === 'billing') {
                    const res = await api.get(`/billing?from=${fromDate}&to=${toDate}&limit=200`);
                    const rows = (res.data?.data ?? res.data) as Array<{
                        id?: string;
                        createdAt?: string;
                        patient?: { fullName?: string };
                        serviceType?: string;
                        finalAmount?: number | string;
                        status?: string;
                    }>;
                    const data = Array.isArray(rows) ? rows : [];
                    setReportRows(
                        data.map((r, idx) => ({
                            id: String(r.id ?? idx),
                            date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '',
                            patient: r.patient?.fullName || 'Unknown',
                            doctor: r.serviceType || 'Billing',
                            service: r.serviceType || 'Billing',
                            amount: `$${toNum(r.finalAmount).toFixed(2)}`,
                            status: r.status || '—',
                        })),
                    );
                } else if (reportType === 'examinations') {
                    const [eyeRes, surgeryRes] = await Promise.all([
                        api.get(`/eye-examinations?from=${fromDate}&to=${toDate}&limit=200`),
                        api.get(`/surgeries?from=${fromDate}&to=${toDate}&limit=200`),
                    ]);
                    const eyeRows = (eyeRes.data?.data ?? eyeRes.data) as any[];
                    const surgeryRows = (surgeryRes.data?.data ?? surgeryRes.data) as any[];
                    const rows: Array<{
                        id: string;
                        date: string;
                        patient: string;
                        doctor: string;
                        service: string;
                        amount: string;
                        status: string;
                    }> = [];

                    (Array.isArray(eyeRows) ? eyeRows : []).forEach((r: any, idx: number) => {
                        rows.push({
                            id: String(r.id ?? `eye-${idx}`),
                            date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '',
                            patient: r.patient?.fullName || 'Unknown',
                            doctor: r.doctor?.user?.fullName || '—',
                            service: 'Eye Examination',
                            amount: '$0.00',
                            status: r.diagnosis || r.branch?.branchName || '—',
                        });
                    });

                    (Array.isArray(surgeryRows) ? surgeryRows : []).forEach((r: any, idx: number) => {
                        rows.push({
                            id: String(r.id ?? `sx-${idx}`),
                            date: r.date ? new Date(r.date).toLocaleDateString() : '',
                            patient: r.patient?.fullName || r.appointment?.patient?.fullName || 'Unknown',
                            doctor: r.surgeon?.user?.fullName || '—',
                            service: r.surgeryType || 'Surgery',
                            amount: `$${toNum(r.cost).toFixed(2)}`,
                            status: r.status || '—',
                        });
                    });

                    setReportRows(rows);
                } else if (reportType === 'patients') {
                    const res = await api.get('/patients?limit=200');
                    const rows = (res.data?.data ?? res.data) as Array<{
                        id?: string;
                        fullName?: string;
                        phone?: string;
                        dateOfBirth?: string;
                        createdAt?: string;
                    }>;
                    const data = Array.isArray(rows) ? rows : [];
                    setReportRows(
                        data.map((r, idx) => ({
                            id: String(r.id ?? idx),
                            date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '',
                            patient: r.fullName || 'Unknown',
                            doctor: r.phone || '',
                            service: 'Registered patient',
                            amount: '',
                            status: r.dateOfBirth ? new Date(r.dateOfBirth).toLocaleDateString() : '',
                        })),
                    );
                } else if (reportType === 'inventory') {
                    const [pharmRes, opticalRes] = await Promise.all([
                        api.get('/inventory/pharmacy?limit=500'),
                        api.get('/inventory/optical?limit=500'),
                    ]);

                    const pharmRows = (pharmRes.data?.data ?? pharmRes.data) as Array<{
                        id?: string;
                        itemName?: string;
                        category?: string;
                        stockQuantity?: number;
                        sellingPrice?: number | string;
                        reorderLevel?: number;
                        expiryDate?: string;
                    }>;
                    const opticalRows = (opticalRes.data?.data ?? opticalRes.data) as Array<{
                        id?: string;
                        itemName?: string;
                        brand?: string;
                        stockQuantity?: number;
                        sellingPrice?: number | string;
                        reorderLevel?: number;
                    }>;

                    const now = new Date();
                    const cutoff = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

                    const items: typeof reportRows = [];

                    (Array.isArray(pharmRows) ? pharmRows : []).forEach((r, idx) => {
                        const stock = Number(r.stockQuantity ?? 0);
                        const rl = Number(r.reorderLevel ?? 0);
                        const low = rl > 0 && stock <= rl;
                        const hasExpiry = !!r.expiryDate;
                        const expiryDate = hasExpiry ? new Date(r.expiryDate!) : null;
                        const expiring = expiryDate && expiryDate <= cutoff;
                        const expired = expiryDate && expiryDate < now;

                        let status = `${stock} in stock`;
                        if (low) status = `Low stock (${stock} in stock)`;

                        let expiryStatus = '—';
                        if (expiring) expiryStatus = expired ? 'Expired' : 'Expiring soon';

                        items.push({
                            id: String(r.id ?? `ph-${idx}`),
                            date: expiryDate ? expiryDate.toLocaleDateString() : '—',
                            patient: r.itemName || 'Unknown item',
                            doctor: r.category || 'Uncategorised',
                            service: 'Pharmacy item',
                            amount: `$${toNum(r.sellingPrice).toFixed(2)}`,
                            status,
                            expiryStatus,
                        });
                    });

                    (Array.isArray(opticalRows) ? opticalRows : []).forEach((r, idx) => {
                        const stock = Number(r.stockQuantity ?? 0);
                        const rl = Number(r.reorderLevel ?? 0);
                        const low = rl > 0 && stock <= rl;
                        let status = `${stock} in stock`;
                        if (low) status = `Low stock (${stock} in stock)`;

                        items.push({
                            id: String(r.id ?? `op-${idx}`),
                            date: '—',
                            patient: r.itemName || 'Unknown item',
                            doctor: r.brand || 'No brand',
                            service: 'Optical item',
                            amount: `$${toNum(r.sellingPrice).toFixed(2)}`,
                            status,
                            expiryStatus: '—',
                        });
                    });

                    setReportRows(items);
                } else if (reportType === 'follow-ups') {
                    const params = new URLSearchParams({ limit: '500' });
                    if (from) params.set('from', from);
                    if (to) params.set('to', to);
                    const res = await api.get(`/follow-ups?${params.toString()}`);
                    const data = res.data as {
                        followUps?: Array<{
                            id?: string;
                            dueDate?: string;
                            status?: string;
                            sourceType?: string;
                            notes?: string | null;
                            patient?: { id?: string; fullName?: string | null };
                            branch?: { branchName?: string | null };
                        }>;
                        totalCount?: number;
                        overdueCount?: number;
                        doneCount?: number;
                        completionRate?: number;
                    };
                    setFollowUpKpis({
                        totalCount: data.totalCount ?? 0,
                        overdueCount: data.overdueCount ?? 0,
                        doneCount: data.doneCount ?? 0,
                        completionRate: data.completionRate ?? 0,
                    });
                    setReportRows(
                        (data.followUps ?? []).map((f, idx) => ({
                            id: String(f.id ?? idx),
                            date: f.dueDate ? new Date(f.dueDate).toLocaleDateString() : '—',
                            patient: f.patient?.fullName || 'Unknown',
                            doctor: f.sourceType || '—',
                            service: f.branch?.branchName || '—',
                            amount: f.notes || '—',
                            status: f.status || '—',
                        })),
                    );
                } else {
                    // daily-summary or appointments -> appointments table
                    const res = await api.get(`/appointments?from=${fromDate}&to=${toDate}&limit=200`);
                    const rows = (res.data?.data ?? res.data) as Array<{
                        id?: string;
                        appointmentDate?: string;
                        status?: string;
                        amount?: number | string;
                        patient?: { fullName?: string };
                        doctor?: { user?: { fullName?: string } };
                        clinicalExamination?: unknown;
                        erExamination?: unknown;
                    }>;
                    const data = Array.isArray(rows) ? rows : [];
                    setReportRows(
                        data.map((r, idx) => ({
                            id: String(r.id ?? idx),
                            date: r.appointmentDate ? new Date(r.appointmentDate).toLocaleDateString() : '',
                            patient: r.patient?.fullName || 'Unknown',
                            doctor: r.doctor?.user?.fullName || '—',
                            service: r.clinicalExamination
                                ? 'Clinical Exam'
                                : r.erExamination
                                ? 'ER Exam'
                                : 'Consultation',
                            amount: `$${toNum(r.amount).toFixed(2)}`,
                            status: r.status || '—',
                        })),
                    );
                }
            } catch {
                setReportRows([]);
            } finally {
                setReportLoading(false);
            }
        };

        loadTable();
    }, [reportType, from, to]);

    const needsDates = ['appointments', 'billing', 'examinations', 'follow-ups'].includes(reportType);

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
                    {
                        const g = String(row.gender || '').toUpperCase();
                        const genderLabel = g === 'MALE' ? 'Male' : g === 'FEMALE' ? 'Female' : '';
                        doc.text(genderLabel, 115, y);
                    }
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
                // Use the same limits as the dashboard inventory report (backend may restrict very large limits)
                const [pharmRes, optRes] = await Promise.all([
                    api.get('/inventory/pharmacy?limit=500'),
                    api.get('/inventory/optical?limit=500'),
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
            } else if (reportType === 'examinations') {
                let y = drawHeader(doc, 'Eye Examinations Report', `${from} to ${to}`);
                const [eyeRes, surgeryRes] = await Promise.all([
                    api.get(`/eye-examinations?from=${from}&to=${to}&limit=2000`),
                    api.get(`/surgeries?from=${from}&to=${to}&limit=2000`),
                ]);
                const eyeData = (eyeRes.data?.data ?? eyeRes.data) as any[];
                const surgeryData = (surgeryRes.data?.data ?? surgeryRes.data) as any[];

                doc.text(
                    `Eye exams: ${eyeData.length} · Surgeries: ${surgeryData.length}`,
                    14,
                    y - 2,
                );
                y += 4;

                const cols = [
                    { label: '#', x: 12 },
                    { label: 'DATE', x: 20 },
                    { label: 'TYPE', x: 45 },
                    { label: 'PATIENT', x: 80 },
                    { label: 'DOCTOR', x: 135 },
                    { label: 'STATUS', x: 175 },
                ];
                y = drawTableHeader(doc, cols, y);
                doc.setFontSize(8);
                let i = 1;

                const pushRows = (rows: any[], typeLabel: string) => {
                    for (const row of rows) {
                        y = checkPage(doc, y);
                        const date = row.appointmentDate || row.date || row.createdAt;
                        const dStr = date ? new Date(date).toLocaleDateString() : '';
                        const patient = row.appointment?.patient?.fullName || row.patient?.fullName || '';
                        const doctor =
                            row.appointment?.doctor?.user?.fullName ||
                            row.doctor?.user?.fullName ||
                            row.surgeon?.user?.fullName ||
                            '';
                        const status = row.status || row.appointment?.status || '—';
                        doc.text(String(i++), 12, y);
                        doc.text(dStr, 20, y);
                        doc.text(typeLabel, 45, y);
                        doc.text(String(patient).slice(0, 26), 80, y);
                        doc.text(String(doctor).slice(0, 24), 135, y);
                        doc.text(String(status), 175, y);
                        y += 5.5;
                    }
                };

                pushRows(eyeData, 'Eye Exam');
                pushRows(surgeryData, 'Surgery');
            } else if (reportType === 'follow-ups') {
                let y = drawHeader(doc, 'Follow-ups Report', from && to ? `${from} to ${to}` : 'All time');
                const params = new URLSearchParams({ limit: '500' });
                if (from) params.set('from', from);
                if (to) params.set('to', to);
                const res = await api.get(`/follow-ups?${params.toString()}`);
                const fuData = res.data as { followUps?: any[]; overdueCount?: number; doneCount?: number; completionRate?: number; totalCount?: number };
                const rows = fuData.followUps ?? [];
                doc.text(
                    `Total: ${fuData.totalCount ?? rows.length} · Overdue: ${fuData.overdueCount ?? 0} · Done: ${fuData.doneCount ?? 0} · Completion: ${fuData.completionRate ?? 0}%`,
                    14, y - 2,
                );
                y += 4;
                const cols = [
                    { label: '#', x: 12 },
                    { label: 'DUE DATE', x: 20 },
                    { label: 'PATIENT', x: 55 },
                    { label: 'SOURCE', x: 110 },
                    { label: 'BRANCH', x: 150 },
                    { label: 'STATUS', x: 178 },
                ];
                y = drawTableHeader(doc, cols, y);
                doc.setFontSize(8);
                let i = 1;
                for (const row of rows) {
                    y = checkPage(doc, y);
                    const overdue = row.status === 'OVERDUE';
                    if (overdue) doc.setTextColor(220, 38, 38);
                    doc.text(String(i++), 12, y);
                    doc.text(row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—', 20, y);
                    doc.text(String(row.patient?.fullName ?? '—').slice(0, 26), 55, y);
                    doc.text(String(row.sourceType ?? '—'), 110, y);
                    doc.text(String(row.branch?.branchName ?? '—').slice(0, 20), 150, y);
                    doc.text(String(row.status ?? '—'), 178, y);
                    if (overdue) doc.setTextColor(0, 0, 0);
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

    const visitsTrendDemo = [
        { day: 'Jan 01', visits: 32 },
        { day: 'Jan 05', visits: 40 },
        { day: 'Jan 10', visits: 45 },
        { day: 'Jan 15', visits: 52 },
        { day: 'Jan 20', visits: 60 },
        { day: 'Jan 25', visits: 68 },
        { day: 'Jan 30', visits: 72 },
    ];

    const serviceDistributionDemo = [
        { name: 'Eye Exams', value: 211, color: '#3b82f6' },
        { name: 'Glasses', value: 159, color: '#8b5cf6' },
        { name: 'Surgery', value: 53, color: '#f97316' },
        { name: 'Pharmacy', value: 105, color: '#10b981' },
    ];

    const totalServices = serviceDistributionDemo.reduce((sum, s) => sum + s.value, 0);

    const dateHeader =
        reportType === 'patients'
            ? 'REGISTERED'
            : reportType === 'inventory'
            ? 'EXPIRY DATE'
            : reportType === 'follow-ups'
            ? 'DUE DATE'
            : 'DATE';
    const col2Header = reportType === 'inventory' ? 'ITEM' : 'PATIENT';
    const col3Header =
        reportType === 'inventory'
            ? 'CATEGORY / BRAND'
            : reportType === 'patients'
            ? 'PHONE'
            : reportType === 'follow-ups'
            ? 'SOURCE'
            : 'DOCTOR';
    const col4Header =
        reportType === 'inventory'
            ? 'TYPE'
            : reportType === 'patients'
            ? 'NOTE'
            : reportType === 'follow-ups'
            ? 'BRANCH'
            : 'SERVICE';
    const col5Header =
        reportType === 'inventory'
            ? 'UNIT PRICE'
            : reportType === 'follow-ups'
            ? 'NOTES'
            : 'AMOUNT';
    const col6Header =
        reportType === 'inventory'
            ? 'STOCK'
            : reportType === 'patients'
            ? 'DOB'
            : 'STATUS';

    const filteredRows = reportRows.filter((row) => {
        const q = tableSearch.trim().toLowerCase();
        if (q) {
            const haystack = `${row.date} ${row.patient} ${row.doctor} ${row.service} ${row.status} ${row.amount}`.toLowerCase();
            if (!haystack.includes(q)) return false;
        }
        if (reportType !== 'follow-ups' && tableStatusFilter !== 'all') {
            if (row.status.toUpperCase() !== tableStatusFilter) return false;
        }
        if (reportType === 'follow-ups' && followUpStatusFilter !== 'all') {
            if (row.status.toUpperCase() !== followUpStatusFilter) return false;
        }
        if (reportType === 'examinations' && examTypeFilter !== 'all') {
            if (row.service !== examTypeFilter) return false;
        }
        if (reportType === 'inventory' && inventoryTypeFilter !== 'all') {
            if (inventoryTypeFilter === 'pharmacy' && row.service !== 'Pharmacy item') return false;
            if (inventoryTypeFilter === 'optical' && row.service !== 'Optical item') return false;
            if (inventoryTypeFilter === 'expiring') {
                const es = (row as { expiryStatus?: string }).expiryStatus;
                if (es !== 'Expiring soon' && es !== 'Expired') return false;
            }
        }
        return true;
    });

    const handleExportClinicalCsv = () => {
        if (!filteredRows.length) {
            toast.error('No data to export');
            return;
        }
        const header =
            reportType === 'inventory'
                ? ['Expiry Date', 'Item', 'Category / Brand', 'Type', 'Unit Price', 'Stock', 'Expiry']
                : ['Date', 'Patient / Item', 'Doctor / Category', 'Service', 'Amount', 'Status'];
        const lines = filteredRows.map((row) => {
            const { date, patient, doctor, service, amount, status } = row;
            const expiryStatus = (row as { expiryStatus?: string }).expiryStatus ?? '—';
            const cells =
                reportType === 'inventory'
                    ? [date, patient, doctor, service, amount, status, expiryStatus]
                    : [date, patient, doctor, service, amount, status];
            return cells.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
        });
        const csv = [header.join(','), ...lines].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clinical-report-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="space-y-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Reports Dashboard
                        </h1>
                        <PageBreadcrumb current="Reports" />
                    </div>
                </div>
            </div>

            {/* KPI cards */}
            {!loadingSummary && summary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                    <StatsCard title="Total patients" value={String(summary.newPatients)} icon={Users} color="emerald" />
                    <StatsCard title="Appointments today" value={String(summary.totalAppointments)} icon={Calendar} color="blue" />
                    <StatsCard
                        title="Revenue today"
                        value={`$${summary.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                        icon={DollarSign}
                        color="purple"
                    />
                    <StatsCard title="Unpaid invoices" value={String(summary.unpaidInvoices)} icon={AlertTriangle} color="amber" />
                </div>
            )}

            {/* Filters / generate row */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900/2 dark:bg-slate-900/60 px-4 sm:px-5 py-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
                        <div className="space-y-1">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Report Type</p>
                            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                                <SelectTrigger className="h-9 rounded-lg text-xs">
                                    <SelectValue placeholder="Select report" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily-summary">Monthly overview</SelectItem>
                                    <SelectItem value="appointments">Appointments</SelectItem>
                                    <SelectItem value="billing">Billing (Finance)</SelectItem>
                                    <SelectItem value="examinations">Examinations</SelectItem>
                                    <SelectItem value="follow-ups">Follow-ups</SelectItem>
                                    <SelectItem value="inventory">Inventory</SelectItem>
                                    <SelectItem value="patients">Patients</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1 md:col-span-3 lg:col-span-3">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Date Range</p>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="date"
                                    value={from}
                                    onChange={(e) => setFrom(e.target.value)}
                                    className="h-9 rounded-lg text-xs"
                                />
                                <span className="text-xs text-slate-400">to</span>
                                <Input
                                    type="date"
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                    className="h-9 rounded-lg text-xs"
                                />
                            </div>
                        </div>
                        <div className="space-y-1" />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            size="sm"
                            onClick={downloadPdf}
                            disabled={loading}
                            className="h-9 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-xs font-semibold px-5"
                        >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <BarChart3 className="w-3.5 h-3.5 mr-1.5" />}
                            Generate
                        </Button>
                    </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div>
                            <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100">Patient Visits Trend</h2>
                            <p className="text-xs text-slate-400">Last 30 days (demo visualization)</p>
                        </div>
                    </div>
                    <div className="h-52 sm:h-60">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={visitsTrendDemo} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" />
                                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                <RechartsTooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--background))',
                                        borderRadius: 8,
                                        border: '1px solid hsl(var(--border))',
                                        fontSize: 11,
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="visits"
                                    stroke="#0EA5E9"
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 4.5 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100">Service Distribution</h2>
                            <p className="text-xs text-slate-400">Eye exams vs glasses vs surgery</p>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center gap-3">
                        <div className="w-44 h-44">
                            <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                    <Pie
                                        data={serviceDistributionDemo}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={75}
                                        paddingAngle={3}
                                        dataKey="value"
                                        startAngle={90}
                                        endAngle={-270}
                                    >
                                        {serviceDistributionDemo.map((s) => (
                                            <Cell key={s.name} fill={s.color} stroke="transparent" />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        formatter={(value: any, name: any) => [`${value} visits`, name]}
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
                        <div className="text-center">
                            <p className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
                                {totalServices}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">Total services (demo)</p>
                        </div>
                        <div className="w-full space-y-1.5">
                            {serviceDistributionDemo.map((s) => (
                                <div key={s.name} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                                        <span className="text-slate-600 dark:text-slate-200">{s.name}</span>
                                    </div>
                                    <span className="text-slate-500 dark:text-slate-300">
                                        {s.value} · {Math.round((s.value / totalServices) * 100)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Unified report table driven by reportType */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-5 py-3.5">
                    <div>
                        <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100">
                            {reportType === 'billing'
                                ? 'Billing Report'
                                : reportType === 'examinations'
                                ? 'Eye Examinations Report'
                                : reportType === 'patients'
                                ? 'Patients Report'
                                : reportType === 'inventory'
                                ? 'Inventory Report'
                                : reportType === 'follow-ups'
                                ? 'Follow-ups Report'
                                : 'Appointments Report'}
                        </h2>
                        <p className="text-[11px] text-slate-400">
                            {reportType === 'billing' &&
                                'Invoices for the selected date range with service type, final amount and payment status.'}
                            {reportType === 'appointments' &&
                                'Appointments in the selected date range with doctor, service and status.'}
                            {reportType === 'daily-summary' &&
                                'Appointments in the selected date range (same as Appointments) for quick overview.'}
                            {reportType === 'examinations' &&
                                'Eye examinations and surgeries combined in one list.'}
                            {reportType === 'patients' &&
                                'Registered patients with contact details and dates.'}
                            {reportType === 'inventory' &&
                                'Unified pharmacy and optical items. Stock and expiry are separate columns; expiry applies only to pharmacy items (e.g. eye drops). Optical items (glasses, lenses) show — in Expiry.'}
                            {reportType === 'follow-ups' &&
                                'All patient follow-ups (from exams, surgeries and prescriptions) with overdue tracking and completion rate.'}
                        </p>
                        {/* Follow-up KPI strip */}
                        {reportType === 'follow-ups' && (
                            <div className="flex flex-wrap gap-3 mt-2">
                                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    Total: {followUpKpis.totalCount}
                                </span>
                                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                    Overdue: {followUpKpis.overdueCount}
                                </span>
                                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                    Done: {followUpKpis.doneCount}
                                </span>
                                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                    Completion: {followUpKpis.completionRate}%
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Input
                            placeholder="Search reports..."
                            value={tableSearch}
                            onChange={(e) => setTableSearch(e.target.value)}
                            className="h-8 w-40 sm:w-56 rounded-lg text-xs"
                        />
                        {(reportType === 'appointments' ||
                            reportType === 'daily-summary' ||
                            reportType === 'billing' ||
                            reportType === 'examinations') && (
                            <Select
                                value={tableStatusFilter}
                                onValueChange={(v) =>
                                    setTableStatusFilter(v as 'all' | 'PENDING' | 'COMPLETED' | 'CANCELLED')
                                }
                            >
                                <SelectTrigger className="h-8 w-[120px] rounded-lg text-xs">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="COMPLETED">Completed</SelectItem>
                                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                        {reportType === 'examinations' && (
                            <Select
                                value={examTypeFilter}
                                onValueChange={(v) => setExamTypeFilter(v as 'all' | 'Eye Examination' | 'Surgery')}
                            >
                                <SelectTrigger className="h-8 w-[150px] rounded-lg text-xs">
                                    <SelectValue placeholder="All Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="Eye Examination">Eye Examination</SelectItem>
                                    <SelectItem value="Surgery">Surgery</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                        {reportType === 'follow-ups' && (
                            <Select
                                value={followUpStatusFilter}
                                onValueChange={(v) =>
                                    setFollowUpStatusFilter(v as 'all' | 'PENDING' | 'OVERDUE' | 'DONE' | 'CANCELLED')
                                }
                            >
                                <SelectTrigger className="h-8 w-[130px] rounded-lg text-xs">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                                    <SelectItem value="DONE">Done</SelectItem>
                                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                        {reportType === 'inventory' && (
                            <Select
                                value={inventoryTypeFilter}
                                onValueChange={(v) =>
                                    setInventoryTypeFilter(
                                        v as 'all' | 'pharmacy' | 'optical' | 'expiring',
                                    )
                                }
                            >
                                <SelectTrigger className="h-8 w-[150px] rounded-lg text-xs">
                                    <SelectValue placeholder="All Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="pharmacy">Pharmacy only</SelectItem>
                                    <SelectItem value="optical">Optical only</SelectItem>
                                    <SelectItem value="expiring">Expiring items</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs sm:text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                                <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                    {dateHeader}
                                </th>
                                <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                    {col2Header}
                                </th>
                                <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                    {col3Header}
                                </th>
                                <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                    {col4Header}
                                </th>
                                <th className="px-4 py-2 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                    {col5Header}
                                </th>
                                <th className="px-4 py-2 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                    {col6Header}
                                </th>
                                {reportType === 'inventory' && (
                                    <th className="px-4 py-2 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                        EXPIRY
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {reportLoading && (
                                <tr>
                                    <td colSpan={reportType === 'inventory' ? 7 : 6} className="px-4 py-6 text-center text-sm text-slate-400">
                                        Loading clinical report...
                                    </td>
                                </tr>
                            )}
                            {!reportLoading && reportRows.length === 0 && (
                                <tr>
                                    <td colSpan={reportType === 'inventory' ? 7 : 6} className="px-4 py-6 text-center text-sm text-slate-400">
                                        No appointments found for this period.
                                    </td>
                                </tr>
                            )}
                            {!reportLoading &&
                                filteredRows.slice(0, 10).map((row) => {
                                    const { id, date, patient, doctor, service, amount, status } = row;
                                    const expiryStatus = (row as { expiryStatus?: string }).expiryStatus ?? '—';
                                    const statusClasses =
                                        status === 'COMPLETED' || status === 'DONE'
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
                                            : status === 'CANCELLED'
                                            ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-700'
                                            : status === 'OVERDUE'
                                            ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-700'
                                            : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-700';

                                    return (
                                        <tr
                                            key={id}
                                            className="border-b last:border-b-0 border-slate-100 dark:border-slate-800/70 hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                                        >
                                            <td className="px-4 py-2.5 whitespace-nowrap text-slate-700 dark:text-slate-100">{date}</td>
                                            <td className="px-4 py-2.5 whitespace-nowrap text-slate-700 dark:text-slate-100">
                                                {patient}
                                            </td>
                                            <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{doctor}</td>
                                            <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{service}</td>
                                            <td className="px-4 py-2.5 whitespace-nowrap text-right tabular-nums text-slate-700 dark:text-slate-100">
                                                {amount}
                                            </td>
                                            <td className="px-4 py-2.5 whitespace-nowrap text-center">
                                                {reportType === 'inventory' ? (
                                                    <span className="text-slate-700 dark:text-slate-100">{status}</span>
                                                ) : reportType === 'patients' ? (
                                                    <span className="text-slate-600 dark:text-slate-300">{status}</span>
                                                ) : (
                                                    <span
                                                        className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusClasses}`}
                                                    >
                                                        {status}
                                                    </span>
                                                )}
                                            </td>
                                            {reportType === 'inventory' && (
                                                <td className="px-4 py-2.5 whitespace-nowrap text-center text-slate-600 dark:text-slate-300">
                                                    {expiryStatus}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
                        <div className="flex flex-col gap-3 px-4 sm:px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            Showing {Math.min(10, filteredRows.length)} of {filteredRows.length || 0} entries
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            size="sm"
                            className="h-9 rounded-lg text-xs font-semibold bg-red-500 hover:bg-red-600 text-white"
                            onClick={downloadPdf}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <FileDown className="w-3.5 h-3.5 mr-1.5" />}
                            Export as PDF
                        </Button>
                        <Button
                            size="sm"
                            className="h-9 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white"
                            onClick={handleExportClinicalCsv}
                            disabled={!reportRows.length}
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                            Export as Excel
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-lg text-xs font-semibold"
                            onClick={handlePrint}
                        >
                            <Printer className="w-3.5 h-3.5 mr-1.5" />
                            Print Report
                        </Button>
                        <Button
                            size="sm"
                            className="h-9 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-600 text-white"
                            onClick={() => {
                                downloadPdf();
                                if (reportRows.length) {
                                    handleExportClinicalCsv();
                                }
                            }}
                        >
                            <Package className="w-3.5 h-3.5 mr-1.5" />
                            Download All
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
