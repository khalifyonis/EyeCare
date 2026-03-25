'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'blue' | 'orange' | 'green' | 'teal' | 'slate'

const toneStyles: Record<Tone, string> = {
  blue: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white',
  orange: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white',
  green: 'bg-gradient-to-br from-sky-500 to-cyan-500 text-white',
  teal: 'bg-gradient-to-br from-[#0EA5E9] to-[#0c96d4] text-white',
  slate: 'bg-gradient-to-br from-slate-500 to-slate-700 text-white',
}

export function OpticalKpiCard({
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
    <div className={cn('rounded-2xl p-4 min-w-0 shadow-sm', toneStyles[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="optical-kpi-value text-[24px] md:text-[28px] font-extrabold leading-none tabular-nums">{value}</div>
          <div className="optical-kpi-title mt-1.5 text-[14px] md:text-[16px] font-semibold leading-tight">{title}</div>
        </div>
        <Icon className="h-9 w-9 md:h-10 md:w-10 text-white/85 shrink-0" strokeWidth={1.8} />
      </div>
    </div>
  )
}