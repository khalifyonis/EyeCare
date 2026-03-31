'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { PharmacyTabs } from '../_components/pharmacy-tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BarChart3, RefreshCw } from 'lucide-react'

type Billing = {
  id: string
  status: 'PAID' | 'UNPAID' | 'PARTIAL' | string
  createdAt: string
  finalAmount?: number | string
  lineItems?: Array<{
    itemType: string
    itemId: string
    description?: string | null
    quantity: number
    unitPrice: number | string
    lineTotal: number | string
  }>
}

function isoDate(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function money(value: number) {
  return `$${value.toFixed(2)}`
}

export default function PharmacyReportsPage() {
  const label = 'text-xs font-semibold uppercase text-slate-500'

  const today = useMemo(() => new Date(), [])
  const [from, setFrom] = useState(() => isoDate(new Date(today.getFullYear(), today.getMonth(), 1)))
  const [to, setTo] = useState(() => isoDate(today))
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<Billing[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/billing', {
        params: {
          serviceType: 'PHARMACY',
          from,
          to,
          page: 1,
          limit: 1000,
        },
      })
      const body = res.data as { data?: Billing[] }
      setRows(Array.isArray(body?.data) ? body.data : [])
    } catch {
      setRows([])
      toast.error('Failed to load pharmacy reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const metrics = useMemo(() => {
    const totalSales = rows.length
    const paid = rows.filter((r) => r.status === 'PAID')
    const partial = rows.filter((r) => r.status === 'PARTIAL')
    const revenuePaid = paid.reduce((acc, r) => acc + Number(r.finalAmount || 0), 0)
    const revenuePartial = partial.reduce((acc, r) => acc + Number(r.finalAmount || 0), 0)

    const topMap = new Map<string, { key: string; label: string; qty: number; revenue: number }>()
    for (const b of rows) {
      for (const li of b.lineItems || []) {
        if (li.itemType !== 'PHARMACY') continue
        const key = li.itemId
        const label = li.description || li.itemId
        const prev = topMap.get(key) || { key, label, qty: 0, revenue: 0 }
        prev.qty += Number(li.quantity || 0)
        prev.revenue += Number(li.lineTotal || 0)
        topMap.set(key, prev)
      }
    }
    const top = Array.from(topMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    return {
      totalSales,
      revenuePaid,
      revenuePartial,
      top,
    }
  }, [rows])

  return (
    <div className="w-full min-w-0 p-4 sm:p-6 lg:p-7 space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Reports</h1>
        <p className="mt-1 text-xl text-slate-600">Pharmacy sales overview</p>
        <div className="mt-4">
          <Link href="/dashboard/pharmacy" className="text-base font-semibold text-slate-600 hover:text-slate-900">
            ← Back to Pharmacy
          </Link>
        </div>
      </div>

      <PharmacyTabs />

      <Card className="rounded-xl border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className={label}>From</div>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 h-11 rounded-xl" />
            </div>
            <div>
              <div className={label}>To</div>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 h-11 rounded-xl" />
            </div>
            <div className="flex items-end">
              <Button
                onClick={load}
                disabled={loading}
                className="h-11 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 text-base font-semibold"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-100 bg-white shadow-sm p-4">
              <div className={label}>Total sales</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900">{metrics.totalSales}</div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white shadow-sm p-4">
              <div className={label}>Revenue (paid)</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900">{money(metrics.revenuePaid)}</div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white shadow-sm p-4">
              <div className={label}>Revenue (partial)</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900">{money(metrics.revenuePartial)}</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-50/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Top medicines</div>
            {metrics.top.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">No line-item data in this range</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {metrics.top.map((t) => (
                  <div key={t.key} className="px-4 py-3 text-sm flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{t.label}</div>
                      <div className="text-xs text-slate-500">Qty: {t.qty}</div>
                    </div>
                    <div className="font-extrabold text-slate-900">{money(t.revenue)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
