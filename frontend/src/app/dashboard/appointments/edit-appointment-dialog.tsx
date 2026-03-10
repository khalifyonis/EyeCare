'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Pencil, User, Clock, CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { AppointmentRow } from './columns';

type DoctorOption = {
	doctorId: string;
	fullName: string;
	specialization?: string | null;
};

interface EditAppointmentDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	appointment: AppointmentRow | null;
	onSuccess: () => void;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
	if (!error || typeof error !== 'object') return fallback;
	const maybe = error as { response?: { data?: { message?: unknown } } };
	const msg = maybe.response?.data?.message;
	return typeof msg === 'string' && msg.trim().length > 0 ? msg : fallback;
}

export function EditAppointmentDialog({ open, onOpenChange, appointment, onSuccess }: EditAppointmentDialogProps) {
	const [saving, setSaving] = useState(false);
	const [doctors, setDoctors] = useState<DoctorOption[]>([]);
	const [loadingDoctors, setLoadingDoctors] = useState(false);
	const [formData, setFormData] = useState({
		doctorId: '',
		appointmentDate: '',
		amount: '',
		status: '',
	});
	const [timeParts, setTimeParts] = useState({ hour: '09', minute: '00', period: 'AM' });

	useEffect(() => {
		if (!open || !appointment) return;

		void fetchDoctors();

		const dateObj = new Date(appointment.appointmentDate || '');
		const isValidDate = !Number.isNaN(dateObj.getTime());
		const dateStr = isValidDate ? dateObj.toISOString().split('T')[0] : '';

		const hours24 = isValidDate ? dateObj.getHours() : 9;
		const minutes = isValidDate ? dateObj.getMinutes() : 0;
		const period = hours24 >= 12 ? 'PM' : 'AM';
		let hours12 = hours24 % 12;
		if (hours12 === 0) hours12 = 12;

		setFormData({
			doctorId: appointment.doctorId || appointment.doctor?.id || appointment.doctor?.userId || '',
			appointmentDate: dateStr,
			amount: appointment.amount?.toString() || '0',
			status: appointment.status || 'PENDING',
		});
		setTimeParts({
			hour: hours12.toString().padStart(2, '0'),
			minute: minutes.toString().padStart(2, '0'),
			period,
		});
	}, [open, appointment]);

	const fetchDoctors = async () => {
		setLoadingDoctors(true);
		try {
			const res = await api.get('/doctors?limit=100');
			const body = res.data as { data?: DoctorOption[] };
			setDoctors(Array.isArray(body?.data) ? body.data : []);
		} catch (error) {
			toast.error(getApiErrorMessage(error, 'Failed to load doctors'));
		} finally {
			setLoadingDoctors(false);
		}
	};

	const handleSave = async () => {
		if (!appointment) return;
		if (!formData.doctorId) {
			toast.error('Select a doctor');
			return;
		}
		if (!formData.appointmentDate) {
			toast.error('Date is required');
			return;
		}

		let hourNum = parseInt(timeParts.hour, 10);
		if (timeParts.period === 'PM' && hourNum < 12) hourNum += 12;
		if (timeParts.period === 'AM' && hourNum === 12) hourNum = 0;
		const formattedTime = `${hourNum.toString().padStart(2, '0')}:${timeParts.minute}:00`;
		const combinedDateTime = new Date(`${formData.appointmentDate}T${formattedTime}`);

		const amountValue = formData.amount ? parseFloat(formData.amount) : 0;
		if (amountValue < 0) {
			toast.error('Invalid amount');
			return;
		}

		setSaving(true);
		try {
			await api.put(`/appointments/${appointment.id}`, {
				doctorId: formData.doctorId,
				appointmentDate: combinedDateTime.toISOString(),
				amount: amountValue,
				status: formData.status,
			});
			toast.success('Appointment updated');
			onOpenChange(false);
			onSuccess();
		} catch (error) {
			toast.error(getApiErrorMessage(error, 'Update failed'));
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[480px] rounded-2xl flex flex-col p-0 overflow-hidden backdrop-blur-sm">
				<DialogHeader className="p-6 pb-4">
					<DialogTitle className="text-xl font-black flex items-center gap-2">
						<Pencil className="w-5 h-5 text-[#0EA5E9]" />
						Edit Appointment
					</DialogTitle>
					<DialogDescription className="font-medium mt-1">
						Update appointment details.
					</DialogDescription>
				</DialogHeader>

				<div className="px-6 py-2 space-y-4">
					<div className="space-y-1.5">
						<label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
							<User className="w-3 h-3 text-[#0EA5E9]" /> Doctor
						</label>
						<Select
							value={formData.doctorId}
							onValueChange={(value) => setFormData((previous) => ({ ...previous, doctorId: value }))}
							disabled={loadingDoctors}
						>
							<SelectTrigger className="rounded-xl border-slate-200 focus:ring-[#0EA5E9] font-bold h-11">
								<SelectValue placeholder={loadingDoctors ? 'Loading...' : 'Choose a specialist'} />
							</SelectTrigger>
							<SelectContent className="rounded-xl border-slate-200">
								{doctors.map((doctor) => (
									<SelectItem key={doctor.doctorId} value={doctor.doctorId} className="font-bold cursor-pointer hover:bg-slate-50">
										Dr. {doctor.fullName}{doctor.specialization ? ` (${doctor.specialization})` : ''}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
								<CalendarPlus className="w-3 h-3 text-[#0EA5E9]" /> Date
							</label>
							<Input
								type="date"
								value={formData.appointmentDate}
								onChange={(e) => setFormData((previous) => ({ ...previous, appointmentDate: e.target.value }))}
								className="rounded-xl border-slate-200 focus-visible:ring-[#0EA5E9] h-11 font-medium"
							/>
						</div>
						<div className="space-y-1.5">
							<label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
								<Clock className="w-3 h-3 text-[#0EA5E9]" /> Time
							</label>
							<div className="flex items-center h-11 w-full rounded-xl border border-slate-200 bg-white px-3 focus-within:ring-2 focus-within:ring-[#0EA5E9]">
								<select
									className="appearance-none bg-transparent font-medium border-none focus:outline-none focus:ring-0 text-center text-sm w-full cursor-pointer hover:bg-slate-100 rounded px-1"
									value={timeParts.hour}
									onChange={(e) => setTimeParts((previous) => ({ ...previous, hour: e.target.value }))}
								>
									{Array.from({ length: 12 }, (_, index) => (index + 1).toString().padStart(2, '0')).map((hour) => (
										<option key={hour} value={hour}>{hour}</option>
									))}
								</select>
								<span className="font-bold text-slate-400 mx-1">:</span>
								<select
									className="appearance-none bg-transparent font-medium border-none focus:outline-none focus:ring-0 text-center text-sm w-full cursor-pointer hover:bg-slate-100 rounded px-1"
									value={timeParts.minute}
									onChange={(e) => setTimeParts((previous) => ({ ...previous, minute: e.target.value }))}
								>
									{Array.from({ length: 60 }, (_, index) => index.toString().padStart(2, '0')).map((minute) => (
										<option key={minute} value={minute}>{minute}</option>
									))}
								</select>
								<select
									className="appearance-none bg-slate-100 text-[#0EA5E9] font-bold border-none focus:outline-none focus:ring-0 text-center text-sm w-[70px] ml-2 cursor-pointer hover:bg-blue-50 rounded py-1"
									value={timeParts.period}
									onChange={(e) => setTimeParts((previous) => ({ ...previous, period: e.target.value }))}
								>
									<option value="AM">AM</option>
									<option value="PM">PM</option>
								</select>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
								<span className="text-[#0EA5E9] font-bold text-xs">$</span> Amount
							</label>
							<Input
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
								value={formData.amount}
								onChange={(e) => setFormData((previous) => ({ ...previous, amount: e.target.value }))}
								className="rounded-xl border-slate-200 focus-visible:ring-[#0EA5E9] h-11 font-medium"
							/>
						</div>
						<div className="space-y-1.5">
							<label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
								Status
							</label>
							<Select value={formData.status} onValueChange={(value) => setFormData((previous) => ({ ...previous, status: value }))}>
								<SelectTrigger className="rounded-xl border-slate-200 focus:ring-[#0EA5E9] font-bold h-11">
									<SelectValue />
								</SelectTrigger>
								<SelectContent className="rounded-xl border-slate-200">
									<SelectItem value="PENDING" className="font-bold cursor-pointer">Pending</SelectItem>
									<SelectItem value="COMPLETED" className="font-bold cursor-pointer">Completed</SelectItem>
									<SelectItem value="CANCELLED" className="font-bold cursor-pointer">Cancelled</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				<DialogFooter className="p-6 pt-4 border-t bg-slate-50/50 mt-4">
					<Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold text-slate-500 hover:text-slate-900 transition-colors">
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={saving || loadingDoctors} className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold px-8 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95">
						{saving ? (
							<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
						) : 'Save Changes'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
