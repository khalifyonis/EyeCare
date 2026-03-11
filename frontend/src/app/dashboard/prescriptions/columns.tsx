import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';

export interface PrescriptionColumnsProps {
	canManage: boolean;
	onEdit: (row: PrescriptionRow) => void;
	onDelete: (id: string) => void;
}

export interface PrescriptionRow {
	id: string;
	examId: string;
	appointmentId: string;
	itemType: 'PHARMACY' | 'OPTICAL' | string;
	itemId?: string | null;
	_itemName?: string | null;
	quantity: number;
	instructions?: string | null;
	createdAt: string;
	appointment?: {
		id: string;
		bookingNumber?: string | null;
		patient?: { id: string; fullName?: string | null; phone?: string | null } | null;
	} | null;
	clinicalExam?: {
		diagnosis?: string | null;
		examinedBy?: { user?: { fullName?: string | null } | null } | null;
	} | null;
}

export const getPrescriptionColumns = ({ canManage, onEdit, onDelete }: PrescriptionColumnsProps): ColumnDef<PrescriptionRow>[] => {
	const baseColumns: ColumnDef<PrescriptionRow>[] = [
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
							<span className="text-xs text-slate-500">{patient.phone || 'N/A'}</span>
						</div>
					</Link>
				);
			},
		},
		{
			accessorKey: 'itemType',
			header: 'Type',
			cell: ({ row }) => {
				const type = row.original.itemType || 'PHARMACY';
				const isOptical = type === 'OPTICAL';
				return (
					<StatusPill variant={isOptical ? 'info' : 'success'}>
						{type}
					</StatusPill>
				);
			},
		},
		{
			accessorKey: '_itemName',
			header: 'Item',
			cell: ({ row }) => {
				const name = row.original._itemName;
				return (
					<span className="max-w-[200px] truncate block" title={name || ''}>
						{name || <span className="text-slate-400 italic">No item linked</span>}
					</span>
				);
			},
		},
		{
			accessorKey: 'quantity',
			header: 'Qty',
			cell: ({ row }) => (
				<span>{row.original.quantity}</span>
			),
		},
		{
			accessorKey: 'instructions',
			header: 'Instructions',
			cell: ({ row }) => (
				<span className="max-w-[220px] truncate block" title={row.original.instructions || ''}>
					{row.original.instructions || '—'}
				</span>
			),
		},
		{
			accessorKey: 'createdAt',
			header: 'Created',
			cell: ({ row }) => {
				const dt = row.original.createdAt;
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
				</div>
			),
		},
	];
};
