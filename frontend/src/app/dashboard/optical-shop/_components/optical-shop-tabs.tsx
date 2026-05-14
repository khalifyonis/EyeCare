'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Orders', href: '/dashboard/optical-shop' },
  { label: 'Prescriptions', href: '/dashboard/prescription/optical' },
  { label: 'Frame Inventory', href: '/dashboard/optical-shop/frames' },
  { label: 'Lens Inventory', href: '/dashboard/optical-shop/lenses' },
]

export function OpticalShopTabs() {
  const pathname = usePathname()

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-4">
        {tabs.map((t) => {
          const active = pathname === t.href
          return (
            <Link
              key={t.href}
              href={t.href}
              className={[
                'relative flex items-center justify-center gap-2 px-4 py-3 text-base md:text-lg font-medium transition-colors border-b',
                active
                  ? 'text-[#0EA5E9] dark:text-[#38bdf8] bg-sky-50/70 dark:bg-sky-900/20 border-[#0EA5E9] dark:border-[#38bdf8]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 border-slate-200 dark:border-slate-800',
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
