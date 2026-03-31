'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import api from '@/lib/axios';
import EyeExamForm, { type EyeExamFormSubmitPayload } from '@/components/eye-examinations/eye-exam-form';

export default function NewEyeExamPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (payload: EyeExamFormSubmitPayload) => {
    setSubmitting(true);
    try {
      const res = await api.post('/eye-examinations', payload);
      toast.success('Examination created successfully');
      router.push(`/dashboard/eye-examinations/${res.data.id}`);
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
        <EyeExamForm mode="create" submitting={submitting} onSubmit={handleSubmit} cancelHref="/dashboard/eye-examinations" />
      </div>
    </div>
  );
}
