'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import api from '@/lib/axios';
import EyeExamForm, { type EyeExamFormSubmitPayload } from '@/components/eye-examinations/eye-exam-form';

export default function NewEyeExamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);

  const stageParam = searchParams.get('stage');
  const patientId = searchParams.get('patientId');
  const patientName = searchParams.get('patientName');
  const appointmentId = searchParams.get('appointmentId');

  const stage: 'PRELIMINARY' | 'CLINICAL' | 'ALL' =
    stageParam === 'PRELIMINARY' ? 'PRELIMINARY' :
    stageParam === 'CLINICAL' ? 'CLINICAL' :
    'ALL';

  const initialData = patientId ? {
    patientId,
    patientName: patientName || undefined,
  } : null;

  // Determine cancel/back URL based on which stage we came from
  const cancelHref =
    stage === 'PRELIMINARY' ? '/dashboard/eye-examinations/preliminary' :
    stage === 'CLINICAL' ? '/dashboard/eye-examinations/clinical' :
    '/dashboard/eye-examinations';

  const handleSubmit = async (payload: EyeExamFormSubmitPayload) => {
    setSubmitting(true);
    try {
      // Set the stage on the payload so backend knows which stage
      const finalPayload = { ...payload };
      if (stage === 'PRELIMINARY') finalPayload.stage = 'PRELIMINARY';
      // If we are in CLINICAL, the EyeExamForm already set it to COMPLETED in the payload, 
      // but we should respect that or explicitly set it here if diagnosis/plan are present.
      if (stage === 'CLINICAL' && !finalPayload.stage) finalPayload.stage = 'COMPLETED';

      const res = await api.post('/eye-examinations', finalPayload);
      toast.success('Examination created successfully');
      router.push(`/dashboard/eye-examinations/${res.data.id}`);
      return res.data;
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || 'Failed to create examination');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <EyeExamForm
          mode="create"
          submitting={submitting}
          onSubmit={handleSubmit}
          cancelHref={cancelHref}
          stage={stage}
          initialData={initialData}
          appointmentId={appointmentId || undefined}
        />
      </div>
    </div>
  );
}
