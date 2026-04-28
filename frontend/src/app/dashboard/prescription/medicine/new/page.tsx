'use client';

import { useSearchParams } from 'next/navigation';
import MedicinePrescriptionForm from '../_components/medicine-prescription-form';

export default function NewMedicinePrescriptionPage() {
  const searchParams = useSearchParams();
  const examId = searchParams.get('examId') || '';

  return <MedicinePrescriptionForm mode="create" preselectedExamId={examId} />;
}
