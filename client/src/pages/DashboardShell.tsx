import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient.js';
import { formatINR } from '../lib/formatters.js';
import { StatCard } from '../components/common/StatCard.js';
import { Badge } from '../components/common/Badge.js';
import { Link } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  Boxes,
  IndianRupee,
  PlusCircle,
  Truck,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const DashboardShell: React.FC = () => {
  const { hasRole, user } = useAuth();

  // Fetch Stock Overview & Summary
  const { data: stockData, isLoading: stockLoading } = useQuery({
    queryKey: ['stock-overview'],
    queryFn: () => apiClient<{ summary: any; items: any[] }>('/stock/overview'),
  });

  // Fetch Batches Expiry Status
  const { data: batchData } = useQuery({
    queryKey: ['batch-expiry-preview'],
    queryFn: () => apiClient<any[]>('/stock/expiry'),
  });

  const summary = stockData?.summary || {
    totalProducts: 0,
    activeProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalStockQuantity: 0,
    totalStockValue: 0,
  };

  const lowStockItems = (stockData?.items || []).filter(
    (item) => item.stock_status === 'LOW' || item.stock_status === 'OUT_OF_STOCK'
  );

  const nearExpiryBatches = (batchData || []).filter(
    (b) => b.expiry_status === 'EXPIRING_TODAY' || b.expiry_status === 'EXPIRING_TOMORROW' || b.expiry_status === 'EXPIRING_IN_3_DAYS'
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-950 text-white shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
              Phase 1 Active
            </span>
            <span className="text-xs text-emerald-200">Shop Management System</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Namaste, {user?.fullName || 'Shop Partner'}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200 max-w-xl">
            Live catalog, batch-wise FEFO tracking, supplier management, and low stock indicators.
          </p>
        </div>

        {hasRole(['admin', 'owner', 'manager']) && (
          <div className="flex items-center gap-2">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-900 font-bold text-xs hover:bg-emerald-50 transition shadow-sm"
            >
              <PlusCircle className="w-4 h-4 text-emerald-700" />
              Manage Products
            </Link>
          </div>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Products"
          value={stockLoading ? '...' : summary.totalProducts}
          subtitle={`${summary.activeProducts} active in store`}
          icon={Package}
          variant="blue"
        />
        <StatCard
          title="Total Stock Units"
          value={stockLoading ? '...' : summary.totalStockQuantity}
          subtitle="Packets, litres & boxes"
          icon={Boxes}
          variant="emerald"
        />
        <StatCard
          title="Low Stock Warning"
          value={stockLoading ? '...' : summary.lowStockCount}
          subtitle={`${summary.outOfStockCount} items completely out`}
          icon={AlertTriangle}
          variant={summary.lowStockCount > 0 ? 'rose' : 'emerald'}
        />
        <StatCard
          title="Inventory Valuation"
          value={stockLoading ? '...' : formatINR(summary.totalStockValue)}
          subtitle="At purchase cost"
          icon={IndianRupee}
          variant="purple"
        />
      </div>

      {/* Two Column Layout: Low Stock Watchlist & Near Expiry Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Watchlist */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-800">
                Low Stock Watchlist ({lowStockItems.length})
              </h2>
            </div>
            <Link
              to="/stock"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
            >
              All Stock <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              All products are currently above their minimum safety stock threshold.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {lowStockItems.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-400">SKU: {item.sku}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-bold text-rose-600">
                        {item.current_stock} left
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Min: {item.min_stock}
                      </div>
                    </div>
                    <Badge type="stock" value={item.stock_status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Near Expiry Batches Watchlist */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
                <Clock className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-800">
                Near Expiry Batches ({nearExpiryBatches.length})
              </h2>
            </div>
            <Link
              to="/stock"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
            >
              Batches View <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {nearExpiryBatches.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No batches expiring in the next 3 days. All stock is fresh!
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {nearExpiryBatches.map((batch) => (
                <div key={batch.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-slate-900">
                      Batch #{batch.batch_no}
                    </div>
                    <div className="text-xs text-slate-500">
                      Remaining: <span className="font-semibold text-slate-700">{batch.qty_remaining} units</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge type="expiry" value={batch.expiry_status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/products"
          className="p-5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between mb-2">
            <Package className="w-6 h-6 text-emerald-600" />
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Product Catalog</h3>
          <p className="text-xs text-slate-500 mt-1">
            Browse, search barcodes, filter categories, and update selling prices.
          </p>
        </Link>

        <Link
          to="/stock"
          className="p-5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between mb-2">
            <Boxes className="w-6 h-6 text-blue-600" />
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">FEFO Stock & Batches</h3>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic expiry status, batch quantities, and safety threshold tracking.
          </p>
        </Link>

        {hasRole(['admin', 'owner', 'manager']) && (
          <Link
            to="/suppliers"
            className="p-5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <Truck className="w-6 h-6 text-purple-600" />
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Supplier Management</h3>
            <p className="text-xs text-slate-500 mt-1">
              Dairy cooperatives, Amul distributors, contact numbers, and GST records.
            </p>
          </Link>
        )}
      </div>
    </div>
  );
};

