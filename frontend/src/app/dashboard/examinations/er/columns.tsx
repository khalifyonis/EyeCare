import * as React from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { FileText, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

export interface ERExaminationColumnsProps {
	canManage: boolean;
	canOpenClinical: boolean;
	onEdit: (row: ERExaminationRow) => void;
	onDelete: (id: string) => void;
	onOpenClinical: (appointmentId: string) => void;
}

export type AppointmentStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | string;

export interface ERExaminationRow {
	id: string;
	appointmentId: string;
	vaRight?: string | null;
	vaLeft?: string | null;
	phRight?: string | null;
	phLeft?: string | null;
	iopRight?: number | null;
	iopLeft?: number | null;
	notes?: string | null;
	createdAt: string;
	recordedBy?: { fullName?: string | null } | null;
	appointment?: {
		id: string;
		bookingNumber?: string | null;
		appointmentDate?: string;
		status?: AppointmentStatus;
		patient?: { id: string; fullName?: string | null; phone?: string | null } | null;
		doctor?: { user?: { fullName?: string | null } | null } | null;
	} | null;
}

function statusPill(status: string) {
	const colors: Record<string, string> = {
		COMPLETED:
			'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
		PENDING:
			'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
		CANCELLED:
			'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800/50',
	};
	const style = colors[status] || colors.PENDING;
	return (
		<div
			className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${style}`}
		>
			{status || 'PENDING'}
		</div>
	);
}

export const getERExaminationColumns = ({
	canManage,
	canOpenClinical,
	onEdit,
	onDelete,
	onOpenClinical,
}: ERExaminationColumnsProps): ColumnDef<ERExaminationRow>[] => [
	{
		accessorKey: 'appointment.bookingNumber',
		header: 'Booking #',
		cell: ({ row }) => (
			<span className="text-[12px] font-black text-[#0EA5E9] font-mono tracking-tight py-2 block">
				{row.original.appointment?.bookingNumber || 'N/A'}
			</span>
		),
	},
	{
		accessorKey: 'appointment.patient.fullName',
		header: 'Patient',
		cell: ({ row }) => {
			const patient = row.original.appointment?.patient;
			if (!patient) return <span className="text-xs text-slate-400">Unknown Patient</span>;
			const fullName = patient.fullName || 'Unknown';
			const initial = fullName.charAt(0).toUpperCase();
			return (
				<Link
					href={`/dashboard/patients/${patient.id}`}
					className="flex items-center gap-3.5 py-1.5 group cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 -ml-2 pl-2 rounded-xl transition-all"
				>
					<div className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-black bg-[#0EA5E9]/10 text-[#0EA5E9] transition-transform group-hover:scale-105 group-hover:bg-[#0EA5E9] group-hover:text-white shadow-sm shadow-blue-500/0 group-hover:shadow-blue-500/20">
						{initial}
					</div>
					<div className="flex flex-col min-w-0">
						<span className="font-bold text-[13px] text-slate-900 dark:text-white leading-tight truncate group-hover:text-[#0EA5E9] transition-colors">
							{fullName}
						</span>
						<span className="text-[11px] font-medium text-slate-500 truncate">{patient.phone || '—'}</span>
					</div>
				</Link>
			);
		},
	},
	{
		accessorKey: 'appointment.appointmentDate',
		header: 'Date & Time',
		cell: ({ row }) => {
			const dt = row.original.appointment?.appointmentDate;
			if (!dt) return 'N/A';
			const dateObj = new Date(dt);
			const dateFormatted = new Intl.DateTimeFormat('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
			}).format(dateObj);
			const timeFormatted = new Intl.DateTimeFormat('en-US', {
				hour: '2-digit',
				minute: '2-digit',
			}).format(dateObj);
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
			<div className="text-[12px] font-medium text-slate-600 dark:text-slate-400 py-1.5 uppercase tracking-tight">
				Dr. {row.original.appointment?.doctor?.user?.fullName || 'Unknown'}
			</div>
		),
	},
	{
		header: 'Status',
		cell: ({ row }) => statusPill(row.original.appointment?.status || 'PENDING'),
	},
	{
		header: 'VA / IOP',
		cell: ({ row }) => (
			<div className="text-[12px] text-slate-600 dark:text-slate-300 py-1.5 leading-tight">
				<div>
					VA R/L: {row.original.vaRight || '-'} / {row.original.vaLeft || '-'}
				</div>
				<div>
					IOP R/L: {row.original.iopRight ?? '-'} / {row.original.iopLeft ?? '-'}
				</div>
			</div>
		),
	},
	{
		accessorKey: 'notes',
		header: 'Notes',
		cell: ({ row }) => {
			const notes = row.original.notes || '';
			return (
				<div
					className="text-[12px] font-medium text-slate-600 dark:text-slate-300 py-1.5 max-w-[260px] truncate"
					title={notes}
				>
					{notes || '—'}
				</div>
			);
		},
	},
	{
		header: 'Recorded By',
		cell: ({ row }) => (
			<div className="text-[12px] font-medium text-slate-600 dark:text-slate-300 py-1.5">
				{row.original.recordedBy?.fullName || 'Unknown'}
			</div>
		),
	},
	{
		id: 'actions',
		header: () => (
			<span className="flex justify-end pr-2 uppercase text-[11px] font-bold text-slate-500 tracking-wider">
				Actions
			</span>
		),
		cell: ({ row }) => (
			<div className="flex items-center justify-end gap-1 px-1">
				{canManage && (
					<>
						{canOpenClinical && (
							<Button
								variant="ghost"
								size="icon"
								title="Open clinical examination"
								className="h-8 w-8 bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700 transition-all active:scale-90 rounded-lg shadow-sm shadow-purple-200/50"
								onClick={() => onOpenClinical(row.original.appointmentId)}
							>
								<FileText className="w-4 h-4" />
							</Button>
						)}
						<Button
							variant="ghost"
							size="icon"
							title="Edit ER examination"
							className="h-8 w-8 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-all active:scale-90 rounded-lg shadow-sm shadow-blue-200/50"
							onClick={() => onEdit(row.original)}
						>
							<Pencil className="w-4 h-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							title="Delete ER examination"
							className="h-8 w-8 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all active:scale-90 rounded-lg shadow-sm shadow-red-200/50"
							onClick={() => onDelete(row.original.id)}
						>
							<Trash2 className="w-4 h-4" />
						</Button>
					</>
				)}
			</div>
		),
	},
];
