import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2, MoreVertical, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface OpticalRow {
    id: string;
    itemName: string;
    itemType?: string | null;
    brand?: string | null;
    manufacturer?: string | null;
    stockQuantity: number;
    reorderLevel: number;
    purchasePrice?: number | string | null;
    sellingPrice?: number | string | null;
    branch?: { id: string; branchName?: string | null } | null;
}

export interface OpticalColumnsProps {
    onEdit: (row: OpticalRow) => void;
    onDelete: (id: string) => void;
}

function toNum(v: number | string | null | undefined): number {
    if (v == null) return 0;
    return typeof v === 'number' ? v : parseFloat(String(v)) || 0;
}

export function getOpticalColumns({ onEdit, onDelete }: OpticalColumnsProps): ColumnDef<OpticalRow>[] {
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
            header: '',
            cell: ({ row }: { row: { original: OpticalRow } }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(row.original)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onDelete(row.original.id)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];
}
