'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import { DataTable } from '@/components/ui/data-table';
import { ReceiveStockPurchaseDialog } from '../../receive-stock-purchase-dialog';
import { ArrowDownToLine, Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

type TxRow = {
    id: string;
    transactionDate: string;
    quantity: number;
    unitPrice: number | string;
    pharmacyItem?: { id: string; itemName: string } | null;
    performedBy?: { fullName: string } | null;
};

export default function PharmacyPurchasesPage() {
    const [rows, setRows] = useState<TxRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);

    const loadPurchases = () => {
        setLoading(true);
        api.get('/inventory/pharmacy/transactions?type=IN&limit=100')
            .then((r) => setRows(r.data?.data ?? []))
            .catch(() => toast.error('Failed to load purchases'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadPurchases(); }, []);

    const columns = useMemo<ColumnDef<TxRow>[]>(
        () => [
            {
                accessorKey: 'transactionDate',
                header: 'Date',
                cell: ({ row }) => new Date(row.original.transactionDate).toLocaleString(),
            },
            {
                accessorKey: 'pharmacyItem.itemName',
                header: 'Item',
                cell: ({ row }) => row.original.pharmacyItem?.itemName ?? '—',
            },
            {
                accessorKey: 'quantity',
                header: 'Qty',
                cell: ({ row }) => <span className="text-emerald-600 font-semibold">+{row.original.quantity}</span>,
            },
            {
                accessorKey: 'unitPrice',
                header: 'Unit price',
                cell: ({ row }) => '$' + Number(row.original.unitPrice).toFixed(2),
            },
            {
                id: 'by',
                header: 'By',
                cell: ({ row }) => row.original.performedBy?.fullName ?? '—',
            },
        ],
        []
    );

    return (
        <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <ArrowDownToLine className="h-7 w-7 text-[#0EA5E9]" />
                        Pharmacy — Purchases
                    </h1>
                    <PageBreadcrumb current="Purchases" />
                </div>
                <Button
                    onClick={() => setDialogOpen(true)}
                    className="h-10 rounded-lg bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold px-4"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Receive stock
                </Button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Record stock received from suppliers. Select an item, quantity, and unit price, then click Receive stock. New purchases appear in the table below.
            </p>
            <DataTable
                columns={columns}
                data={rows}
                loading={loading}
                onRefresh={loadPurchases}
                itemLabel="purchases"
                hideSearch
            />
            <ReceiveStockPurchaseDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                inventoryType="pharmacy"
                onSuccess={loadPurchases}
            />
        </div>
    );
}
