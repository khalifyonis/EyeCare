'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    ArrowLeft, Loader2, User, FileText, Phone as PhoneIcon,
} from 'lucide-react';

type DoctorOption = { id: string; user: { fullName: string } };
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const TABS = [
    { id: 1, label: 'Personal Information', icon: User },
    { id: 2, label: 'Medical Information', icon: FileText },
    { id: 3, label: 'Emergency Contact', icon: PhoneIcon },
];

const SOMALIA_STATES = [
    'Banaadir', 'Galmudug', 'Hirshabelle', 'Jubaland', 'Puntland', 'South West State', 'Somaliland'
];

const SOMALIA_CITIES = [
    'Mogadishu', 'Hargeisa', 'Bosaso', 'Galkayo', 'Borama', 'Merca', 'Jamame', 'Kismayo', 'Baidoa', 'Jowhar', 'Las Anod', 'Dhusamareb', 'Beledweyne', 'Garowe', 'Berbera'
].sort();

const initialForm = {
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    bloodGroup: '',
    allergies: '',
    currentMedications: '',
    medicalHistory: '',
    familyMedicalHistory: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
};

export default function NewPatientPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState(1);
    const [form, setForm] = useState(initialForm);
    const [saving, setSaving] = useState(false);
    const [doctors, setDoctors] = useState<DoctorOption[]>([]);

    useEffect(() => {
        api.get('/doctors?limit=100')
            .then((r) => setDoctors(Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : []))
            .catch(() => { });
    }, []);

    const set = (k: keyof typeof initialForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

    const handleSave = async () => {
        if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || !form.gender || !form.dateOfBirth) {
            toast.error('Please fill in all required fields');
            setActiveTab(1);
            return;
        }

        setSaving(true);
        try {
            const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
            await api.post('/patients', {
                ...form,
                fullName,
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                phone: form.phone.trim(),
                email: form.email.trim() || null,
                address: form.address.trim() || null,
                city: form.city.trim() || null,
                state: form.state.trim() || null,
            });
            toast.success('Patient registered successfully!');
            router.push('/dashboard/patients');
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to save patient');
        } finally { setSaving(false); }
    };

    return (
        <div className="w-full bg-white dark:bg-slate-950 p-6 sm:p-8 space-y-6 animate-in fade-in duration-300">
            {/* Header Area */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Add New Patient</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Register a new patient in the system</p>
                <button
                    onClick={() => router.push('/dashboard/patients')}
                    className="inline-flex items-center gap-1.5 text-sm text-[#0EA5E9] hover:underline mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Patients
                </button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.id
                            ? 'bg-blue-50 text-[#0EA5E9] dark:bg-blue-900/40'
                            : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                            }`}
                    >
                        <t.icon className="w-4 h-4" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Form Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                {/* Section Header (Matches Image) */}
                <div className="bg-blue-50/50 dark:bg-blue-950/20 px-6 py-4 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="bg-[#0EA5E9] p-2 rounded-lg">
                        {activeTab === 1 ? <User className="w-5 h-5 text-white" /> :
                            activeTab === 2 ? <FileText className="w-5 h-5 text-white" /> :
                                <PhoneIcon className="w-5 h-5 text-white" />}
                    </div>
                    <h2 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide text-sm">
                        {TABS.find(t => t.id === activeTab)?.label}
                    </h2>
                </div>

                <div className="p-6">
                    {activeTab === 1 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">First Name <span className="text-red-500">*</span></Label>
                                <Input placeholder="First Name" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700 focus-visible:ring-[#0EA5E9]" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Last Name <span className="text-red-500">*</span></Label>
                                <Input placeholder="Last Name" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700 focus-visible:ring-[#0EA5E9]" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date of Birth <span className="text-red-500">*</span></Label>
                                <Input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700 focus-visible:ring-[#0EA5E9]" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Gender <span className="text-red-500">*</span></Label>
                                <Select value={form.gender} onValueChange={(v) => set('gender', v)}>
                                    <SelectTrigger className="h-11 rounded-lg border-slate-200 dark:border-slate-700">
                                        <SelectValue placeholder="Select Gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MALE">Male</SelectItem>
                                        <SelectItem value="FEMALE">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number <span className="text-red-500">*</span></Label>
                                <Input placeholder="Phone Number" value={form.phone} onChange={(e) => set('phone', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700 focus-visible:ring-[#0EA5E9]" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</Label>
                                <Input type="email" placeholder="Email Address" value={form.email} onChange={(e) => set('email', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700 focus-visible:ring-[#0EA5E9]" />
                            </div>
                            <div className="sm:col-span-2 space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Address</Label>
                                <Input placeholder="Full Street Address" value={form.address} onChange={(e) => set('address', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700 focus-visible:ring-[#0EA5E9]" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">City</Label>
                                <Select value={form.city} onValueChange={(v) => set('city', v)}>
                                    <SelectTrigger className="h-11 rounded-lg border-slate-200 dark:border-slate-700">
                                        <SelectValue placeholder="Select City" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SOMALIA_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">State</Label>
                                <Select value={form.state} onValueChange={(v) => set('state', v)}>
                                    <SelectTrigger className="h-11 rounded-lg border-slate-200 dark:border-slate-700">
                                        <SelectValue placeholder="Select State" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SOMALIA_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {activeTab === 2 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 flex-wrap">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Blood Group</Label>
                                <Select value={form.bloodGroup} onValueChange={(v) => set('bloodGroup', v)}>
                                    <SelectTrigger className="h-11 rounded-lg border-slate-200 dark:border-slate-700">
                                        <SelectValue placeholder="Select Blood Group" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {BLOOD_GROUPS.map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="sm:col-span-2 space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Allergies</Label>
                                <Textarea placeholder="Any known allergies..." value={form.allergies} onChange={(e) => set('allergies', e.target.value)} className="min-h-[80px] rounded-lg border-slate-200 dark:border-slate-700 focus-visible:ring-[#0EA5E9]" />
                            </div>
                            <div className="sm:col-span-2 space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Medications</Label>
                                <Textarea placeholder="List medications..." value={form.currentMedications} onChange={(e) => set('currentMedications', e.target.value)} className="min-h-[80px] rounded-lg border-slate-200 dark:border-slate-700 focus-visible:ring-[#0EA5E9]" />
                            </div>
                            <div className="sm:col-span-2 space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Medical History</Label>
                                <Textarea placeholder="Past conditions, surgeries..." value={form.medicalHistory} onChange={(e) => set('medicalHistory', e.target.value)} className="min-h-[100px] rounded-lg border-slate-200 dark:border-slate-700 focus-visible:ring-[#0EA5E9]" />
                            </div>
                        </div>
                    )}

                    {activeTab === 3 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Contact Name</Label>
                                <Input placeholder="Full Name" value={form.emergencyContactName} onChange={(e) => set('emergencyContactName', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700 focus-visible:ring-[#0EA5E9]" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Relationship</Label>
                                <Input placeholder="e.g. Spouse, Parent" value={form.emergencyContactRelationship} onChange={(e) => set('emergencyContactRelationship', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700 focus-visible:ring-[#0EA5E9]" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</Label>
                                <Input placeholder="Phone Number" value={form.emergencyContactPhone} onChange={(e) => set('emergencyContactPhone', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700 focus-visible:ring-[#0EA5E9]" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons (Matches Image) */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/30 dark:bg-slate-900/20">
                    <Button variant="outline" onClick={() => router.push('/dashboard/patients')} className="h-11 px-6 rounded-lg font-medium border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">Cancel</Button>
                    <Button onClick={handleSave} disabled={saving} className="h-11 px-8 rounded-lg bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-medium shadow-sm transition-all active:scale-[0.98]">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Patient'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
