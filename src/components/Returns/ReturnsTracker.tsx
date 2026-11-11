import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  RotateCcw, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  FileDown, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  Package, 
  CreditCard,
  DollarSign
} from 'lucide-react';

interface ReturnsTrackerProps {
  onOpenReturnModal: () => void;
}

export const ReturnsTracker: React.FC<ReturnsTrackerProps> = ({ onOpenReturnModal }) => {
  const { returns, filteredReturns, deleteReturn, metrics, timeFilter, setTimeFilter } = useStore();
  const { language } = useLanguage();

  const [searchTerm, setSearchTerm] = useState('');
  const [conditionFilter, setConditionFilter] = useState<'all' | 'Resellable' | 'Damaged_Waste'>('all');

  const displayedReturns = filteredReturns.filter(r => {
    const matchesSearch = 
      r.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.return_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.customer_name && r.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.invoice_no && r.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCondition = conditionFilter === 'all' || r.condition === conditionFilter;

    return matchesSearch && matchesCondition;
  });

  const resellableCount = filteredReturns.filter(r => r.condition === 'Resellable').length;
  const resellableValue = filteredReturns.filter(r => r.condition === 'Resellable').reduce((acc, r) => acc + r.refund_amount, 0);
  const wasteCount = filteredReturns.filter(r => r.condition === 'Damaged_Waste').length;
  const wasteValue = filteredReturns.filter(r => r.condition === 'Damaged_Waste').reduce((acc, r) => acc + r.refund_amount, 0);

  const handleDelete = async (id: string, returnNo: string) => {
    const msg = language === 'mr' 
      ? `परतावा नोंद '${returnNo}' नक्की हटवायची आहे का?` 
      : language === 'hi' 
      ? `क्या आप वास्तव में वापसी प्रविष्टि '${returnNo}' हटाना चाहते हैं?` 
      : `Are you sure you want to delete return record '${returnNo}'?`;
    
    if (window.confirm(msg)) {
      await deleteReturn(id);
    }
  };

  return (
    <div className="space-y-4 pb-20 sm:pb-6">
      {/* Top Header & New Return Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#E7F0EC] flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <span>{language === 'mr' ? 'माल परतावा व्यवस्थापन' : language === 'hi' ? 'सामान वापसी प्रबंधन' : 'Sales Return Management'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8FA69C] mt-0.5">
            {language === 'mr' ? 'ग्राहकांकडून परत आलेला माल, रिफंड व स्टॉक परतावा ट्रॅकिंग' : language === 'hi' ? 'ग्राहकों से वापस आया सामान, रिफंड व स्टॉक वापसी ट्रैकिंग' : 'Track customer returns, refunds, restocks and waste logs'}
          </p>
        </div>

        <button
          onClick={onOpenReturnModal}
          className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'mr' ? 'नवीन माल परतावा नोंदवा' : language === 'hi' ? 'नया सामान वापसी दर्ज करें' : 'Record New Return'}</span>
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white dark:bg-[#131F1B] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#8FA69C]">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {language === 'mr' ? 'एकूण परतावे' : language === 'hi' ? 'कुल वापसी' : 'Total Returns'}
            </span>
            <RotateCcw className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {metrics.totalReturnsCount}
            </span>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
              ₹{metrics.totalRefundAmount.toFixed(0)}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#131F1B] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#8FA69C]">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {language === 'mr' ? 'आजचा रिफंड' : language === 'hi' ? 'आज का रिफंड' : "Today's Refund"}
            </span>
            <DollarSign className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
              ₹{metrics.todayRefundAmount.toFixed(0)}
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              {language === 'mr' ? 'आज झालेला खर्च' : language === 'hi' ? 'आज का खर्च' : 'Paid today'}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#131F1B] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#8FA69C]">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {language === 'mr' ? 'पुन्हा स्टॉकमध्ये' : language === 'hi' ? 'पुनः स्टॉक में' : 'Restocked'}
            </span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {resellableCount}
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              ₹{resellableValue.toFixed(0)}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#131F1B] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-[#8FA69C]">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {language === 'mr' ? 'खराब / नासलेले' : language === 'hi' ? 'खराब / नुकसान' : 'Waste / Spoiled'}
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
              {wasteCount}
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              ₹{wasteValue.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#131F1B] p-3 rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={language === 'mr' ? 'उत्पादन, पावती क्र., ग्राहक किंवा बिल शोधा...' : language === 'hi' ? 'उत्पाद, रसीद सं., ग्राहक या बिल खोजें...' : 'Search by product, return no, customer, bill...'}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-semibold text-slate-800 dark:text-[#E7F0EC]"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Condition Filter */}
          <select
            value={conditionFilter}
            onChange={e => setConditionFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-700 dark:text-[#E7F0EC]"
          >
            <option value="all">{language === 'mr' ? 'सर्व स्थिती' : language === 'hi' ? 'सभी स्थितियां' : 'All Conditions'}</option>
            <option value="Resellable">{language === 'mr' ? 'चांगला माल (स्टॉक)' : language === 'hi' ? 'अच्छा माल (स्टॉक)' : 'Resellable (Stock)'}</option>
            <option value="Damaged_Waste">{language === 'mr' ? 'खराब / नासलेला (नुकसान)' : language === 'hi' ? 'खराब (नुकसान)' : 'Damaged / Waste'}</option>
          </select>

          {/* Time Filter Pill */}
          <select
            value={timeFilter}
            onChange={e => setTimeFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-700 dark:text-[#E7F0EC]"
          >
            <option value="today">{language === 'mr' ? 'आज' : language === 'hi' ? 'आज' : 'Today'}</option>
            <option value="week">{language === 'mr' ? 'या आठवड्यात' : language === 'hi' ? 'इस सप्ताह' : 'This Week'}</option>
            <option value="month">{language === 'mr' ? 'या महिन्यात' : language === 'hi' ? 'इस माह' : 'This Month'}</option>
            <option value="all">{language === 'mr' ? 'सर्व' : language === 'hi' ? 'सभी' : 'All Time'}</option>
          </select>
        </div>
      </div>

      {/* Content: List or Empty State */}
      {displayedReturns.length === 0 ? (
        <div className="bg-white dark:bg-[#131F1B] rounded-3xl p-8 sm:p-12 text-center border border-slate-200 dark:border-[#24352F] shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
            <RotateCcw className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            {language === 'mr' ? 'कोणतीही परतावा नोंद आढळली नाही' : language === 'hi' ? 'कोई वापसी प्रविष्टि नहीं मिली' : 'No Returns Found'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#8FA69C] max-w-sm mx-auto">
            {language === 'mr' ? 'ग्राहकाने परत केलेल्या मालाची नोंद करण्यासाठी वरील बटणावर क्लिक करा.' : language === 'hi' ? 'ग्राहक द्वारा वापस किए गए सामान को दर्ज करने के लिए ऊपर दिए गए बटन पर क्लिक करें।' : 'Click the button above to record customer returns and process refund.'}
          </p>
          <button
            onClick={onOpenReturnModal}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition"
          >
            + {language === 'mr' ? 'परतावा नोंदवा' : language === 'hi' ? 'वापसी दर्ज करें' : 'Record Return'}
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Mobile Cards (Below md) */}
          <div className="md:hidden space-y-2.5">
            {displayedReturns.map(r => (
              <div 
                key={r.id}
                className="bg-white dark:bg-[#131F1B] p-3.5 rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                      {r.return_no}
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-[#E7F0EC] leading-tight">
                      {r.product_name}
                    </h4>
                    {r.invoice_no && (
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {language === 'mr' ? 'बिल क्र:' : language === 'hi' ? 'बिल सं:' : 'Bill:'} {r.invoice_no}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900 dark:text-white block">
                      ₹{r.refund_amount.toFixed(2)}
                    </span>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold mt-0.5 ${
                      r.condition === 'Resellable'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                    }`}>
                      {r.condition === 'Resellable' 
                        ? (language === 'mr' ? 'स्टॉक जोडला' : language === 'hi' ? 'स्टॉक जोड़ा' : 'Restocked')
                        : (language === 'mr' ? 'नुकसान' : language === 'hi' ? 'नुकसान' : 'Damaged')}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-[#8FA69C] flex justify-between items-center pt-1 border-t border-slate-100 dark:border-[#1E2D27]">
                  <span>
                    {r.quantity} {r.unit} &bull; {r.refund_mode} &bull; {r.reason}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">{r.return_date}</span>
                    <button
                      onClick={() => handleDelete(r.id, r.return_no)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {r.customer_name && (
                  <div className="text-[10px] text-slate-500 bg-slate-50 dark:bg-[#1A2A25] px-2 py-1 rounded-lg">
                    {language === 'mr' ? 'ग्राहक:' : language === 'hi' ? 'ग्राहक:' : 'Customer:'} <span className="font-bold text-slate-700 dark:text-slate-300">{r.customer_name}</span> {r.customer_phone ? `(${r.customer_phone})` : ''}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table (md and above) */}
          <div className="hidden md:block bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#1A2A25] text-slate-500 dark:text-[#8FA69C] font-bold border-b border-slate-200 dark:border-[#24352F]">
                <tr>
                  <th className="p-3.5">{language === 'mr' ? 'परतावा क्र.' : language === 'hi' ? 'रसीद सं.' : 'Return No'}</th>
                  <th className="p-3.5">{language === 'mr' ? 'तारीख' : language === 'hi' ? 'दिनांक' : 'Date'}</th>
                  <th className="p-3.5">{language === 'mr' ? 'उत्पादन' : language === 'hi' ? 'उत्पाद' : 'Product'}</th>
                  <th className="p-3.5">{language === 'mr' ? 'प्रमाण' : language === 'hi' ? 'मात्रा' : 'Qty'}</th>
                  <th className="p-3.5">{language === 'mr' ? 'रिफंड रक्कम' : language === 'hi' ? 'रिफंड राशि' : 'Refund'}</th>
                  <th className="p-3.5">{language === 'mr' ? 'पद्धत' : language === 'hi' ? 'माध्यम' : 'Mode'}</th>
                  <th className="p-3.5">{language === 'mr' ? 'स्थिती' : language === 'hi' ? 'स्थिति' : 'Condition'}</th>
                  <th className="p-3.5">{language === 'mr' ? 'कारण' : language === 'hi' ? 'कारण' : 'Reason'}</th>
                  <th className="p-3.5 text-right">{language === 'mr' ? 'कृती' : language === 'hi' ? 'कार्रवाई' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1E2D27]">
                {displayedReturns.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-[#182621] transition">
                    <td className="p-3.5 font-mono font-bold text-purple-600 dark:text-purple-400">
                      {r.return_no}
                      {r.invoice_no && (
                        <span className="block text-[10px] text-slate-400 font-sans">
                          {r.invoice_no}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {r.return_date}
                    </td>
                    <td className="p-3.5 font-bold text-slate-800 dark:text-white">
                      {r.product_name}
                      {r.customer_name && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {r.customer_name}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-700 dark:text-slate-200 font-semibold">
                      {r.quantity} {r.unit}
                    </td>
                    <td className="p-3.5 font-black text-slate-900 dark:text-white">
                      ₹{r.refund_amount.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A2A25] font-semibold text-[11px]">
                        {r.refund_mode}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        r.condition === 'Resellable'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                      }`}>
                        {r.condition === 'Resellable' 
                          ? (language === 'mr' ? '✅ चांगला (स्टॉक)' : language === 'hi' ? '✅ अच्छा (स्टॉक)' : 'Resellable')
                          : (language === 'mr' ? '⚠️ खराब (नुकसान)' : language === 'hi' ? '⚠️ खराब (नुकसान)' : 'Damaged')}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-[#8FA69C] text-[11px] max-w-[150px] truncate" title={r.reason}>
                      {r.reason}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleDelete(r.id, r.return_no)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                        title="Delete Return Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
