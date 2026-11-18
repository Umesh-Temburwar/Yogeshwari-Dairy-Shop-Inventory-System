import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  RotateCcw, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  FileDown, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  Package, 
  CreditCard,
  DollarSign,
  Truck,
  FileText,
  Clock,
  Printer,
  Download,
  RefreshCw,
  BadgeAlert,
  Eye
} from 'lucide-react';
import { exportReportToPDF, printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import { SupplierReturnModal } from './SupplierReturnModal';
import { SupplierReturn, SupplierRefundStatus } from '../../types';
import { CompactPageHeader } from '../Common/CompactPageHeader';
import { LoadOlderHistoryButton } from '../Common/LoadOlderHistoryButton';

interface ReturnsTrackerProps {
  onOpenReturnModal: () => void;
}

export const ReturnsTracker: React.FC<ReturnsTrackerProps> = ({ onOpenReturnModal }) => {
  const { 
    returns, 
    filteredReturns, 
    deleteReturn, 
    supplierReturns,
    filteredSupplierReturns,
    updateSupplierRefundStatus,
    deleteSupplierReturn,
    metrics, 
    timeFilter, 
    setTimeFilter 
  } = useStore();
  
  const { language, tr } = useLanguage();

  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer');
  const [searchTerm, setSearchTerm] = useState('');
  const [conditionFilter, setConditionFilter] = useState<'all' | 'Resellable' | 'Damaged_Waste'>('all');
  const [supplierStatusFilter, setSupplierStatusFilter] = useState<'all' | SupplierRefundStatus>('all');
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // Customer returns filter
  const displayedCustomerReturns = filteredReturns.filter(r => {
    const matchesSearch = 
      r.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.return_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.customer_name && r.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.invoice_no && r.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCondition = conditionFilter === 'all' || r.condition === conditionFilter;

    return matchesSearch && matchesCondition;
  });

  // Supplier returns filter
  const displayedSupplierReturns = filteredSupplierReturns.filter(r => {
    const matchesSearch = 
      r.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.return_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.batch_no && r.batch_no.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = supplierStatusFilter === 'all' || r.refund_status === supplierStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const resellableCount = filteredReturns.filter(r => r.condition === 'Resellable').length;
  const resellableValue = filteredReturns.filter(r => r.condition === 'Resellable').reduce((acc, r) => acc + r.refund_amount, 0);
  const wasteCount = filteredReturns.filter(r => r.condition === 'Damaged_Waste').length;
  const wasteValue = filteredReturns.filter(r => r.condition === 'Damaged_Waste').reduce((acc, r) => acc + r.refund_amount, 0);

  const handleDeleteCustomerReturn = async (id: string, returnNo: string) => {
    const msg = `Are you sure you want to delete return record '${returnNo}'?`;
    
    if (window.confirm(msg)) {
      await deleteReturn(id);
    }
  };

  const handleDeleteSupplierReturn = async (id: string, returnNo: string) => {
    const msg = `Delete supplier return record '${returnNo}'?`;
    
    if (window.confirm(msg)) {
      await deleteSupplierReturn(id);
    }
  };

  // Export Customer Returns
  const getCustomerReturnsPayload = () => {
    const isMr = language === 'mr';
    const isHi = language === 'hi';

    return {
      title: 'Customer Sales Returns Report',
      subtitle: 'Yogeshwari Dairy Farm & Products ERP',
      periodText: 'Customer Returns Ledger',
      language,
      kpis: [
        { label: 'Total Returns', value: `${filteredReturns.length} ${'Records'}`, color: 'purple' },
        { label: 'Total Refund Amount', value: `₹${(metrics.totalRefundAmount || 0).toLocaleString('en-IN')}`, color: 'rose' },
        { label: 'Restocked Goods', value: `${resellableCount} (${'items'} - ₹${resellableValue})`, color: 'emerald' },
        { label: 'Damaged / Waste', value: `${wasteCount} (${'items'} - ₹${wasteValue})`, color: 'amber' }
      ],
      table: {
        headers: ['Return No.', 'Date', 'Customer Name', 'Product', 'Quantity', 'Reason', 'Refund Mode', 'Amount (₹)'],
        alignments: ['left', 'center', 'left', 'left', 'center', 'left', 'center', 'right'] as ('left' | 'center' | 'left' | 'left' | 'center' | 'left' | 'center' | 'right')[],
        rows: filteredReturns.length > 0 ? filteredReturns.map(r => [
          r.return_no,
          r.return_date,
          r.customer_name || ('Counter Customer'),
          r.product_name,
          `${r.quantity} ${r.unit}`,
          r.reason,
          r.refund_mode === 'Cash' ? ('Cash') :
          (r.refund_mode as string) === 'Online_UPI' || (r.refund_mode as string) === 'UPI' ? 'Online UPI' :
          (r.refund_mode as string) === 'Udhar_Credit' ? ('Udhar Credit') :
          (r.refund_mode as string) === 'Credit_Note' ? ('Credit Note') :
          r.refund_mode === 'Replacement' ? ('Replacement') : r.refund_mode,
          `₹${r.refund_amount.toLocaleString('en-IN')}`
        ]) : [
          ['—', '—', 'No return records found', '—', '—', '—', '—', '₹0']
        ],
        summaryRow: [
          'Total',
          '',
          '',
          '',
          `${filteredReturns.length} ${'Records'}`,
          '',
          '',
          `₹${filteredReturns.reduce((acc, r) => acc + r.refund_amount, 0).toLocaleString('en-IN')}`
        ]
      },
      notes: 'Customer sales returns report. Resellable items have been restocked to inventory.'
    };
  };

  const handleViewCustomerPDF = () => {
    viewReportPDF(getCustomerReturnsPayload());
  };

  const handlePrintCustomerPDF = () => {
    printReport(getCustomerReturnsPayload());
  };

  const handleDownloadCustomerPDF = () => {
    downloadReportPDF(getCustomerReturnsPayload());
  };

  // Export Supplier Returns to PDF
  const getSupplierReturnsPayload = () => {
    const isMr = language === 'mr';
    const isHi = language === 'hi';

    return {
      title: 'Supplier Returns & Debit Notes Report',
      subtitle: 'Yogeshwari Dairy Farm & Products ERP',
      periodText: 'Supplier Returns Ledger',
      language,
      kpis: [
        { label: 'Total Returns', value: `${metrics.totalSupplierReturnsCount || 0} ${'Records'}`, color: 'amber' },
        { label: 'Total Refund Claim', value: `₹${(metrics.totalSupplierRefundAmount || 0).toLocaleString('en-IN')}`, color: 'blue' },
        { label: 'Refund Received', value: `₹${(metrics.totalSupplierRefundReceived || 0).toLocaleString('en-IN')}`, color: 'emerald' },
        { label: 'Pending Claim', value: `₹${(metrics.pendingSupplierRefundAmount || 0).toLocaleString('en-IN')}`, color: 'rose' }
      ],
      table: {
        headers: ['Debit Note No.', 'Date', 'Supplier Name', 'Product', 'Quantity', 'Reason', 'Refund Amount', 'Status'],
        alignments: ['left', 'center', 'left', 'left', 'center', 'left', 'right', 'center'] as ('left' | 'center' | 'left' | 'left' | 'center' | 'left' | 'right' | 'center')[],
        rows: displayedSupplierReturns.length > 0 ? displayedSupplierReturns.map(r => [
          r.return_no,
          r.return_date,
          r.supplier_name,
          r.product_name,
          `${r.quantity} ${r.unit}`,
          r.reason,
          `₹${r.total_refund_amount.toLocaleString('en-IN')}`,
          r.refund_status === 'Refund_Received' ? ('Refund Received') :
          r.refund_status === 'Adjusted_In_Next_Bill' ? ('Adjusted In Bill') :
          r.refund_status === 'Replacement_Received' ? ('Replacement Received') :
          ('Pending')
        ]) : [
          ['—', '—', 'No supplier returns found', '—', '—', '—', '₹0', '—']
        ],
        summaryRow: [
          'Total',
          '',
          '',
          '',
          `${displayedSupplierReturns.length} ${'Records'}`,
          '',
          `₹${displayedSupplierReturns.reduce((acc, r) => acc + r.total_refund_amount, 0).toLocaleString('en-IN')}`,
          ''
        ]
      },
      notes: 'Verify supplier debit note refund claim or adjustment in subsequent purchase bill.'
    };
  };

  const handleViewSupplierPDF = () => {
    viewReportPDF(getSupplierReturnsPayload());
  };

  const handlePrintSupplierPDF = () => {
    printReport(getSupplierReturnsPayload());
  };

  const handleDownloadSupplierPDF = () => {
    downloadReportPDF(getSupplierReturnsPayload());
  };

  return (
    <div className="space-y-2.5 sm:space-y-3 max-w-7xl mx-auto pb-28 lg:pb-8">
      {/* 1. Compact Header + More (⋮) Reports Sheet + Round Return CTA */}
      <CompactPageHeader
        title={'Returns & Refunds'}
        icon={<RotateCcw className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />}
        primaryAction={
          activeTab === 'customer'
            ? {
                label: 'Return',
                icon: <Plus className="w-4 h-4 stroke-[2.5]" />,
                onClick: onOpenReturnModal,
                ariaLabel: 'Add customer return'
              }
            : {
                label: 'Supplier',
                icon: <Truck className="w-4 h-4" />,
                onClick: () => setIsSupplierModalOpen(true),
                ariaLabel: 'Add supplier return'
              }
        }
        moreTitle={'Returns Reports'}
        moreActions={
          activeTab === 'customer'
            ? [
                {
                  id: 'view-pdf',
                  label: 'View Customer Returns PDF',
                  icon: <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
                  onClick: handleViewCustomerPDF
                },
                {
                  id: 'print',
                  label: 'Print Report',
                  icon: <Printer className="w-4 h-4 text-slate-500 dark:text-[#8FA69C]" />,
                  onClick: handlePrintCustomerPDF
                },
                {
                  id: 'download-pdf',
                  label: 'Download PDF',
                  icon: <Download className="w-4 h-4" />,
                  onClick: handleDownloadCustomerPDF,
                  tone: 'primary'
                }
              ]
            : [
                {
                  id: 'view-pdf',
                  label: 'View Supplier Returns PDF',
                  icon: <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
                  onClick: handleViewSupplierPDF
                },
                {
                  id: 'print',
                  label: 'Print Report',
                  icon: <Printer className="w-4 h-4 text-slate-500 dark:text-[#8FA69C]" />,
                  onClick: handlePrintSupplierPDF
                },
                {
                  id: 'download-pdf',
                  label: 'Download Debit Note PDF',
                  icon: <Download className="w-4 h-4" />,
                  onClick: handleDownloadSupplierPDF,
                  tone: 'primary'
                }
              ]
        }
      />

      {/* Main Tab Navigation: Customer Returns vs Supplier Returns */}
      <div className="flex border-b border-slate-200 dark:border-[#24352F] gap-1.5 sm:gap-2 pt-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('customer')}
          className={`pb-3 px-2 sm:px-3 text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 sm:gap-2 border-b-2 whitespace-nowrap shrink-0 ${
            activeTab === 'customer'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 dark:text-[#8FA69C] hover:text-slate-800'
          }`}
        >
          <RotateCcw className="w-4 h-4 shrink-0" />
          <span>
            {'1. Customer Returns'}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold shrink-0">
            {metrics.totalReturnsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('supplier')}
          className={`pb-3 px-2 sm:px-3 text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 sm:gap-2 border-b-2 whitespace-nowrap shrink-0 ${
            activeTab === 'supplier'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 dark:text-[#8FA69C] hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4 shrink-0" />
          <span>
            {'2. Supplier Returns'}
          </span>
          {metrics.pendingSupplierRefundAmount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-extrabold animate-pulse shrink-0">
              ₹{metrics.pendingSupplierRefundAmount.toFixed(0)} {'Due'}
            </span>
          )}
        </button>
      </div>

      {/* ================= TAB 1: CUSTOMER RETURNS ================= */}
      {activeTab === 'customer' && (
        <div className="space-y-4">
          
          {/* KPI Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-white dark:bg-[#131F1B] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-[#8FA69C]">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {'Total Customer Returns'}
                </span>
                <RotateCcw className="w-4 h-4 text-purple-600" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {metrics.totalReturnsCount}
                </span>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                  ₹{metrics.totalRefundAmount.toFixed(0)}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#131F1B] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-[#8FA69C]">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {"Today's Refund"}
                </span>
                <DollarSign className="w-4 h-4 text-rose-500" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
                  ₹{metrics.todayRefundAmount.toFixed(0)}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {'Paid today'}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#131F1B] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-[#8FA69C]">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {'Restocked'}
                </span>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {resellableCount}
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  ₹{resellableValue.toFixed(0)}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#131F1B] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-[#8FA69C]">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {'Damaged / Waste'}
                </span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                  {wasteCount}
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  ₹{wasteValue.toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white dark:bg-[#131F1B] p-3 rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={'Search product, return no., customer or bill...'}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-semibold text-slate-800 dark:text-[#E7F0EC]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={conditionFilter}
                onChange={e => setConditionFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-700 dark:text-[#E7F0EC]"
              >
                <option value="all">{'All Conditions'}</option>
                <option value="Resellable">{'Good Condition (Restocked)'}</option>
                <option value="Damaged_Waste">{'Damaged / Spoiled (Waste)'}</option>
              </select>

              <select
                value={timeFilter}
                onChange={e => setTimeFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-700 dark:text-[#E7F0EC]"
              >
                <option value="today">{'Today'}</option>
                <option value="week">{'This Week'}</option>
                <option value="month">{'This Month'}</option>
                <option value="all">{'All Time'}</option>
              </select>
            </div>
          </div>

          {/* Customer Returns Table / Cards */}
          {displayedCustomerReturns.length === 0 ? (
            <div className="bg-white dark:bg-[#131F1B] rounded-3xl p-8 sm:p-12 text-center border border-slate-200 dark:border-[#24352F] shadow-xs space-y-3">
              <div className="w-14 h-14 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                <RotateCcw className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                {'No customer return records found'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C] max-w-sm mx-auto">
                {'Click the button above to record a customer product return.'}
              </p>
              <button
                onClick={onOpenReturnModal}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition"
              >
                + {'Record Customer Return'}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#1A2A25] text-slate-500 dark:text-[#8FA69C] font-bold border-b border-slate-200 dark:border-[#24352F]">
                    <tr>
                      <th className="p-3.5">{'Return No.'}</th>
                      <th className="p-3.5">{'Date'}</th>
                      <th className="p-3.5">{'Product'}</th>
                      <th className="p-3.5">{'Qty'}</th>
                      <th className="p-3.5">{'Refund Amount'}</th>
                      <th className="p-3.5">{'Mode'}</th>
                      <th className="p-3.5">{'Condition'}</th>
                      <th className="p-3.5">{'Reason'}</th>
                      <th className="p-3.5 text-right">{'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1E2D27]">
                    {displayedCustomerReturns.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-[#182621] transition">
                        <td className="p-3.5 font-mono font-bold text-purple-600 dark:text-purple-400">
                          <span className="block">{r.return_no}</span>
                          {r.invoice_no && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                              🧾 #{r.invoice_no}
                            </span>
                          )}
                          {(r.return_type === 'Full' || r.notes?.includes('[Full Return]')) && (
                            <span className="block text-[9px] font-black text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/40 px-1.5 py-0.5 rounded mt-0.5 w-fit">
                              ⚡ {'Full Bill Return'}
                            </span>
                          )}
                          {(r.return_type === 'Partial' || r.notes?.includes('[Partial Return]')) && (
                            <span className="block text-[9px] font-black text-blue-700 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-950/40 px-1.5 py-0.5 rounded mt-0.5 w-fit">
                              ✂️ {'Partial Bill Return'}
                            </span>
                          )}
                          {(r.return_type === 'Direct' || r.notes?.includes('[Direct Return]')) && (
                            <span className="block text-[9px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded mt-0.5 w-fit">
                              📦 {'Direct Return'}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{r.return_date}</td>
                        <td className="p-3.5 font-bold text-slate-800 dark:text-white">
                          {r.product_name}
                          {r.customer_name && <span className="block text-[10px] text-slate-400 font-normal">{r.customer_name}</span>}
                        </td>
                        <td className="p-3.5 text-slate-700 dark:text-slate-200 font-semibold">{r.quantity} {r.unit}</td>
                        <td className="p-3.5 font-black text-slate-900 dark:text-white">₹{r.refund_amount.toFixed(2)}</td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A2A25] font-semibold text-[11px]">
                            {r.refund_mode === 'Cash'
                              ? 'Cash'
                              : (r.refund_mode as string) === 'Online_UPI' || (r.refund_mode as string) === 'UPI'
                              ? 'Online UPI'
                              : (r.refund_mode as string) === 'Udhar_Credit'
                              ? 'Udhar Credit'
                              : (r.refund_mode as string) === 'Credit_Note'
                              ? 'Credit Note'
                              : r.refund_mode === 'Replacement'
                              ? 'Replacement'
                              : r.refund_mode}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            r.condition === 'Resellable'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          }`}>
                            {r.condition === 'Resellable' 
                              ? '✅ Good (Restocked)'
                              : '⚠️ Damaged (Waste)'}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-[#8FA69C] text-[11px] max-w-[150px] truncate" title={r.reason}>{r.reason}</td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleDeleteCustomerReturn(r.id, r.return_no)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                            title={'Delete Return Record'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <LoadOlderHistoryButton entity="returns" />
        </div>
      )}

      {/* ================= TAB 2: SUPPLIER / PURCHASE RETURNS ================= */}
      {activeTab === 'supplier' && (
        <div className="space-y-4">
          
          {/* Supplier Return KPI Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-white dark:bg-[#131F1B] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-[#8FA69C]">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {'Supplier Returns'}
                </span>
                <Truck className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {metrics.totalSupplierReturnsCount || 0}
                </span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  ₹{(metrics.totalSupplierRefundAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#131F1B] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-[#8FA69C]">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {'Refund Received'}
                </span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  ₹{(metrics.totalSupplierRefundReceived || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                  {'Cash / Adjusted in bill'}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#131F1B] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-[#8FA69C]">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {'Pending From Supplier'}
                </span>
                <Clock className="w-4 h-4 text-rose-500" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
                  ₹{(metrics.pendingSupplierRefundAmount || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-semibold text-rose-500">
                  {'Deduct in next bill'}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#131F1B] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-[#8FA69C]">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {'Replacements Received'}
                </span>
                <RefreshCw className="w-4 h-4 text-purple-500" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
                  {metrics.supplierReplacementCount || 0}
                </span>
                <span className="text-[10px] font-semibold text-purple-500">
                  {'Packets replaced'}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Bar for Supplier Returns */}
          <div className="bg-white dark:bg-[#131F1B] p-3 rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={'Search supplier, product, batch or debit note...'}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-semibold text-slate-800 dark:text-[#E7F0EC]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={supplierStatusFilter}
                onChange={e => setSupplierStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-700 dark:text-[#E7F0EC]"
              >
                <option value="all">{'All Refund Statuses'}</option>
                <option value="Pending">{'⏳ Pending'}</option>
                <option value="Refund_Received">{'✅ Refund Received'}</option>
                <option value="Adjusted_In_Next_Bill">{'🧾 Adjusted in Bill'}</option>
                <option value="Replacement_Received">{'🔄 Replacement Received'}</option>
              </select>

              <select
                value={timeFilter}
                onChange={e => setTimeFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-700 dark:text-[#E7F0EC]"
              >
                <option value="today">{'Today'}</option>
                <option value="week">{'This Week'}</option>
                <option value="month">{'This Month'}</option>
                <option value="all">{'All Time'}</option>
              </select>
            </div>
          </div>

          {/* Supplier Returns List / Table */}
          {displayedSupplierReturns.length === 0 ? (
            <div className="bg-white dark:bg-[#131F1B] rounded-3xl p-8 sm:p-12 text-center border border-slate-200 dark:border-[#24352F] shadow-xs space-y-3">
              <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <Truck className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                {'No supplier return records found'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C] max-w-sm mx-auto">
                {'Click the button above to return damaged, leaked, or expired goods to the supplier.'}
              </p>
              <button
                onClick={() => setIsSupplierModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition"
              >
                + {'Return Stock to Supplier'}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#1A2A25] text-slate-500 dark:text-[#8FA69C] font-bold border-b border-slate-200 dark:border-[#24352F]">
                    <tr>
                      <th className="p-3.5">{'Debit Note No.'}</th>
                      <th className="p-3.5">{'Date'}</th>
                      <th className="p-3.5">{'Supplier'}</th>
                      <th className="p-3.5">{'Product'}</th>
                      <th className="p-3.5">{'Qty'}</th>
                      <th className="p-3.5">{'Refund Claim'}</th>
                      <th className="p-3.5">{'Reason'}</th>
                      <th className="p-3.5">{'Settlement Status'}</th>
                      <th className="p-3.5 text-right">{'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1E2D27]">
                    {displayedSupplierReturns.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-[#182621] transition">
                        <td className="p-3.5 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {r.return_no}
                          {r.batch_no && <span className="block text-[10px] text-slate-400 font-sans">{'Batch'}: {r.batch_no}</span>}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{r.return_date}</td>
                        <td className="p-3.5 font-bold text-slate-800 dark:text-white">
                          {r.supplier_name}
                        </td>
                        <td className="p-3.5 font-bold text-slate-800 dark:text-white">
                          {r.product_name}
                        </td>
                        <td className="p-3.5 text-slate-700 dark:text-slate-200 font-semibold">{r.quantity} {r.unit}</td>
                        <td className="p-3.5 font-black text-emerald-700 dark:text-emerald-400">
                          ₹{r.total_refund_amount.toLocaleString('en-IN')}
                          <span className="block text-[9px] text-slate-400 font-normal">@ ₹{r.purchase_price}/{r.unit}</span>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-[#8FA69C] text-[11px] max-w-[140px] truncate" title={r.reason}>
                          {r.reason}
                        </td>
                        <td className="p-3.5">
                          <div className="space-y-1">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              r.refund_status === 'Refund_Received'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : r.refund_status === 'Adjusted_In_Next_Bill'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                : r.refund_status === 'Replacement_Received'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse'
                            }`}>
                              {r.refund_status === 'Refund_Received'
                                ? '✅ Refund Received'
                                : r.refund_status === 'Adjusted_In_Next_Bill'
                                ? '🧾 Adjusted in Bill'
                                : r.refund_status === 'Replacement_Received'
                                ? '🔄 Replacement Received'
                                : '⏳ Pending (Due)'}
                            </span>

                            {/* Quick Action buttons for pending refunds */}
                            {r.refund_status === 'Pending' && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => updateSupplierRefundStatus(r.id, 'Refund_Received', 'Cash')}
                                  className="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[9px] font-bold border border-emerald-200"
                                  title={'Mark cash/UPI refund received'}
                                >
                                  + {'Refund'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateSupplierRefundStatus(r.id, 'Adjusted_In_Next_Bill', 'Credit_Deduction')}
                                  className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[9px] font-bold border border-blue-200"
                                  title={'Mark adjusted in bill'}
                                >
                                  + {'Bill Adjust'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateSupplierRefundStatus(r.id, 'Replacement_Received', 'Replacement')}
                                  className="px-1.5 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 text-[9px] font-bold border border-purple-200"
                                  title={'Mark replacement received'}
                                >
                                  + {'Replaced'}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleDeleteSupplierReturn(r.id, r.return_no)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                            title={'Delete Supplier Return Record'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <LoadOlderHistoryButton entity="supplierReturns" />
        </div>
      )}

      {/* Supplier Return Modal */}
      {isSupplierModalOpen && (
        <SupplierReturnModal
          onClose={() => setIsSupplierModalOpen(false)}
        />
      )}

    </div>
  );
};
