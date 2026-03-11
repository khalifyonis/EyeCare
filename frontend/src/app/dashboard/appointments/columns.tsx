import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2, DollarSign, MoreVertical } from 'lucide-react';
import { StatusPill, statusToVariant } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type AppointmentStatus = 'COMPLETED' | 'PENDING' | 'CANCELLED' | (string & {});

export interface AppointmentRow {
	id: string;
	bookingNumber?: string | null;
	appointmentDate?: string | null;
	amount?: number | string | null;
	status?: AppointmentStatus | null;
	doctorId?: string | null;
	patient?: {
		id: string;
		fullName?: string | null;
		phone?: string | null;
	} | null;
	doctor?: {
		id?: string | null;
		userId?: string | null;
		fullName?: string | null;
		user?: {
			fullName?: string | null;
		} | null;
	} | null;
}

export interface AppointmentColumnsProps {
	onEdit: (appointment: AppointmentRow) => void;
	onDelete: (id: string) => void;
	canManage: boolean;
	canRecordER: boolean;
	canRecordClinical: boolean;
	onOpenER: (appointmentId: string) => void;
	onOpenClinical: (appointmentId: string) => void;
}

export const getAppointmentColumns = ({
	onEdit,
	onDelete,
	canManage,
	canRecordER,
	canRecordClinical,
	onOpenER,
	onOpenClinical,
}: AppointmentColumnsProps): ColumnDef<AppointmentRow>[] => [
	{
		accessorKey: 'bookingNumber',
		header: 'Booking #',
		cell: ({ row }) => (
			<span className="font-mono text-[#0EA5E9]">
				{row.original.bookingNumber || 'N/A'}
			</span>
		),
	},
	{
		accessorKey: 'patient',
		header: 'Patient',
		cell: ({ row }) => {
			const patient = row.original.patient;
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
						{patient.phone && <span className="text-xs text-slate-500">{patient.phone}</span>}
					</div>
				</Link>
			);
		},
	},
	{
		accessorKey: 'appointmentDate',
		header: 'Date & Time',
		cell: ({ row }) => {
			if (!row.original.appointmentDate) return 'N/A';
			const dateObj = new Date(row.original.appointmentDate);
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
			<span>Dr. {row.original.doctor?.user?.fullName || 'Unknown'}</span>
		),
	},
	{
		header: 'Amount',
		cell: ({ row }) => {
			const rawAmount = row.original.amount ?? 0;
			const amountNumber = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount);
			return (
				<span className="tabular-nums">
					${Number.isFinite(amountNumber) ? amountNumber.toFixed(2) : '0.00'}
				</span>
			);
		},
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
		cell: ({ row }) => {
			const appointmentId = row.original.id as string;
			const canRecordAny = canRecordER || canRecordClinical;

			return (
				<div className="flex items-center gap-1">
					{canRecordAny && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" title="Record examination" className="h-8 w-8">
									<MoreVertical className="w-4 h-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" sideOffset={6} className="w-44 p-2">
								{canRecordER && (
									<DropdownMenuItem
										onClick={() => onOpenER(appointmentId)}
										className="cursor-pointer rounded-md justify-center py-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90 focus:text-primary-foreground"
									>
										Record ER
									</DropdownMenuItem>
								)}
								{canRecordClinical && (
									<DropdownMenuItem
										onClick={() => onOpenClinical(appointmentId)}
										className="cursor-pointer mt-1 rounded-md justify-center py-2 text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:bg-secondary/80 focus:text-secondary-foreground"
									>
										Record Clinical
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
					{canManage && (
						<Button
							variant="ghost"
							size="icon"
							title="Edit"
							className="h-8 w-8 text-[#0EA5E9] hover:bg-[#0EA5E9]/10 rounded-lg"
							onClick={() => onEdit(row.original)}
						>
							<Pencil className="w-4 h-4" />
						</Button>
					)}
					{canManage && (
						<Button
							variant="ghost"
							size="icon"
							title="Delete"
							className="h-8 w-8 text-red-500 hover:bg-red-500/10 rounded-lg"
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
