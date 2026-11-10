import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { PeriodFilter } from '../Dashboard/PeriodFilter';
import { ExpenseCategory } from '../../types';
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
  Banknote, 
  Smartphone,
  TrendingDown,
  Layers
} from 'lucide-react';

export const ExpenseTracker: React.FC = () => {
  const { filteredExpenses, addExpense, deleteExpense, metrics } = useStore();

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

  const categories: ExpenseCategory[] = [
    'Dukan Rent',
    'Light / Electricity Bill',
    'Gadi Petrol / Diesel',
    'Deep Chiller Maintenance',
    'Staff Salary',
    'Packaging / Theli',
    'Shop Capital Investment',
    'General Repair',
    'Other'
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

  // Group by category
  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(exp => {
      map[exp.category] = (map[exp.category] || 0) + exp.amount;
    });
    return map;
  }, [filteredExpenses]);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Fuel className="w-6 h-6 text-amber-600" />
            <span>दुकान खर्च &amp; इन्वेस्टमेंट ट्रैकर (Rent, Light, Petrol &amp; Assets)</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            दुकान किराया, चिलर का लाइट बिल, गाड़ी पेट्रोल, मशीनें व दुकान निवेश का पूरा हिसाब
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ नया खर्च या इन्वेस्टमेंट जोड़ें</span>
        </button>
      </div>

      {/* Time Filter */}
      <PeriodFilter />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>दैनिक संचालन खर्च (Operating Expenses)</span>
          </div>
          <span className="text-2xl font-black text-rose-600 mt-1 block">
            ₹{metrics.operatingExpenses.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500">
            किराया, बिजली, पेट्रोल, पैकिंग व वेतन
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>दुकान पूंजी निवेश (Capital Investment)</span>
          </div>
          <span className="text-2xl font-black text-purple-700 mt-1 block">
            ₹{metrics.capitalInvestments.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500">
            नया डीप फ्रीजर, डिजिटल तराजू, फर्नीचर व मशीनरी
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <TrendingDown className="w-4 h-4 text-slate-400" />
            <span>कुल कुल व्यय (Total Outflow)</span>
          </div>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            ₹{(metrics.operatingExpenses + metrics.capitalInvestments).toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500">
            चुनी गई अवधि में कुल भुगतान
          </span>
        </div>
      </div>

      {/* Quick Category Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'दुकान किराया (Rent)', key: 'Dukan Rent', icon: Home, color: 'text-blue-600 bg-blue-50' },
          { label: 'बिजली / चिलर बिल', key: 'Light / Electricity Bill', icon: Zap, color: 'text-amber-600 bg-amber-50' },
          { label: 'गाड़ी पेट्रोल / डीजल', key: 'Gadi Petrol / Diesel', icon: Fuel, color: 'text-rose-600 bg-rose-50' },
          { label: 'दुकान इन्वेस्टमेंट', key: 'Shop Capital Investment', icon: Sparkles, color: 'text-purple-600 bg-purple-50' }
        ].map(cat => {
          const Icon = cat.icon;
          const total = categoryTotals[cat.key] || 0;
          return (
            <div key={cat.key} className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${cat.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 block truncate">{cat.label}</span>
                <span className="text-sm font-black text-slate-900">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            खर्च व निवेश लेजर (Expenses List)
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {filteredExpenses.length} रिकॉर्ड
          </span>
        </div>

        {filteredExpenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">दिनांक</th>
                  <th className="px-4 py-3">खर्च का नाम (Title)</th>
                  <th className="px-3 py-3">केटेगरी (Category)</th>
                  <th className="px-3 py-3 text-center">प्रकार</th>
                  <th className="px-3 py-3 text-right">रकम (Amount)</th>
                  <th className="px-3 py-3 text-center">भुगतान माध्यम</th>
                  <th className="px-4 py-3">नोट्स</th>
                  <th className="px-3 py-3 text-right">एक्शन</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((exp) => {
                  const Icon = categoryIcons[exp.category] || Layers;
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                        {exp.expense_date}
                      </td>

                      <td className="px-4 py-3 font-bold text-slate-900">
                        {exp.title}
                      </td>

                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                          <Icon className="w-3 h-3 text-slate-500" />
                          <span>{exp.category}</span>
                        </span>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          exp.is_capital_investment ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {exp.is_capital_investment ? 'Shop Investment' : 'Daily Expense'}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-right font-black text-slate-900">
                        ₹{exp.amount.toLocaleString('en-IN')}
                      </td>

                      <td className="px-3 py-3 text-center font-medium text-slate-600">
                        {exp.payment_mode}
                      </td>

                      <td className="px-4 py-3 text-slate-500 italic max-w-xs truncate">
                        {exp.notes || '-'}
                      </td>

                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => {
                            if (window.confirm(`क्या आप "${exp.title}" खर्च को हटाना चाहते हैं?`)) {
                              deleteExpense(exp.id);
                            }
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
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
          <div className="p-12 text-center text-slate-400 text-xs">
            इस अवधि में कोई खर्च या निवेश दर्ज नहीं है।
          </div>
        )}
      </div>

      {/* ADD EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Fuel className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    खर्च या दुकान निवेश दर्ज करें (Add Expense)
                  </h3>
                  <p className="text-xs text-slate-500">
                    किराया, लाइट बिल, पेट्रोल, सैलरी या नई मशीनरी
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  खर्च का विवरण (Title) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="उदा. दुकान का मासिक किराया / फ्रीजर बिल / पेट्रोल"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    खर्च की श्रेणी (Category) *
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    रकम (₹ Amount) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Capital Investment Toggle */}
              <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-xl border border-purple-200">
                <input
                  type="checkbox"
                  id="capital-toggle"
                  checked={isCapitalInvestment}
                  onChange={(e) => setIsCapitalInvestment(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="capital-toggle" className="text-xs font-bold text-purple-900 cursor-pointer">
                  यह दुकान के लिए पूंजी निवेश (Capital Investment) है (उदा. नया डीप फ्रीजर, तराजू, काउंटर)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    भुगतान माध्यम (Mode)
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="Online_UPI">ऑनलाइन UPI (GPay/PhonePe)</option>
                    <option value="Cash">कैश रोकड़ (Cash)</option>
                    <option value="Bank_Transfer">बैंक ट्रांसफर (Bank Transfer)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    रसीद नंबर या नोट्स (Notes)
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. बिल नं 452 / बिजली मीटर रीडिंग"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-xs text-slate-700"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20"
                >
                  खर्च सुरक्षित करें
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

