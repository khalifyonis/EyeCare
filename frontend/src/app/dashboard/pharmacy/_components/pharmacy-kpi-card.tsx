'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'indigo' | 'orange' | 'red' | 'amber' | 'green'

const toneIconWrap: Record<Tone, string> = {
  indigo: 'bg-indigo-50 text-indigo-600',
  orange: 'bg-orange-50 text-orange-600',
  red: 'bg-red-50 text-red-600',
  amber: 'bg-amber-50 text-amber-700',
  green: 'bg-emerald-50 text-emerald-600',
}

export function PharmacyKpiCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string
  value: number | string
  icon: LucideIcon
  tone: Tone
}) {
  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-4 shadow-sm min-w-0 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xl md:text-3xl font-extrabold leading-none tabular-nums text-slate-900 dark:text-slate-50">{value}</div>
          <div className="mt-1 text-sm md:text-base font-semibold text-slate-600 dark:text-slate-400 leading-tight">{title}</div>
        </div>
        <div className={cn('grid h-11 w-11 place-items-center rounded-xl shrink-0 transition-opacity', toneIconWrap[tone], 'dark:bg-opacity-20')}>
          <Icon className="h-6 w-6" strokeWidth={1.9} />
        </div>
      </div>
    </div>
  )
}
