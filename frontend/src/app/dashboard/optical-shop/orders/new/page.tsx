'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Glasses, Box, Truck, User, Search, ChevronDown } from 'lucide-react'

type Patient = {
  id: string
  fullName?: string | null
  patientNumber?: string | null
}

type InventoryItem = {
  id: string
  itemName?: string | null
  brand?: string | null
  stockQuantity?: number | null
  sellingPrice?: number | null
}

type PrescriptionType = 'SPECTACLES'

const COATING_OPTIONS = ['Anti-Reflective', 'Blue Light Filter', 'Scratch Resistant', 'UV Protection', 'Photochromic', 'Hydrophobic', 'Oleophobic'] as const



const LENS_TYPE_OPTIONS = ['Single Vision', 'Bifocal', 'Progressive', 'Occupational'] as const
const LENS_MATERIAL_OPTIONS = ['CR-39 (Standard Plastic)', 'Polycarbonate', 'Trivex', 'High Index 1.67', 'High Index 1.74', 'Photochromic'] as const

function patientLabel(patient: Patient) {
  const name = String(patient.fullName || '').trim() || 'Unknown Patient'
  const code = patient.patientNumber || patient.id
  return `${name} (${code})`
}

function inventoryLabel(item: InventoryItem) {
  const name = String(item.itemName || '').trim() || 'Unnamed'
  const brand = String(item.brand || '').trim()
  return brand ? `${name} - ${brand}` : name
}

export default function NewOpticalOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prescriptionId = searchParams.get('prescriptionId')

  const [saving, setSaving] = useState(false)

  const [patientOpen, setPatientOpen] = useState(false)
  const [patientQuery, setPatientQuery] = useState('')
  const [patientLoading, setPatientLoading] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [patient, setPatient] = useState<Patient | null>(null)
  const patientRef = useRef<HTMLDivElement | null>(null)

  const orderType: PrescriptionType = 'SPECTACLES'

  const [frameLoading, setFrameLoading] = useState(false)
  const [frames, setFrames] = useState<InventoryItem[]>([])
  const [frameItem, setFrameItem] = useState<InventoryItem | null>(null)

  const [lensType, setLensType] = useState('Single Vision')
  const [lensMaterial, setLensMaterial] = useState('CR-39 (Standard Plastic)')
  const [coatings, setCoatings] = useState<string[]>([])
  const [lensPrice, setLensPrice] = useState('0')
  const [labInstructions, setLabInstructions] = useState('')

  const [activeTab, setActiveTab] = useState<'frame-lens' | 'payment' | 'delivery'>('frame-lens')
  const [discountType, setDiscountType] = useState('fixed')
  const [discountValue, setDiscountValue] = useState('0')
  const [discountReason, setDiscountReason] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paidAmount, setPaidAmount] = useState('0')
  const [deliveryMethod, setDeliveryMethod] = useState('pickup')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')

  const searchPatients = useCallback(async (query: string) => {
    const term = query.trim()

    setPatientLoading(true)
    try {
      const response = await api.get('/patients', {
        params: {
          search: term || undefined,
          page: 1,
          limit: 12,
        },
      })
      const body = response.data as { data?: unknown[] }
      const list = Array.isArray(body?.data) ? body.data : []

      const mapped: Patient[] = list
        .map((row) => {
          const data = row as Record<string, unknown>
          return {
            id: String(data.id || ''),
            fullName: typeof data.fullName === 'string' ? data.fullName : null,
            patientNumber: typeof data.patientNumber === 'string' ? data.patientNumber : null,
          }
        })
        .filter((item) => item.id)
        .slice(0, 10)

      setPatients(mapped)
    } catch {
      setPatients([])
    } finally {
      setPatientLoading(false)
    }
  }, [])

  const searchInventory = useCallback(async (query: string, itemType: 'Frame' | 'Lens') => {
    const term = query.trim()

    const response = await api.get('/inventory/optical', {
      params: {
        itemType,
        search: term || undefined,
        page: 1,
        limit: 100,
      },
    })

    const body = response.data as { data?: InventoryItem[] }
    const rows = Array.isArray(body?.data) ? body.data : []
    return rows
      .map((row) => ({
        id: String(row.id),
        itemName: row.itemName ?? null,
        brand: row.brand ?? null,
        stockQuantity: typeof row.stockQuantity === 'number' ? row.stockQuantity : null,
        sellingPrice: typeof row.sellingPrice === 'number' ? row.sellingPrice : null,
      }))
      .filter((row) => row.id)
  }, [])

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node

      if (patientOpen && patientRef.current && !patientRef.current.contains(target)) {
        setPatientOpen(false)
      }
    }

    document.addEventListener('mousedown', onDocumentClick)
    return () => document.removeEventListener('mousedown', onDocumentClick)
  }, [patientOpen])

  useEffect(() => {
    if (!patientOpen) return
    const timer = setTimeout(() => {
      void searchPatients(patientQuery)
    }, 250)
    return () => clearTimeout(timer)
  }, [patientOpen, patientQuery, searchPatients])

  useEffect(() => {
    const timer = setTimeout(async () => {
      setFrameLoading(true)
      try {
        const result = await searchInventory('', 'Frame')
        setFrames(result)
      } catch {
        setFrames([])
      } finally {
        setFrameLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [searchInventory])

  // Auto-populate from prescription if prescriptionId is provided
  useEffect(() => {
    if (!prescriptionId) return
    let cancelled = false
    const loadPrescription = async () => {
      try {
        const res = await api.get(`/prescriptions/${prescriptionId}`)
        const rx = res.data as Record<string, any>
        if (cancelled) return

        // Auto-select patient
        if (rx.patient) {
          setPatient({
            id: rx.patient.id,
            fullName: rx.patient.fullName || null,
            patientNumber: rx.patient.patientNumber || null,
          })
        }

        // Auto-select frame if linked
        if (rx.frameItemId) {
          const frameRes = await api.get(`/inventory/optical/${rx.frameItemId}`).catch(() => null)
          if (frameRes && !cancelled) {
            const f = frameRes.data as InventoryItem
            setFrameItem({ id: f.id, itemName: f.itemName, brand: f.brand, stockQuantity: f.stockQuantity, sellingPrice: f.sellingPrice })
          }
        }

        toast.info('Prescription data loaded — review and complete the order')
      } catch {
        toast.error('Could not load prescription details')
      }
    }
    void loadPrescription()
    return () => { cancelled = true }
  }, [prescriptionId])

  const toggleCoating = (value: string) => {
    setCoatings((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]))
  }

  const framePriceValue = Number(frameItem?.sellingPrice || 0)
  const lensPriceValue = Number(lensPrice || 0)
  const subTotalAmountValue = Math.max(0, framePriceValue + lensPriceValue)
  const discountInputValue = Math.max(0, Number(discountValue || 0))
  const discountAppliedValue = discountType === 'percentage'
    ? Math.min(subTotalAmountValue, (subTotalAmountValue * discountInputValue) / 100)
    : Math.min(subTotalAmountValue, discountInputValue)
  const totalAmountValue = Math.max(0, subTotalAmountValue - discountAppliedValue)
  const paidAmountValue = Number(paidAmount || 0)
  const remainingAmountValue = Math.max(0, totalAmountValue - paidAmountValue)

  const canCreate = useMemo(() => {
    return Boolean(patient && !saving)
  }, [patient, saving])

  const onCreate = async () => {
    if (!patient) {
      toast.error('Please select a patient')
      return
    }

    setSaving(true)
    try {
      const notes = [
        labInstructions.trim() ? `Lab: ${labInstructions.trim()}` : '',
        `Payment: Method: ${paymentMethod}, Subtotal: ${subTotalAmountValue.toFixed(2)}, Discount: ${discountAppliedValue.toFixed(2)} (${discountType}), Total: ${totalAmountValue.toFixed(2)}, Paid: ${paidAmountValue.toFixed(2)}, Remaining: ${remainingAmountValue.toFixed(2)}`,
        discountReason.trim() ? `Discount Reason: ${discountReason.trim()}` : '',
        `Delivery: ${deliveryMethod}${deliveryDate ? ` on ${deliveryDate}` : ''}`,
        deliveryNotes.trim() ? `Delivery Notes: ${deliveryNotes.trim()}` : '',
      ]
        .filter(Boolean)
        .join(' | ')

      const status = paidAmountValue >= totalAmountValue && totalAmountValue > 0 ? 'PAID' : paidAmountValue > 0 ? 'PARTIAL' : 'UNPAID'

      const lineItems = []
      if (frameItem) {
        lineItems.push({
          itemType: 'OPTICAL_FRAME',
          itemId: frameItem.id,
          description: `Frame: ${frameItem.itemName} (${frameItem.brand || ''})`,
          quantity: 1,
          unitPrice: frameItem.sellingPrice || 0,
        })
      }
      if (lensPriceValue > 0) {
        lineItems.push({
          itemType: 'LENSES',
          itemId: 'manual',
          description: `Lenses: ${lensType} (${lensMaterial || ''})`,
          quantity: 2,
          unitPrice: lensPriceValue / 2,
        })
      }

      await api.post('/billing', {
        patientId: patient.id,
        serviceType: 'OPTICAL',
        opticalPrescriptionId: prescriptionId || undefined,
        totalAmount: subTotalAmountValue,
        discount: discountAppliedValue,
        finalAmount: totalAmountValue,
        paymentMethod: paymentMethod.toUpperCase(),
        status,
        notes,
        lineItems,
      })

      toast.success('Order & Billing created')
      router.push('/dashboard/optical-shop')
    } catch (error: unknown) {
      const message =
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(typeof message === 'string' ? message : 'Failed to create order')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="optical-page optical-form-page w-full min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">New Optical Order</h1>
        <p className="mt-1 text-lg text-slate-700">Create a new spectacle order</p>
        <div className="mt-4">
          <Link href="/dashboard/optical-shop" className="text-lg text-slate-700 hover:text-slate-900">
            ← Back to Optical Shop
          </Link>
        </div>
      </div>

      <Card className="rounded-2xl border-slate-300 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-slate-900">
            <User className="h-6 w-6 text-[#0EA5E9]" /> Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent ref={patientRef}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              value={patientOpen ? patientQuery : patient ? patientLabel(patient) : ''}
              onChange={(event) => {
                setPatientQuery(event.target.value)
                setPatientOpen(true)
              }}
              onFocus={() => setPatientOpen(true)}
              className="h-12 rounded-xl pl-12 pr-12 text-lg font-normal"
              placeholder="Search patient by name or ID..."
            />
            <button
              type="button"
              aria-label={patientOpen ? 'Close patient list' : 'Open patient list'}
              onClick={() => setPatientOpen((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <ChevronDown className={`h-5 w-5 transition-transform ${patientOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {patientOpen && (
            <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              {patientLoading ? (
                <div className="px-4 py-3 text-sm text-slate-500">Searching...</div>
              ) : patientQuery.trim() && patients.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500">No patients found</div>
              ) : (
                patients.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full px-4 py-3 text-left hover:bg-slate-50"
                    onClick={() => {
                      setPatient(item)
                      setPatientOpen(false)
                      setPatientQuery('')
                    }}
                  >
                    <div className="text-base font-semibold text-slate-900">{item.fullName || 'Unknown Patient'}</div>
                    <div className="text-sm text-slate-500">{item.patientNumber || item.id}</div>
                  </button>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>



      <Card className="rounded-2xl border-slate-300 shadow-sm">
        <CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 overflow-hidden rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('frame-lens')}
              className={activeTab === 'frame-lens' ? 'flex items-center justify-center gap-2 border-b-2 border-[#0EA5E9] bg-sky-50 px-4 py-3 text-xl font-semibold text-[#0c96d4]' : 'flex items-center justify-center gap-2 border-b border-slate-200 px-4 py-3 text-xl text-slate-500'}
            >
              <Glasses className="h-5 w-5" /> Frame & Lens
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('payment')}
              className={activeTab === 'payment' ? 'flex items-center justify-center gap-2 border-b-2 border-[#0EA5E9] bg-sky-50 px-4 py-3 text-xl font-semibold text-[#0c96d4]' : 'flex items-center justify-center gap-2 border-b border-slate-200 px-4 py-3 text-xl text-slate-500'}
            >
              <Box className="h-5 w-5" /> Payment
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('delivery')}
              className={activeTab === 'delivery' ? 'flex items-center justify-center gap-2 border-b-2 border-[#0EA5E9] bg-sky-50 px-4 py-3 text-xl font-semibold text-[#0c96d4]' : 'flex items-center justify-center gap-2 border-b border-slate-200 px-4 py-3 text-xl text-slate-500'}
            >
              <Truck className="h-5 w-5" /> Delivery
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {activeTab === 'frame-lens' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-lg font-bold text-slate-700">Select Frame</Label>
                  <Select
                    value={frameItem?.id || 'own'}
                    onValueChange={(value) => {
                      if (value === 'own') {
                        setFrameItem(null)
                        return
                      }
                      const selected = frames.find((item) => item.id === value) || null
                      setFrameItem(selected)
                    }}
                  >
                    <SelectTrigger className="mt-1 h-12 rounded-xl text-lg font-normal">
                      <SelectValue placeholder="Select a frame or patient brings own" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="own">Select a frame or patient brings own</SelectItem>
                      {frameLoading ? (
                        <SelectItem value="loading-frames" disabled>Loading frames...</SelectItem>
                      ) : frames.length === 0 ? (
                        <SelectItem value="no-frames" disabled>No frames available</SelectItem>
                      ) : (
                        frames.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {inventoryLabel(item)} (${Number(item.sellingPrice || 0).toFixed(0)}) [{typeof item.stockQuantity === 'number' ? `${item.stockQuantity} in stock` : 'stock -'}]
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-lg font-bold text-slate-700">Lens Type</Label>
                  <Select value={lensType} onValueChange={setLensType}>
                    <SelectTrigger className="mt-1 h-12 rounded-xl text-lg font-normal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LENS_TYPE_OPTIONS.map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-lg font-bold text-slate-700">Lens Material</Label>
                  <Select value={lensMaterial} onValueChange={setLensMaterial}>
                    <SelectTrigger className="mt-1 h-12 rounded-xl text-lg font-normal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LENS_MATERIAL_OPTIONS.map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-lg font-bold text-slate-700">Lens Coatings</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COATING_OPTIONS.map((item) => {
                    const active = coatings.includes(item)
                    return (
                      <button
                        key={item}
                        type="button"
                        className={active ? 'rounded-full border border-[#0EA5E9] bg-sky-50 px-4 py-2 text-lg font-semibold text-[#0c96d4]' : 'rounded-full border border-slate-200 bg-white px-4 py-2 text-lg text-slate-600 hover:bg-slate-50'}
                        onClick={() => toggleCoating(item)}
                      >
                        {item}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-lg font-bold text-slate-700">Lens Price (Total for pair)</Label>
                  <Input type="number" min={0} step="0.01" value={lensPrice} onChange={(event) => setLensPrice(event.target.value)} className="mt-1 h-12 rounded-xl text-lg font-normal" />
                </div>
                <div>
                  <Label className="text-lg font-bold text-slate-700">Lab Instructions</Label>
                  <Input value={labInstructions} onChange={(event) => setLabInstructions(event.target.value)} className="mt-1 h-12 rounded-xl text-lg font-normal" />
                </div>
              </div>
            </>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <h3 className="text-xl font-semibold text-slate-900">Order Summary</h3>
                <div className="mt-3 space-y-1 text-base">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Frame</span>
                    <span>${framePriceValue.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Lenses</span>
                    <span>${lensPriceValue.toFixed(2)}</span>
                  </div>
                  {discountAppliedValue > 0 && (
                    <div className="flex items-center justify-between text-rose-600">
                      <span>Discount</span>
                      <span>-${discountAppliedValue.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="mt-2 border-t border-slate-200 pt-2 flex items-center justify-between">
                    <span className="text-2xl font-bold text-slate-900">Total</span>
                    <span className="text-3xl font-bold text-[#0EA5E9]">${totalAmountValue.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-lg font-bold text-slate-700">Discount Type</Label>
                  <Select value={discountType} onValueChange={setDiscountType}>
                    <SelectTrigger className="mt-1 h-12 rounded-xl text-lg font-normal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-lg font-bold text-slate-700">Discount ($)</Label>
                  <Input type="number" min={0} step="0.01" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} className="mt-1 h-12 rounded-xl text-lg font-normal" />
                </div>

                <div>
                  <Label className="text-lg font-bold text-slate-700">Discount Reason</Label>
                  <Input value={discountReason} onChange={(event) => setDiscountReason(event.target.value)} className="mt-1 h-12 rounded-xl text-lg font-normal" placeholder="e.g., Loyalty discount" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-lg font-bold text-slate-700">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="mt-1 h-12 rounded-xl text-lg font-normal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="mobile_wallet">Mobile Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-lg font-bold text-slate-700">Amount Paid</Label>
                  <Input type="number" min={0} step="0.01" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} className="mt-1 h-12 rounded-xl text-lg font-normal" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-lg font-bold text-slate-700">Remaining Amount</Label>
                  <Input value={remainingAmountValue.toFixed(2)} readOnly className="mt-1 h-12 rounded-xl text-lg font-normal bg-slate-50" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'delivery' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-lg font-bold text-slate-700">Delivery Method</Label>
                <Select value={deliveryMethod} onValueChange={setDeliveryMethod}>
                  <SelectTrigger className="mt-1 h-12 rounded-xl text-lg font-normal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup">Pick-up</SelectItem>
                    <SelectItem value="courier">Courier</SelectItem>
                    <SelectItem value="home">Home Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-lg font-bold text-slate-700">Expected Delivery Date</Label>
                <Input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} className="mt-1 h-12 rounded-xl text-lg font-normal" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-lg font-bold text-slate-700">Delivery Notes</Label>
                <Textarea value={deliveryNotes} onChange={(event) => setDeliveryNotes(event.target.value)} className="mt-1 rounded-xl text-lg font-normal" placeholder="Address, phone, special instructions..." />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button asChild variant="outline" className="h-12 rounded-xl px-8 text-base" disabled={saving}>
              <Link href="/dashboard/optical-shop">Cancel</Link>
            </Button>
            <Button className="h-12 rounded-xl bg-[#0EA5E9] px-8 text-base font-semibold hover:bg-[#0c96d4]" onClick={onCreate} disabled={!canCreate}>
              {saving ? 'Creating...' : 'Create Order'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
