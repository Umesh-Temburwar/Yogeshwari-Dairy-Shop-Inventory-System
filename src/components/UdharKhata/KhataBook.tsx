import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { UdharCustomer } from '../../types';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Phone, 
  MessageCircle, 
  Banknote, 
  Smartphone, 
  UserCheck, 
  X, 
  Clock, 
  ArrowDownLeft, 
  ArrowUpRight,
  Send,
  UserPlus,
  CreditCard
} from 'lucide-react';

export const KhataBook: React.FC = () => {
  const { customers, udharTransactions, addUdharCustomer, recordUdharPayment, metrics } = useStore();

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

  // Send WhatsApp Reminder
  const handleSendWhatsAppReminder = (customer: UdharCustomer) => {
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const message = encodeURIComponent(
      `नमस्ते ${customer.name} जी!\n\nयोगेश्वरी डेरी फार्म (Yogeshwari Dairy) से आपका हिसाब बाकी है:\n` +
      `📌 *बकाया राशि (Balance Due): ₹${customer.current_balance.toLocaleString('en-IN')}*\n\n` +
      `कृपया जल्द से जल्द भुगतान करने की कृपा करें।\n` +
      `💳 *UPI आईडी:* yogeshwaridairy@okaxis\n` +
      `धन्यवाद!\nयोगेश्वरी डेरी फार्म & स्वीट्स`
    );

    window.open(`https://wa.me/${phoneWithCode}?text=${message}`, '_blank');
  };

  // Handle Add Customer
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

  // Handle Record Payment (Jama)
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer || !paymentAmount || parseFloat(paymentAmount) <= 0) return;

    await recordUdharPayment(
      paymentCustomer.id,
      parseFloat(paymentAmount),
      paymentMode,
      paymentNotes.trim() || 'उधारी खाता जमा (Payment)'
    );

    setPaymentCustomer(null);
    setPaymentAmount('');
    setPaymentNotes('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber-600" />
            <span>उधारी खाता लेजर (Customer Credit / Khata Book)</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            नियमित ग्राहकों, हलवाइयों व होटलों का उधारी व जमा हिसाब-किताब
          </p>
        </div>

        <button
          onClick={() => setIsAddCustModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ नया खाता खोलें (Add Customer)</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">कुल बाजार में उधारी बाकी (Total Due)</span>
          <span className="text-2xl font-black text-amber-700 mt-1 block">
            ₹{metrics.totalOutstandingUdhar.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            {customers.filter(c => c.current_balance > 0).length} ग्राहकों से वसूली बाकी है
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">कुल उधारी दी गई (Lifetime Credit)</span>
          <span className="text-2xl font-black text-slate-800 mt-1 block">
            ₹{customers.reduce((acc, c) => acc + c.total_credit, 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            सभी खातों में कुल दी गई उधारी
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">कुल जमा रकम (Total Recovered)</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            ₹{customers.reduce((acc, c) => acc + c.total_paid, 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            सफलतापूर्वक वसूल की गई राशि
          </span>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ग्राहक का नाम या मोबाइल नंबर खोजें..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              filterStatus === 'pending' ? 'bg-amber-600 text-white font-bold' : 'text-slate-600'
            }`}
          >
            बाकीदार ग्राहक ({customers.filter(c => c.current_balance > 0).length})
          </button>
          <button
            onClick={() => setFilterStatus('cleared')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              filterStatus === 'cleared' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600'
            }`}
          >
            हिसाब चुकता ({customers.filter(c => c.current_balance <= 0).length})
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              filterStatus === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
            }`}
          >
            सभी खाते ({customers.length})
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
              className={`bg-white rounded-2xl p-4 border transition-all duration-150 flex flex-col justify-between ${
                hasBalance ? 'border-amber-200/90 shadow-xs hover:border-amber-400' : 'border-slate-200 opacity-90'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">
                      {cust.name}
                    </h4>
                    <div className="flex items-center gap-1 text-xs text-slate-500 font-medium mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{cust.phone}</span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    hasBalance ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {hasBalance ? 'बाकी है' : 'चुकता'}
                  </span>
                </div>

                {cust.address && (
                  <p className="text-[11px] text-slate-500 mb-2 truncate">
                    📍 {cust.address}
                  </p>
                )}

                {/* Balance & Ledger stats */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 my-2 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>कुल उधारी ली:</span>
                    <span className="font-semibold text-slate-800">₹{cust.total_credit.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>कुल जमा किया:</span>
                    <span className="font-semibold text-emerald-700">₹{cust.total_paid.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-200">
                    <span className="font-bold text-slate-700">वर्तमान बाकी (Balance):</span>
                    <span className={`text-lg font-black ${hasBalance ? 'text-rose-600' : 'text-emerald-700'}`}>
                      ₹{cust.current_balance.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                {hasBalance && (
                  <button
                    onClick={() => {
                      setPaymentCustomer(cust);
                      setPaymentAmount(cust.current_balance.toString());
                    }}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>जमा करें (Pay)</span>
                  </button>
                )}

                {hasBalance && cust.phone && (
                  <button
                    onClick={() => handleSendWhatsAppReminder(cust)}
                    className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1"
                    title="Send WhatsApp Reminder"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>तकादा</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedLedgerCustomer(cust)}
                  className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
                >
                  हिसाब लेजर
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* RECORD PAYMENT (JAMA) MODAL */}
      {paymentCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  उधारी जमा दर्ज करें (Jama Payment)
                </h3>
                <p className="text-xs text-slate-500">
                  {paymentCustomer.name} (बाकी: ₹{paymentCustomer.current_balance})
                </p>
              </div>
              <button 
                onClick={() => setPaymentCustomer(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3.5">
              
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  जमा की जाने वाली रकम (₹ Amount) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    step="1"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border rounded-xl font-bold text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  भुगतान माध्यम (Mode)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('Cash')}
                    className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                      paymentMode === 'Cash' 
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900' 
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>कैश रोकड़</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('Online_UPI')}
                    className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                      paymentMode === 'Online_UPI' 
                        ? 'border-purple-600 bg-purple-50 text-purple-900' 
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-purple-600" />
                    <span>ऑनलाइन UPI</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  विवरण / नोट्स (Notes)
                </label>
                <input
                  type="text"
                  placeholder="उदा. PhonePe से प्राप्त / नकद जमा"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setPaymentCustomer(null)}
                  className="w-1/2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-xs text-slate-700"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  जमा सुरक्षित करें
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ADD NEW CUSTOMER MODAL */}
      {isAddCustModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-900 text-base">
                नया ग्राहक खाता जोड़ें (New Khata)
              </h3>
              <button 
                onClick={() => setIsAddCustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  ग्राहक का नाम *
                </label>
                <input
                  type="text"
                  required
                  placeholder="उदा. रमेश हलवाई / गुप्ता जी"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  मोबाइल नंबर (WhatsApp Reminder के लिए) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="98XXXXXXXX"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  पता या दुकान का नाम
                </label>
                <input
                  type="text"
                  placeholder="उदा. बस स्टैंड चौक, दुकान नं 4"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  नोट्स
                </label>
                <input
                  type="text"
                  placeholder="उदा. हर सोमवार को भुगतान करता है"
                  value={newCustNotes}
                  onChange={(e) => setNewCustNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddCustModalOpen(false)}
                  className="w-1/2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-xs text-slate-700"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                >
                  खाता खोलें
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* CUSTOMER LEDGER STATEMENT MODAL */}
      {selectedLedgerCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {selectedLedgerCustomer.name} - हिसाब लेजर
                </h3>
                <p className="text-xs text-slate-500">
                  📱 {selectedLedgerCustomer.phone} &bull; 📍 {selectedLedgerCustomer.address || 'Local'}
                </p>
              </div>
              <button 
                onClick={() => setSelectedLedgerCustomer(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 flex justify-between items-center text-xs">
              <div>
                <span className="text-amber-800 font-semibold block">कुल बाकी रकम:</span>
                <span className="text-xl font-black text-amber-950">
                  ₹{selectedLedgerCustomer.current_balance.toLocaleString('en-IN')}
                </span>
              </div>

              <button
                onClick={() => handleSendWhatsAppReminder(selectedLedgerCustomer)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp तकादा</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                हाल के लेन-देन (Transactions History):
              </h4>
              
              {udharTransactions
                .filter(t => t.customer_id === selectedLedgerCustomer.id || t.customer_id === selectedLedgerCustomer.name)
                .map((tx) => (
                  <div 
                    key={tx.id}
                    className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        {tx.type === 'Credit_Given' ? 'उधारी दी (Goods Credit)' : 'जमा प्राप्त हुई (Payment Recv)'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {tx.transaction_date} &bull; {tx.notes || tx.payment_mode}
                      </div>
                    </div>

                    <span className={`font-black text-sm ${
                      tx.type === 'Credit_Given' ? 'text-amber-600' : 'text-emerald-700'
                    }`}>
                      {tx.type === 'Credit_Given' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
            </div>

            <div className="pt-2 border-t text-right">
              <button
                onClick={() => setSelectedLedgerCustomer(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                बंद करें
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

