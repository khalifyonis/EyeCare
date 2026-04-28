import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

export interface PrescriptionColumnsProps {
	canManage: boolean;
	onEdit: (row: PrescriptionRow) => void;
	onDelete: (id: string) => void;
}

export interface PrescriptionRow {
	id: string;
	appointmentId?: string | null;
	itemType: 'PHARMACY' | 'OPTICAL' | string;
	itemId?: string | null;
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
	eyeExam?: {
		id?: string | null;
		diagnosis?: string | null;
		patient?: { id: string; fullName?: string | null; phone?: string | null } | null;
		doctor?: { user?: { fullName?: string | null } | null } | null;
	} | null;
}

export const getPrescriptionColumns = ({ canManage, onEdit, onDelete }: PrescriptionColumnsProps): ColumnDef<PrescriptionRow>[] => {
	const baseColumns: ColumnDef<PrescriptionRow>[] = [
		{
			accessorKey: 'appointment.bookingNumber',
			header: 'Source',
			cell: ({ row }) => (
				<span className="text-[12px] font-black text-[#0EA5E9] font-mono tracking-tight py-2 block">
					{row.original.appointment?.bookingNumber || row.original.eyeExam?.id || 'N/A'}
				</span>
			),
		},
		{
			accessorKey: 'appointment.patient.fullName',
			header: 'Patient',
			cell: ({ row }) => {
				const patient = row.original.appointment?.patient || row.original.eyeExam?.patient;
				if (!patient) return <span className="text-xs text-slate-400">Unknown Patient</span>;

				const fullName = patient.fullName || 'Unknown';
				const initial = fullName.charAt(0).toUpperCase();

				return (
					<Link
						href={`/dashboard/patients?view=${patient.id}`}
						className="flex items-center gap-3.5 py-1.5 group cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 -ml-2 pl-2 rounded-xl transition-all"
					>
						<div className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-black bg-[#0EA5E9]/10 text-[#0EA5E9] transition-transform group-hover:scale-105 group-hover:bg-[#0EA5E9] group-hover:text-white shadow-sm shadow-blue-500/0 group-hover:shadow-blue-500/20">
							{initial}
						</div>
						<div className="flex flex-col min-w-0">
							<span className="font-bold text-[13px] text-slate-900 dark:text-white leading-tight truncate group-hover:text-[#0EA5E9] transition-colors">{fullName}</span>
							<span className="text-[11px] font-medium text-slate-500 truncate">{patient.phone || 'N/A'}</span>
						</div>
					</Link>
				);
			},
		},
		{
			accessorKey: 'itemType',
			header: 'Type',
			cell: ({ row }) => (
				<span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
					row.original.itemType === 'OPTICAL'
						? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50'
						: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
				}`}>
					{row.original.itemType || 'PHARMACY'}
				</span>
			),
		},
		{
			accessorKey: 'itemId',
			header: 'Item ID',
			cell: ({ row }) => (
				<span className="text-[12px] font-medium text-slate-600 dark:text-slate-300 py-1.5 block">
					{row.original.itemId || 'N/A'}
				</span>
			),
		},
		{
			accessorKey: 'quantity',
			header: 'Qty',
			cell: ({ row }) => (
				<span className="text-[12px] font-black text-slate-700 dark:text-slate-200 py-1.5 block">
					{row.original.quantity}
				</span>
			),
		},
		{
			accessorKey: 'instructions',
			header: 'Instructions',
			cell: ({ row }) => {
				const text = row.original.instructions || '';
				return (
					<div className="text-[12px] font-medium text-slate-600 dark:text-slate-300 py-1.5 max-w-[220px] truncate" title={text}>
						{text || '—'}
					</div>
				);
			},
		},
		{
			accessorKey: 'createdAt',
			header: 'Created',
			cell: ({ row }) => {
				const dt = row.original.createdAt;
				if (!dt) return 'N/A';
				const dateObj = new Date(dt);
				return (
					<div className="flex flex-col gap-0.5 py-1.5">
						<div className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">
							{new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(dateObj)}
						</div>
						<div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
							{new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(dateObj)}
						</div>
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
			header: () => <span className="flex justify-end pr-2 uppercase text-[11px] font-bold text-slate-500 tracking-wider">Actions</span>,
			cell: ({ row }) => (
				<div className="flex items-center justify-end gap-1 px-1">
					<Button
						variant="ghost"
						size="icon"
						title="Edit prescription"
						className="h-8 w-8 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-all active:scale-90 rounded-lg shadow-sm shadow-blue-200/50"
						onClick={() => onEdit(row.original)}
					>
						<Pencil className="w-4 h-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						title="Delete prescription"
						className="h-8 w-8 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all active:scale-90 rounded-lg shadow-sm shadow-red-200/50"
						onClick={() => onDelete(row.original.id)}
					>
						<Trash2 className="w-4 h-4" />
					</Button>
				</div>
			),
		},
	];
};
