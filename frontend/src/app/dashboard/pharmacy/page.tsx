'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PharmacyTabs } from './_components/pharmacy-tabs'
import { PharmacyKpiCard } from './_components/pharmacy-kpi-card'
import { AlertTriangle, Ban, CalendarDays, DollarSign, Pill, Search, ChevronRight } from 'lucide-react'

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
  finalAmount?: number | string | null
  createdAt?: string
  status?: string | null
  patient?: { id: string; fullName?: string | null } | null
}

function startOfTodayISO() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function money(value: number) {
  return `$${value.toFixed(2)}`
}

export default function PharmacyDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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
        const body = statsRes.value.data as PharmacyStats
        setStats({ total: Number(body?.total) || 0, lowStock: Number(body?.lowStock) || 0 })
      } else {
        setStats({ total: 0, lowStock: 0 })
      }

      if (itemsRes.status === 'fulfilled') {
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
      } else {
        setOutOfStock(0)
        setExpiringSoon(0)
      }

      if (salesRes.status === 'fulfilled') {
        const body = salesRes.value.data as { data?: BillingRow[] }
        const rows = Array.isArray(body?.data) ? body.data : []
        setRecentSales(rows)
        const sum = rows.reduce((acc, r) => acc + Number(r.finalAmount || 0), 0)
        setRevenueToday(sum)
      } else {
        setRecentSales([])
        setRevenueToday(0)
      }
    } catch {
      setStats({ total: 0, lowStock: 0 })
      setOutOfStock(0)
      setExpiringSoon(0)
      setRevenueToday(0)
      setRecentSales([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return recentSales
    return recentSales.filter((s) => {
      const id = String(s.id || '').toLowerCase()
      const patient = String(s.patient?.fullName || '').toLowerCase()
      const status = String(s.status || '').toLowerCase()
      return id.includes(q) || patient.includes(q) || status.includes(q)
    })
  }, [recentSales, search])

  return (
    <div className="w-full min-w-0 p-4 sm:p-6 lg:p-7 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">Pharmacy</h1>
          <p className="mt-1 text-xl text-slate-600 dark:text-slate-400">Sales and inventory management</p>
        </div>
        <Button asChild className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 text-base font-semibold">
          <Link href="/dashboard/pharmacy/sales/new">+ New Sale</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <PharmacyKpiCard title="Total Inventory Items" value={stats.total} icon={Pill} tone="indigo" />
        <PharmacyKpiCard title="Items Below Reorder" value={stats.lowStock} icon={AlertTriangle} tone="orange" />
        <PharmacyKpiCard title="Out of Stock" value={outOfStock} icon={Ban} tone="red" />
        <PharmacyKpiCard title="Expiring Soon (< 90 Days)" value={expiringSoon} icon={CalendarDays} tone="amber" />
        <PharmacyKpiCard title="Today's Revenue" value={money(revenueToday)} icon={DollarSign} tone="green" />
      </div>

      <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] overflow-hidden shadow-sm">
        <PharmacyTabs />

        <div className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative w-full md:flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 rounded-xl pl-12 text-base border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 focus-visible:ring-[#0EA5E9]"
                placeholder="Search sales..."
              />
            </div>
            <Button asChild variant="outline" className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <Link href="/dashboard/pharmacy/inventory">Open Inventory</Link>
            </Button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-50 dark:border-slate-800">
          {filteredSales.length === 0 ? (
            <div className="py-12 text-center text-base text-slate-500 dark:text-slate-400">{loading ? 'Loading...' : 'No sales found'}</div>
          ) : (
            filteredSales.map((sale) => {
              const amount = Number(sale.finalAmount || 0)
              return (
                <Link
                  key={sale.id}
                  href={`/dashboard/billing?id=${sale.id}`}
                  className="flex items-center gap-4 px-5 py-5 hover:bg-slate-50 transition-colors"
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                    <DollarSign className="h-6 w-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-lg md:text-xl font-bold leading-none text-slate-900 dark:text-slate-50">SALE-{String(sale.id).slice(0, 8).toUpperCase()}</div>
                    <div className="mt-1 text-sm md:text-base text-slate-700 dark:text-slate-300 truncate">{sale.patient?.fullName || 'Unknown Patient'}</div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Status</div>
                    <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{String(sale.status || '-')}</div>
                    <div className="mt-2 text-lg md:text-xl font-extrabold leading-none text-slate-900 dark:text-slate-50">{money(amount)}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sale.createdAt ? new Date(sale.createdAt).toLocaleString() : '-'}</div>
                  </div>

                  <ChevronRight className="h-6 w-6 shrink-0 text-slate-400" />
                </Link>
              )
            })
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={load} disabled={loading} className="h-10 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          Refresh
        </Button>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">Sales shown: {recentSales.length}</span>
      </div>
    </div>
  )
}
