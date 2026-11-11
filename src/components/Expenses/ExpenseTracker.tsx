import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { PeriodFilter } from '../Dashboard/PeriodFilter';
import { ExpenseCategory } from '../../types';
import { exportReportToPDF } from '../../lib/exportUtils';
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
  X, 
  TrendingDown,
  Layers,
  FileText
} from 'lucide-react';

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

  const handleDownloadExpensesPDF = () => {
    const totalExp = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const opExp = filteredExpenses.filter(e => !e.is_capital_investment).reduce((sum, e) => sum + e.amount, 0);
    const capExp = filteredExpenses.filter(e => e.is_capital_investment).reduce((sum, e) => sum + e.amount, 0);

    exportReportToPDF({
      title: language === 'mr' ? 'दुकान खर्च व भांडवली गुंतवणूक लेजर अहवाल' : language === 'hi' ? 'दुकान खर्च व पूंजी निवेश लेजर रिपोर्ट' : 'Shop Operating & Capital Expenses Ledger Report',
      subtitle: 'Yogeshwari Dairy Farm & Sweets ERP — Operating Outflows',
      periodText: language === 'mr' ? 'निवडलेला खर्च कालावधी' : 'चुनी गई खर्च अवधि',
      kpis: [
        { label: 'दैनंदिन चालू खर्च (Operating)', value: `₹${opExp.toLocaleString('en-IN')}`, color: 'rose' },
        { label: 'भांडवली गुंतवणूक (Assets)', value: `₹${capExp.toLocaleString('en-IN')}`, color: 'blue' },
        { label: 'एकूण खर्च रक्कम (Total)', value: `₹${totalExp.toLocaleString('en-IN')}`, color: 'purple' },
        { label: 'एकूण खर्च नोंदी', value: `${filteredExpenses.length} नोंदी`, color: 'amber' }
      ],
      table: {
        headers: ['तारीख', 'खर्चाचा तपशील (Expense Title)', 'प्रवर्ग (Category)', 'पेमेंट पद्धत', 'प्रकार', 'रक्कम (₹)', 'तपशील / शेरा'],
        alignments: ['center', 'left', 'center', 'center', 'center', 'right', 'left'],
        rows: filteredExpenses.map(e => [
          e.expense_date,
          e.title,
          e.category,
          e.payment_mode,
          e.is_capital_investment ? 'भांडवली गुंतवणूक' : 'दैनंदिन चालू खर्च',
          `₹${e.amount.toLocaleString('en-IN')}`,
          e.notes || '—'
        ]),
        summaryRow: [
          'एकूण (Total)',
          `${filteredExpenses.length} खर्च नोंदी`,
          '',
          '',
          '',
          `₹${totalExp.toLocaleString('en-IN')}`,
          ''
        ]
      },
      notes: 'दुकान दैनंदिन खर्च व उपकरणांची गुंतवणूक. खर्चाच्या पावत्या जपून ठेवाव्यात.'
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131F1B] p-5 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Fuel className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <span>{t('expensesTitle')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium mt-0.5">
            {language === 'mr' 
              ? 'दुकानाचे भाडे, चिलरचे वीज बिल, गाडी पेट्रोल, शीतकरण दुरुस्ती व नवीन उपकरणांची गुंतवणूक'
              : language === 'hi'
              ? 'दुकान किराया, चिलर का लाइट बिल, गाड़ी पेट्रोल, मशीनें व दुकान निवेश का पूरा हिसाब'
              : 'Tracking of shop rent, electricity, vehicle fuel, chiller maintenance, and capital investments'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadExpensesPDF}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 text-xs font-bold transition-all"
            title="Download Expenses PDF Report"
          >
            <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{language === 'mr' ? 'खर्च PDF' : language === 'hi' ? 'खर्च PDF' : 'Expenses PDF'}</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addExpense')}</span>
          </button>
        </div>
      </div>

      {/* Time Filter */}
      <PeriodFilter />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-[#8FA69C]">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>{t('operatingExpenses')}</span>
          </div>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">
            ₹{metrics.operatingExpenses.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
            {language === 'mr' ? 'भाडे, वीज, पेट्रोल, पॅकिंग व पगार' : language === 'hi' ? 'किराया, बिजली, पेट्रोल, पैकिंग व वेतन' : 'Rent, power, fuel, packaging & salaries'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-[#8FA69C]">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>{t('capitalInvestments')}</span>
          </div>
          <span className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-1 block">
            ₹{metrics.capitalInvestments.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
            {language === 'mr' ? 'नवीन डीप फ्रीझर, वजन काटा, फर्निचर' : language === 'hi' ? 'नया डीप फ्रीजर, डिजिटल तराजू, फर्नीचर' : 'New deep chillers, digital scales, fixtures'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-[#8FA69C]">
            <TrendingDown className="w-4 h-4 text-slate-400" />
            <span>{language === 'mr' ? 'एकूण खर्च व गुंतवणूक (Total)' : language === 'hi' ? 'कुल व्यय (Total Outflow)' : 'Total Outflow (Expenses + Assets)'}</span>
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
            ₹{(metrics.operatingExpenses + metrics.capitalInvestments).toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
            {language === 'mr' ? 'कालावधीतील एकूण बाहेर पडलेली रक्कम' : language === 'hi' ? 'चुनी गई अवधि में कुल भुगतान' : 'Total cash outflow during period'}
          </span>
        </div>
      </div>

      {/* Quick Category Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('shopRent'), key: 'Dukan Rent', icon: Home, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50' },
          { label: t('lightBill'), key: 'Light / Electricity Bill', icon: Zap, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50' },
          { label: t('fuelPetrol'), key: 'Gadi Petrol / Diesel', icon: Fuel, color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50' },
          { label: language === 'mr' ? 'भांडवली गुंतवणूक' : language === 'hi' ? 'दुकान इन्वेस्टमेंट' : 'Capital Assets', key: 'Shop Capital Investment', icon: Sparkles, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50' }
        ].map(cat => {
          const Icon = cat.icon;
          const total = categoryTotals[cat.key] || 0;
          return (
            <div key={cat.key} className="bg-white dark:bg-[#131F1B] p-3 rounded-xl border border-slate-200/80 dark:border-[#24352F] flex items-center gap-3">
              <div className={`p-2 rounded-lg ${cat.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-[#8FA69C] block truncate">{cat.label}</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-[#24352F] flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            {language === 'mr' ? 'खर्च व गुंतवणूक यादी (Expenses List)' : language === 'hi' ? 'खर्च व निवेश लेजर (Expenses List)' : 'Expenses & Investments Ledger'}
          </h3>
          <span className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium">
            {filteredExpenses.length} {language === 'mr' ? 'नोंदी' : language === 'hi' ? 'रिकॉर्ड' : 'records'}
          </span>
        </div>

        {filteredExpenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#1A2A25] border-b border-slate-200 dark:border-[#24352F] text-slate-600 dark:text-[#8FA69C] font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">{language === 'mr' ? 'तारीख' : language === 'hi' ? 'दिनांक' : 'Date'}</th>
                  <th className="px-4 py-3">{language === 'mr' ? 'खर्चाचे नाव (Title)' : language === 'hi' ? 'खर्च का नाम' : 'Expense Title'}</th>
                  <th className="px-3 py-3">{t('categoryCol')}</th>
                  <th className="px-3 py-3 text-center">{language === 'mr' ? 'प्रकार' : language === 'hi' ? 'प्रकार' : 'Type'}</th>
                  <th className="px-3 py-3 text-right">{language === 'mr' ? 'रक्कम (₹)' : language === 'hi' ? 'रकम (Amount)' : 'Amount (₹)'}</th>
                  <th className="px-3 py-3 text-center">{t('paymentMethod')}</th>
                  <th className="px-4 py-3">{language === 'mr' ? 'शेरा' : language === 'hi' ? 'नोट्स' : 'Notes'}</th>
                  <th className="px-3 py-3 text-right">{t('actionsCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#24352F]">
                {filteredExpenses.map((exp) => {
                  const Icon = categoryIcons[exp.category] || Layers;
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1A2A25]/60 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-[#8FA69C] whitespace-nowrap">
                        {exp.expense_date}
                      </td>

                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {exp.title}
                      </td>

                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-[#1A2A25] text-slate-700 dark:text-[#8FA69C]">
                          <Icon className="w-3 h-3 text-slate-500 dark:text-[#8FA69C]" />
                          <span>{exp.category}</span>
                        </span>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          exp.is_capital_investment ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300' : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C]'
                        }`}>
                          {exp.is_capital_investment ? (language === 'mr' ? 'गुंतवणूक' : language === 'hi' ? 'निवेश' : 'Asset Investment') : (language === 'mr' ? 'दैनिक खर्च' : language === 'hi' ? 'दैनिक खर्च' : 'Daily Expense')}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-right font-black text-slate-900 dark:text-white">
                        ₹{exp.amount.toLocaleString('en-IN')}
                      </td>

                      <td className="px-3 py-3 text-center font-medium text-slate-600 dark:text-[#8FA69C]">
                        {exp.payment_mode}
                      </td>

                      <td className="px-4 py-3 text-slate-500 dark:text-[#8FA69C] italic max-w-xs truncate">
                        {exp.notes || '-'}
                      </td>

                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => {
                            const confirmText = language === 'mr' ? `तुम्हाला "${exp.title}" हटवायचे आहे का?` : language === 'hi' ? `क्या आप "${exp.title}" खर्च को हटाना चाहते हैं?` : `Are you sure you want to delete "${exp.title}"?`;
                            if (window.confirm(confirmText)) {
                              deleteExpense(exp.id);
                            }
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 dark:text-[#8FA69C] text-xs">
            {language === 'mr' ? 'या कालावधीत कोणताही खर्च किंवा गुंतवणूक नोंदवलेली नाही.' : language === 'hi' ? 'इस अवधि में कोई खर्च या निवेश दर्ज नहीं है।' : 'No expenses or investments recorded for this period.'}
          </div>
        )}
      </div>

      {/* ADD EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131F1B] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-transparent dark:border-[#24352F]">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#24352F] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                  <Fuel className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {language === 'mr' ? 'खर्च किंवा दुकान गुंतवणूक नोंदवा' : language === 'hi' ? 'खर्च या दुकान निवेश दर्ज करें' : 'Record Expense or Capital Asset'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
                    {language === 'mr' ? 'भाडे, वीज बिल, पेट्रोल, पगार किंवा नवीन फ्रीझर' : language === 'hi' ? 'किराया, लाइट बिल, पेट्रोल, सैलरी या नई मशीनरी' : 'Shop rent, electricity bill, petrol, salary, or chiller investment'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2A25]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                  {language === 'mr' ? 'खर्चाचा तपशील (Title) *' : language === 'hi' ? 'खर्च का विवरण (Title) *' : 'Expense Title / Description *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'mr' ? 'उदा. दुकानाचे मासिक भाडे / चिलर वीज बिल / पेट्रोल' : language === 'hi' ? 'उदा. दुकान का मासिक किराया / फ्रीजर बिल / पेट्रोल' : 'e.g. Shop monthly rent / Chiller power bill / Fuel'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                    {language === 'mr' ? 'रक्कम (₹ Amount) *' : language === 'hi' ? 'रकम (₹ Amount) *' : 'Amount (₹) *'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 dark:text-[#8FA69C]">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Capital Investment Toggle */}
              <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-900/50">
                <input
                  type="checkbox"
                  id="capital-toggle"
                  checked={isCapitalInvestment}
                  onChange={(e) => setIsCapitalInvestment(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="capital-toggle" className="text-xs font-bold text-purple-900 dark:text-purple-300 cursor-pointer">
                  {language === 'mr' 
                    ? 'ही दुकानासाठी भांडवली गुंतवणूक आहे (उदा. नवीन डीप फ्रीझर, वजन काटा, फर्निचर)'
                    : language === 'hi'
                    ? 'यह दुकान के लिए पूंजी निवेश (Capital Investment) है (उदा. नया डीप फ्रीजर, तराजू, काउंटर)'
                    : 'This is a long-term capital investment (e.g. Deep freezer, digital weighing scale, shop fixtures)'}
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                    {t('paymentMethod')}
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="Online_UPI">{t('onlineUpi')}</option>
                    <option value="Cash">{t('cash')}</option>
                    <option value="Bank_Transfer">{language === 'mr' ? 'बँक ट्रान्सफर' : language === 'hi' ? 'बैंक ट्रांसफर' : 'Bank Transfer (NEFT/IMPS)'}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                    {language === 'mr' ? 'पावती क्रमांक किंवा शेरा' : language === 'hi' ? 'रसीद नंबर या नोट्स' : 'Receipt No. or Notes'}
                  </label>
                  <input
                    type="text"
                    placeholder="Bill #452"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-[#24352F]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#24352F] font-semibold text-xs text-slate-700 dark:text-[#8FA69C]"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20"
                >
                  {t('save')}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
