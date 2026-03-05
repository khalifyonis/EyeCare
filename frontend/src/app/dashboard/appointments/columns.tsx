import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Phone, Calendar, ArrowUpDown, Pencil, Trash2, Clock, User, Activity, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export interface AppointmentColumnsProps {
    onEdit: (appointment: any) => void;
    onDelete: (id: string) => void;
}

export const getAppointmentColumns = ({ onEdit, onDelete }: AppointmentColumnsProps): ColumnDef<any>[] => [
    {
        accessorKey: 'bookingNumber',
        header: 'Booking #',
        cell: ({ row }) => (
            <span className="text-[12px] font-black text-[#0EA5E9] font-mono tracking-tight py-2 block">
                {row.original.bookingNumber || 'N/A'}
            </span>
        ),
    },
    {
        accessorKey: 'patient',
        header: 'Patient',
        cell: ({ row }) => {
            const apt = row.original;
            const p = apt.patient;
            if (!p) return <span className="text-xs text-slate-400">Unknown Patient</span>;

            const fullName = `${p.firstName} ${p.lastName}`;
            return (
                <Link href={`/dashboard/patients/${p.patientId}`} className="flex items-center gap-3.5 py-1.5 group cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 -ml-2 pl-2 rounded-xl transition-all">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-black bg-[#0EA5E9]/10 text-[#0EA5E9] transition-transform group-hover:scale-105 group-hover:bg-[#0EA5E9] group-hover:text-white shadow-sm shadow-blue-500/0 group-hover:shadow-blue-500/20">
                        {p.firstName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-[13px] text-slate-900 dark:text-white leading-tight truncate group-hover:text-[#0EA5E9] transition-colors">{p.firstName} {p.lastName}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-widest">#{p.patientId}</span>
                            <span className="text-[11px] font-medium text-slate-500">{p.phone}</span>
                        </div>
                    </div>
                </Link>
            );
        },
    },
    {
        accessorKey: 'appointmentDate',
        header: 'Date & Time',
        cell: ({ row }) => {
            const apt = row.original;
            if (!apt.appointmentDate) return 'N/A';

            const dateObj = new Date(apt.appointmentDate);
            const dateFormatted = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(dateObj);
            const timeFormatted = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(dateObj);

            return (
                <div className="flex flex-col gap-0.5 py-1.5">
                    <div className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                        {dateFormatted}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {timeFormatted}
                    </div>
                </div>
            );
        },
    },
    {
        header: 'Doctor',
        cell: ({ row }) => (
            <div className="flex items-center gap-2 py-1.5">
                <span className="text-[12px] font-medium text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                    Dr. {row.original.doctor?.user?.fullName || 'Unknown'}
                </span>
            </div>
        ),
    },
    {
        header: 'Amount',
        cell: ({ row }) => {
            const amount = row.original.amount || 0;
            return (
                <div className="flex items-center gap-1.5 py-1.5 font-black text-slate-700 dark:text-slate-300">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    ${parseFloat(amount).toFixed(2)}
                </div>
            );
        },
    },
    {
        header: 'Status',
        cell: ({ row }) => {
            const status = row.original.status || 'PENDING';
            const colors: any = {
                'COMPLETED': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
                'PENDING': 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
                'CANCELLED': 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800/50'
            };
            const currentStyle = colors[status] || colors['PENDING'];

            return (
                <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${currentStyle}`}>
                    {status}
                </div>
            );
        },
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
                            title="Edit Appointment"
                            className="h-8 w-8 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-all active:scale-90 rounded-lg shadow-sm shadow-blue-200/50"
                            onClick={() => onEdit(row.original)}
                        >
                            <Pencil className="w-4 h-4" />
                        </Button>
                    )}
                    {(canManage || role === 'DOCTOR') && (
                        <Button
                            variant="ghost"
                            size="icon"
                            title="Delete Appointment"
                            className="h-8 w-8 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all active:scale-90 rounded-lg shadow-sm shadow-red-200/50"
                            onClick={() => onDelete(row.original.id)}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            );
        },
    },
];
