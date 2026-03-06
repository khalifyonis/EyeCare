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
import { Loader2, UserPlus, Phone, Mail, MapPin, Calendar, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

interface PatientDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patient?: any;
    onSuccess: () => void;
}

export function PatientDialog({ open, onOpenChange, patient, onSuccess }: PatientDialogProps) {
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        email: '',
        dateOfBirth: '',
        gender: 'MALE',
        address: '',
    });

    useEffect(() => {
        if (patient) {
            setFormData({
                fullName: patient.fullName || '',
                phone: patient.phone || '',
                email: patient.email || '',
                dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : '',
                gender: patient.gender || 'MALE',
                address: patient.address || '',
            });
        } else {
            setFormData({ fullName: '', phone: '', email: '', dateOfBirth: '', gender: 'MALE', address: '' });
        }
    }, [patient, open]);

    const handleSave = async () => {
        const nameRegex = /^[a-zA-Z\s]+$/;

        if (!formData.fullName.trim()) {
            toast.error('Full name is required');
            return;
        }

        if (!nameRegex.test(formData.fullName.trim())) {
            toast.error('Name must contain only letters and spaces');
            return;
        }

        if (!formData.phone.trim()) {
            toast.error('Phone number required');
            return;
        }

        const phoneRegex = /^[+]?[(]?[0-9]{1,3}[)]?[-s./0-9]*$/;
        if (!phoneRegex.test(formData.phone)) {
            toast.error('Invalid phone format');
            return;
        }

        if (formData.dateOfBirth) {
            const selectedDate = new Date(formData.dateOfBirth);
            if (selectedDate > new Date()) {
                toast.error('Invalid birth date');
                return;
            }
        }

        setSaving(true);
        try {
            const payload = {
                fullName: formData.fullName.trim(),
                phone: formData.phone.trim(),
                email: formData.email?.trim() || undefined,
                dateOfBirth: formData.dateOfBirth || undefined,
                gender: formData.gender,
                address: formData.address?.trim() || undefined,
            };
            if (patient) {
                await api.put(`/patients/${patient.id}`, payload);
                toast.success('Patient updated successfully');
            } else {
                await api.post('/patients', payload);
                toast.success('Patient registered successfully');
            }
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Operation failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] rounded-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden backdrop-blur-sm">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl font-black">{patient ? 'Edit Patient' : 'Add New Patient'}</DialogTitle>
                    <DialogDescription className="font-medium">
                        {patient ? `Updating clinical records for this patient.` : 'Create a new digital medical record for the patient.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-2 h-[calc(90vh-140px)]">
                    <div className="grid gap-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
                            <Input placeholder="e.g. John Doe" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="rounded-xl border-slate-200 focus-visible:ring-[#0EA5E9]" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
                                    <Phone className="h-2.5 w-2.5" /> Contact Number
                                </label>
                                <Input placeholder="+252..." value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="rounded-xl border-slate-200 focus-visible:ring-[#0EA5E9]" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
                                    <Mail className="h-2.5 w-2.5" /> Email
                                </label>
                                <Input type="email" placeholder="john@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="rounded-xl border-slate-200 focus-visible:ring-[#0EA5E9]" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
                                    <Calendar className="h-2.5 w-2.5" /> Birth Date
                                </label>
                                <Input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} className="rounded-xl border-slate-200 focus-visible:ring-[#0EA5E9]" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 text-slate-600">Gender</label>
                                <Select
                                    value={formData.gender}
                                    onValueChange={(v) => setFormData({ ...formData, gender: v })}
                                    defaultValue="MALE"
                                >
                                    <SelectTrigger className="rounded-xl border-slate-200 focus:ring-[#0EA5E9] bg-white text-slate-700 font-bold">
                                        <SelectValue placeholder="Select Gender" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl bg-white border-2 border-slate-200 shadow-2xl z-[9999]">
                                        <SelectItem value="MALE" className="font-bold cursor-pointer hover:bg-slate-50 focus:bg-blue-50">Male</SelectItem>
                                        <SelectItem value="FEMALE" className="font-bold cursor-pointer hover:bg-slate-50 focus:bg-blue-50">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5 pb-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
                                <MapPin className="h-2.5 w-2.5" /> Address
                            </label>
                            <Input placeholder="Mogadishu, Somalia" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="rounded-xl border-slate-200 focus-visible:ring-[#0EA5E9]" />
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-2 border-t bg-slate-50/50">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold text-slate-500">Cancel</Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold px-8 rounded-xl shadow-lg shadow-blue-500/20">
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {patient ? 'Update Patient' : 'Add Patient'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
