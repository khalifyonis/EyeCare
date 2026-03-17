'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import { History, RefreshCcw } from 'lucide-react';

type TxRow = {
    id: string;
    transactionDate: string;
    transactionType: string;
    quantity: number;
    unitPrice: number | string;
    opticalItem?: { id: string; itemName: string; brand?: string | null } | null;
    performedBy?: { id: string; fullName: string } | null;
    billing?: { id: string; referenceNumber?: string | null } | null;
};

const typeBadge: Record<string, string> = {
    IN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    OUT: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    ADJUST: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

export default function OpticalTransactionsPage() {
    const [rows, setRows] = useState<TxRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;
    const [typeFilter, setTypeFilter] = useState('all');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit };
            if (typeFilter !== 'all') params.type = typeFilter;
            if (from) params.from = from;
            if (to) params.to = to;
            const res = await api.get('/inventory/optical/transactions', { params });
            const body = res.data;
            setRows(Array.isArray(body?.data) ? body.data : []);
            setTotal(body?.total ?? 0);
            setTotalPages(body?.totalPages ?? 1);
        } catch {
            toast.error('Failed to load transactions');
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [page, typeFilter, from, to]);

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <History className="h-7 w-7 text-[#0EA5E9]" />
                        Optical — Transaction History
                    </h1>
                    <PageBreadcrumb current="Transaction History" />
                </div>
                <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-9">
                    <RefreshCcw className={"h-4 w-4 mr-2" + (loading ? " animate-spin" : "")} /> Refresh
                </Button>
            </div>

            <div className="flex flex-wrap gap-3 items-end">
                <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
                    <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="IN">IN (Purchase)</SelectItem>
                        <SelectItem value="OUT">OUT (Sale)</SelectItem>
                        <SelectItem value="ADJUST">ADJUST</SelectItem>
                    </SelectContent>
                </Select>
                <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">From</label>
                    <Input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} className="h-9 w-[140px]" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">To</label>
                    <Input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} className="h-9 w-[140px]" />
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                                <th className="px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400">Date</th>
                                <th className="px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400">Item</th>
                                <th className="px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400">Type</th>
                                <th className="px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400">Qty</th>
                                <th className="px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400">Unit Price</th>
                                <th className="px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400">By</th>
                                <th className="px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400">Billing Ref</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>}
                            {!loading && rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No transactions found</td></tr>}
                            {!loading && rows.map(r => (
                                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{new Date(r.transactionDate).toLocaleString()}</td>
                                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">{r.opticalItem?.itemName || '—'}</td>
                                    <td className="px-4 py-2.5">
                                        <span className={"inline-flex rounded-full px-2 py-0.5 text-xs font-semibold " + (typeBadge[r.transactionType] || 'bg-slate-100 text-slate-600')}>{r.transactionType}</span>
                                    </td>
                                    <td className={"px-4 py-2.5 font-semibold tabular-nums " + (r.transactionType === 'OUT' ? 'text-red-600' : 'text-emerald-600')}>
                                        {r.transactionType === 'OUT' ? '-' : '+'}{r.quantity}
                                    </td>
                                    <td className="px-4 py-2.5 tabular-nums">${Number(r.unitPrice).toFixed(2)}</td>
                                    <td className="px-4 py-2.5 text-slate-500">{r.performedBy?.fullName || '—'}</td>
                                    <td className="px-4 py-2.5 text-slate-500">{r.billing?.referenceNumber || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Page {page} of {totalPages} ({total} total)</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                    </div>
                </div>
            )}
        </div>
    );
}
