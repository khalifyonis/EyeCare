'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  address?: string | null;
  assignedDoctorId?: string | null;
  bloodGroup?: string | null;
  allergies?: string | null;
  currentMedications?: string | null;
  medicalHistory?: string | null;
  familyMedicalHistory?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
};

type DoctorOption = { id: string; user?: { fullName?: string | null } | null };

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const TABS = [
  { id: 1, label: 'Personal Information', icon: User },
  { id: 2, label: 'Medical Information', icon: FileText },
  { id: 3, label: 'Emergency Contact', icon: PhoneIcon },
];

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
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

const inputCls =
  'h-11 text-[15px] font-normal text-slate-800 dark:text-slate-100 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-visible:ring-[#0EA5E9] focus-visible:ring-1 shadow-sm placeholder:text-slate-400';

const textareaCls =
  'text-[15px] text-slate-800 dark:text-slate-100 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus-visible:ring-[#0EA5E9] focus-visible:ring-1 shadow-sm resize-none placeholder:text-slate-400';

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
  const [patient, setPatient] = useState<Patient | null>(null);

  const [activeTab, setActiveTab] = useState(1);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    gender: 'MALE',
    address: '',
    assignedDoctorId: 'none',
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
    const run = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/patients/${id}`);
        const row = res.data as Patient;
        setPatient(row);
        setFormData({
          fullName: row.fullName || '',
          phone: row.phone || '',
          email: row.email || '',
          dateOfBirth: toDateInputValue(row.dateOfBirth),
          gender: (row.gender || 'MALE').toUpperCase(),
          address: row.address || '',
          assignedDoctorId: row.assignedDoctorId || 'none',
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
        toast.error('Failed to load patient');
        router.push('/dashboard/patients');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [id, router]);

  useEffect(() => {
    api
      .get('/doctors?limit=100')
      .then((r) => setDoctors(Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const titleName = useMemo(() => patient?.fullName || 'Patient', [patient?.fullName]);

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
        assignedDoctorId: formData.assignedDoctorId && formData.assignedDoctorId !== 'none' ? formData.assignedDoctorId : null,
        bloodGroup: formData.bloodGroup || null,
        allergies: formData.allergies.trim() || null,
        currentMedications: formData.currentMedications.trim() || null,
        medicalHistory: formData.medicalHistory.trim() || null,
        familyMedicalHistory: formData.familyMedicalHistory.trim() || null,
        emergencyContactName: formData.emergencyContactName.trim() || null,
        emergencyContactRelationship: formData.emergencyContactRelationship.trim() || null,
        emergencyContactPhone: formData.emergencyContactPhone.trim() || null,
      };

      await api.put(`/patients/${id}`, payload);
      toast.success('Patient updated successfully');
      router.push(`/dashboard/patients/${id}`);
    } catch (error: unknown) {
      const maybe = error as { response?: { data?: { message?: unknown } } };
      const msg = maybe?.response?.data?.message;
      toast.error(typeof msg === 'string' && msg.trim().length > 0 ? msg : 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0EA5E9]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 flex flex-col">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-8 pt-6 pb-5">
        <h1 className="text-[22px] font-bold text-slate-900 dark:text-white leading-tight">Edit Patient</h1>
        <p className="text-sm text-slate-500 mt-0.5">Modify patient information</p>
        <button
          onClick={() => router.push(`/dashboard/patients/${id}`)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#0EA5E9] transition-colors mt-3"
        >
          <ArrowLeft className="h-4 w-4" />Back to Patient Details
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-8 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 font-semibold'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />{tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 px-8 py-6">
        <div className="max-w-4xl bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
          {activeTab === 1 && (
            <>
              <SectionHeader icon={User} title="Personal Information" />
              <div className="mt-1 text-sm text-slate-500">
                <span className="font-medium text-slate-600">Patient ID:</span> {patient?.patientNumber || 'N/A'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-5">
                <Field label="Full Name" required>
                  <Input className={inputCls} value={formData.fullName} onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))} />
                </Field>
                <Field label="Email">
                  <Input type="email" className={inputCls} value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} />
                </Field>
                <Field label="Date of Birth">
                  <Input type="date" className={inputCls} value={formData.dateOfBirth} onChange={(e) => setFormData((p) => ({ ...p, dateOfBirth: e.target.value }))} />
                </Field>
                <Field label="Gender" required>
                  <Select value={formData.gender} onValueChange={(v) => setFormData((p) => ({ ...p, gender: v }))}>
                    <SelectTrigger className={inputCls}><SelectValue placeholder="Select Gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Phone" required>
                  <div className="relative">
                    <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input className={`${inputCls} pl-9`} value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} />
                  </div>
                </Field>
                <Field label="Address">
                  <Input className={inputCls} value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} />
                </Field>
                <Field label="Assigned Doctor">
                  <Select value={formData.assignedDoctorId} onValueChange={(v) => setFormData((p) => ({ ...p, assignedDoctorId: v }))}>
                    <SelectTrigger className={inputCls}><SelectValue placeholder="Select doctor (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {doctors.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.user?.fullName || 'Doctor'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </>
          )}

          {activeTab === 2 && (
            <>
              <SectionHeader icon={FileText} title="Medical Information" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-5">
                <Field label="Blood Type">
                  <Select value={formData.bloodGroup} onValueChange={(v) => setFormData((p) => ({ ...p, bloodGroup: v }))}>
                    <SelectTrigger className={inputCls}><SelectValue placeholder="Select Blood Type" /></SelectTrigger>
                    <SelectContent>
                      {BLOOD_GROUPS.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Allergies">
                  <Input className={inputCls} value={formData.allergies} onChange={(e) => setFormData((p) => ({ ...p, allergies: e.target.value }))} placeholder="e.g., Penicillin, Peanuts" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Current Medications">
                    <Textarea className={textareaCls} rows={4} value={formData.currentMedications} onChange={(e) => setFormData((p) => ({ ...p, currentMedications: e.target.value }))} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Medical History">
                    <Textarea className={textareaCls} rows={4} value={formData.medicalHistory} onChange={(e) => setFormData((p) => ({ ...p, medicalHistory: e.target.value }))} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Family Medical History">
                    <Textarea className={textareaCls} rows={4} value={formData.familyMedicalHistory} onChange={(e) => setFormData((p) => ({ ...p, familyMedicalHistory: e.target.value }))} />
                  </Field>
                </div>
              </div>
            </>
          )}

          {activeTab === 3 && (
            <>
              <SectionHeader icon={PhoneIcon} title="Emergency Contact" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-5">
                <Field label="Contact Name">
                  <Input className={inputCls} value={formData.emergencyContactName} onChange={(e) => setFormData((p) => ({ ...p, emergencyContactName: e.target.value }))} placeholder="Full Name" />
                </Field>
                <Field label="Relationship">
                  <Input className={inputCls} value={formData.emergencyContactRelationship} onChange={(e) => setFormData((p) => ({ ...p, emergencyContactRelationship: e.target.value }))} placeholder="e.g. Spouse, Parent" />
                </Field>
                <Field label="Phone Number">
                  <div className="relative">
                    <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input className={`${inputCls} pl-9`} value={formData.emergencyContactPhone} onChange={(e) => setFormData((p) => ({ ...p, emergencyContactPhone: e.target.value }))} placeholder="Phone Number" />
                  </div>
                </Field>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="px-8 py-5">
        <div className="flex items-center justify-between max-w-4xl">
          <div className="flex items-center gap-3">
            {TABS.map((tab, idx) => {
              const isActive = activeTab === tab.id;
              return (
                <div key={tab.id} className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                        : 'text-slate-400 hover:text-slate-600 bg-transparent'
                    }`}
                  >
                    {tab.id}. {tab.label}
                  </button>
                  {idx < TABS.length - 1 && <span className="text-slate-300 dark:text-slate-600 select-none">—</span>}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-6">
            <Button variant="outline" onClick={() => router.push(`/dashboard/patients/${id}`)} className="text-slate-600 border-slate-200 hover:bg-slate-50 font-medium px-5">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-semibold gap-2 px-6 shadow-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? 'Saving...' : 'Update Patient'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
