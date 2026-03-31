'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, ArrowLeft, Calendar, ClipboardList, Eye, FileText, Loader2, Pencil, Printer, TimerReset, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';

type AssessmentDiagnosis = {
  icdCode?: string;
  description?: string;
  eye?: string;
};

type AssessmentMedication = {
  name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  eye?: string;
};

type AssessmentFollowUp = {
  recommended?: boolean;
  interval?: string;
  reason?: string;
};

type AssessmentMeta = {
  diagnosisItems?: AssessmentDiagnosis[];
  medications?: AssessmentMedication[];
  followUp?: AssessmentFollowUp;
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(d);
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

function formatDoctorName(raw: string | null | undefined): string {
  if (!raw) return '—';
  const name = raw.trim();
  if (!name) return '—';
  const lower = name.toLowerCase();
  if (lower.startsWith('dr.') || lower.startsWith('dr ')) return name;
  return `Dr. ${name}`;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value ?? '—'}</p>
    </div>
  );
}

function SubField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value ?? '—'}</p>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
      <Icon className="h-4 w-4 text-slate-400" />
      {title}
    </h3>
  );
}

function readAssessmentMeta(value: unknown): AssessmentMeta | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const maybeMeta = (value as { _assessment?: unknown })._assessment;
  if (!maybeMeta || typeof maybeMeta !== 'object' || Array.isArray(maybeMeta)) return null;
  return maybeMeta as AssessmentMeta;
}

export default function ViewEyeExamPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [exam, setExam] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/eye-examinations/${id}`)
      .then((res) => setExam(res.data))
      .catch(() => toast.error('Failed to load examination'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );

  if (!exam) return null;

  const patient = exam.patient as { id?: string; fullName?: string; patientNumber?: string; dateOfBirth?: string | null } | undefined;
  const doctor = exam.doctor as { user?: { fullName?: string } } | undefined;
  const assessmentMeta = readAssessmentMeta(exam.anteriorSegmentFindings);
  const diagnosisRows = Array.isArray(assessmentMeta?.diagnosisItems) ? assessmentMeta.diagnosisItems : [];
  const medicationRows = Array.isArray(assessmentMeta?.medications) ? assessmentMeta.medications : [];
  const followUp = assessmentMeta?.followUp;

  const vaScaleRaw = typeof exam.vaScale === 'string' ? exam.vaScale : '';
  const vaScaleLabel = vaScaleRaw ? vaScaleRaw.toLowerCase() : 'snellen';

  const handleDelete = async () => {
    if (deleting) return;
    const ok = window.confirm('Delete this eye examination? This cannot be undone.');
    if (!ok) return;

    setDeleting(true);
    try {
      await api.delete(`/eye-examinations/${String(id)}`);
      toast.success('Eye examination deleted');
      router.push('/dashboard/eye-examinations');
    } catch {
      toast.error('Failed to delete examination');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-100 bg-white px-4 pb-4 pt-5 md:px-6 md:pt-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Eye Examination Details</h1>
        <p className="mt-1 text-sm text-slate-500">Exam for {patient?.fullName ?? '—'}</p>
      </div>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 md:px-6 md:py-6">
        <Link
          href="/dashboard/eye-examinations"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Examinations
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">Exam Date</p>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">{formatDate(exam.createdAt as string)}</h2>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button variant="outline" onClick={() => window.print()} className="h-10 w-full rounded-lg px-4 text-sm font-medium sm:w-auto">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button asChild className="h-10 w-full rounded-lg px-4 text-sm font-medium sm:w-auto">
              <Link href={`/dashboard/eye-examinations/${String(id)}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="h-10 w-full rounded-lg px-4 text-sm font-medium sm:w-auto">
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle icon={User} title="Patient Information" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Name" value={patient?.fullName ?? '—'} />
              <Field label="Patient ID" value={patient?.patientNumber ?? patient?.id ?? '—'} />
              <Field label="Date of Birth" value={formatDate(patient?.dateOfBirth)} />
              <div className="flex items-end">
                {patient?.id ? (
                  <Link href={`/dashboard/patients/${patient.id}`} className="text-sm font-semibold text-primary hover:underline">
                    View Patient Profile →
                  </Link>
                ) : (
                  <span className="text-sm text-slate-400">—</span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle icon={Calendar} title="Examination Info" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Exam Date" value={formatDate(exam.createdAt as string)} />
              <Field label="Examiner" value={formatDoctorName(doctor?.user?.fullName)} />
            </div>
            <div className="mt-5">
              <Field label="Chief Complaint" value={(exam.chiefComplaint as string) || '—'} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle icon={Eye} title={`Visual Acuity (${vaScaleLabel})`} />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-sm font-semibold text-slate-900">Uncorrected</p>
              <div className="grid grid-cols-2 gap-5">
                <SubField label="Distance OD" value={(exam.vaUnaidedOD as string) || '—'} />
                <SubField label="Distance OS" value={(exam.vaUnaidedOS as string) || '—'} />
                <SubField label="Near OD" value={(exam.vaUnaidedNearOD as string) || '—'} />
                <SubField label="Near OS" value={(exam.vaUnaidedNearOS as string) || '—'} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-emerald-50/40 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-900">Best Corrected (BCVA)</p>
              <div className="grid grid-cols-2 gap-5">
                <SubField label="Distance OD" value={(exam.vaBcvaOD as string) || '—'} />
                <SubField label="Distance OS" value={(exam.vaBcvaOS as string) || '—'} />
                <SubField label="Near OD" value={(exam.vaBcvaNearOD as string) || '—'} />
                <SubField label="Near OS" value={(exam.vaBcvaNearOS as string) || '—'} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-amber-50/40 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-900">Pinhole</p>
              <div className="grid grid-cols-2 gap-5">
                <SubField label="OD" value={(exam.vaPinholeOD as string) || '—'} />
                <SubField label="OS" value={(exam.vaPinholeOS as string) || '—'} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle icon={Activity} title="Intraocular Pressure (IOP)" />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">OD (Right Eye)</p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
                {(exam.iopOD as number | null) ?? '—'} <span className="text-base font-medium text-slate-700">mmHg</span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">OS (Left Eye)</p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
                {(exam.iopOS as number | null) ?? '—'} <span className="text-base font-medium text-slate-700">mmHg</span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Method</p>
              <p className="mt-2 text-lg font-semibold tracking-tight text-slate-900">{(exam.iopMethod as string) || '—'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle icon={ClipboardList} title="Diagnosis" />
          {diagnosisRows.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {diagnosisRows.map((row, index) => {
                const eye = (row.eye || 'OU').toUpperCase();
                const label = row.description || row.icdCode || 'Diagnosis';
                return (
                  <Badge key={`diag-${index}`} variant="secondary" className="gap-2 rounded-lg px-3 py-1.5 text-sm font-medium">
                    <span className="font-semibold">{eye}</span>
                    <span>{label}</span>
                  </Badge>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">—</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle icon={FileText} title="Treatment Plan" />
          <p className="text-sm font-semibold text-slate-900">{(exam.plan as string) || '—'}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle icon={TimerReset} title="Follow-up" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Interval" value={followUp?.interval || '—'} />
            <Field label="Reason" value={followUp?.reason || (exam.nextVisitReason as string) || '—'} />
          </div>
        </div>

        {Array.isArray(medicationRows) && medicationRows.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle icon={ClipboardList} title="Medications" />
            <div className="space-y-3">
              {medicationRows.map((row, index) => (
                <div key={`med-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900 uppercase">{row.name || 'Medication'}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {row.dosage || 'N/A'} · {row.frequency || 'N/A'} · {row.duration || 'N/A'} · {row.eye || 'OU'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-sm text-slate-400 text-center">Created: {formatDateTime(exam.createdAt as string)}</p>
      </div>
    </div>
  );
}
