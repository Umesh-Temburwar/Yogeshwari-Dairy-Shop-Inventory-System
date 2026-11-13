import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  RotateCcw, 
  Plus, 
  Search, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  DollarSign, 
  Truck, 
  Clock, 
  Printer, 
  Download, 
  RefreshCw, 
  Eye 
} from 'lucide-react';
import { printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import { SupplierReturnModal } from './SupplierReturnModal';
import { SupplierRefundStatus } from '../../types';
import { Card, KpiCard, Button, Input, SearchInput, Badge, StatusBadge, SegmentedControl } from '../ui';

interface ReturnsTrackerProps {
  onOpenReturnModal: () => void;
}

export const ReturnsTracker: React.FC<ReturnsTrackerProps> = ({ onOpenReturnModal }) => {
  const { 
    filteredReturns, 
    deleteReturn, 
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
  const getCustomerReturnsPayload = () => {
    const isMr = language === 'mr';
    const isHi = language === 'hi';

    return {
      title: isMr ? 'ग्राहक माल परतावा अहवाल' : isHi ? 'ग्राहक माल वापसी रिपोर्ट' : 'Customer Sales Returns Report',
      subtitle: isMr ? 'योगेश्वरी डेअरी फार्म & उत्पादने ERP' : isHi ? 'योगेश्वरी डेरी फार्म & उत्पाद ERP' : 'Yogeshwari Dairy Farm & Products ERP',
      periodText: isMr ? 'कालावधी ग्राहक परतावा हिशोब' : isHi ? 'अवधि ग्राहक वापसी हिसाब' : 'Customer Returns Ledger',
      language,
      kpis: [
        { label: isMr ? 'एकूण ग्राहक परतावे' : isHi ? 'कुल ग्राहक वापसी' : 'Total Returns', value: `${filteredReturns.length} ${isMr ? 'नोंदी' : isHi ? 'प्रविष्टियां' : 'Records'}`, color: 'purple' },
        { label: isMr ? 'एकूण रिफंड रक्कम' : isHi ? 'कुल रिफंड राशि' : 'Total Refund Amount', value: `₹${(metrics.totalRefundAmount || 0).toLocaleString('en-IN')}`, color: 'rose' },
        { label: isMr ? 'पुन्हा विक्रीयोग्य माल' : isHi ? 'पुनः बिक्री योग्य माल' : 'Restocked Goods', value: `${resellableCount} (${isMr ? 'नोंदी' : isHi ? 'प्रविष्टियां' : 'items'} - ₹${resellableValue})`, color: 'emerald' },
        { label: isMr ? 'खराब / नासलेला माल' : isHi ? 'खराब / क्षतिग्रस्त माल' : 'Damaged / Waste', value: `${wasteCount} (${isMr ? 'नोंदी' : isHi ? 'प्रविष्टियां' : 'items'} - ₹${wasteValue})`, color: 'amber' }
      ],
      table: {
        headers: isMr 
          ? ['परतावा क्र.', 'तारीख', 'ग्राहक नाव', 'उत्पादन', 'प्रमाण', 'कारण', 'रिफंड पद्धत', 'रक्कम (₹)']
          : isHi
          ? ['वापसी क्र.', 'दिनांक', 'ग्राहक नाम', 'उत्पाद', 'मात्रा', 'कारण', 'रिफंड माध्यम', 'राशि (₹)']
          : ['Return No.', 'Date', 'Customer Name', 'Product', 'Quantity', 'Reason', 'Refund Mode', 'Amount (₹)'],
        alignments: ['left', 'center', 'left', 'left', 'center', 'left', 'center', 'right'] as ('left' | 'center' | 'left' | 'left' | 'center' | 'left' | 'center' | 'right')[],
        rows: filteredReturns.length > 0 ? filteredReturns.map(r => [
          r.return_no,
          r.return_date,
          r.customer_name || (isMr ? 'काउंटर ग्राहक' : isHi ? 'काउंटर ग्राहक' : 'Counter Customer'),
          r.product_name,
          `${r.quantity} ${r.unit}`,
          r.reason,
          r.refund_mode === 'Cash' ? (isMr ? 'रोख' : isHi ? 'रोकड़' : 'Cash') :
          (r.refund_mode as string) === 'Online_UPI' || (r.refund_mode as string) === 'UPI' ? 'Online UPI' :
          (r.refund_mode as string) === 'Udhar_Credit' ? (isMr ? 'उधार जमा' : isHi ? 'उधार क्रेडिट' : 'Udhar Credit') :
          (r.refund_mode as string) === 'Credit_Note' ? (isMr ? 'क्रेडिट नोट' : isHi ? 'क्रेडिट नोट' : 'Credit Note') :
          r.refund_mode === 'Replacement' ? (isMr ? 'माल बदलून' : isHi ? 'बदलाव' : 'Replacement') : r.refund_mode,
          `₹${r.refund_amount.toLocaleString('en-IN')}`
        ]) : [
          ['—', '—', isMr ? 'कोणतीही परतावा नोंद नाही' : isHi ? 'कोई वापसी दर्ज नहीं' : 'No return records found', '—', '—', '—', '—', '₹0']
        ],
        summaryRow: [
          isMr ? 'एकूण' : isHi ? 'कुल योग' : 'Total',
          '',
          '',
          '',
          `${filteredReturns.length} ${isMr ? 'नोंदी' : isHi ? 'प्रविष्टियां' : 'Records'}`,
          '',
          '',
          `₹${(metrics.totalRefundAmount || 0).toLocaleString('en-IN')}`
        ]
      },
      notes: isMr 
        ? 'अधिकृत ग्राहक परतावा लेजर. परतावा पद्धत व पावती तपशील तपासून घ्यावा.'
        : isHi
        ? 'अधिकृत ग्राहक वापसी लेजर। रिफंड माध्यम व बिल रसीद सत्यापित करें।'
        : 'Official customer return audit ledger. Verify returned merchandise condition and counter invoice.'
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

  // Export Supplier Returns
  const getSupplierReturnsPayload = () => {
    const isMr = language === 'mr';
    const isHi = language === 'hi';

    return {
      title: isMr ? 'सप्लायर माल परतावा व डेबिट नोट अहवाल' : isHi ? 'सप्लायर खरीद वापसी व डेबिट नोट रिपोर्ट' : 'Supplier Purchase Returns & Debit Note Audit',
      subtitle: isMr ? 'योगेश्वरी डेअरी फार्म & उत्पादने ERP' : isHi ? 'योगेश्वरी डेरी फार्म & उत्पाद ERP' : 'Yogeshwari Dairy Farm & Products ERP',
      periodText: isMr ? 'कालावधी सप्लायर परतावा व रिफंड हिशोब' : isHi ? 'अवधि सप्लायर वापसी व रिफंड हिसाब' : 'Supplier Returns & Recoveries',
      language,
      kpis: [
        { label: isMr ? 'एकूण सप्लायर परतावे' : isHi ? 'कुल सप्लायर वापसी' : 'Total Vendor Returns', value: `${metrics.totalSupplierReturnsCount || 0} ${isMr ? 'नोंदी' : isHi ? 'प्रविष्टियां' : 'Records'}`, color: 'amber' },
        { label: isMr ? 'एकूण परतावा दावा मूल्य' : isHi ? 'कुल वापसी दावा मूल्य' : 'Total Claim Amount', value: `₹${(metrics.totalSupplierRefundAmount || 0).toLocaleString('en-IN')}`, color: 'rose' },
        { label: isMr ? 'वसूल / मिळालेला रिफंड' : isHi ? 'प्राप्त रिफंड' : 'Recovered Amount', value: `₹${(metrics.totalSupplierRefundReceived || 0).toLocaleString('en-IN')}`, color: 'emerald' },
        { label: isMr ? 'सप्लायरकडे येणे बाकी' : isHi ? 'सप्लायर से बाकी' : 'Pending From Supplier', value: `₹${(metrics.pendingSupplierRefundAmount || 0).toLocaleString('en-IN')}`, color: 'amber' }
      ],
      table: {
        headers: isMr 
          ? ['डेबिट नोट क्र.', 'तारीख', 'सप्लायर नाव', 'उत्पादन', 'प्रमाण', 'कारण', 'रिफंड रक्कम', 'स्थिती']
          : isHi
          ? ['डेबिट नोट क्र.', 'दिनांक', 'सप्लायर नाम', 'उत्पाद', 'मात्रा', 'कारण', 'रिफंड राशि', 'स्थिति']
          : ['Debit Note No.', 'Date', 'Supplier Name', 'Product', 'Quantity', 'Reason', 'Refund Amount', 'Status'],
        alignments: ['left', 'center', 'left', 'left', 'center', 'left', 'right', 'center'] as ('left' | 'center' | 'left' | 'left' | 'center' | 'left' | 'right' | 'center')[],
        rows: displayedSupplierReturns.length > 0 ? displayedSupplierReturns.map(r => [
          r.return_no,
          r.return_date,
          r.supplier_name,
          r.product_name,
          `${r.quantity} ${r.unit}`,
          r.reason,
          `₹${r.total_refund_amount.toLocaleString('en-IN')}`,
          r.refund_status === 'Refund_Received' ? (isMr ? 'रिफंड जमा' : isHi ? 'रिफंड प्राप्त' : 'Refund Received') :
          r.refund_status === 'Adjusted_In_Next_Bill' ? (isMr ? 'बिलात वजावट' : isHi ? 'बिल में कटौती' : 'Adjusted In Bill') :
          r.refund_status === 'Replacement_Received' ? (isMr ? 'माल बदलून मिळाला' : isHi ? 'बदलाव प्राप्त' : 'Replacement Received') :
          (isMr ? 'येणे बाकी' : isHi ? 'बाकी' : 'Pending')
        ]) : [
          ['—', '—', isMr ? 'कोणतीही सप्लायर परतावा नोंद नाही' : isHi ? 'कोई सप्लायर वापसी दर्ज नहीं' : 'No supplier returns found', '—', '—', '—', '₹0', '—']
        ],
        summaryRow: [
          isMr ? 'एकूण' : isHi ? 'कुल योग' : 'Total',
          '',
          '',
          '',
          `${displayedSupplierReturns.length} ${isMr ? 'नोंदी' : isHi ? 'प्रविष्टियां' : 'Records'}`,
          '',
          `₹${displayedSupplierReturns.reduce((acc, r) => acc + r.total_refund_amount, 0).toLocaleString('en-IN')}`,
          ''
        ]
      },
      notes: isMr 
        ? 'सप्लायरकडून खराब/कालबाह्य मालाचा रिफंड किंवा पुढील खरेदी बिलातून वजावट तपासून घ्यावी.'
        : isHi
        ? 'सप्लायर से खराब/अवधिपार माल का रिफंड अथवा अगले खरीद बिल में समायोजन सत्यापित करें।'
        : 'Verify supplier debit note refund claim or adjustment in subsequent purchase bill.'
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
    <div className="space-y-4 pb-20 sm:pb-6">
      
      {/* Top Header & Tab Switcher */}
      <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-ink tracking-tight flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-ink-2" />
            <span>{language === 'mr' ? 'माल परतावा व रिफंड व्यवस्थापन' : language === 'hi' ? 'सामान वापसी व रिफंड प्रबंधन' : 'Return & Refund Management'}</span>
          </h1>
          <p className="text-xs text-ink-3 mt-1 font-medium">
            {language === 'mr' 
              ? 'ग्राहकांचा परतावा आणि सप्लायरला खराब/एक्सपायर्ड माल परत पाठवण्याचा संपूर्ण हिशोब' 
              : 'ग्राहकों का रिटर्न और सप्लायर को खराब/एक्सपायर्ड माल लौटाने का पूरा हिसाब'}
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'customer' ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleViewCustomerPDF}
                leftIcon={<Eye className="w-4 h-4" />}
                title={language === 'mr' ? 'अहवाल पहा' : language === 'hi' ? 'रिपोर्ट देखें' : 'View Customer Returns PDF'}
              >
                {language === 'mr' ? 'पहा' : language === 'hi' ? 'देखें' : 'View'}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrintCustomerPDF}
                leftIcon={<Printer className="w-4 h-4" />}
                title={language === 'mr' ? 'अहवाल प्रिंट करा' : language === 'hi' ? 'रिपोर्ट प्रिंट करें' : 'Print Customer Returns Report'}
              >
                {language === 'mr' ? 'प्रिंट' : language === 'hi' ? 'प्रिंट' : 'Print'}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadCustomerPDF}
                leftIcon={<Download className="w-4 h-4" />}
                title={language === 'mr' ? 'PDF डाउनलोड करा' : language === 'hi' ? 'PDF डाउनलोड करें' : 'Download Customer Returns PDF'}
              >
                PDF
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={onOpenReturnModal}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                {language === 'mr' ? 'ग्राहक परतावा' : language === 'hi' ? 'ग्राहक वापसी' : 'Record Return'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleViewSupplierPDF}
                leftIcon={<Eye className="w-4 h-4" />}
                title={language === 'mr' ? 'अहवाल पहा' : language === 'hi' ? 'रिपोर्ट देखें' : 'View Supplier Returns PDF'}
              >
                {language === 'mr' ? 'पहा' : language === 'hi' ? 'देखें' : 'View'}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrintSupplierPDF}
                leftIcon={<Printer className="w-4 h-4" />}
                title={language === 'mr' ? 'अहवाल प्रिंट करा' : language === 'hi' ? 'रिपोर्ट प्रिंट करें' : 'Print Supplier Returns Report'}
              >
                {language === 'mr' ? 'प्रिंट' : language === 'hi' ? 'प्रिंट' : 'Print'}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadSupplierPDF}
                leftIcon={<Download className="w-4 h-4" />}
                title={language === 'mr' ? 'डेबिट नोट PDF' : language === 'hi' ? 'डेबिट नोट PDF' : 'Download PDF'}
              >
                PDF
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsSupplierModalOpen(true)}
                leftIcon={<Truck className="w-4 h-4" />}
              >
                {language === 'mr' ? 'सप्लायरला परतावा' : 'सप्लायर वापसी'}
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Main Tab Navigation */}
      <SegmentedControl
        options={[
          { value: 'customer', label: `${language === 'mr' ? 'ग्राहक परतावा' : language === 'hi' ? 'ग्राहक वापसी' : 'Customer Returns'} (${metrics.totalReturnsCount})` },
          { value: 'supplier', label: `${language === 'mr' ? 'सप्लायर परतावा' : language === 'hi' ? 'सप्लायर वापसी' : 'Supplier Returns'} (${metrics.totalSupplierReturnsCount || 0})` },
        ]}
        value={activeTab}
        onChange={(val) => setActiveTab(val as any)}
      />

      {/* ================= TAB 1: CUSTOMER RETURNS ================= */}
      {activeTab === 'customer' && (
        <div className="space-y-4">
          {/* KPI Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label={language === 'mr' ? 'एकूण ग्राहक परतावे' : 'कुल ग्राहक वापसी'}
              value={String(metrics.totalReturnsCount)}
              delta={`₹${metrics.totalRefundAmount.toFixed(0)}`}
              deltaType="danger"
              icon={<RotateCcw className="w-4 h-4 text-ink-3" />}
            />

            <KpiCard
              label={language === 'mr' ? 'आजचा ग्राहक रिफंड' : 'आज का रिफंड'}
              value={`₹${metrics.todayRefundAmount.toFixed(0)}`}
              delta={language === 'mr' ? 'आज अदा केला' : 'आज दिया'}
              deltaType="warn"
              icon={<DollarSign className="w-4 h-4 text-ink-3" />}
            />

            <KpiCard
              label={language === 'mr' ? 'पुन्हा स्टॉकमध्ये' : 'पुनः स्टॉक में'}
              value={String(resellableCount)}
              delta={`₹${resellableValue.toFixed(0)}`}
              deltaType="ok"
              icon={<CheckCircle className="w-4 h-4 text-ok" />}
            />

            <KpiCard
              label={language === 'mr' ? 'खराब / नुकसान' : 'खराब / नुकसान'}
              value={String(wasteCount)}
              delta={`₹${wasteValue.toFixed(0)}`}
              deltaType="danger"
              icon={<AlertTriangle className="w-4 h-4 text-danger" />}
            />
          </div>

          {/* Filter Bar */}
          <Card className="p-3 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="flex-1">
              <SearchInput
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={language === 'mr' ? 'उत्पादन, पावती क्र., ग्राहक किंवा बिल शोधा...' : 'उत्पाद, रसीद सं., ग्राहक खोजें...'}
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={conditionFilter}
                onChange={e => setConditionFilter(e.target.value as any)}
                className="h-10 px-3 rounded-xl bg-surface border border-line text-xs font-medium text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
              >
                <option value="all">{language === 'mr' ? 'सर्व स्थिती' : 'सभी स्थितियां'}</option>
                <option value="Resellable">{language === 'mr' ? 'चांगला माल (स्टॉक)' : 'अच्छा माल (स्टॉक)'}</option>
                <option value="Damaged_Waste">{language === 'mr' ? 'खराब / नासलेला (नुकसान)' : 'खराब (नुकसान)'}</option>
              </select>

              <select
                value={timeFilter}
                onChange={e => setTimeFilter(e.target.value as any)}
                className="h-10 px-3 rounded-xl bg-surface border border-line text-xs font-medium text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
              >
                <option value="today">{language === 'mr' ? 'आज' : 'आज'}</option>
                <option value="week">{language === 'mr' ? 'या आठवड्यात' : 'इस सप्ताह'}</option>
                <option value="month">{language === 'mr' ? 'या महिन्यात' : 'इस माह'}</option>
                <option value="all">{language === 'mr' ? 'सर्व' : 'सभी'}</option>
              </select>
            </div>
          </Card>

          {/* Customer Returns Table */}
          {displayedCustomerReturns.length === 0 ? (
            <Card className="p-8 sm:p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-surface-2 text-ink-3 flex items-center justify-center mx-auto">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-ink">
                {language === 'mr' ? 'कोणतीही ग्राहक परतावा नोंद आढळली नाही' : 'कोई ग्राहक वापसी प्रविष्टि नहीं मिली'}
              </h3>
              <p className="text-xs text-ink-3 max-w-sm mx-auto font-medium">
                {language === 'mr' ? 'ग्राहकाने परत केलेल्या मालाची नोंद करण्यासाठी बटणावर क्लिक करा.' : 'ग्राहक द्वारा वापस किए गए सामान को दर्ज करने के लिए बटन पर क्लिक करें।'}
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenReturnModal}
              >
                + {language === 'mr' ? 'ग्राहक परतावा नोंदवा' : 'ग्राहक वापसी दर्ज करें'}
              </Button>
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-2/60 text-ink-3 font-medium uppercase tracking-wider text-[11px] border-b border-line">
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
                  <tbody className="divide-y divide-line">
                    {displayedCustomerReturns.map(r => (
                      <tr key={r.id} className="hover:bg-surface-2/50 transition">
                        <td className="p-3.5 font-mono font-medium text-ink">
                          <span>{r.return_no}</span>
                          {r.invoice_no && (
                            <span className="block text-[10px] text-ink-3 font-sans">
                              #{r.invoice_no}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-ink-2 whitespace-nowrap">{r.return_date}</td>
                        <td className="p-3.5 font-medium text-ink">
                          {r.product_name}
                          {r.customer_name && <span className="block text-[10px] text-ink-3">{r.customer_name}</span>}
                        </td>
                        <td className="p-3.5 text-ink font-semibold tabular-nums">{r.quantity} {r.unit}</td>
                        <td className="p-3.5 font-semibold text-danger tabular-nums">₹{r.refund_amount.toFixed(2)}</td>
                        <td className="p-3.5">
                          <Badge variant="default" className="text-[10px]">{r.refund_mode}</Badge>
                        </td>
                        <td className="p-3.5">
                          <StatusBadge status={r.condition === 'Resellable' ? 'ok' : 'warn'}>
                            {r.condition === 'Resellable' 
                              ? (language === 'mr' ? 'चांगला' : 'अच्छा')
                              : (language === 'mr' ? 'खराब' : 'खराब')}
                          </StatusBadge>
                        </td>
                        <td className="p-3.5 text-ink-3 text-[11px] max-w-[150px] truncate" title={r.reason}>{r.reason}</td>
                        <td className="p-3.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCustomerReturn(r.id, r.return_no)}
                            className="h-7 w-7 p-0 text-danger hover:bg-danger/10 ml-auto"
                            title="Delete Return Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ================= TAB 2: SUPPLIER RETURNS ================= */}
      {activeTab === 'supplier' && (
        <div className="space-y-4">
          {/* Supplier Return KPI Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label={language === 'mr' ? 'सप्लायर परतावे' : 'सप्लायर वापसी'}
              value={String(metrics.totalSupplierReturnsCount || 0)}
              delta={`₹${(metrics.totalSupplierRefundAmount || 0).toLocaleString('en-IN')}`}
              deltaType="warn"
              icon={<Truck className="w-4 h-4 text-ink-3" />}
            />

            <KpiCard
              label={language === 'mr' ? 'रिफंड वसूल / जमा' : 'रिफंड प्राप्त'}
              value={`₹${(metrics.totalSupplierRefundReceived || 0).toLocaleString('en-IN')}`}
              delta={language === 'mr' ? 'जमा' : 'प्राप्त'}
              deltaType="ok"
              icon={<DollarSign className="w-4 h-4 text-ok" />}
            />

            <KpiCard
              label={language === 'mr' ? 'सप्लायरकडे येणे बाकी' : 'सप्लायर से बाकी'}
              value={`₹${(metrics.pendingSupplierRefundAmount || 0).toLocaleString('en-IN')}`}
              delta={language === 'mr' ? 'पुढील बिलात वजा' : 'अगले बिल से काटें'}
              deltaType="danger"
              icon={<Clock className="w-4 h-4 text-danger" />}
            />

            <KpiCard
              label={language === 'mr' ? 'बदल्यात नवीन माल' : 'बदले में नया माल'}
              value={String(metrics.supplierReplacementCount || 0)}
              delta={language === 'mr' ? 'बदलून मिळाले' : 'बदले गए'}
              deltaType="neutral"
              icon={<RefreshCw className="w-4 h-4 text-ink-3" />}
            />
          </div>

          {/* Filter Bar for Supplier Returns */}
          <Card className="p-3 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="flex-1">
              <SearchInput
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={language === 'mr' ? 'सप्लायर, उत्पादन, बॅच किंवा डेबिट नोट शोधा...' : 'सप्लायर, उत्पाद, बैच खोजें...'}
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={supplierStatusFilter}
                onChange={e => setSupplierStatusFilter(e.target.value as any)}
                className="h-10 px-3 rounded-xl bg-surface border border-line text-xs font-medium text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
              >
                <option value="all">{language === 'mr' ? 'सर्व रिफंड स्थिती' : 'सभी स्थितियां'}</option>
                <option value="Pending">{language === 'mr' ? 'येणे बाकी (Pending)' : 'बाकी (Pending)'}</option>
                <option value="Refund_Received">{language === 'mr' ? 'रिफंड जमा' : 'रिफंड प्राप्त'}</option>
                <option value="Adjusted_In_Next_Bill">{language === 'mr' ? 'बिलात वजावट' : 'बिल में कटौती'}</option>
                <option value="Replacement_Received">{language === 'mr' ? 'बदलून नवीन माल' : 'बदले में नया माल'}</option>
              </select>

              <select
                value={timeFilter}
                onChange={e => setTimeFilter(e.target.value as any)}
                className="h-10 px-3 rounded-xl bg-surface border border-line text-xs font-medium text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
              >
                <option value="today">{language === 'mr' ? 'आज' : 'आज'}</option>
                <option value="week">{language === 'mr' ? 'या आठवड्यात' : 'इस सप्ताह'}</option>
                <option value="month">{language === 'mr' ? 'या महिन्यात' : 'इस माह'}</option>
                <option value="all">{language === 'mr' ? 'सर्व' : 'सभी'}</option>
              </select>
            </div>
          </Card>

          {/* Supplier Returns List / Table */}
          {displayedSupplierReturns.length === 0 ? (
            <Card className="p-8 sm:p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-surface-2 text-ink-3 flex items-center justify-center mx-auto">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-ink">
                {language === 'mr' ? 'कोणतीही सप्लायर परतावा नोंद नाही' : 'कोई सप्लायर वापसी प्रविष्टि नहीं मिली'}
              </h3>
              <p className="text-xs text-ink-3 max-w-sm mx-auto font-medium">
                {language === 'mr' 
                  ? 'दुकानात आलेला खराब किंवा एक्सपायर्ड माल सप्लायरला परत पाठवण्यासाठी बटणावर क्लिक करा.' 
                  : 'खराब या एक्सपायर माल सप्लायर को लौटाने के लिए बटन पर क्लिक करें।'}
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsSupplierModalOpen(true)}
              >
                + {language === 'mr' ? 'सप्लायरला माल परत करा' : 'सप्लायर को माल वापस करें'}
              </Button>
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-2/60 text-ink-3 font-medium uppercase tracking-wider text-[11px] border-b border-line">
                    <tr>
                      <th className="p-3.5">{language === 'mr' ? 'डेबिट नोट क्र.' : 'डेबिट नोट सं.'}</th>
                      <th className="p-3.5">{language === 'mr' ? 'तारीख' : 'दिनांक'}</th>
                      <th className="p-3.5">{language === 'mr' ? 'सप्लायर नाव' : 'सप्लायर'}</th>
                      <th className="p-3.5">{language === 'mr' ? 'उत्पादन' : 'उत्पाद'}</th>
                      <th className="p-3.5">{language === 'mr' ? 'प्रमाण' : 'मात्रा'}</th>
                      <th className="p-3.5">{language === 'mr' ? 'रिफंड दावा' : 'रिफंड दावा'}</th>
                      <th className="p-3.5">{language === 'mr' ? 'कारण' : 'कारण'}</th>
                      <th className="p-3.5">{language === 'mr' ? 'स्थिती' : 'स्थिति'}</th>
                      <th className="p-3.5 text-right">{language === 'mr' ? 'कृती' : 'कार्रवाई'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {displayedSupplierReturns.map(r => (
                      <tr key={r.id} className="hover:bg-surface-2/50 transition">
                        <td className="p-3.5 font-mono font-medium text-ink">
                          {r.return_no}
                          {r.batch_no && <span className="block text-[10px] text-ink-3 font-sans">बॅच: {r.batch_no}</span>}
                        </td>
                        <td className="p-3.5 text-ink-2 whitespace-nowrap">{r.return_date}</td>
                        <td className="p-3.5 font-medium text-ink">{r.supplier_name}</td>
                        <td className="p-3.5 font-medium text-ink">{r.product_name}</td>
                        <td className="p-3.5 text-ink font-semibold tabular-nums">{r.quantity} {r.unit}</td>
                        <td className="p-3.5 font-semibold text-ok tabular-nums">
                          ₹{r.total_refund_amount.toLocaleString('en-IN')}
                          <span className="block text-[10px] text-ink-3 font-normal">@ ₹{r.purchase_price}/{r.unit}</span>
                        </td>
                        <td className="p-3.5 text-ink-3 text-[11px] max-w-[140px] truncate" title={r.reason}>
                          {r.reason}
                        </td>
                        <td className="p-3.5">
                          <div className="space-y-1">
                            <StatusBadge status={
                              r.refund_status === 'Refund_Received' ? 'ok' :
                              r.refund_status === 'Adjusted_In_Next_Bill' ? 'neutral' :
                              r.refund_status === 'Replacement_Received' ? 'ok' : 'danger'
                            }>
                              {r.refund_status === 'Refund_Received' ? 'रिफंड जमा' :
                               r.refund_status === 'Adjusted_In_Next_Bill' ? 'बिलात वजावट' :
                               r.refund_status === 'Replacement_Received' ? 'नवीन माल' : 'येणे बाकी'}
                            </StatusBadge>

                            {/* Quick Action buttons for pending refunds */}
                            {r.refund_status === 'Pending' && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => updateSupplierRefundStatus(r.id, 'Refund_Received', 'Cash')}
                                  className="h-5 px-1.5 text-[9px]"
                                >
                                  + रिफंड
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => updateSupplierRefundStatus(r.id, 'Adjusted_In_Next_Bill', 'Credit_Deduction')}
                                  className="h-5 px-1.5 text-[9px]"
                                >
                                  + वजा
                                </Button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSupplierReturn(r.id, r.return_no)}
                            className="h-7 w-7 p-0 text-danger hover:bg-danger/10 ml-auto"
                            title="Delete Supplier Return Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
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

export default ReturnsTracker;
