'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/axios';
import EyeExamForm, {
  type EyeExamFormInitialData,
  type EyeExamFormSubmitPayload,
} from '@/components/eye-examinations/eye-exam-form';

type EyeExamApiResponse = {
  patientId?: string;
  doctorId?: string;
  chiefComplaint?: string | null;
  historyOfPresentIllness?: string | null;
  vaScale?: string | null;
  vaUnaidedOD?: string | null;
  vaUnaidedOS?: string | null;
  vaUnaidedNearOD?: string | null;
  vaUnaidedNearOS?: string | null;
  vaBcvaOD?: string | null;
  vaBcvaOS?: string | null;
  vaBcvaNearOD?: string | null;
  vaBcvaNearOS?: string | null;
  vaPinholeOD?: string | null;
  vaPinholeOS?: string | null;
  refractionSphereOD?: string | null;
  refractionSphereOS?: string | null;
  refractionCylinderOD?: string | null;
  refractionCylinderOS?: string | null;
  refractionAxisOD?: string | null;
  refractionAxisOS?: string | null;
  iopOD?: number | null;
  iopOS?: number | null;
  iopMethod?: string | null;
  iopTime?: string | null;
  targetIopOD?: number | null;
  targetIopOS?: number | null;
  diagnosis?: string | null;
  plan?: string | null;
  nextVisitReason?: string | null;
  anteriorSegmentFindings?: unknown;
  fundusFindings?: unknown;
  patient?: {
    fullName?: string | null;
  } | null;
};

export default function EditEyeExamPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [initialData, setInitialData] = useState<EyeExamFormInitialData | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    api
      .get(`/eye-examinations/${id}`)
      .then((res: { data: EyeExamApiResponse }) => {
        const exam = res.data;
        setInitialData({
          patientId: exam.patientId,
          patientName: exam.patient?.fullName ?? '',
          doctorId: exam.doctorId,
          chiefComplaint: exam.chiefComplaint,
          historyOfPresentIllness: exam.historyOfPresentIllness,
          vaScale: exam.vaScale,
          vaUnaidedOD: exam.vaUnaidedOD,
          vaUnaidedOS: exam.vaUnaidedOS,
          vaUnaidedNearOD: exam.vaUnaidedNearOD,
          vaUnaidedNearOS: exam.vaUnaidedNearOS,
          vaBcvaOD: exam.vaBcvaOD,
          vaBcvaOS: exam.vaBcvaOS,
          vaBcvaNearOD: exam.vaBcvaNearOD,
          vaBcvaNearOS: exam.vaBcvaNearOS,
          vaPinholeOD: exam.vaPinholeOD,
          vaPinholeOS: exam.vaPinholeOS,
          refractionSphereOD: exam.refractionSphereOD,
          refractionSphereOS: exam.refractionSphereOS,
          refractionCylinderOD: exam.refractionCylinderOD,
          refractionCylinderOS: exam.refractionCylinderOS,
          refractionAxisOD: exam.refractionAxisOD,
          refractionAxisOS: exam.refractionAxisOS,
          iopOD: exam.iopOD,
          iopOS: exam.iopOS,
          iopMethod: exam.iopMethod,
          iopTime: exam.iopTime,
          targetIopOD: exam.targetIopOD,
          targetIopOS: exam.targetIopOS,
          diagnosis: exam.diagnosis,
          plan: exam.plan,
          nextVisitReason: exam.nextVisitReason,
          anteriorSegmentFindings: exam.anteriorSegmentFindings,
          fundusFindings: exam.fundusFindings,
        });
      })
      .catch(() => toast.error('Failed to load examination'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (payload: EyeExamFormSubmitPayload) => {
    if (!id) return;

    setSubmitting(true);
    try {
      await api.put(`/eye-examinations/${id}`, payload);
      toast.success('Examination updated successfully');
      router.push(`/dashboard/eye-examinations/${id}`);
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || 'Failed to update examination');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !initialData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <EyeExamForm
          mode="edit"
          initialData={initialData}
          submitting={submitting}
          onSubmit={handleSubmit}
          cancelHref={`/dashboard/eye-examinations/${id}`}
        />
      </div>
    </div>
  );
}
