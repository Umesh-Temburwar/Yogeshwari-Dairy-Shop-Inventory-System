import React, { useState, useMemo } from 'react';
import nikhilAvatar from '../../assets/nikhil_avatar.png';
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
  RotateCcw,
  Edit2,
  Trash2,
  Save,
  Plus,
  Minus,
  CheckCircle2
} from 'lucide-react';
import { ReturnProductModal } from '../Returns/ReturnProductModal';
import { useAuth } from '../../context/AuthContext';
import { CustomerGender, CustomerAgeGroup, PaymentMode, SaleItem } from '../../types';

export const DailySalesTracker: React.FC = () => {
  const { filteredSales, metrics, setActiveView, returns, deleteSale, updateSale } = useStore();
  const { t, language } = useLanguage();
  const { role } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('All');
  const [selectedAdminSlot, setSelectedAdminSlot] = useState<string>('All'); // 'All' | '1' | '2' | 'Owner'
  const [selectedGender, setSelectedGender] = useState<string>('All');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('All');
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [returnTarget, setReturnTarget] = useState<{ productId?: string; invoiceNo?: string; customerName?: string; customerPhone?: string } | null>(null);
  const [selectedSaleForView, setSelectedSaleForView] = useState<Sale | null>(null);

  // Edit Sale Modal State
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editCustomerGender, setEditCustomerGender] = useState<CustomerGender>('Male');
  const [editCustomerAgeGroup, setEditCustomerAgeGroup] = useState<CustomerAgeGroup>('Adults (26-45)');
  const [editPaymentMode, setEditPaymentMode] = useState<PaymentMode>('Cash');
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [editItems, setEditItems] = useState<SaleItem[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Confirmation Modal State
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openEditModal = (sale: Sale) => {
    setEditingSale(sale);
    setEditCustomerName(sale.customer_name || '');
    setEditCustomerPhone(sale.customer_phone || '');
    setEditCustomerGender(sale.customer_gender || 'Male');
    setEditCustomerAgeGroup(sale.customer_age_group || 'Adults (26-45)');
    setEditPaymentMode(sale.payment_mode || 'Cash');
    setEditDiscount(sale.discount || 0);
    setEditItems(sale.items ? JSON.parse(JSON.stringify(sale.items)) : []);
  };

  const handleSaveEdit = async () => {
    if (!editingSale) return;
    setIsSavingEdit(true);
    try {
      await updateSale(editingSale.id, {
        customer_name: editCustomerName,
        customer_phone: editCustomerPhone,
        customer_gender: editCustomerGender,
        customer_age_group: editCustomerAgeGroup,
        payment_mode: editPaymentMode,
        discount: Number(editDiscount) || 0,
        items: editItems
      });
      setEditingSale(null);
    } catch (err) {
      console.error('Failed to update sale:', err);
      alert(language === 'mr' ? 'बिल अपडेट करताना त्रुटी आली!' : 'बिल अपडेट करने में त्रुटि!');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!saleToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSale(saleToDelete.id);
      setSaleToDelete(null);
    } catch (err) {
      console.error('Failed to delete sale:', err);
      alert(language === 'mr' ? 'बिल डिलीट करताना त्रुटी आली!' : 'बिल डिलीट करने में त्रुटि!');
    } finally {
      setIsDeleting(false);
    }
  };

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
    { id: 'Kids (<18)', label: '<18' },
    { id: 'Youth (18-25)', label: '18-25' },
    { id: 'Adults (26-45)', label: '26-45' },
    { id: 'Senior (45+)', label: '45+' }
  ];

  const filtered = filteredSales.filter(sale => {
    const matchesSearch = sale.invoice_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sale.customer_phone && sale.customer_phone.includes(searchQuery));

    const matchesMode = selectedPaymentMode === 'All' || sale.payment_mode === selectedPaymentMode;
    const matchesGender = selectedGender === 'All' || sale.customer_gender === selectedGender;
    const matchesAgeGroup = selectedAgeGroup === 'All' || sale.customer_age_group === selectedAgeGroup;
    const matchesAdmin = selectedAdminSlot === 'All' ||
      (selectedAdminSlot === '1' && (sale.admin_slot === 1 || sale.created_by_email === 'nilusakhare2003@gmail.com' || (!sale.admin_slot && sale.created_by_role !== 'Owner'))) ||
      (selectedAdminSlot === 'Owner' && (sale.created_by_role === 'Owner' || sale.created_by_email === 'yogeshwaridairy9896@gmail.com' || (sale.admin_slot === null && (sale.created_by_name?.includes('मालक') || sale.created_by_name?.toLowerCase().includes('nikhil')))));

    return matchesSearch && matchesMode && matchesGender && matchesAgeGroup && matchesAdmin;
  });

  // Compute filter-aware KPIs from the locally filtered list
  const filteredKpis = useMemo(() => {
    const totalRevenue = filtered.reduce((sum, s) => sum + s.net_amount, 0);
    const cashInflow = filtered
      .filter(s => s.payment_mode === 'Cash' || s.payment_mode === 'Split')
      .reduce((sum, s) => sum + (s.payment_mode === 'Cash' ? s.net_amount : (s.cash_amount || 0)), 0);
    const onlineInflow = filtered
      .filter(s => s.payment_mode === 'Online_UPI' || s.payment_mode === 'Split')
      .reduce((sum, s) => sum + (s.payment_mode === 'Online_UPI' ? s.net_amount : (s.online_amount || 0)), 0);
    const udharGiven = filtered
      .filter(s => s.payment_mode === 'Udhar')
      .reduce((sum, s) => sum + s.net_amount, 0);
    return { totalRevenue, cashInflow, onlineInflow, udharGiven, billCount: filtered.length };
  }, [filtered]);

  const toggleExpand = (id: string) => {
    setExpandedSaleId(prev => prev === id ? null : id);
  };

  const getSalesPDFPayload = () => {
    const isMr = language === 'mr';
    const isHi = language === 'hi';

    return {
      title: isMr ? 'दैनिक विक्री व रोकड लेजर अहवाल' : isHi ? 'दैनिक बिक्री व रोकड़ लेजर रिपोर्ट' : 'Daily Sales & Cash/Online Ledger Report',
      subtitle: isMr ? 'योगेश्वरी डेअरी फार्म & उत्पादने ERP' : isHi ? 'योगेश्वरी डेरी फार्म & उत्पाद ERP' : 'Yogeshwari Dairy Farm & Products ERP',
      periodText: isMr ? 'निवडलेला कालावधी हिशोब' : isHi ? 'चुनी गई अवधि का हिसाब' : 'Selected Period Sales & Collections',
      language,
      kpis: [
        { label: isMr ? 'एकूण विक्री' : isHi ? 'कुल बिक्री' : 'Total Sales', value: `₹${(filteredKpis.totalRevenue || 0).toLocaleString('en-IN')}`, color: 'emerald' },
        { label: isMr ? 'रोख जमा' : isHi ? 'रोकड़ जमा' : 'Cash Inflow', value: `₹${(filteredKpis.cashInflow || 0).toLocaleString('en-IN')}`, color: 'blue' },
        { label: isMr ? 'ऑनलाईन UPI' : isHi ? 'ऑनलाइन UPI' : 'Online UPI', value: `₹${(filteredKpis.onlineInflow || 0).toLocaleString('en-IN')}`, color: 'purple' },
        { label: isMr ? 'उधारी दिली' : isHi ? 'उधारी दी' : 'Credit Given', value: `₹${(filteredKpis.udharGiven || 0).toLocaleString('en-IN')}`, color: 'amber' }
      ],
      table: {
        headers: isMr 
          ? ['बिल क्र.', 'तारीख', 'काऊंटर व ऑपरेटर', 'ग्राहक नाव', 'पेमेंट', 'वस्तू तपशील', 'सवलत (₹)', 'एकूण (₹)']
          : isHi
          ? ['बिल क्र.', 'दिनांक', 'काउंटर व ऑपरेटर', 'ग्राहक नाम', 'भुगतान', 'सामान विवरण', 'छूट (₹)', 'कुल (₹)']
          : ['Invoice No.', 'Date', 'Counter & Operator', 'Customer Name', 'Payment', 'Items Sold', 'Discount (₹)', 'Net (₹)'],
        alignments: ['left', 'center', 'left', 'left', 'center', 'left', 'right', 'right'] as ('left' | 'center' | 'left' | 'left' | 'center' | 'left' | 'right' | 'right')[],
        rows: filtered.length > 0 ? filtered.map(s => {
          const sRets = (returns || []).filter(r => (r.sale_id && r.sale_id === s.id) || (r.invoice_no && r.invoice_no.trim().toLowerCase() === s.invoice_no.trim().toLowerCase()));
          const sRefund = sRets.reduce((acc, r) => acc + r.refund_amount, 0);
          return [
            s.invoice_no + (sRefund > 0 ? ` (परतावा -₹${sRefund})` : ''),
            s.sale_date,
            s.counter_name ? `${s.counter_name} (${s.created_by_name || 'Admin'})` : (s.created_by_role === 'Owner' ? 'मुख्य मालक काऊंटर (निखिल सखारे)' : 'काऊंटर १ (निलेश सखारे)'),
            s.customer_name + (s.customer_phone ? ` (${s.customer_phone})` : ''),
            s.payment_mode === 'Cash' ? (isMr ? 'रोख' : isHi ? 'रोकड़' : 'Cash') :
            s.payment_mode === 'Online_UPI' ? (isMr ? 'ऑनलाईन UPI' : isHi ? 'ऑनलाइन UPI' : 'Online UPI') :
            s.payment_mode === 'Udhar' ? (isMr ? 'उधारी' : isHi ? 'उधार' : 'Credit') :
            s.payment_mode === 'Split' ? (isMr ? 'विभागून' : isHi ? 'विभाजित' : 'Split') : s.payment_mode,
            s.items ? s.items.map(i => `${i.product_name} x ${i.quantity}`).join(', ') : '—',
            s.discount > 0 ? `₹${s.discount}` : '₹0',
            `₹${s.net_amount.toLocaleString('en-IN')}`
          ];
        }) : [
          ['—', '—', '—', isMr ? 'या निवडलेल्या कालावधीत कोणतीही विक्री नोंद नाही' : isHi ? 'इस अवधि में कोई बिक्री दर्ज नहीं' : 'No sales records found for this period', '—', '—', '—', '₹0']
        ],
        summaryRow: [
          isMr ? 'एकूण' : isHi ? 'कुल योग' : 'Total',
          `${filtered.length} ${isMr ? 'बिले' : isHi ? 'बिल' : 'Bills'}`,
          '',
          '',
          '',
          '',
          '',
          `₹${filtered.reduce((acc, s) => acc + s.net_amount, 0).toLocaleString('en-IN')}`
        ]
      },
      notes: isMr 
        ? 'संगणकीय तयार केलेला अधिकृत विक्री अहवाल. रोकड व ऑनलाईन पावती तपासून घ्यावी.'
        : isHi
        ? 'कंप्यूटर द्वारा जनरेटेड अधिकृत बिक्री रिपोर्ट। रोकड़ व ऑनलाइन रसीद जांच लें।'
        : 'Computer generated official sales audit report. Please verify cash and online receipts.'
    };
  };

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
            title={language === 'mr' ? 'अहवाल पहा' : language === 'hi' ? 'रिपोर्ट देखें' : 'View Sales PDF'}
          >
            <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'mr' ? 'पहा' : language === 'hi' ? 'देखें' : 'View'}</span>
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
            ₹{filteredKpis.totalRevenue.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-[#8FA69C] font-medium">
            {filteredKpis.billCount} {language === 'mr' ? 'बिले फाडली' : language === 'hi' ? 'बिल काटे गए' : 'invoices billed'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs transition-colors">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
            <Banknote className="w-4 h-4" />
            <span>{t('cashCollected')}</span>
          </div>
          <span className="text-2xl font-black text-blue-900 dark:text-blue-200 mt-1 block">
            ₹{filteredKpis.cashInflow.toLocaleString('en-IN')}
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
            ₹{filteredKpis.onlineInflow.toLocaleString('en-IN')}
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
            ₹{filteredKpis.udharGiven.toLocaleString('en-IN')}
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

        {/* Admin & Counter Filter (Dedicated for Shop Owner) */}
        {role === 'Owner' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-[#24352F]">
            <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
              👑 {language === 'mr' ? 'प्रशासक व काऊंटर तपशील फिल्टर:' : language === 'hi' ? 'प्रशासक व काउंटर फिल्टर:' : 'Admin & Counter Filter:'}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'All', label: language === 'mr' ? 'सर्व नोंदी (All)' : language === 'hi' ? 'सभी रिकॉर्ड (All)' : 'All Counters' },
                { id: '1', label: language === 'mr' ? '🛡️ निलेश सखारे (काऊंटर १)' : language === 'hi' ? '🛡️ निलेश सखारे (काउंटर १)' : '🛡️ Nilesh Sakhare (Counter 1)' },
                { id: 'Owner', label: language === 'mr' ? '👑 निखिल सखारे (मालक)' : language === 'hi' ? '👑 निखिल सखारे (मालिक)' : '👑 Nikhil Sakhare (Owner)' },
              ].map((adm) => (
                <button
                  key={adm.id}
                  onClick={() => setSelectedAdminSlot(adm.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedAdminSlot === adm.id
                      ? 'bg-amber-500 text-amber-950 font-black shadow-xs'
                      : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C] hover:bg-slate-200 dark:hover:bg-[#223630]'
                  }`}
                >
                  {adm.label}
                </button>
              ))}
            </div>
          </div>
        )}
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
              const saleReturns = (returns || []).filter(r => 
                (r.sale_id && r.sale_id === sale.id) || 
                (r.invoice_no && r.invoice_no.trim().toLowerCase() === sale.invoice_no.trim().toLowerCase())
              );
              const hasReturn = saleReturns.length > 0;
              const totalRefundedOnSale = Number(saleReturns.reduce((sum, r) => sum + r.refund_amount, 0).toFixed(2));
              const originalGross = Number((sale.net_amount + totalRefundedOnSale).toFixed(2));

              return (
                <div key={sale.id} className="p-4 hover:bg-slate-50/60 dark:hover:bg-[#1A2A25]/60 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* Invoice ID & Date */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
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

                        {/* Return Cut Badge */}
                        {hasReturn && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-2xs">
                            <RotateCcw className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                            <span>{language === 'mr' ? `परतावा वजावट: -₹${totalRefundedOnSale}` : language === 'hi' ? `वापसी कटौती: -₹${totalRefundedOnSale}` : `Return Cut: -₹${totalRefundedOnSale}`}</span>
                          </span>
                        )}

                        {/* Admin Slot & Counter Badge */}
                        {(() => {
                          const isOwnerSale = sale.created_by_role === 'Owner' || (sale.admin_slot === null && (sale.created_by_name?.includes('मालक') || sale.created_by_name?.toLowerCase().includes('nikhil')));
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isOwnerSale
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800/40'
                                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/40'
                            }`}>
                              {isOwnerSale ? (
                                <img src={nikhilAvatar} alt="" className="w-3.5 h-3.5 rounded-full object-cover border border-amber-400 shrink-0" />
                              ) : (
                                <span>👤</span>
                              )}
                              <span>📍 {sale.counter_name || (isOwnerSale ? 'मुख्य मालक काऊंटर' : 'काऊंटर १')} • {sale.created_by_name || (isOwnerSale ? (language === 'mr' ? 'निखिल सखारे' : 'Nikhil Sakhare') : (language === 'mr' ? 'निलेश सखारे' : 'Nilesh Sakhare'))}</span>
                              {sale.created_by_email && (
                                <span className="text-[10px] font-normal opacity-75 hidden sm:inline">({sale.created_by_email})</span>
                              )}
                            </span>
                          );
                        })()}
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

                      {/* Purchased Products Preview on Row */}
                      {sale.items && sale.items.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {sale.items.map((it, idx) => (
                            <span 
                              key={idx} 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/40"
                            >
                              <span>📦</span>
                              <span>{it.product_name}</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">({it.quantity} {it.unit})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Financial details & Action Buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-right">
                        <div className="text-lg font-black text-slate-900 dark:text-white">
                          ₹{sale.net_amount.toLocaleString('en-IN')}
                        </div>
                        {hasReturn && (
                          <div className="text-[10px] text-slate-400 line-through">
                            {language === 'mr' ? 'मूळ' : language === 'hi' ? 'मूल' : 'Orig'}: ₹{originalGross.toLocaleString('en-IN')}
                          </div>
                        )}
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
                          title={language === 'mr' ? 'बिल पाहा' : language === 'hi' ? 'बिल देखें' : 'View Bill Details'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit Bill Button */}
                        <button
                          onClick={() => openEditModal(sale)}
                          className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          title={language === 'mr' ? 'बिल संपादित करा (Edit)' : language === 'hi' ? 'बिल सुधारें (Edit)' : 'Edit Bill'}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete Bill Button */}
                        <button
                          onClick={() => setSaleToDelete(sale)}
                          className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title={language === 'mr' ? 'बिल हटवा (Delete)' : language === 'hi' ? 'बिल हटाएं (Delete)' : 'Delete Bill'}
                        >
                          <Trash2 className="w-4 h-4" />
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
                    <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-[#24352F] bg-slate-50 dark:bg-[#1A2A25] p-3 rounded-xl space-y-2 text-xs">
                      <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-[#24352F]">
                        <span>{language === 'mr' ? 'या बिलामध्ये शिल्लक असलेला माल (Active Items):' : language === 'hi' ? 'इस बिल में शेष सामान (Active Items):' : 'Items in this Bill:'}</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-black">₹{sale.net_amount}</span>
                      </div>
                      
                      {sale.items?.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-slate-700 dark:text-[#8FA69C]">
                          <span className="font-medium">{it.product_name}</span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {it.quantity} {it.unit} &times; ₹{it.unit_price} = <b className="text-emerald-700 dark:text-emerald-400">₹{it.total_price}</b>
                          </span>
                        </div>
                      ))}

                      {/* Returned Items Box */}
                      {saleReturns.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-purple-200/60 dark:border-purple-800/50 space-y-1 bg-purple-50/50 dark:bg-purple-950/20 p-2.5 rounded-xl">
                          <div className="font-bold text-[11px] text-purple-900 dark:text-purple-300 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <RotateCcw className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              <span>{language === 'mr' ? 'या पावतीतून परत केलेला माल (Returned Items):' : language === 'hi' ? 'इस बिल से वापस किया गया सामान:' : 'Returned Items:'}</span>
                            </span>
                            <span className="font-black text-rose-600 dark:text-rose-400">-₹{totalRefundedOnSale}</span>
                          </div>
                          {saleReturns.map(sr => (
                            <div key={sr.id} className="flex justify-between items-center text-[10px] text-slate-600 dark:text-slate-300 py-0.5">
                              <span>&bull; {sr.product_name} ({sr.quantity} {sr.unit} &times; ₹{sr.unit_price}) &bull; <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">#{sr.return_no}</span></span>
                              <span className="font-bold text-rose-600 dark:text-rose-400">-₹{sr.refund_amount} ({sr.refund_mode})</span>
                            </div>
                          ))}
                        </div>
                      )}
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
                {selectedSaleForView.items && selectedSaleForView.items.length > 0 ? (
                  selectedSaleForView.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-[11px] text-slate-800 dark:text-[#E7F0EC]">
                      <span className="truncate max-w-[150px] font-semibold">{it.product_name}</span>
                      <span className="font-mono">{it.quantity} {it.unit} &times; ₹{it.unit_price} = ₹{it.total_price}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-[11px] text-slate-500 py-1">
                    {language === 'mr' ? 'दुग्ध उत्पादने (दूध/पनीर/तूप)' : language === 'hi' ? 'डेरी उत्पाद (दूध/पनीर/घी)' : 'Dairy Products'} &bull; ₹{selectedSaleForView.net_amount}
                  </div>
                )}
              </div>

              {/* Return Deductions on receipt if any */}
              {(() => {
                const viewModalReturns = (returns || []).filter(r => 
                  (selectedSaleForView && r.sale_id === selectedSaleForView.id) || 
                  (selectedSaleForView && r.invoice_no && r.invoice_no.trim().toLowerCase() === selectedSaleForView.invoice_no.trim().toLowerCase())
                );
                const viewModalRefundSum = Number(viewModalReturns.reduce((acc, r) => acc + r.refund_amount, 0).toFixed(2));
                if (viewModalReturns.length === 0) return null;

                return (
                  <div className="border-b border-dashed border-purple-300 dark:border-purple-800 py-1.5 space-y-0.5 text-purple-900 dark:text-purple-300 bg-purple-50/60 dark:bg-purple-950/30 px-2 rounded-lg">
                    <div className="text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>{language === 'mr' ? 'परतावा वजावट (Return Deduction):' : 'वापसी कटौती:'}</span>
                      <span className="text-rose-600 dark:text-rose-400 font-extrabold">-₹{viewModalRefundSum}</span>
                    </div>
                    {viewModalReturns.map((mr, idx) => (
                      <div key={idx} className="flex justify-between text-[10px] text-slate-600 dark:text-slate-300">
                        <span>- {mr.product_name} ({mr.quantity} {mr.unit})</span>
                        <span className="font-semibold">-₹{mr.refund_amount}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

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

      {/* EDIT SALE MODAL */}
      {editingSale && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#131F1B] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200/80 dark:border-[#24352F] my-8 animate-fadeIn">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#24352F] pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>{language === 'mr' ? 'बिल संपादित करा' : language === 'hi' ? 'बिल सुधारें' : 'Edit Invoice'}</span>
                </h3>
                <span className="text-xs font-mono text-slate-500 font-bold">#{editingSale.invoice_no}</span>
              </div>
              <button 
                onClick={() => setEditingSale(null)}
                className="text-slate-400 hover:text-slate-600 dark:text-[#8FA69C] dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              
              {/* Customer Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'mr' ? 'ग्राहकाचे नाव:' : language === 'hi' ? 'ग्राहक का नाम:' : 'Customer Name:'}
                  </label>
                  <input
                    type="text"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'mr' ? 'मोबाईल नंबर:' : language === 'hi' ? 'मोबाइल नंबर:' : 'Phone Number:'}
                  </label>
                  <input
                    type="tel"
                    value={editCustomerPhone}
                    onChange={(e) => setEditCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Gender & Age Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'mr' ? 'लिंग:' : language === 'hi' ? 'लिंग:' : 'Gender:'}
                  </label>
                  <div className="flex gap-1">
                    {(['Male', 'Female', 'Other'] as CustomerGender[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setEditCustomerGender(g)}
                        className={`flex-1 py-1.5 rounded-lg border text-[11px] font-bold transition ${
                          editCustomerGender === g
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C]'
                        }`}
                      >
                        {g === 'Male' ? '👨 पुरुष' : g === 'Female' ? '👩 महिला' : '🧑 इतर'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'mr' ? 'वयोगट:' : language === 'hi' ? 'आयु वर्ग:' : 'Age Group:'}
                  </label>
                  <select
                    value={editCustomerAgeGroup}
                    onChange={(e) => setEditCustomerAgeGroup(e.target.value as CustomerAgeGroup)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Kids (<18)">&lt;18 (Kids)</option>
                    <option value="Youth (18-25)">18-25 (Youth)</option>
                    <option value="Adults (26-45)">26-45 (Adults)</option>
                    <option value="Senior (45+)">45+ (Senior)</option>
                  </select>
                </div>
              </div>

              {/* Payment Mode & Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'mr' ? 'पेमेंट पद्धत:' : language === 'hi' ? 'भुगतान तरीका:' : 'Payment Mode:'}
                  </label>
                  <select
                    value={editPaymentMode}
                    onChange={(e) => setEditPaymentMode(e.target.value as PaymentMode)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Cash">{language === 'mr' ? 'रोख (Cash)' : language === 'hi' ? 'रोकड़ (Cash)' : 'Cash'}</option>
                    <option value="Online_UPI">ऑनलाईन UPI (GPay/PhonePe)</option>
                    <option value="Udhar">{language === 'mr' ? 'उधार खाते (Udhar)' : language === 'hi' ? 'उधार खाता (Udhar)' : 'Udhar (Credit)'}</option>
                    <option value="Split">{language === 'mr' ? 'विभागून (Split)' : language === 'hi' ? 'विभाजित (Split)' : 'Split Pay'}</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'mr' ? 'सवलत / सूट (₹):' : language === 'hi' ? 'छूट / डिस्काउंट (₹):' : 'Discount (₹):'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editDiscount || ''}
                    placeholder="0"
                    onChange={(e) => setEditDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                  />
                </div>
              </div>

              {/* Items in Bill */}
              <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-[#24352F]">
                <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                  <span>{language === 'mr' ? 'बिलातील वस्तू (Items):' : language === 'hi' ? 'बिल का सामान (Items):' : 'Bill Items:'}</span>
                  <span className="text-emerald-700 dark:text-emerald-400">
                    {editItems.length} {language === 'mr' ? 'वस्तू' : language === 'hi' ? 'सामान' : 'items'}
                  </span>
                </div>

                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {editItems.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200/60 dark:border-[#24352F]"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="font-semibold text-slate-900 dark:text-white truncate block">{item.product_name}</span>
                        <span className="text-[10px] text-slate-500">₹{item.unit_price} / {item.unit}</span>
                      </div>

                      {/* Quantity Editor Controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const newQty = Math.max(0.1, Number((item.quantity - 1).toFixed(2)));
                            setEditItems(prev => prev.map((it, i) => i === idx ? {
                              ...it,
                              quantity: newQty,
                              total_price: Number((newQty * it.unit_price).toFixed(2))
                            } : it));
                          }}
                          className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-white hover:bg-slate-300"
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) => {
                            const q = Math.max(0.01, parseFloat(e.target.value) || 0.01);
                            setEditItems(prev => prev.map((it, i) => i === idx ? {
                              ...it,
                              quantity: q,
                              total_price: Number((q * it.unit_price).toFixed(2))
                            } : it));
                          }}
                          className="w-14 px-1.5 py-0.5 rounded border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] font-bold text-center text-slate-900 dark:text-white text-xs"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            const newQty = Number((item.quantity + 1).toFixed(2));
                            setEditItems(prev => prev.map((it, i) => i === idx ? {
                              ...it,
                              quantity: newQty,
                              total_price: Number((newQty * it.unit_price).toFixed(2))
                            } : it));
                          }}
                          className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-white hover:bg-slate-300"
                        >
                          <Plus className="w-3 h-3" />
                        </button>

                        <span className="w-16 text-right font-black text-emerald-700 dark:text-emerald-400">
                          ₹{item.total_price}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setEditItems(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg ml-1"
                          title="Remove Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation Preview */}
              {(() => {
                const sub = Number(editItems.reduce((acc, it) => acc + (it.total_price || 0), 0).toFixed(2));
                const net = Math.max(0, Number((sub - (Number(editDiscount) || 0)).toFixed(2)));
                return (
                  <div className="p-3 rounded-2xl bg-slate-100 dark:bg-[#1A2A25] space-y-1 font-bold">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400 text-xs">
                      <span>{language === 'mr' ? 'एकूण रक्कम:' : language === 'hi' ? 'कुल राशि:' : 'Subtotal:'}</span>
                      <span>₹{sub.toFixed(2)}</span>
                    </div>
                    {editDiscount > 0 && (
                      <div className="flex justify-between text-rose-600 text-xs">
                        <span>{language === 'mr' ? 'सवलत:' : language === 'hi' ? 'छूट:' : 'Discount:'}</span>
                        <span>-₹{Number(editDiscount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400 text-sm font-black pt-1 border-t border-slate-200 dark:border-[#24352F]">
                      <span>{language === 'mr' ? 'सुधारित अंतिम देय रक्कम:' : language === 'hi' ? 'सुधारी अंतिम देय राशि:' : 'Updated Net Total:'}</span>
                      <span className="text-base">₹{net.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#24352F]">
              <button
                type="button"
                onClick={() => setEditingSale(null)}
                disabled={isSavingEdit}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] text-slate-700 dark:text-slate-200 font-bold text-xs active:scale-95 transition"
              >
                {language === 'mr' ? 'रद्द करा' : language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit || editItems.length === 0}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingEdit ? (language === 'mr' ? 'जतन करत आहे...' : 'सहेज रहे हैं...') : (language === 'mr' ? 'बदल जतन करा (Save Changes)' : language === 'hi' ? 'बदलाव सहेजें (Save Changes)' : 'Save Changes')}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {saleToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131F1B] rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-rose-200 dark:border-rose-900/60 animate-fadeIn">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {language === 'mr' ? 'बिल नक्की हटवायचे आहे का?' : language === 'hi' ? 'क्या वाकई यह बिल हटाना चाहते हैं?' : 'Delete Invoice Confirmation'}
                </h3>
                <span className="text-xs font-mono text-rose-600 dark:text-rose-400 font-bold">#{saleToDelete.invoice_no}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 text-xs text-rose-950 dark:text-rose-200 space-y-1">
              <div><strong>{language === 'mr' ? 'ग्राहक:' : language === 'hi' ? 'ग्राहक:' : 'Customer:'}</strong> {saleToDelete.customer_name}</div>
              <div><strong>{language === 'mr' ? 'रक्कम:' : language === 'hi' ? 'रकम:' : 'Amount:'}</strong> ₹{saleToDelete.net_amount} ({saleToDelete.payment_mode})</div>
              <div><strong>{language === 'mr' ? 'तारीख:' : language === 'hi' ? 'तारीख:' : 'Date:'}</strong> {saleToDelete.sale_date}</div>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 pt-1 border-t border-rose-200/50 dark:border-rose-900/40 font-medium">
                {language === 'mr' 
                  ? '⚠️ हे बिल लेजर, दैनंदिन विक्री व Supabase क्लाऊडवरून कायमचे हटवले जाईल.' 
                  : language === 'hi' 
                  ? '⚠️ यह बिल लेजर, दैनिक बिक्री और Supabase क्लाउड से हमेशा के लिए हट जाएगा।' 
                  : '⚠️ This bill will be permanently deleted from sales ledger and Supabase.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSaleToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] text-slate-700 dark:text-slate-200 font-bold text-xs active:scale-95 transition"
              >
                {language === 'mr' ? 'रद्द करा' : language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 active:scale-95 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? (language === 'mr' ? 'हटवत आहे...' : 'हटा रहे हैं...') : (language === 'mr' ? 'होय, बिल हटवा' : language === 'hi' ? 'हाँ, बिल हटाएं' : 'Yes, Delete Bill')}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
