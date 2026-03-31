'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { PharmacyTabs } from '../_components/pharmacy-tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle, RefreshCw, Search } from 'lucide-react'

type PharmacyItem = {
  id: string
  itemName: string
  genericName?: string | null
  sku?: string | null
  barcode?: string | null
  batchNumber?: string | null
  expiryDate?: string | null
  stockQuantity?: number | null
}

function daysUntil(dateIso?: string | null) {
  if (!dateIso) return null
  const d = new Date(dateIso)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

export default function PharmacyExpiryPage() {
  const label = 'text-xs font-semibold uppercase text-slate-500'
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [items, setItems] = useState<PharmacyItem[]>([])
  const [query, setQuery] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/inventory/pharmacy', { params: { page: 1, limit: 1000 } })
      const body = res.data as { data?: PharmacyItem[] }
      setItems(Array.isArray(body?.data) ? body.data : [])
    } catch {
      setItems([])
      toast.error('Failed to load pharmacy inventory')
    } finally {
      setLoading(false)
    }
  }

  const syncExpired = async () => {
    setSyncing(true)
    try {
      const res = await api.post('/inventory/pharmacy/sync-expired')
      const adjusted = (res.data as { adjusted?: number })?.adjusted
      toast.success(`Expired stock synced${typeof adjusted === 'number' ? ` (${adjusted} adjusted)` : ''}`)
      await load()
    } catch {
      toast.error('Failed to sync expired stock')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    void (async () => {
      await syncExpired()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = items.filter((it) => {
      if (!q) return true
      const hay = `${it.itemName} ${it.genericName || ''} ${it.sku || ''} ${it.barcode || ''} ${it.batchNumber || ''}`.toLowerCase()
      return hay.includes(q)
    })
    return filtered
      .map((it) => ({
        ...it,
        days: daysUntil(it.expiryDate),
      }))
      .sort((a, b) => {
        const da = a.days ?? 999999
        const db = b.days ?? 999999
        return da - db
      })
  }, [items, query])

  return (
    <div className="w-full min-w-0 p-4 sm:p-6 lg:p-7 space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Expiry Alerts</h1>
        <p className="mt-1 text-xl text-slate-600">Track near-expiry & expired stock</p>
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
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Expiry Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1">
              <div className={label}>Search</div>
              <div className="relative mt-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-11 rounded-xl pl-12"
                  placeholder="Search name, SKU, barcode, batch..."
                />
              </div>
            </div>
            <Button
              onClick={syncExpired}
              disabled={syncing}
              className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 text-base font-semibold"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {syncing ? 'Syncing...' : 'Sync Expired'}
            </Button>
          </div>

          <div className="rounded-xl border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-12 bg-slate-50/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <div className="col-span-5">Medicine</div>
              <div className="col-span-2">Batch</div>
              <div className="col-span-2">Expiry</div>
              <div className="col-span-1 text-right">Stock</div>
              <div className="col-span-2 text-right">Status</div>
            </div>

            {loading ? (
              <div className="px-4 py-6 text-sm text-slate-500">Loading...</div>
            ) : rows.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">No items to show</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {rows.map((it) => {
                  const days = it.days
                  const expired = typeof days === 'number' && days < 0
                  const expiringSoon = typeof days === 'number' && days >= 0 && days <= 90
                  const rowTone = expired ? 'bg-red-50/40' : expiringSoon ? 'bg-amber-50/40' : ''
                  const status = expired ? 'Expired' : expiringSoon ? `Expiring in ${days}d` : days === null ? 'No date' : `${days}d`
                  const statusClass =
                    expired
                      ? 'text-red-700 bg-red-100'
                      : expiringSoon
                        ? 'text-amber-700 bg-amber-100'
                        : 'text-slate-700 bg-slate-100'
                  return (
                    <div key={it.id} className={[rowTone, 'grid grid-cols-12 px-4 py-3 text-sm'].join(' ')}>
                      <div className="col-span-5 min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{it.genericName || it.itemName}</div>
                        <div className="text-xs text-slate-500 truncate">
                          {(it.sku || it.barcode || '').toString()}
                        </div>
                      </div>
                      <div className="col-span-2 text-slate-600 text-sm truncate">{it.batchNumber || '-'}</div>
                      <div className="col-span-2 text-slate-600 text-sm">
                        {it.expiryDate ? new Date(it.expiryDate).toLocaleDateString() : '-'}
                      </div>
                      <div className="col-span-1 text-right font-semibold text-slate-900">{Number(it.stockQuantity || 0)}</div>
                      <div className="col-span-2 flex justify-end">
                        <span className={[statusClass, 'px-3 py-1 rounded-full text-xs font-semibold'].join(' ')}>{status}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
