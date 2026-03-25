'use client';

import { useState, useEffect } from 'react';
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
    ArrowLeft, Loader2, Save, User, FileText, Phone as PhoneIcon,
} from 'lucide-react';

type DoctorOption = { id: string; user: { fullName: string } };
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const TABS = [
    { id: 1, label: 'Personal Information', icon: User },
    { id: 2, label: 'Medical Information', icon: FileText },
    { id: 3, label: 'Emergency Contact', icon: PhoneIcon },
];

const initialForm = {
    firstName: '', lastName: '', dateOfBirth: '', gender: '',
    phone: '', email: '', city: '', state: '', zipCode: '', assignedDoctorId: '',
    bloodGroup: '', allergies: '',
    currentMedications: '', medicalHistory: '', familyMedicalHistory: '',
    emergencyContactName: '', emergencyContactRelationship: '', emergencyContactPhone: '',
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            {children}
        </div>
    );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
    return (
        <div className="flex items-center gap-3 pb-4 mb-1 border-b border-slate-100 dark:border-slate-800">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
                <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
        </div>
    );
}

const inputCls = 'h-11 text-[15px] font-normal text-slate-800 dark:text-slate-100 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-visible:ring-[#0EA5E9] focus-visible:ring-1 shadow-sm placeholder:text-slate-400';
const textareaCls = 'text-[15px] text-slate-800 dark:text-slate-100 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-visible:ring-[#0EA5E9] focus-visible:ring-1 shadow-sm resize-none placeholder:text-slate-400';

export default function NewPatientPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState(1);
    const [form, setForm] = useState(initialForm);
    const [saving, setSaving] = useState(false);
    const [doctors, setDoctors] = useState<DoctorOption[]>([]);

    useEffect(() => {
        api.get('/doctors?limit=100')
            .then((r) => setDoctors(Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : []))
            .catch(() => {});
    }, []);

    const set = (k: keyof typeof initialForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

    const validate = (): string | null => {
        if (!form.firstName.trim()) return 'First Name is required';
        if (!form.lastName.trim()) return 'Last Name is required';
        if (!form.phone.trim()) return 'Phone Number is required';
        if (!form.gender) return 'Gender is required';
        if (!form.dateOfBirth) return 'Date of Birth is required';
        return null;
    };

    const handleSave = async () => {
        const err = validate();
        if (err) { toast.error(err); setActiveTab(1); return; }
        setSaving(true);
        try {
            const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
            await api.post('/patients', {
                fullName, firstName: form.firstName.trim(), lastName: form.lastName.trim(),
                phone: form.phone.trim(), email: form.email.trim() || null,
                dateOfBirth: form.dateOfBirth || null, gender: form.gender || null,
                city: form.city.trim() || null, state: form.state.trim() || null,
                zipCode: form.zipCode.trim() || null,
                assignedDoctorId: (form.assignedDoctorId && form.assignedDoctorId !== 'none') ? form.assignedDoctorId : null,
                bloodGroup: form.bloodGroup || null,
                allergies: form.allergies.trim() || null,
                currentMedications: form.currentMedications.trim() || null,
                medicalHistory: form.medicalHistory.trim() || null,
                familyMedicalHistory: form.familyMedicalHistory.trim() || null,
                emergencyContactName: form.emergencyContactName.trim() || null,
                emergencyContactRelationship: form.emergencyContactRelationship.trim() || null,
                emergencyContactPhone: form.emergencyContactPhone.trim() || null,
            });
            toast.success('Patient registered successfully!');
            router.push('/dashboard/patients');
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || 'Failed to save patient');
        } finally { setSaving(false); }
    };

    return (
        <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 flex flex-col">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-8 pt-6 pb-5">
                <h1 className="text-[22px] font-bold text-slate-900 dark:text-white leading-tight">Add New Patient</h1>
                <p className="text-sm text-slate-500 mt-0.5">Register a new patient in the system</p>
                <button onClick={() => router.push('/dashboard/patients')} className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#0EA5E9] transition-colors mt-3">
                    <ArrowLeft className="h-4 w-4" />Back to Patients
                </button>
            </div>

            {/* Tab bar */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-8 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 font-semibold' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                <Icon className="h-4 w-4" />{tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Form */}
            <div className="flex-1 px-8 py-6">
                <div className="max-w-4xl bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">

                    {/* ── Tab 1: Personal Information ── */}
                    {activeTab === 1 && (
                        <>
                            <SectionHeader icon={User} title="Personal Information" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-5">
                                <Field label="First Name" required><Input className={inputCls} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="First Name" /></Field>
                                <Field label="Last Name" required><Input className={inputCls} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Last Name" /></Field>
                                <Field label="Date of Birth" required><Input type="date" className={inputCls} value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} /></Field>
                                <Field label="Gender" required>
                                    <Select value={form.gender} onValueChange={(v) => set('gender', v)}>
                                        <SelectTrigger className={inputCls}><SelectValue placeholder="Select Gender" /></SelectTrigger>
                                        <SelectContent><SelectItem value="MALE">Male</SelectItem><SelectItem value="FEMALE">Female</SelectItem></SelectContent>
                                    </Select>
                                </Field>
                                <Field label="Phone Number" required>
                                    <div className="relative"><PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input className={`${inputCls} pl-9`} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Phone Number" /></div>
                                </Field>
                                <Field label="Email"><Input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Email Address" /></Field>
                                <Field label="City"><Input className={inputCls} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="City" /></Field>
                                <Field label="State"><Input className={inputCls} value={form.state} onChange={(e) => set('state', e.target.value)} placeholder="State" /></Field>
                                <Field label="ZIP Code"><Input className={inputCls} value={form.zipCode} onChange={(e) => set('zipCode', e.target.value)} placeholder="ZIP Code" /></Field>
                                <Field label="Assigned Doctor">
                                    <Select value={form.assignedDoctorId} onValueChange={(v) => set('assignedDoctorId', v)}>
                                        <SelectTrigger className={inputCls}><SelectValue placeholder="Select doctor (optional)" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {doctors.map((d) => (<SelectItem key={d.id} value={d.id}>{d.user?.fullName}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </div>
                        </>
                    )}

                    {/* ── Tab 2: Medical Information ── */}
                    {activeTab === 2 && (
                        <>
                            <SectionHeader icon={FileText} title="Medical Information" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-5">
                                <Field label="Blood Type">
                                    <Select value={form.bloodGroup} onValueChange={(v) => set('bloodGroup', v)}>
                                        <SelectTrigger className={inputCls}><SelectValue placeholder="Select Blood Type" /></SelectTrigger>
                                        <SelectContent>{BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                                    </Select>
                                </Field>
                                <Field label="Allergies">
                                    <Input className={inputCls} value={form.allergies} onChange={(e) => set('allergies', e.target.value)} placeholder="e.g., Penicillin, Peanuts" />
                                </Field>
                                <div className="sm:col-span-2">
                                    <Field label="Current Medications">
                                        <Textarea className={textareaCls} rows={4} value={form.currentMedications} onChange={(e) => set('currentMedications', e.target.value)} placeholder="List current medications, dosages, and frequency" />
                                    </Field>
                                </div>
                                <div className="sm:col-span-2">
                                    <Field label="Medical History">
                                        <Textarea className={textareaCls} rows={4} value={form.medicalHistory} onChange={(e) => set('medicalHistory', e.target.value)} placeholder="Previous surgeries, chronic conditions, major illnesses" />
                                    </Field>
                                </div>
                                <div className="sm:col-span-2">
                                    <Field label="Family Medical History">
                                        <Textarea className={textareaCls} rows={4} value={form.familyMedicalHistory} onChange={(e) => set('familyMedicalHistory', e.target.value)} placeholder="Relevant family medical conditions" />
                                    </Field>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── Tab 3: Emergency Contact ── */}
                    {activeTab === 3 && (
                        <>
                            <SectionHeader icon={PhoneIcon} title="Emergency Contact" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-5">
                                <Field label="Contact Name"><Input className={inputCls} value={form.emergencyContactName} onChange={(e) => set('emergencyContactName', e.target.value)} placeholder="Full Name" /></Field>
                                <Field label="Relationship"><Input className={inputCls} value={form.emergencyContactRelationship} onChange={(e) => set('emergencyContactRelationship', e.target.value)} placeholder="e.g. Spouse, Parent" /></Field>
                                <Field label="Phone Number">
                                    <div className="relative"><PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input className={`${inputCls} pl-9`} value={form.emergencyContactPhone} onChange={(e) => set('emergencyContactPhone', e.target.value)} placeholder="Phone Number" /></div>
                                </Field>
                            </div>
                        </>
                    )}

                </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5">
                <div className="flex items-center justify-between max-w-4xl">
                    <div className="flex items-center gap-3">
                        {TABS.map((tab, idx) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <div key={tab.id} className="flex items-center gap-3">
                                    <button
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-all ${isActive ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 bg-transparent'}`}
                                    >
                                        {tab.id}. {tab.label}
                                    </button>
                                    {idx < TABS.length - 1 && <span className="text-slate-300 dark:text-slate-600 select-none">—</span>}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-6">
                        <Button variant="outline" onClick={() => router.push('/dashboard/patients')} className="text-slate-600 border-slate-200 hover:bg-slate-50 font-medium px-5">Cancel</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold gap-2 px-6 shadow-sm">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {saving ? 'Saving...' : 'Save Patient'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
