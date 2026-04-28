'use client';

import { CalendarPlus, Edit, Mail, MapPin, Phone, Trash2, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type PatientDetailsData = {
  id: string;
  patientNumber?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  bloodGroup?: string | null;
  allergies?: string | null;
  currentMedications?: string | null;
  medicalHistory?: string | null;
  familyMedicalHistory?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
};

type PatientDetailsProps = {
  patient: PatientDetailsData | null;
  loading: boolean;
  canManage: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onBookAppointment: () => void;
};

function labelValue(value?: string | null) {
  const text = (value || '').trim();
  return text || 'N/A';
}

function formatGender(value?: string | null) {
  const g = String(value || '').toUpperCase();
  if (g === 'MALE') return 'Male';
  if (g === 'FEMALE') return 'Female';
  return 'N/A';
}

function toDateInputValue(value?: string | null) {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }).format(d);
}

export default function PatientDetails({
  patient,
  loading,
  canManage,
  onBack,
  onEdit,
  onDelete,
  onBookAppointment,
}: PatientDetailsProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950">
        Loading patient details...
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950">
        Patient not found.
      </div>
    );
  }

  const fullName = labelValue(patient.fullName || [patient.firstName, patient.lastName].filter(Boolean).join(' '));
  const location = [patient.address, patient.city, patient.state].filter(Boolean).join(', ');

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{fullName}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Patient ID: {labelValue(patient.patientNumber || patient.id)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button variant="outline" onClick={onBookAppointment}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            Book
          </Button>
          {canManage && (
            <>
              <Button variant="outline" onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200"><User className="h-4 w-4 text-slate-400" /> {fullName}</div>
            <div className="text-slate-600 dark:text-slate-300">Gender: {formatGender(patient.gender)}</div>
            <div className="text-slate-600 dark:text-slate-300">Date of Birth: {toDateInputValue(patient.dateOfBirth)}</div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><Phone className="h-4 w-4 text-slate-400" /> {labelValue(patient.phone)}</div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><Mail className="h-4 w-4 text-slate-400" /> {labelValue(patient.email)}</div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><MapPin className="h-4 w-4 text-slate-400" /> {labelValue(location)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Medical Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div>Blood Group: {labelValue(patient.bloodGroup)}</div>
            <div>Allergies: {labelValue(patient.allergies)}</div>
            <div>Current Medications: {labelValue(patient.currentMedications)}</div>
            <div>Medical History: {labelValue(patient.medicalHistory)}</div>
            <div>Family Medical History: {labelValue(patient.familyMedicalHistory)}</div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
            <div>Name: {labelValue(patient.emergencyContactName)}</div>
            <div>Relationship: {labelValue(patient.emergencyContactRelationship)}</div>
            <div>Phone: {labelValue(patient.emergencyContactPhone)}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
