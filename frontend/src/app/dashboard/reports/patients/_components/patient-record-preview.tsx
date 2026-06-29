'use client';

import { type ElementType } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  User, Eye, Pill, Glasses, Scissors, CalendarDays, CreditCard, Loader2,
} from 'lucide-react';
import { aggregateMedications, type ReportPatient } from '@/lib/patient-report';

function fmtDate(v?: string | null) {
  if (!v) return '-';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

function lv(v?: string | null) {
  return (v || '').trim() || '-';
}

function Block({ title, icon: Icon, count, children }: { title: string; icon: ElementType; count?: number; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#0EA5E9]" />
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">{title}</h3>
        </div>
        {count !== undefined && <Badge variant="secondary" className="text-[10px]">{count}</Badge>}
      </div>
      <div className="p-3 overflow-x-auto">{children}</div>
    </div>
  );
}

function Tbl({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (!rows.length) return <p className="text-xs text-slate-400 py-4 text-center">No records</p>;
  return (
    <table className="min-w-full text-xs">
      <thead>
        <tr className="border-b text-[10px] font-semibold text-slate-500 uppercase">
          {headers.map((h) => <th key={h} className="px-2 py-1.5 text-left whitespace-nowrap">{h}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((c, j) => <td key={j} className="px-2 py-2 text-slate-700 dark:text-slate-300">{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type Props = { patient: ReportPatient | null; loading: boolean };

export default function PatientRecordPreview({ patient, loading }: Props) {
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#0EA5E9]" />
      </div>
    );
  }
  if (!patient) {
    return <p className="text-sm text-slate-400 text-center py-12">Select a patient to view their record</p>;
  }

  const meds = aggregateMedications(patient);
  const billTotal = (patient.billings || []).reduce((s, b) => s + (Number(b.finalAmount) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 report-no-print">
        {[
          { label: 'Visits', value: patient.appointments?.length ?? 0 },
          { label: 'Exams', value: patient.eyeExaminations?.length ?? 0 },
          { label: 'Medications', value: meds.length },
          { label: 'Optical', value: patient.opticalPrescriptions?.length ?? 0 },
          { label: 'Surgeries', value: patient.surgeries?.length ?? 0 },
          { label: 'Billed', value: `$${billTotal.toFixed(0)}` },
        ].map((k) => (
          <div key={k.label} className="rounded-lg border p-2.5 text-center">
            <p className="text-sm font-bold text-slate-900 dark:text-white">{k.value}</p>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">{k.label}</p>
          </div>
        ))}
      </div>

      <Block title="Patient Info" icon={User}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {[
            ['ID', lv(patient.patientNumber)], ['Gender', lv(patient.gender)],
            ['Phone', lv(patient.phone)], ['DOB', fmtDate(patient.dateOfBirth)],
            ['Blood', lv(patient.bloodGroup)], ['Allergies', lv(patient.allergies)],
            ['Registered', fmtDate(patient.createdAt)], ['Branch', lv(patient.branch?.branchName)],
          ].map(([l, v]) => (
            <div key={l} className="p-2 rounded bg-slate-50 dark:bg-slate-900/40">
              <p className="text-[10px] text-slate-400 uppercase font-bold">{l}</p>
              <p className="font-medium mt-0.5">{v}</p>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Visits" icon={CalendarDays} count={patient.appointments?.length ?? 0}>
        <Tbl
          headers={['Date', 'Doctor', 'Diagnosis', 'Status']}
          rows={(patient.appointments || []).map((a) => [
            fmtDate(a.appointmentDate), a.doctor?.user?.fullName || '-',
            a.clinicalExamination?.diagnosis || a.notes || 'Consultation', a.status || '-',
          ])}
        />
      </Block>

      <Block title="Eye Examinations" icon={Eye} count={patient.eyeExaminations?.length ?? 0}>
        <Tbl
          headers={['Date', 'Doctor', 'Complaint', 'Diagnosis', 'VA OD/OS']}
          rows={(patient.eyeExaminations || []).map((e) => [
            fmtDate(e.createdAt), e.doctor?.user?.fullName || '-', lv(e.chiefComplaint),
            lv(e.diagnosis), `${e.vaUnaidedOD || '-'}/${e.vaUnaidedOS || '-'}`,
          ])}
        />
      </Block>

      <Block title="Medications" icon={Pill} count={meds.length}>
        <Tbl
          headers={['Date', 'Item', 'Qty', 'Status']}
          rows={meds.map((m) => [fmtDate(m.createdAt), m.itemName || m.itemType, String(m.quantity), m.status])}
        />
      </Block>

      <Block title="Optical Prescriptions" icon={Glasses} count={patient.opticalPrescriptions?.length ?? 0}>
        <Tbl
          headers={['Date', 'OD', 'OS', 'Status']}
          rows={(patient.opticalPrescriptions || []).map((o) => [
            fmtDate(o.createdAt),
            `${o.odSphere || '-'}/${o.odCylinder || '-'}`,
            `${o.osSphere || '-'}/${o.osCylinder || '-'}`,
            o.status,
          ])}
        />
      </Block>

      <Block title="Surgeries" icon={Scissors} count={patient.surgeries?.length ?? 0}>
        <Tbl
          headers={['Date', 'Type', 'Eye', 'Surgeon', 'Status']}
          rows={(patient.surgeries || []).map((s) => [
            fmtDate(s.date), s.surgeryType, s.eye, s.surgeon?.user?.fullName || '-', s.status,
          ])}
        />
      </Block>

      <Block title="Billing" icon={CreditCard} count={patient.billings?.length ?? 0}>
        <Tbl
          headers={['Date', 'Service', 'Amount', 'Status']}
          rows={(patient.billings || []).map((b) => [
            fmtDate(b.createdAt), b.serviceType, `$${(Number(b.finalAmount) || 0).toFixed(2)}`, b.status,
          ])}
        />
      </Block>
    </div>
  );
}
