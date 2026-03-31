'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PharmacyTabs } from '../../_components/pharmacy-tabs'
import { Search, UserRound, ShoppingCart, CreditCard, ReceiptText, Plus, Minus } from 'lucide-react'

type Patient = { id: string; fullName?: string | null; patientNumber?: string | null; phone?: string | null }

type ClinicalPrescription = {
  id: string
  itemType: 'PHARMACY' | 'OPTICAL'
  itemId?: string | null
  quantity?: number | null
  appointment?: { patient?: { id: string; fullName?: string | null } | null } | null
  createdAt?: string
}

type PharmacyItem = {
  id: string
  itemName: string
  genericName?: string | null
  sku?: string | null
  barcode?: string | null
  itemType?: string | null
  strength?: string | null
  sellingPrice?: number | string | null
  stockQuantity?: number | null
}

type CartLine = {
  itemId: string
  label: string
  sku?: string | null
  strength?: string | null
  unitPrice: number
  quantity: number
}

type BillingResponse = {
  id: string
  serviceType: string
  status: string
  totalAmount?: number | string
  discount?: number | string
  finalAmount?: number | string
  paymentMethod?: string | null
  createdAt?: string
  patient?: { fullName?: string | null; phone?: string | null } | null
  branch?: { branchName?: string | null } | null
  lineItems?: Array<{
    id: string
    itemType: string
    itemId: string
    description?: string | null
    quantity: number
    unitPrice: number | string
    lineTotal: number | string
  }>
}

function money(value: number) {
  return `$${value.toFixed(2)}`
}

function openReceiptPrint(billing: BillingResponse) {
  const lines = Array.isArray(billing.lineItems) ? billing.lineItems : []
  const total = Number(billing.totalAmount || 0)
  const discount = Number(billing.discount || 0)
  const final = Number(billing.finalAmount || 0)

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Pharmacy Receipt</title>
      <style>
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 24px; color: #0f172a; }
        .wrap { max-width: 520px; margin: 0 auto; }
        .title { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
        .meta { margin-top: 10px; font-size: 12px; color: #475569; }
        .box { margin-top: 16px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
        th { text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; color: #64748b; background: #f8fafc; }
        tr:last-child td { border-bottom: 0; }
        .right { text-align: right; }
        .sum { margin-top: 14px; font-size: 12px; }
        .sum-row { display: flex; justify-content: space-between; padding: 6px 2px; }
        .sum-strong { font-weight: 800; font-size: 14px; }
        .footer { margin-top: 16px; font-size: 11px; color: #64748b; }
        @media print { body { margin: 0; } .wrap { max-width: none; } }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="title">Pharmacy Receipt</div>
        <div class="meta">
          <div><b>Sale:</b> ${String(billing.id).slice(0, 8).toUpperCase()}</div>
          <div><b>Date:</b> ${billing.createdAt ? new Date(billing.createdAt).toLocaleString() : '-'}</div>
          <div><b>Patient:</b> ${billing.patient?.fullName || '-'}</div>
          <div><b>Payment:</b> ${billing.paymentMethod || '-'}</div>
          <div><b>Status:</b> ${billing.status || '-'}</div>
        </div>

        <div class="box">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="right">Qty</th>
                <th class="right">Price</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lines
                .map((l) => {
                  const qty = Number(l.quantity || 0)
                  const unit = Number(l.unitPrice || 0)
                  const lineTotal = Number(l.lineTotal || qty * unit)
                  return `<tr>
                    <td>${String(l.description || l.itemId)}</td>
                    <td class="right">${qty}</td>
                    <td class="right">${money(unit)}</td>
                    <td class="right">${money(lineTotal)}</td>
                  </tr>`
                })
                .join('')}
            </tbody>
          </table>
        </div>

        <div class="sum">
          <div class="sum-row"><span>Subtotal</span><span>${money(total)}</span></div>
          <div class="sum-row"><span>Discount</span><span>${money(discount)}</span></div>
          <div class="sum-row sum-strong"><span>Total</span><span>${money(final)}</span></div>
        </div>

        <div class="footer">
          Print this page and choose “Save as PDF” for a PDF receipt.
        </div>
      </div>
      <script>window.onload = () => window.print();</script>
    </body>
  </html>
  `.trim()

  const w = window.open('', '_blank', 'width=720,height=900')
  if (!w) return
  w.document.open()
  w.document.write(html)
  w.document.close()
}

export default function PharmacySalesWizardPage() {
  const router = useRouter()

  const label = 'text-xs font-semibold uppercase text-slate-500'

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [submitting, setSubmitting] = useState(false)

  // Step 1: patient
  const [patientQuery, setPatientQuery] = useState('')
  const [patientLoading, setPatientLoading] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [patient, setPatient] = useState<Patient | null>(null)

  const [prescriptionLoading, setPrescriptionLoading] = useState(false)
  const [prescriptions, setPrescriptions] = useState<ClinicalPrescription[]>([])
  const [linkedPrescriptionId, setLinkedPrescriptionId] = useState<string>('none')

  // Step 2: meds
  const [medQuery, setMedQuery] = useState('')
  const [medLoading, setMedLoading] = useState(false)
  const [meds, setMeds] = useState<PharmacyItem[]>([])
  const [cart, setCart] = useState<CartLine[]>([])

  // Step 3: payment
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paidAmount, setPaidAmount] = useState('0')

  const searchPatients = useCallback(async (q: string) => {
    setPatientLoading(true)
    try {
      const res = await api.get('/patients', { params: { search: q.trim() || undefined, page: 1, limit: 12 } })
      const body = res.data as { data?: Patient[] }
      setPatients(Array.isArray(body?.data) ? body.data : [])
    } catch {
      setPatients([])
    } finally {
      setPatientLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => void searchPatients(patientQuery), 250)
    return () => clearTimeout(t)
  }, [patientQuery, searchPatients])

  const loadPatientPrescriptions = useCallback(async (patientId: string) => {
    setPrescriptionLoading(true)
    try {
      const res = await api.get('/clinical-prescriptions', { params: { itemType: 'PHARMACY', patientId } })
      const rows = Array.isArray(res.data) ? (res.data as ClinicalPrescription[]) : []
      setPrescriptions(rows)
    } catch {
      setPrescriptions([])
    } finally {
      setPrescriptionLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!patient?.id) {
      setPrescriptions([])
      setLinkedPrescriptionId('none')
      return
    }
    void loadPatientPrescriptions(patient.id)
  }, [patient?.id, loadPatientPrescriptions])

  const searchMeds = useCallback(async (q: string) => {
    setMedLoading(true)
    try {
      const res = await api.get('/inventory/pharmacy', { params: { search: q.trim() || undefined, page: 1, limit: 20 } })
      const body = res.data as { data?: PharmacyItem[] }
      setMeds(Array.isArray(body?.data) ? body.data : [])
    } catch {
      setMeds([])
    } finally {
      setMedLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => void searchMeds(medQuery), 250)
    return () => clearTimeout(t)
  }, [medQuery, searchMeds])

  const addToCart = (item: PharmacyItem) => {
    const existing = cart.find((c) => c.itemId === item.id)
    if (existing) return
    const unitPrice = Math.max(0, Number(item.sellingPrice || 0))
    setCart((prev) => [
      ...prev,
      {
        itemId: item.id,
        label: item.genericName || item.itemName,
        sku: item.sku || item.barcode || null,
        strength: item.strength || null,
        unitPrice,
        quantity: 1,
      },
    ])
  }

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.itemId !== itemId))
  }

  const setQty = (itemId: string, quantity: number) => {
    setCart((prev) =>
      prev.map((c) => (c.itemId === itemId ? { ...c, quantity: Math.max(1, Math.floor(quantity || 1)) } : c))
    )
  }

  const subtotal = useMemo(() => {
    return cart.reduce((acc, c) => acc + c.quantity * c.unitPrice, 0)
  }, [cart])

  const canNext1 = Boolean(patient?.id)
  const canNext2 = cart.length > 0
  const canFinish = cart.length > 0 && Boolean(patient?.id) && !submitting

  const linkPrescriptionToCart = async () => {
    if (linkedPrescriptionId === 'none') return
    const rx = prescriptions.find((p) => p.id === linkedPrescriptionId)
    if (!rx?.itemId) {
      toast.error('Selected prescription has no linked item')
      return
    }

    try {
      const itemRes = await api.get(`/inventory/pharmacy/${rx.itemId}`)
      const item = itemRes.data as PharmacyItem
      addToCart(item)
      if (Number(rx.quantity || 0) > 0) {
        setQty(item.id, Number(rx.quantity || 1))
      }
      toast.success('Prescription item added to cart')
    } catch {
      toast.error('Failed to load prescription item from inventory')
    }
  }

  const submitSale = async () => {
    if (!patient?.id) {
      toast.error('Select a patient')
      return
    }
    if (cart.length === 0) {
      toast.error('Add at least one medicine')
      return
    }

    const total = Math.max(0, subtotal)
    const paid = Math.max(0, Number(paidAmount) || 0)
    const status = paid >= total && total > 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID'

    setSubmitting(true)
    try {
      const res = await api.post('/billing', {
        patientId: patient.id,
        serviceType: 'PHARMACY',
        totalAmount: total,
        discount: 0,
        paymentMethod,
        status,
        lineItems: cart.map((c) => ({
          itemType: 'PHARMACY',
          itemId: c.itemId,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
        })),
      })

      const billing = res.data as BillingResponse
      toast.success('Sale completed')
      openReceiptPrint(billing)
      router.push('/dashboard/pharmacy')
    } catch (error: unknown) {
      const message =
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(typeof message === 'string' ? message : 'Failed to complete sale')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full min-w-0 p-4 sm:p-6 lg:p-7 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">New Pharmacy Sale</h1>
          <p className="mt-1 text-xl text-slate-600">Fast dispensing wizard</p>
          <div className="mt-4">
            <Link href="/dashboard/pharmacy" className="text-base font-semibold text-slate-600 hover:text-slate-900">
              ← Back to Pharmacy
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white overflow-hidden shadow-sm">
        <PharmacyTabs />

        <div className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ReceiptText className="h-5 w-5 text-indigo-600" />
              <span>Step {step} of 3</span>
            </div>
            <div className="sm:ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                className="h-10 rounded-xl border-slate-200"
                onClick={() => setStep(1)}
              >
                Patient
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-xl border-slate-200"
                onClick={() => canNext1 && setStep(2)}
                disabled={!canNext1}
              >
                Meds
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-xl border-slate-200"
                onClick={() => canNext1 && canNext2 && setStep(3)}
                disabled={!canNext1 || !canNext2}
              >
                Payment
              </Button>
            </div>
          </div>
        </div>
      </div>

      {step === 1 ? (
        <Card className="rounded-xl border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <UserRound className="h-5 w-5 text-indigo-600" />
              Patient Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className={label}>Search patient</div>
              <div className="relative mt-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  className="h-11 rounded-xl pl-12"
                  placeholder="Search by name or phone..."
                />
              </div>
              <div className="mt-2 rounded-xl border border-slate-100 overflow-hidden">
                {patientLoading ? (
                  <div className="p-4 text-sm text-slate-500">Loading...</div>
                ) : patients.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">No patients found</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {patients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPatient(p)}
                        className={[
                          'w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors',
                          patient?.id === p.id ? 'bg-indigo-50/50' : '',
                        ].join(' ')}
                      >
                        <div className="font-semibold text-slate-900">{p.fullName || 'Unnamed'}</div>
                        <div className="text-xs text-slate-500">{p.phone || p.patientNumber || ''}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-8">
                <div className={label}>Link to existing medical prescription (optional)</div>
                <Select value={linkedPrescriptionId} onValueChange={setLinkedPrescriptionId}>
                  <SelectTrigger className="mt-1 h-11 rounded-xl" disabled={!patient?.id}>
                    <SelectValue placeholder={patient?.id ? 'Select prescription' : 'Select patient first'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {prescriptions.map((rx) => (
                      <SelectItem key={rx.id} value={rx.id}>
                        RX-{String(rx.id).slice(0, 6).toUpperCase()} (qty {Number(rx.quantity || 0) || 1})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-1 text-xs text-slate-500">
                  {prescriptionLoading ? 'Loading prescriptions...' : patient?.id ? `${prescriptions.length} prescription(s) found` : ''}
                </div>
              </div>
              <div className="lg:col-span-4 flex items-end">
                <Button
                  onClick={linkPrescriptionToCart}
                  disabled={!patient?.id || linkedPrescriptionId === 'none' || prescriptionLoading}
                  className="h-11 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold"
                >
                  Add Rx Item to Cart
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
              <Button
                onClick={() => setStep(2)}
                disabled={!canNext1}
                className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 text-base font-semibold"
              >
                Next: Select Meds
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-xl border-slate-200 px-6 text-base font-semibold">
                <Link href="/dashboard/pharmacy">Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <Card className="rounded-xl border-slate-100 shadow-sm xl:col-span-7">
            <CardHeader>
              <CardTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-indigo-600" />
                Meds Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className={label}>Search inventory</div>
                <div className="relative mt-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    value={medQuery}
                    onChange={(e) => setMedQuery(e.target.value)}
                    className="h-11 rounded-xl pl-12"
                    placeholder="Search by name, SKU, barcode..."
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 overflow-hidden">
                {medLoading ? (
                  <div className="p-4 text-sm text-slate-500">Loading...</div>
                ) : meds.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">No medicines found</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {meds.map((m) => {
                      const stock = Number(m.stockQuantity || 0)
                      const disabled = stock <= 0
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => !disabled && addToCart(m)}
                          disabled={disabled}
                          className={[
                            'w-full text-left px-4 py-3 transition-colors',
                            disabled ? 'opacity-60 cursor-not-allowed bg-red-50/20' : 'hover:bg-slate-50',
                          ].join(' ')}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate">{m.genericName || m.itemName}</div>
                              <div className="text-xs text-slate-500 truncate">
                                {(m.sku || m.barcode || '').toString()} {m.strength ? `• ${m.strength}` : ''}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-sm font-extrabold text-slate-900">{money(Number(m.sellingPrice || 0))}</div>
                              <div className="text-xs text-slate-500">Stock: {stock}</div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-slate-100 shadow-sm xl:col-span-5">
            <CardHeader>
              <CardTitle className="text-lg font-extrabold text-slate-900">Cart</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.length === 0 ? (
                <div className="text-sm text-slate-500">Add medicines from the list.</div>
              ) : (
                <div className="space-y-2">
                  {cart.map((c) => (
                    <div key={c.itemId} className="rounded-xl border border-slate-100 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{c.label}</div>
                          <div className="text-xs text-slate-500 truncate">
                            {c.sku || ''} {c.strength ? `• ${c.strength}` : ''}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-extrabold text-slate-900">{money(c.unitPrice * c.quantity)}</div>
                          <div className="text-xs text-slate-500">{money(c.unitPrice)} each</div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            className="h-9 w-9 rounded-xl border-slate-200 p-0"
                            onClick={() => setQty(c.itemId, c.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            value={String(c.quantity)}
                            onChange={(e) => setQty(c.itemId, Number(e.target.value || 1))}
                            className="h-9 w-16 rounded-xl text-center"
                            inputMode="numeric"
                          />
                          <Button
                            variant="outline"
                            className="h-9 w-9 rounded-xl border-slate-200 p-0"
                            onClick={() => setQty(c.itemId, c.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <Button variant="outline" className="h-9 rounded-xl border-slate-200" onClick={() => removeFromCart(c.itemId)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-slate-100 p-4 bg-slate-50/40">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase text-slate-500">Subtotal</div>
                  <div className="text-lg font-extrabold text-slate-900">{money(subtotal)}</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="h-11 rounded-xl border-slate-200 px-6 text-base font-semibold"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!canNext2}
                  className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 text-base font-semibold"
                >
                  Next: Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {step === 3 ? (
        <Card className="rounded-xl border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              Payment & Print
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <div className={label}>Payment method</div>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-1 h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Insurance">Insurance</SelectItem>
                    <SelectItem value="Mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className={label}>Amount paid</div>
                <Input value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="mt-1 h-11 rounded-xl" inputMode="decimal" />
              </div>
              <div className="rounded-xl border border-slate-100 p-4 bg-slate-50/40 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-500">Total</div>
                  <div className="text-xs text-slate-500">Items: {cart.length}</div>
                </div>
                <div className="text-2xl font-extrabold text-slate-900">{money(subtotal)}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
              <Button
                onClick={submitSale}
                disabled={!canFinish}
                className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 text-base font-semibold"
              >
                {submitting ? 'Processing...' : 'Complete Sale & Print'}
              </Button>
              <Button
                onClick={() => setStep(2)}
                variant="outline"
                className="h-11 rounded-xl border-slate-200 px-6 text-base font-semibold"
              >
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
