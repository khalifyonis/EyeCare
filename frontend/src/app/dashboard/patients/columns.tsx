import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Phone, Calendar, ArrowUpDown, Pencil, Trash2, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export interface PatientColumnsProps {
    onEdit: (patient: any) => void;
    onDelete: (id: string) => void;
    onBook: (patient: any) => void;
}

export const getPatientColumns = ({ onEdit, onDelete, onBook }: PatientColumnsProps): ColumnDef<any>[] => [
    {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => (
            <span className="text-[12px] font-bold text-slate-500 font-mono tracking-tight py-2 block">
                #{String(row.original.id).slice(0, 8)}
            </span>
        ),
    },
    {
        accessorKey: 'fullName',
        header: 'Patient Name',
        cell: ({ row }) => {
            const p = row.original;
            const fullName = p.fullName || '';
            const initial = fullName.charAt(0).toUpperCase();
            return (
                <Link href={`/dashboard/patients/${p.id}`} className="flex items-center gap-3.5 py-1.5 group cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 -ml-2 pl-2 rounded-xl transition-all">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-black bg-[#0EA5E9]/10 text-[#0EA5E9] transition-transform group-hover:scale-105 group-hover:bg-[#0EA5E9] group-hover:text-white shadow-sm shadow-blue-500/0 group-hover:shadow-blue-500/20">
                        {initial}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-[13px] text-slate-900 dark:text-white leading-tight truncate group-hover:text-[#0EA5E9] transition-colors">{fullName}</span>
                        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">{p.gender?.toLowerCase() || '—'}</span>
                    </div>
                </Link>
            );
        },
    },
    {
        header: 'Contact',
        cell: ({ row }) => (
            <div className="flex flex-col gap-0.5 py-1.5">
                <div className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                    {row.original.phone}
                </div>
                {row.original.email && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[180px] italic lowercase">{row.original.email}</span>
                )}
            </div>
        ),
    },
    {
        header: 'Birth Date',
        cell: ({ row }) => (
            <div className="text-[12px] font-bold text-slate-600 dark:text-slate-400 py-1.5 uppercase tracking-wider">
                {row.original.dateOfBirth ? new Date(row.original.dateOfBirth).toLocaleDateString() : 'N/A'}
            </div>
        ),
    },
    {
        header: 'Branch',
        cell: ({ row }) => (
            <span className="inline-flex items-center text-[12px] font-bold text-slate-600 dark:text-slate-400 py-1.5 uppercase tracking-tight">
                {row.original.branch?.branchName || 'N/A'}
            </span>
        ),
    },
    {
        id: 'actions',
        header: () => <span className="flex justify-end pr-2 uppercase text-[11px] font-bold text-slate-500 tracking-wider">Actions</span>,
        cell: ({ row }) => {
            const [user, setUser] = React.useState<any>(null);

            React.useEffect(() => {
                const storedUser = localStorage.getItem('user');
                if (storedUser) setUser(JSON.parse(storedUser));
            }, []);

            const role = user?.roleName?.toUpperCase() || user?.role?.toUpperCase();
            const canManage = role === 'ADMIN' || role === 'SUPERADMIN' || role === 'RECEPTIONIST';

            return (
                <div className="flex items-center justify-end gap-1 px-1">
                    {canManage && (
                        <Button
                            variant="ghost"
                            size="icon"
                            title="Book Appointment"
                            className="h-8 w-8 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 transition-all active:scale-90 rounded-lg shadow-sm shadow-emerald-200/50"
                            onClick={() => onBook(row.original)}
                        >
                            <CalendarPlus className="w-4 h-4" />
                        </Button>
                    )}
                    {canManage && (
                        <Button
                            variant="ghost"
                            size="icon"
                            title="Edit Patient"
                            className="h-8 w-8 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-all active:scale-90 rounded-lg shadow-sm shadow-blue-200/50"
                            onClick={() => onEdit(row.original)}
                        >
                            <Pencil className="w-4 h-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Delete Patient"
                        className="h-8 w-8 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all active:scale-90 rounded-lg shadow-sm shadow-red-200/50"
                        onClick={() => onDelete(row.original.id)}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            );
        },
    },
];

