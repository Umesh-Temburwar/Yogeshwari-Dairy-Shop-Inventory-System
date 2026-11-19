import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { UdharCustomer } from '../../types';
import { exportReportToPDF, printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import { CompactPageHeader, CompactStatStrip } from '../Common/CompactPageHeader';
import { ActiveOperatorBar } from '../Common/ActiveOperatorBar';
import { LoadOlderHistoryButton } from '../Common/LoadOlderHistoryButton';
import {
  BookOpen,
  Search,
  Phone,
  MessageCircle,
  Banknote,
  Smartphone,
  X,
  UserPlus,
  FileText,
  Printer,
  Download,
  Eye
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
    const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      alert('Valid mobile number not available.');
      return;
    }
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const currentDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const messageText = `Hello ${customer.name}!\n\nThis is a friendly payment reminder from Yogeshwari Dairy Farm (${currentDate}):\n` +
      `📌 *Outstanding Balance: ₹${customer.current_balance.toLocaleString('en-IN')}*\n\n` +
      `Kindly settle the due amount at your earliest convenience.\n` +
      `💳 *UPI ID:* Q226038088@ybl\n` +
      `Thank you!\nYogeshwari Dairy Products`;

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

    const defaultNotes = 'Udhar Credit Payment Received';
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

  const getMasterKhataPayload = () => {
    const isMr = language === 'mr';
    const isHi = language === 'hi';
    const totalDue = customers.reduce((sum, c) => sum + Math.max(0, c.current_balance), 0);
    const totalCredit = customers.reduce((sum, c) => sum + c.total_credit, 0);
    const totalPaid = customers.reduce((sum, c) => sum + c.total_paid, 0);

    return {
      title: 'Customer Credit Ledger & Udhar Khata Book',
      subtitle: 'Yogeshwari Dairy Farm & Products ERP',
      periodText: 'Current Outstanding Receivables',
      language,
      kpis: [
        { label: 'Total Outstanding Due', value: `₹${totalDue.toLocaleString('en-IN')}`, color: 'amber' },
        { label: 'Total Credit Extended', value: `₹${totalCredit.toLocaleString('en-IN')}`, color: 'blue' },
        { label: 'Total Payments Recovered', value: `₹${totalPaid.toLocaleString('en-IN')}`, color: 'emerald' },
        { label: 'Total Accounts', value: `${customers.length}`, color: 'purple' }
      ],
      table: {
        headers: ['Sr.No.', 'Customer Name', 'Phone', 'Address', 'Total Credit (₹)', 'Total Paid (₹)', 'Balance Due (₹)'],
        alignments: ['center', 'left', 'center', 'left', 'right', 'right', 'right'] as ('center' | 'left' | 'center' | 'left' | 'right' | 'right' | 'right')[],
        rows: filteredCustomers.map((c, idx) => [
          idx + 1,
          c.name,
          c.phone || '—',
          c.address || 'Local',
          `₹${c.total_credit.toLocaleString('en-IN')}`,
          `₹${c.total_paid.toLocaleString('en-IN')}`,
          `₹${c.current_balance.toLocaleString('en-IN')}`
        ]),
        summaryRow: [
          'Total',
          `${filteredCustomers.length} ${'Customers'}`,
          '',
          '',
          `₹${filteredCustomers.reduce((s, c) => s + c.total_credit, 0).toLocaleString('en-IN')}`,
          `₹${filteredCustomers.reduce((s, c) => s + c.total_paid, 0).toLocaleString('en-IN')}`,
          `₹${filteredCustomers.reduce((s, c) => s + c.current_balance, 0).toLocaleString('en-IN')}`
        ]
      },
      notes: 'Official customer ledger report. Perform regular billing cycles and collections at week or month ends.'
    };
  };

  const handleViewKhataBookPDF = () => {
    viewReportPDF(getMasterKhataPayload());
  };

  const handlePrintKhataBookPDF = () => {
    printReport(getMasterKhataPayload());
  };

  const handleDownloadKhataBookPDF = () => {
    downloadReportPDF(getMasterKhataPayload());
  };

  const getCustomerStatementPayload = (customer: UdharCustomer) => {
    const isMr = language === 'mr';
    const isHi = language === 'hi';
    const custTxs = udharTransactions.filter(
      t => t.customer_id === customer.id || t.customer_id === customer.name
    );

    return {
      title: `${customer.name} - ${'Customer Account Statement'}`,
      subtitle: `Yogeshwari Dairy ERP — Phone: ${customer.phone || '—'} | ${customer.address || 'Local'}`,
      periodText: 'Individual Account Ledger & Transactions',
      language,
      kpis: [
        { label: 'Balance Due', value: `₹${customer.current_balance.toLocaleString('en-IN')}`, color: customer.current_balance > 0 ? 'amber' : 'emerald' },
        { label: 'Total Credit Extended', value: `₹${customer.total_credit.toLocaleString('en-IN')}`, color: 'blue' },
        { label: 'Total Paid Received', value: `₹${customer.total_paid.toLocaleString('en-IN')}`, color: 'emerald' },
        { label: 'Total Transactions', value: `${custTxs.length}`, color: 'purple' }
      ],
      table: {
        headers: ['Date', 'Particulars / Description', 'Type', 'Payment Mode', 'Credit (+₹)', 'Paid (-₹)'],
        alignments: ['center', 'left', 'center', 'left', 'right', 'right'] as ('center' | 'left' | 'center' | 'left' | 'right' | 'right')[],
        rows: custTxs.map(tx => [
          tx.transaction_date,
          tx.notes || (tx.type === 'Credit_Given' ? ('Dairy Goods Purchase') : ('Payment Received')),
          tx.type === 'Credit_Given' ? ('Credit (+)') : ('Paid (-)'),
          tx.payment_mode || '—',
          tx.type === 'Credit_Given' ? `₹${tx.amount.toLocaleString('en-IN')}` : '—',
          tx.type === 'Payment_Received' ? `₹${tx.amount.toLocaleString('en-IN')}` : '—'
        ]),
        summaryRow: [
          'Closing Balance',
          '',
          '',
          '',
          `₹${customer.total_credit.toLocaleString('en-IN')}`,
          `₹${customer.total_paid.toLocaleString('en-IN')}`
        ]
      },
      notes: `Customer Signature: ___________________ | Authorized Stamp: Yogeshwari Dairy. Balance Due: ₹${customer.current_balance.toLocaleString('en-IN')}`
    };
  };

  const handleViewCustomerStatementPDF = (customer: UdharCustomer) => {
    viewReportPDF(getCustomerStatementPayload(customer));
  };

  const handlePrintCustomerStatementPDF = (customer: UdharCustomer) => {
    printReport(getCustomerStatementPayload(customer));
  };

  const handleDownloadCustomerStatementPDF = (customer: UdharCustomer) => {
    downloadReportPDF(getCustomerStatementPayload(customer));
  };

  return (
    <div className="space-y-2.5 sm:space-y-3 max-w-7xl mx-auto pb-28 lg:pb-8">
      {/* 0. POS-STYLE ACTIVE OPERATOR & STORE BADGE BAR */}
      <ActiveOperatorBar
        locationName="Udhar Khata & Credit Ledger"
        pulseColor="amber"
        className="mb-1"
      />

      {/* 1. Compact Header + More (⋮) Exports Sheet + Round Add Customer CTA */}
      <CompactPageHeader
        title={t('khataTitle')}
        icon={<BookOpen className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />}
        primaryAction={{
          label: 'Add',
          icon: <UserPlus className="w-4 h-4 stroke-[2.5]" />,
          onClick: () => setIsAddCustModalOpen(true),
          ariaLabel: 'Add new customer'
        }}
        moreTitle={'Khata Reports'}
        moreActions={[
          {
            id: 'view-pdf',
            label: 'View Khata PDF',
            icon: <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
            onClick: handleViewKhataBookPDF
          },
          {
            id: 'print',
            label: 'Print Report',
            icon: <Printer className="w-4 h-4 text-slate-500 dark:text-[#8FA69C]" />,
            onClick: handlePrintKhataBookPDF
          },
          {
            id: 'download-pdf',
            label: 'Download PDF',
            icon: <Download className="w-4 h-4" />,
            onClick: handleDownloadKhataBookPDF,
            tone: 'primary'
          }
        ]}
      />

      {/* 2. Slim 3-Stat Summary Strip */}
      <CompactStatStrip
        columns={3}
        items={[
          {
            label: 'Due',
            value: `₹${metrics.totalOutstandingUdhar.toLocaleString('en-IN')}`,
            valueClassName: 'text-amber-600 dark:text-amber-400',
            onClick: () => setFilterStatus('pending')
          },
          {
            label: 'Given',
            value: `₹${customers.reduce((acc, c) => acc + c.total_credit, 0).toLocaleString('en-IN')}`
          },
          {
            label: 'Recovered',
            value: `₹${customers.reduce((acc, c) => acc + c.total_paid, 0).toLocaleString('en-IN')}`,
            valueClassName: 'text-emerald-700 dark:text-emerald-400',
            onClick: () => setFilterStatus('cleared')
          }
        ]}
      />

      {/* 3. Sticky Search + One-Row Snap Filter Chips with Scroll Fade */}
      <div className="sticky top-0 z-20 -mx-2.5 sm:-mx-6 px-2.5 sm:px-6 pt-1 pb-2 bg-[#f8fafc] dark:bg-[#0B1210] border-b border-slate-200/70 dark:border-[#1E2E28] space-y-1.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8FA69C] pointer-events-none" />
          <input
            type="text"
            placeholder={'Search customer by name or phone...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search customer"
            className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-300/90 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="relative">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory pr-8 py-0.5">
            {(
              [
                { id: 'pending' as const, label: t('debtorsOnly'), count: customers.filter(c => c.current_balance > 0).length },
                { id: 'cleared' as const, label: t('clearedAccounts'), count: customers.filter(c => c.current_balance <= 0).length },
                { id: 'all' as const, label: 'All Accounts', count: customers.length }
              ]
            ).map((chip) => {
              const active = filterStatus === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilterStatus(chip.id)}
                  className={`snap-start shrink-0 h-8 px-3 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors active:scale-[0.97] cursor-pointer ${
                    active
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-[#131F1B] text-slate-700 dark:text-[#C4D4CE] border-slate-200 dark:border-[#24352F]'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full leading-none ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#1E2E28] text-slate-600 dark:text-[#8FA69C]'
                    }`}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-7 bg-gradient-to-l from-[#f8fafc] dark:from-[#0B1210] to-transparent"
          />
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
                    {hasBalance ? ('Due') : ('Cleared')}
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
                    <span>{'Total Credit:'}</span>
                    <span className="font-semibold text-slate-800 dark:text-white">₹{cust.total_credit.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-[#8FA69C]">
                    <span>{'Total Paid:'}</span>
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
              <div className="pt-2 border-t border-slate-100 dark:border-[#24352F] flex flex-wrap items-center gap-1.5 sm:gap-2">
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
                    <span>{'Remind'}</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedLedgerCustomer(cust)}
                  className="py-2 px-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#24352F] text-slate-700 dark:text-[#8FA69C] font-semibold text-xs"
                >
                  {'Ledger'}
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
                  {'Record Customer Payment (Jama)'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
                  {paymentCustomer.name} ({'Due:'} ₹{paymentCustomer.current_balance})
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
                  {'Amount Received (₹) *'}
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
                  {'Notes / Remarks'}
                </label>
                <input
                  type="text"
                  placeholder={'e.g. Received via PhonePe / Cash slip'}
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
                  {'Confirm Payment'}
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
                {'Open New Customer Credit Account'}
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
                  {'Customer Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={'e.g. Sharma Halwai / Hotel Ganesh'}
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                  {'Phone Number (for WhatsApp reminders) *'}
                </label>
                <input
                  type="tel"
                  required
                  placeholder={'e.g. 9822XXXXXX'}
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                  {'Address / Landmark'}
                </label>
                <input
                  type="text"
                  placeholder={'e.g. Near Bus Stand, Main Road'}
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                  {'Notes / Remarks'}
                </label>
                <input
                  type="text"
                  placeholder={'e.g. Settles bill every Monday'}
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
                  {'Create Account'}
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
                  {selectedLedgerCustomer.name} - {'Account Ledger'}
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
                  {'Outstanding Balance:'}
                </span>
                <span className="text-xl font-black text-amber-950 dark:text-amber-400">
                  ₹{selectedLedgerCustomer.current_balance.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleViewCustomerStatementPDF(selectedLedgerCustomer)}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#131F1B] hover:bg-slate-100 text-slate-800 dark:text-white font-bold text-xs flex items-center gap-1 border border-slate-200 dark:border-[#24352F] shadow-xs active:scale-95"
                  title="View Customer Statement PDF"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-500" />
                  <span>{'View'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintCustomerStatementPDF(selectedLedgerCustomer)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95"
                  title="Print Customer Statement"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>{'Print'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadCustomerStatementPDF(selectedLedgerCustomer)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95"
                  title="Download Customer Statement PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{'Statement PDF'}</span>
                </button>

                <button
                  onClick={() => handleSendWhatsAppReminder(selectedLedgerCustomer)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{'WhatsApp Reminder'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] uppercase tracking-wider">
                {'Recent Transactions:'}
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
                          ? ('Credit Given')
                          : ('Payment Received')}
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
              <LoadOlderHistoryButton entity="udharTransactions" />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-[#24352F] text-right">
              <button
                onClick={() => setSelectedLedgerCustomer(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-[#1A2A25] hover:bg-slate-800 dark:hover:bg-[#24352F] text-white font-bold text-xs"
              >
                {'Close'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
