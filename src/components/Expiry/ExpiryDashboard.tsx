import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { computeExpiryStatus, ExpiryStatus } from '../../lib/shelfLifeUtils';
import { ProductBatch, DamageReason } from '../../types';
import { printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import {
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Trash2,
  Printer,
  Copy,
  Check,
  ShieldAlert,
  Calendar,
  Layers,
  Download,
  Eye
} from 'lucide-react';
import { Button, Input, SearchInput, Card, KpiCard, Badge, StatusBadge, Modal } from '../ui';

export const ExpiryDashboard: React.FC = () => {
  const { batches, products, recordDamage } = useStore();
  const { t, language } = useLanguage();

  const [activeTab, setActiveTab] = useState<ExpiryStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedAlert, setCopiedAlert] = useState(false);

  // Write-Off Modal State
  const [writeOffBatch, setWriteOffBatch] = useState<ProductBatch | null>(null);
  const [writeOffQty, setWriteOffQty] = useState<number>(0);
  const [writeOffReason, setWriteOffReason] = useState<DamageReason>('Expiry Date Over');
  const [writeOffNotes, setWriteOffNotes] = useState('');
  const [isSubmittingWriteOff, setIsSubmittingWriteOff] = useState(false);

  // Enrich batches with product info and dynamic expiry
  const enrichedBatches = useMemo(() => {
    return batches
      .filter(b => b.qty_remaining > 0)
      .map(b => {
        const prod = products.find(p => p.id === b.product_id);
        const { status, daysToExpiry } = computeExpiryStatus(b.expiry_date);
        const costValue = Number((b.qty_remaining * b.purchase_price).toFixed(2));
        const retailValue = Number((b.qty_remaining * (b.selling_price || prod?.selling_price || 0)).toFixed(2));

        return {
          ...b,
          product: prod,
          expiryStatus: status,
          daysToExpiry,
          costValue,
          retailValue
        };
      })
      .sort((a, b) => {
        if (a.expiryStatus === 'EXPIRED' && b.expiryStatus !== 'EXPIRED') return -1;
        if (a.expiryStatus !== 'EXPIRED' && b.expiryStatus === 'EXPIRED') return 1;
        return a.daysToExpiry - b.daysToExpiry;
      });
  }, [batches, products]);

  // Tab Counts & Financial KPIs
  const kpis = useMemo(() => {
    let expiredCount = 0;
    let expiredCostLoss = 0;
    let todayCount = 0;
    let todayAtRiskValue = 0;
    let tomorrowCount = 0;
    let tomorrowAtRiskValue = 0;
    let threeDaysCount = 0;
    let threeDaysAtRiskValue = 0;
    let sevenDaysCount = 0;
    let freshCount = 0;
    let totalStockCost = 0;

    enrichedBatches.forEach(b => {
      totalStockCost += b.costValue;
      if (b.expiryStatus === 'EXPIRED') {
        expiredCount += 1;
        expiredCostLoss += b.costValue;
      } else if (b.expiryStatus === 'EXPIRING_TODAY') {
        todayCount += 1;
        todayAtRiskValue += b.costValue;
      } else if (b.expiryStatus === 'EXPIRING_TOMORROW') {
        tomorrowCount += 1;
        tomorrowAtRiskValue += b.costValue;
      } else if (b.expiryStatus === 'EXPIRING_IN_3_DAYS') {
        threeDaysCount += 1;
        threeDaysAtRiskValue += b.costValue;
      } else if (b.expiryStatus === 'EXPIRING_IN_7_DAYS') {
        sevenDaysCount += 1;
      } else {
        freshCount += 1;
      }
    });

    return {
      expiredCount,
      expiredCostLoss,
      todayCount,
      todayAtRiskValue,
      tomorrowCount,
      tomorrowAtRiskValue,
      threeDaysCount,
      threeDaysAtRiskValue,
      nearExpiryRiskTotal: todayAtRiskValue + tomorrowAtRiskValue + threeDaysAtRiskValue,
      sevenDaysCount,
      freshCount,
      totalStockCost,
      totalActiveBatches: enrichedBatches.length
    };
  }, [enrichedBatches]);

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    return enrichedBatches.filter(b => {
      const prodName = b.product?.name || b.product_name || '';
      const hindiName = b.product?.hindi_name || '';
      const marathiName = b.product?.marathi_name || '';
      const batchNo = b.batch_no || '';
      const supplier = b.supplier_name || '';

      const matchesSearch =
        prodName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hindiName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        marathiName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        batchNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'All' || b.product?.category === selectedCategory;
      const matchesTab = activeTab === 'ALL' || b.expiryStatus === activeTab;

      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [enrichedBatches, searchQuery, selectedCategory, activeTab]);

  const categories = [
    { id: 'All', label: language === 'mr' ? 'सर्व वर्ग' : language === 'hi' ? 'सभी वर्ग' : 'All Categories' },
    { id: 'Milk', label: t('catMilk') },
    { id: 'Paneer & Butter', label: t('catPaneer') },
    { id: 'Curd & Chaas', label: t('catCurd') },
    { id: 'Ghee', label: t('catGhee') },
    { id: 'Sweets/Mithai', label: t('catSweets') },
    { id: 'Bakery & Extras', label: t('catBakery') }
  ];

  const getProductDisplayName = (batch: any) => {
    if (!batch.product) return batch.product_name;
    if (language === 'mr' && batch.product.marathi_name) return batch.product.marathi_name;
    if (language === 'hi' && batch.product.hindi_name) return batch.product.hindi_name;
    return batch.product.name;
  };

  // WhatsApp Alert for Near-Expiry & Expired Lots
  const handleCopyWhatsAppAlert = () => {
    const locale = language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
    const dateStr = new Date().toLocaleDateString(locale);

    const urgentItems = enrichedBatches.filter(
      b => b.expiryStatus === 'EXPIRED' || b.expiryStatus === 'EXPIRING_TODAY' || b.expiryStatus === 'EXPIRING_TOMORROW'
    );

    let text = '';
    if (language === 'mr') {
      text = `🚨 *योगेश्वरी डेअरी - तातडीचा मुदत समाप्ती अलर्ट (Expiry Risk)* 🚨\nदिनांक: ${dateStr}\n\n`;
      urgentItems.forEach((it, idx) => {
        const statusText = it.expiryStatus === 'EXPIRED' ? '❌ मुदत संपली!' : it.expiryStatus === 'EXPIRING_TODAY' ? '⚠️ आज संपत आहे!' : '🟠 उद्या संपणार!';
        text += `${idx + 1}. *${getProductDisplayName(it)}* (बॅच: ${it.batch_no})\n   👉 शिल्लक: *${it.qty_remaining} ${it.product?.unit || ''}* | स्थिती: ${statusText}\n   खरेदी किंमत नुकसान: ₹${it.costValue}\n\n`;
      });
      text += `एकूण धोक्यातील नुकसान: ₹${kpis.nearExpiryRiskTotal + kpis.expiredCostLoss}\nकृपया आजच हा माल सवलतीत विका किंवा पुरवठादारास परत करा.`;
    } else if (language === 'hi') {
      text = `🚨 *योगेश्वरी डेरी - एक्सपायरी जोखिम अलर्ट* 🚨\nतारीख: ${dateStr}\n\n`;
      urgentItems.forEach((it, idx) => {
        const statusText = it.expiryStatus === 'EXPIRED' ? '❌ एक्सपायर्ड!' : it.expiryStatus === 'EXPIRING_TODAY' ? '⚠️ आज एक्सपायर!' : '🟠 कल एक्सपायर!';
        text += `${idx + 1}. *${getProductDisplayName(it)}* (बैच: ${it.batch_no})\n   👉 शेष: *${it.qty_remaining} ${it.product?.unit || ''}* | स्थिति: ${statusText}\n   लागत मूल्य: ₹${it.costValue}\n\n`;
      });
      text += `कुल जोखिम राशि: ₹${kpis.nearExpiryRiskTotal + kpis.expiredCostLoss}\nकृपया तुरंत कार्यवाही करें। धन्यवाद!`;
    } else {
      text = `🚨 *Yogeshwari Dairy Farm - Urgent Expiry Alert* 🚨\nDate: ${dateStr}\n\n`;
      urgentItems.forEach((it, idx) => {
        const statusText = it.expiryStatus === 'EXPIRED' ? 'EXPIRED' : it.expiryStatus === 'EXPIRING_TODAY' ? 'EXPIRING TODAY' : 'EXPIRING TOMORROW';
        text += `${idx + 1}. *${it.product?.name || it.product_name}* (Batch: ${it.batch_no})\n   Qty: *${it.qty_remaining} ${it.product?.unit || ''}* | Status: ${statusText}\n   Cost Value: ₹${it.costValue}\n\n`;
      });
      text += `Total Value at Risk: ₹${kpis.nearExpiryRiskTotal + kpis.expiredCostLoss}\nAction required. Thank you!`;
    }

    navigator.clipboard.writeText(text);
    setCopiedAlert(true);
    setTimeout(() => setCopiedAlert(false), 2500);
  };

  // Open Write-Off Modal
  const openWriteOff = (batch: any) => {
    setWriteOffBatch(batch);
    setWriteOffQty(batch.qty_remaining);
    setWriteOffReason(batch.expiryStatus === 'EXPIRED' ? 'Expiry Date Over' : 'Handling Spoilage');
    setWriteOffNotes(`Batch ${batch.batch_no} written off due to expiry/spoilage`);
  };

  // Execute Write-off
  const handleConfirmWriteOff = async () => {
    if (!writeOffBatch || writeOffQty <= 0) return;
    setIsSubmittingWriteOff(true);
    try {
      const lossAmount = Number((writeOffQty * writeOffBatch.purchase_price).toFixed(2));
      await recordDamage({
        product_id: writeOffBatch.product_id,
        product_name: writeOffBatch.product?.name || writeOffBatch.product_name,
        quantity: writeOffQty,
        unit: writeOffBatch.product?.unit || 'Piece',
        estimated_loss_amount: lossAmount,
        reason: writeOffReason,
        damage_date: new Date().toISOString().split('T')[0],
        notes: writeOffNotes
      });
      setWriteOffBatch(null);
    } catch (err) {
      console.error('Error writing off expired batch:', err);
    } finally {
      setIsSubmittingWriteOff(false);
    }
  };

  const getExpiryReportPayload = () => {
    const isMr = language === 'mr';
    const isHi = language === 'hi';

    return {
      title: isMr ? 'मुदत समाप्ती व एक्सपायरी जोखीम अहवाल' : isHi ? 'एक्सपायरी डेट व जोखिम नियंत्रण रिपोर्ट' : 'Expiry Management & Risk Assessment Report',
      subtitle: isMr ? 'योगेश्वरी डेअरी फार्म & उत्पादने ERP' : isHi ? 'योगेश्वरी डेरी फार्म & उत्पाद ERP' : 'Yogeshwari Dairy Farm & Products ERP',
      periodText: isMr ? 'आजपर्यंतची सर्व बॅचेस स्थिती' : isHi ? 'आज तक का संपूर्ण बैच स्टेटस' : 'Active Batches Expiry Audit',
      language,
      kpis: [
        { label: isMr ? 'मुदत संपलेला माल' : isHi ? 'अवधि समाप्त माल' : 'Expired Stock Loss', value: `₹${kpis.expiredCostLoss.toLocaleString('en-IN')}`, color: 'rose' },
        { label: isMr ? 'आज मुदत संपणारे' : isHi ? 'आज समाप्त होने वाले' : 'Expiring Today', value: `₹${kpis.todayAtRiskValue.toLocaleString('en-IN')}`, color: 'rose' },
        { label: isMr ? '३ दिवसांत मुदत संपणारे' : isHi ? '३ दिनों में समाप्त होने वाले' : 'Expiring in 3 Days', value: `₹${kpis.nearExpiryRiskTotal.toLocaleString('en-IN')}`, color: 'amber' },
        { label: isMr ? 'एकूण सक्रिय साठा मूल्य' : isHi ? 'कुल सक्रिय स्टॉक मूल्य' : 'Active Stock Valuation', value: `₹${kpis.totalStockCost.toLocaleString('en-IN')}`, color: 'emerald' }
      ],
      table: {
        headers: isMr
          ? ['उत्पादनाचे नाव', 'बॅच क्र.', 'शिल्लक नग', 'खरेदी दर (₹)', 'विक्री दर (₹)', 'एक्सपायरी दिनांक', 'स्थिती', 'जोखीम मूल्य (₹)']
          : isHi
          ? ['सामान का नाम', 'बैच क्र.', 'शेष मात्रा', 'खरीद दर (₹)', 'बिक्री दर (₹)', 'समाप्ति तिथि', 'स्थिति', 'जोखिम मूल्य (₹)']
          : ['Product Name', 'Batch No.', 'Remaining Qty', 'Purchase Rate (₹)', 'Selling Rate (₹)', 'Expiry Date', 'Status', 'Risk Value (₹)'],
        alignments: ['left', 'center', 'right', 'right', 'right', 'center', 'center', 'right'] as ('left' | 'center' | 'right' | 'right' | 'right' | 'center' | 'center' | 'right')[],
        rows: filteredBatches.map(b => [
          getProductDisplayName(b),
          b.batch_no || '—',
          `${b.qty_remaining} ${b.product?.unit || ''}`,
          `₹${b.purchase_price}`,
          `₹${b.selling_price || b.product?.selling_price || 0}`,
          b.expiry_date,
          b.daysToExpiry < 0 
            ? (isMr ? `मुदत संपली (${Math.abs(b.daysToExpiry)} दिवस आधी)` : isHi ? `अवधि समाप्त (${Math.abs(b.daysToExpiry)} दिन पूर्व)` : `Expired (${Math.abs(b.daysToExpiry)}d ago)`) :
            b.daysToExpiry === 0 
            ? (isMr ? 'आज शेवटचा दिवस' : isHi ? 'आज अंतिम दिन' : 'Expiring Today') :
            b.daysToExpiry === 1 
            ? (isMr ? 'उद्या संपणार' : isHi ? 'कल समाप्त होगी' : 'Expiring Tomorrow') 
            : (isMr ? `${b.daysToExpiry} दिवस शिल्लक` : isHi ? `${b.daysToExpiry} दिन शेष` : `${b.daysToExpiry} days left`),
          `₹${b.costValue.toLocaleString('en-IN')}`
        ]),
        summaryRow: [
          isMr ? 'एकूण' : isHi ? 'कुल योग' : 'Total',
          `${filteredBatches.length} ${isMr ? 'बॅचेस' : isHi ? 'बैच' : 'Batches'}`,
          '',
          '',
          '',
          '',
          '',
          `₹${filteredBatches.reduce((sum, b) => sum + b.costValue, 0).toLocaleString('en-IN')}`
        ]
      },
      notes: isMr 
        ? 'FEFO नियमानुसार प्रथम मुदत संपणारा माल आधी विक्री करावा. मुदत संपलेला माल विक्रीसाठी ग्राह्य धरू नये.'
        : isHi
        ? 'FEFO नियमानुसार पहले समाप्त होने वाला माल पहले बेचें। एक्सपायर माल बिक्री में न लें।'
        : 'Strictly enforce FEFO (First-Expired, First-Out). Do not dispense expired dairy goods for retail sale.'
    };
  };

  const handleViewExpiryPDF = () => {
    viewReportPDF(getExpiryReportPayload());
  };

  const handlePrintExpiryPDF = () => {
    printReport(getExpiryReportPayload());
  };

  const handleDownloadExpiryPDF = () => {
    downloadReportPDF(getExpiryReportPayload());
  };

  return (
    <div className="space-y-5">

      {/* HEADER BANNER */}
      <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-2 text-ink-2 text-[11px] font-medium border border-line">
            <ShieldAlert className="w-3.5 h-3.5 text-danger" />
            <span>{language === 'mr' ? 'FEFO मुदत समाप्ती नियंत्रण प्रणाली' : language === 'hi' ? 'FEFO एक्सपायरी प्रबंधन' : 'FEFO Expiry Control'}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-ink flex items-center gap-2">
            <span>{language === 'mr' ? 'मुदत समाप्ती व्यवस्थापन (Expiry Dashboard)' : language === 'hi' ? 'एक्सपायरी डेट प्रबंधन (Expiry Dashboard)' : 'Expiry Management Dashboard'}</span>
          </h2>
          <p className="text-xs text-ink-3 max-w-xl font-medium">
            {language === 'mr'
              ? 'बॅचनिहाय एक्सपायरी ट्रॅकिंग, मुदत संपलेला माल तात्काळ ब्लॉक करणे, आणि नुकसान अहवाल'
              : language === 'hi'
                ? 'बैच-वाइज एक्सपायरी ट्रैकिंग, एक्सपायर्ड स्टॉक की बिक्री ब्लॉक करना और नुकसान नियंत्रण'
                : 'Batch-wise expiry monitoring, auto-blocking expired products from billing, and write-off loss tracking'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleViewExpiryPDF}
            leftIcon={<Eye className="w-4 h-4" />}
            title="View Expiry Report PDF"
          >
            {language === 'mr' ? 'पहा' : language === 'hi' ? 'देखें' : 'View'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrintExpiryPDF}
            leftIcon={<Printer className="w-4 h-4" />}
            title="Print Expiry Report"
          >
            {language === 'mr' ? 'प्रिंट' : language === 'hi' ? 'प्रिंट' : 'Print'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadExpiryPDF}
            leftIcon={<Download className="w-4 h-4" />}
            title="Download PDF Report"
          >
            PDF
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleCopyWhatsAppAlert}
            leftIcon={copiedAlert ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          >
            {copiedAlert ? (language === 'mr' ? 'कॉपी झाला!' : 'कॉपी हुआ!') : (language === 'mr' ? 'व्हाट्सॲप अलर्ट' : 'व्हाट्सएप अलर्ट')}
          </Button>
        </div>
      </Card>

      {/* 4 KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label={language === 'mr' ? 'मुदत संपलेला माल' : 'एक्सपायर्ड माल'}
          value={`₹${kpis.expiredCostLoss.toLocaleString('en-IN')}`}
          delta={`${kpis.expiredCount} ${language === 'mr' ? 'बॅचेस (विक्री बंद)' : 'बैचेस (ब्लॉक)'}`}
          deltaType="danger"
          icon={<AlertOctagon className="w-4 h-4 text-danger" />}
        />

        <KpiCard
          label={language === 'mr' ? 'धोक्यातील माल (३ दिवस)' : 'जोखिम में (3 दिन)'}
          value={`₹${kpis.nearExpiryRiskTotal.toLocaleString('en-IN')}`}
          delta={`${kpis.todayCount + kpis.tomorrowCount + kpis.threeDaysCount} ${language === 'mr' ? 'बॅचेस आधी विका' : 'बैचेस पहले बेचें'}`}
          deltaType="warn"
          icon={<AlertTriangle className="w-4 h-4 text-warn" />}
        />

        <KpiCard
          label={language === 'mr' ? 'ताजा सुरक्षित माल' : 'ताज़ा सुरक्षित स्टॉक'}
          value={`${kpis.freshCount} ${language === 'mr' ? 'बॅचेस' : 'बैचेस'}`}
          delta={language === 'mr' ? '७+ दिवस मुदत' : '7+ दिन सुरक्षित'}
          deltaType="ok"
          icon={<CheckCircle2 className="w-4 h-4 text-ok" />}
        />

        <KpiCard
          label={language === 'mr' ? 'एकूण सक्रिय बॅचेस' : 'कुल सक्रिय बैचेस'}
          value={String(kpis.totalActiveBatches)}
          delta={`₹${kpis.totalStockCost.toLocaleString('en-IN')} ${language === 'mr' ? 'खरेदी मूल्य' : 'खरीद लागत'}`}
          deltaType="neutral"
          icon={<Layers className="w-4 h-4 text-ink-3" />}
        />
      </div>

      {/* 6 EXPIRY CATEGORY TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'ALL', label: language === 'mr' ? 'सर्व बॅचेस' : 'सभी बैचेस', count: enrichedBatches.length, dot: null },
          { id: 'EXPIRED', label: language === 'mr' ? 'मुदत संपली' : 'एक्सपायर्ड', count: kpis.expiredCount, dot: 'bg-danger' },
          { id: 'EXPIRING_TODAY', label: language === 'mr' ? 'आज संपत आहे' : 'आज एक्सपायर', count: kpis.todayCount, dot: 'bg-warn' },
          { id: 'EXPIRING_TOMORROW', label: language === 'mr' ? 'उद्या संपणार' : 'कल एक्सपायर', count: kpis.tomorrowCount, dot: 'bg-warn' },
          { id: 'EXPIRING_IN_3_DAYS', label: language === 'mr' ? '३ दिवसात' : '3 दिन में', count: kpis.threeDaysCount, dot: 'bg-ok' },
          { id: 'EXPIRING_IN_7_DAYS', label: language === 'mr' ? '७ दिवसात' : '7 दिन में', count: kpis.sevenDaysCount, dot: 'bg-ok' },
          { id: 'FRESH', label: language === 'mr' ? 'ताजा माल' : 'ताजा स्टॉक', count: kpis.freshCount, dot: 'bg-ok' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-accent text-accent-fg font-semibold shadow-card'
                  : 'bg-surface text-ink-2 hover:text-ink shadow-card'
              }`}
            >
              {tab.dot && <span className={`h-1.5 w-1.5 rounded-full ${tab.dot}`} />}
              <span>{tab.label}</span>
              <span className="text-[10px] tabular-nums px-1.5 py-0.2 rounded bg-surface-2 text-ink-2">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* FILTER BAR: Search & Category */}
      <Card className="p-3.5 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'mr' ? 'उत्पादन नाव, बॅच नंबर, पुरवठादार शोधा...' : 'उत्पाद का नाम, बैच नंबर, सप्लायर खोजें...'}
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 px-3 bg-surface border border-line rounded-xl text-xs font-medium text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* BATCHES TABLE */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-2/60 border-b border-line text-ink-3 font-medium uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">{t('productNameCol')}</th>
                <th className="px-3 py-3">{language === 'mr' ? 'बॅच क्र.' : 'बैच सं.'}</th>
                <th className="px-3 py-3">{language === 'mr' ? 'पुरवठादार' : 'सप्लायर'}</th>
                <th className="px-3 py-3 text-center">{language === 'mr' ? 'शिल्लक साठा' : 'उपलब्ध स्टॉक'}</th>
                <th className="px-3 py-3 text-right">{language === 'mr' ? 'खरेदी भाव' : 'खरीद भाव'}</th>
                <th className="px-3 py-3 text-right">{language === 'mr' ? 'एकूण मूल्य' : 'कुल लागत'}</th>
                <th className="px-3 py-3">{language === 'mr' ? 'मुदत तारीख' : 'एक्सपायरी'}</th>
                <th className="px-3 py-3 text-center">{language === 'mr' ? 'स्थिती' : 'स्थिति'}</th>
                <th className="px-4 py-3 text-right">{t('actionsCol')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredBatches.length > 0 ? (
                filteredBatches.map((batch) => {
                  const isExpired = batch.expiryStatus === 'EXPIRED';
                  const isToday = batch.expiryStatus === 'EXPIRING_TODAY';
                  const isTomorrow = batch.expiryStatus === 'EXPIRING_TOMORROW';

                  return (
                    <tr
                      key={batch.id}
                      className="hover:bg-surface-2/50 transition-colors"
                    >
                      {/* Product Name */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">
                          {getProductDisplayName(batch)}
                        </div>
                        <span className="text-[11px] text-ink-3">
                          {batch.product?.category || ''}
                        </span>
                      </td>

                      {/* Batch No */}
                      <td className="px-3 py-3">
                        <Badge variant="outline" className="font-mono text-[11px]">
                          {batch.batch_no}
                        </Badge>
                      </td>

                      {/* Supplier */}
                      <td className="px-3 py-3 text-ink-2">
                        {batch.supplier_name || '—'}
                      </td>

                      {/* Remaining Qty */}
                      <td className="px-3 py-3 text-center">
                        <span className="font-semibold text-ink tabular-nums">
                          {batch.qty_remaining}
                        </span>{' '}
                        <span className="text-[11px] text-ink-3">
                          {batch.product?.unit || ''}
                        </span>
                      </td>

                      {/* Purchase Rate */}
                      <td className="px-3 py-3 text-right text-ink-2 tabular-nums">
                        ₹{batch.purchase_price}
                      </td>

                      {/* Total Cost Value */}
                      <td className="px-3 py-3 text-right font-medium text-ink tabular-nums">
                        ₹{batch.costValue.toLocaleString('en-IN')}
                      </td>

                      {/* Expiry Date */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5 text-ink font-medium">
                          <Calendar className="w-3.5 h-3.5 text-ink-3" />
                          <span>{batch.expiry_date}</span>
                        </div>
                        <span className={`text-[10px] block mt-0.5 font-medium ${
                          isExpired ? 'text-danger' : isToday || isTomorrow ? 'text-warn' : 'text-ink-3'
                        }`}>
                          {isExpired
                            ? `${Math.abs(batch.daysToExpiry)} ${language === 'mr' ? 'दिवसांपूर्वी संपली' : 'दिन पहले समाप्त'}`
                            : isToday
                              ? (language === 'mr' ? 'आजच संपत आहे!' : 'आज ही समाप्त!')
                              : isTomorrow
                                ? (language === 'mr' ? 'उद्या संपणार' : 'कल समाप्त')
                                : `${batch.daysToExpiry} ${language === 'mr' ? 'दिवस शिल्लक' : 'दिन बचे'}`}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="px-3 py-3 text-center">
                        <StatusBadge
                          status={isExpired ? 'danger' : isToday || isTomorrow ? 'warn' : 'ok'}
                        >
                          {isExpired ? 'मुदत संपली' : isToday ? 'आज संपत आहे' : isTomorrow ? 'उद्या संपणार' : 'सुरक्षित'}
                        </StatusBadge>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openWriteOff(batch)}
                          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                          className="h-8 px-2 text-danger hover:bg-danger/10 text-xs"
                          title="Record Expired Removal & Loss"
                        >
                          <span>{language === 'mr' ? 'नुकसान' : 'नुकसान'}</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-ink-3">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-ok mb-2 opacity-60" />
                    <p className="font-semibold text-sm text-ink">
                      {language === 'mr' ? 'निवडलेल्या श्रेणीत कोणतीही मुदत संपलेली बॅच नाही.' : 'चुनी गई श्रेणी में कोई एक्सपायर्ड बैच नहीं है।'}
                    </p>
                    <p className="text-xs text-ink-3 mt-1">
                      {language === 'mr' ? 'सर्व साठा सुरक्षित व ताजा आहे.' : 'सभी स्टॉक सुरक्षित और ताज़ा है।'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* WRITE-OFF MODAL DIALOG */}
      <Modal
        isOpen={!!writeOffBatch}
        onClose={() => setWriteOffBatch(null)}
        title={language === 'mr' ? 'खराब / मुदत संपलेला माल नोंदणी' : 'एक्सपायर्ड माल हटाना व नुकसान दर्ज करें'}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="secondary"
              onClick={() => setWriteOffBatch(null)}
            >
              {language === 'mr' ? 'रद्द करा' : 'रद्द करें'}
            </Button>
            <Button
              variant="danger"
              disabled={isSubmittingWriteOff || writeOffQty <= 0}
              isLoading={isSubmittingWriteOff}
              onClick={handleConfirmWriteOff}
            >
              {language === 'mr' ? 'नुकसान नोंदवा आणि साठा कमी करा' : 'नुकसान दर्ज करें'}
            </Button>
          </div>
        }
      >
        {writeOffBatch && (
          <div className="space-y-3.5 text-xs">
            <div className="bg-surface-2 p-3.5 rounded-xl border border-line space-y-1">
              <div className="text-xs text-ink-3">{language === 'mr' ? 'उत्पादन:' : 'उत्पाद:'}</div>
              <div className="font-semibold text-ink text-sm">
                {getProductDisplayName(writeOffBatch)}
              </div>
              <div className="flex items-center justify-between text-xs text-ink-2 pt-1">
                <span>बॅच क्र: <span className="font-mono font-medium text-ink">{writeOffBatch.batch_no}</span></span>
                <span>उपलब्ध: <span className="font-semibold text-danger tabular-nums">{writeOffBatch.qty_remaining} {writeOffBatch.product?.unit}</span></span>
              </div>
            </div>

            {/* Removal Quantity */}
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1.5">
                {language === 'mr' ? 'काढून टाकायची मात्रा (Quantity to Remove):' : 'हटाने की मात्रा (Quantity):'}
              </label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max={writeOffBatch.qty_remaining}
                value={writeOffQty}
                onChange={(e) => setWriteOffQty(parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Reason */}
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1.5">
                {language === 'mr' ? 'खराबीचे कारण (Reason):' : 'कारण (Reason):'}
              </label>
              <select
                value={writeOffReason}
                onChange={(e) => setWriteOffReason(e.target.value as DamageReason)}
                className="w-full h-10 px-3 bg-surface border border-line rounded-xl text-xs font-medium text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
              >
                <option value="Expiry Date Over">Expiry Date Over (मुदत संपली)</option>
                <option value="Doodh Fat Gya (Curdled)">Doodh Fat Gya (दूध फाटले / Curdled)</option>
                <option value="Theli Phat Gayi (Leaked)">Theli Phat Gayi (पाऊच लीकेज / Leaked)</option>
                <option value="Handling Spoilage">Handling Spoilage (हाताळणीत खराब)</option>
                <option value="Other">Other (इतर कारण)</option>
              </select>
            </div>

            {/* Estimated Loss Display */}
            <div className="p-3 bg-surface-2 rounded-xl border border-line flex items-center justify-between">
              <span className="text-xs font-medium text-ink-2">
                {language === 'mr' ? 'थेट आर्थिक नुकसान:' : 'कुल नुकसान राशि:'}
              </span>
              <span className="text-base font-semibold text-danger tabular-nums">
                ₹{(writeOffQty * writeOffBatch.purchase_price).toFixed(2)}
              </span>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1.5">
                {language === 'mr' ? 'तपशील / टीप (Notes):' : 'नोट्स (Notes):'}
              </label>
              <textarea
                rows={2}
                value={writeOffNotes}
                onChange={(e) => setWriteOffNotes(e.target.value)}
                className="w-full p-3 bg-surface border border-line rounded-xl text-xs text-ink placeholder:text-ink-3 shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
              />
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default ExpiryDashboard;
