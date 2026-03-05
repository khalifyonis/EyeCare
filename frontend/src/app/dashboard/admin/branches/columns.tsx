'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Pencil, Trash2 } from 'lucide-react';

export type Branch = {
    id: number;
    branchName: string;
    address: string;
    phone: string;
};

interface BranchColumnsProps {
    onEdit: (branch: Branch) => void;
    onDelete: (id: number) => void;
}

export const getBranchColumns = ({ onEdit, onDelete }: BranchColumnsProps): ColumnDef<Branch>[] => [
    {
        id: 'index',
        header: '#',
        cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.index + 1}</span>,
    },
    {
        accessorKey: 'branchName',
        header: 'Branch Name',
        cell: ({ row }) => (
            <span className="font-semibold text-slate-900 dark:text-slate-100">{row.original.branchName}</span>
        ),
    },
    {
        accessorKey: 'address',
        header: 'Address',
        cell: ({ getValue }) => (
            <span className="text-sm text-slate-500">{getValue<string>()}</span>
        ),
    },
    {
        accessorKey: 'phone',
        header: 'Phone',
        cell: ({ getValue }) => (
            <span className="text-sm text-slate-500">{getValue<string>()}</span>
        ),
    },
    {
        id: 'actions',
        header: () => <span className="flex justify-end pr-2 uppercase text-[11px] font-bold text-slate-500 tracking-wider">Actions</span>,
        cell: ({ row }) => (
            <div className="flex items-center justify-end gap-1 pr-1">
                <Button
                    variant="ghost"
                    size="icon"
                    title="Edit Branch"
                    className="h-8 w-8 bg-blue-50 dark:bg-blue-950/30 text-[#0EA5E9] hover:bg-blue-100 hover:text-[#0c96d4] transition-all rounded-lg"
                    onClick={() => onEdit(row.original)}
                >
                    <Pencil className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    title="Delete Branch"
                    className="h-8 w-8 bg-red-50 dark:bg-red-950/30 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all rounded-lg"
                    onClick={() => onDelete(row.original.id)}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        ),
    },
];
