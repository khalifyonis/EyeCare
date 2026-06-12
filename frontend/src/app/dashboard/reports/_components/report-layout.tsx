import React, { useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { PageBreadcrumb } from '@/components/dashboard/page-breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FileDown, 
  Loader2, 
  Printer, 
  FileSpreadsheet, 
  Package,
  DollarSign,
  TrendingUp,
  Activity,
  Users,
  Calendar,
  Layers,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { readStoredUser, resolveRoleName } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

interface ReportLayoutProps {
  title: string;
  from: string;
  to: string;
  setFrom: (val: string) => void;
  setTo: (val: string) => void;
  onRefresh?: () => void;
  exportPdf: () => void;
  exportCsv: () => void;
  print: () => void;
  exportingPdf: boolean;
  hasData: boolean;
  children: React.ReactNode;
}

const TABS = [
  { label: 'Financial', path: '/dashboard/reports/financial', icon: DollarSign, module: 'reports_financial' },
  { label: 'Revenue Trend', path: '/dashboard/reports/revenue-trend', icon: TrendingUp, module: 'reports_financial' },
  { label: 'Income by Service', path: '/dashboard/reports/income-by-service', icon: Layers, module: 'reports_financial' },
  { label: 'Doctor Performance', path: '/dashboard/reports/doctor-performance', icon: Users, module: 'reports_clinical' },
  { label: 'Branch Report', path: '/dashboard/reports/branch-report', icon: Layers, module: 'reports_operational' },
  { label: 'Clinical', path: '/dashboard/reports/clinical', icon: Activity, module: 'reports_clinical' },
  { label: 'Appointments', path: '/dashboard/reports/appointments', icon: Calendar, module: 'reports_appointments' },
  { label: 'Patients', path: '/dashboard/reports/patients', icon: Users, module: 'reports_patients' },
  { label: 'Inventory', path: '/dashboard/reports/inventory', icon: Package, module: 'reports_inventory' },
  { label: 'Operational', path: '/dashboard/reports/operational', icon: Activity, module: 'reports_operational' },
];

export default function ReportLayout({
  title,
  from,
  to,
  setFrom,
  setTo,
  onRefresh,
  exportPdf,
  exportCsv,
  print,
  exportingPdf,
  hasData,
  children
}: ReportLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const user = useMemo(() => readStoredUser(), []);
  const role = useMemo(() => resolveRoleName(user), [user]);

  const filteredTabs = useMemo(() => {
    return TABS.filter(tab => hasPermission(tab.module, 'canRead'));
  }, []);

  const getSelectedRangeValue = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const lastWeekStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const firstOfMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const firstOfYearStr = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);

    if (from === todayStr && to === todayStr) return 'today';
    if (from === lastWeekStr && to === todayStr) return 'week';
    if (from === firstOfMonthStr && to === todayStr) return 'month';
    if (from === firstOfYearStr && to === todayStr) return 'year';
    if (from === '' && to === '') return 'all';
    return 'custom';
  };

  const handleQuickFilter = (type: 'today' | 'week' | 'month' | 'year' | 'all') => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const now = new Date();

    if (type === 'today') {
      setFrom(todayStr);
      setTo(todayStr);
    } else if (type === 'week') {
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setFrom(lastWeek.toISOString().slice(0, 10));
      setTo(todayStr);
    } else if (type === 'month') {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setFrom(firstOfMonth.toISOString().slice(0, 10));
      setTo(todayStr);
    } else if (type === 'year') {
      const firstOfYear = new Date(now.getFullYear(), 0, 1);
      setFrom(firstOfYear.toISOString().slice(0, 10));
      setTo(todayStr);
    } else if (type === 'all') {
      setFrom('');
      setTo('');
    }
  };

  useEffect(() => {
    if (onRefresh) {
      onRefresh();
    }
  }, [from, to, onRefresh]);

  return (
    <div className="w-full flex flex-col p-4 sm:p-5 md:p-6 lg:p-8 space-y-5 animate-in fade-in duration-300">

      {/* Print-only Header */}
      <div className="print-header" style={{ display: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '20pt', fontWeight: 700, color: '#0f172a', margin: 0 }}>AL-IXSAAN Eye Care</h1>
            <h2 style={{ fontSize: '13pt', fontWeight: 600, color: '#0EA5E9', margin: '4pt 0 0 0' }}>{title}</h2>
          </div>
          <div style={{ textAlign: 'right', fontSize: '9pt', color: '#64748b' }}>
            <p style={{ margin: 0 }}>Generated: {new Date().toLocaleString()}</p>
            {(from || to) && <p style={{ margin: '2pt 0 0 0' }}>Period: {from || 'All Time'} — {to || 'Today'}</p>}
          </div>
        </div>
      </div>
      
      {/* Breadcrumbs and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800/80 print-hide">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            {title}
          </h1>
          <PageBreadcrumb current={title} />
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-nowrap overflow-x-auto gap-1 sm:gap-2 pb-px scrollbar-none border-b border-slate-200 dark:border-slate-800 -mx-1 px-1 overflow-y-visible print-hide">
        {filteredTabs.map((tab) => {
          const isActive = pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-all active:scale-95",
                isActive
                  ? "border-[#0EA5E9] text-[#0EA5E9]"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-700"
              )}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters Bar — Clean solid row like sample */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm print-hide">
        <select
          value={getSelectedRangeValue()}
          onChange={(e) => {
            if (e.target.value !== 'custom') {
              handleQuickFilter(e.target.value as any);
            }
          }}
          className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-[#0EA5E9] focus:outline-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
        >
          <option value="today">Today</option>
          <option value="week">Last 7 Days</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
          <option value="custom" disabled>Custom</option>
        </select>

        <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-slate-700" />

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">From</span>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 w-full sm:w-[150px] rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-1 focus-visible:ring-[#0EA5E9]"
          />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">To</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 w-full sm:w-[150px] rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-1 focus-visible:ring-[#0EA5E9]"
          />
        </div>

        {onRefresh && (
          <Button
            size="sm"
            onClick={onRefresh}
            className="h-9 px-5 text-xs font-bold rounded-lg bg-[#0EA5E9] hover:bg-[#0c96d4] text-white transition-all active:scale-95 shadow-sm whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Generate Report
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div className="space-y-6 flex-1">
        {children}
      </div>

      {/* Print Footer */}
      <div className="print-footer" style={{ display: 'none' }}>
        <span>AL-IXSAAN Eye Care Management System — Confidential</span>
      </div>

      {/* Actions Footer — Clean inline, no background box, sits at bottom of content */}
      <div className="w-full pt-5 mt-4 border-t border-slate-200 dark:border-slate-800 print-hide">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            size="sm"
            className="h-8 sm:h-9 rounded-lg text-[11px] sm:text-xs font-semibold bg-red-500 hover:bg-red-600 text-white transition-all active:scale-95"
            onClick={exportPdf}
            disabled={exportingPdf || !hasData}
          >
            {exportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <FileDown className="w-3.5 h-3.5 mr-1.5" />
            )}
            Export as PDF
          </Button>
          <Button
            size="sm"
            className="h-8 sm:h-9 rounded-lg text-[11px] sm:text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-all active:scale-95"
            onClick={exportCsv}
            disabled={!hasData}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            Export as Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 sm:h-9 rounded-lg text-[11px] sm:text-xs font-semibold border-slate-200 dark:border-slate-700 transition-all active:scale-95"
            onClick={print}
            disabled={!hasData}
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print Report
          </Button>
          <Button
            size="sm"
            className="h-8 sm:h-9 rounded-lg text-[11px] sm:text-xs font-semibold bg-[#0EA5E9] hover:bg-[#0c96d4] text-white transition-all active:scale-95"
            onClick={() => {
              exportPdf();
              exportCsv();
            }}
            disabled={exportingPdf || !hasData}
          >
            <Package className="w-3.5 h-3.5 mr-1.5" />
            Download All
          </Button>
        </div>
      </div>
    </div>
  );
}
