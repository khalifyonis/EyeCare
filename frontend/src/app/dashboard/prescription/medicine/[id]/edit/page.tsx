'use client';

import { useParams } from 'next/navigation';
import MedicinePrescriptionForm from '../../_components/medicine-prescription-form';

export default function EditMedicinePrescriptionPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';

  return <MedicinePrescriptionForm mode="edit" id={id} />;
}
