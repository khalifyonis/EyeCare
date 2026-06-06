'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSocket } from '@/contexts/socket-context'
import api from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PharmacyTabs } from './_components/pharmacy-tabs'
import { PharmacyKpiCard } from './_components/pharmacy-kpi-card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, DollarSign, MoreVertical, ExternalLink, RefreshCcw, Eye, Ban, CalendarDays, AlertTriangle, Pill, Search, ShoppingCart, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type PharmacyStats = {
  total: number
  lowStock: number
}

type PharmacyItem = {
  id: string
  itemName: string
  genericName?: string | null
  sku?: string | null
  barcode?: string | null
  itemType?: string | null
  strength?: string | null
  sellingPrice?: number | string | null
  stockQuantity?: number | null
  reorderLevel?: number | null
  expiryDate?: string | null
}

type BillingRow = {
  id: string
  invoiceNumber?: string | null
  finalAmount?: number | string | null
  createdAt?: string
  status?: string | null
  paymentMethod?: string | null
  patient?: { id: string; fullName?: string | null } | null
}

function startOfTodayISO() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function money(value?: number | string | null) {
  const n = Number(value || 0)
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

const STATUS_STYLES: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  PARTIALLY_PAID: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  UNPAID: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700',
}

export default function PharmacyDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { socket } = useSocket()

  const [stats, setStats] = useState<PharmacyStats>({ total: 0, lowStock: 0 })
  const [outOfStock, setOutOfStock] = useState(0)
  const [expiringSoon, setExpiringSoon] = useState(0)
  const [revenueToday, setRevenueToday] = useState(0)
  const [recentSales, setRecentSales] = useState<BillingRow[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const today = startOfTodayISO()

      const [statsRes, itemsRes, salesRes] = await Promise.allSettled([
        api.get('/inventory/pharmacy/stats'),
        api.get('/inventory/pharmacy', { params: { page: 1, limit: 1000 } }),
        api.get('/billing', { params: { serviceType: 'PHARMACY', from: today, to: today, page: 1, limit: 50 } }),
      ])

      if (statsRes.status === 'fulfilled') {
        const body = statsRes.value.data as any
        setStats({ total: Number(body?.total) || 0, lowStock: Number(body?.lowStock) || 0 })
        setOutOfStock(Number(body?.outOfStock) || 0)
        setExpiringSoon(Number(body?.expiringSoon) || 0)
      }

      if (itemsRes.status === 'fulfilled' && statsRes.status !== 'fulfilled') {
        // Fallback calculation if stats endpoint is old
        const body = itemsRes.value.data as { data?: PharmacyItem[] }
        const rows = Array.isArray(body?.data) ? body.data : []
        const oos = rows.filter((r) => Number(r.stockQuantity || 0) === 0).length

        const now = new Date()
        const cutoff = new Date(now)
        cutoff.setDate(cutoff.getDate() + 90)
        const expSoon = rows.filter((r) => {
          if (!r.expiryDate) return false
          const exp = new Date(r.expiryDate)
          return exp > now && exp <= cutoff
        }).length

        setOutOfStock(oos)
        setExpiringSoon(expSoon)
      }

      if (salesRes.status === 'fulfilled') {
        const body = salesRes.value.data as { data?: BillingRow[] }
        const rows = Array.isArray(body?.data) ? body.data : []
        setRecentSales(rows)
        const sum = rows.reduce((acc, r) => acc + Number(r.finalAmount || 0), 0)
        setRevenueToday(sum)
      }
    } catch {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!socket) return
    const handleUpdate = () => { load() }
    socket.on('billing:created', handleUpdate)
    socket.on('billing:updated', handleUpdate)
    socket.on('inventory:updated', handleUpdate)
    return () => {
      socket.off('billing:created', handleUpdate)
      socket.off('billing:updated', handleUpdate)
      socket.off('inventory:updated', handleUpdate)
    }
  }, [socket, load])

  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return recentSales
    return recentSales.filter((s) => {
      const id = String(s.invoiceNumber || s.id).toLowerCase()
      const patient = String(s.patient?.fullName || '').toLowerCase()
      const status = String(s.status || '').toLowerCase()
      return id.includes(q) || patient.includes(q) || status.includes(q)
    })
  }, [recentSales, search])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="px-6 pt-10 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-slate-50">Pharmacy Sales</h1>
          </div>
          <Button 
            asChild 
            className="h-12 rounded-xl bg-[#0EA5E9] hover:bg-[#0c96d4] text-white font-bold px-8 shadow-lg shadow-sky-200 dark:shadow-none transition-all active:scale-95"
          >
            <Link href="/dashboard/billing/new?serviceType=PHARMACY">
              <Plus className="w-5 h-5 mr-2 stroke-[3px]" />
              New Sale
            </Link>
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <PharmacyKpiCard title="Today's Revenue" value={money(revenueToday)} icon={DollarSign} tone="green" />
          <PharmacyKpiCard title="Total Sales Today" value={recentSales.length} icon={ShoppingCart} tone="indigo" />
          <PharmacyKpiCard 
            title="Avg. Order Value" 
            value={money(recentSales.length > 0 ? revenueToday / recentSales.length : 0)} 
            icon={TrendingUp} 
            tone="orange" 
          />
          <PharmacyKpiCard 
            title="Payments Pending" 
            value={recentSales.filter(s => s.status !== 'PAID').length} 
            icon={AlertTriangle} 
            tone="amber" 
          />
        </div>

        {/* Toolbar & Table Section */}
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search today's sales by invoice or patient..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-1 focus-visible:ring-[#0EA5E9]"
              />
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
                  {['INVOICE', 'PATIENT', 'STATUS', 'METHOD', 'DATE', 'AMOUNT', 'ACTIONS'].map((h) => (
                    <TableHead key={h} className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest py-4 px-6 whitespace-nowrap">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                   Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j} className="py-6 px-6">
                          <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                   ))
                ) : filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full">
                          <DollarSign className="h-8 w-8 opacity-20" />
                        </div>
                        <p className="font-semibold text-slate-500">No sales recorded today</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id} className="group border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <TableCell className="py-4 px-6">
                        <span className="font-mono text-xs font-medium text-sky-600">
                          #{sale.invoiceNumber || sale.id.slice(0, 8).toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">
                          {sale.patient?.fullName || 'Unknown Patient'}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border",
                          STATUS_STYLES[sale.status || 'DRAFT']
                        )}>
                          {sale.status || 'DRAFT'}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="text-xs font-normal text-slate-600 dark:text-slate-400">
                          {sale.paymentMethod || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6 text-xs text-slate-500">
                        {formatDate(sale.createdAt)}
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-50 tabular-nums">
                          {money(sale.finalAmount)}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link 
                            href={`/dashboard/billing/${sale.id}`}
                            className="text-sm font-medium text-[#0EA5E9] hover:underline"
                          >
                            View
                          </Link>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xl">
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/billing/${sale.id}`)} className="flex items-center gap-2 p-3 font-medium">
                                <Eye className="h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 px-1">
             <p className="text-xs font-medium text-slate-500">Showing {filteredSales.length} transactions</p>
          </div>
        </div>
      </div>
    </div>
  )
}
