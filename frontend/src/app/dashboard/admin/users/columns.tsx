'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, Pencil, Trash2 } from 'lucide-react';

export type User = {
    id: string; // Changed to string for consistency with backend UUIDs
    fullName: string;
    username: string;
    email: string;
    roleName: string;
    branchName?: string;
    branches?: Array<{
        id: string;
        branchName: string;
    }>;
    profileImage?: string;
    doctor?: {
        specialization: string;
    };
};

interface UserColumnsProps {
    onEdit: (user: User) => void;
    onDelete: (id: string) => void;
}

const getRoleBadgeColor = (role: string) => {
    switch (role.toUpperCase()) {
        case 'ADMIN': return 'bg-red-500/10 text-red-500 border-red-500/20';
        case 'DOCTOR': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        case 'PHARMACIST': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        case 'RECEPTIONIST': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        case 'OPTICIAN': return 'bg-violet-500/10 text-violet-500 border-violet-500/20';
        default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
};

export const getUserColumns = ({ onEdit, onDelete }: UserColumnsProps): ColumnDef<User>[] => [
    {
        accessorKey: 'fullName',
        header: 'Full Name',
        cell: ({ row }) => {
            const user = row.original;
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            return (
                <div className="flex items-center gap-3">
                    {user.profileImage ? (
                        <div className="flex size-9 shrink-0 overflow-hidden rounded-full border border-slate-100 dark:border-slate-800">
                            <img
                                src={`${apiUrl}${user.profileImage}`}
                                alt={user.fullName}
                                className="h-full w-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className={`flex size-9 items-center justify-center rounded-full text-xs font-bold ${getRoleBadgeColor(user.roleName)}`}>
                            {user.fullName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{user.fullName}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: 'username',
        header: 'Username',
        cell: ({ getValue }) => <span className="text-sm text-slate-600 dark:text-slate-400">{getValue<string>()}</span>,
    },
    {
        accessorKey: 'roleName',
        header: 'Role',
        cell: ({ getValue }) => {
            const role = getValue<string>();
            return (
                <Badge variant="outline" className={`font-semibold text-[11px] uppercase px-2.5 py-0.5 border ${getRoleBadgeColor(role)}`}>
                    {role}
                </Badge>
            );
        },
    },
    {
        accessorKey: 'branchName',
        header: 'Assigned Branches',
        cell: ({ row }) => {
            const user = row.original;
            const branches = user.branches || [];

            if (branches.length === 0) {
                return <span className="text-sm text-slate-400 italic">No branches</span>;
            }

            return (
                <div className="flex flex-wrap gap-1">
                    {branches.map((b: any) => (
                        <Badge
                            key={b.id}
                            variant="secondary"
                            className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-none text-[10px] font-bold px-2 py-0"
                        >
                            {b.branchName}
                        </Badge>
                    ))}
                </div>
            );
        },
    },
    {
        id: 'actions',
        header: () => <span className="flex justify-end pr-2 uppercase text-[11px] font-bold text-slate-500 tracking-wider">Actions</span>,
        cell: ({ row }) => (
            <div className="flex items-center justify-end gap-1 pr-1">
                <Button
                    variant="ghost"
                    size="icon"
                    title="Edit User"
                    className="h-8 w-8 bg-blue-50 dark:bg-blue-950/30 text-[#0EA5E9] hover:bg-blue-100 hover:text-[#0c96d4] transition-all rounded-lg"
                    onClick={() => onEdit(row.original)}
                >
                    <Pencil className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    title="Delete User"
                    className="h-8 w-8 bg-red-50 dark:bg-red-950/30 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all rounded-lg"
                    onClick={() => onDelete(row.original.id)}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        ),
    },
];
