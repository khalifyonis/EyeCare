'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type FrameMeta = {
  sku: string
  model: string
  color: string
  material: string
  frameType: string
  gender: 'MALE' | 'FEMALE'
  eyeSize: string
  bridge: string
  temple: string
}

function parseFrameMeta(raw: string | null | undefined): Partial<FrameMeta> {
  const text = String(raw || '').trim()
  if (!text.startsWith('{') || !text.endsWith('}')) return {}
  try {
    return JSON.parse(text) as Partial<FrameMeta>
  } catch {
    return {}
  }
}

export default function AddFramePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const itemId = searchParams.get('id')
  const editing = Boolean(itemId)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [sku, setSku] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [color, setColor] = useState('')
  const [material, setMaterial] = useState('Acetate')
  const [frameType, setFrameType] = useState('Full Rim')
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE')

  const [eyeSize, setEyeSize] = useState('52')
  const [bridge, setBridge] = useState('18')
  const [temple, setTemple] = useState('140')

  const [costPrice, setCostPrice] = useState('0')
  const [retailPrice, setRetailPrice] = useState('0')
  const [stockQuantity, setStockQuantity] = useState('0')
  const [reorderLevel, setReorderLevel] = useState('5')

  useEffect(() => {
    if (!itemId) return

    const load = async () => {
      setLoading(true)
      try {
        const response = await api.get(`/inventory/optical/${itemId}`)
        const row = response.data as {
          itemName?: string | null
          brand?: string | null
          manufacturer?: string | null
          purchasePrice?: number | null
          sellingPrice?: number | null
          stockQuantity?: number | null
          reorderLevel?: number | null
        }

        const meta = parseFrameMeta(row.manufacturer)
        setSku(meta.sku || '')
        setBrand(String(row.brand || ''))
        setModel(meta.model || String(row.itemName || ''))
        setColor(meta.color || '')
        setMaterial(meta.material || 'Acetate')
        setFrameType(meta.frameType || 'Full Rim')
        setGender(String(meta.gender || '').toUpperCase() === 'FEMALE' ? 'FEMALE' : 'MALE')
        setEyeSize(meta.eyeSize || '52')
        setBridge(meta.bridge || '18')
        setTemple(meta.temple || '140')

        setCostPrice(String(Number(row.purchasePrice || 0)))
        setRetailPrice(String(Number(row.sellingPrice || 0)))
        setStockQuantity(String(Number(row.stockQuantity || 0)))
        setReorderLevel(String(Number(row.reorderLevel || 5)))
      } catch {
        toast.error('Failed to load frame')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [itemId])

  const canSave = useMemo(() => {
    return sku.trim().length > 0 && brand.trim().length > 0 && model.trim().length > 0 && !saving && !loading
  }, [sku, brand, model, saving, loading])

  const onSave = async () => {
    if (!sku.trim() || !brand.trim() || !model.trim()) {
      toast.error('SKU, brand and model are required')
      return
    }

    const payload = {
      itemName: model.trim(),
      itemType: 'Frame',
      brand: brand.trim(),
      manufacturer: JSON.stringify({
        sku: sku.trim(),
        model: model.trim(),
        color: color.trim() || null,
        material,
        frameType,
        gender,
        eyeSize: eyeSize.trim() || null,
        bridge: bridge.trim() || null,
        temple: temple.trim() || null,
      }),
      stockQuantity: Math.max(0, Number(stockQuantity) || 0),
      reorderLevel: Math.max(0, Number(reorderLevel) || 0),
      purchasePrice: Math.max(0, Number(costPrice) || 0),
      sellingPrice: Math.max(0, Number(retailPrice) || 0),
    }

    setSaving(true)
    try {
      if (editing && itemId) {
        await api.put(`/inventory/optical/${itemId}`, payload)
        toast.success('Frame updated')
      } else {
        await api.post('/inventory/optical', payload)
        toast.success('Frame added')
      }
      router.push('/dashboard/optical-shop/frames')
    } catch (error: unknown) {
      const message =
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(typeof message === 'string' ? message : 'Failed to save frame')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="optical-page optical-form-page w-full min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">{editing ? 'Edit Frame' : 'Add Frame'}</h1>
        <p className="mt-1 text-xl text-slate-600">Add new frame to inventory</p>
        <div className="mt-4">
          <Link href="/dashboard/optical-shop/frames" className="text-xl text-slate-600 hover:text-slate-900">
            ← Back to Frames
          </Link>
        </div>
      </div>

      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-4xl">Frame Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xl">SKU *</Label>
              <Input value={sku} onChange={(event) => setSku(event.target.value)} className="mt-1 h-12 text-xl" placeholder="e.g., FR-001" />
            </div>
            <div>
              <Label className="text-xl">Brand *</Label>
              <Input value={brand} onChange={(event) => setBrand(event.target.value)} className="mt-1 h-12 text-xl" placeholder="e.g., Ray-Ban" />
            </div>
            <div>
              <Label className="text-xl">Model *</Label>
              <Input value={model} onChange={(event) => setModel(event.target.value)} className="mt-1 h-12 text-xl" placeholder="e.g., Wayfarer" />
            </div>
            <div>
              <Label className="text-xl">Color *</Label>
              <Input value={color} onChange={(event) => setColor(event.target.value)} className="mt-1 h-12 text-xl" placeholder="e.g., Black" />
            </div>
            <div>
              <Label className="text-xl">Material</Label>
              <Select value={material} onValueChange={setMaterial}>
                <SelectTrigger className="mt-1 h-12 text-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Acetate">Acetate</SelectItem>
                  <SelectItem value="Metal">Metal</SelectItem>
                  <SelectItem value="Titanium">Titanium</SelectItem>
                  <SelectItem value="TR90">TR90</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xl">Frame Type</Label>
              <Select value={frameType} onValueChange={setFrameType}>
                <SelectTrigger className="mt-1 h-12 text-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full Rim">Full Rim</SelectItem>
                  <SelectItem value="Half Rim">Half Rim</SelectItem>
                  <SelectItem value="Rimless">Rimless</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xl">Gender</Label>
              <Select value={gender} onValueChange={(v) => setGender(v === 'FEMALE' ? 'FEMALE' : 'MALE')}>
                <SelectTrigger className="mt-1 h-12 text-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-4xl">Size</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xl">Eye Size (mm)</Label>
            <Input value={eyeSize} onChange={(event) => setEyeSize(event.target.value)} className="mt-1 h-12 text-xl" />
          </div>
          <div>
            <Label className="text-xl">Bridge (mm)</Label>
            <Input value={bridge} onChange={(event) => setBridge(event.target.value)} className="mt-1 h-12 text-xl" />
          </div>
          <div>
            <Label className="text-xl">Temple Length (mm)</Label>
            <Input value={temple} onChange={(event) => setTemple(event.target.value)} className="mt-1 h-12 text-xl" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-4xl">Pricing & Stock</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-xl">Cost Price ($)</Label>
            <Input type="number" min={0} step="0.01" value={costPrice} onChange={(event) => setCostPrice(event.target.value)} className="mt-1 h-12 text-xl" />
          </div>
          <div>
            <Label className="text-xl">Retail Price ($)</Label>
            <Input type="number" min={0} step="0.01" value={retailPrice} onChange={(event) => setRetailPrice(event.target.value)} className="mt-1 h-12 text-xl" />
          </div>
          <div>
            <Label className="text-xl">Stock Quantity</Label>
            <Input type="number" min={0} value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} className="mt-1 h-12 text-xl" />
          </div>
          <div>
            <Label className="text-xl">Reorder Level</Label>
            <Input type="number" min={0} value={reorderLevel} onChange={(event) => setReorderLevel(event.target.value)} className="mt-1 h-12 text-xl" />
          </div>

          <div className="md:col-span-4 flex justify-end gap-3 pt-2">
            <Button asChild variant="outline" className="h-12 rounded-xl px-8 text-xl" disabled={saving}>
              <Link href="/dashboard/optical-shop/frames">Cancel</Link>
            </Button>
            <Button className="h-12 rounded-xl bg-[#0EA5E9] px-8 text-xl font-semibold hover:bg-[#0c96d4]" onClick={onSave} disabled={!canSave}>
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Frame'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
