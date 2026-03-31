import * as React from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { FileText, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StatusPill, statusToVariant } from '@/components/ui/status-pill';

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
			<span className="font-mono text-[#0EA5E9]">
				{row.original.appointment?.bookingNumber || 'N/A'}
			</span>
		),
	},
	{
		accessorKey: 'appointment.patient.fullName',
		header: 'Patient',
		cell: ({ row }) => {
			const patient = row.original.appointment?.patient;
			if (!patient) return <span className="text-slate-400">Unknown</span>;
			const fullName = patient.fullName || 'Unknown';
			const initial = fullName.charAt(0).toUpperCase();
			return (
				<Link href={`/dashboard/patients/${patient.id}`} className="flex items-center gap-3 group">
					<div className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium bg-[#0EA5E9]/10 text-[#0EA5E9] group-hover:bg-[#0EA5E9] group-hover:text-white transition-colors">
						{initial}
					</div>
					<div className="flex flex-col min-w-0">
						<span className="truncate group-hover:text-[#0EA5E9] transition-colors">{fullName}</span>
						<span className="text-xs text-slate-500">{patient.phone || '—'}</span>
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
			const dateStr = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(dateObj);
			const timeStr = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(dateObj);
			return (
				<div className="flex flex-col">
					<span>{dateStr}</span>
					<span className="text-xs text-slate-500">{timeStr}</span>
				</div>
			);
		},
	},
	{
		header: 'Doctor',
		cell: ({ row }) => (
			<span>Dr. {row.original.appointment?.doctor?.user?.fullName || 'Unknown'}</span>
		),
	},
	{
		header: 'Status',
		cell: ({ row }) => {
			const status = row.original.appointment?.status || 'PENDING';
			return <StatusPill variant={statusToVariant(status)}>{status}</StatusPill>;
		},
	},
	{
		header: 'VA / IOP',
		cell: ({ row }) => (
			<div className="leading-relaxed">
				<div>VA R/L: {row.original.vaRight || '-'} / {row.original.vaLeft || '-'}</div>
				<div>IOP R/L: {row.original.iopRight ?? '-'} / {row.original.iopLeft ?? '-'}</div>
			</div>
		),
	},
	{
		accessorKey: 'notes',
		header: 'Notes',
		cell: ({ row }) => (
			<span className="max-w-[160px] truncate block" title={row.original.notes || ''}>
				{row.original.notes || '—'}
			</span>
		),
	},
	{
		id: 'actions',
		header: 'Actions',
		cell: ({ row }) => (
			<div className="flex items-center gap-1">
				{canManage && (
					<>
						{canOpenClinical && (
							<Button
								variant="ghost"
								size="icon"
								title="Open clinical examination"
								className="h-8 w-8 text-purple-600 hover:bg-purple-500/10 rounded-lg"
								onClick={() => onOpenClinical(row.original.appointmentId)}
							>
								<FileText className="w-4 h-4" />
							</Button>
						)}
						<Button
							variant="ghost"
							size="icon"
							title="Edit"
							className="h-8 w-8 text-[#0EA5E9] hover:bg-[#0EA5E9]/10 rounded-lg"
							onClick={() => onEdit(row.original)}
						>
							<Pencil className="w-4 h-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							title="Delete"
							className="h-8 w-8 text-red-500 hover:bg-red-500/10 rounded-lg"
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
