'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, Pencil, Trash2 } from 'lucide-react';

export type User = {
    id: number;
    fullName: string;
    username: string;
    email: string;
    roleName: string;
    doctor?: {
        specialization: string;
    };
};

interface UserColumnsProps {
    onEdit: (user: User) => void;
    onDelete: (id: number) => void;
}

const getRoleBadgeColor = (role: string) => {
    switch (role.toUpperCase()) {
        case 'ADMIN': return 'bg-red-500/10 text-red-500 border-red-500/20';
        case 'DOCTOR': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        case 'PHARMACIST': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        case 'RECEPTIONIST': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
};

export const getUserColumns = ({ onEdit, onDelete }: UserColumnsProps): ColumnDef<User>[] => [
    {
        accessorKey: 'fullName',
        header: ({ column }) => (
            <Button
                variant="ghost"
                className="p-0 h-auto hover:bg-transparent font-bold text-slate-500 uppercase text-[11px] tracking-wider"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
                Full Name
                <ArrowUpDown className="ml-2 h-3.5 w-3.5 opacity-50" />
            </Button>
        ),
        cell: ({ row }) => {
            const user = row.original;
            return (
                <div className="flex items-center gap-3">
                    <div className={`flex size-9 items-center justify-center rounded-xl text-xs font-black shadow-sm ${getRoleBadgeColor(user.roleName)}`}>
                        {user.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{user.fullName}</span>
                        {user.doctor && (
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">
                                {user.doctor.specialization}
                            </span>
                        )}
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: 'username',
        header: 'Username',
        cell: ({ getValue }) => <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400">{getValue<string>()}</span>,
    },
    {
        accessorKey: 'roleName',
        header: 'Role',
        cell: ({ getValue }) => {
            const role = getValue<string>();
            return (
                <Badge variant="outline" className={`font-bold text-[10px] uppercase tracking-tighter px-2 py-0 border-2 ${getRoleBadgeColor(role)}`}>
                    {role}
                </Badge>
            );
        },
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
