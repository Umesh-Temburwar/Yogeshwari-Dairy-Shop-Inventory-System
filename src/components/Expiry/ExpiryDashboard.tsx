import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { computeExpiryStatus, ExpiryStatus } from '../../lib/shelfLifeUtils';
import { ProductBatch, DamageReason } from '../../types';
import { exportReportToPDF } from '../../lib/exportUtils';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Trash2,
  Printer,
  Copy,
  Check,
  Search,
  Filter,
  ShieldAlert,
  Calendar,
  Layers,
  IndianRupee,
  TrendingDown,
  FileText,
  X
} from 'lucide-react';

export const ExpiryDashboard: React.FC = () => {
  const { batches, products, recordDamage, adjustStock } = useStore();
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
        // Expired first, then earliest expiry
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

  const handleDownloadExpiryPDF = () => {
    exportReportToPDF({
      title: language === 'mr' ? 'मुदत समाप्ती व एक्सपायरी जोखीम अहवाल' : language === 'hi' ? 'एक्सपायरी डेट व जोखिम रिपोर्ट' : 'Expiry Management & Risk Assessment Report',
      subtitle: 'Yogeshwari Dairy Farm & Sweets ERP — Batch Expiry Control',
      periodText: language === 'mr' ? 'आजपर्यंतची सर्व बॅचेस स्थिती' : 'आज तक का संपूर्ण बैच स्टेटस',
      kpis: [
        { label: 'मुदत संपलेला माल (Expired)', value: `₹${kpis.expiredCostLoss.toLocaleString('en-IN')}`, color: 'rose' },
        { label: 'आज एक्सपायर होणारे (Today)', value: `₹${kpis.todayAtRiskValue.toLocaleString('en-IN')}`, color: 'rose' },
        { label: '३ दिवसांत मुदत संपणारे (In 3 Days)', value: `₹${kpis.nearExpiryRiskTotal.toLocaleString('en-IN')}`, color: 'amber' },
        { label: 'एकूण सक्रिय साठा (Active Cost)', value: `₹${kpis.totalStockCost.toLocaleString('en-IN')}`, color: 'emerald' }
      ],
      table: {
        headers: ['उत्पादन (Product)', 'बॅच क्र.', 'शिल्लक नग', 'खरेदी दर', 'विक्री दर', 'एक्सपायरी दिनांक', 'स्थिती (Status)', 'जोखीम मूल्य (₹)'],
        alignments: ['left', 'center', 'right', 'right', 'right', 'center', 'center', 'right'],
        rows: filteredBatches.map(b => [
          getProductDisplayName(b),
          b.batch_no || '—',
          `${b.qty_remaining} ${b.product?.unit || ''}`,
          `₹${b.purchase_price}`,
          `₹${b.selling_price || b.product?.selling_price || 0}`,
          b.expiry_date,
          b.daysToExpiry < 0 ? `मुदत संपली (${Math.abs(b.daysToExpiry)} दिवस आधी)` :
            b.daysToExpiry === 0 ? 'आज शेवटचा दिवस' :
              b.daysToExpiry === 1 ? 'उद्या संपणार' : `${b.daysToExpiry} दिवस शिल्लक`,
          `₹${b.costValue.toLocaleString('en-IN')}`
        ]),
        summaryRow: [
          'एकूण (Total)',
          `${filteredBatches.length} बॅचेस`,
          '',
          '',
          '',
          '',
          '',
          `₹${filteredBatches.reduce((sum, b) => sum + b.costValue, 0).toLocaleString('en-IN')}`
        ]
      },
      notes: 'FEFO नियमानुसार प्रथम मुदत संपणारा माल आधी विक्री करावा. मुदत संपलेला माल विक्रीसाठी ग्राह्य धरू नये.'
    });
  };

  return (
    <div className="space-y-6">

      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 dark:from-[#1E0F14] dark:via-[#131F1B] dark:to-[#0F1A17] p-6 rounded-3xl text-white shadow-md border border-rose-900/40 dark:border-[#24352F] transition-colors">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-900/60 dark:bg-rose-950/60 text-xs font-semibold text-rose-200 border border-rose-700/50 dark:border-rose-800/50">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>{language === 'mr' ? 'FEFO मुदत समाप्ती नियंत्रण प्रणाली' : language === 'hi' ? 'FEFO एक्सपायरी प्रबंधन' : 'FEFO Expiry Control'}</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>{language === 'mr' ? 'मुदत समाप्ती व्यवस्थापन डॅशबोर्ड (Expiry Dashboard)' : language === 'hi' ? 'एक्सपायरी डेट प्रबंधन डैशबोर्ड (Expiry Dashboard)' : 'Expiry Management Dashboard'}</span>
          </h2>
          <p className="text-rose-100/80 dark:text-[#8FA69C] text-xs max-w-xl">
            {language === 'mr'
              ? 'बॅचनिहाय एक्सपायरी ट्रॅकिंग, मुदत संपलेला माल तात्काळ ब्लॉक करणे, आणि नुकसान अहवाल'
              : language === 'hi'
                ? 'बैच-वाइज एक्सपायरी ट्रैकिंग, एक्सपायर्ड स्टॉक की बिक्री ब्लॉक करना और नुकसान नियंत्रण'
                : 'Batch-wise expiry monitoring, auto-blocking expired products from billing, and write-off loss tracking'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadExpiryPDF}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
            title="Download PDF Report"
          >
            <FileText className="w-4 h-4" />
            <span>{language === 'mr' ? 'एक्सपायरी PDF' : language === 'hi' ? 'एक्सपायरी PDF' : 'Download Expiry PDF'}</span>
          </button>

          <button
            onClick={handleCopyWhatsAppAlert}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
          >
            {copiedAlert ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedAlert ? (language === 'mr' ? 'अलर्ट कॉपी झाला!' : 'अलर्ट कॉपी हुआ!') : (language === 'mr' ? 'व्हाट्सॲप रिस्क अलर्ट' : 'व्हाट्सएप अलर्ट')}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/20 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>{t('print')}</span>
          </button>
        </div>
      </div>

      {/* 4 KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Expired Loss Card */}
        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-rose-200 dark:border-rose-950/60 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="text-xs font-bold uppercase tracking-wider">{language === 'mr' ? 'मुदत संपलेला माल' : 'एक्सपायर्ड माल'}</span>
            <AlertOctagon className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-2 block tabular-nums">
            ₹{kpis.expiredCostLoss.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] font-semibold text-rose-600/80 dark:text-rose-400/80">
            {kpis.expiredCount} {language === 'mr' ? 'बॅचेस (काउंटरवर विक्री बंद)' : 'बैचेस (बिक्री ब्लॉक है)'}
          </span>
        </div>

        {/* Near Expiry at Risk Card */}
        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-amber-200 dark:border-amber-950/60 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-xs font-bold uppercase tracking-wider">{language === 'mr' ? 'धोक्यातील माल (३ दिवस)' : 'जोखिम में (3 दिन)'}</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-2 block tabular-nums">
            ₹{kpis.nearExpiryRiskTotal.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] font-semibold text-amber-600/80 dark:text-amber-400/80">
            {kpis.todayCount + kpis.tomorrowCount + kpis.threeDaysCount} {language === 'mr' ? 'बॅचेस आधी विका' : 'बैचेस पहले बेचें'}
          </span>
        </div>

        {/* Fresh Stock Safe Card */}
        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-emerald-200 dark:border-emerald-950/60 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-xs font-bold uppercase tracking-wider">{language === 'mr' ? 'ताजा सुरक्षित माल' : 'ताज़ा सुरक्षित स्टॉक'}</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-2 block tabular-nums">
            {kpis.freshCount} {language === 'mr' ? 'बॅचेस' : 'बैचेस'}
          </span>
          <span className="text-[11px] font-semibold text-emerald-600/80 dark:text-emerald-400/80">
            {language === 'mr' ? '७ दिवसांपेक्षा जास्त मुदत' : '7 दिन से अधिक सुरक्षित'}
          </span>
        </div>

        {/* Total Monitored Batches */}
        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#8FA69C]">
            <span className="text-xs font-bold uppercase tracking-wider">{language === 'mr' ? 'एकूण सक्रिय बॅचेस' : 'कुल सक्रिय बैचेस'}</span>
            <Layers className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-2 block tabular-nums">
            {kpis.totalActiveBatches}
          </span>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-[#8FA69C]">
            ₹{kpis.totalStockCost.toLocaleString('en-IN')} {language === 'mr' ? 'एकूण खरेदी मूल्य' : 'कुल खरीद लागत'}
          </span>
        </div>
      </div>

      {/* 6 EXPIRY CATEGORY TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {[
          { id: 'ALL', label: language === 'mr' ? 'सर्व बॅचेस' : 'सभी बैचेस', count: enrichedBatches.length, color: 'bg-slate-900 text-white dark:bg-emerald-600' },
          { id: 'EXPIRED', label: language === 'mr' ? '🔴 मुदत संपली' : '🔴 एक्सपायर्ड', count: kpis.expiredCount, color: 'bg-rose-600 text-white' },
          { id: 'EXPIRING_TODAY', label: language === 'mr' ? '🟠 आज संपत आहे' : '🟠 आज एक्सपायर', count: kpis.todayCount, color: 'bg-orange-600 text-white' },
          { id: 'EXPIRING_TOMORROW', label: language === 'mr' ? '🟡 उद्या संपणार' : '🟡 कल एक्सपायर', count: kpis.tomorrowCount, color: 'bg-amber-600 text-white' },
          { id: 'EXPIRING_IN_3_DAYS', label: language === 'mr' ? '🔵 ३ दिवसात' : '🔵 3 दिन में', count: kpis.threeDaysCount, color: 'bg-blue-600 text-white' },
          { id: 'EXPIRING_IN_7_DAYS', label: language === 'mr' ? '🟣 ७ दिवसात' : '🟣 7 दिन में', count: kpis.sevenDaysCount, color: 'bg-purple-600 text-white' },
          { id: 'FRESH', label: language === 'mr' ? '🟢 ताजा माल' : '🟢 ताजा स्टॉक', count: kpis.freshCount, color: 'bg-emerald-600 text-white' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${isActive
                ? `${tab.color} shadow-sm scale-102`
                : 'bg-white dark:bg-[#131F1B] border border-slate-200/90 dark:border-[#24352F] text-slate-700 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#1A2A25]'
                }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${isActive ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C]'
                }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* FILTER BAR: Search & Category */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-[#131F1B] p-3 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'mr' ? 'उत्पादन नाव, बॅच नंबर, पुरवठादार शोधा...' : 'उत्पाद का नाम, बैच नंबर, सप्लायर खोजें...'}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* BATCHES TABLE */}
      <div className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#1A2A25] border-b border-slate-200 dark:border-[#24352F] text-slate-600 dark:text-[#8FA69C] font-bold uppercase">
              <tr>
                <th className="px-4 py-3">{t('productNameCol')}</th>
                <th className="px-3 py-3">{language === 'mr' ? 'बॅच क्र.' : 'बैच सं.'}</th>
                <th className="px-3 py-3">{language === 'mr' ? 'पुरवठादार' : 'सप्लायर'}</th>
                <th className="px-3 py-3 text-center">{language === 'mr' ? 'शिल्लक साठा' : 'उपलब्ध स्टॉक'}</th>
                <th className="px-3 py-3 text-right">{language === 'mr' ? 'खरेदी भाव' : 'खरीद भाव'}</th>
                <th className="px-3 py-3 text-right">{language === 'mr' ? 'एकूण मूल्य' : 'कुल लागत'}</th>
                <th className="px-3 py-3">{language === 'mr' ? 'मुदत समाप्ती तारीख' : 'एक्सपायरी तारीख'}</th>
                <th className="px-3 py-3 text-center">{language === 'mr' ? 'स्थिती' : 'स्थिति'}</th>
                <th className="px-4 py-3 text-right">{t('actionsCol')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#24352F]">
              {filteredBatches.length > 0 ? (
                filteredBatches.map((batch) => {
                  const isExpired = batch.expiryStatus === 'EXPIRED';
                  const isToday = batch.expiryStatus === 'EXPIRING_TODAY';
                  const isTomorrow = batch.expiryStatus === 'EXPIRING_TOMORROW';

                  return (
                    <tr
                      key={batch.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-[#1A2A25]/60 transition-colors ${isExpired ? 'bg-rose-50/40 dark:bg-rose-950/20' : isToday ? 'bg-orange-50/40 dark:bg-orange-950/20' : ''
                        }`}
                    >
                      {/* Product Name */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {getProductDisplayName(batch)}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                          {batch.product?.category || ''}
                        </span>
                      </td>

                      {/* Batch No */}
                      <td className="px-3 py-3">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A2A25] text-slate-700 dark:text-[#8FA69C] border border-slate-200 dark:border-[#24352F]">
                          {batch.batch_no}
                        </span>
                      </td>

                      {/* Supplier */}
                      <td className="px-3 py-3 text-slate-600 dark:text-[#8FA69C]">
                        {batch.supplier_name || '—'}
                      </td>

                      {/* Remaining Qty */}
                      <td className="px-3 py-3 text-center">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {batch.qty_remaining}
                        </span>{' '}
                        <span className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                          {batch.product?.unit || ''}
                        </span>
                      </td>

                      {/* Purchase Rate */}
                      <td className="px-3 py-3 text-right text-slate-700 dark:text-[#8FA69C] font-semibold">
                        ₹{batch.purchase_price}
                      </td>

                      {/* Total Cost Value */}
                      <td className="px-3 py-3 text-right font-bold text-slate-900 dark:text-white">
                        ₹{batch.costValue.toLocaleString('en-IN')}
                      </td>

                      {/* Expiry Date */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800 dark:text-[#E7F0EC]">
                            {batch.expiry_date}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold block mt-0.5 ${isExpired ? 'text-rose-600 dark:text-rose-400' : isToday ? 'text-orange-600 dark:text-orange-400' : 'text-slate-500'
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
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${isExpired
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                          : isToday
                            ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900'
                            : isTomorrow
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                              : batch.expiryStatus === 'EXPIRING_IN_3_DAYS'
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                          }`}>
                          {isExpired ? 'मुदत संपली (Blocked)' : isToday ? 'आज संपत आहे' : isTomorrow ? 'उद्या संपणार' : 'सुरक्षित साठा'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openWriteOff(batch)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors"
                          title="Record Expired Removal & Loss"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{language === 'mr' ? 'नुकसान नोंदवा' : 'नुकसान दर्ज करें'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500 dark:text-[#8FA69C]">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-60" />
                    <p className="font-bold text-sm">
                      {language === 'mr' ? 'निवडलेल्या श्रेणीत कोणतीही मुदत संपलेली बॅच नाही.' : 'चुनी गई श्रेणी में कोई एक्सपायर्ड बैच नहीं है।'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {language === 'mr' ? 'सर्व साठा सुरक्षित व ताजा आहे.' : 'सभी स्टॉक सुरक्षित और ताज़ा है।'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* WRITE-OFF MODAL DIALOG */}
      {writeOffBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#131F1B] max-w-md w-full rounded-2xl border border-slate-200 dark:border-[#24352F] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#24352F]">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertOctagon className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {language === 'mr' ? 'खराब / मुदत संपलेला माल नोंदणी' : 'एक्सपायर्ड माल हटाना व नुकसान दर्ज करें'}
                </h3>
              </div>
              <button
                onClick={() => setWriteOffBatch(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1A2A25]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-[#1A2A25] p-3 rounded-xl border border-slate-200/80 dark:border-[#24352F] space-y-1">
              <div className="text-xs text-slate-500 dark:text-[#8FA69C]">{language === 'mr' ? 'उत्पादन:' : 'उत्पाद:'}</div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {getProductDisplayName(writeOffBatch)}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-[#8FA69C] pt-1">
                <span>बॅच क्र: <span className="font-mono font-bold text-slate-800 dark:text-white">{writeOffBatch.batch_no}</span></span>
                <span>उपलब्ध: <span className="font-bold text-rose-600">{writeOffBatch.qty_remaining} {writeOffBatch.product?.unit}</span></span>
              </div>
            </div>

            {/* Removal Quantity */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                {language === 'mr' ? 'काढून टाकायची मात्रा (Quantity to Remove):' : 'हटाने की मात्रा (Quantity):'}
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max={writeOffBatch.qty_remaining}
                value={writeOffQty}
                onChange={(e) => setWriteOffQty(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                {language === 'mr' ? 'खराबीचे कारण (Reason):' : 'कारण (Reason):'}
              </label>
              <select
                value={writeOffReason}
                onChange={(e) => setWriteOffReason(e.target.value as DamageReason)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="Expiry Date Over">Expiry Date Over (मुदत संपली)</option>
                <option value="Doodh Fat Gya (Curdled)">Doodh Fat Gya (दूध फाटले / Curdled)</option>
                <option value="Theli Phat Gayi (Leaked)">Theli Phat Gayi (पाऊच लीकेज / Leaked)</option>
                <option value="Handling Spoilage">Handling Spoilage (हाताळणीत खराब)</option>
                <option value="Other">Other (इतर कारण)</option>
              </select>
            </div>

            {/* Estimated Loss Display */}
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 dark:text-rose-300">
                {language === 'mr' ? 'थेट आर्थिक नुकसान (Loss Amount):' : 'कुल नुकसान राशि:'}
              </span>
              <span className="text-base font-black text-rose-700 dark:text-rose-400 tabular-nums">
                ₹{(writeOffQty * writeOffBatch.purchase_price).toFixed(2)}
              </span>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                {language === 'mr' ? 'तपशील / टीप (Notes):' : 'नोट्स (Notes):'}
              </label>
              <textarea
                rows={2}
                value={writeOffNotes}
                onChange={(e) => setWriteOffNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWriteOffBatch(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#1A2A25]"
              >
                {language === 'mr' ? 'रद्द करा' : 'रद्द करें'}
              </button>
              <button
                type="button"
                disabled={isSubmittingWriteOff || writeOffQty <= 0}
                onClick={handleConfirmWriteOff}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50"
              >
                {isSubmittingWriteOff ? 'नोंद होत आहे...' : (language === 'mr' ? 'नुकसान नोंदवा आणि साठा कमी करा' : 'नुकसान दर्ज करें')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

