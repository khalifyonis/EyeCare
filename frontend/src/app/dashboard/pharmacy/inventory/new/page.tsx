'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const CATEGORY_OPTIONS = ['Tablet', 'Syrup', 'Drop', 'Injection', 'Capsule', 'Cream', 'Other']

type PharmacyItem = {
  id: string
  itemName: string
  genericName?: string | null
  manufacturer?: string | null
  itemType?: string | null
  category?: string | null
  strength?: string | null
  sku?: string | null
  batchNumber?: string | null
  expiryDate?: string | null
  unitOfMeasure?: string | null
  purchasePrice?: number | string | null
  sellingPrice?: number | string | null
  taxRate?: number | string | null
  reorderLevel?: number | null
  stockQuantity?: number | null
}

function toISODateInput(value: string | null | undefined) {
  if (!value) return ''
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  } catch {
    return ''
  }
}

export default function PharmacyInventoryNewPage() {
  const router = useRouter()
  const params = useSearchParams()
  const id = params.get('id')
  const editing = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const label = 'text-xs font-semibold uppercase text-slate-500'

  const [itemName, setItemName] = useState('')
  const [genericName, setGenericName] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [category, setCategory] = useState('Tablet')
  const [strength, setStrength] = useState('')
  const [therapeuticClass, setTherapeuticClass] = useState('')

  const [sku, setSku] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [unitOfMeasure, setUnitOfMeasure] = useState('')
  const [stockQuantity, setStockQuantity] = useState('0')

  const [purchasePrice, setPurchasePrice] = useState('0')
  const [sellingPrice, setSellingPrice] = useState('0')
  const [taxRate, setTaxRate] = useState('0')
  const [reorderLevel, setReorderLevel] = useState('10')

  useEffect(() => {
    if (!id) return

    const load = async () => {
      setLoading(true)
      try {
        const res = await api.get(`/inventory/pharmacy/${id}`)
        const row = res.data as PharmacyItem

        setItemName(String(row.itemName || ''))
        setGenericName(String(row.genericName || ''))
        setManufacturer(String(row.manufacturer || ''))
        setCategory(String(row.itemType || 'Tablet'))
        setStrength(String(row.strength || ''))
        setTherapeuticClass(String(row.category || ''))

        setSku(String(row.sku || ''))
        setBatchNumber(String(row.batchNumber || ''))
        setExpiryDate(toISODateInput(row.expiryDate))
        setUnitOfMeasure(String(row.unitOfMeasure || ''))
        setStockQuantity(String(Number(row.stockQuantity || 0)))

        setPurchasePrice(String(Number(row.purchasePrice || 0)))
        setSellingPrice(String(Number(row.sellingPrice || 0)))
        setTaxRate(String(Number(row.taxRate || 0)))
        setReorderLevel(String(Number(row.reorderLevel || 10)))
      } catch {
        toast.error('Failed to load medicine')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [id])

  const canSave = useMemo(() => {
    return !loading && !saving && itemName.trim().length > 0
  }, [loading, saving, itemName])

  const onSave = async () => {
    if (!itemName.trim()) {
      toast.error('Name is required')
      return
    }

    const payload = {
      itemName: itemName.trim(),
      genericName: genericName.trim() || null,
      manufacturer: manufacturer.trim() || null,
      itemType: category || null,
      category: therapeuticClass.trim() || null,
      strength: strength.trim() || null,

      sku: sku.trim() || null,
      batchNumber: batchNumber.trim() || null,
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
      unitOfMeasure: unitOfMeasure.trim() || null,

      stockQuantity: Math.max(0, Number(stockQuantity) || 0),
      purchasePrice: Math.max(0, Number(purchasePrice) || 0),
      sellingPrice: Math.max(0, Number(sellingPrice) || 0),
      taxRate: taxRate === '' ? null : Math.max(0, Number(taxRate) || 0),
      reorderLevel: Math.max(0, Number(reorderLevel) || 0),
    }

    setSaving(true)
    try {
      if (editing && id) {
        await api.put(`/inventory/pharmacy/${id}`, payload)
        toast.success('Medicine updated')
      } else {
        await api.post('/inventory/pharmacy', payload)
        toast.success('Medicine added')
      }
      router.push('/dashboard/pharmacy/inventory')
    } catch (error: unknown) {
      const message =
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(typeof message === 'string' ? message : 'Failed to save medicine')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full min-w-0 p-4 sm:p-6 lg:p-7 space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">{editing ? 'Edit Medicine' : 'Add New Medicine'}</h1>
        <p className="mt-1 text-xl text-slate-600">Inventory item details and stock tracking</p>
        <div className="mt-4">
          <Link href="/dashboard/pharmacy/inventory" className="text-base font-semibold text-slate-600 hover:text-slate-900">
            ← Back to Inventory
          </Link>
        </div>
      </div>

      <Card className="rounded-xl border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-extrabold text-slate-900">Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className={label}>Name</div>
              <Input value={itemName} onChange={(e) => setItemName(e.target.value)} className="mt-1 h-11 rounded-xl" placeholder="e.g., Amoxil" />
            </div>
            <div>
              <div className={label}>Generic Name</div>
              <Input value={genericName} onChange={(e) => setGenericName(e.target.value)} className="mt-1 h-11 rounded-xl" placeholder="e.g., Amoxicillin" />
            </div>
            <div>
              <div className={label}>Manufacturer</div>
              <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className="mt-1 h-11 rounded-xl" placeholder="e.g., Pfizer" />
            </div>
            <div>
              <div className={label}>Category</div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 h-11 rounded-xl">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className={label}>Strength</div>
              <Input value={strength} onChange={(e) => setStrength(e.target.value)} className="mt-1 h-11 rounded-xl" placeholder="e.g., 500mg" />
            </div>
            <div>
              <div className={label}>Therapeutic Class</div>
              <Input value={therapeuticClass} onChange={(e) => setTherapeuticClass(e.target.value)} className="mt-1 h-11 rounded-xl" placeholder="e.g., Antibiotic" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-extrabold text-slate-900">Stock Tracking</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <div className={label}>SKU / Barcode</div>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} className="mt-1 h-11 rounded-xl" placeholder="e.g., MED-0001" />
            </div>
            <div>
              <div className={label}>Batch Number</div>
              <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className="mt-1 h-11 rounded-xl" placeholder="e.g., BATCH-22A" />
            </div>
            <div>
              <div className={label}>Expiry Date</div>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="mt-1 h-11 rounded-xl" />
            </div>
            <div>
              <div className={label}>Unit of Measure</div>
              <Input value={unitOfMeasure} onChange={(e) => setUnitOfMeasure(e.target.value)} className="mt-1 h-11 rounded-xl" placeholder="e.g., box, bottle, piece" />
            </div>
            <div>
              <div className={label}>Stock Quantity</div>
              <Input value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} className="mt-1 h-11 rounded-xl" inputMode="numeric" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-extrabold text-slate-900">Financials</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className={label}>Cost Price</div>
              <Input value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="mt-1 h-11 rounded-xl" inputMode="decimal" />
            </div>
            <div>
              <div className={label}>Selling Price</div>
              <Input value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className="mt-1 h-11 rounded-xl" inputMode="decimal" />
            </div>
            <div>
              <div className={label}>Tax Rate (%)</div>
              <Input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="mt-1 h-11 rounded-xl" inputMode="decimal" />
            </div>
            <div>
              <div className={label}>Reorder Level</div>
              <Input value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} className="mt-1 h-11 rounded-xl" inputMode="numeric" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
            <Button
              onClick={onSave}
              disabled={!canSave}
              className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 text-base font-semibold"
            >
              {saving ? 'Saving...' : editing ? 'Update Medicine' : 'Create Medicine'}
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-xl border-slate-200 px-6 text-base font-semibold">
              <Link href="/dashboard/pharmacy/inventory">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
