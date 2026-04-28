'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { ArrowLeft, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StatusPill, statusToVariant } from '@/components/ui/status-pill';

type BillingLineItem = {
  id: string;
  description?: string | null;
  quantity?: number | null;
  unitPrice?: number | string | null;
  lineTotal?: number | string | null;
};

type BillingDetails = {
  id: string;
  referenceNumber?: string | null;
  serviceType?: string | null;
  status?: string | null;
  finalAmount?: number | string | null;
  totalAmount?: number | string | null;
  discount?: number | string | null;
  paymentMethod?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  patient?: { id: string; fullName?: string | null; phone?: string | null } | null;
  lineItems?: BillingLineItem[];
};

function money(value?: number | string | null) {
  const n = typeof value === 'number' ? value : Number(value || 0);
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateOnly(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function invoiceNo(row: BillingDetails) {
  const ref = (row.referenceNumber || '').trim();
  if (ref) return ref;
  const suffix = row.id.replace(/-/g, '').slice(0, 6).toUpperCase() || '000000';
  return `INV-${suffix}`;
}

export default function BillingDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id || '';

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<BillingDetails | null>(null);

  useEffect(() => {
    if (!id) return;

    let mounted = true;
    setLoading(true);

    api.get(`/billing/${id}`)
      .then((res) => {
        if (!mounted) return;
        setRow(res.data as BillingDetails);
      })
      .catch(() => {
        toast.error('Failed to load invoice');
        if (mounted) router.push('/dashboard/billing');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id, router]);

  const subtotal = useMemo(() => {
    if (!row?.lineItems?.length) return Number(row?.totalAmount || 0);
    return row.lineItems.reduce((sum, li) => sum + Number(li.lineTotal || 0), 0);
  }, [row]);

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading invoice...</div>;
  if (!row) return <div className="p-8 text-sm text-slate-500">Invoice not found.</div>;

  return (
    <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Invoice Details</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review invoice and payment information</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/dashboard/billing" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Billing
        </Link>

        <Button asChild className="h-10 rounded-lg bg-[#0EA5E9] hover:bg-[#0c96d4] text-white">
          <Link href={`/dashboard/billing/${row.id}/edit`}>
            <Pencil className="h-4 w-4" />
            Edit Invoice
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice #</p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{invoiceNo(row)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{row.patient?.fullName || 'Unknown'}</p>
            <p className="text-xs text-slate-500">{row.patient?.phone || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
            <div className="mt-1">
              <StatusPill variant={statusToVariant(row.status || 'UNPAID')}>{row.status || 'UNPAID'}</StatusPill>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Service</p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{row.serviceType || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created</p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{dateOnly(row.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Due Date</p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{dateOnly(row.dueDate)}</p>
          </div>
        </div>

        {row.lineItems && row.lineItems.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Description</th>
                  <th className="text-right px-3 py-2 font-semibold">Qty</th>
                  <th className="text-right px-3 py-2 font-semibold">Unit Price</th>
                  <th className="text-right px-3 py-2 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {row.lineItems.map((li) => (
                  <tr key={li.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-3 py-2">{li.description || '—'}</td>
                    <td className="px-3 py-2 text-right">{Number(li.quantity || 0)}</td>
                    <td className="px-3 py-2 text-right">{money(li.unitPrice)}</td>
                    <td className="px-3 py-2 text-right font-medium">{money(li.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="space-y-2 rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/60 dark:bg-slate-900/30">
          <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300"><span>Discount</span><span>{money(row.discount)}</span></div>
          <div className="flex justify-between text-lg font-semibold text-slate-900 dark:text-slate-100 border-t border-slate-200 dark:border-slate-700 pt-2"><span>Grand Total</span><span>{money(row.finalAmount)}</span></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment Method</p>
            <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{row.paymentMethod || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
            <p className="mt-1 text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap">{row.notes || '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
