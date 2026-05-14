'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreVertical, Pencil, Trash2, CalendarPlus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface PatientRow {
    id: string;
    patientNumber?: string | null;
    fullName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    gender?: string | null;
    phone?: string | null;
    email?: string | null;
    dateOfBirth?: string | null;
    createdAt?: string;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    address?: string | null;
    bloodGroup?: string | null;
    allergies?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    assignedDoctorId?: string | null;
    assignedDoctor?: { user?: { fullName?: string | null } | null } | null;
    branch?: { branchName?: string | null } | null;
}

export interface PatientColumnsProps {
    onView: (patient: PatientRow) => void;
    onEdit: (patient: PatientRow) => void;
    onDelete: (id: string) => void;
    onBook: (patient: PatientRow) => void;
    canManage: boolean;
}

const AVATAR_STYLE = 'bg-slate-100 text-slate-600 border border-slate-200';

export const getPatientColumns = ({
    onView,
    onEdit,
    onDelete,
    onBook,
    canManage,
}: PatientColumnsProps): ColumnDef<PatientRow>[] => {
    const base: ColumnDef<PatientRow>[] = [
        {
            id: 'patient',
            header: 'PATIENT',
            cell: ({ row }) => {
                const p = row.original;
                const name = p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unknown';
                const pid = p.patientNumber || `PAT-${p.id.slice(0, 5).toUpperCase()}`;
                return (
                    <button type="button" onClick={() => onView(p)} className="flex items-center gap-3 group text-left">
                        <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${AVATAR_STYLE}`}>
                            <User className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-900 dark:text-white leading-tight group-hover:text-[#0EA5E9] transition-colors">
                                {name}
                            </span>
                            <span className="text-[12px] text-slate-500 mt-0.5 tracking-tight">ID: {pid}</span>
                        </div>
                    </button>
                );
            },
        },
        {
            id: 'contact',
            header: 'CONTACT',
            cell: ({ row }) => {
                const p = row.original;
                return (
                    <div className="flex flex-col gap-0.5">
                        {p.email && (
                            <span className="text-sm text-slate-700 dark:text-slate-300 leading-tight truncate max-w-[200px]">
                                {p.email}
                            </span>
                        )}
                        <span className="text-sm text-slate-500">{p.phone || '—'}</span>
                    </div>
                );
            },
        },
        {
            id: 'gender',
            header: 'GENDER',
            cell: ({ row }) => (
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {row.original.gender || '—'}
                </span>
            ),
        },
        {
            id: 'registrationDate',
            header: 'REGISTRATION DATE',
            cell: ({ row }) => {
                const d = row.original.createdAt;
                if (!d) return <span className="text-slate-400 text-xs">—</span>;
                return (
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                        {new Date(d).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                    </span>
                );
            },
        },
        {
            id: 'address',
            header: 'ADDRESS',
            cell: ({ row }) => {
                const p = row.original;
                const addr = [p.address, p.city, p.state].filter(Boolean).join(', ');
                return (
                    <span className={`text-sm ${addr ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}`}>
                        {addr || 'No address provided'}
                    </span>
                );
            },
        },
    ];

    const actionsCol: ColumnDef<PatientRow> = {
        id: 'actions',
        header: 'ACTIONS',
        cell: ({ row }) => {
            const p = row.original;
            return (
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => onView(p)}
                        className="text-sm font-semibold text-[#0EA5E9] hover:text-[#0c96d4] hover:underline transition-all"
                    >
                        View
                    </button>
                    {canManage && (
                        <>
                            <button
                                onClick={() => onEdit(p)}
                                className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-all hover:underline"
                            >
                                Edit
                            </button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuItem onClick={() => onBook(p)} className="gap-2 text-[12px]">
                                        <CalendarPlus className="h-3.5 w-3.5 text-emerald-500" />
                                        Book Appointment
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onEdit(p)} className="gap-2 text-[12px]">
                                        <Pencil className="h-3.5 w-3.5 text-[#0EA5E9]" />
                                        Edit Patient
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => onDelete(p.id)}
                                        className="gap-2 text-[12px] text-red-600 focus:text-red-600"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    )}
                </div>
            );
        },
    };

    return [...base, actionsCol];
};
