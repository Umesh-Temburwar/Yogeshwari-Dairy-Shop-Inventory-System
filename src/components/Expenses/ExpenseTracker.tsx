import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { PeriodFilter } from '../Dashboard/PeriodFilter';
import { ExpenseCategory } from '../../types';
import { printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import {
  Fuel,
  Plus,
  Home,
  Zap,
  Wrench,
  Users,
  ShoppingBag,
  Sparkles,
  Trash2,
  Layers,
  Printer,
  Download,
  Eye
} from 'lucide-react';
import { Card, KpiCard, Button, Input, Badge, StatusBadge, Modal } from '../ui';

export const ExpenseTracker: React.FC = () => {
  const { filteredExpenses, addExpense, deleteExpense, metrics } = useStore();
  const { t, language } = useLanguage();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Light / Electricity Bill');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Online_UPI' | 'Bank_Transfer'>('Online_UPI');
  const [isCapitalInvestment, setIsCapitalInvestment] = useState(false);
  const [notes, setNotes] = useState('');

  const categoryIcons: Record<ExpenseCategory, any> = {
    'Dukan Rent': Home,
    'Light / Electricity Bill': Zap,
    'Gadi Petrol / Diesel': Fuel,
    'Deep Chiller Maintenance': Wrench,
    'Staff Salary': Users,
    'Packaging / Theli': ShoppingBag,
    'Shop Capital Investment': Sparkles,
    'General Repair': Wrench,
    'Other': Layers
  };

  const categories: Array<{ id: ExpenseCategory; label: string }> = [
    { id: 'Dukan Rent', label: t('shopRent') },
    { id: 'Light / Electricity Bill', label: t('lightBill') },
    { id: 'Gadi Petrol / Diesel', label: t('fuelPetrol') },
    { id: 'Deep Chiller Maintenance', label: t('chillerMaint') },
    { id: 'Staff Salary', label: t('staffSalary') },
    { id: 'Packaging / Theli', label: language === 'mr' ? 'पॅकिंग पिशव्या / खोकी' : language === 'hi' ? 'पैकिंग थैलियां / डिब्बे' : 'Packaging & Containers' },
    { id: 'Shop Capital Investment', label: language === 'mr' ? 'दुकान भांडवली गुंतवणूक (फ्रीझर, काउंटर)' : language === 'hi' ? 'दुकान पूंजी निवेश (मशीनरी)' : 'Shop Capital Investment (Assets)' },
    { id: 'General Repair', label: language === 'mr' ? 'सर्वसाधारण दुरुस्ती' : language === 'hi' ? 'जनरल रिपेयर' : 'General Maintenance & Repairs' },
    { id: 'Other', label: language === 'mr' ? 'इतर खर्च' : language === 'hi' ? 'अन्य खर्च' : 'Other Expenses' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || parseFloat(amount) <= 0) return;

    await addExpense({
      title: title.trim(),
      category,
      amount: parseFloat(amount),
      payment_mode: paymentMode,
      expense_date: new Date().toISOString().split('T')[0],
      is_capital_investment: isCapitalInvestment || category === 'Shop Capital Investment',
      notes: notes.trim() || undefined
    });

    setIsModalOpen(false);
    setTitle('');
    setAmount('');
    setNotes('');
    setIsCapitalInvestment(false);
  };

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(exp => {
      map[exp.category] = (map[exp.category] || 0) + exp.amount;
    });
    return map;
  }, [filteredExpenses]);

  const getExpensesPayload = () => {
    const totalExp = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const opExp = filteredExpenses.filter(e => !e.is_capital_investment).reduce((sum, e) => sum + e.amount, 0);
    const capExp = filteredExpenses.filter(e => e.is_capital_investment).reduce((sum, e) => sum + e.amount, 0);

    const isMr = language === 'mr';
    const isHi = language === 'hi';

    return {
      title: isMr ? 'दुकान खर्च व भांडवली गुंतवणूक लेजर अहवाल' : isHi ? 'दुकान खर्च व पूंजी निवेश लेजर रिपोर्ट' : 'Shop Operating & Capital Expenses Ledger Report',
      subtitle: isMr ? 'योगेश्वरी डेअरी फार्म & उत्पादने ERP' : isHi ? 'योगेश्वरी डेरी फार्म & उत्पाद ERP' : 'Yogeshwari Dairy Farm & Products ERP',
      periodText: isMr ? 'निवडलेला खर्च कालावधी' : isHi ? 'चुनी गई खर्च अवधि' : 'Expenses & Outflows Ledger',
      language,
      kpis: [
        { label: isMr ? 'दैनंदिन चालू खर्च' : isHi ? 'दैनिक चालू खर्च' : 'Operating Expenses', value: `₹${opExp.toLocaleString('en-IN')}`, color: 'rose' },
        { label: isMr ? 'भांडवली गुंतवणूक' : isHi ? 'पूंजी निवेश' : 'Capital Investments', value: `₹${capExp.toLocaleString('en-IN')}`, color: 'blue' },
        { label: isMr ? 'एकूण खर्च रक्कम' : isHi ? 'कुल खर्च राशि' : 'Total Expense Amount', value: `₹${totalExp.toLocaleString('en-IN')}`, color: 'purple' },
        { label: isMr ? 'एकूण खर्च नोंदी' : isHi ? 'कुल खर्च प्रविष्टियां' : 'Total Entries', value: `${filteredExpenses.length} ${isMr ? 'नोंदी' : isHi ? 'प्रविष्टियां' : 'Entries'}`, color: 'amber' }
      ],
      table: {
        headers: isMr 
          ? ['तारीख', 'खर्चाचा तपशील', 'प्रवर्ग', 'पेमेंट पद्धत', 'प्रकार', 'रक्कम (₹)', 'तपशील / शेरा']
          : isHi
          ? ['दिनांक', 'खर्च विवरण', 'श्रेणी', 'भुगतान माध्यम', 'प्रकार', 'राशि (₹)', 'विवरण / टिप्पणी']
          : ['Date', 'Expense Title', 'Category', 'Payment Mode', 'Type', 'Amount (₹)', 'Notes'],
        alignments: ['center', 'left', 'center', 'center', 'center', 'right', 'left'] as ('center' | 'left' | 'center' | 'center' | 'center' | 'right' | 'left')[],
        rows: filteredExpenses.length > 0 ? filteredExpenses.map(e => [
          e.expense_date,
          e.title,
          e.category,
          e.payment_mode === 'Cash' ? (isMr ? 'रोख' : isHi ? 'रोकड़' : 'Cash') :
          e.payment_mode === 'Online_UPI' ? (isMr ? 'ऑनलाईन UPI' : isHi ? 'ऑनलाइन UPI' : 'Online UPI') :
          e.payment_mode === 'Udhar' ? (isMr ? 'उधारी' : isHi ? 'उधार' : 'Credit') : e.payment_mode,
          e.is_capital_investment ? (isMr ? 'भांडवली गुंतवणूक' : isHi ? 'पूंजी निवेश' : 'Capital Investment') : (isMr ? 'दैनंदिन चालू खर्च' : isHi ? 'दैनिक परिचालन व्यय' : 'Operating Expense'),
          `₹${e.amount.toLocaleString('en-IN')}`,
          e.notes || '—'
        ]) : [
          ['—', isMr ? 'कोणतीही खर्च नोंद आढळली नाही' : isHi ? 'कोई खर्च प्रविष्टि नहीं मिली' : 'No expense records found', '—', '—', '—', '₹0', '—']
        ],
        summaryRow: [
          isMr ? 'एकूण' : isHi ? 'कुल योग' : 'Total',
          `${filteredExpenses.length} ${isMr ? 'नोंदी' : isHi ? 'प्रविष्टियां' : 'Entries'}`,
          '',
          '',
          '',
          `₹${totalExp.toLocaleString('en-IN')}`,
          ''
        ]
      },
      notes: isMr 
        ? 'दुकान दैनंदिन खर्च व उपकरणांची गुंतवणूक. अधिकृत हिशोबासाठी खर्चाच्या पावत्या जपून ठेवाव्यात.'
        : isHi
        ? 'दुकान दैनिक खर्च व उपकरण निवेश। लेखापरीक्षण हेतु खर्च की रसीदें संभालकर रखें।'
        : 'Official shop operating & capital expense audit ledger. Maintain all expense vouchers and bills.'
    };
  };

  const handleViewExpensesPDF = () => {
    viewReportPDF(getExpensesPayload());
  };

  const handlePrintExpensesPDF = () => {
    printReport(getExpensesPayload());
  };

  const handleDownloadExpensesPDF = () => {
    downloadReportPDF(getExpensesPayload());
  };

  return (
    <div className="space-y-5">

      {/* Header Banner */}
      <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-ink tracking-tight flex items-center gap-2">
            <Fuel className="w-5 h-5 text-ink-2" />
            <span>{t('expensesTitle')}</span>
          </h2>
          <p className="text-xs text-ink-3 font-medium mt-1">
            {language === 'mr'
              ? 'दुकानाचे भाडे, चिलरचे वीज बिल, गाडी पेट्रोल, शीतकरण दुरुस्ती व नवीन उपकरणांची गुंतवणूक'
              : language === 'hi'
                ? 'दुकान किराया, चिलर का लाइट बिल, गाड़ी पेट्रोल, मशीनें व दुकान निवेश का पूरा हिसाब'
                : 'Tracking of shop rent, electricity, vehicle fuel, chiller maintenance, and capital investments'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleViewExpensesPDF}
            leftIcon={<Eye className="w-4 h-4" />}
            title="View Expenses PDF Report"
          >
            {language === 'mr' ? 'पहा' : language === 'hi' ? 'देखें' : 'View'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrintExpensesPDF}
            leftIcon={<Printer className="w-4 h-4" />}
            title="Print Expenses PDF"
          >
            {language === 'mr' ? 'प्रिंट' : language === 'hi' ? 'प्रिंट' : 'Print'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadExpensesPDF}
            leftIcon={<Download className="w-4 h-4" />}
            title="Download Expenses PDF Report"
          >
            PDF
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            {t('addExpense')}
          </Button>
        </div>
      </Card>

      {/* Time Filter */}
      <PeriodFilter />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <KpiCard
          label={t('operatingExpenses')}
          value={`₹${metrics.operatingExpenses.toLocaleString('en-IN')}`}
          delta={language === 'mr' ? 'भाडे, वीज, पेट्रोल, पगार' : language === 'hi' ? 'किराया, बिजली, पेट्रोल, वेतन' : 'Rent, electricity, salaries'}
          deltaType="danger"
          icon={<Zap className="w-4 h-4 text-warn" />}
        />

        <KpiCard
          label={t('capitalInvestments')}
          value={`₹${metrics.capitalInvestments.toLocaleString('en-IN')}`}
          delta={language === 'mr' ? 'डीप फ्रीझर, फर्निचर' : language === 'hi' ? 'फ्रीजर, फर्नीचर' : 'Chillers, fixtures'}
          deltaType="neutral"
          icon={<Sparkles className="w-4 h-4 text-ink-3" />}
        />

        <KpiCard
          label={language === 'mr' ? 'एकूण खर्च व गुंतवणूक' : language === 'hi' ? 'कुल व्यय व निवेश' : 'Total Outflow'}
          value={`₹{(metrics.operatingExpenses + metrics.capitalInvestments).toLocaleString('en-IN')}`}
          delta={language === 'mr' ? 'एकूण बाहेर पडलेली रक्कम' : language === 'hi' ? 'कुल भुगतान' : 'Total cash outflow'}
          deltaType="neutral"
        />
      </div>

      {/* Quick Category Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {[
          { label: t('shopRent'), key: 'Dukan Rent', icon: Home },
          { label: t('lightBill'), key: 'Light / Electricity Bill', icon: Zap },
          { label: t('fuelPetrol'), key: 'Gadi Petrol / Diesel', icon: Fuel },
          { label: language === 'mr' ? 'भांडवली गुंतवणूक' : language === 'hi' ? 'दुकान इन्वेस्टमेंट' : 'Capital Assets', key: 'Shop Capital Investment', icon: Sparkles }
        ].map(cat => {
          const Icon = cat.icon;
          const total = categoryTotals[cat.key] || 0;
          return (
            <Card key={cat.key} className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-surface-2 text-ink-2 shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-medium text-ink-3 block truncate">{cat.label}</span>
                <span className="text-sm font-semibold text-ink tabular-nums">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Expenses Table */}
      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <h3 className="font-semibold text-ink text-sm">
            {language === 'mr' ? 'खर्च व गुंतवणूक यादी (Expenses List)' : language === 'hi' ? 'खर्च व निवेश लेजर (Expenses List)' : 'Expenses & Investments Ledger'}
          </h3>
          <span className="text-xs text-ink-3 font-medium">
            {filteredExpenses.length} {language === 'mr' ? 'नोंदी' : language === 'hi' ? 'रिकॉर्ड' : 'records'}
          </span>
        </div>

        {filteredExpenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 border-b border-line text-ink-3 font-medium uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">{language === 'mr' ? 'तारीख' : language === 'hi' ? 'दिनांक' : 'Date'}</th>
                  <th className="px-4 py-3">{language === 'mr' ? 'खर्चाचे नाव' : language === 'hi' ? 'खर्च का नाम' : 'Title'}</th>
                  <th className="px-3 py-3">{t('categoryCol')}</th>
                  <th className="px-3 py-3 text-center">{language === 'mr' ? 'प्रकार' : language === 'hi' ? 'प्रकार' : 'Type'}</th>
                  <th className="px-3 py-3 text-right">{language === 'mr' ? 'रक्कम' : language === 'hi' ? 'रकम' : 'Amount'}</th>
                  <th className="px-3 py-3 text-center">{t('paymentMethod')}</th>
                  <th className="px-4 py-3">{language === 'mr' ? 'शेरा' : language === 'hi' ? 'नोट्स' : 'Notes'}</th>
                  <th className="px-3 py-3 text-right">{t('actionsCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredExpenses.map((exp) => {
                  const Icon = categoryIcons[exp.category] || Layers;
                  return (
                    <tr key={exp.id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-ink-2 whitespace-nowrap">
                        {exp.expense_date}
                      </td>

                      <td className="px-4 py-3 font-medium text-ink">
                        {exp.title}
                      </td>

                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-surface-2 text-ink-2">
                          <Icon className="w-3 h-3 text-ink-3" />
                          <span>{exp.category}</span>
                        </span>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <Badge variant="outline" className="text-[10px]">
                          {exp.is_capital_investment ? (language === 'mr' ? 'गुंतवणूक' : language === 'hi' ? 'निवेश' : 'Asset') : (language === 'mr' ? 'दैनिक खर्च' : language === 'hi' ? 'दैनिक खर्च' : 'Operating')}
                        </Badge>
                      </td>

                      <td className="px-3 py-3 text-right font-medium text-ink tabular-nums">
                        ₹{exp.amount.toLocaleString('en-IN')}
                      </td>

                      <td className="px-3 py-3 text-center font-medium text-ink-3">
                        {exp.payment_mode}
                      </td>

                      <td className="px-4 py-3 text-ink-3 italic max-w-xs truncate">
                        {exp.notes || '-'}
                      </td>

                      <td className="px-3 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const confirmText = language === 'mr' ? `तुम्हाला "${exp.title}" हटवायचे आहे का?` : language === 'hi' ? `क्या आप "${exp.title}" खर्च को हटाना चाहते हैं?` : `Are you sure you want to delete "${exp.title}"?`;
                            if (window.confirm(confirmText)) {
                              deleteExpense(exp.id);
                            }
                          }}
                          className="h-7 w-7 p-0 text-danger hover:bg-danger/10 ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-ink-3 text-xs">
            {language === 'mr' ? 'या कालावधीत कोणताही खर्च किंवा गुंतवणूक नोंदवलेली नाही.' : language === 'hi' ? 'इस अवधि में कोई खर्च या निवेश दर्ज नहीं है।' : 'No expenses or investments recorded for this period.'}
          </div>
        )}
      </Card>

      {/* ADD EXPENSE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={language === 'mr' ? 'खर्च किंवा दुकान गुंतवणूक नोंदवा' : language === 'hi' ? 'खर्च या दुकान निवेश दर्ज करें' : 'Record Expense or Capital Asset'}
        description={language === 'mr' ? 'भाडे, वीज बिल, पेट्रोल, पगार किंवा नवीन फ्रीझर' : language === 'hi' ? 'किराया, लाइट बिल, पेट्रोल, सैलरी या मशीनरी' : 'Shop rent, electricity bill, petrol, salary, or chiller investment'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-medium text-ink-2 block mb-1.5">
              {language === 'mr' ? 'खर्चाचा तपशील (Title) *' : language === 'hi' ? 'खर्च का विवरण (Title) *' : 'Expense Title *'}
            </label>
            <Input
              type="text"
              required
              placeholder={language === 'mr' ? 'उदा. दुकानाचे मासिक भाडे / चिलर वीज बिल' : language === 'hi' ? 'उदा. दुकान का मासिक किराया / फ्रीजर बिल' : 'e.g. Shop monthly rent / Chiller electricity'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-ink-2 block mb-1.5">
                {t('categoryCol')} *
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const val = e.target.value as ExpenseCategory;
                  setCategory(val);
                  if (val === 'Shop Capital Investment') {
                    setIsCapitalInvestment(true);
                  }
                }}
                className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-medium shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-medium text-ink-2 block mb-1.5">
                {language === 'mr' ? 'रक्कम (₹ Amount) *' : language === 'hi' ? 'रकम (₹ Amount) *' : 'Amount (₹) *'}
              </label>
              <Input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Capital Investment Toggle */}
          <div className="flex items-center gap-2 p-3 bg-surface-2 rounded-xl border border-line">
            <input
              type="checkbox"
              id="capital-toggle"
              checked={isCapitalInvestment}
              onChange={(e) => setIsCapitalInvestment(e.target.checked)}
              className="w-4 h-4 rounded border-line text-accent focus:ring-ink/20"
            />
            <label htmlFor="capital-toggle" className="text-xs font-medium text-ink cursor-pointer">
              {language === 'mr'
                ? 'ही दुकानासाठी भांडवली गुंतवणूक आहे (उदा. नवीन डीप फ्रीझर, वजन काटा, फर्निचर)'
                : language === 'hi'
                  ? 'यह दुकान के लिए पूंजी निवेश (Capital Investment) है (उदा. नया डीप फ्रीजर, तराजू)'
                  : 'This is a long-term capital investment (e.g. Deep freezer, scale, fixtures)'}
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-ink-2 block mb-1.5">
                {t('paymentMethod')}
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-medium shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
              >
                <option value="Online_UPI">{t('onlineUpi')}</option>
                <option value="Cash">{t('cash')}</option>
                <option value="Bank_Transfer">{language === 'mr' ? 'बँक ट्रान्सफर' : language === 'hi' ? 'बैंक ट्रांसफर' : 'Bank Transfer'}</option>
              </select>
            </div>

            <div>
              <label className="font-medium text-ink-2 block mb-1.5">
                {language === 'mr' ? 'पावती क्रमांक किंवा शेरा' : language === 'hi' ? 'रसीद नंबर या नोट्स' : 'Receipt No. or Notes'}
              </label>
              <Input
                type="text"
                placeholder="Bill #452"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              className="w-1/2"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="w-1/2"
            >
              {t('save')}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default ExpenseTracker;
