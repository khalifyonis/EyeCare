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

const COATING_OPTIONS = ['Anti Reflective', 'Blue Light', 'Photochromic', 'Scratch Resistant', 'Hydrophobic', 'Oleophobic', 'Uv Protection'] as const

type LensMeta = {
  sku?: string
  type?: string
  material?: string
  index?: string
  sphereMin?: string
  sphereMax?: string
  cylinderMin?: string
  cylinderMax?: string
  coatings?: string[]
}

function parseLensMeta(raw: string | null | undefined): LensMeta {
  const text = String(raw || '').trim()
  if (!text.startsWith('{') || !text.endsWith('}')) return {}
  try {
    return JSON.parse(text) as LensMeta
  } catch {
    return {}
  }
}

export default function AddLensPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const itemId = searchParams.get('id')
  const editing = Boolean(itemId)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [sku, setSku] = useState('')
  const [brand, setBrand] = useState('')
  const [type, setType] = useState('Single Vision')
  const [material, setMaterial] = useState('cr39')
  const [index, setIndex] = useState('1.5')

  const [sphereMin, setSphereMin] = useState('-12')
  const [sphereMax, setSphereMax] = useState('8')
  const [cylinderMin, setCylinderMin] = useState('-6')
  const [cylinderMax, setCylinderMax] = useState('0')

  const [costPrice, setCostPrice] = useState('0')
  const [sellingPrice, setSellingPrice] = useState('0')
  const [quantity, setQuantity] = useState('0')
  const [reorderLevel, setReorderLevel] = useState('10')

  const [coatings, setCoatings] = useState<string[]>([])

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
        const meta = parseLensMeta(row.manufacturer)

        setSku(meta.sku || '')
        setBrand(String(row.brand || ''))
        setType(meta.type || String(row.itemName || 'Single Vision'))
        setMaterial(meta.material || 'cr39')
        setIndex(meta.index || '1.5')

        setSphereMin(meta.sphereMin || '-12')
        setSphereMax(meta.sphereMax || '8')
        setCylinderMin(meta.cylinderMin || '-6')
        setCylinderMax(meta.cylinderMax || '0')
        setCoatings(Array.isArray(meta.coatings) ? meta.coatings : [])

        setCostPrice(String(Number(row.purchasePrice || 0)))
        setSellingPrice(String(Number(row.sellingPrice || 0)))
        setQuantity(String(Number(row.stockQuantity || 0)))
        setReorderLevel(String(Number(row.reorderLevel || 10)))
      } catch {
        toast.error('Failed to load lens')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [itemId])

  const canSave = useMemo(() => {
    return sku.trim().length > 0 && brand.trim().length > 0 && type.trim().length > 0 && !saving && !loading
  }, [sku, brand, type, saving, loading])

  const toggleCoating = (item: string) => {
    setCoatings((prev) => (prev.includes(item) ? prev.filter((value) => value !== item) : [...prev, item]))
  }

  const onSave = async () => {
    if (!sku.trim() || !brand.trim() || !type.trim()) {
      toast.error('SKU, brand and type are required')
      return
    }

    const payload = {
      itemName: type.trim(),
      itemType: 'Lens',
      brand: brand.trim(),
      manufacturer: JSON.stringify({
        sku: sku.trim(),
        type: type.trim(),
        material: material.trim() || null,
        index: index.trim() || null,
        sphereMin: sphereMin.trim() || null,
        sphereMax: sphereMax.trim() || null,
        cylinderMin: cylinderMin.trim() || null,
        cylinderMax: cylinderMax.trim() || null,
        coatings,
      }),
      stockQuantity: Math.max(0, Number(quantity) || 0),
      reorderLevel: Math.max(0, Number(reorderLevel) || 0),
      purchasePrice: Math.max(0, Number(costPrice) || 0),
      sellingPrice: Math.max(0, Number(sellingPrice) || 0),
    }

    setSaving(true)
    try {
      if (editing && itemId) {
        await api.put(`/inventory/optical/${itemId}`, payload)
        toast.success('Lens updated')
      } else {
        await api.post('/inventory/optical', payload)
        toast.success('Lens added')
      }
      router.push('/dashboard/optical-shop/lenses')
    } catch (error: unknown) {
      const message =
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(typeof message === 'string' ? message : 'Failed to save lens')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="optical-page optical-form-page w-full min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">{editing ? 'Edit Lens' : 'Add Lens'}</h1>
        <p className="mt-1 text-xl text-slate-600">Add new lens to inventory</p>
        <div className="mt-4">
          <Link href="/dashboard/optical-shop/lenses" className="text-xl text-slate-600 hover:text-slate-900">
            ← Back to Lenses
          </Link>
        </div>
      </div>

      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-4xl">Lens Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xl">SKU *</Label>
            <Input value={sku} onChange={(event) => setSku(event.target.value)} className="mt-1 h-12 text-xl" placeholder="e.g., LN-001" />
          </div>
          <div>
            <Label className="text-xl">Brand *</Label>
            <Input value={brand} onChange={(event) => setBrand(event.target.value)} className="mt-1 h-12 text-xl" placeholder="e.g., Essilor" />
          </div>
          <div>
            <Label className="text-xl">Type</Label>
            <Input value={type} onChange={(event) => setType(event.target.value)} className="mt-1 h-12 text-xl" placeholder="Single Vision" />
          </div>
          <div>
            <Label className="text-xl">Material</Label>
            <Input value={material} onChange={(event) => setMaterial(event.target.value)} className="mt-1 h-12 text-xl" placeholder="cr39" />
          </div>
          <div>
            <Label className="text-xl">Refractive Index</Label>
            <Input value={index} onChange={(event) => setIndex(event.target.value)} className="mt-1 h-12 text-xl" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-4xl">Coatings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
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
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-4xl">Power Range</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-xl">Sphere Min</Label>
            <Input value={sphereMin} onChange={(event) => setSphereMin(event.target.value)} className="mt-1 h-12 text-xl" />
          </div>
          <div>
            <Label className="text-xl">Sphere Max</Label>
            <Input value={sphereMax} onChange={(event) => setSphereMax(event.target.value)} className="mt-1 h-12 text-xl" />
          </div>
          <div>
            <Label className="text-xl">Cylinder Min</Label>
            <Input value={cylinderMin} onChange={(event) => setCylinderMin(event.target.value)} className="mt-1 h-12 text-xl" />
          </div>
          <div>
            <Label className="text-xl">Cylinder Max</Label>
            <Input value={cylinderMax} onChange={(event) => setCylinderMax(event.target.value)} className="mt-1 h-12 text-xl" />
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
            <Label className="text-xl">Selling Price ($)</Label>
            <Input type="number" min={0} step="0.01" value={sellingPrice} onChange={(event) => setSellingPrice(event.target.value)} className="mt-1 h-12 text-xl" />
          </div>
          <div>
            <Label className="text-xl">Quantity</Label>
            <Input type="number" min={0} value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 h-12 text-xl" />
          </div>
          <div>
            <Label className="text-xl">Reorder Level</Label>
            <Input type="number" min={0} value={reorderLevel} onChange={(event) => setReorderLevel(event.target.value)} className="mt-1 h-12 text-xl" />
          </div>

          <div className="md:col-span-4 flex justify-end gap-3 pt-2">
            <Button asChild variant="outline" className="h-12 rounded-xl px-8 text-xl" disabled={saving}>
              <Link href="/dashboard/optical-shop/lenses">Cancel</Link>
            </Button>
            <Button className="h-12 rounded-xl bg-[#0EA5E9] px-8 text-xl font-semibold hover:bg-[#0c96d4]" onClick={onSave} disabled={!canSave}>
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Lens'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
