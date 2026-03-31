'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CircleDot, PackageX, Search, TriangleAlert } from 'lucide-react'

type OpticalItem = {
  id: string
  itemName?: string | null
  brand?: string | null
  manufacturer?: string | null
  stockQuantity?: number | null
  reorderLevel?: number | null
  sellingPrice?: number | null
}

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
    const data = JSON.parse(text) as Record<string, unknown>
    return {
      sku: typeof data.sku === 'string' ? data.sku : undefined,
      type: typeof data.type === 'string' ? data.type : undefined,
      material: typeof data.material === 'string' ? data.material : undefined,
      index: typeof data.index === 'string' ? data.index : undefined,
      sphereMin: typeof data.sphereMin === 'string' ? data.sphereMin : undefined,
      sphereMax: typeof data.sphereMax === 'string' ? data.sphereMax : undefined,
      cylinderMin: typeof data.cylinderMin === 'string' ? data.cylinderMin : undefined,
      cylinderMax: typeof data.cylinderMax === 'string' ? data.cylinderMax : undefined,
      coatings: Array.isArray(data.coatings) ? data.coatings.filter((item): item is string => typeof item === 'string') : [],
    }
  } catch {
    return {}
  }
}

function money(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function normalizeOptionValue(value: string | undefined): string {
  return (value || '').trim().toLowerCase()
}

function toOptionLabel(value: string): string {
  const raw = value.trim()
  if (!raw) return raw
  if (raw.toUpperCase() === 'CR39') return 'CR39'
  return raw.replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function LensInventoryPage() {
  const [rows, setRows] = useState<OpticalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [materialFilter, setMaterialFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.get('/inventory/optical', {
        params: {
          itemType: 'Lens',
          page: 1,
          limit: 1000,
        },
      })

      const payload = response.data as { data?: OpticalItem[] }
      setRows(Array.isArray(payload?.data) ? payload.data : [])
    } catch {
      toast.error('Failed to load lens inventory')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  const onDelete = useCallback(async (id: string) => {
    const ok = window.confirm('Delete this lens item? This action cannot be undone.')
    if (!ok) return

    try {
      await api.delete(`/inventory/optical/${id}`)
      toast.success('Lens deleted')
      await load()
    } catch (error: unknown) {
      const message =
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(typeof message === 'string' ? message : 'Failed to delete lens')
    }
  }, [load])

  useEffect(() => {
    const timer = setTimeout(() => {
      load()
    }, 250)
    return () => clearTimeout(timer)
  }, [load])

  const typeOptions = useMemo(() => {
    const presetTypes = ['Single', 'Progressive', 'Bifocal', 'Multifocal']
    const values = rows
      .map((row) => parseLensMeta(row.manufacturer).type || '')
      .map((item) => item.trim())
      .filter(Boolean)
    const normalizedMap = new Map<string, string>()

    for (const item of [...presetTypes, ...values]) {
      const normalized = normalizeOptionValue(item)
      if (!normalized) continue
      if (!normalizedMap.has(normalized)) {
        normalizedMap.set(normalized, toOptionLabel(item))
      }
    }

    return Array.from(normalizedMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }))
  }, [rows])

  const materialOptions = useMemo(() => {
    const presetMaterials = ['CR39', 'Polycarbonate', 'Trivex', 'High Index', 'Glass']
    const values = rows
      .map((row) => parseLensMeta(row.manufacturer).material || '')
      .map((item) => item.trim())
      .filter(Boolean)
    const normalizedMap = new Map<string, string>()

    for (const item of [...presetMaterials, ...values]) {
      const normalized = normalizeOptionValue(item)
      if (!normalized) continue
      if (!normalizedMap.has(normalized)) {
        normalizedMap.set(normalized, toOptionLabel(item))
      }
    }

    return Array.from(normalizedMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }))
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const meta = parseLensMeta(row.manufacturer)
      const normalizedType = normalizeOptionValue(meta.type)
      const normalizedMaterial = normalizeOptionValue(meta.material)
      const query = search.trim().toLowerCase()
      const typeOk = typeFilter === 'all' || normalizedType === typeFilter
      const materialOk = materialFilter === 'all' || normalizedMaterial === materialFilter

      if (!query) return typeOk && materialOk

      const sku = (meta.sku || '').toLowerCase()
      const name = (row.itemName || '').toLowerCase()
      const type = (meta.type || '').toLowerCase()
      const material = (meta.material || '').toLowerCase()
      const matchSearch = sku.includes(query) || name.includes(query) || type.includes(query) || material.includes(query)

      return typeOk && materialOk && matchSearch
    })
  }, [rows, typeFilter, materialFilter, search])

  const stats = useMemo(() => {
    const lowStock = filtered.filter((row) => Number(row.stockQuantity || 0) > 0 && Number(row.stockQuantity || 0) <= Number(row.reorderLevel || 0)).length
    const outOfStock = filtered.filter((row) => Number(row.stockQuantity || 0) <= 0).length
    return {
      total: filtered.length,
      lowStock,
      outOfStock,
    }
  }, [filtered])

  return (
    <div className="optical-page w-full min-w-0 p-4 sm:p-6 lg:p-7 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Lens Inventory</h1>
          <p className="mt-1 text-xl text-slate-600">Manage optical lenses</p>
        </div>
        <Button asChild className="h-11 rounded-xl bg-[#0EA5E9] px-6 text-base font-semibold hover:bg-[#0c96d4]">
          <Link href="/dashboard/optical-shop/lenses/new">+ Add Lens</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search lenses..."
            className="h-11 rounded-xl pl-12 text-base"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-11 min-w-[180px] rounded-xl text-base">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {typeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={materialFilter} onValueChange={setMaterialFilter}>
          <SelectTrigger className="h-11 min-w-[200px] rounded-xl text-base">
            <SelectValue placeholder="All Materials" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Materials</SelectItem>
            {materialOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-sm md:text-base text-slate-500">Total Lens Types</div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-2xl md:text-3xl font-bold text-slate-900 tabular-nums">{stats.total}</div>
            <CircleDot className="h-10 w-10 text-[#0EA5E9]" />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-sm md:text-base text-slate-500">Low Stock</div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-2xl md:text-3xl font-bold text-amber-600 tabular-nums">{stats.lowStock}</div>
            <TriangleAlert className="h-10 w-10 text-amber-500" />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-sm md:text-base text-slate-500">Out of Stock</div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-2xl md:text-3xl font-bold text-red-600 tabular-nums">{stats.outOfStock}</div>
            <PackageX className="h-10 w-10 text-red-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-lg text-slate-500">
            {loading ? 'Loading...' : 'No lenses found'}
          </div>
        ) : (
          filtered.map((row) => {
            const meta = parseLensMeta(row.manufacturer)
            const stock = Number(row.stockQuantity || 0)
            const badgeClass = stock > 0 ? 'bg-sky-100 text-[#0c96d4]' : 'bg-red-100 text-red-700'

            return (
              <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xl md:text-2xl font-bold text-slate-900">{meta.sku || row.itemName || '-'}</div>
                    <div className="mt-1 text-base md:text-lg text-slate-600">{meta.type || '-'}</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${badgeClass}`}>{stock} in stock</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm md:text-base">
                  <div className="text-slate-500">Material</div>
                  <div className="text-right text-slate-800">{meta.material || '-'}</div>
                  <div className="text-slate-500">Index</div>
                  <div className="text-right text-slate-800">{meta.index || '-'}</div>
                  <div className="text-slate-500">Sphere Range</div>
                  <div className="text-right text-slate-800">{`${meta.sphereMin || '-'} to ${meta.sphereMax || '-'}`}</div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(meta.coatings || []).length === 0 ? (
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-sm text-slate-500">No coatings</span>
                  ) : (
                    (meta.coatings || []).map((coating) => (
                      <span key={coating} className="rounded-lg bg-slate-100 px-2 py-1 text-sm text-slate-600">
                        {coating}
                      </span>
                    ))
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-xl md:text-2xl font-bold text-slate-900">Price: {money(Number(row.sellingPrice || 0))}</div>
                  <div className="flex items-center gap-3">
                    <Link href={`/dashboard/optical-shop/lenses/new?id=${row.id}`} className="text-sm font-semibold text-[#0EA5E9] hover:text-[#0c96d4]">
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="text-sm font-semibold text-red-600 hover:text-red-700"
                      onClick={() => void onDelete(row.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
