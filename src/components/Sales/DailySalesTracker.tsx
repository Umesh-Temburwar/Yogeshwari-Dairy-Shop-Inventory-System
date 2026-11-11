import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { PeriodFilter } from '../Dashboard/PeriodFilter';
import { Sale } from '../../types';
import { exportReportToPDF, printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import { 
  ReceiptIndianRupee, 
  Search, 
  Printer, 
  FileText,
  Download,
  Banknote, 
  Smartphone, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  X,
  RotateCcw
} from 'lucide-react';
import { ReturnProductModal } from '../Returns/ReturnProductModal';

export const DailySalesTracker: React.FC = () => {
  const { filteredSales, metrics, setActiveView } = useStore();
  const { t, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('All');
  const [selectedGender, setSelectedGender] = useState<string>('All');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('All');
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [returnTarget, setReturnTarget] = useState<{ productId?: string; invoiceNo?: string; customerName?: string; customerPhone?: string } | null>(null);
  const [selectedSaleForView, setSelectedSaleForView] = useState<Sale | null>(null);

  const paymentModes = [
    { id: 'All', label: language === 'mr' ? 'सर्व पेमेंट' : language === 'hi' ? 'सभी भुगतान' : 'All Modes' },
    { id: 'Cash', label: t('cash') },
    { id: 'Online_UPI', label: t('onlineUpi') },
    { id: 'Split', label: t('splitPay') },
    { id: 'Udhar', label: t('udharPay') }
  ];

  const genderOptions = [
    { id: 'All', label: language === 'mr' ? 'सर्व लिंग' : language === 'hi' ? 'सभी जेंडर' : 'All Genders' },
    { id: 'Male', label: language === 'mr' ? '👨 पुरुष' : language === 'hi' ? '👨 पुरुष' : '👨 Male' },
    { id: 'Female', label: language === 'mr' ? '👩 महिला' : language === 'hi' ? '👩 महिला' : '👩 Female' },
    { id: 'Other', label: language === 'mr' ? '🧑 इतर' : language === 'hi' ? '🧑 अन्य' : '🧑 Other' }
  ];

  const ageGroupOptions = [
    { id: 'All', label: language === 'mr' ? 'सर्व वय' : language === 'hi' ? 'सभी आयु' : 'All Ages' },
    { id: 'Kids/Teens (<18)', label: '<18' },
    { id: 'Youth (18-25)', label: '18-25' },
    { id: 'Adults (26-45)', label: '26-45' },
    { id: 'Seniors (45+)', label: '45+' }
  ];

  const filtered = filteredSales.filter(sale => {
    const matchesSearch = sale.invoice_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sale.customer_phone && sale.customer_phone.includes(searchQuery));

    const matchesMode = selectedPaymentMode === 'All' || sale.payment_mode === selectedPaymentMode;
    const matchesGender = selectedGender === 'All' || sale.customer_gender === selectedGender;
    const matchesAgeGroup = selectedAgeGroup === 'All' || sale.customer_age_group === selectedAgeGroup;

    return matchesSearch && matchesMode && matchesGender && matchesAgeGroup;
  });

  const toggleExpand = (id: string) => {
    setExpandedSaleId(prev => prev === id ? null : id);
  };

  const getSalesPDFPayload = () => ({
    title: language === 'mr' ? 'दैनिक विक्री व रोकड लेजर अहवाल' : language === 'hi' ? 'दैनिक बिक्री & रोकड़ रिपोर्ट' : 'Daily Sales & Cash/Online Ledger Report',
    subtitle: 'Yogeshwari Dairy Farm & Sweets ERP',
    periodText: language === 'mr' ? 'निवडलेला कालावधी हिशोब' : 'चुनी गई अवधि का हिसाब',
    kpis: [
      { label: 'एकूण विक्री (Total Sales)', value: `₹${(metrics.totalSalesRevenue || 0).toLocaleString('en-IN')}`, color: 'emerald' },
      { label: 'रोख जमा (Cash)', value: `₹${(metrics.cashCollected || 0).toLocaleString('en-IN')}`, color: 'blue' },
      { label: 'ऑनलाईन UPI', value: `₹${(metrics.onlineCollected || 0).toLocaleString('en-IN')}`, color: 'purple' },
      { label: 'उधारी दिली (Udhar)', value: `₹${(metrics.udharGiven || 0).toLocaleString('en-IN')}`, color: 'amber' }
    ],
    table: {
      headers: ['बिल क्र.', 'तारीख', 'ग्राहक नाव', 'पेमेंट पद्धत', 'आयटम्स', 'सवलत (₹)', 'एकूण रक्कम (₹)'],
      alignments: ['left', 'center', 'left', 'center', 'left', 'right', 'right'] as ('left' | 'center' | 'right')[],
      rows: filtered.length > 0 ? filtered.map(s => [
        s.invoice_no,
        s.sale_date,
        s.customer_name + (s.customer_phone ? ` (${s.customer_phone})` : ''),
        s.payment_mode,
        s.items ? s.items.map(i => `${i.product_name} x ${i.quantity}`).join(', ') : '—',
        s.discount > 0 ? `₹${s.discount}` : '₹0',
        `₹${s.net_amount.toLocaleString('en-IN')}`
      ]) : [
        ['—', '—', language === 'mr' ? 'या निवडलेल्या कालावधीत कोणतीही विक्री नोंद नाही' : 'इस अवधि में कोई बिक्री दर्ज नहीं', '—', '—', '—', '₹0']
      ],
      summaryRow: [
        'एकूण (Total)',
        `${filtered.length} बिले`,
        '',
        '',
        '',
        '',
        `₹${(metrics.totalSalesRevenue || 0).toLocaleString('en-IN')}`
      ]
    },
    notes: 'संगणकीय तयार केलेला अधिकृत विक्री अहवाल. रोकड व ऑनलाईन पावती तपासून घ्यावी.'
  });

  const handleViewSalesPDF = () => {
    viewReportPDF(getSalesPDFPayload());
  };

  const handlePrintSalesPDF = () => {
    printReport(getSalesPDFPayload());
  };

  const handleDownloadSalesPDF = () => {
    downloadReportPDF(getSalesPDFPayload());
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131F1B] p-5 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs transition-colors">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ReceiptIndianRupee className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>
              {language === 'mr' ? 'दैनिक विक्री व रोख-ऑनलाईन लेजर (Daily Sales History)' : language === 'hi' ? 'दैनिक बिक्री & रोकड़-ऑनलाइन लेजर (Daily Sales History)' : 'Daily Sales & Cash/Online Ledger'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium mt-0.5">
            {language === 'mr' 
              ? 'किती माल गेला, काय गेला, रोख किती आली आणि ऑनलाईन UPI किती आले याचा हिशोब' 
              : language === 'hi'
              ? 'कितना माल बिका, क्या बिका, कैश कितना आया और ऑनलाइन UPI कितना आया'
              : 'Detailed tracking of items sold, cash inflow, and online UPI collections'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleViewSalesPDF}
            className="flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2621] hover:bg-slate-200 dark:hover:bg-[#24352F] text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 text-xs font-bold transition-all shadow-xs active:scale-95"
            title={language === 'mr' ? 'अहवाल पहा (View PDF)' : language === 'hi' ? 'रिपोर्ट देखें (View PDF)' : 'View Sales PDF'}
          >
            <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'mr' ? 'पहा (View)' : language === 'hi' ? 'देखें (View)' : 'View'}</span>
          </button>

          <button
            onClick={handlePrintSalesPDF}
            className="flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
            title={language === 'mr' ? 'अहवाल थेट प्रिंट करा' : language === 'hi' ? 'रिपोर्ट प्रिंट करें' : 'Print Sales Report'}
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>{language === 'mr' ? 'प्रिंट' : language === 'hi' ? 'प्रिंट' : 'Print'}</span>
          </button>

          <button
            onClick={handleDownloadSalesPDF}
            className="flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
            title={language === 'mr' ? 'अहवाल PDF फाईल डाउनलोड करा' : language === 'hi' ? 'रिपोर्ट PDF डाउनलोड करें' : 'Download Sales PDF'}
          >
            <Download className="w-4 h-4" />
            <span>{language === 'mr' ? 'डाउनलोड PDF' : language === 'hi' ? 'डाउनलोड PDF' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* Time Filter */}
      <PeriodFilter />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs transition-colors">
          <span className="text-xs font-semibold text-slate-500 dark:text-[#8FA69C] block">
            {t('totalSales')}
          </span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
            ₹{metrics.totalSalesRevenue.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-[#8FA69C] font-medium">
            {filtered.length} {language === 'mr' ? 'बिले फाडली' : language === 'hi' ? 'बिल काटे गए' : 'invoices billed'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs transition-colors">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
            <Banknote className="w-4 h-4" />
            <span>{t('cashCollected')}</span>
          </div>
          <span className="text-2xl font-black text-blue-900 dark:text-blue-200 mt-1 block">
            ₹{metrics.cashCollected.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
            {language === 'mr' ? 'गल्ल्यातील रोख रक्कम' : language === 'hi' ? 'रोकड़ गल्ला कलेक्शन' : 'Cash Drawer Inflow'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs transition-colors">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-400">
            <Smartphone className="w-4 h-4" />
            <span>{t('onlineCollected')}</span>
          </div>
          <span className="text-2xl font-black text-purple-900 dark:text-purple-200 mt-1 block">
            ₹{metrics.onlineCollected.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
            PhonePe, GPay, Paytm
          </span>
        </div>

        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs transition-colors">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 dark:text-amber-400">
            <BookOpen className="w-4 h-4" />
            <span>{language === 'mr' ? 'उधार माल दिला (Credit)' : language === 'hi' ? 'उधार दिया (Credit)' : 'Credit Given'}</span>
          </div>
          <span className="text-2xl font-black text-orange-900 dark:text-amber-200 mt-1 block">
            ₹{metrics.udharGiven.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-orange-600 dark:text-amber-400 font-medium">
            {language === 'mr' ? 'खात्यावर नोंदवलेली उधारी' : language === 'hi' ? 'खाते में दर्ज उधारी' : 'Recorded in Khata'}
          </span>
        </div>
      </div>

      {/* Search & Mode + Demographic Filters */}
      <div className="bg-white dark:bg-[#131F1B] p-3.5 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8FA69C]" />
            <input
              type="text"
              placeholder={language === 'mr' ? 'बिल क्रमांक, ग्राहक नाव किंवा मोबाईल नंबर शोधा...' : language === 'hi' ? 'बिल नंबर, ग्राहक नाम या फोन नंबर से खोजें...' : 'Search invoice no, customer name or phone...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#1A2A25] p-1 rounded-xl shrink-0 overflow-x-auto">
            {paymentModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSelectedPaymentMode(mode.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedPaymentMode === mode.id
                    ? 'bg-white dark:bg-[#131F1B] text-emerald-800 dark:text-emerald-400 shadow-xs font-bold border dark:border-[#24352F]'
                    : 'text-slate-600 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Demographic Filter Chips (Gender & Age Group) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-[#24352F]">
          <span className="text-[10px] font-bold text-slate-400 dark:text-[#8FA69C] uppercase tracking-wider">
            {t('customerGender')}:
          </span>
          <div className="flex items-center gap-1">
            {genderOptions.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGender(g.id)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all ${
                  selectedGender === g.id
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C] hover:bg-slate-200 dark:hover:bg-[#223630]'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          <span className="text-[10px] font-bold text-slate-400 dark:text-[#8FA69C] uppercase tracking-wider ml-2">
            {t('customerAgeGroup')}:
          </span>
          <div className="flex items-center gap-1">
            {ageGroupOptions.map((ag) => (
              <button
                key={ag.id}
                onClick={() => setSelectedAgeGroup(ag.id)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all ${
                  selectedAgeGroup === ag.id
                    ? 'bg-teal-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C] hover:bg-slate-200 dark:hover:bg-[#223630]'
                }`}
              >
                {ag.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sales Invoices List */}
      <div className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-100 dark:border-[#24352F] flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            {language === 'mr' ? 'विक्री बिल तपशील (Invoices Ledger)' : language === 'hi' ? 'बिक्री बिल विवरण (Invoices Ledger)' : 'Invoices Ledger'}
          </h3>
          <span className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium">
            {filtered.length} {language === 'mr' ? 'बिले' : language === 'hi' ? 'बिल प्रदर्शित' : 'invoices displayed'}
          </span>
        </div>

        {filtered.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-[#24352F]">
            {filtered.map((sale) => {
              const isExpanded = expandedSaleId === sale.id;

              return (
                <div key={sale.id} className="p-4 hover:bg-slate-50/60 dark:hover:bg-[#1A2A25]/60 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* Invoice ID & Date */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {sale.invoice_no}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sale.payment_mode === 'Cash' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300' :
                          sale.payment_mode === 'Online_UPI' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300' :
                          sale.payment_mode === 'Split' ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300' : 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300'
                        }`}>
                          {sale.payment_mode}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-[#8FA69C] font-medium">
                        <span>{sale.sale_date}</span>
                        <span>&bull;</span>
                        <span className="font-semibold text-slate-700 dark:text-[#E7F0EC]">{sale.customer_name}</span>
                        {sale.customer_phone && <span>({sale.customer_phone})</span>}
                        {sale.customer_gender && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-[#1A2A25] text-slate-700 dark:text-[#8FA69C] border border-slate-200 dark:border-[#24352F]">
                            {sale.customer_gender === 'Male' ? '👨' : sale.customer_gender === 'Female' ? '👩' : '🧑'}
                            {sale.customer_gender === 'Male' 
                              ? (language === 'mr' ? 'पुरुष' : language === 'hi' ? 'पुरुष' : 'Male') 
                              : sale.customer_gender === 'Female' 
                              ? (language === 'mr' ? 'महिला' : language === 'hi' ? 'महिला' : 'Female') 
                              : (language === 'mr' ? 'इतर' : language === 'hi' ? 'अन्य' : 'Other')}
                            {sale.customer_age_group && ` • ${sale.customer_age_group}`}
                            {sale.customer_age && ` (${sale.customer_age}y)`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Financial details & Action Buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-right">
                        <div className="text-lg font-black text-slate-900 dark:text-white">
                          ₹{sale.net_amount.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#8FA69C]">
                          {sale.payment_mode === 'Split' && (
                            <span>{language === 'mr' ? 'रोख' : language === 'hi' ? 'कैश' : 'Cash'}: ₹{sale.cash_amount} | UPI: ₹{sale.online_amount}</span>
                          )}
                          {sale.discount > 0 && <span>{t('discount')}: ₹{sale.discount}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setReturnTarget({
                            invoiceNo: sale.invoice_no,
                            customerName: sale.customer_name,
                            customerPhone: sale.customer_phone,
                            productId: sale.items?.[0]?.product_id
                          })}
                          className="px-2 py-1 rounded-lg text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/50 flex items-center gap-1 text-[11px] font-bold transition"
                          title="Record Customer Return"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{language === 'mr' ? 'परतावा' : language === 'hi' ? 'वापसी' : 'Return'}</span>
                        </button>

                        <button
                          onClick={() => setSelectedSaleForView(sale)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-[#8FA69C] hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-[#1A2A25]"
                          title="View Bill Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => toggleExpand(sale.id)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-[#8FA69C] hover:bg-slate-200 dark:hover:bg-[#1A2A25]"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Expanded Items Drawer */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-[#24352F] bg-slate-50 dark:bg-[#1A2A25] p-3 rounded-xl space-y-1.5 text-xs">
                      <div className="font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'mr' ? 'या बिलामध्ये गेलेला माल (Sold Items):' : language === 'hi' ? 'इस बिल में बिका सामान (Sold Items):' : 'Items in this Bill (Sold Items):'}
                      </div>
                      {sale.items?.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-slate-700 dark:text-[#8FA69C]">
                          <span>{it.product_name}</span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {it.quantity} {it.unit} &times; ₹{it.unit_price} = <b className="text-emerald-700 dark:text-emerald-400">₹{it.total_price}</b>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 dark:text-[#8FA69C] text-xs">
            {language === 'mr' ? 'या कालावधीत कोणतेही बिल आढळले नाही.' : language === 'hi' ? 'इस अवधि में कोई बिक्री बिल नहीं मिला।' : 'No sales bills found for this period.'}
          </div>
        )}
      </div>

      {/* BILL VIEW & REPRINT MODAL */}
      {selectedSaleForView && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131F1B] rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200/80 dark:border-[#24352F]">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#24352F] pb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-[#8FA69C]">
                {language === 'mr' ? 'पावती तपशील:' : language === 'hi' ? 'रसीद विवरण:' : 'Receipt Details:'} {selectedSaleForView.invoice_no}
              </span>
              <button 
                onClick={() => setSelectedSaleForView(null)}
                className="text-slate-400 hover:text-slate-600 dark:text-[#8FA69C] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="printable-receipt" className="bg-slate-50 dark:bg-[#1A2A25] p-4 rounded-xl border border-dashed border-slate-300 dark:border-[#24352F] font-mono text-xs space-y-2">
              <div className="text-center border-b border-slate-200 dark:border-[#24352F] pb-2">
                <div className="font-bold text-sm text-slate-900 dark:text-white">{t('shopName')}</div>
                <div className="text-[10px] text-slate-500 dark:text-[#8FA69C]">
                  {language === 'mr' ? 'ताजे दूध, पनीर, दही, शुद्ध साजूक तूप' : language === 'hi' ? 'ताज़ा दूध, पनीर, दही, शुद्ध देसी घी' : 'Fresh Milk, Paneer, Curd, Pure Desi Ghee'}
                </div>
              </div>

              <div className="flex justify-between text-[11px] text-slate-700 dark:text-[#E7F0EC] pt-1">
                <span>{language === 'mr' ? 'बिल:' : language === 'hi' ? 'बिल:' : 'Bill:'} {selectedSaleForView.invoice_no}</span>
                <span>{selectedSaleForView.sale_date}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-700 dark:text-[#E7F0EC]">
                <span>{t('customerName')}: {selectedSaleForView.customer_name}</span>
                {selectedSaleForView.customer_gender && (
                  <span className="text-[10px] text-slate-500">
                    {selectedSaleForView.customer_gender === 'Male' ? '👨 ' : selectedSaleForView.customer_gender === 'Female' ? '👩 ' : '🧑 '}
                    {selectedSaleForView.customer_gender} ({selectedSaleForView.customer_age_group || (selectedSaleForView.customer_age ? `${selectedSaleForView.customer_age}y` : '')})
                  </span>
                )}
              </div>

              <div className="border-t border-b border-slate-200 dark:border-[#24352F] py-1.5 space-y-1">
                {selectedSaleForView.items?.map((it, i) => (
                  <div key={i} className="flex justify-between text-[11px] text-slate-800 dark:text-[#E7F0EC]">
                    <span className="truncate max-w-[150px]">{it.product_name}</span>
                    <span>{it.quantity} {it.unit} &times; ₹{it.unit_price} = ₹{it.total_price}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-0.5 text-right font-bold text-xs pt-1 text-slate-900 dark:text-white">
                {selectedSaleForView.discount > 0 && (
                  <div className="text-slate-500 dark:text-[#8FA69C]">{t('discount')} -₹{selectedSaleForView.discount}</div>
                )}
                <div className="text-sm text-emerald-700 dark:text-emerald-400">{t('netAmount')} ₹{selectedSaleForView.net_amount}</div>
                <div className="text-[10px] font-normal text-slate-500 dark:text-[#8FA69C]">
                  {t('paymentMethod')}: {selectedSaleForView.payment_mode}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (selectedSaleForView) {
                    viewReportPDF({
                      title: `विक्री बिल / Cash Memo (${selectedSaleForView.invoice_no})`,
                      periodText: `बिल क्र. ${selectedSaleForView.invoice_no} | तारीख: ${selectedSaleForView.sale_date}`,
                      kpis: [
                        { label: 'एकूण रक्कम', value: `₹${selectedSaleForView.net_amount}`, color: 'emerald' },
                        { label: 'पेमेंट मोड', value: selectedSaleForView.payment_mode, color: 'blue' }
                      ],
                      table: {
                        headers: ['वस्तू', 'नग/प्रमाण', 'दर', 'एकूण'],
                        rows: selectedSaleForView.items?.map(i => [i.product_name, `${i.quantity} ${i.unit}`, `₹${i.unit_price}`, `₹${i.total_price}`]) || [],
                        summaryRow: ['एकूण', '', '', `₹${selectedSaleForView.net_amount}`]
                      }
                    });
                  }
                }}
                className="py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2621] text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center gap-1 border border-slate-300 dark:border-slate-700 active:scale-95"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{language === 'mr' ? 'पहा' : language === 'hi' ? 'देखें' : 'View'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedSaleForView) {
                    printReport({
                      title: `विक्री बिल / Cash Memo (${selectedSaleForView.invoice_no})`,
                      periodText: `बिल क्र. ${selectedSaleForView.invoice_no} | तारीख: ${selectedSaleForView.sale_date}`,
                      kpis: [
                        { label: 'एकूण रक्कम', value: `₹${selectedSaleForView.net_amount}`, color: 'emerald' },
                        { label: 'पेमेंट मोड', value: selectedSaleForView.payment_mode, color: 'blue' }
                      ],
                      table: {
                        headers: ['वस्तू', 'नग/प्रमाण', 'दर', 'एकूण'],
                        rows: selectedSaleForView.items?.map(i => [i.product_name, `${i.quantity} ${i.unit}`, `₹${i.unit_price}`, `₹${i.total_price}`]) || [],
                        summaryRow: ['एकूण', '', '', `₹${selectedSaleForView.net_amount}`]
                      }
                    });
                  }
                }}
                className="py-2.5 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1 active:scale-95"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'mr' ? 'प्रिंट' : language === 'hi' ? 'प्रिंट' : 'Print'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedSaleForView) {
                    downloadReportPDF({
                      title: `Bill_${selectedSaleForView.invoice_no}`,
                      periodText: `बिल क्र. ${selectedSaleForView.invoice_no} | तारीख: ${selectedSaleForView.sale_date}`,
                      kpis: [
                        { label: 'एकूण रक्कम', value: `₹${selectedSaleForView.net_amount}`, color: 'emerald' },
                        { label: 'पेमेंट मोड', value: selectedSaleForView.payment_mode, color: 'blue' }
                      ],
                      table: {
                        headers: ['वस्तू', 'नग/प्रमाण', 'दर', 'एकूण'],
                        rows: selectedSaleForView.items?.map(i => [i.product_name, `${i.quantity} ${i.unit}`, `₹${i.unit_price}`, `₹${i.total_price}`]) || [],
                        summaryRow: ['एकूण', '', '', `₹${selectedSaleForView.net_amount}`]
                      }
                    });
                  }
                }}
                className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{language === 'mr' ? 'डाउनलोड' : language === 'hi' ? 'डाउनलोड' : 'Download'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* RETURN PRODUCT MODAL */}
      {returnTarget && (
        <ReturnProductModal
          onClose={() => setReturnTarget(null)}
          prefillProductId={returnTarget.productId}
          prefillInvoiceNo={returnTarget.invoiceNo}
          prefillCustomerName={returnTarget.customerName}
          prefillCustomerPhone={returnTarget.customerPhone}
        />
      )}

    </div>
  );
};
