'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type OpticalOrder = {
  id: string
  type: 'SPECTACLES' | 'CONTACT_LENS' | 'BOTH'
  status: 'FILLED' | 'DISPENSED'
  validityMonths?: number
  notes?: string | null
  lensType?: string | null
  lensMaterial?: string | null
  frameType?: string | null
  coatings?: string[]
  createdAt?: string
  patient?: { id: string; fullName?: string | null; patientNumber?: string | null } | null
}

function compactId(id: string) {
  const val = String(id || '')
  if (val.length <= 8) return val.toUpperCase()
  return val.slice(0, 8).toUpperCase()
}

export default function OpticalOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const orderId = params?.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [type, setType] = useState<'SPECTACLES' | 'CONTACT_LENS' | 'BOTH'>('SPECTACLES')
  const [status, setStatus] = useState<'FILLED' | 'DISPENSED'>('FILLED')
  const [validityMonths, setValidityMonths] = useState('12')
  const [frameType, setFrameType] = useState('')
  const [lensType, setLensType] = useState('')
  const [lensMaterial, setLensMaterial] = useState('')
  const [coatings, setCoatings] = useState('')
  const [notes, setNotes] = useState('')

  const [patientLabel, setPatientLabel] = useState('')

  const load = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    try {
      let response
      try {
        response = await api.get(`/prescriptions/${orderId}`)
      } catch {
        response = await api.get(`/optical-prescriptions/${orderId}`)
      }
      const row = response.data as OpticalOrder

      setType(row.type)
      setStatus(row.status)
      setValidityMonths(String(row.validityMonths || 12))
      setFrameType(String(row.frameType || ''))
      setLensType(String(row.lensType || ''))
      setLensMaterial(String(row.lensMaterial || ''))
      setCoatings(Array.isArray(row.coatings) ? row.coatings.join(', ') : '')
      setNotes(String(row.notes || ''))

      const pName = String(row.patient?.fullName || 'Unknown Patient')
      const pCode = String(row.patient?.patientNumber || row.patient?.id || '-')
      setPatientLabel(`${pName} (${pCode})`)
    } catch {
      toast.error('Failed to load order details')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    void load()
  }, [load])

  const onSave = async () => {
    if (!orderId) return
    const validity = Number(validityMonths)
    if (!Number.isFinite(validity) || validity < 1) {
      toast.error('Validity must be at least 1 month')
      return
    }

    setSaving(true)
    try {
      const payload = {
        type,
        status,
        validityMonths: Math.trunc(validity),
        frameType: frameType.trim() || null,
        lensType: lensType.trim() || null,
        lensMaterial: lensMaterial.trim() || null,
        coatings: coatings
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        notes: notes.trim() || null,
      }

      try {
        await api.put(`/prescriptions/${orderId}`, payload)
      } catch {
        await api.put(`/optical-prescriptions/${orderId}`, payload)
      }
      toast.success('Order updated')
      await load()
    } catch (error: unknown) {
      const message =
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(typeof message === 'string' ? message : 'Failed to update order')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (!orderId) return
    const ok = window.confirm('Delete this optical order? This action cannot be undone.')
    if (!ok) return

    setDeleting(true)
    try {
      try {
        await api.delete(`/prescriptions/${orderId}`)
      } catch {
        await api.delete(`/optical-prescriptions/${orderId}`)
      }
      toast.success('Order deleted')
      router.push('/dashboard/optical-shop')
    } catch (error: unknown) {
      const message =
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(typeof message === 'string' ? message : 'Failed to delete order')
    } finally {
      setDeleting(false)
    }
  }

  const canSave = useMemo(() => !loading && !saving && !deleting, [loading, saving, deleting])

  return (
    <div className="optical-page w-full min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Order Details</h1>
        <p className="mt-1 text-xl text-slate-600">OPT-{compactId(String(orderId || ''))}</p>
        <div className="mt-4">
          <Link href="/dashboard/optical-shop" className="text-xl text-slate-600 hover:text-slate-900">
            ← Back to Optical Shop
          </Link>
        </div>
      </div>

      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-3xl">Patient</CardTitle>
        </CardHeader>
        <CardContent>
          <Input value={patientLabel} disabled className="h-12 text-xl" />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-3xl">Order Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xl">Order Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as 'SPECTACLES' | 'CONTACT_LENS' | 'BOTH')}>
              <SelectTrigger className="mt-1 h-12 text-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SPECTACLES">Spectacles</SelectItem>
                <SelectItem value="CONTACT_LENS">Contact Lens</SelectItem>
                <SelectItem value="BOTH">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xl">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as 'FILLED' | 'DISPENSED')}>
              <SelectTrigger className="mt-1 h-12 text-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FILLED">Active</SelectItem>
                <SelectItem value="DISPENSED">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xl">Validity (Months)</Label>
            <Input type="number" min={1} value={validityMonths} onChange={(event) => setValidityMonths(event.target.value)} className="mt-1 h-12 text-xl" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-3xl">Frame & Lens</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xl">Frame Type</Label>
            <Input value={frameType} onChange={(event) => setFrameType(event.target.value)} className="mt-1 h-12 text-xl" />
          </div>
          <div>
            <Label className="text-xl">Lens Type</Label>
            <Input value={lensType} onChange={(event) => setLensType(event.target.value)} className="mt-1 h-12 text-xl" />
          </div>
          <div>
            <Label className="text-xl">Lens Material</Label>
            <Input value={lensMaterial} onChange={(event) => setLensMaterial(event.target.value)} className="mt-1 h-12 text-xl" />
          </div>
          <div>
            <Label className="text-xl">Coatings (comma separated)</Label>
            <Input value={coatings} onChange={(event) => setCoatings(event.target.value)} className="mt-1 h-12 text-xl" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xl">Notes</Label>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 h-12 text-xl" />
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <Button variant="outline" className="h-12 rounded-xl px-8 text-xl" onClick={() => void load()} disabled={loading || saving || deleting}>
              Refresh
            </Button>
            <Button className="h-12 rounded-xl bg-[#0EA5E9] px-8 text-xl font-semibold hover:bg-[#0c96d4]" onClick={onSave} disabled={!canSave}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button className="h-12 rounded-xl bg-red-600 px-8 text-xl font-semibold hover:bg-red-700" onClick={onDelete} disabled={loading || saving || deleting}>
              {deleting ? 'Deleting...' : 'Delete Order'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
