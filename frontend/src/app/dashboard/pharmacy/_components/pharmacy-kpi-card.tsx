'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'indigo' | 'orange' | 'red' | 'amber' | 'green'

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
  const colors: Record<string, string> = {
    indigo: "bg-[#4F46E5] text-white border-none",
    green: "bg-[#10B981] text-white border-none",
    red: "bg-[#EF4444] text-white border-none",
    orange: "bg-[#F97316] text-white border-none",
    amber: "bg-[#F59E0B] text-white border-none",
    blue: "bg-[#3B82F6] text-white border-none",
    pink: "bg-[#EC4899] text-white border-none",
  }

  const selectedColor = colors[tone] || colors.indigo

  return (
    <div className={cn(
      "relative group overflow-hidden rounded-xl p-6 shadow-md border border-white/10 transition-all duration-300 hover:shadow-lg",
      selectedColor
    )}>
      <div className="flex items-center justify-between relative z-10">
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-white/90 uppercase tracking-widest">
            {title}
          </p>
          <h3 className="text-3xl font-bold text-white tracking-tight tabular-nums">
            {value}
          </h3>
        </div>
        <div className="flex shrink-0 items-center justify-center transition-transform duration-300 group-hover:scale-110">
          <Icon className="h-10 w-10 text-white/40 group-hover:text-white/60 transition-colors" strokeWidth={2} />
        </div>
      </div>
    </div>
  )
}
