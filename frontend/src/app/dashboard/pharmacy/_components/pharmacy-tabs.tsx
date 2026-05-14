'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const tabs = [
  { label: 'Sales Feed', href: '/dashboard/pharmacy' },
  { label: 'Medicine Inventory', href: '/dashboard/pharmacy/inventory' },
]

export function PharmacyTabs() {
  const pathname = usePathname()

  return (
    <div className="p-1 bg-slate-100/80 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
      <div className="flex items-center gap-1">
        {tabs.map((t) => {
          const active = t.href === '/dashboard/pharmacy'
            ? pathname === '/dashboard/pharmacy'
            : pathname.startsWith(t.href)

          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "relative px-6 py-2.5 text-sm font-bold transition-all duration-300 rounded-xl whitespace-nowrap",
                active
                  ? "bg-white dark:bg-slate-800 text-[#0EA5E9] shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50"
              )}
            >
              {t.label}
              {active && (
                <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-1 h-1 bg-[#0EA5E9] rounded-full shadow-[0_0_8px_#0EA5E9]" />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
