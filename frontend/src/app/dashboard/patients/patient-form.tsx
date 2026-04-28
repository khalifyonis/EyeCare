'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, Loader2, Phone as PhoneIcon, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type PatientFormData = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  bloodGroup: string;
  allergies: string;
  currentMedications: string;
  medicalHistory: string;
  familyMedicalHistory: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
};

type PatientFormProps = {
  mode: 'create' | 'edit';
  submitting: boolean;
  initialData?: Partial<PatientFormData> | null;
  onSubmit: (data: PatientFormData) => void;
  onCancel: () => void;
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const TABS = [
  { id: 1, label: 'Personal Information', icon: User },
  { id: 2, label: 'Medical Information', icon: FileText },
  { id: 3, label: 'Emergency Contact', icon: PhoneIcon },
] as const;

const SOMALIA_STATES = [
  'Banaadir', 'Galmudug', 'Hirshabelle', 'Jubaland', 'Puntland', 'South West State', 'Somaliland',
];

const SOMALIA_CITIES = [
  'Mogadishu', 'Hargeisa', 'Bosaso', 'Galkayo', 'Borama', 'Merca', 'Jamame', 'Kismayo', 'Baidoa',
  'Jowhar', 'Las Anod', 'Dhusamareb', 'Beledweyne', 'Garowe', 'Berbera',
].sort();

const emptyForm: PatientFormData = {
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

function splitFullName(fullName: string) {
  const value = (fullName || '').trim();
  if (!value) return { firstName: '', lastName: '' };
  const parts = value.split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
}

export function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0] || '';
}

export default function PatientForm({ mode, submitting, initialData, onSubmit, onCancel }: PatientFormProps) {
  const [activeTab, setActiveTab] = useState(1);

  const resolvedInitial = useMemo(() => {
    const firstName = (initialData?.firstName || '').trim();
    const lastName = (initialData?.lastName || '').trim();
    const fallback = splitFullName((initialData as { fullName?: string } | undefined)?.fullName || '');

    return {
      ...emptyForm,
      ...initialData,
      firstName: firstName || fallback.firstName,
      lastName: lastName || fallback.lastName,
      dateOfBirth: toDateInputValue(initialData?.dateOfBirth),
      gender: (initialData?.gender || '').toUpperCase() === 'FEMALE' ? 'FEMALE' : (initialData?.gender ? 'MALE' : ''),
    } as PatientFormData;
  }, [initialData]);

  const [form, setForm] = useState<PatientFormData>(resolvedInitial);

  useEffect(() => {
    setForm(resolvedInitial);
    setActiveTab(1);
  }, [resolvedInitial]);

  const set = (k: keyof PatientFormData, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || !form.gender || !form.dateOfBirth) {
      setActiveTab(1);
      return;
    }
    onSubmit(form);
  };

  return (
    <div className="w-full bg-white dark:bg-slate-950 p-6 sm:p-8 space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          {mode === 'edit' ? 'Edit Patient' : 'Add New Patient'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {mode === 'edit' ? 'Modify patient records and medical profile' : 'Register a new patient in the system'}
        </p>
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-sm text-[#0EA5E9] hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Patients
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id
                ? 'bg-blue-50 text-[#0EA5E9] dark:bg-blue-900/40'
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-blue-50/50 dark:bg-blue-950/20 px-6 py-4 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
          <div className="bg-[#0EA5E9] p-2 rounded-lg">
            {activeTab === 1 ? <User className="w-5 h-5 text-white" /> : activeTab === 2 ? <FileText className="w-5 h-5 text-white" /> : <PhoneIcon className="w-5 h-5 text-white" />}
          </div>
          <h2 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide text-sm">
            {TABS.find((t) => t.id === activeTab)?.label}
          </h2>
        </div>

        <div className="p-6">
          {activeTab === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">First Name <span className="text-red-500">*</span></Label>
                <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Last Name <span className="text-red-500">*</span></Label>
                <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Date of Birth <span className="text-red-500">*</span></Label>
                <Input 
                  type="date" 
                  value={form.dateOfBirth} 
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => set('dateOfBirth', e.target.value)} 
                  className="h-11 rounded-lg border-slate-200 dark:border-slate-700" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Gender <span className="text-red-500">*</span></Label>
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
                <Label className="text-sm font-medium">Phone Number <span className="text-red-500">*</span></Label>
                <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Email</Label>
                <Input value={form.email} onChange={(e) => set('email', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-sm font-medium">Address</Label>
                <Input value={form.address} onChange={(e) => set('address', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">City</Label>
                <Select value={form.city} onValueChange={(v) => set('city', v)}>
                  <SelectTrigger className="h-11 rounded-lg border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Select City" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOMALIA_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">State</Label>
                <Select value={form.state} onValueChange={(v) => set('state', v)}>
                  <SelectTrigger className="h-11 rounded-lg border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Select State" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOMALIA_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {activeTab === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Blood Group</Label>
                <Select value={form.bloodGroup} onValueChange={(v) => set('bloodGroup', v)}>
                  <SelectTrigger className="h-11 rounded-lg border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Select Blood Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((bg) => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-sm font-medium">Allergies</Label>
                <Textarea value={form.allergies} onChange={(e) => set('allergies', e.target.value)} className="min-h-[80px] rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-sm font-medium">Current Medications</Label>
                <Textarea value={form.currentMedications} onChange={(e) => set('currentMedications', e.target.value)} className="min-h-[80px] rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-sm font-medium">Medical History</Label>
                <Textarea value={form.medicalHistory} onChange={(e) => set('medicalHistory', e.target.value)} className="min-h-[100px] rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
            </div>
          )}

          {activeTab === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Contact Name</Label>
                <Input value={form.emergencyContactName} onChange={(e) => set('emergencyContactName', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Relationship</Label>
                <Input value={form.emergencyContactRelationship} onChange={(e) => set('emergencyContactRelationship', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Phone Number</Label>
                <Input value={form.emergencyContactPhone} onChange={(e) => set('emergencyContactPhone', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/30 dark:bg-slate-900/20">
          <Button variant="outline" onClick={onCancel} className="h-11 px-6 rounded-lg font-medium border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">Cancel</Button>
          <Button onClick={handleSave} disabled={submitting} className="h-11 px-8 rounded-lg bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-medium shadow-sm transition-all active:scale-[0.98]">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'edit' ? 'Update Patient' : 'Save Patient'}
          </Button>
        </div>
      </div>
    </div>
  );
}
