import { redirect } from 'next/navigation';

export default function NewPatientCompatPage() {
  redirect('/dashboard/patients?new=1');
}
