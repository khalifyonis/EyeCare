'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OpticalShopTabs } from './_components/optical-shop-tabs'
import { OpticalKpiCard } from './_components/optical-kpi-card'
import { CircleCheck, Clock3, Package, Search, TriangleAlert, Glasses, ChevronRight } from 'lucide-react'

type OpticalOrder = {
  id: string
  status: 'FILLED' | 'DISPENSED'
  type: 'SPECTACLES' | 'CONTACT_LENS' | 'BOTH'
  notes?: string | null
  createdAt?: string
  frameItem?: { id: string; itemName?: string | null; sellingPrice?: number | null } | null
  lensItem?: { id: string; itemName?: string | null; sellingPrice?: number | null } | null
  patient?: { id: string; fullName?: string | null; patientNumber?: string | null } | null
}

type ApiListResponse = {
  data?: OpticalOrder[]
}

type StatsResponse = {
  total: number
  active: number
  dispensed: number
}

function compactId(id: string) {
  const val = String(id || '')
  if (val.length <= 8) return val.toUpperCase()
  return val.slice(0, 8).toUpperCase()
}

type DisplayStatus = 'ordered' | 'inProduction' | 'qualityCheck' | 'delivered'

function getDisplayStatus(order: OpticalOrder): DisplayStatus {
  if (order.status === 'DISPENSED') return 'delivered'
  const source = String(order.notes || '').toLowerCase()
  if (source.includes('quality')) return 'qualityCheck'
  if (source.includes('production')) return 'inProduction'
  return 'ordered'
}

function statusBadge(status: DisplayStatus) {
  if (status === 'qualityCheck') {
    return <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700">qualityCheck</span>
  }
  if (status === 'inProduction') {
    return <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">inProduction</span>
  }
  if (status === 'delivered') {
    return <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-[#0c96d4]">delivered</span>
  }
  return <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">ordered</span>
}

function money(value: number) {
  return `$${value.toFixed(2)}`
}

export default function OpticalShopPage() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<OpticalOrder[]>([])
  const [search, setSearch] = useState('')
  const [backendStats, setBackendStats] = useState<StatsResponse>({ total: 0, active: 0, dispensed: 0 })
  const [lowStock, setLowStock] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const getPrescriptionsList = async () => {
        try {
          return await api.get('/prescriptions', { params: { page: 1, limit: 100 } })
        } catch {
          return await api.get('/optical-prescriptions', { params: { page: 1, limit: 100 } })
        }
      }

      const getPrescriptionStats = async () => {
        try {
          return await api.get('/prescriptions/stats')
        } catch {
          return await api.get('/optical-prescriptions/stats')
        }
      }

      const [listRes, statsRes, stockRes] = await Promise.allSettled([
        getPrescriptionsList(),
        getPrescriptionStats(),
        api.get('/inventory/optical/stats'),
      ])

      let hasAnySuccess = false

      if (listRes.status === 'fulfilled') {
        const listBody = listRes.value.data as ApiListResponse
        setOrders(Array.isArray(listBody?.data) ? listBody.data : [])
        hasAnySuccess = true
      } else {
        setOrders([])
      }

      if (statsRes.status === 'fulfilled') {
        const statsBody = statsRes.value.data as StatsResponse
        setBackendStats({
          total: Number(statsBody?.total) || 0,
          active: Number(statsBody?.active) || 0,
          dispensed: Number(statsBody?.dispensed) || 0,
        })
        hasAnySuccess = true
      } else {
        setBackendStats({ total: 0, active: 0, dispensed: 0 })
      }

      if (stockRes.status === 'fulfilled') {
        const stockBody = stockRes.value.data as { lowStock?: number }
        setLowStock(Number(stockBody.lowStock) || 0)
        hasAnySuccess = true
      } else {
        setLowStock(0)
      }

      if (!hasAnySuccess) {
        setOrders([])
        setBackendStats({ total: 0, active: 0, dispensed: 0 })
        setLowStock(0)
      }
    } catch {
      setOrders([])
      setBackendStats({ total: 0, active: 0, dispensed: 0 })
      setLowStock(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orders

    return orders.filter((order) => {
      const id = compactId(order.id).toLowerCase()
      const patient = String(order.patient?.fullName || '').toLowerCase()
      const frame = String(order.frameItem?.itemName || '').toLowerCase()
      const lens = String(order.lensItem?.itemName || '').toLowerCase()
      const status = getDisplayStatus(order).toLowerCase()
      return id.includes(q) || patient.includes(q) || frame.includes(q) || lens.includes(q) || status.includes(q)
    })
  }, [orders, search])

  const counts = useMemo(() => {
    const bucket = { ordered: 0, inProduction: 0, qualityCheck: 0, delivered: backendStats.dispensed }
    for (const order of orders) {
      const status = getDisplayStatus(order)
      if (status === 'delivered') continue
      bucket[status] += 1
    }
    return bucket
  }, [orders, backendStats.dispensed])

  return (
    <div className="optical-page w-full min-w-0 p-4 sm:p-6 lg:p-7 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">Optical Shop</h1>
          <p className="mt-1 text-xl text-slate-600 dark:text-slate-400">Manage optical inventory and orders</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <OpticalKpiCard title="Pending Orders" value={counts.ordered} icon={Clock3} tone="blue" />
        <OpticalKpiCard title="In Production" value={counts.inProduction} icon={Package} tone="orange" />
        <OpticalKpiCard title="Ready for Pickup" value={counts.qualityCheck} icon={CircleCheck} tone="green" />
        <OpticalKpiCard title="Delivered" value={backendStats.dispensed} icon={Package} tone="teal" />
        <OpticalKpiCard title="Low Stock" value={lowStock} icon={TriangleAlert} tone="slate" />
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] overflow-hidden">
        <OpticalShopTabs />

        <div className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative w-full md:flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 rounded-xl pl-12 text-base border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 focus-visible:ring-[#0EA5E9]"
                placeholder="Search orders..."
              />
            </div>
            <Button asChild className="h-11 rounded-xl bg-[#0EA5E9] hover:bg-[#0c96d4] px-6 text-base font-semibold">
              <Link href="/dashboard/optical-shop/orders/new">+ New Order</Link>
            </Button>
          </div>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-lg text-slate-500 dark:text-slate-400">{loading ? 'Loading...' : 'No orders found'}</div>
          ) : (
            filtered.map((order) => {
              const displayStatus = getDisplayStatus(order)
              const amount = (Number(order.frameItem?.sellingPrice || 0) + Number(order.lensItem?.sellingPrice || 0)) || 0
              return (
                <Link
                  key={order.id}
                  href={`/dashboard/optical-shop/orders/${order.id}`}
                  className="flex items-center gap-4 px-5 py-5 hover:bg-slate-50 transition-colors"
                >
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400">
                    <Glasses className="h-7 w-7" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xl md:text-2xl font-bold leading-none text-slate-900 dark:text-slate-50">OPT-{compactId(order.id)}</div>
                    <div className="mt-1 text-base md:text-lg text-slate-700 dark:text-slate-300 truncate">{order.patient?.fullName || 'Unknown Patient'}</div>
                  </div>

                  <div className="shrink-0 text-right">
                    {statusBadge(displayStatus)}
                    <div className="mt-2 text-xl md:text-2xl font-bold leading-none text-slate-900 dark:text-slate-50">{money(amount)}</div>
                    <div className="mt-1 text-sm md:text-base text-slate-500 dark:text-slate-400">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'}</div>
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
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">Total Orders: {backendStats.total}</span>
      </div>
    </div>
  )
}
