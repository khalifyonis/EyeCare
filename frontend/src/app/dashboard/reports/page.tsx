'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/contexts/permission-context';

const REPORT_TABS = [
  { path: '/dashboard/reports/financial', module: 'reports_financial' },
  { path: '/dashboard/reports/clinical', module: 'reports_clinical' },
  { path: '/dashboard/reports/appointments', module: 'reports_appointments' },
  { path: '/dashboard/reports/patients', module: 'reports_patients' },
  { path: '/dashboard/reports/inventory', module: 'reports_inventory' },
  { path: '/dashboard/reports/operational', module: 'reports_operational' },
];

export default function ReportsPage() {
  const router = useRouter();

  const { can } = usePermission();

  useEffect(() => {
    const allowed = REPORT_TABS.find(tab => can(tab.module, 'canRead'));
    if (allowed) {
      router.replace(allowed.path);
    } else {
      router.replace('/dashboard');
    }
  }, [router, can]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0EA5E9] border-t-transparent"></div>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Redirecting to reports...</p>
      </div>
    </div>
  );
}
