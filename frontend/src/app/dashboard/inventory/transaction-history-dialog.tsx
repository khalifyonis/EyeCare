'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { History, Loader2 } from 'lucide-react';

type TransactionRow = {
    id: string;
    transactionType: string;
    quantity: number;
    unitPrice: number | string;
    transactionDate: string;
    performedBy?: { fullName?: string } | null;
};

type ItemInfo = { id: string; itemName: string; stockQuantity: number };

interface TransactionHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    itemId: string | null;
    itemName: string;
    inventoryType: 'pharmacy' | 'optical';
}

function toNum(v: number | string | null | undefined): number {
    if (v == null) return 0;
    return typeof v === 'number' ? v : parseFloat(String(v)) || 0;
}

export function TransactionHistoryDialog(props: TransactionHistoryDialogProps) {
    const { open, onOpenChange, itemId, itemName, inventoryType } = props;
    const [loading, setLoading] = useState(false);
    const [item, setItem] = useState<ItemInfo | null>(null);
    const [transactions, setTransactions] = useState<TransactionRow[]>([]);

    useEffect(() => {
        if (!open || !itemId) {
            setItem(null);
            setTransactions([]);
            return;
        }
        setLoading(true);
        const base = inventoryType === 'pharmacy' ? '/inventory/pharmacy' : '/inventory/optical';
        api.get(`${base}/${itemId}/transactions`)
            .then((res) => {
                setItem(res.data.item ?? null);
                setTransactions(Array.isArray(res.data.transactions) ? res.data.transactions : []);
            })
            .catch(() => {
                toast.error('Failed to load transaction history');
                setTransactions([]);
            })
            .finally(() => setLoading(false));
    }, [open, itemId, inventoryType]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                        <History className="h-5 w-5" />
                        Transaction history — {itemName}
                    </DialogTitle>
                </DialogHeader>
                {item && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Current stock: <span className="font-semibold text-slate-700 dark:text-slate-200">{item.stockQuantity}</span>
                    </p>
                )}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                ) : (
                    <div className="overflow-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/60">
                                <tr>
                                    <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Date</th>
                                    <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Type</th>
                                    <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Qty</th>
                                    <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">Unit price</th>
                                    <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">By</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                                            No transactions yet.
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                            <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                                                {tx.transactionDate ? new Date(tx.transactionDate).toLocaleString() : '—'}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span
                                                    className={
                                                        tx.transactionType === 'IN'
                                                            ? 'inline-flex px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                            : tx.transactionType === 'OUT'
                                                            ? 'inline-flex px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                                            : 'inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                                    }
                                                >
                                                    {tx.transactionType}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums">
                                                {tx.transactionType === 'OUT'
                                                    ? `-${Math.abs(tx.quantity)}`
                                                    : tx.transactionType === 'ADJUST'
                                                    ? (tx.quantity >= 0 ? `+${tx.quantity}` : String(tx.quantity))
                                                    : `+${tx.quantity}`}
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                                                ${toNum(tx.unitPrice).toFixed(2)}
                                            </td>
                                            <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                                {tx.performedBy?.fullName ?? '—'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
