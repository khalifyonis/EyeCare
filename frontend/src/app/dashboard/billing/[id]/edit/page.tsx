'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ServiceType = 'APPOINTMENT' | 'PHARMACY' | 'OPTICAL' | 'SURGERY';

type BillingLineItem = {
  id?: string;
  itemType?: string | null;
  itemId?: string | null;
  description?: string | null;
  quantity?: number | null;
  unitPrice?: number | string | null;
};

type BillingRow = {
  id: string;
  serviceType?: ServiceType | null;
  patient?: { id: string; fullName?: string | null; phone?: string | null } | null;
  status?: string | null;
  paymentMethod?: string | null;
  dueDate?: string | null;
  totalAmount?: number | string | null;
  discount?: number | string | null;
  lineItems?: BillingLineItem[];
};

type LineItem = {
  id: string;
  description: string;
  itemId?: string;
  quantity: string;
  unitPrice: string;
};

type PatientOption = {
  id: string;
  fullName?: string | null;
  phone?: string | null;
};

type InventoryItem = {
  id: string;
  itemName?: string | null;
  genericName?: string | null;
  sellingPrice?: number | string | null;
};

type ItemOption = {
  id: string;
  label: string;
  unitPrice: number;
};

const APPOINTMENT_OPTIONS = [
  { id: '', label: 'Consultation', unitPrice: 0 },
  { id: '', label: 'Follow-up Visit', unitPrice: 0 },
  { id: '', label: 'Vision Assessment', unitPrice: 0 },
  { id: '', label: 'Emergency Visit', unitPrice: 0 },
];

const SURGERY_OPTIONS = [
  { id: '', label: 'Surgery Package', unitPrice: 0 },
  { id: '', label: 'OT Charges', unitPrice: 0 },
  { id: '', label: 'Anesthesia Support', unitPrice: 0 },
  { id: '', label: 'Post-op Care', unitPrice: 0 },
];

function parseMoney(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toCurrency(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toDateInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function EditBillingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [serviceType, setServiceType] = useState<ServiceType>('APPOINTMENT');
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [patientId, setPatientId] = useState('');
  const [pharmacyItems, setPharmacyItems] = useState<ItemOption[]>([]);
  const [opticalItems, setOpticalItems] = useState<ItemOption[]>([]);

  const [status, setStatus] = useState('UNPAID');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tax, setTax] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: '1', unitPrice: '0' },
  ]);

  const mapItemsToOptions = (list: InventoryItem[]) => {
    return list
      .map((item) => {
        const label = (item.genericName || item.itemName || '').trim();
        if (!label) return null;
        return {
          id: item.id,
          label,
          unitPrice: Number(item.sellingPrice || 0),
        };
      })
      .filter((item): item is ItemOption => Boolean(item));
  };

  const loadInventoryItems = useCallback(async () => {
    try {
      const [pharmacyRes, opticalRes] = await Promise.all([
        api.get('/inventory/pharmacy', { params: { page: 1, limit: 1000 } }),
        api.get('/inventory/optical', { params: { page: 1, limit: 1000 } }),
      ]);

      const pharmacyBody = pharmacyRes.data as { data?: InventoryItem[] } | InventoryItem[];
      const opticalBody = opticalRes.data as { data?: InventoryItem[] } | InventoryItem[];
      const pharmacyList = Array.isArray(pharmacyBody) ? pharmacyBody : (Array.isArray(pharmacyBody?.data) ? pharmacyBody.data : []);
      const opticalList = Array.isArray(opticalBody) ? opticalBody : (Array.isArray(opticalBody?.data) ? opticalBody.data : []);

      setPharmacyItems(mapItemsToOptions(pharmacyList));
      setOpticalItems(mapItemsToOptions(opticalList));
    } catch {
      setPharmacyItems([]);
      setOpticalItems([]);
    }
  }, []);

  const loadPatients = useCallback(async () => {
    try {
      const res = await api.get('/patients?limit=500');
      const body = res.data as { data?: PatientOption[] };
      setPatients(Array.isArray(body?.data) ? body.data : []);
    } catch {
      setPatients([]);
    }
  }, []);

  useEffect(() => {
    void loadInventoryItems();
  }, [loadInventoryItems]);

  useEffect(() => {
    void loadPatients();
  }, [loadPatients]);

  const descriptionOptions = useMemo(() => {
    if (serviceType === 'PHARMACY') return pharmacyItems;
    if (serviceType === 'OPTICAL') return opticalItems;
    if (serviceType === 'SURGERY') return SURGERY_OPTIONS;
    return APPOINTMENT_OPTIONS;
  }, [serviceType, pharmacyItems, opticalItems]);

  const subtotal = useMemo(() => {
    return lineItems.reduce((sum, li) => sum + parseMoney(li.quantity) * parseMoney(li.unitPrice), 0);
  }, [lineItems]);

  useEffect(() => {
    if (!id) return;

    let mounted = true;
    setLoading(true);

    api.get(`/billing/${id}`)
      .then((res) => {
        if (!mounted) return;
        const row = res.data as BillingRow;
        setServiceType((row.serviceType || 'APPOINTMENT') as ServiceType);
        setPatientId(row.patient?.id || '');
        setStatus((row.status || 'UNPAID').toUpperCase() === 'PARTIAL' ? 'PARTIALLY_PAID' : (row.status || 'UNPAID').toUpperCase());
        setPaymentMethod(row.paymentMethod || '');
        setDueDate(toDateInput(row.dueDate));
        setDiscount(String(Number(row.discount || 0)));

        const mappedItems = Array.isArray(row.lineItems) && row.lineItems.length > 0
          ? row.lineItems.map((li, index) => ({
              id: li.id || `${index + 1}`,
              itemId: li.itemId || '',
              description: li.description || '',
              quantity: String(Number(li.quantity || 1)),
              unitPrice: String(Number(li.unitPrice || 0)),
            }))
          : [{ id: '1', description: '', quantity: '1', unitPrice: '0' }];
        setLineItems(mappedItems);

        const loadedSubtotal = mappedItems.reduce((sum, li) => sum + (Number(li.quantity || 0) * Number(li.unitPrice || 0)), 0);
        const loadedTotal = Number(row.totalAmount || 0);
        const inferredTax = Math.max(0, loadedTotal - loadedSubtotal);
        setTax(String(inferredTax));
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

  const finalAmount = useMemo(() => {
    const t = Number(subtotal || 0);
    const tx = Number(tax || 0);
    const d = Number(discount || 0);
    return Math.max(0, t + tx - d);
  }, [subtotal, tax, discount]);

  const addLine = () => {
    setLineItems((prev) => [
      ...prev,
      { id: String(Date.now()), description: '', quantity: '1', unitPrice: '0' },
    ]);
  };

  const removeLine = (lineId: string) => {
    setLineItems((prev) => (prev.length === 1 ? prev : prev.filter((li) => li.id !== lineId)));
  };

  const updateLine = (lineId: string, field: keyof Omit<LineItem, 'id'>, value: string) => {
    setLineItems((prev) => prev.map((li) => (li.id === lineId ? { ...li, [field]: value } : li)));
  };

  const updateDescription = (lineId: string, value: string) => {
    const selected = descriptionOptions.find((option) => option.label.toLowerCase() === value.trim().toLowerCase());
    setLineItems((prev) => prev.map((li) => {
      if (li.id !== lineId) return li;
      const next = { ...li, description: value, itemId: selected?.id || '' };
      if (selected && (!li.unitPrice || Number(li.unitPrice) === 0)) {
        next.unitPrice = String(selected.unitPrice);
      }
      return next;
    }));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const validItems = lineItems
        .map((li) => ({
          itemType: serviceType,
          itemId: li.itemId || undefined,
          description: li.description.trim(),
          quantity: Math.max(1, Number(li.quantity) || 0),
          unitPrice: Math.max(0, Number(li.unitPrice) || 0),
        }))
        .filter((li) => li.description || li.quantity > 0 || li.unitPrice > 0);

      await api.put(`/billing/${id}`, {
        patientId,
        serviceType,
        status,
        paymentMethod: paymentMethod.trim() || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        totalAmount: Number(subtotal || 0) + Math.max(0, Number(tax) || 0),
        discount: Number(discount || 0),
        lineItems: validItems,
      });
      toast.success('Invoice updated');
      router.push(`/dashboard/billing/${id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof msg === 'string' ? msg : 'Failed to update invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading invoice...</div>;

  return (
    <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Edit Invoice</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Update billing and payment details</p>
      </div>

      <Link href={`/dashboard/billing/${id}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
        Back to Details
      </Link>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Patient Information</h2>
          <Select value={patientId} onValueChange={setPatientId}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Search and select a patient..." />
            </SelectTrigger>
            <SelectContent>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {(p.fullName || 'Unknown').trim()} {p.phone ? `(${p.phone})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Invoice Items</h2>
            <Button type="button" variant="outline" onClick={addLine} className="h-10 rounded-lg">
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {lineItems.map((line) => {
              const qty = parseMoney(line.quantity);
              const unit = parseMoney(line.unitPrice);
              const lineTotal = qty * unit;

              return (
                <div key={line.id} className="grid grid-cols-1 md:grid-cols-[1.5fr_120px_140px_140px_auto] gap-3 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                  <Input
                    value={line.description}
                    onChange={(e) => updateDescription(line.id, e.target.value)}
                    placeholder="Search items by name or description..."
                    list={`edit-billing-item-options-${line.id}`}
                    className="h-11"
                  />
                  <datalist id={`edit-billing-item-options-${line.id}`}>
                    {descriptionOptions.map((option) => (
                      <option key={`${serviceType}-${option.id || option.label}`} value={option.label} />
                    ))}
                  </datalist>
                  <Input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => updateLine(line.id, 'quantity', e.target.value)}
                    className="h-11"
                  />
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={line.unitPrice}
                    onChange={(e) => updateLine(line.id, 'unitPrice', e.target.value)}
                    className="h-11"
                  />
                  <div className="h-11 rounded-lg border border-slate-200 dark:border-slate-800 px-3 flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
                    {toCurrency(lineTotal)}
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(line.id)} className="h-11 w-11 text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="UNPAID">Pending Payment</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Payment Method</label>
            <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-1 h-11" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Due Date</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 h-11" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Subtotal</label>
            <Input value={toCurrency(subtotal)} disabled className="mt-1 h-11" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Tax</label>
            <Input type="number" min={0} step={0.01} value={tax} onChange={(e) => setTax(e.target.value)} className="mt-1 h-11" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Discount</label>
            <Input type="number" min={0} step={0.01} value={discount} onChange={(e) => setDiscount(e.target.value)} className="mt-1 h-11" />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300"><span>Subtotal</span><span>{toCurrency(subtotal)}</span></div>
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300"><span>Tax</span><span>{toCurrency(Number(tax || 0))}</span></div>
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300"><span>Discount</span><span>{toCurrency(Number(discount || 0))}</span></div>
          <div className="mt-2 border-t border-slate-200 dark:border-slate-700 pt-2 flex items-center justify-between text-base font-semibold text-slate-900 dark:text-slate-100"><span>Grand Total</span><span>{toCurrency(finalAmount)}</span></div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" className="h-11" onClick={() => router.push(`/dashboard/billing/${id}`)}>
          Cancel
        </Button>
        <Button className="h-11 bg-[#0EA5E9] hover:bg-[#0c96d4] text-white" onClick={() => void onSave()} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
