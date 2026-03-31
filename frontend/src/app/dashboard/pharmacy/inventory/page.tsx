'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ServerPagination } from '@/components/dashboard/server-pagination'
import { PharmacyTabs } from '../_components/pharmacy-tabs'
import { Search, Pill } from 'lucide-react'

type PharmacyItem = {
  id: string
  sku?: string | null
  barcode?: string | null
  itemName: string
  genericName?: string | null
  itemType?: string | null
  strength?: string | null
  sellingPrice?: number | string | null
  stockQuantity?: number | null
  expiryDate?: string | null
}

const CATEGORY_OPTIONS = ['Tablet', 'Syrup', 'Drop', 'Injection', 'Capsule', 'Cream', 'Other']

function money(value: number) {
  return `$${value.toFixed(2)}`
}

export default function PharmacyInventoryPremiumPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<PharmacyItem[]>([])

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [lowStock, setLowStock] = useState<'all' | 'low'>('all')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/inventory/pharmacy', {
        params: {
          page,
          limit: pageSize,
          search: search.trim() || undefined,
          category: category === 'all' ? undefined : category,
          lowStock: lowStock === 'low' ? '1' : undefined,
        },
      })
      const body = res.data as { data?: PharmacyItem[]; total?: number; totalPages?: number; page?: number }
      setRows(Array.isArray(body?.data) ? body.data : [])
      setTotal(Number(body?.total) || 0)
      setTotalPages(Number(body?.totalPages) || 1)
      setPage(Number(body?.page) || page)
    } catch {
      setRows([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, category, lowStock])

  useEffect(() => {
    setPage(1)
  }, [search, category, lowStock, pageSize])

  useEffect(() => {
    const t = setTimeout(() => void load(), 250)
    return () => clearTimeout(t)
  }, [load])

  const hasRows = rows.length > 0

  const headerLabel = 'text-xs font-semibold uppercase text-slate-500'

  const categoryLabel = useMemo(() => {
    if (category === 'all') return 'All categories'
    return category
  }, [category])

  return (
    <div className="w-full min-w-0 p-4 sm:p-6 lg:p-7 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Pharmacy Inventory</h1>
          <p className="mt-1 text-xl text-slate-600">Add, update, and track medicines</p>
        </div>
        <Button asChild className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 text-base font-semibold">
          <Link href="/dashboard/pharmacy/inventory/new">+ Add Medicine</Link>
        </Button>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white overflow-hidden shadow-sm">
        <PharmacyTabs />

        <div className="p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-6">
              <div className={headerLabel}>Search</div>
              <div className="relative mt-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 rounded-xl pl-12 text-base"
                  placeholder="Search by name, SKU, barcode..."
                />
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className={headerLabel}>Category</div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 h-11 rounded-xl">
                  <SelectValue placeholder={categoryLabel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-3">
              <div className={headerLabel}>Stock</div>
              <Select value={lowStock} onValueChange={(v) => setLowStock(v as 'all' | 'low')}>
                <SelectTrigger className="mt-1 h-11 rounded-xl">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="low">Below reorder</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/60">
                  <TableHead>SKU / Barcode</TableHead>
                  <TableHead>Medicine Name (Generic)</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Strength</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock Quantity</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!hasRows ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                      {loading ? 'Loading...' : 'No inventory items found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => {
                    const stock = Number(r.stockQuantity || 0)
                    const price = Number(r.sellingPrice || 0)
                    const isOut = stock === 0
                    return (
                      <TableRow key={r.id} className={isOut ? 'bg-red-50/40' : undefined}>
                        <TableCell className="font-semibold text-slate-900">{r.sku || r.barcode || '-'}</TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900">{r.genericName || r.itemName}</div>
                          <div className="text-xs text-slate-500">{r.genericName ? r.itemName : ''}</div>
                        </TableCell>
                        <TableCell>{r.itemType || '-'}</TableCell>
                        <TableCell>{r.strength || '-'}</TableCell>
                        <TableCell className="text-right font-semibold text-slate-900">{money(price)}</TableCell>
                        <TableCell className="text-right font-extrabold text-slate-900">{stock}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" className="h-9 rounded-lg border-slate-200">
                            <Link href={`/dashboard/pharmacy/inventory/new?id=${r.id}`}>Edit</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3">
            <ServerPagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              setPage={setPage}
              setPageSize={setPageSize}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Pill className="h-4 w-4 text-indigo-600" />
        <span>Rows are highlighted when stock is 0.</span>
      </div>
    </div>
  )
}
