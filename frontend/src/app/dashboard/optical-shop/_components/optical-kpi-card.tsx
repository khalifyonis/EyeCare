'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Tone = 'blue' | 'orange' | 'green' | 'teal' | 'slate' | 'emerald' | 'rose' | 'amber'

const cardGradients: Record<Tone, string> = {
  blue: 'bg-gradient-to-br from-blue-500 to-blue-700',
  orange: 'bg-gradient-to-br from-orange-400 to-orange-600',
  green: 'bg-gradient-to-br from-green-500 to-green-700',
  teal: 'bg-gradient-to-br from-teal-500 to-teal-700',
  slate: 'bg-gradient-to-br from-slate-500 to-slate-700',
  emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
  rose: 'bg-gradient-to-br from-rose-500 to-rose-700',
  amber: 'bg-gradient-to-br from-amber-500 to-amber-700',
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
    <div
      className={cn(
        'relative min-w-0 overflow-hidden rounded-xl p-5 sm:p-6 shadow-md border border-white/10 transition-all duration-300 hover:shadow-lg',
        cardGradients[tone]
      )}
    >
      <div className="flex flex-col justify-between h-full min-h-[90px]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 z-10">
            <div className="text-[12px] font-bold uppercase tracking-wider text-white/80">
              {title}
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-center z-10 transition-transform duration-300 group-hover:scale-110">
            <Icon className="h-9 w-9 text-white/40 group-hover:text-white/60 transition-colors" strokeWidth={2} />
          </div>
        </div>
        
        <div className="z-10 mt-auto">
          <div className="text-3xl sm:text-4xl font-bold leading-none tracking-tight tabular-nums text-white">
            {value}
          </div>
        </div>
      </div>
    </div>
  )
}