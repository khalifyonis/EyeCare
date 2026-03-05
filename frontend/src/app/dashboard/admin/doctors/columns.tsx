import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DoctorColumnsProps {
    onEdit: (doctor: any) => void;
    onDelete: (id: string) => void;
}

export const getDoctorColumns = ({ onEdit, onDelete }: DoctorColumnsProps): ColumnDef<any>[] => [
    {
        accessorKey: 'fullName',
        header: 'Doctor Name',
        cell: ({ row }) => {
            const user = row.original;
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
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
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-[#0EA5E9] text-xs font-bold">
                            {user.fullName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-900 dark:text-white truncate">{user.fullName}</span>
                        <span className="text-xs text-muted-foreground">@{user.username?.toLowerCase()}</span>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: 'specialization',
        header: 'Specialization',
        cell: ({ row }) => (
            <span className="text-sm text-slate-600 dark:text-slate-400">{row.original.specialization}</span>
        ),
    },
    {
        accessorKey: 'licenseNumber',
        header: 'License No.',
        cell: ({ row }) => (
            <span className="text-sm font-mono text-slate-600 dark:text-slate-400">{row.original.licenseNumber}</span>
        ),
    },
    {
        accessorKey: 'branchName',
        header: 'Branch',
        cell: ({ row }) => (
            <span className="text-sm text-slate-600 dark:text-slate-400">{row.original.branchName}</span>
        ),
    },
    {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => {
            const active = row.original.isActive;
            return (
                <Badge variant="outline" className={`text-[11px] font-semibold px-2.5 py-0.5 ${active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                    {active ? 'Active' : 'Inactive'}
                </Badge>
            );
        },
    },
    {
        id: 'actions',
        header: () => <span className="flex justify-end pr-2">Actions</span>,
        cell: ({ row }) => (
            <div className="flex items-center justify-end gap-1 pr-1">
                <Button
                    variant="ghost"
                    size="icon"
                    title="Edit Doctor"
                    className="h-8 w-8 bg-blue-50 dark:bg-blue-950/30 text-[#0EA5E9] hover:bg-blue-100 hover:text-[#0c96d4] transition-all rounded-lg"
                    onClick={() => onEdit(row.original)}
                >
                    <Pencil className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    title="Delete Doctor"
                    className="h-8 w-8 bg-red-50 dark:bg-red-950/30 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all rounded-lg"
                    onClick={() => onDelete(row.original.id)}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        ),
    },
];
