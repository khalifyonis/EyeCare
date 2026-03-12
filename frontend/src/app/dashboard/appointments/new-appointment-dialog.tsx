'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Loader2, CalendarPlus, User, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';

type DoctorOption = {
	doctorId: string;
	fullName: string;
	specialization?: string | null;
};

type PatientOption = {
	id: string;
	fullName?: string | null;
	phone?: string | null;
};

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
};

function getApiErrorMessage(error: unknown, fallback: string): string {
	if (!error || typeof error !== 'object') return fallback;
	const maybe = error as { response?: { data?: { message?: unknown } } };
	const msg = maybe.response?.data?.message;
	return typeof msg === 'string' && msg.trim().length > 0 ? msg : fallback;
}

export function NewAppointmentDialog({ open, onOpenChange, onSuccess }: Props) {
	const [saving, setSaving] = useState(false);

	const [doctors, setDoctors] = useState<DoctorOption[]>([]);
	const [loadingDoctors, setLoadingDoctors] = useState(false);

	const [patients, setPatients] = useState<PatientOption[]>([]);
	const [loadingPatients, setLoadingPatients] = useState(false);
	const [patientSearch, setPatientSearch] = useState('');

	const [formData, setFormData] = useState({
		patientId: '',
		doctorId: '',
		appointmentDate: '',
		amount: '',
	});

	const [timeParts, setTimeParts] = useState({ hour: '09', minute: '00', period: 'AM' });

	const resetForm = useCallback(() => {
		setFormData({ patientId: '', doctorId: '', appointmentDate: '', amount: '' });
		setTimeParts({ hour: '09', minute: '00', period: 'AM' });
		setPatientSearch('');
	}, []);

	const fetchDoctors = useCallback(async () => {
		setLoadingDoctors(true);
		try {
			const res = await api.get('/doctors?limit=100');
			const body = res.data as { data?: DoctorOption[] };
			setDoctors(Array.isArray(body?.data) ? body.data : []);
		} catch (error) {
			toast.error(getApiErrorMessage(error, 'Failed to load doctors list'));
			setDoctors([]);
		} finally {
			setLoadingDoctors(false);
		}
	}, []);

	const fetchPatients = useCallback(async (search: string) => {
		setLoadingPatients(true);
		try {
			const qs = new URLSearchParams();
			if (search.trim()) qs.set('search', search.trim());
			qs.set('sortBy', 'fullName');
			qs.set('sortOrder', 'asc');
			qs.set('limit', '100');
			const res = await api.get(`/patients?${qs.toString()}`);
			const body = res.data as { data?: PatientOption[] };
			setPatients(Array.isArray(body?.data) ? body.data : []);
		} catch {
			setPatients([]);
		} finally {
			setLoadingPatients(false);
		}
	}, []);

	useEffect(() => {
		if (!open) return;
		resetForm();
		fetchDoctors();
		fetchPatients('');
	}, [open, fetchDoctors, fetchPatients, resetForm]);

	useEffect(() => {
		if (!open) return;
		const timeout = setTimeout(() => {
			fetchPatients(patientSearch);
		}, 300);
		return () => clearTimeout(timeout);
	}, [open, patientSearch, fetchPatients]);

	const selectedPatientLabel = useMemo(() => {
		const selected = patients.find((patient) => patient.id === formData.patientId);
		if (!selected) return '';
		return `${selected.fullName || 'Unknown'}${selected.phone ? ` (${selected.phone})` : ''}`;
	}, [patients, formData.patientId]);

	const handleSave = async () => {
		if (!formData.patientId) {
			toast.error('Please select a patient');
			return;
		}
		if (!formData.doctorId) {
			toast.error('Please select a doctor');
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

		const now = new Date();
		now.setMinutes(now.getMinutes() - 10);
		if (combinedDateTime < now) {
			toast.error('Invalid date or time');
			return;
		}

		const amountValue = formData.amount ? parseFloat(formData.amount) : 0;
		if (amountValue < 0) {
			toast.error('Invalid amount');
			return;
		}

		setSaving(true);
		try {
			await api.post('/appointments', {
				patientId: formData.patientId,
				doctorId: formData.doctorId,
				appointmentDate: combinedDateTime.toISOString(),
				amount: amountValue,
				status: 'PENDING',
			});

			toast.success('Appointment scheduled successfully');
			onOpenChange(false);
			onSuccess();
		} catch (error) {
			toast.error(getApiErrorMessage(error, 'Scheduling failed'));
		} finally {
			setSaving(false);
		}
	};

return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[520px] rounded-2xl flex flex-col p-0 overflow-hidden backdrop-blur-sm bg-background">
				<DialogHeader className="p-6 pb-4 border-b border-slate-200 dark:border-slate-800">
					<DialogTitle className="text-xl font-black flex items-center gap-2">
						<CalendarPlus className="w-5 h-5 text-[#0EA5E9]" />
						New Booking
					</DialogTitle>
					<DialogDescription className="font-medium mt-1">
						Create a new appointment booking.
					</DialogDescription>
				</DialogHeader>

				<div className="px-6 py-2 space-y-4">
					<div className="space-y-2">
						<label className="text-sm font-medium text-slate-800 dark:text-slate-100">Patient</label>
						<Input
							placeholder="Search patient by name / phone..."
							value={patientSearch}
							onChange={(e) => setPatientSearch(e.target.value)}
							className="rounded-xl border-slate-200 focus-visible:ring-[#0EA5E9] h-11 font-medium"
						/>
						<Select
							value={formData.patientId}
							onValueChange={(value) => setFormData((previous) => ({ ...previous, patientId: value }))}
							disabled={loadingPatients}
						>
							<SelectTrigger className="rounded-xl border-slate-200 focus:ring-[#0EA5E9] font-bold h-11">
								<SelectValue placeholder={loadingPatients ? 'Loading...' : selectedPatientLabel || 'Choose a patient'} />
							</SelectTrigger>
							<SelectContent className="rounded-xl border-slate-200">
								{patients.map((patient) => (
									<SelectItem key={patient.id} value={patient.id} className="font-bold cursor-pointer hover:bg-slate-50">
										{patient.fullName || 'Unknown'}{patient.phone ? ` (${patient.phone})` : ''}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<label className="text-sm font-medium text-slate-800 dark:text-slate-100">Doctor</label>
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
							<label className="text-sm font-medium text-slate-800 dark:text-slate-100">Date</label>
							<Input
								type="date"
								min={new Date().toISOString().split('T')[0]}
								value={formData.appointmentDate}
								onChange={(e) => setFormData((previous) => ({ ...previous, appointmentDate: e.target.value }))}
								className="rounded-xl border-slate-200 focus-visible:ring-[#0EA5E9] h-11 font-medium"
							/>
						</div>
						<div className="space-y-1.5">
							<label className="text-sm font-medium text-slate-800 dark:text-slate-100">Time</label>
							<div className="flex items-center h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 focus-within:ring-2 focus-within:ring-[#0EA5E9]">
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

					<div className="space-y-1.5">
						<label className="text-sm font-medium text-slate-800 dark:text-slate-100">Amount</label>
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
				</div>

				<DialogFooter className="p-6 pt-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 mt-4">
					<Button
						variant="ghost"
						onClick={() => onOpenChange(false)}
						className="rounded-xl font-bold text-slate-500 hover:text-slate-900 transition-colors"
					>
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						disabled={saving || loadingDoctors || loadingPatients}
						className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold px-8 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
					>
						{saving ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scheduling...
							</>
						) : 'Confirm Booking'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
