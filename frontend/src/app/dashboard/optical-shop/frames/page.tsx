'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Glasses, TriangleAlert, PackageX, DollarSign } from 'lucide-react'

type OpticalItem = {
  id: string
  itemName?: string | null
  brand?: string | null
  manufacturer?: string | null
  stockQuantity?: number | null
  reorderLevel?: number | null
  purchasePrice?: number | null
  sellingPrice?: number | null
}

type FrameMeta = {
  sku?: string
  model?: string
  color?: string
  eyeSize?: string
  bridge?: string
  temple?: string
  material?: string
}

function parseFrameMeta(raw: string | null | undefined): FrameMeta {
  const text = String(raw || '').trim()
  if (!text.startsWith('{') || !text.endsWith('}')) return {}
  try {
    const data = JSON.parse(text) as Record<string, unknown>
    return {
      sku: typeof data.sku === 'string' ? data.sku : undefined,
      model: typeof data.model === 'string' ? data.model : undefined,
      color: typeof data.color === 'string' ? data.color : undefined,
      eyeSize: typeof data.eyeSize === 'string' ? data.eyeSize : undefined,
      bridge: typeof data.bridge === 'string' ? data.bridge : undefined,
      temple: typeof data.temple === 'string' ? data.temple : undefined,
      material: typeof data.material === 'string' ? data.material : undefined,
    }
  } catch {
    return {}
  }
}

function toMoney(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function FrameInventoryPage() {
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [rows, setRows] = useState<OpticalItem[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.get('/inventory/optical', {
        params: {
          itemType: 'Frame',
          search: search.trim() || undefined,
          page: 1,
          limit: 200,
        },
      })
      const payload = response.data as { data?: OpticalItem[] }
      setRows(Array.isArray(payload?.data) ? payload.data : [])
    } catch {
      toast.error('Failed to load frame inventory')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [search])

  const onDelete = useCallback(async (id: string) => {
    const ok = window.confirm('Delete this frame item? This action cannot be undone.')
    if (!ok) return

    try {
      await api.delete(`/inventory/optical/${id}`)
      toast.success('Frame deleted')
      await load()
    } catch (error: unknown) {
      const message =
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(typeof message === 'string' ? message : 'Failed to delete frame')
    }
  }, [load])

  useEffect(() => {
    const timer = setTimeout(() => {
      load()
    }, 250)
    return () => clearTimeout(timer)
  }, [load])

  const brands = useMemo(() => {
    const all = rows.map((item) => String(item.brand || '').trim()).filter(Boolean)
    return Array.from(new Set(all)).sort((a, b) => a.localeCompare(b))
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((item) => {
      const stock = Number(item.stockQuantity || 0)
      const reorder = Number(item.reorderLevel || 0)
      const brandOk = brandFilter === 'all' || String(item.brand || '') === brandFilter
      const stockOk =
        stockFilter === 'all' ||
        (stockFilter === 'in-stock' && stock > 0) ||
        (stockFilter === 'low-stock' && stock > 0 && stock <= reorder) ||
        (stockFilter === 'out-of-stock' && stock <= 0)
      return brandOk && stockOk
    })
  }, [rows, brandFilter, stockFilter])

  const stats = useMemo(() => {
    let lowStock = 0
    let outOfStock = 0
    let totalValue = 0

    for (const item of filtered) {
      const stock = Number(item.stockQuantity || 0)
      const reorder = Number(item.reorderLevel || 0)
      const cost = Number(item.purchasePrice || 0)
      totalValue += stock * cost
      if (stock <= 0) outOfStock += 1
      if (stock > 0 && stock <= reorder) lowStock += 1
    }

    return {
      totalFrames: filtered.length,
      lowStock,
      outOfStock,
      totalValue,
    }
  }, [filtered])

  return (
    <div className="optical-page w-full min-w-0 p-4 sm:p-6 lg:p-7 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Frame Inventory</h1>
          <p className="mt-1 text-xl text-slate-600">Manage optical frames</p>
        </div>
        <Button asChild className="h-11 rounded-xl bg-[#0EA5E9] px-6 text-base font-semibold hover:bg-[#0c96d4]">
          <Link href="/dashboard/optical-shop/frames/new">+ Add Frame</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search frames..."
            className="h-11 rounded-xl pl-12 text-base"
          />
        </div>

        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="h-11 w-full min-w-[200px] rounded-xl text-base">
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map((brand) => (
              <SelectItem key={brand} value={brand}>
                {brand}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="h-11 w-full min-w-[200px] rounded-xl text-base">
            <SelectValue placeholder="All Stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="in-stock">In Stock</SelectItem>
            <SelectItem value="low-stock">Low Stock</SelectItem>
            <SelectItem value="out-of-stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-sm md:text-base text-slate-500">Total Frames</div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-2xl md:text-3xl font-bold text-slate-900 tabular-nums">{stats.totalFrames}</div>
            <Glasses className="h-10 w-10 text-[#0EA5E9]" />
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-sm md:text-base text-slate-500">Inventory Value</div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-2xl md:text-3xl font-bold text-[#0EA5E9] tabular-nums">{toMoney(stats.totalValue)}</div>
            <DollarSign className="h-10 w-10 text-[#0EA5E9]" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr className="text-sm uppercase tracking-wide text-slate-600">
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Brand / Model</th>
                <th className="px-4 py-3">Color</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Cost Price</th>
                <th className="px-4 py-3">Retail</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-lg text-slate-500">
                    {loading ? 'Loading...' : 'No frames found'}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const meta = parseFrameMeta(item.manufacturer)
                  const stock = Number(item.stockQuantity || 0)
                  const size = [meta.eyeSize, meta.bridge, meta.temple].filter(Boolean).join('-') || '-'
                  return (
                    <tr key={item.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-4 align-top text-sm text-slate-700">{meta.sku || '-'}</td>
                      <td className="px-4 py-4 align-top">
                        <div className="text-lg md:text-xl font-bold text-slate-900">{meta.model || item.itemName || '-'}</div>
                        <div className="mt-1 text-sm md:text-base text-slate-600">{item.brand || '-'}</div>
                      </td>
                      <td className="px-4 py-4 align-top text-sm md:text-base text-slate-700">{meta.color || '-'}</td>
                      <td className="px-4 py-4 align-top text-sm md:text-base text-slate-700">{size}</td>
                      <td className="px-4 py-4 align-top text-sm md:text-base text-slate-700">{meta.material || '-'}</td>
                      <td className="px-4 py-4 align-top text-sm md:text-base text-slate-700">{toMoney(Number(item.purchasePrice || 0))}</td>
                      <td className="px-4 py-4 align-top text-sm md:text-base font-semibold text-slate-900">{toMoney(Number(item.sellingPrice || 0))}</td>
                      <td className="px-4 py-4 align-top">
                        <span className={stock <= 0 ? 'rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700' : 'rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-[#0c96d4]'}>
                          {stock}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center gap-3">
                          <Link href={`/dashboard/optical-shop/frames/new?id=${item.id}`} className="text-sm font-semibold text-[#0EA5E9] hover:text-[#0c96d4]">
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="text-sm font-semibold text-red-600 hover:text-red-700"
                            onClick={() => void onDelete(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
