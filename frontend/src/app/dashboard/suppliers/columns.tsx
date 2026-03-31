'use client';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';

export type Supplier = {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    branch?: { id: string; branchName?: string | null } | null;
};

interface SupplierColumnsProps {
    onEdit: (s: Supplier) => void;
    onDelete: (id: string) => void;
}

export function getSupplierColumns({ onEdit, onDelete }: SupplierColumnsProps): ColumnDef<Supplier>[] {
    return [
        {
            id: 'index',
            header: '#',
            cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.index + 1}</span>,
        },
        {
            accessorKey: 'name',
            header: 'Supplier name',
            cell: ({ row }) => <span className="font-semibold text-slate-900 dark:text-slate-100">{row.original.name}</span>,
        },
        {
            accessorKey: 'phone',
            header: 'Phone',
            cell: ({ row }) => <span className="text-sm text-slate-500 dark:text-slate-400">{row.original.phone || '—'}</span>,
        },
        {
            accessorKey: 'email',
            header: 'Email',
            cell: ({ row }) => <span className="text-sm text-slate-500 dark:text-slate-400">{row.original.email || '—'}</span>,
        },
        {
            accessorKey: 'address',
            header: 'Address',
            cell: ({ row }) => <span className="text-sm text-slate-500 dark:text-slate-400">{row.original.address || '—'}</span>,
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="flex items-center justify-end gap-1 pr-1">
                    <Button variant="ghost" size="icon" title="Edit" className="h-8 w-8 bg-blue-50 dark:bg-blue-950/30 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-all rounded-lg" onClick={() => onEdit(row.original)}>
                        <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Delete" className="h-8 w-8 bg-red-50 dark:bg-red-950/30 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all rounded-lg" onClick={() => onDelete(row.original.id)}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            ),
        },
    ];
}

