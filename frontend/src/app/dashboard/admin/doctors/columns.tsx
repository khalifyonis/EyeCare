import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface DoctorColumnsProps {
    onView: (doctor: any) => void;
    onEdit: (doctor: any) => void;
    onDelete: (id: string) => void;
}

export const getDoctorColumns = ({ onView, onEdit, onDelete }: DoctorColumnsProps): ColumnDef<any>[] => [
    {
        accessorKey: 'fullName',
        header: () => <span className="text-[13px] font-bold uppercase tracking-[0.03em] text-slate-700">Doctor Name</span>,
        cell: ({ row }) => {
            const user = row.original;
            const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
            return (
                <div className="flex items-center gap-3 py-1">
                    {user.profileImage ? (
                        <div className="flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-100 dark:border-slate-800">
                            <img
                                src={`${apiUrl}${user.profileImage}`}
                                alt={user.fullName}
                                className="h-full w-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            <User className="h-4 w-4" />
                        </div>
                    )}
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.fullName}</span>
                        <span className="text-[13px] text-slate-500">@{user.username?.toLowerCase()}</span>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: 'specialization',
        header: () => <span className="text-[13px] font-bold uppercase tracking-[0.03em] text-slate-700">Specialization</span>,
        cell: ({ row }) => (
            <span className="text-sm text-slate-700 dark:text-slate-300">{row.original.specialization}</span>
        ),
    },
    {
        accessorKey: 'branchName',
        header: () => <span className="text-[13px] font-bold uppercase tracking-[0.03em] text-slate-700">Branch</span>,
        cell: ({ row }) => (
            <span className="text-sm text-slate-700 dark:text-slate-300">{row.original.branchName}</span>
        ),
    },
    {
        accessorKey: 'isActive',
        header: () => <span className="text-[13px] font-bold uppercase tracking-[0.03em] text-slate-700">Status</span>,
        cell: ({ row }) => {
            const active = row.original.isActive;
            return (
                <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5 bg-slate-100 text-slate-700 border-slate-200">
                    {active ? 'Active' : 'Inactive'}
                </Badge>
            );
        },
    },
    {
        id: 'actions',
        header: () => <span className="flex justify-end pr-2 text-[13px] font-bold uppercase tracking-[0.03em] text-slate-700">Actions</span>,
        cell: ({ row }) => (
            <div className="flex items-center justify-end gap-4 pr-1 whitespace-nowrap">
                <button
                    type="button"
                    title="View Doctor"
                    className="text-sm font-semibold text-[#0EA5E9] hover:text-[#0c96d4] transition-all hover:underline"
                    onClick={() => onView(row.original)}
                >
                    View
                </button>
                <button
                    type="button"
                    title="Edit Doctor"
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
