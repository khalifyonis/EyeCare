'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ServerPagination } from '@/components/dashboard/server-pagination'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Pill, Package, AlertTriangle, Ban, CalendarDays, RefreshCcw, MoreVertical, Eye, Trash2, Plus, Pencil } from 'lucide-react'
import { PharmacyKpiCard } from '../_components/pharmacy-kpi-card'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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
  reorderLevel?: number | null
  expiryDate?: string | null
}

const CATEGORY_OPTIONS = ['Tablet', 'Syrup', 'Drop', 'Injection', 'Capsule', 'Cream', 'Other']

function money(value: number | string | null) {
  const n = Number(value || 0)
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PharmacyInventoryPremiumPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<PharmacyItem[]>([])
  const [stats, setStats] = useState({ total: 0, lowStock: 0, outOfStock: 0, expiringSoon: 0 })

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [lowStock, setLowStock] = useState<'all' | 'low'>('all')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/inventory/pharmacy/stats')
      setStats(res.data)
    } catch {
      console.error('Failed to load stats')
    }
  }, [])

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

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this medicine?')) return
    try {
      await api.delete(`/inventory/pharmacy/${id}`)
      toast.success('Medicine deleted successfully')
      load()
      fetchStats()
    } catch {
      toast.error('Failed to delete medicine')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Header */}
      <div className="px-6 pt-10 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-slate-50">Medicine Inventory</h1>
          </div>
          <Button 
            asChild 
            className="h-12 rounded-xl bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold px-8 shadow-lg shadow-sky-200 dark:shadow-none transition-all active:scale-95"
          >
            <Link href="/dashboard/pharmacy/inventory/new">
              <Plus className="w-5 h-5 mr-2 stroke-[3px]" />
              Add Medicine
            </Link>
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <PharmacyKpiCard title="Total Items" value={stats.total} icon={Package} tone="indigo" />
          <PharmacyKpiCard title="Low Stock" value={stats.lowStock} icon={AlertTriangle} tone="orange" />
          <PharmacyKpiCard title="Out Stock" value={stats.outOfStock} icon={Ban} tone="red" />
          <PharmacyKpiCard title="Expiring Soon" value={stats.expiringSoon} icon={CalendarDays} tone="amber" />
        </div>

        {/* Toolbar & Table Section */}
        <div className="space-y-6">
          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1">
            <div className="flex flex-col md:flex-row md:items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search by name, generic, SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-1 focus-visible:ring-[#0EA5E9]"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-10 w-[160px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={lowStock} onValueChange={(v) => setLowStock(v as 'all' | 'low')}>
                  <SelectTrigger className="h-10 w-[160px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl">
                    <SelectValue placeholder="Stock" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                    <SelectItem value="all">All Stock</SelectItem>
                    <SelectItem value="low">Low Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCcw className={cn("h-4 w-4 text-slate-500", loading && "animate-spin")} />
            </Button>
          </div>

          {/* Table Card */}
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                  {['MEDICINE NAME', 'CATEGORY', 'STOCK QUANTITY', 'PRICE', 'EXPIRY', 'ACTIONS'].map((h) => (
                    <TableHead key={h} className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest py-4 px-6">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                   Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j} className="py-6 px-6">
                          <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                   ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                        <Pill className="h-8 w-8 opacity-20" />
                        <p className="font-semibold text-slate-500">No medicines found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => {
                    const qty = Number(r.stockQuantity || 0)
                    const exp = r.expiryDate ? new Date(r.expiryDate) : null
                    const isExpired = exp ? exp < new Date() : false

                    return (
                      <TableRow key={r.id} className="group border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <TableCell className="py-4 px-6">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{r.itemName}</span>
                            {r.genericName && (
                              <span className="text-[10px] text-slate-500 uppercase tracking-tighter">{r.genericName}</span>
                            )}
                            <span className="text-[10px] font-mono text-slate-400">SKU: {r.sku || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-medium text-slate-600 dark:text-slate-400 uppercase">
                            {r.itemType || 'Medicine'}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                            {qty} units
                          </span>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-50 tabular-nums">
                            {money(r.sellingPrice)}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          {exp ? (
                            <div className="flex flex-col">
                              <span className={cn(
                                "text-xs font-medium",
                                isExpired ? "text-red-600" : "text-slate-600 dark:text-slate-300"
                              )}>
                                {exp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              {isExpired && <span className="text-[9px] font-bold uppercase text-red-500">Expired</span>}
                            </div>
                          ) : <span className="text-slate-300">—</span>}
                        </TableCell>
                        <TableCell className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Link 
                               href={`/dashboard/pharmacy/inventory/new?id=${r.id}`}
                               className="text-sm font-medium text-[#0EA5E9] hover:underline"
                            >
                              Edit
                            </Link>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4 text-slate-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xl">
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/pharmacy/inventory/new?id=${r.id}`)} className="flex items-center gap-2 p-3 font-medium">
                                  <Pencil className="h-4 w-4 text-[#0EA5E9]" />
                                  Edit Medicine
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(r.id)} className="flex items-center gap-2 p-3 font-medium text-red-600 focus:text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6">
            <ServerPagination
              page={page}
              limit={pageSize}
              totalPages={totalPages}
              total={total}
              onPageChange={setPage}
              onLimitChange={setPageSize}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
