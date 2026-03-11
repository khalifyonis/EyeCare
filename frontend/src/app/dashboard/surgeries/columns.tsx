import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StatusPill, statusToVariant } from '@/components/ui/status-pill';

export interface SurgeryColumnsProps {
	canManage: boolean;
	onEdit: (row: SurgeryRow) => void;
	onDelete: (id: string) => void;
}

export type SurgeryStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | (string & {});

export interface SurgeryRow {
	id: string;
	examId: string;
	eyeSide: 'RIGHT' | 'LEFT' | 'BOTH' | string;
	surgeryType: string;
	surgeryDate: string;
	cost: number | string;
	status?: SurgeryStatus | null;
	notes?: string | null;
	surgeon?: { id?: string; user?: { fullName?: string | null } | null } | null;
	clinicalExam?: {
		appointment?: {
			bookingNumber?: string | null;
			appointmentDate?: string | null;
			patient?: { id: string; fullName?: string | null; phone?: string | null } | null;
		} | null;
	} | null;
}

function money(v: number | string | null | undefined) {
	const n = typeof v === 'number' ? v : Number(v ?? 0);
	return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

export const getSurgeryColumns = ({ canManage, onEdit, onDelete }: SurgeryColumnsProps): ColumnDef<SurgeryRow>[] => [
	{
		accessorKey: 'clinicalExam.appointment.bookingNumber',
		header: 'Booking #',
		cell: ({ row }) => (
			<span className="font-mono text-[#0EA5E9]">
				{row.original.clinicalExam?.appointment?.bookingNumber || 'N/A'}
			</span>
		),
	},
	{
		accessorKey: 'clinicalExam.appointment.patient.fullName',
		header: 'Patient',
		cell: ({ row }) => {
			const patient = row.original.clinicalExam?.appointment?.patient;
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
						<span className="text-xs text-slate-500">{patient.phone || 'N/A'}</span>
					</div>
				</Link>
			);
		},
	},
	{
		accessorKey: 'surgeryType',
		header: 'Surgery',
		cell: ({ row }) => (
			<div className="flex flex-col">
				<span>{row.original.surgeryType || 'N/A'}</span>
				<span className="text-xs text-slate-500">{row.original.eyeSide || 'N/A'}</span>
			</div>
		),
	},
	{
		accessorKey: 'surgeryDate',
		header: 'Date & Time',
		cell: ({ row }) => {
			const dt = row.original.surgeryDate;
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
		header: 'Surgeon',
		cell: ({ row }) => (
			<span>Dr. {row.original.surgeon?.user?.fullName || 'Unknown'}</span>
		),
	},
	{
		header: 'Cost',
		cell: ({ row }) => (
			<span className="tabular-nums">${money(row.original.cost)}</span>
		),
	},
	{
		header: 'Status',
		cell: ({ row }) => {
			const status = row.original.status || 'PENDING';
			return <StatusPill variant={statusToVariant(status)}>{status}</StatusPill>;
		},
	},
	{
		id: 'actions',
		header: 'Actions',
		cell: ({ row }) => (
			<div className="flex items-center gap-1">
				{canManage && (
					<>
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
