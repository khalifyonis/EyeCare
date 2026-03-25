'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Glasses, Box, Truck, User, Search } from 'lucide-react'

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
}

type PrescriptionType = 'SPECTACLES' | 'CONTACT_LENS' | 'BOTH'

const COATING_OPTIONS = ['Anti-Reflective', 'Blue Light Filter', 'Scratch Resistant', 'UV Protection', 'Photochromic', 'Hydrophobic', 'Oleophobic'] as const

const ORDER_TYPES: { value: PrescriptionType; label: string }[] = [
  { value: 'SPECTACLES', label: 'Spectacles Only' },
  { value: 'CONTACT_LENS', label: 'Contact Lenses' },
  { value: 'BOTH', label: 'Both' },
]

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

  const [saving, setSaving] = useState(false)

  const [patientOpen, setPatientOpen] = useState(false)
  const [patientQuery, setPatientQuery] = useState('')
  const [patientLoading, setPatientLoading] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [patient, setPatient] = useState<Patient | null>(null)
  const patientRef = useRef<HTMLDivElement | null>(null)

  const [orderType, setOrderType] = useState<PrescriptionType>('SPECTACLES')

  const [frameOpen, setFrameOpen] = useState(false)
  const [frameQuery, setFrameQuery] = useState('')
  const [frameLoading, setFrameLoading] = useState(false)
  const [frames, setFrames] = useState<InventoryItem[]>([])
  const [frameItem, setFrameItem] = useState<InventoryItem | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)

  const [lensOpen, setLensOpen] = useState(false)
  const [lensQuery, setLensQuery] = useState('')
  const [lensLoading, setLensLoading] = useState(false)
  const [lenses, setLenses] = useState<InventoryItem[]>([])
  const [lensItem, setLensItem] = useState<InventoryItem | null>(null)
  const lensRef = useRef<HTMLDivElement | null>(null)

  const [lensType, setLensType] = useState('Single Vision')
  const [lensMaterial, setLensMaterial] = useState('CR-39')
  const [coatings, setCoatings] = useState<string[]>([])
  const [lensPrice, setLensPrice] = useState('0')
  const [labInstructions, setLabInstructions] = useState('')

  const [activeTab, setActiveTab] = useState<'frame-lens' | 'payment' | 'delivery'>('frame-lens')
  const [paymentStatus, setPaymentStatus] = useState('unpaid')
  const [paidAmount, setPaidAmount] = useState('0')
  const [deliveryMethod, setDeliveryMethod] = useState('pickup')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')

  const searchPatients = useCallback(async (query: string) => {
    const term = query.trim()
    if (!term) {
      setPatients([])
      return
    }

    setPatientLoading(true)
    try {
      const response = await api.get('/patients', { params: { search: term } })
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
    if (!term) return [] as InventoryItem[]

    const response = await api.get('/inventory/optical', {
      params: {
        itemType,
        search: term,
        page: 1,
        limit: 10,
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
      }))
      .filter((row) => row.id)
  }, [])

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node

      if (patientOpen && patientRef.current && !patientRef.current.contains(target)) {
        setPatientOpen(false)
      }
      if (frameOpen && frameRef.current && !frameRef.current.contains(target)) {
        setFrameOpen(false)
      }
      if (lensOpen && lensRef.current && !lensRef.current.contains(target)) {
        setLensOpen(false)
      }
    }

    document.addEventListener('mousedown', onDocumentClick)
    return () => document.removeEventListener('mousedown', onDocumentClick)
  }, [patientOpen, frameOpen, lensOpen])

  useEffect(() => {
    if (!patientOpen) return
    const timer = setTimeout(() => {
      void searchPatients(patientQuery)
    }, 250)
    return () => clearTimeout(timer)
  }, [patientOpen, patientQuery, searchPatients])

  useEffect(() => {
    if (!frameOpen) return
    const timer = setTimeout(async () => {
      setFrameLoading(true)
      try {
        const result = await searchInventory(frameQuery, 'Frame')
        setFrames(result)
      } catch {
        setFrames([])
      } finally {
        setFrameLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [frameOpen, frameQuery, searchInventory])

  useEffect(() => {
    if (!lensOpen) return
    const timer = setTimeout(async () => {
      setLensLoading(true)
      try {
        const result = await searchInventory(lensQuery, 'Lens')
        setLenses(result)
      } catch {
        setLenses([])
      } finally {
        setLensLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [lensOpen, lensQuery, searchInventory])

  const toggleCoating = (value: string) => {
    setCoatings((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]))
  }

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
        `Payment: ${paymentStatus}, Paid: ${paidAmount}`,
        `Delivery: ${deliveryMethod}${deliveryDate ? ` on ${deliveryDate}` : ''}`,
        deliveryNotes.trim() ? `Delivery Notes: ${deliveryNotes.trim()}` : '',
      ]
        .filter(Boolean)
        .join(' | ')

      const payload = {
        patientId: patient.id,
        type: orderType,
        validityMonths: 12,
        frameType: frameItem ? inventoryLabel(frameItem) : null,
        lensType: lensType || null,
        lensMaterial: lensMaterial || null,
        coatings,
        frameItemId: frameItem?.id || null,
        lensItemId: lensItem?.id || null,
        notes,
      }

      try {
        await api.post('/prescriptions', payload)
      } catch {
        await api.post('/optical-prescriptions', payload)
      }

      toast.success('Order created')
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
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">New Optical Order</h1>
        <p className="mt-1 text-xl text-slate-600">Create a new spectacles or contact lens order</p>
        <div className="mt-4">
          <Link href="/dashboard/optical-shop" className="text-xl text-slate-600 hover:text-slate-900">
            ← Back to Optical Shop
          </Link>
        </div>
      </div>

      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-4xl text-slate-900">
            <User className="h-8 w-8 text-[#0EA5E9]" /> Patient Information
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
              className="h-12 rounded-xl pl-12 text-xl"
              placeholder="Search patient by name or ID..."
            />
          </div>

          {patientOpen && (
            <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              {patientLoading ? (
                <div className="px-4 py-3 text-lg text-slate-500">Searching...</div>
              ) : patientQuery.trim() && patients.length === 0 ? (
                <div className="px-4 py-3 text-lg text-slate-500">No patients found</div>
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
                    <div className="text-xl font-semibold text-slate-900">{item.fullName || 'Unknown Patient'}</div>
                    <div className="text-lg text-slate-500">{item.patientNumber || item.id}</div>
                  </button>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-4xl">Order Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {ORDER_TYPES.map((option) => {
              const active = orderType === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setOrderType(option.value)}
                  className={active ? 'rounded-xl border-2 border-[#0EA5E9] bg-sky-50 p-5 text-center text-2xl font-semibold text-[#0c96d4]' : 'rounded-xl border border-slate-200 bg-white p-5 text-center text-2xl font-medium text-slate-600 hover:bg-slate-50'}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 overflow-hidden rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('frame-lens')}
              className={activeTab === 'frame-lens' ? 'flex items-center justify-center gap-2 border-b-2 border-[#0EA5E9] bg-sky-50 px-4 py-3 text-2xl font-semibold text-[#0c96d4]' : 'flex items-center justify-center gap-2 border-b border-slate-200 px-4 py-3 text-2xl text-slate-500'}
            >
              <Glasses className="h-6 w-6" /> Frame & Lens
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('payment')}
              className={activeTab === 'payment' ? 'flex items-center justify-center gap-2 border-b-2 border-[#0EA5E9] bg-sky-50 px-4 py-3 text-2xl font-semibold text-[#0c96d4]' : 'flex items-center justify-center gap-2 border-b border-slate-200 px-4 py-3 text-2xl text-slate-500'}
            >
              <Box className="h-6 w-6" /> Payment
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('delivery')}
              className={activeTab === 'delivery' ? 'flex items-center justify-center gap-2 border-b-2 border-[#0EA5E9] bg-sky-50 px-4 py-3 text-2xl font-semibold text-[#0c96d4]' : 'flex items-center justify-center gap-2 border-b border-slate-200 px-4 py-3 text-2xl text-slate-500'}
            >
              <Truck className="h-6 w-6" /> Delivery
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {activeTab === 'frame-lens' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div ref={frameRef}>
                  <Label className="text-xl">Select Frame</Label>
                  <div className="relative mt-1">
                    <Input
                      value={frameOpen ? frameQuery : frameItem ? inventoryLabel(frameItem) : ''}
                      onChange={(event) => {
                        setFrameQuery(event.target.value)
                        setFrameOpen(true)
                      }}
                      onFocus={() => setFrameOpen(true)}
                      className="h-12 rounded-xl text-xl"
                      placeholder="Search frame by name or brand..."
                    />

                    {frameOpen && (
                      <div className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                        {frameLoading ? (
                          <div className="px-4 py-3 text-lg text-slate-500">Searching...</div>
                        ) : frameQuery.trim() && frames.length === 0 ? (
                          <div className="px-4 py-3 text-lg text-slate-500">No frames found</div>
                        ) : (
                          frames.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className="w-full px-4 py-3 text-left hover:bg-slate-50"
                              onClick={() => {
                                setFrameItem(item)
                                setFrameOpen(false)
                                setFrameQuery('')
                              }}
                            >
                              <div className="text-xl font-semibold text-slate-900">{item.itemName || 'Unnamed'}</div>
                              <div className="text-lg text-slate-500">{item.brand || '-'} - Stock: {typeof item.stockQuantity === 'number' ? item.stockQuantity : '-'}</div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div ref={lensRef}>
                  <Label className="text-xl">Select Lens</Label>
                  <div className="relative mt-1">
                    <Input
                      value={lensOpen ? lensQuery : lensItem ? inventoryLabel(lensItem) : ''}
                      onChange={(event) => {
                        setLensQuery(event.target.value)
                        setLensOpen(true)
                      }}
                      onFocus={() => setLensOpen(true)}
                      className="h-12 rounded-xl text-xl"
                      placeholder="Search lens by name or brand..."
                    />

                    {lensOpen && (
                      <div className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                        {lensLoading ? (
                          <div className="px-4 py-3 text-lg text-slate-500">Searching...</div>
                        ) : lensQuery.trim() && lenses.length === 0 ? (
                          <div className="px-4 py-3 text-lg text-slate-500">No lenses found</div>
                        ) : (
                          lenses.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className="w-full px-4 py-3 text-left hover:bg-slate-50"
                              onClick={() => {
                                setLensItem(item)
                                setLensOpen(false)
                                setLensQuery('')
                              }}
                            >
                              <div className="text-xl font-semibold text-slate-900">{item.itemName || 'Unnamed'}</div>
                              <div className="text-lg text-slate-500">{item.brand || '-'} - Stock: {typeof item.stockQuantity === 'number' ? item.stockQuantity : '-'}</div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xl">Lens Type</Label>
                  <Input value={lensType} onChange={(event) => setLensType(event.target.value)} className="mt-1 h-12 rounded-xl text-xl" />
                </div>
                <div>
                  <Label className="text-xl">Lens Material</Label>
                  <Input value={lensMaterial} onChange={(event) => setLensMaterial(event.target.value)} className="mt-1 h-12 rounded-xl text-xl" />
                </div>
              </div>

              <div>
                <Label className="text-xl">Lens Coatings</Label>
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
                  <Label className="text-xl">Lens Price (Total for pair)</Label>
                  <Input type="number" min={0} step="0.01" value={lensPrice} onChange={(event) => setLensPrice(event.target.value)} className="mt-1 h-12 rounded-xl text-xl" />
                </div>
                <div>
                  <Label className="text-xl">Lab Instructions</Label>
                  <Input value={labInstructions} onChange={(event) => setLabInstructions(event.target.value)} className="mt-1 h-12 rounded-xl text-xl" />
                </div>
              </div>
            </>
          )}

          {activeTab === 'payment' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xl">Payment Status</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger className="mt-1 h-12 rounded-xl text-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partial">Partially Paid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xl">Paid Amount</Label>
                <Input type="number" min={0} step="0.01" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} className="mt-1 h-12 rounded-xl text-xl" />
              </div>
            </div>
          )}

          {activeTab === 'delivery' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xl">Delivery Method</Label>
                <Select value={deliveryMethod} onValueChange={setDeliveryMethod}>
                  <SelectTrigger className="mt-1 h-12 rounded-xl text-xl">
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
                <Label className="text-xl">Expected Delivery Date</Label>
                <Input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} className="mt-1 h-12 rounded-xl text-xl" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xl">Delivery Notes</Label>
                <Textarea value={deliveryNotes} onChange={(event) => setDeliveryNotes(event.target.value)} className="mt-1 rounded-xl text-xl" placeholder="Address, phone, special instructions..." />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button asChild variant="outline" className="h-12 rounded-xl px-8 text-xl" disabled={saving}>
              <Link href="/dashboard/optical-shop">Cancel</Link>
            </Button>
            <Button className="h-12 rounded-xl bg-[#0EA5E9] px-8 text-xl font-semibold hover:bg-[#0c96d4]" onClick={onCreate} disabled={!canCreate}>
              {saving ? 'Creating...' : 'Create Order'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
