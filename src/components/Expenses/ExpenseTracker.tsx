import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { PeriodFilter } from '../Dashboard/PeriodFilter';
import { CompactPageHeader, CompactStatStrip } from '../Common/CompactPageHeader';
import { ActiveOperatorBar } from '../Common/ActiveOperatorBar';
import { LoadOlderHistoryButton } from '../Common/LoadOlderHistoryButton';
import { ExpenseCategory } from '../../types';
import { exportReportToPDF, printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
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
  FileText,
  Printer,
  Download,
  Eye
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
    { id: 'Packaging / Theli', label: 'Packaging & Containers' },
    { id: 'Shop Capital Investment', label: 'Shop Capital Investment (Assets)' },
    { id: 'General Repair', label: 'General Maintenance & Repairs' },
    { id: 'Other', label: 'Other Expenses' }
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
      title: 'Shop Operating & Capital Expenses Ledger Report',
      subtitle: 'Yogeshwari Dairy Farm & Products ERP',
      periodText: 'Expenses & Outflows Ledger',
      language,
      kpis: [
        { label: 'Operating Expenses', value: `₹${opExp.toLocaleString('en-IN')}`, color: 'rose' },
        { label: 'Capital Investments', value: `₹${capExp.toLocaleString('en-IN')}`, color: 'blue' },
        { label: 'Total Expense Amount', value: `₹${totalExp.toLocaleString('en-IN')}`, color: 'purple' },
        { label: 'Total Entries', value: `${filteredExpenses.length} ${'Entries'}`, color: 'amber' }
      ],
      table: {
        headers: ['Date', 'Expense Title', 'Category', 'Payment Mode', 'Type', 'Amount (₹)', 'Notes'],
        alignments: ['center', 'left', 'center', 'center', 'center', 'right', 'left'] as ('center' | 'left' | 'center' | 'center' | 'center' | 'right' | 'left')[],
        rows: filteredExpenses.length > 0 ? filteredExpenses.map(e => [
          e.expense_date,
          e.title,
          e.category,
          e.payment_mode === 'Cash' ? ('Cash') :
          e.payment_mode === 'Online_UPI' ? ('Online UPI') :
          e.payment_mode === 'Udhar' ? ('Credit') : e.payment_mode,
          e.is_capital_investment ? ('Capital Investment') : ('Operating Expense'),
          `₹${e.amount.toLocaleString('en-IN')}`,
          e.notes || '—'
        ]) : [
          ['—', 'No expense records found', '—', '—', '—', '₹0', '—']
        ],
        summaryRow: [
          'Total',
          `${filteredExpenses.length} ${'Entries'}`,
          '',
          '',
          '',
          `₹${totalExp.toLocaleString('en-IN')}`,
          ''
        ]
      },
      notes: 'Official shop operating & capital expense audit ledger. Maintain all expense vouchers and bills.'
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
    <div className="space-y-2.5 sm:space-y-3 max-w-7xl mx-auto pb-28 lg:pb-8">
      {/* 0. POS-STYLE ACTIVE OPERATOR & STORE BADGE BAR */}
      <ActiveOperatorBar
        locationName="Shop Operating & Expense Ledger"
        pulseColor="amber"
        className="mb-1"
      />

      {/* 1. Compact Header + More (⋮) Reports Sheet + Round Add Expense CTA */}
      <CompactPageHeader
        title={t('expensesTitle')}
        icon={<Fuel className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
        primaryAction={{
          label: 'Add',
          icon: <Plus className="w-4 h-4 stroke-[2.5]" />,
          onClick: () => setIsModalOpen(true),
          ariaLabel: 'Add new expense'
        }}
        moreTitle={'Expense Reports'}
        moreActions={[
          {
            id: 'view-pdf',
            label: 'View Expenses PDF',
            icon: <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
            onClick: handleViewExpensesPDF
          },
          {
            id: 'print',
            label: 'Print Report',
            icon: <Printer className="w-4 h-4 text-slate-500 dark:text-[#8FA69C]" />,
            onClick: handlePrintExpensesPDF
          },
          {
            id: 'download-pdf',
            label: 'Download PDF',
            icon: <Download className="w-4 h-4" />,
            onClick: handleDownloadExpensesPDF,
            tone: 'primary'
          }
        ]}
      />

      {/* 2. Slim 3-Stat Summary Strip */}
      <CompactStatStrip
        columns={3}
        items={[
          {
            label: 'Operating',
            value: `₹${metrics.operatingExpenses.toLocaleString('en-IN')}`,
            valueClassName: 'text-rose-600 dark:text-rose-400'
          },
          {
            label: 'Capital',
            value: `₹${metrics.capitalInvestments.toLocaleString('en-IN')}`,
            valueClassName: 'text-purple-600 dark:text-purple-400'
          },
          {
            label: 'Total',
            value: `₹${(metrics.operatingExpenses + metrics.capitalInvestments).toLocaleString('en-IN')}`
          }
        ]}
      />

      {/* 3. Sticky Time Period Filter */}
      <PeriodFilter />

      {/* Quick Category Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('shopRent'), key: 'Dukan Rent', icon: Home, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50' },
          { label: t('lightBill'), key: 'Light / Electricity Bill', icon: Zap, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50' },
          { label: t('fuelPetrol'), key: 'Gadi Petrol / Diesel', icon: Fuel, color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50' },
          { label: 'Capital Assets', key: 'Shop Capital Investment', icon: Sparkles, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50' }
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
            {'Expenses & Investments Ledger'}
          </h3>
          <span className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium">
            {filteredExpenses.length} {'records'}
          </span>
        </div>

        {filteredExpenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#1A2A25] border-b border-slate-200 dark:border-[#24352F] text-slate-600 dark:text-[#8FA69C] font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">{'Date'}</th>
                  <th className="px-4 py-3">{'Expense Title'}</th>
                  <th className="px-3 py-3">{t('categoryCol')}</th>
                  <th className="px-3 py-3 text-center">{'Type'}</th>
                  <th className="px-3 py-3 text-right">{'Amount (₹)'}</th>
                  <th className="px-3 py-3 text-center">{t('paymentMethod')}</th>
                  <th className="px-4 py-3">{'Notes'}</th>
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
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${exp.is_capital_investment ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300' : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C]'
                          }`}>
                          {exp.is_capital_investment ? ('Asset Investment') : ('Daily Expense')}
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
                            const confirmText = `Are you sure you want to delete "${exp.title}"?`;
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
            {'No expenses or investments recorded for this period.'}
          </div>
        )}
        <LoadOlderHistoryButton entity="expenses" className="pb-4" />
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
                    {'Record Expense or Capital Asset'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
                    {'Shop rent, electricity bill, petrol, salary, or chiller investment'}
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
                  {'Expense Title / Description *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={'e.g. Shop monthly rent / Chiller Electricity Bill bill / Fuel'}
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
                    {'Amount (₹) *'}
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
                  {'This is a long-term capital investment (e.g. Deep freezer, digital weighing scale, shop fixtures)'}
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
                    <option value="Bank_Transfer">{'Bank Transfer (NEFT/IMPS)'}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                    {'Receipt No. or Notes'}
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
