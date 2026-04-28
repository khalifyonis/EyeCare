'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Medicines', href: '/dashboard/pharmacy/inventory' },
  { label: 'Sales', href: '/dashboard/pharmacy' },
]

export function PharmacyTabs() {
  const pathname = usePathname()
  const normalized = pathname

  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a] overflow-hidden shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {tabs.map((t) => {
          const active =
            t.href === '/dashboard/pharmacy'
              ? normalized === '/dashboard/pharmacy' || normalized.startsWith('/dashboard/pharmacy/sales')
              : normalized === t.href || normalized.startsWith(`${t.href}/`)
          return (
            <Link
              key={t.href}
              href={t.href}
              className={[
                'relative flex items-center justify-center px-4 py-3 text-sm md:text-base font-semibold transition-colors border-b',
                active
                  ? 'text-[#0EA5E9] dark:text-[#38BDF8] bg-sky-50/70 dark:bg-sky-900/20 border-[#0EA5E9] dark:border-[#38BDF8]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 border-slate-100 dark:border-slate-800',
              ].join(' ')}
            >
              {t.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
