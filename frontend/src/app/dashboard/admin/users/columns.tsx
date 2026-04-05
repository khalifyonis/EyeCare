'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2, User } from 'lucide-react';

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
        licenseNumber?: string;
        specialization: string;
    };
};

interface UserColumnsProps {
    onView: (user: User) => void;
    onEdit: (user: User) => void;
    onDelete: (id: string) => void;
}

const AVATAR_STYLE = 'bg-slate-100 text-slate-700 border border-slate-200';
const ROLE_BADGE_STYLE = 'bg-slate-100 text-slate-700 border-slate-200';

export const getUserColumns = ({ onView, onEdit, onDelete }: UserColumnsProps): ColumnDef<User>[] => [
    {
        accessorKey: 'fullName',
        header: () => <span className="text-[13px] font-bold uppercase tracking-[0.03em] text-slate-700">Full Name</span>,
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
                        <div className={`flex size-9 items-center justify-center rounded-full ${AVATAR_STYLE}`}>
                            <User className="h-4 w-4" />
                        </div>
                    )}
                    <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-tight">{user.fullName}</span>
                        <span className="text-[13px] text-slate-500 dark:text-slate-400">{user.email}</span>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: 'username',
        header: () => <span className="text-[13px] font-bold uppercase tracking-[0.03em] text-slate-700">Username</span>,
        cell: ({ getValue }) => <span className="text-sm font-normal text-slate-800 dark:text-slate-200">{getValue<string>()}</span>,
    },
    {
        accessorKey: 'roleName',
        header: () => <span className="text-[13px] font-bold uppercase tracking-[0.03em] text-slate-700">Role</span>,
        cell: ({ getValue }) => {
            const role = getValue<string>();
            return (
                <Badge variant="outline" className={`font-medium text-[11px] uppercase px-2.5 py-0.5 border ${ROLE_BADGE_STYLE}`}>
                    {role}
                </Badge>
            );
        },
    },
    {
        accessorKey: 'branchName',
        header: () => <span className="text-[13px] font-bold uppercase tracking-[0.03em] text-slate-700">Assigned Branches</span>,
        cell: ({ row }) => {
            const user = row.original;
            const branches = user.branches || [];

            if (branches.length === 0) {
                return <span className="text-sm text-slate-400">No branches</span>;
            }

            const firstBranch = branches[0];
            const remaining = branches.length - 1;

            return (
                <div className="flex flex-col gap-0.5">
                    <Badge
                        variant="secondary"
                        className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium px-2 py-0 w-fit"
                    >
                        {firstBranch.branchName}
                    </Badge>
                    {remaining > 0 && (
                        <span className="text-[11px] text-slate-400 font-normal pl-0.5">
                            +{remaining} more
                        </span>
                    )}
                </div>
            );
        },
    },
    {
        id: 'actions',
        header: () => <span className="flex justify-end pr-2 uppercase text-[13px] font-bold text-slate-700 tracking-[0.03em]">Actions</span>,
        cell: ({ row }) => (
            <div className="flex items-center justify-end gap-4 pr-1 whitespace-nowrap">
                <button
                    type="button"
                    title="View User"
                    className="text-sm font-semibold text-[#0EA5E9] hover:text-[#0c96d4] transition-all hover:underline"
                    onClick={() => onView(row.original)}
                >
                    View
                </button>
                <button
                    type="button"
                    title="Edit User"
                    className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-all hover:underline"
                    onClick={() => onEdit(row.original)}
                >
                    Edit
                </button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-slate-600"
                        >
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
