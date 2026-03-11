import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export interface PatientRow {
    id: string;
    fullName?: string | null;
    gender?: string | null;
    phone?: string | null;
    email?: string | null;
    dateOfBirth?: string | null;
    createdAt?: string;
    isActive?: boolean;
    branch?: { branchName?: string | null } | null;
}

export interface PatientColumnsProps {
    onEdit: (patient: PatientRow) => void;
    onDelete: (id: string) => void;
    onBook: (patient: PatientRow) => void;
    canManage: boolean;
}

export const getPatientColumns = ({ onEdit, onDelete, onBook, canManage }: PatientColumnsProps): ColumnDef<PatientRow>[] => {
    const baseColumns: ColumnDef<PatientRow>[] = [
    {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => (
            <span className="font-mono text-slate-500">
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
                <Link href={`/dashboard/patients/${p.id}`} className="flex items-center gap-3 group">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium bg-[#0EA5E9]/10 text-[#0EA5E9] group-hover:bg-[#0EA5E9] group-hover:text-white transition-colors">
                        {initial}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="truncate group-hover:text-[#0EA5E9] transition-colors">{fullName}</span>
                        <span className="text-xs text-slate-500 capitalize">{p.gender?.toLowerCase() || '—'}</span>
                    </div>
                </Link>
            );
        },
    },
    {
        header: 'Contact',
        cell: ({ row }) => (
            <div className="flex flex-col">
                <span>{row.original.phone || '—'}</span>
                {row.original.email && (
                    <span className="text-xs text-slate-500 truncate max-w-[200px]">{row.original.email}</span>
                )}
            </div>
        ),
    },
    {
        header: 'Birth Date',
        cell: ({ row }) => (
            <span>
                {row.original.dateOfBirth ? new Date(row.original.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
            </span>
        ),
    },
    {
        header: 'Branch',
        cell: ({ row }) => (
            <span>{row.original.branch?.branchName || 'N/A'}</span>
        ),
    },
    ];

    if (!canManage) return baseColumns;

    return [
        ...baseColumns,
    {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    title="Book Appointment"
                    className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10 rounded-lg"
                    onClick={() => onBook(row.original)}
                >
                    <CalendarPlus className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    title="Edit Patient"
                    className="h-8 w-8 text-[#0EA5E9] hover:bg-[#0EA5E9]/10 rounded-lg"
                    onClick={() => onEdit(row.original)}
                >
                    <Pencil className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    title="Delete Patient"
                    className="h-8 w-8 text-red-500 hover:bg-red-500/10 rounded-lg"
                    onClick={() => onDelete(row.original.id)}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        ),
    },
    ];
};
