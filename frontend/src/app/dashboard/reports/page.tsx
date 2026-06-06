'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/reports/financial');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0EA5E9] border-t-transparent"></div>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Redirecting to Financial Reports...</p>
      </div>
    </div>
  );
}
