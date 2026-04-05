'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, User, FileText, Phone as PhoneIcon } from 'lucide-react';

type Patient = {
  id: string;
  patientNumber?: string | null;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  bloodGroup?: string | null;
  allergies?: string | null;
  currentMedications?: string | null;
  medicalHistory?: string | null;
  familyMedicalHistory?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
};

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

function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0] || '';
}

export default function EditPatientPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(1);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    gender: 'MALE',
    city: '',
    state: '',
    address: '',
    bloodGroup: '',
    allergies: '',
    currentMedications: '',
    medicalHistory: '',
    familyMedicalHistory: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
  });

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/patients/${id}`);
        const row = res.data as Patient;
        const normalizedGender = (row.gender || 'MALE').toUpperCase();
        setFormData({
          fullName: row.fullName || '',
          phone: row.phone || '',
          email: row.email || '',
          dateOfBirth: toDateInputValue(row.dateOfBirth),
          gender: normalizedGender === 'FEMALE' ? 'FEMALE' : 'MALE',
          city: row.city || '',
          state: row.state || '',
          address: row.address || '',
          bloodGroup: row.bloodGroup || '',
          allergies: row.allergies || '',
          currentMedications: row.currentMedications || '',
          medicalHistory: row.medicalHistory || '',
          familyMedicalHistory: row.familyMedicalHistory || '',
          emergencyContactName: row.emergencyContactName || '',
          emergencyContactRelationship: row.emergencyContactRelationship || '',
          emergencyContactPhone: row.emergencyContactPhone || '',
        });
      } catch {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [id]);

  const set = (k: keyof typeof formData, v: string) => setFormData((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.gender || !formData.dateOfBirth) {
      toast.error('Required fields missing');
      setActiveTab(1);
      return;
    }

    setSaving(true);
    try {
      await api.put(`/patients/${id}`, {
        ...formData,
        fullName: formData.fullName.trim(),
        address: formData.address.trim() || null,
      });
      toast.success('Patient updated successfully');
      router.push(`/dashboard/patients/${id}`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0EA5E9]" />
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-slate-950 p-6 sm:p-8 space-y-6 animate-in fade-in duration-300">
      {/* Header Area */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Edit Patient</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Modify patient records and medical profile</p>
        <button
          onClick={() => router.push(`/dashboard/patients/${id}`)}
          className="inline-flex items-center gap-1.5 text-sm text-[#0EA5E9] hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Patient Details
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
        {/* Section Header */}
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
                <Label className="text-sm font-medium">Full Name <span className="text-red-500">*</span></Label>
                <Input value={formData.fullName} onChange={(e) => set('fullName', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Email</Label>
                <Input value={formData.email} onChange={(e) => set('email', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Date of Birth <span className="text-red-500">*</span></Label>
                <Input type="date" value={formData.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Gender <span className="text-red-500">*</span></Label>
                <Select value={formData.gender} onValueChange={(v) => set('gender', v)}>
                  <SelectTrigger className="h-11 rounded-lg border-slate-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Phone Number <span className="text-red-500">*</span></Label>
                <Input value={formData.phone} onChange={(e) => set('phone', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-sm font-medium">Address</Label>
                <Input value={formData.address} onChange={(e) => set('address', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">City</Label>
                <Select value={formData.city} onValueChange={(v) => set('city', v)}>
                  <SelectTrigger className="h-11 rounded-lg border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Select City" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOMALIA_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">State</Label>
                <Select value={formData.state} onValueChange={(v) => set('state', v)}>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Blood Group</Label>
                <Select value={formData.bloodGroup} onValueChange={(v) => set('bloodGroup', v)}>
                  <SelectTrigger className="h-11 rounded-lg border-slate-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-sm font-medium">Allergies</Label>
                <Textarea value={formData.allergies} onChange={(e) => set('allergies', e.target.value)} className="min-h-[80px] rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-sm font-medium">Current Medications</Label>
                <Textarea value={formData.currentMedications} onChange={(e) => set('currentMedications', e.target.value)} className="min-h-[80px] rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-sm font-medium">Medical History</Label>
                <Textarea value={formData.medicalHistory} onChange={(e) => set('medicalHistory', e.target.value)} className="min-h-[100px] rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
            </div>
          )}

          {activeTab === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Contact Name</Label>
                <Input value={formData.emergencyContactName} onChange={(e) => set('emergencyContactName', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Relationship</Label>
                <Input value={formData.emergencyContactRelationship} onChange={(e) => set('emergencyContactRelationship', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Phone Number</Label>
                <Input value={formData.emergencyContactPhone} onChange={(e) => set('emergencyContactPhone', e.target.value)} className="h-11 rounded-lg border-slate-200 dark:border-slate-700" />
              </div>
            </div>
          )}
        </div>

        {/* Footer Area */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/30 dark:bg-slate-900/20">
          <Button variant="outline" onClick={() => router.push(`/dashboard/patients/${id}`)} className="h-11 px-6 rounded-lg font-medium border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="h-11 px-8 rounded-lg bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-medium shadow-sm transition-all active:scale-[0.98]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Patient'}
          </Button>
        </div>
      </div>
    </div>
  );
}
