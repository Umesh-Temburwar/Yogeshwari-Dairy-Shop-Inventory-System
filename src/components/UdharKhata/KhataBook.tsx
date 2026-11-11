import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { UdharCustomer } from '../../types';
import {
  BookOpen,
  Search,
  Phone,
  MessageCircle,
  Banknote,
  Smartphone,
  X,
  UserPlus
} from 'lucide-react';

export const KhataBook: React.FC = () => {
  const { customers, udharTransactions, addUdharCustomer, recordUdharPayment, metrics } = useStore();
  const { t, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'cleared'>('pending');

  // Customer creation modal
  const [isAddCustModalOpen, setIsAddCustModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustNotes, setNewCustNotes] = useState('');

  // Payment (Jama) modal
  const [paymentCustomer, setPaymentCustomer] = useState<UdharCustomer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Online_UPI'>('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Customer Ledger history modal
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState<UdharCustomer | null>(null);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery);

      let matchesStatus = true;
      if (filterStatus === 'pending') {
        matchesStatus = c.current_balance > 0;
      } else if (filterStatus === 'cleared') {
        matchesStatus = c.current_balance <= 0;
      }

      return matchesSearch && matchesStatus;
    });
  }, [customers, searchQuery, filterStatus]);

  // Send WhatsApp Reminder in active language
  const handleSendWhatsAppReminder = (customer: UdharCustomer) => {
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    let messageText = '';
    if (language === 'mr') {
      messageText = `नमस्ते ${customer.name} जी!\n\nयोगेश्वरी डेअरी फार्म (Yogeshwari Dairy) कडून आपले खाते बाकी आहे:\n` +
        `📌 *शिल्लक बाकी रक्कम (Balance Due): ₹${customer.current_balance.toLocaleString('en-IN')}*\n\n` +
        `कृपया लवकरात लवकर रक्कम जमा करावी ही नम्र विनंती.\n` +
        `💳 *GooglePay / PhonePe UPI:* yogeshwaridairy@okaxis\n` +
        `धन्यवाद!\nयोगेश्वरी डेअरी फार्म & स्वीट्स`;
    } else if (language === 'hi') {
      messageText = `नमस्ते ${customer.name} जी!\n\nयोगेश्वरी डेरी फार्म (Yogeshwari Dairy) से आपका हिसाब बाकी है:\n` +
        `📌 *बकाया राशि (Balance Due): ₹${customer.current_balance.toLocaleString('en-IN')}*\n\n` +
        `कृपया जल्द से जल्द भुगतान करने की कृपा करें।\n` +
        `💳 *UPI आईडी:* yogeshwaridairy@okaxis\n` +
        `धन्यवाद!\nयोगेश्वरी डेरी फार्म & स्वीट्स`;
    } else {
      messageText = `Hello ${customer.name}!\n\nThis is a friendly payment reminder from Yogeshwari Dairy Farm:\n` +
        `📌 *Outstanding Balance: ₹${customer.current_balance.toLocaleString('en-IN')}*\n\n` +
        `Kindly settle the due amount at your earliest convenience.\n` +
        `💳 *UPI ID:* yogeshwaridairy@okaxis\n` +
        `Thank you!\nYogeshwari Dairy & Products `;
    }

    const message = encodeURIComponent(messageText);
    window.open(`https://wa.me/${phoneWithCode}?text=${message}`, '_blank');
  };

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;

    await addUdharCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      address: newCustAddress.trim() || undefined,
      notes: newCustNotes.trim() || undefined
    });

    setIsAddCustModalOpen(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setNewCustNotes('');
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer || !paymentAmount || parseFloat(paymentAmount) <= 0) return;

    const defaultNotes = language === 'mr' ? 'उधारी खाते पावती जमा' : language === 'hi' ? 'उधारी खाता जमा (Payment)' : 'Udhar Credit Payment Received';
    await recordUdharPayment(
      paymentCustomer.id,
      parseFloat(paymentAmount),
      paymentMode,
      paymentNotes.trim() || defaultNotes
    );

    setPaymentCustomer(null);
    setPaymentAmount('');
    setPaymentNotes('');
  };

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131F1B] p-5 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <span>{t('khataTitle')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium mt-0.5">
            {language === 'mr'
              ? 'नियमित ग्राहक, मिठाईवाले आणि हॉटेलांचे उधारी व जमा खातेवही'
              : language === 'hi'
                ? 'नियमित ग्राहकों, हलवाइयों व होटलों का उधारी व जमा हिसाब-किताब'
                : 'Customer credit ledger for retail clients, halwais, and hotels'}
          </p>
        </div>

        <button
          onClick={() => setIsAddCustModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ {language === 'mr' ? 'नवीन ग्राहक खाते जोडा' : language === 'hi' ? 'नया खाता खोलें' : 'Add New Customer'}</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-[#8FA69C] block">
            {t('totalUdharDue')}
          </span>
          <span className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1 block">
            ₹{metrics.totalOutstandingUdhar.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-[#8FA69C] font-medium">
            {customers.filter(c => c.current_balance > 0).length} {language === 'mr' ? 'ग्राहकांकडून येणे बाकी आहे' : language === 'hi' ? 'ग्राहकों से वसूली बाकी है' : 'customers with dues'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-[#8FA69C] block">
            {language === 'mr' ? 'एकूण दिलेली उधारी' : language === 'hi' ? 'कुल उधारी दी गई' : 'Total Credit Given'}
          </span>
          <span className="text-2xl font-black text-slate-800 dark:text-white mt-1 block">
            ₹{customers.reduce((acc, c) => acc + c.total_credit, 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-[#8FA69C] font-medium">
            {language === 'mr' ? 'सर्व खात्यांमधील एकूण उधारी' : language === 'hi' ? 'सभी खातों में कुल दी गई उधारी' : 'Cumulative credit extended'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-[#8FA69C] block">
            {language === 'mr' ? 'एकूण वसूल झालेली रक्कम' : language === 'hi' ? 'कुल जमा रकम (Recovered)' : 'Total Recovered'}
          </span>
          <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1 block">
            ₹{customers.reduce((acc, c) => acc + c.total_paid, 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-[#8FA69C] font-medium">
            {language === 'mr' ? 'यशस्वीपणे जमा झालेली रक्कम' : language === 'hi' ? 'सफलतापूर्वक वसूल की गई राशि' : 'Successfully received'}
          </span>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-[#131F1B] p-3.5 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={language === 'mr' ? 'ग्राहकाचे नाव किंवा मोबाईल क्रमांक शोधा...' : language === 'hi' ? 'ग्राहक का नाम या मोबाइल नंबर खोजें...' : 'Search customer by name or phone...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#1A2A25] p-1 rounded-xl shrink-0">
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${filterStatus === 'pending' ? 'bg-amber-600 text-white font-bold' : 'text-slate-600 dark:text-[#8FA69C]'
              }`}
          >
            {t('debtorsOnly')} ({customers.filter(c => c.current_balance > 0).length})
          </button>
          <button
            onClick={() => setFilterStatus('cleared')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${filterStatus === 'cleared' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 dark:text-[#8FA69C]'
              }`}
          >
            {t('clearedAccounts')} ({customers.filter(c => c.current_balance <= 0).length})
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${filterStatus === 'all' ? 'bg-white dark:bg-[#131F1B] text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-600 dark:text-[#8FA69C]'
              }`}
          >
            {t('allAccounts')} ({customers.length})
          </button>
        </div>
      </div>

      {/* Customers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => {
          const hasBalance = cust.current_balance > 0;

          return (
            <div
              key={cust.id}
              className={`bg-white dark:bg-[#131F1B] rounded-2xl p-4 border transition-all duration-150 flex flex-col justify-between ${hasBalance ? 'border-amber-200/90 dark:border-amber-900/40 shadow-xs hover:border-amber-400 dark:hover:border-amber-600' : 'border-slate-200 dark:border-[#24352F] opacity-90'
                }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                      {cust.name}
                    </h4>
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-[#8FA69C] font-medium mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{cust.phone}</span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${hasBalance ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-transparent dark:border-amber-800/40' : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    }`}>
                    {hasBalance ? (language === 'mr' ? 'बाकी आहे' : language === 'hi' ? 'बाकी है' : 'Due') : (language === 'mr' ? 'चुकता' : language === 'hi' ? 'चुकता' : 'Cleared')}
                  </span>
                </div>

                {cust.address && (
                  <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] mb-2 truncate">
                    📍 {cust.address}
                  </p>
                )}

                {/* Balance & Ledger stats */}
                <div className="bg-slate-50 dark:bg-[#1A2A25] p-2.5 rounded-xl border border-slate-100 dark:border-[#24352F] my-2 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500 dark:text-[#8FA69C]">
                    <span>{language === 'mr' ? 'एकूण उधारी घेतली:' : language === 'hi' ? 'कुल उधारी ली:' : 'Total Credit:'}</span>
                    <span className="font-semibold text-slate-800 dark:text-white">₹{cust.total_credit.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-[#8FA69C]">
                    <span>{language === 'mr' ? 'एकूण जमा केली:' : language === 'hi' ? 'कुल जमा किया:' : 'Total Paid:'}</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">₹{cust.total_paid.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-200 dark:border-[#24352F]">
                    <span className="font-bold text-slate-700 dark:text-[#8FA69C]">{t('balanceDue')}</span>
                    <span className={`text-lg font-black ${hasBalance ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                      ₹{cust.current_balance.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 dark:border-[#24352F] flex items-center gap-2">
                {hasBalance && (
                  <button
                    onClick={() => {
                      setPaymentCustomer(cust);
                      setPaymentAmount(cust.current_balance.toString());
                    }}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>{t('recordPaymentJama')}</span>
                  </button>
                )}

                {hasBalance && cust.phone && (
                  <button
                    onClick={() => handleSendWhatsAppReminder(cust)}
                    className="py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 font-bold text-xs flex items-center gap-1"
                    title={t('sendWhatsAppReminder')}
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{language === 'mr' ? 'तगादा' : language === 'hi' ? 'तकादा' : 'Remind'}</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedLedgerCustomer(cust)}
                  className="py-2 px-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#24352F] text-slate-700 dark:text-[#8FA69C] font-semibold text-xs"
                >
                  {language === 'mr' ? 'हिशोब वही' : language === 'hi' ? 'हिसाब लेजर' : 'Ledger'}
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* RECORD PAYMENT (JAMA) MODAL */}
      {paymentCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131F1B] rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-transparent dark:border-[#24352F]">

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#24352F] pb-2">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {language === 'mr' ? 'उधारी जमा नोंदवा (Jama Payment)' : language === 'hi' ? 'उधारी जमा दर्ज करें (Jama Payment)' : 'Record Customer Payment (Jama)'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
                  {paymentCustomer.name} ({language === 'mr' ? 'बाकी:' : language === 'hi' ? 'बाकी:' : 'Due:'} ₹{paymentCustomer.current_balance})
                </p>
              </div>
              <button
                onClick={() => setPaymentCustomer(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3.5">

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                  {language === 'mr' ? 'जमा करावयाची रक्कम (₹ Amount) *' : language === 'hi' ? 'जमा की जाने वाली रकम (₹ Amount) *' : 'Amount Received (₹) *'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 dark:text-[#8FA69C]">₹</span>
                  <input
                    type="number"
                    step="1"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white rounded-xl font-bold text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                  {t('paymentMethod')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('Cash')}
                    className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${paymentMode === 'Cash'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-[#24352F] text-slate-600 dark:text-[#8FA69C]'
                      }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t('cash')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('Online_UPI')}
                    className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${paymentMode === 'Online_UPI'
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/50 text-purple-900 dark:text-purple-300'
                      : 'border-slate-200 dark:border-[#24352F] text-slate-600 dark:text-[#8FA69C]'
                      }`}
                  >
                    <Smartphone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>{t('onlineUpi')}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                  {language === 'mr' ? 'तपशील / शेरा' : language === 'hi' ? 'विवरण / नोट्स' : 'Notes / Remarks'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'mr' ? 'उदा. PhonePe द्वारे जमा / रोख पावती' : language === 'hi' ? 'उदा. PhonePe से प्राप्त / नकद जमा' : 'e.g. Received via PhonePe / Cash slip'}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-[#24352F]">
                <button
                  type="button"
                  onClick={() => setPaymentCustomer(null)}
                  className="w-1/2 py-2 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#24352F] font-semibold text-xs text-slate-700 dark:text-[#8FA69C]"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  {language === 'mr' ? 'जमा पावती करा' : language === 'hi' ? 'जमा सुरक्षित करें' : 'Confirm Payment'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ADD NEW CUSTOMER MODAL */}
      {isAddCustModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131F1B] rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-transparent dark:border-[#24352F]">

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#24352F] pb-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {language === 'mr' ? 'नवीन ग्राहक उधारी खाते उघडा' : language === 'hi' ? 'नया ग्राहक खाता जोड़ें' : 'Open New Customer Credit Account'}
              </h3>
              <button
                onClick={() => setIsAddCustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                  {language === 'mr' ? 'ग्राहकाचे नाव *' : language === 'hi' ? 'ग्राहक का नाम *' : 'Customer Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'mr' ? 'उदा. गणेश हलवाई / तानाजी हॉटेल' : language === 'hi' ? 'उदा. रमेश हलवाई / गुप्ता जी' : 'e.g. Sharma Halwai / Hotel Ganesh'}
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                  {language === 'mr' ? 'मोबाईल नंबर (WhatsApp तगाद्यासाठी) *' : language === 'hi' ? 'मोबाइल नंबर (WhatsApp Reminder के लिए) *' : 'Phone Number (for WhatsApp reminders) *'}
                </label>
                <input
                  type="tel"
                  required
                  placeholder="98XXXXXXXX"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                  {language === 'mr' ? 'पत्ता किंवा दुकानाचे नाव' : language === 'hi' ? 'पता या दुकान का नाम' : 'Address / Landmark'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'mr' ? 'उदा. बस स्टँड चौक, मेन रोड' : language === 'hi' ? 'उदा. बस स्टैंड चौक, दुकान नं 4' : 'e.g. Near Bus Stand, Main Road'}
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                  {language === 'mr' ? 'शेरा / नोट्स' : language === 'hi' ? 'नोट्स' : 'Notes / Remarks'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'mr' ? 'उदा. दर सोमवारी हिशोब करतात' : language === 'hi' ? 'उदा. हर सोमवार को भुगतान करता है' : 'e.g. Settles bill every Monday'}
                  value={newCustNotes}
                  onChange={(e) => setNewCustNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-[#24352F]">
                <button
                  type="button"
                  onClick={() => setIsAddCustModalOpen(false)}
                  className="w-1/2 py-2 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#24352F] font-semibold text-xs text-slate-700 dark:text-[#8FA69C]"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                >
                  {language === 'mr' ? 'खाते सुरू करा' : language === 'hi' ? 'खाता खोलें' : 'Create Account'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* CUSTOMER LEDGER STATEMENT MODAL */}
      {selectedLedgerCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131F1B] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-transparent dark:border-[#24352F]">

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#24352F] pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  {selectedLedgerCustomer.name} - {language === 'mr' ? 'हिशोब लेजर' : language === 'hi' ? 'हिसाब लेजर' : 'Account Ledger'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
                  📱 {selectedLedgerCustomer.phone} &bull; 📍 {selectedLedgerCustomer.address || 'Local'}
                </p>
              </div>
              <button
                onClick={() => setSelectedLedgerCustomer(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 dark:bg-[#1A2A25] p-3 rounded-2xl border border-amber-200 dark:border-[#24352F] flex justify-between items-center text-xs">
              <div>
                <span className="text-amber-800 dark:text-amber-300 font-semibold block">
                  {language === 'mr' ? 'एकूण बाकी रक्कम:' : language === 'hi' ? 'कुल बाकी रकम:' : 'Outstanding Balance:'}
                </span>
                <span className="text-xl font-black text-amber-950 dark:text-amber-400">
                  ₹{selectedLedgerCustomer.current_balance.toLocaleString('en-IN')}
                </span>
              </div>

              <button
                onClick={() => handleSendWhatsAppReminder(selectedLedgerCustomer)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{language === 'mr' ? 'WhatsApp तगादा' : language === 'hi' ? 'WhatsApp तकादा' : 'WhatsApp Reminder'}</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] uppercase tracking-wider">
                {language === 'mr' ? 'अलिकडील व्यवहार (Transactions):' : language === 'hi' ? 'हाल के लेन-देन (Transactions):' : 'Recent Transactions:'}
              </h4>

              {udharTransactions
                .filter(t => t.customer_id === selectedLedgerCustomer.id || t.customer_id === selectedLedgerCustomer.name)
                .map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-[#24352F] bg-slate-50 dark:bg-[#1A2A25] text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {tx.type === 'Credit_Given'
                          ? (language === 'mr' ? 'उधारी दिली (Goods Credit)' : language === 'hi' ? 'उधारी दी (Goods Credit)' : 'Credit Given')
                          : (language === 'mr' ? 'रक्कम जमा झाली (Payment Recv)' : language === 'hi' ? 'जमा प्राप्त हुई (Payment Recv)' : 'Payment Received')}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-[#8FA69C]">
                        {tx.transaction_date} &bull; {tx.notes || tx.payment_mode}
                      </div>
                    </div>

                    <span className={`font-black text-sm ${tx.type === 'Credit_Given' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                      }`}>
                      {tx.type === 'Credit_Given' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-[#24352F] text-right">
              <button
                onClick={() => setSelectedLedgerCustomer(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-[#1A2A25] hover:bg-slate-800 dark:hover:bg-[#24352F] text-white font-bold text-xs"
              >
                {language === 'mr' ? 'बंद करा' : language === 'hi' ? 'बंद करें' : 'Close'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
