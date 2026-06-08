'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, ArrowLeft, Calendar, ClipboardList, Eye, FileText, Glasses, Loader2, Pencil, Printer, TimerReset, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { hasPermission } from '@/lib/permissions';

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
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
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

  const stage = (exam.stage as string) || 'PRELIMINARY';
  const editLink = `/dashboard/eye-examinations/${String(id)}/edit?stage=${stage === 'COMPLETED' ? 'CLINICAL' : stage}`;

  const canEditPreliminary = hasPermission('preliminary_exams', 'canUpdate');
  const canEditClinical = hasPermission('clinical_exams', 'canUpdate');
  const canDeleteExam = hasPermission('preliminary_exams', 'canDelete') || hasPermission('clinical_exams', 'canDelete');
  const canReadClinical = hasPermission('clinical_exams', 'canRead');
  const canEdit = stage === 'PRELIMINARY' ? canEditPreliminary : canEditClinical;

  const anterior = exam.anteriorSegmentFindings as any;
  const fundus = exam.fundusFindings as any;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-100 bg-white px-4 pb-4 pt-5 md:px-6 md:pt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Eye Examination Details</h1>
            <p className="mt-1 text-sm text-slate-500">Exam for {patient?.fullName ?? '—'}</p>
          </div>
          <Badge variant="outline" className={cn(
            "h-7 px-3 text-xs font-bold uppercase tracking-wider",
            stage === 'PRELIMINARY' ? "bg-blue-50 text-blue-700 border-blue-200" :
            stage === 'CLINICAL' ? "bg-amber-50 text-amber-700 border-amber-200" :
            "bg-emerald-50 text-emerald-700 border-emerald-200"
          )}>
            {stage} STAGE
          </Badge>
        </div>
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
            {canEdit && (
              <Button asChild className="h-10 w-full rounded-lg px-4 text-sm font-medium sm:w-auto bg-[#0EA5E9] hover:bg-[#0284C7] text-white border-0">
                <Link href={editLink}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
            )}
            {canDeleteExam && (
              <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="h-10 w-full rounded-lg px-4 text-sm font-medium sm:w-auto">
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            )}
          </div>
        </div>

        {/* ── STAGE 1: PRELIMINARY ─────────────────────────────────── */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 px-1">
            <Badge className="bg-blue-600 text-white border-0 h-6 w-6 flex items-center justify-center p-0 rounded-full font-bold">1</Badge>
            <h2 className="text-lg font-bold text-slate-900">Preliminary Stage Findings</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionTitle icon={User} title="Patient & Basic Info" />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Name" value={patient?.fullName ?? '—'} />
                <Field label="Patient ID" value={patient?.patientNumber ?? patient?.id ?? '—'} />
                <div className="col-span-full">
                  <Field label="Chief Complaint" value={(exam.chiefComplaint as string) || '—'} />
                </div>
                <div className="col-span-full">
                  <Field label="History of Present Illness" value={(exam.historyOfPresentIllness as string) || '—'} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionTitle icon={Activity} title="IOP & Intraocular Pressure" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">OD (Right)</p>
                  <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
                    {(exam.iopOD as number | null) ?? '—'} <span className="text-base font-medium text-slate-700">mmHg</span>
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">OS (Left)</p>
                  <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
                    {(exam.iopOS as number | null) ?? '—'} <span className="text-base font-medium text-slate-700">mmHg</span>
                  </p>
                </div>
                <div className="col-span-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex justify-between items-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Method</p>
                  <p className="text-sm font-semibold text-slate-900">{(exam.iopMethod as string) || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionTitle icon={Glasses} title="Refraction Findings" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">OD (Right)</p>
                  <div className="grid grid-cols-3 gap-2">
                    <SubField label="Sph" value={(exam.refractionSphereOD as string) || '—'} />
                    <SubField label="Cyl" value={(exam.refractionCylinderOD as string) || '—'} />
                    <SubField label="Axis" value={(exam.refractionAxisOD as string) || '—'} />
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">OS (Left)</p>
                  <div className="grid grid-cols-3 gap-2">
                    <SubField label="Sph" value={(exam.refractionSphereOS as string) || '—'} />
                    <SubField label="Cyl" value={(exam.refractionCylinderOS as string) || '—'} />
                    <SubField label="Axis" value={(exam.refractionAxisOS as string) || '—'} />
                  </div>
                </div>
              </div>
            </div>

            {!!exam.opticalPrescriptions && (exam.opticalPrescriptions as any[]).length > 0 && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/20 p-6 shadow-sm">
                <SectionTitle icon={FileText} title="Optical Prescription" />
                <div className="space-y-4">
                  {(exam.opticalPrescriptions as any[]).map((rx, idx) => (
                    <div key={idx} className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0">
                          {rx.type}
                        </Badge>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          Valid {rx.validityMonths} Months
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">OD Add / PD</p>
                          <p className="text-sm font-bold text-slate-900">{rx.odAdd || '—'} / {rx.odPd || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">OS Add / PD</p>
                          <p className="text-sm font-bold text-slate-900">{rx.osAdd || '—'} / {rx.osPd || '—'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle icon={Eye} title={`Visual Acuity (${vaScaleLabel})`} />
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-3 text-sm font-semibold text-slate-900">Uncorrected</p>
                <div className="grid grid-cols-2 gap-5">
                  <SubField label="Dist OD" value={(exam.vaUnaidedOD as string) || '—'} />
                  <SubField label="Dist OS" value={(exam.vaUnaidedOS as string) || '—'} />
                  <SubField label="Near OD" value={(exam.vaUnaidedNearOD as string) || '—'} />
                  <SubField label="Near OS" value={(exam.vaUnaidedNearOS as string) || '—'} />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-emerald-50/40 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-900">Best Corrected (BCVA)</p>
                <div className="grid grid-cols-2 gap-5">
                  <SubField label="Dist OD" value={(exam.vaBcvaOD as string) || '—'} />
                  <SubField label="Dist OS" value={(exam.vaBcvaOS as string) || '—'} />
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
        </div>

        {/* ── STAGE 2: CLINICAL ────────────────────────────────────── */}
        {stage !== 'PRELIMINARY' && canReadClinical && (
          <div className="space-y-5 pt-4">
            <div className="flex items-center gap-2 px-1">
              <Badge className="bg-amber-600 text-white border-0 h-6 w-6 flex items-center justify-center p-0 rounded-full font-bold">2</Badge>
              <h2 className="text-lg font-bold text-slate-900">Clinical Stage Evaluation</h2>
            </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionTitle icon={ClipboardList} title="Anterior Segment Findings" />
              {anterior ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <SubField label="Cornea OD" value={anterior.cornea?.OD} />
                    <SubField label="Cornea OS" value={anterior.cornea?.OS} />
                    <SubField label="Iris OD" value={anterior.iris?.OD} />
                    <SubField label="Iris OS" value={anterior.iris?.OS} />
                    <SubField label="Lens OD" value={anterior.lens?.OD} />
                    <SubField label="Lens OS" value={anterior.lens?.OS} />
                  </div>
                  {anterior.notes && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-[11px] font-semibold uppercase text-slate-500">Notes</p>
                      <p className="mt-1 text-sm text-slate-700">{anterior.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No anterior segment data recorded</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionTitle icon={Eye} title="Fundus Examination" />
              {fundus ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <SubField label="Optic Disc OD" value={fundus.opticDisc?.OD} />
                    <SubField label="Optic Disc OS" value={fundus.opticDisc?.OS} />
                    <SubField label="Macula OD" value={fundus.macula?.OD} />
                    <SubField label="Macula OS" value={fundus.macula?.OS} />
                  </div>
                  {fundus.notes && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-[11px] font-semibold uppercase text-slate-500">Notes</p>
                      <p className="mt-1 text-sm text-slate-700">{fundus.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No fundus data recorded</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionTitle icon={ClipboardList} title="Diagnosis & Assessment" />
              <div className="space-y-5">
                {diagnosisRows.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {diagnosisRows.map((row, index) => (
                      <Badge key={`diag-${index}`} variant="secondary" className="gap-2 rounded-lg px-3 py-1.5 text-sm font-medium bg-emerald-50 text-emerald-700 border-emerald-100">
                        <span className="font-bold">{(row.eye || 'OU').toUpperCase()}</span>
                        <span>{row.description || row.icdCode || 'Diagnosis'}</span>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">—</p>
                )}
                <Field label="Treatment Plan" value={(exam.plan as string) || '—'} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionTitle icon={TimerReset} title="Follow-up & Next Steps" />
              {followUp?.recommended ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Interval" value={followUp?.interval || '—'} />
                  <Field label="Reason" value={followUp?.reason || (exam.nextVisitReason as string) || '—'} />
                  <div className="col-span-full">
                    <Field label="Target IOP" value={
                      exam.targetIopOD || exam.targetIopOS 
                        ? `OD ${exam.targetIopOD ?? '—'} | OS ${exam.targetIopOS ?? '—'} mmHg`
                        : '—'
                    } />
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-sm font-medium text-slate-400 italic">Follow-up not required at this stage</p>
                </div>
              )}
            </div>
          </div>

          {Array.isArray(medicationRows) && medicationRows.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionTitle icon={ClipboardList} title="Medications" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {medicationRows.map((row, index) => (
                  <div key={`med-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-bold text-slate-900 uppercase">{row.name || 'Medication'}</p>
                    <p className="mt-1 text-xs text-slate-600 font-medium">
                      {[row.dosage, row.frequency, row.duration, (row.eye && !['N/A', 'NONE'].includes(row.eye.toUpperCase())) ? row.eye : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

        <p className="text-sm text-slate-400 text-center pb-8">Record ID: {exam.id as string} · Created: {formatDateTime(exam.createdAt as string)}</p>
      </div>
    </div>
  );
}
