'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
    Building2,
    MapPin,
    Phone,
    ArrowUpDown,
    Pencil,
    Trash2
} from 'lucide-react';

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
        cell: ({ row }) => <span className="text-muted-foreground text-[10px] font-mono font-bold opacity-50">{row.index + 1}</span>,
    },
    {
        accessorKey: 'branchName',
        header: ({ column }) => (
            <Button
                variant="ghost"
                className="p-0 h-auto hover:bg-transparent font-bold text-slate-500 uppercase text-[11px] tracking-wider"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
                Branch Name
                <ArrowUpDown className="ml-2 h-3.5 w-3.5 opacity-50" />
            </Button>
        ),
        cell: ({ row }) => {
            const branch = row.original;
            return (
                <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 shadow-sm border border-indigo-500/20">
                        <Building2 className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{branch.branchName}</span>
                </div>
            );
        },
    },
    {
        accessorKey: 'address',
        header: 'Address',
        cell: ({ getValue }) => (
            <div className="flex items-center gap-2 text-slate-500 font-medium text-xs">
                <MapPin className="w-3 h-3 shrink-0 opacity-40" />
                <span className="line-clamp-1">{getValue<string>()}</span>
            </div>
        ),
    },
    {
        accessorKey: 'phone',
        header: 'Phone',
        cell: ({ getValue }) => (
            <div className="flex items-center gap-2 text-slate-500 font-medium text-xs">
                <Phone className="w-3 h-3 opacity-40" />
                {getValue<string>()}
            </div>
        ),
    },
    {
        id: 'actions',
        header: () => <span className="flex justify-end pr-2">Actions</span>,
        cell: ({ row }) => (
            <div className="flex items-center justify-end gap-2 pr-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-[#0EA5E9]/10 hover:text-[#0EA5E9] transition-all"
                    onClick={() => onEdit(row.original)}
                >
                    <Pencil className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-red-100 dark:hover:bg-red-950/30 hover:text-red-500 transition-all"
                    onClick={() => onDelete(row.original.id)}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        ),
    },
];
