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
  BadgeAlert
} from 'lucide-react';
import { exportReportToPDF, printReport, downloadReportPDF } from '../../lib/exportUtils';
import { SupplierReturnModal } from './SupplierReturnModal';
import { SupplierReturn, SupplierRefundStatus } from '../../types';

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
  
  const { language } = useLanguage();

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
    const msg = language === 'mr' 
      ? `ग्राहक परतावा नोंद '${returnNo}' नक्की हटवायची आहे का?` 
      : language === 'hi' 
      ? `क्या आप वास्तव में वापसी प्रविष्टि '${returnNo}' हटाना चाहते हैं?` 
      : `Are you sure you want to delete return record '${returnNo}'?`;
    
    if (window.confirm(msg)) {
      await deleteReturn(id);
    }
  };

  const handleDeleteSupplierReturn = async (id: string, returnNo: string) => {
    const msg = language === 'mr' 
      ? `सप्लायर परतावा नोंद '${returnNo}' हटवायची आहे का? (उत्पादनाचा साठा पुन्हा पूर्ववत होईल)` 
      : language === 'hi' 
      ? `क्या आप सप्लायर वापसी '${returnNo}' हटाना चाहते हैं?` 
      : `Delete supplier return record '${returnNo}'?`;
    
    if (window.confirm(msg)) {
      await deleteSupplierReturn(id);
    }
  };

  // Export Customer Returns
  const getCustomerReturnsPayload = () => ({
    title: language === 'mr' ? 'ग्राहक माल परतावा अहवाल (Customer Returns)' : 'ग्राहक माल वापसी रिपोर्ट (Customer Returns)',
    subtitle: 'Yogeshwari Dairy Farm & Sweets ERP — Sales Returns Ledger',
    periodText: language === 'mr' ? 'कालावधी ग्राहक परतावा हिशोब' : 'अवधि ग्राहक वापसी हिसाब',
    kpis: [
      { label: 'एकूण ग्राहक परतावे', value: `${filteredReturns.length} नोंदी`, color: 'purple' },
      { label: 'एकूण रिफंड रक्कम', value: `₹${(metrics.totalRefundAmount || 0).toLocaleString('en-IN')}`, color: 'rose' },
      { label: 'पुन्हा विक्रीयोग्य माल', value: `${resellableCount} नोंदी (₹${resellableValue})`, color: 'emerald' },
      { label: 'खराब / नासलेला माल', value: `${wasteCount} नोंदी (₹${wasteValue})`, color: 'amber' }
    ],
    table: {
      headers: ['परतावा क्र.', 'तारीख', 'ग्राहक नाव', 'उत्पादन', 'प्रमाण', 'कारण', 'रिफंड पद्धत', 'रक्कम (₹)'],
      alignments: ['left', 'center', 'left', 'left', 'center', 'left', 'center', 'right'] as ('left' | 'center' | 'right')[],
      rows: filteredReturns.length > 0 ? filteredReturns.map(r => [
        r.return_no,
        r.return_date,
        r.customer_name || 'Counter Customer',
        r.product_name,
        `${r.quantity} ${r.unit}`,
        r.reason,
        r.refund_mode,
        `₹${r.refund_amount.toLocaleString('en-IN')}`
      ]) : [
        ['—', '—', 'कोणतीही परतावा नोंद नाही', '—', '—', '—', '—', '₹0']
      ],
      summaryRow: [
        'एकूण (Total)',
        '',
        '',
        '',
        `${filteredReturns.length} नोंदी`,
        '',
        '',
        `₹${filteredReturns.reduce((acc, r) => acc + r.refund_amount, 0).toLocaleString('en-IN')}`
      ]
    },
    notes: 'ग्राहक परतावा अहवाल. पुन्हा विक्रीयोग्य माल इन्व्हेंटरीमध्ये जोडला गेला आहे.'
  });

  const handlePrintCustomerPDF = () => {
    printReport(getCustomerReturnsPayload());
  };

  const handleDownloadCustomerPDF = () => {
    downloadReportPDF(getCustomerReturnsPayload());
  };

  // Export Supplier Returns to PDF
  const getSupplierReturnsPayload = () => ({
    title: language === 'mr' ? 'सप्लायर माल परतावा व डेबिट नोट अहवाल' : 'सप्लायर माल वापसी व डेबिट नोट रिपोर्ट',
    subtitle: 'Yogeshwari Dairy Farm & Sweets ERP — Vendor Return & Refund Statement',
    periodText: language === 'mr' ? 'कालावधी सप्लायर परतावा हिशोब' : 'अवधि सप्लायर वापसी हिसाब',
    kpis: [
      { label: 'एकूण सप्लायर परतावे', value: `${metrics.totalSupplierReturnsCount || 0} नोंदी`, color: 'amber' },
      { label: 'एकूण रिफंड दावा (Claim)', value: `₹${(metrics.totalSupplierRefundAmount || 0).toLocaleString('en-IN')}`, color: 'blue' },
      { label: 'रिफंड वसूल / जमा', value: `₹${(metrics.totalSupplierRefundReceived || 0).toLocaleString('en-IN')}`, color: 'emerald' },
      { label: 'सप्लायरकडे येणे बाकी (Due)', value: `₹${(metrics.pendingSupplierRefundAmount || 0).toLocaleString('en-IN')}`, color: 'rose' }
    ],
    table: {
      headers: ['डेबिट नोट क्र.', 'तारीख', 'सप्लायर नाव', 'उत्पादन', 'नग/प्रमाण', 'कारण', 'रिफंड रक्कम', 'स्थिती'],
      alignments: ['left', 'center', 'left', 'left', 'center', 'left', 'right', 'center'] as ('left' | 'center' | 'right')[],
      rows: displayedSupplierReturns.length > 0 ? displayedSupplierReturns.map(r => [
        r.return_no,
        r.return_date,
        r.supplier_name,
        r.product_name,
        `${r.quantity} ${r.unit}`,
        r.reason,
        `₹${r.total_refund_amount.toLocaleString('en-IN')}`,
        r.refund_status === 'Refund_Received' ? 'रिफंड जमा' :
        r.refund_status === 'Adjusted_In_Next_Bill' ? 'बिलात वजावट' :
        r.refund_status === 'Replacement_Received' ? 'माल बदलून मिळाला' : 'येणे बाकी (Pending)'
      ]) : [
        ['—', '—', 'कोणतीही सप्लायर परतावा नोंद नाही', '—', '—', '—', '₹0', '—']
      ],
      summaryRow: [
        'एकूण (Total)',
        '',
        '',
        '',
        `${displayedSupplierReturns.length} नोंदी`,
        '',
        `₹${displayedSupplierReturns.reduce((acc, r) => acc + r.total_refund_amount, 0).toLocaleString('en-IN')}`,
        ''
      ]
    },
    notes: 'सप्लायरकडून खराब/कालबाह्य मालाचा रिफंड किंवा पुढील खरेदी बिलातून वजावट तपासून घ्यावी.'
  });

  const handlePrintSupplierPDF = () => {
    printReport(getSupplierReturnsPayload());
  };

  const handleDownloadSupplierPDF = () => {
    downloadReportPDF(getSupplierReturnsPayload());
  };

  return (
    <div className="space-y-4 pb-20 sm:pb-6">
      
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#E7F0EC] flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <span>{language === 'mr' ? 'माल परतावा व रिफंड व्यवस्थापन' : language === 'hi' ? 'सामान वापसी व रिफंड प्रबंधन' : 'Return & Refund Management'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8FA69C] mt-0.5">
            {language === 'mr' 
              ? 'ग्राहकांचा परतावा आणि सप्लायरला खराब/एक्सपायर्ड माल परत पाठवण्याचा संपूर्ण हिशोब' 
              : 'ग्राहकों का रिटर्न और सप्लायर को खराब/एक्सपायर्ड माल लौटाने का पूरा हिसाब'}
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'customer' ? (
            <>
              <button
                type="button"
                onClick={handlePrintCustomerPDF}
                className="px-3 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-slate-700 dark:text-[#E7F0EC] font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                title="Print Customer Returns Report"
              >
                <Printer className="w-4 h-4 text-purple-600" />
                <span className="hidden sm:inline">{language === 'mr' ? 'प्रिंट' : 'प्रिंट'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCustomerPDF}
                className="px-3 py-2.5 rounded-2xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800/60 text-purple-900 dark:text-purple-300 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                title="Download Customer Returns PDF"
              >
                <Download className="w-4 h-4 text-purple-600" />
                <span className="hidden sm:inline">{language === 'mr' ? 'परतावा PDF' : 'वापसी PDF'}</span>
              </button>

              <button
                onClick={onOpenReturnModal}
                className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'mr' ? 'ग्राहक परतावा नोंदवा' : language === 'hi' ? 'ग्राहक वापसी दर्ज करें' : 'Record Customer Return'}</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handlePrintSupplierPDF}
                className="px-3 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-slate-700 dark:text-[#E7F0EC] font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                title="Print Supplier Returns Report"
              >
                <Printer className="w-4 h-4 text-amber-600" />
                <span className="hidden sm:inline">{language === 'mr' ? 'प्रिंट' : 'प्रिंट'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSupplierPDF}
                className="px-3 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                title="Download Supplier Return Report"
              >
                <Download className="w-4 h-4 text-amber-600" />
                <span className="hidden sm:inline">{language === 'mr' ? 'डेबिट नोट PDF' : 'डेबिट नोट PDF'}</span>
              </button>

              <button
                onClick={() => setIsSupplierModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 active:scale-95 shrink-0"
              >
                <Truck className="w-4 h-4" />
                <span>{language === 'mr' ? '+ सप्लायरला माल परत करा' : '+ सप्लायर को माल वापस करें'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Tab Navigation: Customer Returns vs Supplier Returns */}
      <div className="flex border-b border-slate-200 dark:border-[#24352F] gap-2 pt-1">
        <button
          type="button"
          onClick={() => setActiveTab('customer')}
          className={`pb-3 px-3 text-xs sm:text-sm font-black transition-all flex items-center gap-2 border-b-2 ${
            activeTab === 'customer'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 dark:text-[#8FA69C] hover:text-slate-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>{language === 'mr' ? '१. ग्राहक माल परतावा (Customer Returns)' : language === 'hi' ? '१. ग्राहक माल वापसी (Customer Returns)' : '1. Customer Returns'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
            {metrics.totalReturnsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('supplier')}
          className={`pb-3 px-3 text-xs sm:text-sm font-black transition-all flex items-center gap-2 border-b-2 ${
            activeTab === 'supplier'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 dark:text-[#8FA69C] hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>{language === 'mr' ? '२. सप्लायर / खरेदी परतावा (Supplier Returns)' : language === 'hi' ? '२. सप्लायर / खरीद वापसी (Supplier Returns)' : '2. Supplier Returns'}</span>
          {metrics.pendingSupplierRefundAmount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-extrabold animate-pulse">
              ₹{metrics.pendingSupplierRefundAmount.toFixed(0)} येणे बाकी
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
                  {language === 'mr' ? 'एकूण ग्राहक परतावे' : 'कुल ग्राहक वापसी'}
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
                  {language === 'mr' ? 'आजचा ग्राहक रिफंड' : 'आज का रिफंड'}
                </span>
                <DollarSign className="w-4 h-4 text-rose-500" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
                  ₹{metrics.todayRefundAmount.toFixed(0)}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {language === 'mr' ? 'आज अदा केला' : 'आज दिया'}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#131F1B] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-[#8FA69C]">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {language === 'mr' ? 'पुन्हा स्टॉकमध्ये' : 'पुनः स्टॉक में'}
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
                  {language === 'mr' ? 'खराब / नुकसान' : 'खराब / नुकसान'}
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
                placeholder={language === 'mr' ? 'उत्पादन, पावती क्र., ग्राहक किंवा बिल शोधा...' : 'उत्पाद, रसीद सं., ग्राहक खोजें...'}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-semibold text-slate-800 dark:text-[#E7F0EC]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={conditionFilter}
                onChange={e => setConditionFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-700 dark:text-[#E7F0EC]"
              >
                <option value="all">{language === 'mr' ? 'सर्व स्थिती' : 'सभी स्थितियां'}</option>
                <option value="Resellable">{language === 'mr' ? 'चांगला माल (स्टॉक)' : 'अच्छा माल (स्टॉक)'}</option>
                <option value="Damaged_Waste">{language === 'mr' ? 'खराब / नासलेला (नुकसान)' : 'खराब (नुकसान)'}</option>
              </select>

              <select
                value={timeFilter}
                onChange={e => setTimeFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-700 dark:text-[#E7F0EC]"
              >
                <option value="today">{language === 'mr' ? 'आज' : 'आज'}</option>
                <option value="week">{language === 'mr' ? 'या आठवड्यात' : 'इस सप्ताह'}</option>
                <option value="month">{language === 'mr' ? 'या महिन्यात' : 'इस माह'}</option>
                <option value="all">{language === 'mr' ? 'सर्व' : 'सभी'}</option>
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
                {language === 'mr' ? 'कोणतीही ग्राहक परतावा नोंद आढळली नाही' : 'कोई ग्राहक वापसी प्रविष्टि नहीं मिली'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C] max-w-sm mx-auto">
                {language === 'mr' ? 'ग्राहकाने परत केलेल्या मालाची नोंद करण्यासाठी वरील बटणावर क्लिक करा.' : 'ग्राहक द्वारा वापस किए गए सामान को दर्ज करने के लिए ऊपर दिए गए बटन पर क्लिक करें।'}
              </p>
              <button
                onClick={onOpenReturnModal}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition"
              >
                + {language === 'mr' ? 'ग्राहक परतावा नोंदवा' : 'ग्राहक वापसी दर्ज करें'}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#1A2A25] text-slate-500 dark:text-[#8FA69C] font-bold border-b border-slate-200 dark:border-[#24352F]">
                    <tr>
                      <th className="p-3.5">{language === 'mr' ? 'परतावा क्र.' : 'रसीद सं.'}</th>
                      <th className="p-3.5">{language === 'mr' ? 'तारीख' : 'दिनांक'}</th>
                      <th className="p-3.5">{language === 'mr' ? 'उत्पादन' : 'उत्पाद'}</th>
                      <th className="p-3.5">{language === 'mr' ? 'प्रमाण' : 'मात्रा'}</th>
                      <th className="p-3.5">{language === 'mr' ? 'रिफंड रक्कम' : 'रिफंड'}</th>
                      <th className="p-3.5">{language === 'mr' ? 'पद्धत' : 'माध्यम'}</th>
                      <th className="p-3.5">{language === 'mr' ? 'स्थिती' : 'स्थिति'}</th>
                      <th className="p-3.5">{language === 'mr' ? 'कारण' : 'कारण'}</th>
                      <th className="p-3.5 text-right">{language === 'mr' ? 'कृती' : 'कार्रवाई'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1E2D27]">
                    {displayedCustomerReturns.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-[#182621] transition">
                        <td className="p-3.5 font-mono font-bold text-purple-600 dark:text-purple-400">
                          {r.return_no}
                          {r.invoice_no && <span className="block text-[10px] text-slate-400 font-sans">{r.invoice_no}</span>}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{r.return_date}</td>
                        <td className="p-3.5 font-bold text-slate-800 dark:text-white">
                          {r.product_name}
                          {r.customer_name && <span className="block text-[10px] text-slate-400 font-normal">{r.customer_name}</span>}
                        </td>
                        <td className="p-3.5 text-slate-700 dark:text-slate-200 font-semibold">{r.quantity} {r.unit}</td>
                        <td className="p-3.5 font-black text-slate-900 dark:text-white">₹{r.refund_amount.toFixed(2)}</td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A2A25] font-semibold text-[11px]">{r.refund_mode}</span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            r.condition === 'Resellable'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          }`}>
                            {r.condition === 'Resellable' 
                              ? (language === 'mr' ? '✅ चांगला (स्टॉक)' : '✅ अच्छा (स्टॉक)')
                              : (language === 'mr' ? '⚠️ खराब (नुकसान)' : '⚠️ खराब (नुकसान)')}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-[#8FA69C] text-[11px] max-w-[150px] truncate" title={r.reason}>{r.reason}</td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleDeleteCustomerReturn(r.id, r.return_no)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                            title="Delete Return Record"
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
                  {language === 'mr' ? 'सप्लायर परतावे' : 'सप्लायर वापसी'}
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
                  {language === 'mr' ? 'रिफंड वसूल / जमा' : 'रिफंड प्राप्त'}
                </span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  ₹{(metrics.totalSupplierRefundReceived || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                  {language === 'mr' ? 'रोख / बिलात जमा' : 'रोकड़ / बिल में'}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#131F1B] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-[#8FA69C]">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {language === 'mr' ? 'सप्लायरकडे येणे बाकी' : 'सप्लायर से बाकी'}
                </span>
                <Clock className="w-4 h-4 text-rose-500" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
                  ₹{(metrics.pendingSupplierRefundAmount || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-semibold text-rose-500">
                  {language === 'mr' ? 'पुढील बिलात वजा करा' : 'अगले बिल से काटें'}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-[#131F1B] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-[#8FA69C]">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {language === 'mr' ? 'बदल्यात नवीन माल' : 'बदले में नया माल'}
                </span>
                <RefreshCw className="w-4 h-4 text-purple-500" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
                  {metrics.supplierReplacementCount || 0}
                </span>
                <span className="text-[10px] font-semibold text-purple-500">
                  {language === 'mr' ? 'पाकिटे बदलून मिळाली' : 'पैकेट बदले गए'}
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
                placeholder={language === 'mr' ? 'सप्लायर, उत्पादन, बॅच किंवा डेबिट नोट शोधा...' : 'सप्लायर, उत्पाद, बैच खोजें...'}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-semibold text-slate-800 dark:text-[#E7F0EC]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={supplierStatusFilter}
                onChange={e => setSupplierStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-700 dark:text-[#E7F0EC]"
              >
                <option value="all">{language === 'mr' ? 'सर्व रिफंड स्थिती' : 'सभी स्थितियां'}</option>
                <option value="Pending">{language === 'mr' ? '⏳ येणे बाकी (Pending)' : '⏳ बाकी (Pending)'}</option>
                <option value="Refund_Received">{language === 'mr' ? '✅ रिफंड मिळाला' : '✅ रिफंड प्राप्त'}</option>
                <option value="Adjusted_In_Next_Bill">{language === 'mr' ? '🧾 बिलात वजावट' : '🧾 बिल में कटौती'}</option>
                <option value="Replacement_Received">{language === 'mr' ? '🔄 बदलून नवीन माल' : '🔄 बदले में नया माल'}</option>
              </select>

              <select
                value={timeFilter}
                onChange={e => setTimeFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-700 dark:text-[#E7F0EC]"
              >
                <option value="today">{language === 'mr' ? 'आज' : 'आज'}</option>
                <option value="week">{language === 'mr' ? 'या आठवड्यात' : 'इस सप्ताह'}</option>
                <option value="month">{language === 'mr' ? 'या महिन्यात' : 'इस माह'}</option>
                <option value="all">{language === 'mr' ? 'सर्व' : 'सभी'}</option>
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
                {language === 'mr' ? 'कोणतीही सप्लायर परतावा नोंद नाही' : 'कोई सप्लायर वापसी प्रविष्टि नहीं मिली'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C] max-w-sm mx-auto">
                {language === 'mr' 
                  ? 'दुकानात आलेला खराब, लिक किंवा एक्सपायर्ड माल सप्लायरला परत पाठवण्यासाठी वरील बटणावर क्लिक करा.' 
                  : 'दुकान में आया खराब, लीक या एक्सपायर माल सप्लायर को लौटाने के लिए ऊपर दिए गए बटन पर क्लिक करें।'}
              </p>
              <button
                onClick={() => setIsSupplierModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition"
              >
                + {language === 'mr' ? 'सप्लायरला माल परत करा' : 'सप्लायर को माल वापस करें'}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#1A2A25] text-slate-500 dark:text-[#8FA69C] font-bold border-b border-slate-200 dark:border-[#24352F]">
                    <tr>
                      <th className="p-3.5">{language === 'mr' ? 'डेबिट नोट क्र.' : 'डेबिट नोट सं.'}</th>
                      <th className="p-3.5">{language === 'mr' ? 'तारीख' : 'दिनांक'}</th>
                      <th className="p-3.5">{language === 'mr' ? 'सप्लायर नाव' : 'सप्लायर'}</th>
                      <th className="p-3.5">{language === 'mr' ? 'उत्पादन' : 'उत्पाद'}</th>
                      <th className="p-3.5">{language === 'mr' ? 'प्रमाण' : 'मात्रा'}</th>
                      <th className="p-3.5">{language === 'mr' ? 'रिफंड दावा' : 'रिफंड दावा'}</th>
                      <th className="p-3.5">{language === 'mr' ? 'कारण' : 'कारण'}</th>
                      <th className="p-3.5">{language === 'mr' ? 'रिफंड तोडगा स्थिती' : 'रिफंड स्थिति'}</th>
                      <th className="p-3.5 text-right">{language === 'mr' ? 'कृती' : 'कार्रवाई'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1E2D27]">
                    {displayedSupplierReturns.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-[#182621] transition">
                        <td className="p-3.5 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {r.return_no}
                          {r.batch_no && <span className="block text-[10px] text-slate-400 font-sans">बॅच: {r.batch_no}</span>}
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
                              {r.refund_status === 'Refund_Received' ? '✅ रिफंड जमा' :
                               r.refund_status === 'Adjusted_In_Next_Bill' ? '🧾 बिलात वजावट' :
                               r.refund_status === 'Replacement_Received' ? '🔄 बदलून नवीन माल' : '⏳ येणे बाकी (Due)'}
                            </span>

                            {/* Quick Action buttons for pending refunds */}
                            {r.refund_status === 'Pending' && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => updateSupplierRefundStatus(r.id, 'Refund_Received', 'Cash')}
                                  className="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[9px] font-bold border border-emerald-200"
                                  title="Mark cash/UPI refund received"
                                >
                                  + रिफंड
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateSupplierRefundStatus(r.id, 'Adjusted_In_Next_Bill', 'Credit_Deduction')}
                                  className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[9px] font-bold border border-blue-200"
                                  title="Mark adjusted in bill"
                                >
                                  + बिलात वजा
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateSupplierRefundStatus(r.id, 'Replacement_Received', 'Replacement')}
                                  className="px-1.5 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 text-[9px] font-bold border border-purple-200"
                                  title="Mark replacement received"
                                >
                                  + नवीन माल
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleDeleteSupplierReturn(r.id, r.return_no)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                            title="Delete Supplier Return Record"
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
