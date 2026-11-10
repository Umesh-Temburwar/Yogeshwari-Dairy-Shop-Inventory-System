import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient.js';
import { formatINR, formatDate } from '../lib/formatters.js';
import { Badge } from '../components/common/Badge.js';
import { StatCard } from '../components/common/StatCard.js';
import {
  Boxes,
  AlertTriangle,
  Clock,
  Sparkles,
  Package,
  IndianRupee,
  ShieldCheck,
  Ban,
} from 'lucide-react';
import { Batch } from '../types/index.js';

export const StockOverview: React.FC = () => {
  const [viewMode, setViewMode] = useState<'products' | 'batches'>('products');
  const [filterExpired, setFilterExpired] = useState(false);

  // Stock overview
  const { data: stockData, isLoading: stockLoading } = useQuery({
    queryKey: ['stock-overview'],
    queryFn: () => apiClient<{ summary: any; items: any[] }>('/stock/overview'),
  });

  // Batches with computed expiry
  const { data: batches = [], isLoading: batchLoading } = useQuery({
    queryKey: ['batches-expiry'],
    queryFn: () => apiClient<Batch[]>('/stock/expiry'),
  });

  const summary = stockData?.summary || {
    totalProducts: 0,
    activeProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalStockQuantity: 0,
    totalStockValue: 0,
  };

  const productItems = stockData?.items || [];

  const filteredBatches = filterExpired
    ? batches.filter((b) => b.expiry_status === 'EXPIRED')
    : batches;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Inventory & Batch Expiry (FEFO)
          </h1>
          <p className="text-xs text-slate-500">
            Real-time stock quantities, safety thresholds, and First-Expired-First-Out dynamic tracking.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex rounded-xl bg-slate-200/80 p-1">
          <button
            type="button"
            onClick={() => setViewMode('products')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
              viewMode === 'products'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Product Summary
          </button>
          <button
            type="button"
            onClick={() => setViewMode('batches')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              viewMode === 'batches'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Batch-Wise Expiry</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-700">
              FEFO
            </span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total In-Stock Units"
          value={stockLoading ? '...' : summary.totalStockQuantity}
          subtitle="All product batches combined"
          icon={Boxes}
          variant="emerald"
        />
        <StatCard
          title="Stock Below Safety Min"
          value={stockLoading ? '...' : summary.lowStockCount}
          subtitle="Needs reordering from depot"
          icon={AlertTriangle}
          variant={summary.lowStockCount > 0 ? 'amber' : 'emerald'}
        />
        <StatCard
          title="Total Active Batches"
          value={batchLoading ? '...' : batches.length}
          subtitle="Tracked by mfg & expiry date"
          icon={Clock}
          variant="blue"
        />
        <StatCard
          title="Inventory Valuation"
          value={stockLoading ? '...' : formatINR(summary.totalStockValue)}
          subtitle="At wholesale purchase cost"
          icon={IndianRupee}
          variant="purple"
        />
      </div>

      {/* View Mode 1: Product Stock Summary Table */}
      {viewMode === 'products' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              Product Stock vs Safety Threshold
            </h2>
            <span className="text-xs text-slate-400">
              {productItems.length} products listed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Current Stock</th>
                  <th className="px-4 py-3">Safety Min</th>
                  <th className="px-4 py-3">Stock Level Bar</th>
                  <th className="px-4 py-3">Stock Value</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {productItems.map((item) => {
                  const stock = item.current_stock || 0;
                  const min = item.min_stock || 1;
                  const percent = Math.min(100, Math.round((stock / (item.max_stock || 100)) * 100));
                  const isLow = stock <= min;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          SKU: {item.sku}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`text-base font-extrabold ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                          {stock}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-500 text-xs font-semibold">
                        {min} units
                      </td>

                      {/* Stock Visual Progress Bar */}
                      <td className="px-4 py-3 w-48">
                        <div className="space-y-1">
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                stock === 0
                                  ? 'bg-rose-500 w-full'
                                  : isLow
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.max(5, percent)}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-slate-400 text-right">
                            {stock === 0 ? 'Out of stock' : `${percent}% capacity`}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {formatINR(stock * item.purchase_price)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Badge type="stock" value={item.stock_status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Mode 2: Batch Expiry (FEFO Rule) Table */}
      {viewMode === 'batches' && (
        <div className="space-y-4">
          {/* FEFO Banner */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <span className="font-bold">FEFO (First Expired First Out) Engine Active:</span> In POS billing, items are automatically allocated from batches expiring earliest. Expired batches are blocked from sales by server rule.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <h2 className="font-bold text-slate-800 text-sm">
                  Batches Sorted by Earliest Expiry (FEFO)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setFilterExpired(!filterExpired)}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                  filterExpired
                    ? 'bg-rose-50 border-rose-300 text-rose-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {filterExpired ? 'Showing Expired Only' : 'Show Expired Only'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Batch Number</th>
                    <th className="px-4 py-3">Mfg Date</th>
                    <th className="px-4 py-3">Expiry Date</th>
                    <th className="px-4 py-3">Qty Remaining</th>
                    <th className="px-4 py-3">Purchase Rate</th>
                    <th className="px-4 py-3 text-right">Dynamic Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredBatches.map((b) => {
                    const isExpired = b.expiry_status === 'EXPIRED';
                    return (
                      <tr
                        key={b.id}
                        className={`transition ${
                          isExpired ? 'bg-rose-50/50' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 font-mono">
                            #{b.batch_no}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Batch ID: {b.id.slice(0, 8)}...
                          </div>
                        </td>

                        <td className="px-4 py-3 text-xs text-slate-600">
                          {formatDate(b.mfg_date)}
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-xs font-bold text-slate-900">
                            {formatDate(b.expiry_date)}
                          </div>
                          {b.days_to_expiry !== undefined && (
                            <div
                              className={`text-[10px] font-semibold ${
                                b.days_to_expiry < 0
                                  ? 'text-rose-600'
                                  : b.days_to_expiry === 0
                                  ? 'text-rose-700 font-bold'
                                  : b.days_to_expiry <= 3
                                  ? 'text-amber-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              {b.days_to_expiry < 0
                                ? `${Math.abs(b.days_to_expiry)} days ago`
                                : b.days_to_expiry === 0
                                ? 'Today!'
                                : b.days_to_expiry === 1
                                ? 'Tomorrow'
                                : `In ${b.days_to_expiry} days`}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`text-base font-extrabold ${
                              isExpired ? 'text-rose-600 line-through' : 'text-slate-900'
                            }`}
                          >
                            {b.qty_remaining}
                          </span>
                          <span className="text-xs text-slate-400"> / {b.qty_received} received</span>
                        </td>

                        <td className="px-4 py-3 font-semibold text-slate-700">
                          {formatINR(b.purchase_price)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isExpired && <Ban className="w-4 h-4 text-rose-600" />}
                            <Badge type="expiry" value={b.expiry_status || 'FRESH'} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

