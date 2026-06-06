'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import {
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { 
  Package, 
  DollarSign, 
  AlertTriangle, 
  Clock, 
  Loader2 
} from 'lucide-react';
import { StatsCard } from '@/components/dashboard/stats-card';
import ReportLayout from '../_components/report-layout';

type InventoryData = {
  kpis: {
    totalItems: number;
    stockValue: number;
    lowStockAlerts: number;
    expiringSoon: number;
  };
  chart1: Array<{ name: string; value: number }>;
  chart2: Array<{ name: string; value: number }>;
  tableData: Array<{
    id: string;
    name: string;
    category: string;
    type: string;
    stock: number;
    reorderLevel: number;
    purchasePrice: number;
    sellingPrice: number;
    expiryDate: string | null;
    status: string;
  }>;
};

const COLORS = ['#0EA5E9', '#8B5CF6', '#F97316', '#10B981', '#EF4444'];

export default function InventoryReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [inventoryType, setInventoryType] = useState<'all' | 'optical' | 'pharmacy'>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/inventory');
      setData(res.data);
    } catch {
      toast.error('Failed to load inventory report data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter table data in memory
  const getFilteredTableData = () => {
    if (!data) return [];
    return data.tableData.filter((row) => {
      if (inventoryType === 'optical') return row.type === 'Optical';
      if (inventoryType === 'pharmacy') return row.type === 'Pharmacy';
      return true;
    });
  };

  const getFilteredChart1 = () => {
    if (!data) return [];
    return data.chart1.filter(item => {
      const name = item.name.toLowerCase();
      if (inventoryType === 'optical') return name.includes('optical') || name.includes('frame') || name.includes('lens');
      if (inventoryType === 'pharmacy') return name.includes('pharmacy') || name.includes('medicine');
      return true;
    });
  };

  // Dynamically calculate KPIs for the filtered subset
  const getFilteredKPIs = () => {
    const filtered = getFilteredTableData();
    const totalItems = filtered.length;
    const stockValue = filtered.reduce((sum, row) => sum + (row.stock * (row.purchasePrice || 0)), 0);
    const lowStockAlerts = filtered.filter(row => row.stock <= row.reorderLevel).length;

    // Expiring in next 90 days
    const expiringSoon = filtered.filter(row => {
      if (!row.expiryDate) return false;
      const expiry = new Date(row.expiryDate).getTime();
      const now = new Date().getTime();
      const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 90;
    }).length;

    return { totalItems, stockValue, lowStockAlerts, expiringSoon };
  };

  const exportPdf = async () => {
    if (!data) return;
    setExportingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const filteredTable = getFilteredTableData();
      const kpis = getFilteredKPIs();
      
      // Draw premium header
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, 210, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('AL-IXSAAN Eye Care', 14, 14);
      doc.setFontSize(11);
      
      let typeText = 'All Inventory Stock Report';
      if (inventoryType === 'optical') typeText = 'Optical Shop Inventory Report';
      if (inventoryType === 'pharmacy') typeText = 'Pharmacy Inventory Report';
      doc.text(typeText, 14, 22);
      
      doc.setFontSize(9);
      doc.text(`Live Stock Snapshot`, 14, 28);
      doc.setTextColor(0, 0, 0);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 130, 28);

      let y = 42;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('STOCK KEY METRICS', 14, y);
      doc.setFont('helvetica', 'normal');
      y += 8;

      const items = [
        ['Total Stock Items Count', String(kpis.totalItems)],
        ['Total Estimated Stock Value', `$${kpis.stockValue.toFixed(2)}`],
        ['Low Stock Alerts Count', String(kpis.lowStockAlerts)],
        ['Items Expiring (Next 90 Days)', String(kpis.expiringSoon)],
      ];

      for (const [label, val] of items) {
        doc.text(label, 14, y);
        doc.text(val, 120, y);
        y += 7;
      }

      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('DETAILED INVENTORY LOG', 14, y);
      doc.setFont('helvetica', 'normal');
      y += 6;

      // Table headers
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y - 4, 190, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('ITEM NAME', 12, y);
      doc.text('CATEGORY/BRAND', 60, y);
      doc.text('TYPE', 105, y);
      doc.text('STOCK', 125, y);
      doc.text('PURCHASE', 145, y);
      doc.text('SELLING', 165, y);
      doc.text('STATUS', 185, y);
      doc.setFont('helvetica', 'normal');
      y += 7;

      for (const row of filteredTable) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(row.name.slice(0, 24), 12, y);
        doc.text((row.category || '—').slice(0, 22), 60, y);
        doc.text(row.type, 105, y);
        doc.text(String(row.stock), 125, y);
        doc.text(`$${Number(row.purchasePrice).toFixed(2)}`, 145, y);
        doc.text(`$${Number(row.sellingPrice).toFixed(2)}`, 165, y);
        doc.text(row.status, 185, y);
        y += 5.5;
      }

      doc.save(`inventory-report-${inventoryType}-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const exportCsv = () => {
    const filteredTable = getFilteredTableData();
    if (!filteredTable.length) return;
    const headers = ['Item Name', 'Category/Brand', 'Type', 'Current Stock', 'Reorder Level', 'Purchase Price', 'Selling Price', 'Expiry Date', 'Status'];
    const lines = filteredTable.map(row => {
      const cells = [
        row.name,
        row.category || '—',
        row.type,
        row.stock,
        row.reorderLevel,
        Number(row.purchasePrice).toFixed(2),
        Number(row.sellingPrice).toFixed(2),
        row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : '—',
        row.status
      ];
      return cells.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-report-${inventoryType}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredTable = getFilteredTableData();
  const kpis = getFilteredKPIs();
  const chart1Data = getFilteredChart1();

  return (
    <ReportLayout
      title="Inventory Analytics"
      from={from}
      to={to}
      setFrom={setFrom}
      setTo={setTo}
      onRefresh={fetchData}
      exportPdf={exportPdf}
      exportCsv={exportCsv}
      print={handlePrint}
      exportingPdf={exportingPdf}
      hasData={filteredTable.length > 0}
    >
      {loading ? (
        <div className="flex h-64 items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0EA5E9]" />
            <p className="text-sm font-medium text-slate-400">Loading inventory reports...</p>
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6">

          {/* Inventory Category Dropdown */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category</span>
            <select
              value={inventoryType}
              onChange={(e) => setInventoryType(e.target.value as 'all' | 'optical' | 'pharmacy')}
              className="h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-[#0EA5E9] focus:outline-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm"
            >
              <option value="all">All Stock</option>
              <option value="optical">Optical Shop</option>
              <option value="pharmacy">Pharmacy</option>
            </select>
          </div>
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Stock Items"
              value={String(kpis.totalItems)}
              icon={Package}
              color="blue"
            />
            <StatsCard
              title="Total Stock Value"
              value={`$${kpis.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={DollarSign}
              color="emerald"
            />
            <StatsCard
              title="Low Stock Alerts"
              value={String(kpis.lowStockAlerts)}
              icon={AlertTriangle}
              color="amber"
            />
            <StatsCard
              title="Expiring Soon (90d)"
              value={String(kpis.expiringSoon)}
              icon={Clock}
              color="rose"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Stock Value by Category */}
            <div className={`${inventoryType === 'optical' ? 'lg:col-span-3' : 'lg:col-span-2'} rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm`}>
              <div className="mb-4">
                <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">Stock Value by Category</h2>
                <p className="text-xs text-slate-400">Total estimated dollar value share by category</p>
              </div>
              <div className="h-64">
                {chart1Data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart1Data} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Stock Value']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          borderRadius: 8,
                          border: '1px solid hsl(var(--border))',
                          fontSize: 11,
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chart1Data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    No inventory items to display category value chart
                  </div>
                )}
              </div>
            </div>

            {/* Expiry Timeline Chart */}
            {inventoryType !== 'optical' && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col">
                <div className="mb-4">
                  <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">Expiration Timeline</h2>
                  <p className="text-xs text-slate-400">Time remaining until batch expiration dates</p>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  {data.chart2.some(s => s.value > 0) ? (
                    <>
                      <div className="w-40 h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                            <Pie
                              data={data.chart2}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={75}
                              paddingAngle={3}
                              dataKey="value"
                              startAngle={90}
                              endAngle={-270}
                            >
                              {data.chart2.map((s, idx) => (
                                <Cell key={s.name} fill={COLORS[idx % COLORS.length]} stroke="transparent" />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                borderRadius: 8,
                                border: '1px solid hsl(var(--border))',
                                fontSize: 11,
                              }}
                            />
                          </RePieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full space-y-1.5">
                        {data.chart2.map((s, idx) => {
                          const total = data.chart2.reduce((sum, item) => sum + item.value, 0);
                          return (
                            <div key={s.name} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                <span className="text-slate-600 dark:text-slate-200 uppercase">{s.name}</span>
                              </div>
                              <span className="text-slate-500 dark:text-slate-300 font-medium">
                                {s.value} ({Math.round((s.value / (total || 1)) * 100)}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 text-center flex-1 flex items-center justify-center">
                      No items expiring in the next 90 days
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Detailed Inventory Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">Detailed Inventory Directory</h2>
              <p className="text-xs text-slate-400">Complete listing of pharmacy items and optical shop stock</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <th className="px-5 py-3 text-left">Item Name</th>
                    <th className="px-5 py-3 text-left">Category / Brand</th>
                    <th className="px-5 py-3 text-left">Type</th>
                    <th className="px-5 py-3 text-right">Stock</th>
                    <th className="px-5 py-3 text-right">Reorder Lvl</th>
                    <th className="px-5 py-3 text-right">Purchase Price</th>
                    <th className="px-5 py-3 text-right">Selling Price</th>
                    <th className="px-5 py-3 text-left">Expiry Date</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredTable.length > 0 ? (
                    filteredTable.map((row) => {
                      const isLowStock = row.status === 'LOW STOCK';
                      const statusClasses = isLowStock
                        ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-700'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700';

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-100">{row.name}</td>
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-medium">{row.category || '—'}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${row.type === 'Pharmacy' ? 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300' : 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'}`}>
                              {row.type}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{row.stock}</td>
                          <td className="px-5 py-3.5 text-right text-slate-500 dark:text-slate-400 tabular-nums">{row.reorderLevel}</td>
                          <td className="px-5 py-3.5 text-right text-slate-500 dark:text-slate-400 tabular-nums">${Number(row.purchasePrice).toFixed(2)}</td>
                          <td className="px-5 py-3.5 text-right text-slate-700 dark:text-slate-200 font-semibold tabular-nums">${Number(row.sellingPrice).toFixed(2)}</td>
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-medium">{row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : '—'}</td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusClasses}`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-sm text-slate-400">
                        No inventory records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
          Please run report to load inventory results.
        </div>
      )}
    </ReportLayout>
  );
}
