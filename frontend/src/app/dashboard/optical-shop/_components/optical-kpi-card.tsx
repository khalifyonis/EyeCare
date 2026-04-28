'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Tone = 'blue' | 'orange' | 'green' | 'teal' | 'slate'

const cardGradients: Record<Tone, string> = {
  blue: 'bg-gradient-to-br from-blue-500 to-blue-700',
  orange: 'bg-gradient-to-br from-orange-400 to-orange-600',
  green: 'bg-gradient-to-br from-green-500 to-green-700',
  teal: 'bg-gradient-to-br from-teal-500 to-teal-700',
  slate: 'bg-gradient-to-br from-slate-500 to-slate-700',
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
        'relative min-w-0 overflow-hidden rounded-2xl p-5 sm:p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5',
        cardGradients[tone]
      )}
    >
      <div className="flex flex-col justify-between h-full min-h-[100px]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 z-10">
            <div className="text-sm sm:text-[15px] font-semibold leading-tight text-white/90">
              {title}
            </div>
          </div>
          <div className="flex h-11 w-11 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-md z-10 border border-white/10">
            <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-white drop-shadow-sm" strokeWidth={1.5} />
          </div>
        </div>
        
        <div className="z-10 mt-auto">
          <div className="text-[2.2rem] sm:text-[2.5rem] md:text-[2.8rem] font-bold leading-none tracking-tight tabular-nums text-white drop-shadow-md">
            {value}
          </div>
        </div>
      </div>

      {/* Decorative background glass circles for premium feel */}
      <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -top-10 -left-10 h-24 w-24 rounded-full bg-white/5 blur-xl" />
      <div className="absolute top-1/2 right-0 h-16 w-16 rounded-full bg-white/5 -translate-y-1/2 blur-lg" />
    </div>
  )
}