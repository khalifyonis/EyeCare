'use client';

import { useSearchParams } from 'next/navigation';
import MedicinePrescriptionForm from '../_components/medicine-prescription-form';

export default function NewMedicinePrescriptionPage() {
  const searchParams = useSearchParams();
  const examId = searchParams.get('examId') || '';
  const patientId = searchParams.get('patientId') || '';
  const patientName = searchParams.get('patientName') || '';

  return (
    <MedicinePrescriptionForm
      mode="create"
      preselectedExamId={examId}
      preselectedPatientId={patientId}
      preselectedPatientName={patientName}
    />
  );
}
