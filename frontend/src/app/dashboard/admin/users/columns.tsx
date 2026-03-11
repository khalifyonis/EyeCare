'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown, Pencil, Trash2 } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { StatusPill } from '@/components/ui/status-pill';

export type User = {
    id: string;
    fullName: string;
    username: string;
    email: string;
    roleName: string;
    branchName?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
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
    onEdit: (user: User) => void;
    onDelete: (id: string) => void;
}

const getRoleBadgeColor = (role: string) => {
    switch (role.toUpperCase()) {
        case 'ADMIN': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        case 'DOCTOR': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        case 'PHARMACIST': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
        case 'RECEPTIONIST': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        case 'OPTICIAN': return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400';
        default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
};

function formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(dateStr?: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(dateStr);
}

const sortableHeader = (label: string) =>
    ({ column }: { column: any }) => (
        <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 text-inherit font-inherit hover:bg-transparent hover:text-slate-800 dark:hover:text-white text-[13px]"
        >
            {label}
            <ChevronsUpDown className="ml-1.5 h-3 w-3 text-slate-400" />
        </Button>
    );

export const getUserColumns = ({ onEdit, onDelete }: UserColumnsProps): ColumnDef<User>[] => [
    {
        accessorKey: 'fullName',
        header: sortableHeader('Full Name'),
        cell: ({ row }) => {
            const user = row.original;
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            return (
                <div className="flex items-center gap-3 min-w-0">
                    {user.profileImage ? (
                        <div className="flex size-8 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700">
                            <img
                                src={`${apiUrl}${user.profileImage}`}
                                alt={user.fullName}
                                className="h-full w-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${getRoleBadgeColor(user.roleName)}`}>
                            {user.fullName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <span className="truncate">{user.fullName}</span>
                </div>
            );
        },
    },
    {
        accessorKey: 'email',
        header: sortableHeader('Email'),
        cell: ({ getValue }) => (
            <span className="truncate block">{getValue<string>() || '—'}</span>
        ),
    },
    {
        accessorKey: 'username',
        header: sortableHeader('Username'),
        cell: ({ getValue }) => (
            <span>{getValue<string>() || '—'}</span>
        ),
    },
    {
        accessorKey: 'roleName',
        header: sortableHeader('Role'),
        cell: ({ getValue }) => {
            const role = getValue<string>();
            return (
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeColor(role)}`}>
                    {role}
                </span>
            );
        },
    },
    {
        accessorKey: 'branches',
        header: 'Assigned Branches',
        cell: ({ row }) => {
            const user = row.original;
            const branches = user.branches || [];

            if (branches.length === 0) {
                return <span className="text-slate-400 italic">No branches</span>;
            }

            const [first, ...rest] = branches;

            return (
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {first.branchName}
                    </span>
                    {rest.length > 0 && (
                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="inline-flex items-center rounded-full bg-slate-200/80 dark:bg-slate-700 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 cursor-default whitespace-nowrap">
                                        +{rest.length} more
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                    <ul className="text-xs space-y-0.5">
                                        {rest.map((b) => (
                                            <li key={b.id}>{b.branchName}</li>
                                        ))}
                                    </ul>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: 'isActive',
        header: sortableHeader('Status'),
        cell: ({ row }) => {
            const active = row.original.isActive !== false;
            return (
                <StatusPill variant={active ? 'success' : 'neutral'}>
                    {active ? 'Active' : 'Inactive'}
                </StatusPill>
            );
        },
    },
    {
        accessorKey: 'createdAt',
        header: sortableHeader('Joined'),
        cell: ({ row }) => (
            <span className="whitespace-nowrap">
                {formatDate(row.original.createdAt)}
            </span>
        ),
    },
    {
        accessorKey: 'updatedAt',
        header: 'Last Active',
        cell: ({ row }) => (
            <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {timeAgo(row.original.updatedAt)}
            </span>
        ),
    },
    {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    title="Edit User"
                    className="h-8 w-8 text-[#0EA5E9] hover:bg-[#0EA5E9]/10 rounded-lg"
                    onClick={() => onEdit(row.original)}
                >
                    <Pencil className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    title="Delete User"
                    className="h-8 w-8 text-red-500 hover:bg-red-500/10 rounded-lg"
                    onClick={() => onDelete(row.original.id)}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        ),
    },
];
