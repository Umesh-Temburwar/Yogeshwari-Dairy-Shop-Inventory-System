import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { PeriodFilter } from '../Dashboard/PeriodFilter';
import { Sale } from '../../types';
import { printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import { 
  ReceiptIndianRupee, 
  Printer, 
  Download,
  Banknote, 
  Smartphone, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  RotateCcw,
  Edit2,
  Trash2,
  Save,
  Plus,
  Minus,
} from 'lucide-react';
import { ReturnProductModal } from '../Returns/ReturnProductModal';
import { useAuth } from '../../context/AuthContext';
import { CustomerGender, CustomerAgeGroup, PaymentMode, SaleItem } from '../../types';
import { Button, Input, SearchInput, Card, KpiCard, Badge, StatusBadge, Modal } from '../ui';

export const DailySalesTracker: React.FC = () => {
  const { filteredSales, setActiveView, returns, deleteSale, updateSale } = useStore();
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
      alert(language === 'mr' ? 'बिल हटवताना त्रुटी आली!' : 'बिल हटाने में त्रुटि आई!');
    } finally {
      setIsDeleting(false);
    }
  };

  const paymentModes = [
    { id: 'All', label: language === 'mr' ? 'सर्व पेमेंट' : language === 'hi' ? 'सभी भुगतान' : 'All Modes' },
    { id: 'Cash', label: language === 'mr' ? 'रोख (Cash)' : language === 'hi' ? 'रोकड़ (Cash)' : 'Cash' },
    { id: 'Online_UPI', label: 'ऑनलाईन UPI' },
    { id: 'Udhar', label: language === 'mr' ? 'उधार (Credit)' : language === 'hi' ? 'उधार (Credit)' : 'Udhar' },
    { id: 'Split', label: language === 'mr' ? 'विभागून (Split)' : language === 'hi' ? 'विभाजित (Split)' : 'Split' }
  ];

  const genderOptions = [
    { id: 'All', label: language === 'mr' ? 'सर्व लिंग' : language === 'hi' ? 'सभी लिंग' : 'All Gender' },
    { id: 'Male', label: language === 'mr' ? '👨 पुरुष' : language === 'hi' ? '👨 पुरुष' : '👨 Male' },
    { id: 'Female', label: language === 'mr' ? '👩 महिला' : language === 'hi' ? '👩 महिला' : '👩 Female' },
    { id: 'Other', label: language === 'mr' ? '🧑 इतर' : language === 'hi' ? '🧑 अन्य' : '🧑 Other' },
  ];

  const ageGroupOptions = [
    { id: 'All', label: language === 'mr' ? 'सर्व वयोगट' : language === 'hi' ? 'सभी आयु वर्ग' : 'All Ages' },
    { id: 'Kids (<18)', label: 'Kids (<18)' },
    { id: 'Youth (18-25)', label: 'Youth (18-25)' },
    { id: 'Adults (26-45)', label: 'Adults (26-45)' },
    { id: 'Senior (45+)', label: 'Senior (45+)' },
  ];

  const filtered = useMemo(() => {
    return filteredSales.filter(sale => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        sale.invoice_no.toLowerCase().includes(q) ||
        sale.customer_name.toLowerCase().includes(q) ||
        (sale.customer_phone && sale.customer_phone.includes(q)) ||
        (sale.items && sale.items.some(i => i.product_name.toLowerCase().includes(q)));

      const matchesPayment = selectedPaymentMode === 'All' || sale.payment_mode === selectedPaymentMode;

      const matchesAdminSlot = 
        selectedAdminSlot === 'All' ||
        (selectedAdminSlot === 'Owner' && (sale.created_by_role === 'Owner' || (sale.admin_slot === null && (sale.created_by_name?.includes('मालक') || sale.created_by_name?.toLowerCase().includes('nikhil'))))) ||
        (selectedAdminSlot === '1' && (sale.admin_slot === 1 || sale.created_by_name?.includes('निलेश') || sale.counter_name?.includes('१') || sale.counter_name?.includes('1')));

      const matchesGender = selectedGender === 'All' || sale.customer_gender === selectedGender;
      const matchesAgeGroup = selectedAgeGroup === 'All' || sale.customer_age_group === selectedAgeGroup;

      return matchesSearch && matchesPayment && matchesAdminSlot && matchesGender && matchesAgeGroup;
    });
  }, [filteredSales, searchQuery, selectedPaymentMode, selectedAdminSlot, selectedGender, selectedAgeGroup]);

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
    <div className="space-y-5">
      
      {/* Header Banner */}
      <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-ink tracking-tight flex items-center gap-2">
            <ReceiptIndianRupee className="w-5 h-5 text-ink-2" />
            <span>
              {language === 'mr' ? 'दैनिक विक्री व रोख-ऑनलाईन लेजर (Daily Sales)' : language === 'hi' ? 'दैनिक बिक्री & रोकड़-ऑनलाइन लेजर (Daily Sales)' : 'Daily Sales & Cash/Online Ledger'}
            </span>
          </h2>
          <p className="text-xs text-ink-3 mt-1 font-medium">
            {language === 'mr' 
              ? 'किती माल गेला, काय गेला, रोख किती आली आणि ऑनलाईन UPI किती आले याचा हिशोब' 
              : language === 'hi'
              ? 'कितना माल बिका, क्या बिका, कैश कितना आया और ऑनलाइन UPI कितना आया'
              : 'Detailed tracking of items sold, cash inflow, and online UPI collections'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleViewSalesPDF}
            leftIcon={<Eye className="w-4 h-4" />}
            title={language === 'mr' ? 'अहवाल पहा' : language === 'hi' ? 'रिपोर्ट देखें' : 'View Sales PDF'}
          >
            {language === 'mr' ? 'पहा' : language === 'hi' ? 'देखें' : 'View'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrintSalesPDF}
            leftIcon={<Printer className="w-4 h-4" />}
            title={language === 'mr' ? 'अहवाल थेट प्रिंट करा' : language === 'hi' ? 'रिपोर्ट प्रिंट करें' : 'Print Sales Report'}
          >
            {language === 'mr' ? 'प्रिंट' : language === 'hi' ? 'प्रिंट' : 'Print'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadSalesPDF}
            leftIcon={<Download className="w-4 h-4" />}
            title={language === 'mr' ? 'अहवाल PDF फाईल डाउनलोड करा' : language === 'hi' ? 'रिपोर्ट PDF डाउनलोड करें' : 'Download Sales PDF'}
          >
            {language === 'mr' ? 'डाउनलोड PDF' : language === 'hi' ? 'डाउनलोड PDF' : 'Download PDF'}
          </Button>
        </div>
      </Card>

      {/* Time Filter */}
      <PeriodFilter />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label={t('totalSales')}
          value={`₹${filteredKpis.totalRevenue.toLocaleString('en-IN')}`}
          delta={`${filteredKpis.billCount} ${language === 'mr' ? 'बिले' : language === 'hi' ? 'बिल' : 'bills'}`}
          deltaType="neutral"
        />

        <KpiCard
          label={t('cashCollected')}
          value={`₹${filteredKpis.cashInflow.toLocaleString('en-IN')}`}
          delta={language === 'mr' ? 'गल्ल्यातील रोख' : language === 'hi' ? 'रोकड़ गल्ला' : 'Cash Drawer'}
          deltaType="ok"
          icon={<Banknote className="w-4 h-4 text-ink-3" />}
        />

        <KpiCard
          label={t('onlineCollected')}
          value={`₹${filteredKpis.onlineInflow.toLocaleString('en-IN')}`}
          delta="UPI / GPay / Paytm"
          deltaType="neutral"
          icon={<Smartphone className="w-4 h-4 text-ink-3" />}
        />

        <KpiCard
          label={language === 'mr' ? 'उधार दिला (Credit)' : language === 'hi' ? 'उधार दिया (Credit)' : 'Credit Given'}
          value={`₹${filteredKpis.udharGiven.toLocaleString('en-IN')}`}
          delta={language === 'mr' ? 'खाते नोंद' : language === 'hi' ? 'खाता दर्ज' : 'Recorded in Khata'}
          deltaType="warn"
          icon={<BookOpen className="w-4 h-4 text-ink-3" />}
        />
      </div>

      {/* Search & Mode + Demographic Filters */}
      <Card className="p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput
              placeholder={language === 'mr' ? 'बिल क्रमांक, ग्राहक नाव किंवा मोबाईल शोधा...' : language === 'hi' ? 'बिल नंबर, ग्राहक नाम या फोन नंबर से खोजें...' : 'Search invoice no, customer name or phone...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-2 shrink-0 overflow-x-auto">
            {paymentModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setSelectedPaymentMode(mode.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  selectedPaymentMode === mode.id
                    ? 'bg-surface text-ink shadow-card font-semibold'
                    : 'text-ink-3 hover:text-ink'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Demographic Filter Chips (Gender & Age Group) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line">
          <span className="text-[11px] font-medium text-ink-3 uppercase tracking-wider">
            {t('customerGender')}:
          </span>
          <div className="flex items-center gap-1">
            {genderOptions.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGender(g.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  selectedGender === g.id
                    ? 'bg-accent text-accent-fg font-semibold'
                    : 'bg-surface-2 text-ink-2 hover:text-ink'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-medium text-ink-3 uppercase tracking-wider ml-2">
            {t('customerAgeGroup')}:
          </span>
          <div className="flex items-center gap-1">
            {ageGroupOptions.map((ag) => (
              <button
                key={ag.id}
                type="button"
                onClick={() => setSelectedAgeGroup(ag.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  selectedAgeGroup === ag.id
                    ? 'bg-accent text-accent-fg font-semibold'
                    : 'bg-surface-2 text-ink-2 hover:text-ink'
                }`}
              >
                {ag.label}
              </button>
            ))}
          </div>
        </div>

        {/* Admin & Counter Filter (Dedicated for Shop Owner) */}
        {role === 'Owner' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line">
            <span className="text-[11px] font-medium text-ink-3 uppercase tracking-wider flex items-center gap-1">
              👑 {language === 'mr' ? 'प्रशासक व काऊंटर फिल्टर:' : language === 'hi' ? 'प्रशासक व काउंटर फिल्टर:' : 'Admin & Counter Filter:'}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'All', label: language === 'mr' ? 'सर्व नोंदी (All)' : language === 'hi' ? 'सभी रिकॉर्ड (All)' : 'All Counters' },
                { id: '1', label: language === 'mr' ? '🛡️ निलेश सखारे (काऊंटर १)' : language === 'hi' ? '🛡️ निलेश सखारे (काउंटर १)' : '🛡️ Nilesh Sakhare (Counter 1)' },
                { id: 'Owner', label: language === 'mr' ? '👑 निखिल सखारे (मालक)' : language === 'hi' ? '👑 निखिल सखारे (मालिक)' : '👑 Nikhil Sakhare (Owner)' },
              ].map((adm) => (
                <button
                  key={adm.id}
                  type="button"
                  onClick={() => setSelectedAdminSlot(adm.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    selectedAdminSlot === adm.id
                      ? 'bg-accent text-accent-fg font-semibold'
                      : 'bg-surface-2 text-ink-2 hover:text-ink'
                  }`}
                >
                  {adm.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Sales Invoices List */}
      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <h3 className="font-semibold text-ink text-sm">
            {language === 'mr' ? 'विक्री बिल तपशील (Invoices Ledger)' : language === 'hi' ? 'बिक्री बिल विवरण (Invoices Ledger)' : 'Invoices Ledger'}
          </h3>
          <span className="text-xs text-ink-3 font-medium">
            {filtered.length} {language === 'mr' ? 'बिले' : language === 'hi' ? 'बिल' : 'invoices'}
          </span>
        </div>

        {filtered.length > 0 ? (
          <div className="divide-y divide-line">
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
                <div key={sale.id} className="p-4 hover:bg-surface-2/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* Invoice ID & Date */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink text-sm">
                          {sale.invoice_no}
                        </span>
                        
                        <Badge variant="default" className="text-[11px]">
                          {sale.payment_mode === 'Online_UPI' ? 'UPI' : sale.payment_mode}
                        </Badge>

                        {/* Return Cut Badge */}
                        {hasReturn && (
                          <StatusBadge status="warn" className="text-[10px]">
                            <RotateCcw className="w-3 h-3 mr-0.5 inline" />
                            {language === 'mr' ? `परतावा -₹${totalRefundedOnSale}` : language === 'hi' ? `वापसी -₹${totalRefundedOnSale}` : `Return -₹${totalRefundedOnSale}`}
                          </StatusBadge>
                        )}

                        {/* Admin Slot & Counter Badge */}
                        <Badge variant="outline" className="text-[10px]">
                          📍 {sale.counter_name || (sale.created_by_role === 'Owner' ? 'मुख्य मालक काऊंटर' : 'काऊंटर १')} • 👤 {sale.created_by_name || (sale.created_by_role === 'Owner' ? (language === 'mr' ? 'निखिल सखारे' : 'Nikhil Sakhare') : (language === 'mr' ? 'निलेश सखारे' : 'Nilesh Sakhare'))}
                          {sale.created_by_email && (
                            <span className="opacity-70 hidden sm:inline ml-1">({sale.created_by_email})</span>
                          )}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
                        <span>{sale.sale_date}</span>
                        <span>&bull;</span>
                        <span className="font-medium text-ink">{sale.customer_name}</span>
                        {sale.customer_phone && <span>({sale.customer_phone})</span>}
                        {sale.customer_gender && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-2 text-ink-2">
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
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-surface-2 text-ink-2 border border-line"
                            >
                              <span>📦</span>
                              <span>{it.product_name}</span>
                              <span className="text-ink font-semibold">({it.quantity} {it.unit})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Financial details & Action Buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                      <div className="text-right">
                        <div className="text-base sm:text-lg font-semibold tabular-nums text-ink">
                          ₹{sale.net_amount.toLocaleString('en-IN')}
                        </div>
                        {hasReturn && (
                          <div className="text-[10px] text-ink-3 line-through tabular-nums">
                            {language === 'mr' ? 'मूळ' : language === 'hi' ? 'मूल' : 'Orig'}: ₹{originalGross.toLocaleString('en-IN')}
                          </div>
                        )}
                        <div className="text-[10px] text-ink-3">
                          {sale.payment_mode === 'Split' && (
                            <span>{language === 'mr' ? 'रोख' : language === 'hi' ? 'कैश' : 'Cash'}: ₹{sale.cash_amount} | UPI: ₹{sale.online_amount}</span>
                          )}
                          {sale.discount > 0 && <span>{t('discount')}: ₹{sale.discount}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReturnTarget({
                            invoiceNo: sale.invoice_no,
                            customerName: sale.customer_name,
                            customerPhone: sale.customer_phone,
                            productId: sale.items?.[0]?.product_id
                          })}
                          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                          title="Record Customer Return"
                          className="h-8 px-2 text-xs"
                        >
                          <span className="hidden sm:inline">{language === 'mr' ? 'परतावा' : language === 'hi' ? 'वापसी' : 'Return'}</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSaleForView(sale)}
                          title={language === 'mr' ? 'बिल पाहा' : language === 'hi' ? 'बिल देखें' : 'View Bill Details'}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="w-4 h-4 text-ink-2" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(sale)}
                          title={language === 'mr' ? 'बिल संपादित करा (Edit)' : language === 'hi' ? 'बिल सुधारें (Edit)' : 'Edit Bill'}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="w-4 h-4 text-ink-2" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSaleToDelete(sale)}
                          title={language === 'mr' ? 'बिल हटवा (Delete)' : language === 'hi' ? 'बिल हटाएं (Delete)' : 'Delete Bill'}
                          className="h-8 w-8 p-0 text-danger hover:bg-danger/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(sale.id)}
                          className="h-8 w-8 p-0"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                  </div>

                  {/* Expanded Items Drawer */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-line bg-surface-2 p-3.5 rounded-xl space-y-2 text-xs">
                      <div className="font-semibold text-ink flex items-center justify-between pb-1 border-b border-line">
                        <span>{language === 'mr' ? 'बिलातील वस्तू (Active Items):' : language === 'hi' ? 'बिल का सामान (Active Items):' : 'Items in this Bill:'}</span>
                        <span className="font-semibold tabular-nums text-ink">₹{sale.net_amount}</span>
                      </div>
                      
                      {sale.items?.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-ink-2">
                          <span>{it.product_name}</span>
                          <span className="tabular-nums font-medium text-ink">
                            {it.quantity} {it.unit} &times; ₹{it.unit_price} = <b>₹{it.total_price}</b>
                          </span>
                        </div>
                      ))}

                      {/* Returned Items Box */}
                      {saleReturns.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-line space-y-1 bg-surface p-2.5 rounded-xl border border-line">
                          <div className="font-semibold text-[11px] text-ink flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <RotateCcw className="w-3.5 h-3.5 text-warn" />
                              <span>{language === 'mr' ? 'परत केलेला माल (Returned Items):' : language === 'hi' ? 'वापस किया गया सामान:' : 'Returned Items:'}</span>
                            </span>
                            <span className="font-semibold text-danger tabular-nums">-₹{totalRefundedOnSale}</span>
                          </div>
                          {saleReturns.map(sr => (
                            <div key={sr.id} className="flex justify-between items-center text-[11px] text-ink-3 py-0.5">
                              <span>&bull; {sr.product_name} ({sr.quantity} {sr.unit} &times; ₹{sr.unit_price}) &bull; #{sr.return_no}</span>
                              <span className="font-medium text-danger tabular-nums">-₹{sr.refund_amount} ({sr.refund_mode})</span>
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
          <div className="p-12 text-center text-ink-3 text-xs">
            {language === 'mr' ? 'या कालावधीत कोणतेही बिल आढळले नाही.' : language === 'hi' ? 'इस अवधि में कोई बिक्री बिल नहीं मिला।' : 'No sales bills found for this period.'}
          </div>
        )}
      </Card>

      {/* BILL VIEW & REPRINT MODAL */}
      <Modal
        isOpen={!!selectedSaleForView}
        onClose={() => setSelectedSaleForView(null)}
        title={`${language === 'mr' ? 'पावती तपशील' : language === 'hi' ? 'रसीद विवरण' : 'Receipt Details'}: ${selectedSaleForView?.invoice_no || ''}`}
        size="sm"
        footer={
          <div className="grid grid-cols-3 gap-2 w-full">
            <Button
              variant="secondary"
              size="sm"
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
              leftIcon={<Eye className="w-3.5 h-3.5" />}
            >
              {language === 'mr' ? 'पहा' : language === 'hi' ? 'देखें' : 'View'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
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
              leftIcon={<Printer className="w-3.5 h-3.5" />}
            >
              {language === 'mr' ? 'प्रिंट' : language === 'hi' ? 'प्रिंट' : 'Print'}
            </Button>

            <Button
              variant="primary"
              size="sm"
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
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              {language === 'mr' ? 'डाउनलोड' : language === 'hi' ? 'डाउनलोड' : 'Download'}
            </Button>
          </div>
        }
      >
        {selectedSaleForView && (
          <div id="printable-receipt" className="bg-surface-2 p-4 rounded-xl border border-line font-mono text-xs space-y-2">
            <div className="text-center border-b border-line pb-2">
              <div className="font-semibold text-sm text-ink">{t('shopName')}</div>
              <div className="text-[10px] text-ink-3">
                {language === 'mr' ? 'ताजे दूध, पनीर, दही, शुद्ध साजूक तूप' : language === 'hi' ? 'ताज़ा दूध, पनीर, दही, शुद्ध देसी घी' : 'Fresh Milk, Paneer, Curd, Pure Desi Ghee'}
              </div>
            </div>

            <div className="flex justify-between text-[11px] text-ink-2 pt-1">
              <span>{language === 'mr' ? 'बिल:' : language === 'hi' ? 'बिल:' : 'Bill:'} {selectedSaleForView.invoice_no}</span>
              <span>{selectedSaleForView.sale_date}</span>
            </div>
            <div className="flex justify-between text-[11px] text-ink-2">
              <span>{t('customerName')}: {selectedSaleForView.customer_name}</span>
              {selectedSaleForView.customer_gender && (
                <span className="text-[10px] text-ink-3">
                  {selectedSaleForView.customer_gender} ({selectedSaleForView.customer_age_group || (selectedSaleForView.customer_age ? `${selectedSaleForView.customer_age}y` : '')})
                </span>
              )}
            </div>

            <div className="border-t border-b border-line py-1.5 space-y-1">
              {selectedSaleForView.items && selectedSaleForView.items.length > 0 ? (
                selectedSaleForView.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-[11px] text-ink">
                    <span className="truncate max-w-[150px] font-medium">{it.product_name}</span>
                    <span className="tabular-nums">{it.quantity} {it.unit} &times; ₹{it.unit_price} = ₹{it.total_price}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-[11px] text-ink-3 py-1">
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
                <div className="border-b border-line py-1.5 space-y-0.5 bg-surface px-2 rounded-lg border">
                  <div className="text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between">
                    <span>{language === 'mr' ? 'परतावा वजावट:' : 'वापसी कटौती:'}</span>
                    <span className="text-danger font-semibold tabular-nums">-₹{viewModalRefundSum}</span>
                  </div>
                  {viewModalReturns.map((mr, idx) => (
                    <div key={idx} className="flex justify-between text-[10px] text-ink-3">
                      <span>- {mr.product_name} ({mr.quantity} {mr.unit})</span>
                      <span className="font-medium text-danger tabular-nums">-₹{mr.refund_amount}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="space-y-0.5 text-right font-semibold text-xs pt-1 text-ink">
              {selectedSaleForView.discount > 0 && (
                <div className="text-ink-3">{t('discount')} -₹{selectedSaleForView.discount}</div>
              )}
              <div className="text-sm font-semibold tabular-nums">{t('netAmount')} ₹{selectedSaleForView.net_amount}</div>
              <div className="text-[10px] font-normal text-ink-3">
                {t('paymentMethod')}: {selectedSaleForView.payment_mode}
              </div>
            </div>
          </div>
        )}
      </Modal>

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
      <Modal
        isOpen={!!editingSale}
        onClose={() => setEditingSale(null)}
        title={language === 'mr' ? 'बिल संपादित करा' : language === 'hi' ? 'बिल सुधारें' : 'Edit Invoice'}
        description={`#${editingSale?.invoice_no || ''}`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="secondary"
              onClick={() => setEditingSale(null)}
              disabled={isSavingEdit}
            >
              {language === 'mr' ? 'रद्द करा' : language === 'hi' ? 'रद्द करें' : 'Cancel'}
            </Button>

            <Button
              variant="primary"
              onClick={handleSaveEdit}
              isLoading={isSavingEdit}
              disabled={isSavingEdit || editItems.length === 0}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {language === 'mr' ? 'बदल जतन करा' : language === 'hi' ? 'बदलाव सहेजें' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        {editingSale && (
          <div className="space-y-3.5 text-xs">
            {/* Customer Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-ink-2 block mb-1.5">
                  {language === 'mr' ? 'ग्राहकाचे नाव:' : language === 'hi' ? 'ग्राहक का नाम:' : 'Customer Name:'}
                </label>
                <Input
                  type="text"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                />
              </div>
              <div>
                <label className="font-medium text-ink-2 block mb-1.5">
                  {language === 'mr' ? 'मोबाईल नंबर:' : language === 'hi' ? 'मोबाइल नंबर:' : 'Phone Number:'}
                </label>
                <Input
                  type="tel"
                  value={editCustomerPhone}
                  onChange={(e) => setEditCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Gender & Age Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-ink-2 block mb-1.5">
                  {language === 'mr' ? 'लिंग:' : language === 'hi' ? 'लिंग:' : 'Gender:'}
                </label>
                <div className="flex gap-1.5">
                  {(['Male', 'Female', 'Other'] as CustomerGender[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setEditCustomerGender(g)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition ${
                        editCustomerGender === g
                          ? 'bg-accent text-accent-fg font-semibold'
                          : 'bg-surface-2 text-ink-2 hover:text-ink'
                      }`}
                    >
                      {g === 'Male' ? '👨 पुरुष' : g === 'Female' ? '👩 महिला' : '🧑 इतर'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-medium text-ink-2 block mb-1.5">
                  {language === 'mr' ? 'वयोगट:' : language === 'hi' ? 'आयु वर्ग:' : 'Age Group:'}
                </label>
                <select
                  value={editCustomerAgeGroup}
                  onChange={(e) => setEditCustomerAgeGroup(e.target.value as CustomerAgeGroup)}
                  className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-medium shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
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
                <label className="font-medium text-ink-2 block mb-1.5">
                  {language === 'mr' ? 'पेमेंट पद्धत:' : language === 'hi' ? 'भुगतान तरीका:' : 'Payment Mode:'}
                </label>
                <select
                  value={editPaymentMode}
                  onChange={(e) => setEditPaymentMode(e.target.value as PaymentMode)}
                  className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-medium shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
                >
                  <option value="Cash">{language === 'mr' ? 'रोख (Cash)' : language === 'hi' ? 'रोकड़ (Cash)' : 'Cash'}</option>
                  <option value="Online_UPI">ऑनलाईन UPI (GPay/PhonePe)</option>
                  <option value="Udhar">{language === 'mr' ? 'उधार खाते (Udhar)' : language === 'hi' ? 'उधार खाता (Udhar)' : 'Udhar (Credit)'}</option>
                  <option value="Split">{language === 'mr' ? 'विभागून (Split)' : language === 'hi' ? 'विभाजित (Split)' : 'Split Pay'}</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-ink-2 block mb-1.5">
                  {language === 'mr' ? 'सवलत / सूट (₹):' : language === 'hi' ? 'छूट / डिस्काउंट (₹):' : 'Discount (₹):'}
                </label>
                <Input
                  type="number"
                  min="0"
                  value={editDiscount || ''}
                  placeholder="0"
                  onChange={(e) => setEditDiscount(parseFloat(e.target.value) || 0)}
                  className="text-right"
                />
              </div>
            </div>

            {/* Items in Bill */}
            <div className="space-y-2 pt-2 border-t border-line">
              <div className="flex items-center justify-between font-semibold text-ink">
                <span>{language === 'mr' ? 'बिलातील वस्तू (Items):' : language === 'hi' ? 'बिल का सामान (Items):' : 'Bill Items:'}</span>
                <span className="text-ink-3">
                  {editItems.length} {language === 'mr' ? 'वस्तू' : language === 'hi' ? 'सामान' : 'items'}
                </span>
              </div>

              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {editItems.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2 border border-line"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <span className="font-medium text-ink truncate block">{item.product_name}</span>
                      <span className="text-[10px] text-ink-3">₹{item.unit_price} / {item.unit}</span>
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
                        className="w-7 h-7 rounded-lg bg-surface border border-line flex items-center justify-center font-semibold text-ink hover:bg-surface-2 transition"
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
                        className="w-14 h-7 px-1 rounded-lg border border-line bg-surface font-semibold text-center text-ink text-xs tabular-nums"
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
                        className="w-7 h-7 rounded-lg bg-surface border border-line flex items-center justify-center font-semibold text-ink hover:bg-surface-2 transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>

                      <span className="w-16 text-right font-semibold tabular-nums text-ink">
                        ₹{item.total_price}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setEditItems(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="p-1.5 text-danger hover:bg-danger/10 rounded-lg ml-1 transition"
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
                <div className="p-3.5 rounded-2xl bg-surface-2 space-y-1 font-medium border border-line">
                  <div className="flex justify-between text-ink-3 text-xs">
                    <span>{language === 'mr' ? 'एकूण रक्कम:' : language === 'hi' ? 'कुल राशि:' : 'Subtotal:'}</span>
                    <span className="tabular-nums">₹{sub.toFixed(2)}</span>
                  </div>
                  {editDiscount > 0 && (
                    <div className="flex justify-between text-danger text-xs">
                      <span>{language === 'mr' ? 'सवलत:' : language === 'hi' ? 'छूट:' : 'Discount:'}</span>
                      <span className="tabular-nums">-₹{Number(editDiscount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-ink text-sm font-semibold pt-1 border-t border-line">
                    <span>{language === 'mr' ? 'सुधारित अंतिम देय रक्कम:' : language === 'hi' ? 'सुधारी अंतिम देय राशि:' : 'Updated Net Total:'}</span>
                    <span className="text-base tabular-nums">₹{net.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}

          </div>
        )}
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!saleToDelete}
        onClose={() => setSaleToDelete(null)}
        title={language === 'mr' ? 'बिल नक्की हटवायचे आहे का?' : language === 'hi' ? 'क्या वाकई यह बिल हटाना चाहते हैं?' : 'Delete Invoice Confirmation'}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="secondary"
              onClick={() => setSaleToDelete(null)}
              disabled={isDeleting}
            >
              {language === 'mr' ? 'रद्द करा' : language === 'hi' ? 'रद्द करें' : 'Cancel'}
            </Button>

            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              {isDeleting ? (language === 'mr' ? 'हटवत आहे...' : 'हटा रहे हैं...') : (language === 'mr' ? 'होय, हटवा' : language === 'hi' ? 'हाँ, हटाएं' : 'Yes, Delete Bill')}
            </Button>
          </div>
        }
      >
        {saleToDelete && (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-surface-2 border border-line space-y-1 text-ink-2">
              <div><strong className="text-ink">{language === 'mr' ? 'बिल क्र:' : language === 'hi' ? 'बिल क्र:' : 'Invoice:'}</strong> #{saleToDelete.invoice_no}</div>
              <div><strong className="text-ink">{language === 'mr' ? 'ग्राहक:' : language === 'hi' ? 'ग्राहक:' : 'Customer:'}</strong> {saleToDelete.customer_name}</div>
              <div><strong className="text-ink">{language === 'mr' ? 'रक्कम:' : language === 'hi' ? 'रकम:' : 'Amount:'}</strong> ₹{saleToDelete.net_amount} ({saleToDelete.payment_mode})</div>
              <div><strong className="text-ink">{language === 'mr' ? 'तारीख:' : language === 'hi' ? 'तारीख:' : 'Date:'}</strong> {saleToDelete.sale_date}</div>
            </div>

            <p className="text-[11px] text-danger font-medium">
              {language === 'mr' 
                ? '⚠️ हे बिल लेजर, दैनंदिन विक्री व Supabase क्लाऊडवरून कायमचे हटवले जाईल.' 
                : language === 'hi' 
                ? '⚠️ यह बिल लेजर, दैनिक बिक्री और Supabase क्लाउड से हमेशा के लिए हट जाएगा।' 
                : '⚠️ This bill will be permanently deleted from sales ledger and Supabase.'}
            </p>
          </div>
        )}
      </Modal>

    </div>
  );
};
