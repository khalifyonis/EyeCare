'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreVertical, Eye, Pencil, Trash2, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

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
    isActive?: boolean;
    createdAt?: string;
    city?: string | null;
    state?: string | null;
    bloodGroup?: string | null;
    allergies?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    assignedDoctorId?: string | null;
    assignedDoctor?: { user?: { fullName?: string | null } | null } | null;
    branch?: { branchName?: string | null } | null;
}

export interface PatientColumnsProps {
    onEdit: (patient: PatientRow) => void;
    onDelete: (id: string) => void;
    onBook: (patient: PatientRow) => void;
    canManage: boolean;
}

const AVATAR_COLORS = [
    'bg-sky-100 text-sky-700',
    'bg-violet-100 text-violet-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-indigo-100 text-indigo-700',
];

function avatarColor(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export const getPatientColumns = ({
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
                const initials = name.split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase();
                const color = avatarColor(name);
                const pid = p.patientNumber || `PAT-${p.id.slice(0, 5).toUpperCase()}`;
                return (
                    <Link href={`/dashboard/patients/${p.id}`} className="flex items-center gap-3 group">
                        <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${color} group-hover:ring-2 ring-sky-300 transition-all`}>
                            {initials}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-[#0EA5E9] transition-colors leading-tight">
                                {name}
                            </span>
                            <span className="text-[12px] text-slate-400 font-medium mt-0.5 tracking-tight">ID: {pid}</span>
                        </div>
                    </Link>
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
                            <span className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-tight truncate max-w-[200px]">
                                {p.email}
                            </span>
                        )}
                        <span className="text-sm text-slate-500 font-medium">{p.phone || '—'}</span>
                    </div>
                );
            },
        },
        {
            id: 'status',
            header: 'STATUS',
            cell: ({ row }) => {
                const active = row.original.isActive !== false;
                return (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                        active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                        <span className={`size-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {active ? 'Active' : 'Inactive'}
                    </span>
                );
            },
        },
        {
            id: 'registrationDate',
            header: 'REGISTRATION DATE',
            cell: ({ row }) => {
                const d = row.original.createdAt;
                if (!d) return <span className="text-slate-400 text-xs">—</span>;
                return (
                    <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                        {new Date(d).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                    </span>
                );
            },
        },
        {
            id: 'assignedDoctor',
            header: 'ASSIGNED DOCTOR',
            cell: ({ row }) => {
                const doc = row.original.assignedDoctor?.user?.fullName;
                return (
                    <span className={`text-sm font-medium ${doc ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}`}>
                        {doc || 'No'}
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
                    <Link
                        href={`/dashboard/patients/${p.id}`}
                        className="text-sm font-semibold text-[#0EA5E9] hover:text-[#0c96d4] hover:underline transition-all"
                    >
                        View
                    </Link>
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
