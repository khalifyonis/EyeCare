'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2 } from 'lucide-react';

export type Branch = {
    id: string;
    branchName: string;
    address: string;
    phone: string;
    isActive?: boolean;
    createdAt?: string;
};

interface BranchColumnsProps {
    onView: (branch: Branch) => void;
    onEdit: (branch: Branch) => void;
    onDelete: (id: string) => void;
}

export const getBranchColumns = ({ onView, onEdit, onDelete }: BranchColumnsProps): ColumnDef<Branch>[] => [
    {
        id: 'index',
        header: () => <span className="text-[13px] font-bold uppercase tracking-[0.03em] text-slate-700">#</span>,
        cell: ({ row }) => <span className="text-sm text-slate-500">{row.index + 1}</span>,
    },
    {
        accessorKey: 'branchName',
        header: () => <span className="text-[13px] font-bold uppercase tracking-[0.03em] text-slate-700">Branch Name</span>,
        cell: ({ row }) => (
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{row.original.branchName}</span>
        ),
    },
    {
        accessorKey: 'address',
        header: () => <span className="text-[13px] font-bold uppercase tracking-[0.03em] text-slate-700">Address</span>,
        cell: ({ getValue }) => (
            <span className="text-sm text-slate-700">{getValue<string>()}</span>
        ),
    },
    {
        accessorKey: 'phone',
        header: () => <span className="text-[13px] font-bold uppercase tracking-[0.03em] text-slate-700">Phone</span>,
        cell: ({ getValue }) => (
            <span className="text-sm text-slate-700">{getValue<string>()}</span>
        ),
    },
    {
        id: 'actions',
        header: () => <span className="flex justify-end pr-2 text-[13px] font-bold uppercase tracking-[0.03em] text-slate-700">Actions</span>,
        cell: ({ row }) => (
            <div className="flex items-center justify-end gap-4 pr-1 whitespace-nowrap">
                <button
                    type="button"
                    title="View Branch"
                    className="text-sm font-semibold text-[#0EA5E9] hover:text-[#0c96d4] transition-all hover:underline"
                    onClick={() => onView(row.original)}
                >
                    View
                </button>
                <button
                    type="button"
                    title="Edit Branch"
                    className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-all hover:underline"
                    onClick={() => onEdit(row.original)}
                >
                    Edit
                </button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => onDelete(row.original.id)}
                            className="gap-2 text-[12px] text-red-600 focus:text-red-600"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        ),
    },
];
