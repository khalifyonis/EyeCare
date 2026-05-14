'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import api from '@/lib/axios';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Download, Eye, Glasses, Pencil, Printer, Trash2, User } from 'lucide-react';

type OpticalPrescription = {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  expiryDate: string;
  validityMonths?: number;
  notes?: string | null;
  coatings?: string[];

  lensType?: string | null;
  lensMaterial?: string | null;
  frameType?: string | null;

  odSphere?: string | null;
  odCylinder?: string | null;
  odAxis?: number | null;
  odAdd?: string | null;
  odPd?: number | null;
  odPrism?: string | null;

  osSphere?: string | null;
  osCylinder?: string | null;
  osAxis?: number | null;
  osAdd?: string | null;
  osPd?: number | null;
  osPrism?: string | null;

  createdBy?: { id: string; fullName?: string | null } | null;
  patient?: { id: string; fullName?: string | null; patientNumber?: string | null; dateOfBirth?: string | null } | null;
};

const LABEL_CN = 'text-xs font-semibold uppercase tracking-wide text-slate-500';

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(d);
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

function rxCodeFromId(id: string): string {
  const compact = (id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
  return `RX-${compact || '00000000'}`;
}

function toPatientDisplayId(patient?: { id: string; patientNumber?: string | null } | null): string {
  const number = patient?.patientNumber?.trim();
  if (number) return number;

  const compact = (patient?.id || '').replace(/-/g, '');
  if (!compact) return 'PAT-00000';

  // Deterministic numeric fallback to avoid exposing full UUID in UI.
  const tail = compact.slice(-8);
  const numeric = Number.parseInt(tail, 16);
  const code = Number.isNaN(numeric) ? 0 : (numeric % 90000) + 10000;
  return `PAT-${code}`;
}

function toDisplayType(type: string): string {
  if (type === 'BOTH') return 'Spectacles & Contact Lens Prescription';
  if (type === 'CONTACT_LENS') return 'Contact Lens Prescription';
  return 'Spectacles Prescription';
}

async function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function PrescriptionDetailsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [row, setRow] = useState<OpticalPrescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/prescriptions/${id}`)
      .then((res) => setRow(res.data as OpticalPrescription))
      .catch(() => toast.error('Failed to load prescription'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Loading…</div>;
  }

  if (!row) return null;

  const patientName = row.patient?.fullName?.trim() || 'Unknown Patient';
  const patientId = toPatientDisplayId(row.patient);
  const rxCode = rxCodeFromId(row.id);
  const createdByName = row.createdBy?.fullName?.trim() || 'System';

  const statusLabel = (row.status || '').toLowerCase() || 'filled';
  const showSpectacles = row.type === 'SPECTACLES' || row.type === 'BOTH';
  const showContact = true;

  const odPower = row.odSphere || '-';
  const osPower = row.osSphere || '-';
  const odCylinder = row.odCylinder || '-';
  const osCylinder = row.osCylinder || '-';
  const odAxis = row.odAxis ?? '-';
  const osAxis = row.osAxis ?? '-';

  const lensType = row.lensType || 'Single Vision';
  const lensMaterial = row.lensMaterial || 'CR-39';
  const tint = 'Clear';
  const photochromic = (row.coatings || []).some((c) => c.toLowerCase().includes('photo')) ? 'Yes' : 'No';

  const onDelete = async () => {
    const ok = window.confirm('Delete this prescription? This cannot be undone.');
    if (!ok) return;
    setDeleting(true);
    try {
      await api.delete(`/prescriptions/${row.id}`);
      toast.success('Prescription deleted');
      window.location.href = '/dashboard/prescription/optical';
    } catch {
      toast.error('Failed to delete prescription');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6">
      <div className="space-y-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Optical Prescription</h1>
          <p className="text-sm font-semibold text-slate-500">Rx #{rxCode}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/dashboard/prescription/optical" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Prescriptions
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="h-11 rounded-xl px-5" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" asChild className="h-11 rounded-xl px-5 bg-[#0EA5E9] text-white hover:bg-[#0284C7] hover:text-white border-[#0EA5E9]">
            <Link href={`/dashboard/prescription/optical/${row.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-xl px-5"
            onClick={async () => {
              try {
                await downloadJson(`optical-prescription-${row.id}.json`, row);
              } catch {
                toast.error('Download failed');
              }
            }}
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-xl px-5 text-white bg-red-600 border-red-600 hover:bg-red-700 hover:text-white"
            disabled={deleting}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-900 leading-none">Rx #{rxCode}</h2>
              <Badge className="rounded-full bg-sky-100 text-[#0EA5E9] border-0 px-3 py-1 text-xs">{statusLabel}</Badge>
            </div>
            <p className="mt-2 text-base text-slate-600">{toDisplayType(row.type)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <User className="h-5 w-5 text-[#0EA5E9]" />
            Patient Information
          </div>
          <div className="mt-6 space-y-5">
            <div>
              <p className={LABEL_CN}>Name</p>
              <p className="text-lg font-medium text-slate-900 leading-tight">{patientName}</p>
            </div>
            <div>
              <p className={LABEL_CN}>Patient ID</p>
              <p className="text-lg font-medium text-slate-900 leading-tight whitespace-nowrap">{patientId}</p>
            </div>
            <div>
              <p className={LABEL_CN}>Date of Birth</p>
              <p className="text-base font-medium text-slate-900 leading-tight">{formatDate(row.patient?.dateOfBirth || null)}</p>
            </div>
            <Link href="/dashboard/patients" className="inline-flex items-center text-[#0EA5E9] hover:text-[#0284C7] text-sm font-medium">
              View Patient Profile {"->"}
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Calendar className="h-5 w-5 text-[#0EA5E9]" />
            Prescription Info
          </div>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <p className={LABEL_CN}>Prescribed Date</p>
              <p className="text-lg font-medium text-slate-900 leading-tight">{formatDate(row.createdAt)}</p>
            </div>
            <div>
              <p className={LABEL_CN}>Prescriber</p>
              <p className="text-lg font-medium text-slate-900 leading-tight">Dr. {createdByName}</p>
            </div>
            <div>
              <p className={LABEL_CN}>Status</p>
              <div className="mt-1">
                <Badge className="rounded-full bg-sky-100 text-[#0EA5E9] border-0 px-3 py-1 text-xs">{statusLabel}</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSpectacles && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Glasses className="h-6 w-6 text-[#0EA5E9]" />
            Spectacles Prescription
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="px-4 py-3 text-left font-semibold">Eye</th>
                  <th className="px-4 py-3 text-left font-semibold">Sphere</th>
                  <th className="px-4 py-3 text-left font-semibold">Cylinder</th>
                  <th className="px-4 py-3 text-left font-semibold">Axis</th>
                  <th className="px-4 py-3 text-left font-semibold">Add</th>
                  <th className="px-4 py-3 text-left font-semibold">Prism</th>
                  <th className="px-4 py-3 text-left font-semibold">PD</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-4 font-semibold">OD (Right)</td>
                  <td className="px-4 py-4">{row.odSphere || '-'}</td>
                  <td className="px-4 py-4">{row.odCylinder || '-'}</td>
                  <td className="px-4 py-4">{row.odAxis ?? '-'}</td>
                  <td className="px-4 py-4">{row.odAdd || '0.00'}</td>
                  <td className="px-4 py-4">{row.odPrism || '-'}</td>
                  <td className="px-4 py-4">{row.odPd ?? '-'} mm</td>
                </tr>
                <tr>
                  <td className="px-4 py-4 font-semibold">OS (Left)</td>
                  <td className="px-4 py-4">{row.osSphere || '-'}</td>
                  <td className="px-4 py-4">{row.osCylinder || '-'}</td>
                  <td className="px-4 py-4">{row.osAxis ?? '-'}</td>
                  <td className="px-4 py-4">{row.osAdd || '0.00'}</td>
                  <td className="px-4 py-4">{row.osPrism || '-'}</td>
                  <td className="px-4 py-4">{row.osPd ?? '-'} mm</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className={LABEL_CN}>Lens Type</p>
              <p className="text-base font-semibold text-slate-900">{lensType}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className={LABEL_CN}>Lens Material</p>
              <p className="text-base font-semibold text-slate-900">{lensMaterial}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className={LABEL_CN}>Tint</p>
              <p className="text-base font-semibold text-slate-900">{tint}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className={LABEL_CN}>Photochromic</p>
              <p className="text-base font-semibold text-slate-900">{photochromic}</p>
            </div>
          </div>

          <div className="mt-5">
            <p className={LABEL_CN}>Coatings</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(row.coatings || []).length > 0 ? (
                row.coatings!.map((c) => (
                  <span key={c} className="rounded-full border border-[#0EA5E9]/40 bg-sky-50 px-3 py-1.5 text-sm font-medium text-[#0EA5E9]">
                    {c}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">-</span>
              )}
            </div>
          </div>
        </div>
      )}

      {showContact && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Eye className="h-6 w-6 text-[#0EA5E9]" />
            Contact Lens Prescription
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="px-4 py-3 text-left font-semibold">Eye</th>
                  <th className="px-4 py-3 text-left font-semibold">Power</th>
                  <th className="px-4 py-3 text-left font-semibold">BC</th>
                  <th className="px-4 py-3 text-left font-semibold">DIA</th>
                  <th className="px-4 py-3 text-left font-semibold">Cylinder</th>
                  <th className="px-4 py-3 text-left font-semibold">Axis</th>
                  <th className="px-4 py-3 text-left font-semibold">Brand</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-4 font-semibold">OD (Right)</td>
                  <td className="px-4 py-4">{odPower}</td>
                  <td className="px-4 py-4">8.6</td>
                  <td className="px-4 py-4">14.2</td>
                  <td className="px-4 py-4">{odCylinder}</td>
                  <td className="px-4 py-4">{odAxis}</td>
                  <td className="px-4 py-4">-</td>
                </tr>
                <tr>
                  <td className="px-4 py-4 font-semibold">OS (Left)</td>
                  <td className="px-4 py-4">{osPower}</td>
                  <td className="px-4 py-4">8.6</td>
                  <td className="px-4 py-4">14.2</td>
                  <td className="px-4 py-4">{osCylinder}</td>
                  <td className="px-4 py-4">{osAxis}</td>
                  <td className="px-4 py-4">-</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-5 max-w-[520px] rounded-xl bg-slate-50 px-4 py-3">
            <p className={LABEL_CN}>Replacement Schedule</p>
            <p className="text-base font-semibold text-slate-900">Monthly</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="text-base font-semibold text-slate-900">Notes</div>
        <div className="mt-2 text-sm text-slate-700">{row.notes?.trim() || '—'}</div>
      </div>

      <div className="pb-2 text-center text-xs text-slate-500">
        <p>Created: {formatDateTime(row.createdAt)}</p>
        <p>Last Updated: {formatDateTime(row.updatedAt || row.createdAt)}</p>
      </div>
    </div>
  );
}
