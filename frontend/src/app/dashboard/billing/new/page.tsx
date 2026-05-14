'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/axios';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ServiceType = 'APPOINTMENT' | 'PHARMACY' | 'OPTICAL' | 'SURGERY';

type PatientOption = {
  id: string;
  fullName?: string | null;
  phone?: string | null;
};

type LineItem = {
  id: string;
  description: string;
  itemId?: string;
  quantity: string;
  unitPrice: string;
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

const SERVICE_OPTIONS: Array<{ value: ServiceType; label: string }> = [
  { value: 'APPOINTMENT', label: 'Appointment' },
  { value: 'PHARMACY', label: 'Pharmacy' },
  { value: 'OPTICAL', label: 'Optical' },
  { value: 'SURGERY', label: 'Surgery' },
];

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'UNPAID', label: 'Pending Payment' },
  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { value: 'PAID', label: 'Paid' },
] as const;

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

export default function NewBillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialServiceType = (searchParams.get('serviceType')?.toUpperCase() as ServiceType) || 'APPOINTMENT';

  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [pharmacyItems, setPharmacyItems] = useState<ItemOption[]>([]);
  const [opticalItems, setOpticalItems] = useState<ItemOption[]>([]);
  const [patientId, setPatientId] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>(initialServiceType);
  const [status, setStatus] = useState<'DRAFT' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'>('UNPAID');
  const [tax, setTax] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: '1', unitPrice: '0' },
  ]);

  const loadPatients = useCallback(async () => {
    setLoadingPatients(true);
    try {
      const res = await api.get('/patients?limit=500');
      const body = res.data as { data?: PatientOption[] };
      setPatients(Array.isArray(body?.data) ? body.data : []);
    } catch {
      toast.error('Failed to load patients');
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  }, []);

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
    setLoadingItems(true);
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
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    void loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    void loadInventoryItems();
  }, [loadInventoryItems]);

  // Load prescription if prescriptionId is provided
  useEffect(() => {
    const pId = searchParams.get('prescriptionId');
    if (!pId) return;
    setPrescriptionId(pId);

    const loadPrescription = async () => {
      try {
        const endpoint = serviceType === 'PHARMACY' ? `/prescription-items/${pId}` : `/prescriptions/${pId}`;
        const res = await api.get(endpoint);
        const data = res.data;

        // Set patient
        const p = data.patient || data.appointment?.patient || data.eyeExam?.patient;
        if (p) setPatientId(p.id);

        // Add line item
        if (serviceType === 'PHARMACY') {
           // Try to find the item in our already loaded pharmacy items for the most up-to-date price
           const catalogItem = pharmacyItems.find(i => i.id === data.itemId);
           const itemName = catalogItem?.label || data.itemName || 'Medicine';
           const unitPrice = catalogItem?.unitPrice || data.item?.sellingPrice || 0;

           setLineItems([{
             id: 'presc-item',
             description: itemName,
             itemId: data.itemId || data.item?.id,
             quantity: String(data.quantity || 1),
             unitPrice: String(unitPrice)
           }]);
        } else if (serviceType === 'OPTICAL') {
           const frameName = data.frameItem?.itemName || 'Optical Frame';
           setLineItems([{
             id: 'presc-frame',
             description: `Frame: ${frameName}`,
             itemId: data.frameItem?.id,
             quantity: '1',
             unitPrice: String(data.frameItem?.sellingPrice || 0)
           }]);
        }
      } catch {
        toast.error('Failed to load prescription data');
      }
    };

    void loadPrescription();
  }, [serviceType, searchParams, pharmacyItems, opticalItems]);

  const descriptionOptions = useMemo(() => {
    if (serviceType === 'PHARMACY') return pharmacyItems;
    if (serviceType === 'OPTICAL') return opticalItems;
    if (serviceType === 'SURGERY') return SURGERY_OPTIONS;
    return APPOINTMENT_OPTIONS;
  }, [serviceType, pharmacyItems, opticalItems]);

  const subtotal = useMemo(() => {
    return lineItems.reduce((sum, li) => sum + parseMoney(li.quantity) * parseMoney(li.unitPrice), 0);
  }, [lineItems]);

  const finalAmount = useMemo(() => {
    return Math.max(0, subtotal + parseMoney(tax) - parseMoney(discount));
  }, [subtotal, tax, discount]);

  const addLine = () => {
    setLineItems((prev) => [
      ...prev,
      { id: String(Date.now()), description: '', quantity: '1', unitPrice: '0' },
    ]);
  };

  const removeLine = (id: string) => {
    setLineItems((prev) => (prev.length === 1 ? prev : prev.filter((li) => li.id !== id)));
  };

  const updateLine = (id: string, field: keyof Omit<LineItem, 'id'>, value: string) => {
    setLineItems((prev) => prev.map((li) => (li.id === id ? { ...li, [field]: value } : li)));
  };

  const updateDescription = (id: string, value: string) => {
    const selected = descriptionOptions.find((option) => option.label.toLowerCase() === value.trim().toLowerCase());
    setLineItems((prev) => prev.map((li) => {
      if (li.id !== id) return li;
      const next = { ...li, description: value, itemId: selected?.id || '' };
      if (selected && (!li.unitPrice || Number(li.unitPrice) === 0)) {
        next.unitPrice = String(selected.unitPrice);
      }
      return next;
    }));
  };

  const onSubmit = async () => {
    if (!patientId) {
      toast.error('Please select a patient');
      return;
    }

    const validItems = lineItems
      .map((li) => ({
        itemId: li.itemId || undefined,
        description: li.description.trim(),
        quantity: Math.max(1, Number(li.quantity) || 0),
        unitPrice: Math.max(0, Number(li.unitPrice) || 0),
      }))
      .filter((li) => li.description || li.quantity > 0 || li.unitPrice > 0);

    if (validItems.length === 0) {
      toast.error('Add at least one invoice item');
      return;
    }

    setSaving(true);
    try {
      await api.post('/billing', {
        patientId,
        serviceType,
        prescriptionId: serviceType === 'PHARMACY' ? prescriptionId : undefined,
        opticalPrescriptionId: serviceType === 'OPTICAL' ? prescriptionId : undefined,
        totalAmount: subtotal + Math.max(0, Number(tax) || 0),
        discount: Math.max(0, Number(discount) || 0),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        paymentMethod: paymentMethod.trim() || undefined,
        status,
        lineItems: validItems.map((li) => ({
          itemType: serviceType,
          itemId: li.itemId,
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
        })),
      });

      toast.success('Invoice created');
      router.push('/dashboard/billing');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof msg === 'string' ? msg : 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Create Invoice</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create a billing invoice with clear line items and payment details</p>
      </div>

      <Link href="/dashboard/billing" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 sm:p-6 shadow-sm space-y-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Patient Information</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Patient *</label>
              <Select value={patientId} onValueChange={setPatientId} disabled={loadingPatients}>
                <SelectTrigger className="mt-1 h-11 rounded-lg border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder={loadingPatients ? 'Loading patients...' : 'Search and select a patient'} />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.fullName || 'Unknown'} {p.phone ? `(${p.phone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Service Type *</label>
              <Select value={serviceType} onValueChange={(v) => setServiceType(v as ServiceType)}>
                <SelectTrigger className="mt-1 h-11 rounded-lg border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingItems && <p className="mt-1 text-xs text-slate-500">Loading catalog...</p>}
            </div>
          </div>
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
            {/* Table Headers */}
            <div className="hidden md:grid md:grid-cols-[1.5fr_120px_140px_140px_44px] gap-3 px-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Item Description</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Quantity</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Unit Price</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Line Total</div>
              <div className="w-11"></div>
            </div>

            {lineItems.map((line) => {
              const qty = parseMoney(line.quantity);
              const unit = parseMoney(line.unitPrice);
              const lineTotal = qty * unit;

              return (
                <div key={line.id} className="grid grid-cols-1 md:grid-cols-[1.5fr_120px_140px_140px_auto] gap-3 rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 shadow-sm transition-all hover:border-blue-200">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase md:hidden">Description</label>
                    <Input
                      value={line.description}
                      onChange={(e) => updateDescription(line.id, e.target.value)}
                      placeholder="Search or enter item..."
                      list={`billing-item-options-${line.id}`}
                      className="h-11 border-slate-200 focus:border-blue-400 focus:ring-blue-100"
                    />
                    <datalist id={`billing-item-options-${line.id}`}>
                      {descriptionOptions.map((option) => (
                        <option key={`${serviceType}-${option.id || option.label}`} value={option.label} />
                      ))}
                    </datalist>
                  </div>
                  
                  <div className="space-y-1 text-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase md:hidden">Quantity</label>
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => updateLine(line.id, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className="h-11 text-center font-semibold"
                    />
                  </div>

                  <div className="space-y-1 text-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase md:hidden">Price</label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.unitPrice}
                      readOnly={Boolean(line.itemId)}
                      onChange={(e) => updateLine(line.id, 'unitPrice', e.target.value)}
                      placeholder="Price"
                      className={cn(
                        "h-11 text-center font-semibold",
                        line.itemId && "bg-slate-50 text-slate-500 cursor-not-allowed border-slate-100"
                      )}
                    />
                  </div>

                  <div className="space-y-1 text-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase md:hidden">Total</label>
                    <div className="h-11 rounded-lg border border-slate-100 bg-slate-50/50 px-3 flex items-center justify-center text-sm font-black text-blue-600">
                      {toCurrency(lineTotal)}
                    </div>
                  </div>

                  <div className="flex items-end md:items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(line.id)}
                      className="h-11 w-11 text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Invoice Details</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as 'DRAFT' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID')}>
                <SelectTrigger className="mt-1 h-11 rounded-lg border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Payment Method</label>
              <Input
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 h-11"
                placeholder="Cash, Card, Transfer"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Tax</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                className="mt-1 h-11"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Discount</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="mt-1 h-11"
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>Subtotal</span>
              <span className="font-medium">{toCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>Tax</span>
              <span className="font-medium">{toCurrency(parseMoney(tax))}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>Discount</span>
              <span className="font-medium">{toCurrency(parseMoney(discount))}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-200 dark:border-slate-700">
              <span>Grand Total</span>
              <span>{toCurrency(finalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
        <Button type="button" variant="outline" className="h-11 rounded-lg" onClick={() => router.push('/dashboard/billing')}>
          Cancel
        </Button>
        <Button type="button" className="h-11 rounded-lg bg-[#0EA5E9] hover:bg-[#0c96d4] text-white" onClick={() => void onSubmit()} disabled={saving}>
          {saving ? 'Creating...' : 'Create Invoice'}
        </Button>
      </div>
    </div>
  );
}
