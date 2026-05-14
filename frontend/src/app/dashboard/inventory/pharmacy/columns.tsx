import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2, AlertTriangle, PackagePlus, History, SlidersHorizontal, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PharmacyRow {
    id: string;
    itemName: string;
    itemType?: string | null;
    category?: string | null;
    manufacturer?: string | null;
    supplierName?: string | null;
    supplierId?: string | null;
    supplier?: { id: string; name: string } | null;
    batchNumber?: string | null;
    stockQuantity: number;
    reorderLevel: number;
    purchasePrice?: number | string | null;
    sellingPrice?: number | string | null;
    expiryDate?: string | null;
    branch?: { id: string; branchName?: string | null } | null;
}

export interface PharmacyColumnsProps {
    onEdit: (row: PharmacyRow) => void;
    onDelete: (id: string) => void;
    onReceive: (row: PharmacyRow) => void;
    onHistory: (row: PharmacyRow) => void;
    onAdjust: (row: PharmacyRow) => void;
}

function toNum(v: number | string | null | undefined): number {
    if (v == null) return 0;
    return typeof v === 'number' ? v : parseFloat(String(v)) || 0;
}

export function getPharmacyColumns({ onEdit, onDelete, onReceive, onHistory, onAdjust }: PharmacyColumnsProps): ColumnDef<PharmacyRow>[] {
    return [
        {
            accessorKey: 'itemName',
            header: 'MEDICINE NAME (GENERIC)',
            cell: ({ row }) => (
                <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{row.original.itemName}</span>
                    {row.original.genericName && (
                        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">{row.original.genericName}</span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'category',
            header: 'CATEGORY',
            cell: ({ row }) => (
                <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400 uppercase border border-slate-200 dark:border-slate-700">
                    {row.original.category || 'General'}
                </span>
            ),
        },
        {
            accessorKey: 'stockQuantity',
            header: 'STOCK STATUS',
            cell: ({ row }) => {
                const qty = Number(row.original.stockQuantity) ?? 0;
                const reorder = Number(row.original.reorderLevel) ?? 0;
                const low = qty <= reorder;
                const oos = qty === 0;

                return (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                            <span className={cn(
                                "text-sm font-black tabular-nums",
                                oos ? "text-red-600" : low ? "text-amber-600" : "text-emerald-600"
                            )}>
                                {qty}
                            </span>
                            {oos ? (
                                <Ban className="h-3 w-3 text-red-500" />
                            ) : low ? (
                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                            ) : null}
                        </div>
                        <div className="w-16 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className={cn(
                                    "h-full transition-all",
                                    oos ? "w-0" : low ? "w-1/3 bg-amber-500" : "w-full bg-emerald-500"
                                )} 
                            />
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'sellingPrice',
            header: 'PRICE',
            cell: ({ row }) => (
                <span className="tabular-nums font-black text-slate-900 dark:text-slate-100">
                    ${toNum(row.original.sellingPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            ),
        },
        {
            accessorKey: 'expiryDate',
            header: 'EXPIRY',
            cell: ({ row }) => {
                const d = row.original.expiryDate;
                if (!d) return <span className="text-slate-300">—</span>;
                const date = new Date(d);
                const now = new Date();
                const cutoff = new Date(now);
                cutoff.setDate(cutoff.getDate() + 90);
                
                const isExpired = date < now;
                const isSoon = date <= cutoff;

                return (
                    <div className="flex flex-col">
                        <span className={cn(
                            "text-xs font-bold",
                            isExpired ? "text-red-600" : isSoon ? "text-amber-600" : "text-slate-700 dark:text-slate-300"
                        )}>
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {isExpired ? (
                            <span className="text-[9px] font-black uppercase text-red-500">Expired</span>
                        ) : isSoon ? (
                            <span className="text-[9px] font-black uppercase text-amber-500">Expiring Soon</span>
                        ) : null}
                    </div>
                );
            },
        },
        {
            id: 'actions',
            header: 'ACTIONS',
            cell: ({ row }: { row: { original: PharmacyRow } }) => (
                <div className="flex items-center justify-end gap-1.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Transaction history"
                        className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                        onClick={() => onHistory(row.original)}
                    >
                        <History className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Adjust stock"
                        className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                        onClick={() => onAdjust(row.original)}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Receive stock"
                        className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                        onClick={() => onReceive(row.original)}
                    >
                        <PackagePlus className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Edit item"
                        className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        onClick={() => onEdit(row.original)}
                    >
                        <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Delete item"
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        onClick={() => onDelete(row.original.id)}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            ),
        },
    ];
}
