import { jsPDF } from 'jspdf';
import api from '@/lib/axios';

/* ── Shared types for report generation ── */
export type ReportPrescription = {
  id: string;
  itemType: string;
  itemName?: string;
  quantity: number;
  instructions?: string;
  status: string;
  dispensedAt?: string;
  createdAt: string;
};

export type ReportPatient = {
  id: string;
  createdAt?: string;
  patientNumber?: string;
  fullName?: string;
  gender?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  bloodGroup?: string;
  allergies?: string;
  chiefComplaint?: string;
  currentMedications?: string;
  medicalHistory?: string;
  familyMedicalHistory?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  branch?: { branchName?: string };
  appointments?: Array<{
    id: string;
    appointmentDate?: string;
    type?: string;
    status?: string;
    notes?: string;
    bookingNumber?: string;
    doctor?: { user?: { fullName?: string } };
    clinicalExamination?: {
      diagnosis?: string;
      managementPlan?: string;
      nextReviewDate?: string;
      sphRight?: number;
      cylRight?: number;
      axisRight?: number;
      sphLeft?: number;
      cylLeft?: number;
      axisLeft?: number;
      examinedBy?: { user?: { fullName?: string } };
      prescriptions?: ReportPrescription[];
      surgery?: {
        id?: string;
        eye?: string;
        surgeryType?: string;
        date?: string;
        cost?: number;
        status?: string;
        notes?: string;
        procedure?: string;
        anesthesiaType?: string;
        surgeon?: { user?: { fullName?: string } };
      };
    };
    erExamination?: {
      vaRight?: string;
      vaLeft?: string;
      iopRight?: number;
      iopLeft?: number;
    };
    prescriptions?: ReportPrescription[];
  }>;
  eyeExaminations?: Array<{
    id: string;
    chiefComplaint?: string;
    historyOfPresentIllness?: string;
    vaUnaidedOD?: string;
    vaUnaidedOS?: string;
    vaBcvaOD?: string;
    vaBcvaOS?: string;
    iopOD?: number;
    iopOS?: number;
    iopMethod?: string;
    diagnosis?: string;
    plan?: string;
    stage?: string;
    createdAt: string;
    doctor?: { user?: { fullName?: string } };
    prescriptions?: ReportPrescription[];
  }>;
  opticalPrescriptions?: Array<{
    id: string;
    type: string;
    status: string;
    odSphere?: string;
    odCylinder?: string;
    odAxis?: number;
    osSphere?: string;
    osCylinder?: string;
    osAxis?: number;
    lensType?: string;
    lensMaterial?: string;
    frameType?: string;
    notes?: string;
    createdAt: string;
    createdBy?: { fullName?: string };
  }>;
  surgeries?: Array<{
    id: string;
    eye: string;
    surgeryType: string;
    date: string;
    cost: number;
    status: string;
    notes?: string;
    procedure?: string;
    anesthesiaType?: string;
    operatingRoom?: string;
    surgeon?: { user?: { fullName?: string } };
  }>;
  billings?: Array<{
    id: string;
    serviceType: string;
    totalAmount: number;
    discount?: number;
    finalAmount: number;
    paymentMethod?: string;
    status: string;
    invoiceNumber?: string;
    createdAt: string;
  }>;
};

function fmtDate(v?: string | null) {
  if (!v) return 'N/A';
  const d = new Date(v);
  if (isNaN(d.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

function lv(v?: string | null) {
  return (v || '').trim() || 'N/A';
}

/** jsPDF standard fonts only support Latin-1; strip/replace Unicode that causes render errors */
function pdfStr(v?: string | null | number | unknown): string {
  if (v == null || v === '') return 'N/A';
  const s = String(v).trim() || 'N/A';
  return s
    .replace(/\u2014/g, '-')
    .replace(/\u2013/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\u0000-\u00FF]/g, '?');
}

function pdfMoney(v: unknown): string {
  const n = Number(v);
  return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

function num(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

/** Normalize API patient payload (Prisma decimals, nested shapes) for PDF generation */
export function normalizePatient(raw: unknown): ReportPatient {
  const p = raw as ReportPatient;
  return {
    ...p,
    appointments: (p.appointments || []).map((apt) => ({
      ...apt,
      clinicalExamination: apt.clinicalExamination
        ? {
            ...apt.clinicalExamination,
            sphRight: num(apt.clinicalExamination.sphRight),
            cylRight: num(apt.clinicalExamination.cylRight),
            axisRight: num(apt.clinicalExamination.axisRight),
            sphLeft: num(apt.clinicalExamination.sphLeft),
            cylLeft: num(apt.clinicalExamination.cylLeft),
            axisLeft: num(apt.clinicalExamination.axisLeft),
            surgery: apt.clinicalExamination.surgery
              ? {
                  ...apt.clinicalExamination.surgery,
                  cost: num(apt.clinicalExamination.surgery.cost) ?? 0,
                }
              : undefined,
          }
        : undefined,
      erExamination: apt.erExamination
        ? {
            ...apt.erExamination,
            iopRight: num(apt.erExamination.iopRight),
            iopLeft: num(apt.erExamination.iopLeft),
          }
        : undefined,
    })),
    eyeExaminations: (p.eyeExaminations || []).map((e) => ({
      ...e,
      iopOD: num(e.iopOD),
      iopOS: num(e.iopOS),
    })),
    opticalPrescriptions: (p.opticalPrescriptions || []).map((o) => ({
      ...o,
      odSphere: str(o.odSphere),
      odCylinder: str(o.odCylinder),
      odAxis: num(o.odAxis),
      osSphere: str(o.osSphere),
      osCylinder: str(o.osCylinder),
      osAxis: num(o.osAxis),
    })),
    surgeries: (p.surgeries || []).map((s) => ({
      ...s,
      cost: num(s.cost) ?? 0,
    })),
    billings: (p.billings || []).map((b) => ({
      ...b,
      totalAmount: num(b.totalAmount) ?? 0,
      discount: num(b.discount),
      finalAmount: num(b.finalAmount) ?? 0,
    })),
  };
}

/** Fetch latest patient data and download the complete medical record PDF */
export async function downloadPatientMedicalRecord(patientId: string): Promise<void> {
  const res = await api.get(`/patients/${patientId}`);
  const patient = normalizePatient(res.data);
  const medications = aggregateMedications(patient);
  generatePatientReportPdf(patient, medications);
}

function calcAge(dob?: string) {
  if (!dob) return 'N/A';
  const d = new Date(dob);
  if (isNaN(d.getTime())) return 'N/A';
  return String(Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
}

function sortAsc<T>(items: T[], key: (item: T) => string | undefined) {
  return [...items].sort((a, b) => {
    const da = new Date(key(a) || 0).getTime();
    const db = new Date(key(b) || 0).getTime();
    return da - db;
  });
}

function drawHeader(doc: jsPDF, title: string, patient: ReportPatient) {
  doc.setFillColor(14, 165, 233);
  doc.rect(0, 0, 210, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('AL-IXSAAN Eye Care', 14, 14);
  doc.setFontSize(11);
  doc.text(pdfStr(title), 14, 22);
  doc.setFontSize(9);
  doc.text(`Patient: ${pdfStr(patient.fullName)}  |  ID: ${pdfStr(patient.patientNumber)}`, 14, 30);
  doc.setTextColor(0, 0, 0);
  doc.text(`Generated: ${pdfStr(new Date().toLocaleString())}`, 130, 30);
  return 44;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 285) {
    doc.addPage();
    return 20;
  }
  return y;
}

function sectionTitle(doc: jsPDF, y: number, text: string): number {
  y = ensureSpace(doc, y, 14);
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y - 4, 182, 8, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(pdfStr(text), 16, y + 2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  return y + 10;
}

function bodyLine(doc: jsPDF, y: number, label: string, value: string, indent = 14): number {
  y = ensureSpace(doc, y, 8);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`${pdfStr(label)}:`, indent, y);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(pdfStr(value), 210 - indent - 50);
  doc.text(lines, indent + 42, y);
  return y + Math.max(5, lines.length * 4.5);
}

function paragraph(doc: jsPDF, y: number, text: string, indent = 14): number {
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(pdfStr(text), 182);
  y = ensureSpace(doc, y, lines.length * 4.5 + 2);
  doc.text(lines, indent, y);
  return y + lines.length * 4.5 + 3;
}

function tableRow(doc: jsPDF, y: number, cols: string[], widths: number[], bold = false): number {
  y = ensureSpace(doc, y, 7);
  doc.setFontSize(8);
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  let x = 14;
  cols.forEach((col, i) => {
    const w = widths[i];
    const lines = doc.splitTextToSize(pdfStr(col), w - 2);
    doc.text(lines, x, y);
    x += w;
  });
  doc.setFont('helvetica', 'normal');
  return y + 6;
}

export function aggregateMedications(patient: ReportPatient): ReportPrescription[] {
  const list: ReportPrescription[] = [];
  const add = (p: ReportPrescription) => {
    if (!list.some((x) => x.id === p.id)) list.push(p);
  };
  patient.appointments?.forEach((apt) => {
    apt.prescriptions?.forEach(add);
    apt.clinicalExamination?.prescriptions?.forEach(add);
  });
  patient.eyeExaminations?.forEach((ee) => {
    ee.prescriptions?.forEach(add);
  });
  return sortAsc(list, (p) => p.createdAt);
}

export function generatePatientReportPdf(patient: ReportPatient, medications: ReportPrescription[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = drawHeader(doc, 'Patient Medical Record - Complete History', patient);

  const appointments = sortAsc(patient.appointments || [], (a) => a.appointmentDate);
  const exams = sortAsc(patient.eyeExaminations || [], (e) => e.createdAt);
  const optical = sortAsc(patient.opticalPrescriptions || [], (o) => o.createdAt);
  const surgeries = sortAsc(patient.surgeries || [], (s) => s.date);
  const billings = sortAsc(patient.billings || [], (b) => b.createdAt);
  const totalBilled = billings.reduce((s, b) => s + (Number(b.finalAmount) || 0), 0);

  y = sectionTitle(doc, y, 'RECORD SUMMARY (Registration to Present)');
  y = tableRow(doc, y, ['Section', 'Count', 'Coverage'], [52, 22, 106], true);
  y = tableRow(doc, y, ['Patient Demographics', '1', 'Registration and contact details'], [52, 22, 106]);
  y = tableRow(doc, y, ['Medical Background', '1', 'Allergies, history, emergency contact'], [52, 22, 106]);
  y = tableRow(doc, y, ['Visit History', String(appointments.length), 'All appointments with clinical notes'], [52, 22, 106]);
  y = tableRow(doc, y, ['Eye Examinations', String(exams.length), 'Full exam findings and diagnosis'], [52, 22, 106]);
  y = tableRow(doc, y, ['Medicine Prescriptions', String(medications.length), 'All prescribed medications'], [52, 22, 106]);
  y = tableRow(doc, y, ['Optical Prescriptions', String(optical.length), 'Spectacle and lens prescriptions'], [52, 22, 106]);
  y = tableRow(doc, y, ['Surgeries', String(surgeries.length), 'Surgical procedures and outcomes'], [52, 22, 106]);
  y = tableRow(doc, y, ['Billing & Invoices', String(billings.length), `Total billed: ${pdfMoney(totalBilled)}`], [52, 22, 106]);
  y += 4;

  y = sectionTitle(doc, y, '1. PATIENT DEMOGRAPHICS');
  y = bodyLine(doc, y, 'Full Name', lv(patient.fullName));
  y = bodyLine(doc, y, 'Patient No.', lv(patient.patientNumber));
  y = bodyLine(doc, y, 'Gender / Age', `${lv(patient.gender)} / ${calcAge(patient.dateOfBirth)} years`);
  y = bodyLine(doc, y, 'Date of Birth', fmtDate(patient.dateOfBirth));
  y = bodyLine(doc, y, 'Phone', lv(patient.phone));
  y = bodyLine(doc, y, 'Email', lv(patient.email));
  y = bodyLine(doc, y, 'Address', [patient.address, patient.city, patient.state].filter(Boolean).join(', ') || 'N/A');
  y = bodyLine(doc, y, 'Branch', lv(patient.branch?.branchName));
  y = bodyLine(doc, y, 'Registered', fmtDate(patient.createdAt));
  if (patient.chiefComplaint) {
    y = bodyLine(doc, y, 'Chief Complaint', lv(patient.chiefComplaint));
  }
  y += 2;

  y = sectionTitle(doc, y, '2. MEDICAL BACKGROUND');
  y = bodyLine(doc, y, 'Blood Group', lv(patient.bloodGroup));
  y = bodyLine(doc, y, 'Allergies', lv(patient.allergies));
  y = bodyLine(doc, y, 'Current Medications', lv(patient.currentMedications));
  y = bodyLine(doc, y, 'Medical History', lv(patient.medicalHistory));
  y = bodyLine(doc, y, 'Family History', lv(patient.familyMedicalHistory));
  y = bodyLine(doc, y, 'Emergency Contact', `${lv(patient.emergencyContactName)} (${lv(patient.emergencyContactRelationship)}) - ${lv(patient.emergencyContactPhone)}`);
  y += 2;

  y = sectionTitle(doc, y, `3. VISIT HISTORY (${appointments.length} visits - earliest to latest)`);
  if (appointments.length === 0) {
    y = paragraph(doc, y, 'No appointments recorded.');
  } else {
    y = tableRow(doc, y, ['Date', 'Doctor', 'Type', 'Diagnosis', 'Status'], [24, 36, 22, 58, 32], true);
    appointments.forEach((apt, idx) => {
      const diag = apt.clinicalExamination?.diagnosis || apt.notes || 'Routine consultation';
      y = tableRow(doc, y, [
        fmtDate(apt.appointmentDate),
        apt.doctor?.user?.fullName || 'N/A',
        apt.type || 'Visit',
        diag,
        apt.status || 'N/A',
      ], [24, 36, 22, 58, 32]);
      if (apt.bookingNumber) {
        y = paragraph(doc, y, `   Booking: ${apt.bookingNumber}`, 16);
      }
      if (apt.notes && apt.clinicalExamination?.diagnosis) {
        y = paragraph(doc, y, `   Notes: ${apt.notes}`, 16);
      }
      if (apt.erExamination) {
        const er = apt.erExamination;
        y = paragraph(doc, y, `   Preliminary vitals - VA OD/OS: ${er.vaRight || '-'}/${er.vaLeft || '-'} | IOP OD/OS: ${er.iopRight ?? '-'}/${er.iopLeft ?? '-'} mmHg`, 16);
      }
      if (apt.clinicalExamination) {
        const ce = apt.clinicalExamination;
        y = paragraph(doc, y, `   Refraction OD: SPH ${ce.sphRight ?? '-'} CYL ${ce.cylRight ?? '-'} AXIS ${ce.axisRight ?? '-'} | OS: SPH ${ce.sphLeft ?? '-'} CYL ${ce.cylLeft ?? '-'} AXIS ${ce.axisLeft ?? '-'}`, 16);
        if (ce.managementPlan) {
          y = paragraph(doc, y, `   Management plan: ${ce.managementPlan}`, 16);
        }
        if (ce.nextReviewDate) {
          y = paragraph(doc, y, `   Next review: ${fmtDate(ce.nextReviewDate)}`, 16);
        }
        if (ce.surgery) {
          const sg = ce.surgery;
          y = paragraph(doc, y, `   Linked surgery: ${sg.surgeryType || 'N/A'} (${sg.eye || 'N/A'}) on ${fmtDate(sg.date)} - ${sg.status || 'N/A'}`, 16);
        }
      }
      if ((apt.prescriptions?.length ?? 0) > 0) {
        y = paragraph(doc, y, `   Prescriptions at visit: ${apt.prescriptions!.map((p) => p.itemName || p.itemType).join(', ')}`, 16);
      }
    });
  }
  y += 2;

  y = sectionTitle(doc, y, `4. EYE EXAMINATIONS (${exams.length} records)`);
  if (exams.length === 0) {
    y = paragraph(doc, y, 'No eye examinations recorded.');
  } else {
    exams.forEach((exam, idx) => {
      y = ensureSpace(doc, y, 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(pdfStr(`Exam ${idx + 1} - ${fmtDate(exam.createdAt)}`), 14, y);
      doc.setFont('helvetica', 'normal');
      y += 5;
      y = bodyLine(doc, y, 'Doctor', exam.doctor?.user?.fullName || 'N/A', 16);
      y = bodyLine(doc, y, 'Chief Complaint', lv(exam.chiefComplaint), 16);
      if (exam.historyOfPresentIllness) {
        y = bodyLine(doc, y, 'History', lv(exam.historyOfPresentIllness), 16);
      }
      y = bodyLine(doc, y, 'VA Unaided OD/OS', `${exam.vaUnaidedOD || '-'} / ${exam.vaUnaidedOS || '-'}`, 16);
      y = bodyLine(doc, y, 'BCVA OD/OS', `${exam.vaBcvaOD || '-'} / ${exam.vaBcvaOS || '-'}`, 16);
      y = bodyLine(doc, y, 'IOP OD/OS', `${exam.iopOD ?? '-'} / ${exam.iopOS ?? '-'} mmHg (${exam.iopMethod || 'N/A'})`, 16);
      y = bodyLine(doc, y, 'Diagnosis', lv(exam.diagnosis), 16);
      y = bodyLine(doc, y, 'Plan', lv(exam.plan), 16);
      if ((exam.prescriptions?.length ?? 0) > 0) {
        y = bodyLine(doc, y, 'Prescriptions', exam.prescriptions!.map((p) => `${p.itemName || p.itemType} x${p.quantity}`).join(', '), 16);
      }
      y += 2;
    });
  }

  y = sectionTitle(doc, y, `5. MEDICINE PRESCRIPTIONS (${medications.length} items)`);
  if (medications.length === 0) {
    y = paragraph(doc, y, 'No medicine prescriptions recorded.');
  } else {
    y = tableRow(doc, y, ['Date', 'Medication', 'Qty', 'Instructions', 'Status'], [24, 42, 14, 60, 42], true);
    medications.forEach((m) => {
      y = tableRow(doc, y, [
        fmtDate(m.createdAt),
        m.itemName || m.itemType,
        String(m.quantity),
        m.instructions || '-',
        m.status,
      ], [24, 42, 14, 60, 42]);
    });
  }
  y += 2;

  y = sectionTitle(doc, y, `6. OPTICAL PRESCRIPTIONS (${optical.length} records)`);
  if (optical.length === 0) {
    y = paragraph(doc, y, 'No optical prescriptions recorded.');
  } else {
    optical.forEach((rx, idx) => {
      y = ensureSpace(doc, y, 24);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(pdfStr(`Optical Rx ${idx + 1} - ${fmtDate(rx.createdAt)} (${rx.status})`), 14, y);
      doc.setFont('helvetica', 'normal');
      y += 5;
      y = bodyLine(doc, y, 'OD (SPH/CYL/AXIS)', `${rx.odSphere || '-'} / ${rx.odCylinder || '-'} / ${rx.odAxis ?? '-'}`, 16);
      y = bodyLine(doc, y, 'OS (SPH/CYL/AXIS)', `${rx.osSphere || '-'} / ${rx.osCylinder || '-'} / ${rx.osAxis ?? '-'}`, 16);
      y = bodyLine(doc, y, 'Lens / Frame', `${rx.lensType || '-'} / ${rx.frameType || '-'} (${rx.lensMaterial || 'N/A'})`, 16);
      if (rx.notes) y = bodyLine(doc, y, 'Notes', rx.notes, 16);
      y += 2;
    });
  }

  y = sectionTitle(doc, y, `7. SURGERIES (${surgeries.length} procedures)`);
  if (surgeries.length === 0) {
    y = paragraph(doc, y, 'No surgeries recorded.');
  } else {
    y = tableRow(doc, y, ['Date', 'Type', 'Eye', 'Surgeon', 'Status', 'Cost'], [24, 36, 16, 40, 28, 28], true);
    surgeries.forEach((s) => {
      y = tableRow(doc, y, [
        fmtDate(s.date),
        s.surgeryType,
        s.eye,
        s.surgeon?.user?.fullName || 'N/A',
        s.status,
        pdfMoney(s.cost),
      ], [24, 36, 16, 40, 28, 28]);
      if (s.procedure || s.anesthesiaType || s.notes) {
        const extra = [s.procedure && `Procedure: ${s.procedure}`, s.anesthesiaType && `Anesthesia: ${s.anesthesiaType}`, s.notes && `Notes: ${s.notes}`].filter(Boolean).join(' | ');
        y = paragraph(doc, y, `   ${extra}`, 16);
      }
    });
  }
  y += 2;

  y = sectionTitle(doc, y, `8. BILLING & INVOICES (${billings.length} records)`);
  if (billings.length === 0) {
    y = paragraph(doc, y, 'No billing records.');
  } else {
    y = tableRow(doc, y, ['Date', 'Invoice', 'Service', 'Amount', 'Status'], [24, 28, 50, 28, 32], true);
    let total = 0;
    billings.forEach((b) => {
      total += Number(b.finalAmount) || 0;
      y = tableRow(doc, y, [
        fmtDate(b.createdAt),
        b.invoiceNumber || '-',
        b.serviceType,
        pdfMoney(b.finalAmount),
        b.status,
      ], [24, 28, 50, 28, 32]);
    });
    y = bodyLine(doc, y, 'Total Billed', pdfMoney(total));
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(pdfStr(`AL-IXSAAN Eye Care - Confidential Patient Record - Page ${i} of ${pageCount}`), 14, 292);
  }

  const slug = (patient.fullName || 'patient').replace(/\s+/g, '-').toLowerCase();
  doc.save(`patient-record-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/** @deprecated Use generatePatientReportPdf */
export const generatePatientDetailedPdf = generatePatientReportPdf;

export function generatePatientSummaryPdf(patient: ReportPatient, medications: ReportPrescription[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = drawHeader(doc, 'Patient History Summary Report', patient);

  const appointments = patient.appointments || [];
  const exams = patient.eyeExaminations || [];
  const surgeries = patient.surgeries || [];
  const billings = patient.billings || [];
  const optical = patient.opticalPrescriptions || [];
  const totalBilled = billings.reduce((s, b) => s + (b.finalAmount || 0), 0);

  y = sectionTitle(doc, y, 'PATIENT OVERVIEW');
  y = bodyLine(doc, y, 'Name', lv(patient.fullName));
  y = bodyLine(doc, y, 'Patient ID', lv(patient.patientNumber));
  y = bodyLine(doc, y, 'Age / Gender', `${calcAge(patient.dateOfBirth)} years / ${lv(patient.gender)}`);
  y = bodyLine(doc, y, 'Phone', lv(patient.phone));
  y = bodyLine(doc, y, 'Branch', lv(patient.branch?.branchName));
  y = bodyLine(doc, y, 'Allergies', lv(patient.allergies));
  y = bodyLine(doc, y, 'Blood Group', lv(patient.bloodGroup));
  y += 2;

  y = sectionTitle(doc, y, 'CARE SUMMARY');
  y = tableRow(doc, y, ['Category', 'Count', 'Notes'], [50, 30, 102], true);
  y = tableRow(doc, y, ['Total Visits', String(appointments.length), 'All appointments on record'], [50, 30, 102]);
  y = tableRow(doc, y, ['Eye Examinations', String(exams.length), exams.length ? `Latest: ${fmtDate(exams[0]?.createdAt)}` : 'None'], [50, 30, 102]);
  y = tableRow(doc, y, ['Medicine Prescriptions', String(medications.length), medications.filter((m) => m.status === 'DISPENSED').length + ' dispensed'], [50, 30, 102]);
  y = tableRow(doc, y, ['Optical Prescriptions', String(optical.length), optical.length ? `Latest: ${fmtDate(optical[0]?.createdAt)}` : 'None'], [50, 30, 102]);
  y = tableRow(doc, y, ['Surgeries', String(surgeries.length), surgeries.length ? `Latest: ${fmtDate(surgeries[0]?.date)}` : 'None'], [50, 30, 102]);
  y = tableRow(doc, y, ['Billing Records', String(billings.length), `Total billed: $${totalBilled.toFixed(2)}`], [50, 30, 102]);
  y += 4;

  y = sectionTitle(doc, y, 'VISIT TIMELINE (Summary)');
  const sorted = sortAsc(appointments, (a) => a.appointmentDate);
  if (sorted.length === 0) {
    y = paragraph(doc, y, 'No visits recorded.');
  } else {
    y = tableRow(doc, y, ['#', 'Date', 'Doctor', 'Diagnosis', 'Status'], [10, 28, 42, 72, 30], true);
    sorted.forEach((apt, idx) => {
      y = tableRow(doc, y, [
        String(idx + 1),
        fmtDate(apt.appointmentDate),
        apt.doctor?.user?.fullName || 'N/A',
        (apt.clinicalExamination?.diagnosis || apt.notes || 'Consultation').slice(0, 60),
        apt.status || 'N/A',
      ], [10, 28, 42, 72, 30]);
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`AL-IXSAAN Eye Care — Patient Summary — Page ${i} of ${pageCount}`, 14, 292);
  }

  const slug = (patient.fullName || 'patient').replace(/\s+/g, '-').toLowerCase();
  doc.save(`patient-history-summary-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function printPatientReport(patient: ReportPatient, medications: ReportPrescription[]): boolean {
  const appointments = sortAsc(patient.appointments || [], (a) => a.appointmentDate);
  const exams = sortAsc(patient.eyeExaminations || [], (e) => e.createdAt);
  const surgeries = sortAsc(patient.surgeries || [], (s) => s.date);
  const billings = sortAsc(patient.billings || [], (b) => b.createdAt);
  const optical = sortAsc(patient.opticalPrescriptions || [], (o) => o.createdAt);
  const title = 'Patient Medical Record — Complete History';

  const rows = (items: string[][]) =>
    items.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');

  let body = `
    <h2>Patient Overview</h2>
    <table><tr><th>Field</th><th>Value</th></tr>
    ${rows([
      ['Full Name', lv(patient.fullName)],
      ['Patient ID', lv(patient.patientNumber)],
      ['Gender / Age', `${lv(patient.gender)} / ${calcAge(patient.dateOfBirth)} yrs`],
      ['Phone', lv(patient.phone)],
      ['Branch', lv(patient.branch?.branchName)],
      ['Allergies', lv(patient.allergies)],
      ['Blood Group', lv(patient.bloodGroup)],
    ])}
    </table>`;

  body += `<h2>Visit History (${appointments.length})</h2>
    <table><tr><th>Date</th><th>Doctor</th><th>Diagnosis</th><th>Status</th></tr>
    ${rows(appointments.map((a) => [
      fmtDate(a.appointmentDate),
      a.doctor?.user?.fullName || 'N/A',
      a.clinicalExamination?.diagnosis || a.notes || 'Consultation',
      a.status || 'N/A',
    ]))}
    </table>`;

  body += `<h2>Eye Examinations (${exams.length})</h2>
      <table><tr><th>Date</th><th>Doctor</th><th>Diagnosis</th><th>VA OD/OS</th><th>IOP OD/OS</th></tr>
      ${rows(exams.map((e) => [
        fmtDate(e.createdAt),
        e.doctor?.user?.fullName || 'N/A',
        lv(e.diagnosis),
        `${e.vaUnaidedOD || '—'} / ${e.vaUnaidedOS || '—'}`,
        `${e.iopOD ?? '—'} / ${e.iopOS ?? '—'}`,
      ]))}
      </table>`;

    body += `<h2>Medications (${medications.length})</h2>
      <table><tr><th>Date</th><th>Item</th><th>Qty</th><th>Status</th></tr>
      ${rows(medications.map((m) => [fmtDate(m.createdAt), m.itemName || m.itemType, String(m.quantity), m.status]))}
      </table>`;

    body += `<h2>Optical Prescriptions (${optical.length})</h2>
      <table><tr><th>Date</th><th>OD SPH/CYL</th><th>OS SPH/CYL</th><th>Status</th></tr>
      ${rows(optical.map((o) => [
        fmtDate(o.createdAt),
        `${o.odSphere || '—'} / ${o.odCylinder || '—'}`,
        `${o.osSphere || '—'} / ${o.osCylinder || '—'}`,
        o.status,
      ]))}
      </table>`;

    body += `<h2>Surgeries (${surgeries.length})</h2>
      <table><tr><th>Date</th><th>Type</th><th>Eye</th><th>Status</th></tr>
      ${rows(surgeries.map((s) => [fmtDate(s.date), s.surgeryType, s.eye, s.status]))}
      </table>`;

    body += `<h2>Billing (${billings.length})</h2>
      <table><tr><th>Date</th><th>Service</th><th>Amount</th><th>Status</th></tr>
      ${rows(billings.map((b) => [fmtDate(b.createdAt), b.serviceType, `$${(b.finalAmount || 0).toFixed(2)}`, b.status]))}
      </table>`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #1e293b; font-size: 12px; }
      .header { background: #0ea5e9; color: #fff; padding: 16px 20px; margin: -24px -24px 20px; }
      .header h1 { margin: 0 0 4px; font-size: 18px; }
      .header p { margin: 0; font-size: 11px; opacity: 0.95; }
      h2 { font-size: 13px; margin: 20px 0 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; color: #0f172a; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
      th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
      th { background: #f1f5f9; font-size: 10px; text-transform: uppercase; }
      .footer { margin-top: 24px; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px; }
      @media print { body { padding: 12px; } .header { margin: 0 0 16px; } }
    </style></head><body>
    <div class="header"><h1>AL-IXSAAN Eye Care</h1><p>${title} — ${lv(patient.fullName)} (${lv(patient.patientNumber)})</p></div>
    ${body}
    <div class="footer">Generated ${new Date().toLocaleString()} — Confidential medical record</div>
    <script>window.onload = () => { window.print(); }</script>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}
