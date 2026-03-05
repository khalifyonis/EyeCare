'use client';

import { useState, useEffect } from 'react';
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
import { Loader2, CalendarPlus, User, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface AppointmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patientId: string;
    onSuccess: () => void;
}

export function AppointmentDialog({ open, onOpenChange, patientId, onSuccess }: AppointmentDialogProps) {
    const [saving, setSaving] = useState(false);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [loadingDoctors, setLoadingDoctors] = useState(false);
    const [formData, setFormData] = useState({
        doctorId: '',
        appointmentDate: '',
        amount: '',
    });
    const [timeParts, setTimeParts] = useState({ hour: '09', minute: '00', period: 'AM' });

    // Fetch doctors when dialog opens
    useEffect(() => {
        if (open) {
            fetchDoctors();
            setFormData({ doctorId: '', appointmentDate: '', amount: '' });
            setTimeParts({ hour: '09', minute: '00', period: 'AM' });
        }
    }, [open]);

    const fetchDoctors = async () => {
        setLoadingDoctors(true);
        try {
            const res = await api.get('/doctors');
            setDoctors(res.data);
        } catch (error) {
            toast.error('Failed to load doctors list');
        } finally {
            setLoadingDoctors(false);
        }
    };

    const handleSave = async () => {
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

        // Combine date and time
        const combinedDateTime = new Date(`${formData.appointmentDate}T${formattedTime}`);

        // Add a 10-minute grace period to allow booking for "right now"
        const now = new Date();
        now.setMinutes(now.getMinutes() - 10);

        if (combinedDateTime < now) {
            toast.error('Invalid date or time');
            return;
        }

        const amountVal = formData.amount ? parseFloat(formData.amount) : 0;
        if (amountVal < 0) {
            toast.error('Invalid amount');
            return;
        }

        setSaving(true);
        try {
            await api.post('/appointments', {
                patientId,
                doctorId: formData.doctorId,
                appointmentDate: combinedDateTime.toISOString(),
                amount: amountVal,
                status: 'PENDING'
            });

            toast.success('Appointment scheduled successfully');
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Scheduling failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px] rounded-2xl flex flex-col p-0 overflow-hidden backdrop-blur-sm">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle className="text-xl font-black flex items-center gap-2">
                        <CalendarPlus className="w-5 h-5 text-[#0EA5E9]" />
                        Book Appointment
                    </DialogTitle>
                    <DialogDescription className="font-medium mt-1">
                        Schedule a new clinical visit.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-2 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
                            <User className="w-3 h-3 text-[#0EA5E9]" /> Select Doctor
                        </label>
                        <Select
                            value={formData.doctorId}
                            onValueChange={(v) => setFormData({ ...formData, doctorId: v })}
                            disabled={loadingDoctors}
                        >
                            <SelectTrigger className="rounded-xl border-slate-200 focus:ring-[#0EA5E9] font-bold h-11">
                                <SelectValue placeholder={loadingDoctors ? "Loading..." : "Choose a specialist"} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200">
                                {doctors.map((doc) => (
                                    <SelectItem key={doc.doctorId} value={doc.doctorId} className="font-bold cursor-pointer hover:bg-slate-50">
                                        Dr. {doc.fullName} ({doc.specialization})
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
                                min={new Date().toISOString().split('T')[0]}
                                value={formData.appointmentDate}
                                onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
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
                                    onChange={e => setTimeParts(p => ({ ...p, hour: e.target.value }))}
                                >
                                    {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                                <span className="font-bold text-slate-400 mx-1">:</span>
                                <select
                                    className="appearance-none bg-transparent font-medium border-none focus:outline-none focus:ring-0 text-center text-sm w-full cursor-pointer hover:bg-slate-100 rounded px-1"
                                    value={timeParts.minute}
                                    onChange={e => setTimeParts(p => ({ ...p, minute: e.target.value }))}
                                >
                                    {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                <select
                                    className="appearance-none bg-slate-100 text-[#0EA5E9] font-bold border-none focus:outline-none focus:ring-0 text-center text-sm w-[70px] ml-2 cursor-pointer hover:bg-blue-50 rounded py-1"
                                    value={timeParts.period}
                                    onChange={e => setTimeParts(p => ({ ...p, period: e.target.value }))}
                                >
                                    <option value="AM">AM</option>
                                    <option value="PM">PM</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
                            <span className="text-[#0EA5E9] font-bold text-xs">$</span> Consultation Fee
                        </label>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            className="rounded-xl border-slate-200 focus-visible:ring-[#0EA5E9] h-11 font-medium"
                        />
                    </div>
                </div>

                <DialogFooter className="p-6 pt-4 border-t bg-slate-50/50 mt-4">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold text-slate-500 hover:text-slate-900 transition-colors">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving || loadingDoctors} className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold px-8 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95">
                        {saving ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scheduling...</>
                        ) : 'Confirm Booking'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
