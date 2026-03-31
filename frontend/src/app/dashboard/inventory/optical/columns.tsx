import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2, AlertTriangle, PackagePlus, History, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface OpticalRow {
    id: string;
    itemName: string;
    itemType?: string | null;
    brand?: string | null;
    manufacturer?: string | null;
    supplierName?: string | null;
    supplierId?: string | null;
    supplier?: { id: string; name: string } | null;
    stockQuantity: number;
    reorderLevel: number;
    purchasePrice?: number | string | null;
    sellingPrice?: number | string | null;
    branch?: { id: string; branchName?: string | null } | null;
}

export interface OpticalColumnsProps {
    onEdit: (row: OpticalRow) => void;
    onDelete: (id: string) => void;
    onReceive: (row: OpticalRow) => void;
    onHistory: (row: OpticalRow) => void;
    onAdjust: (row: OpticalRow) => void;
}

function toNum(v: number | string | null | undefined): number {
    if (v == null) return 0;
    return typeof v === 'number' ? v : parseFloat(String(v)) || 0;
}

export function getOpticalColumns({ onEdit, onDelete, onReceive, onHistory, onAdjust }: OpticalColumnsProps): ColumnDef<OpticalRow>[] {
    return [
        {
            accessorKey: 'itemName',
            header: 'Item',
            cell: ({ row }) => (
                <span className="font-medium text-sm">{row.original.itemName || '—'}</span>
            ),
        },
        {
            accessorKey: 'brand',
            header: 'Brand',
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">{row.original.brand || '—'}</span>
            ),
        },
        {
            accessorKey: 'itemType',
            header: 'Type',
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">{row.original.itemType || '—'}</span>
            ),
        },
        {
            accessorKey: 'supplier',
            header: 'Supplier',
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">{row.original.supplier?.name || row.original.supplierName || '—'}</span>
            ),
        },
        {
            accessorKey: 'stockQuantity',
            header: 'Stock',
            cell: ({ row }) => {
                const qty = Number(row.original.stockQuantity) ?? 0;
                const reorder = Number(row.original.reorderLevel) ?? 0;
                const low = qty <= reorder;
                return (
                    <span className={low ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
                        {qty}
                        {low && <AlertTriangle className="inline h-3.5 w-3.5 ml-1 text-amber-500" />}
                    </span>
                );
            },
        },
        {
            accessorKey: 'reorderLevel',
            header: 'Reorder at',
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">{Number(row.original.reorderLevel) ?? 0}</span>
            ),
        },
        {
            accessorKey: 'sellingPrice',
            header: 'Selling price',
            cell: ({ row }) => (
                <span className="tabular-nums text-sm">
                    ${toNum(row.original.sellingPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }: { row: { original: OpticalRow } }) => (
                <div className="flex items-center justify-end gap-1 px-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Transaction history"
                        className="h-8 w-8 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-all active:scale-90 rounded-lg"
                        onClick={() => onHistory(row.original)}
                    >
                        <History className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Adjust stock"
                        className="h-8 w-8 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 transition-all active:scale-90 rounded-lg"
                        onClick={() => onAdjust(row.original)}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Receive stock"
                        className="h-8 w-8 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 transition-all active:scale-90 rounded-lg shadow-sm shadow-emerald-200/50"
                        onClick={() => onReceive(row.original)}
                    >
                        <PackagePlus className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Edit item"
                        className="h-8 w-8 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-all active:scale-90 rounded-lg shadow-sm shadow-blue-200/50"
                        onClick={() => onEdit(row.original)}
                    >
                        <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Delete item"
                        className="h-8 w-8 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all active:scale-90 rounded-lg shadow-sm shadow-red-200/50"
                        onClick={() => onDelete(row.original.id)}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            ),
        },
    ];
}
