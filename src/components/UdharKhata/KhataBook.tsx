import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { UdharCustomer } from '../../types';
import { printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import {
  BookOpen,
  Phone,
  MessageCircle,
  Banknote,
  Smartphone,
  UserPlus,
  Printer,
  Download,
  Eye
} from 'lucide-react';
import { Button, Input, SearchInput, Card, KpiCard, SegmentedControl, StatusBadge, Modal } from '../ui';

export const KhataBook: React.FC = () => {
  const { customers, udharTransactions, addUdharCustomer, recordUdharPayment, metrics } = useStore();
  const { t, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'cleared' | 'all'>('pending');

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

  const handleSendWhatsAppReminder = (customer: UdharCustomer) => {
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    let messageText = '';
    if (language === 'mr') {
      messageText = `नमस्ते ${customer.name} जी!\n\nयोगेश्वरी डेअरी (Yogeshwari Dairy) कडून आपले खाते बाकी आहे:\n` +
        `📌 *शिल्लक बाकी रक्कम (Balance Due): ₹${customer.current_balance.toLocaleString('en-IN')}*\n\n` +
        `कृपया लवकरात लवकर रक्कम जमा करावी ही नम्र विनंती.\n` +
        `💳 *GooglePay / PhonePe UPI:* Q226038088@ybl\n` +
        `धन्यवाद!\nयोगेश्वरी डेअरी & उत्पादन`;
    } else if (language === 'hi') {
      messageText = `नमस्ते ${customer.name} जी!\n\nयोगेश्वरी डेरी (Yogeshwari Dairy) से आपका हिसाब बाकी है:\n` +
        `📌 *बकाया राशि (Balance Due): ₹${customer.current_balance.toLocaleString('en-IN')}*\n\n` +
        `कृपया जल्द से जल्द भुगतान करने की कृपा करें।\n` +
        `💳 *UPI आईडी:* Q226038088@ybl\n` +
        `धन्यवाद!\nयोगेश्वरी डेरी & उत्पादन`;
    } else {
      messageText = `Hello ${customer.name}!\n\nThis is a friendly payment reminder from Yogeshwari Dairy Farm:\n` +
        `📌 *Outstanding Balance: ₹${customer.current_balance.toLocaleString('en-IN')}*\n\n` +
        `Kindly settle the due amount at your earliest convenience.\n` +
        `💳 *UPI ID:* Q226038088@ybl\n` +
        `Thank you!\nYogeshwari Dairy & Products`;
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

    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setNewCustNotes('');
    setIsAddCustModalOpen(false);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    await recordUdharPayment({
      customer_id: paymentCustomer.id,
      amount,
      payment_mode: paymentMode,
      notes: paymentNotes.trim() || undefined
    });

    setPaymentCustomer(null);
    setPaymentAmount('');
    setPaymentNotes('');
  };

  const getMasterKhataPayload = () => {
    const isMr = language === 'mr';
    const isHi = language === 'hi';

    return {
      title: isMr ? 'उधारी खातेवही अहवाल' : isHi ? 'उधारी खाता-बही रिपोर्ट' : 'Customer Credit Khata Ledger Report',
      subtitle: `${t('shopName')} — ${isMr ? 'सर्व ग्राहक बाकी व जमा खाते' : isHi ? 'सभी ग्राहक उधारी व जमा हिसाब' : 'All Customer Receivables & Payments'}`,
      periodText: isMr ? 'सद्यस्थिती उधारी बाकी' : isHi ? 'वर्तमान उधारी स्थिति' : 'Current Outstanding Summary',
      language,
      kpis: [
        { label: isMr ? 'एकूण बाकी रक्कम' : isHi ? 'कुल बकाया राशि' : 'Total Outstanding', value: `₹${metrics.totalOutstandingUdhar.toLocaleString('en-IN')}`, color: 'rose' },
        { label: isMr ? 'एकूण दिलेली उधारी' : isHi ? 'कुल दी गई उधारी' : 'Total Credit Given', value: `₹${customers.reduce((s, c) => s + c.total_credit, 0).toLocaleString('en-IN')}`, color: 'blue' },
        { label: isMr ? 'एकूण जमा रक्कम' : isHi ? 'कुल जमा (वसूली)' : 'Total Recovered', value: `₹${customers.reduce((s, c) => s + c.total_paid, 0).toLocaleString('en-IN')}`, color: 'emerald' },
        { label: isMr ? 'बाकी ग्राहक संख्या' : isHi ? 'बकाया ग्राहक संख्या' : 'Debtors Count', value: `${customers.filter(c => c.current_balance > 0).length}`, color: 'amber' }
      ],
      table: {
        headers: isMr 
          ? ['अ.क्र.', 'ग्राहकाचे नाव', 'मोबाईल क्र.', 'पत्ता / ठिकाण', 'एकूण उधारी (₹)', 'एकूण जमा (₹)', 'बाकी येणे (₹)']
          : isHi
          ? ['क्र.', 'ग्राहक का नाम', 'मोबाइल नंबर', 'पता / स्थान', 'कुल उधारी (₹)', 'कुल जमा (₹)', 'बकाया राशि (₹)']
          : ['Sr.', 'Customer Name', 'Phone', 'Address / Landmark', 'Total Credit (₹)', 'Total Paid (₹)', 'Balance Due (₹)'],
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
          isMr ? 'एकूण' : isHi ? 'कुल योग' : 'Total',
          `${filteredCustomers.length} ${isMr ? 'ग्राहक' : isHi ? 'ग्राहक' : 'Customers'}`,
          '',
          '',
          `₹${filteredCustomers.reduce((s, c) => s + c.total_credit, 0).toLocaleString('en-IN')}`,
          `₹${filteredCustomers.reduce((s, c) => s + c.total_paid, 0).toLocaleString('en-IN')}`,
          `₹${filteredCustomers.reduce((s, c) => s + c.current_balance, 0).toLocaleString('en-IN')}`
        ]
      },
      notes: isMr 
        ? 'उधारी खातेवही अहवाल. सर्व नियमित ग्राहकांकडून आठवडा/महिना अखेरीस वसुली करावी.'
        : isHi
        ? 'उधारी खाता-बही रिपोर्ट। सभी नियमित ग्राहकों से सप्ताह/माह के अंत में वसूली करें।'
        : 'Official customer ledger report. Perform regular billing cycles and collections at week or month ends.'
    };
  };

  const getCustomerStatementPayload = (customer: UdharCustomer) => {
    const isMr = language === 'mr';
    const isHi = language === 'hi';
    const custTxs = udharTransactions.filter(
      t => t.customer_id === customer.id || t.customer_id === customer.name
    );

    return {
      title: `${customer.name} - ${isMr ? 'खातेवही स्टेटमेंट' : isHi ? 'खाता स्टेटमेंट' : 'Customer Account Statement'}`,
      subtitle: `${t('shopName')} — ${customer.phone || '—'} | ${customer.address || 'Local'}`,
      periodText: isMr ? 'वैयक्तिक हिशोब व व्यवहार' : isHi ? 'व्यक्तिगत हिसाब व लेन-देन' : 'Individual Account Ledger & Transactions',
      language,
      kpis: [
        { label: isMr ? 'सध्याची बाकी येणे' : isHi ? 'वर्तमान बकाया राशि' : 'Balance Due', value: `₹${customer.current_balance.toLocaleString('en-IN')}`, color: customer.current_balance > 0 ? 'amber' : 'emerald' },
        { label: isMr ? 'एकूण माल उधारी' : isHi ? 'कुल सामान उधारी' : 'Total Credit Extended', value: `₹${customer.total_credit.toLocaleString('en-IN')}`, color: 'blue' },
        { label: isMr ? 'एकूण जमा रक्कम' : isHi ? 'कुल प्राप्त जमा' : 'Total Paid Received', value: `₹${customer.total_paid.toLocaleString('en-IN')}`, color: 'emerald' },
        { label: isMr ? 'व्यवहार संख्या' : isHi ? 'लेन-देन संख्या' : 'Total Transactions', value: `${custTxs.length}`, color: 'purple' }
      ],
      table: {
        headers: isMr
          ? ['तारीख', 'तपशील', 'प्रकार', 'पेमेंट पद्धत', 'उधारी रक्कम (+₹)', 'जमा रक्कम (-₹)']
          : isHi
          ? ['दिनांक', 'विवरण', 'प्रकार', 'भुगतान माध्यम', 'उधारी राशि (+₹)', 'जमा राशि (-₹)']
          : ['Date', 'Particulars / Description', 'Type', 'Payment Mode', 'Credit (+₹)', 'Paid (-₹)'],
        alignments: ['center', 'left', 'center', 'left', 'right', 'right'] as ('center' | 'left' | 'center' | 'left' | 'right' | 'right' | 'right')[],
        rows: custTxs.map(tx => [
          tx.transaction_date,
          tx.notes || (tx.type === 'Credit_Given' ? (isMr ? 'दूध / डेअरी माल खरेदी' : 'Dairy Goods Purchase') : (isMr ? 'रक्कम जमा' : 'Payment Received')),
          tx.type === 'Credit_Given' ? (isMr ? 'उधारी (+)' : 'Credit (+)') : (isMr ? 'जमा (-)' : 'Paid (-)'),
          tx.payment_mode || '—',
          tx.type === 'Credit_Given' ? `₹${tx.amount.toLocaleString('en-IN')}` : '—',
          tx.type === 'Payment_Received' ? `₹${tx.amount.toLocaleString('en-IN')}` : '—'
        ]),
        summaryRow: [
          isMr ? 'अंतिम बाकी शिल्लक' : 'Closing Balance',
          '',
          '',
          '',
          `₹${customer.total_credit.toLocaleString('en-IN')}`,
          `₹${customer.total_paid.toLocaleString('en-IN')}`
        ]
      },
      notes: `Yogeshwari Dairy & Products • Official Statement • Balance Due: ₹${customer.current_balance.toLocaleString('en-IN')}`
    };
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 sm:p-5 rounded-2xl border border-line shadow-card">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-ink tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-ink-2" />
            <span>{t('khataTitle')}</span>
          </h2>
          <p className="text-xs text-ink-3 mt-0.5">
            {language === 'mr'
              ? 'नियमित ग्राहक, मिठाईवाले आणि हॉटेलांचे उधारी व जमा खातेवही'
              : 'Customer credit ledger for retail clients, halwais, and hotels'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => viewReportPDF(getMasterKhataPayload())}
          >
            <Eye className="w-3.5 h-3.5 text-ink-2" />
            <span>{language === 'mr' ? 'पहा' : 'View'}</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => printReport(getMasterKhataPayload())}
          >
            <Printer className="w-3.5 h-3.5 text-ink-2" />
            <span>{language === 'mr' ? 'प्रिंट' : 'Print'}</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => downloadReportPDF(getMasterKhataPayload())}
          >
            <Download className="w-3.5 h-3.5 text-ink-2" />
            <span>PDF</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsAddCustModalOpen(true)}
          >
            <UserPlus className="w-4 h-4" />
            <span>+ {language === 'mr' ? 'नवीन ग्राहक' : 'Add Customer'}</span>
          </Button>
        </div>
      </div>

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          label={t('totalUdharDue')}
          value={`₹${metrics.totalOutstandingUdhar.toLocaleString('en-IN')}`}
          subtitle={`${customers.filter(c => c.current_balance > 0).length} ${language === 'mr' ? 'ग्राहकांकडून येणे बाकी' : 'customers with dues'}`}
          delta="बाकी"
          deltaType="warn"
        />
        <KpiCard
          label={language === 'mr' ? 'एकूण दिलेली उधारी' : 'Total Credit Given'}
          value={`₹${customers.reduce((acc, c) => acc + c.total_credit, 0).toLocaleString('en-IN')}`}
          subtitle={language === 'mr' ? 'सर्व खात्यांमधील एकूण उधारी' : 'Cumulative credit extended'}
          deltaType="neutral"
        />
        <KpiCard
          label={language === 'mr' ? 'एकूण वसूल झालेली रक्कम' : 'Total Recovered'}
          value={`₹${customers.reduce((acc, c) => acc + c.total_paid, 0).toLocaleString('en-IN')}`}
          subtitle={language === 'mr' ? 'यशस्वीपणे जमा झालेली रक्कम' : 'Successfully received'}
          delta="जमा"
          deltaType="ok"
        />
      </div>

      {/* Search & Status Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 bg-surface p-3 rounded-2xl border border-line shadow-card">
        <div className="flex-1">
          <SearchInput
            placeholder={language === 'mr' ? 'ग्राहकाचे नाव किंवा फोन शोधा...' : 'Search customer by name or phone...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="shrink-0">
          <SegmentedControl
            options={[
              { value: 'pending', label: `${t('debtorsOnly')} (${customers.filter(c => c.current_balance > 0).length})` },
              { value: 'cleared', label: `${t('clearedAccounts')} (${customers.filter(c => c.current_balance <= 0).length})` },
              { value: 'all', label: `${t('allAccounts')} (${customers.length})` },
            ]}
            value={filterStatus}
            onChange={(val) => setFilterStatus(val as any)}
            size="sm"
          />
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredCustomers.map((cust) => {
          const hasBalance = cust.current_balance > 0;

          return (
            <Card
              key={cust.id}
              className="p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-semibold text-ink text-base">
                      {cust.name}
                    </h4>
                    <div className="flex items-center gap-1 text-xs text-ink-3 mt-0.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{cust.phone}</span>
                    </div>
                  </div>

                  <StatusBadge
                    status={hasBalance ? 'warn' : 'ok'}
                    label={hasBalance ? (language === 'mr' ? 'बाकी' : 'Due') : (language === 'mr' ? 'चुकता' : 'Cleared')}
                  />
                </div>

                {cust.address && (
                  <p className="text-[11px] text-ink-3 mb-2 truncate">
                    📍 {cust.address}
                  </p>
                )}

                <div className="bg-surface-2 p-2.5 rounded-xl border border-line/40 my-2 space-y-1 text-xs">
                  <div className="flex justify-between text-ink-3">
                    <span>{language === 'mr' ? 'एकूण उधारी:' : 'Total Credit:'}</span>
                    <span className="font-semibold text-ink tabular-nums">₹{cust.total_credit.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-ink-3">
                    <span>{language === 'mr' ? 'एकूण जमा:' : 'Total Paid:'}</span>
                    <span className="font-semibold text-ok tabular-nums">₹{cust.total_paid.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1.5 border-t border-line/40">
                    <span className="font-medium text-ink-2">{t('balanceDue')}</span>
                    <span className={`text-lg font-semibold tabular-nums ${hasBalance ? 'text-danger' : 'text-ok'}`}>
                      ₹{cust.current_balance.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-line/40 flex items-center gap-2">
                {hasBalance && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setPaymentCustomer(cust);
                      setPaymentAmount(cust.current_balance.toString());
                    }}
                    className="flex-1"
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>{t('recordPaymentJama')}</span>
                  </Button>
                )}

                {hasBalance && cust.phone && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSendWhatsAppReminder(cust)}
                    title={t('sendWhatsAppReminder')}
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-ok" />
                    <span>{language === 'mr' ? 'तगादा' : 'Remind'}</span>
                  </Button>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLedgerCustomer(cust)}
                >
                  {language === 'mr' ? 'हिशोब' : 'Ledger'}
                </Button>
              </div>

            </Card>
          );
        })}
      </div>

      {/* Payment (Jama) Modal */}
      {paymentCustomer && (
        <Modal
          isOpen={!!paymentCustomer}
          onClose={() => setPaymentCustomer(null)}
          title={language === 'mr' ? 'उधारी जमा नोंदवा (Payment)' : 'Record Payment (Jama)'}
          subtitle={`${paymentCustomer.name} (Due: ₹${paymentCustomer.current_balance})`}
        >
          <form onSubmit={handlePaymentSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1">
                {language === 'mr' ? 'जमा रक्कम (₹ Amount) *' : 'Amount Received (₹) *'}
              </label>
              <Input
                type="number"
                step="1"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                leftIcon={<span className="font-semibold text-ink-3">₹</span>}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1">
                {t('paymentMethod')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={paymentMode === 'Cash' ? 'primary' : 'secondary'}
                  onClick={() => setPaymentMode('Cash')}
                >
                  <Banknote className="w-4 h-4" />
                  <span>{t('cash')}</span>
                </Button>

                <Button
                  type="button"
                  variant={paymentMode === 'Online_UPI' ? 'primary' : 'secondary'}
                  onClick={() => setPaymentMode('Online_UPI')}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{t('onlineUpi')}</span>
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1">
                {language === 'mr' ? 'तपशील / शेरा' : 'Notes / Remarks'}
              </label>
              <Input
                type="text"
                placeholder={language === 'mr' ? 'उदा. PhonePe / रोख' : 'e.g. PhonePe / Cash slip'}
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-line/40">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPaymentCustomer(null)}
                className="w-1/2"
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="w-1/2"
              >
                {language === 'mr' ? 'जमा पावती करा' : 'Confirm Payment'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add New Customer Modal */}
      {isAddCustModalOpen && (
        <Modal
          isOpen={isAddCustModalOpen}
          onClose={() => setIsAddCustModalOpen(false)}
          title={language === 'mr' ? 'नवीन ग्राहक उधारी खाते उघडा' : 'Open Customer Credit Account'}
        >
          <form onSubmit={handleAddCustomerSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1">
                {language === 'mr' ? 'ग्राहकाचे नाव *' : 'Customer Name *'}
              </label>
              <Input
                type="text"
                required
                placeholder={language === 'mr' ? 'उदा. गणेश हलवाई' : 'e.g. Sharma Halwai'}
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1">
                {language === 'mr' ? 'मोबाईल नंबर *' : 'Phone Number *'}
              </label>
              <Input
                type="tel"
                required
                placeholder="9822XXXXXX"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1">
                {language === 'mr' ? 'पत्ता किंवा दुकानाचे नाव' : 'Address / Landmark'}
              </label>
              <Input
                type="text"
                placeholder={language === 'mr' ? 'उदा. मेन रोड' : 'e.g. Main Road'}
                value={newCustAddress}
                onChange={(e) => setNewCustAddress(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1">
                {language === 'mr' ? 'शेरा / नोट्स' : 'Notes / Remarks'}
              </label>
              <Input
                type="text"
                placeholder={language === 'mr' ? 'उदा. दर सोमवारी हिशोब' : 'e.g. Settles weekly'}
                value={newCustNotes}
                onChange={(e) => setNewCustNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-line/40">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsAddCustModalOpen(false)}
                className="w-1/2"
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="w-1/2"
              >
                {language === 'mr' ? 'खाते सुरू करा' : 'Create Account'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Customer Ledger Statement Modal */}
      {selectedLedgerCustomer && (
        <Modal
          isOpen={!!selectedLedgerCustomer}
          onClose={() => setSelectedLedgerCustomer(null)}
          title={`${selectedLedgerCustomer.name} - Ledger`}
          subtitle={`📱 ${selectedLedgerCustomer.phone} • 📍 ${selectedLedgerCustomer.address || 'Local'}`}
          maxWidth="lg"
        >
          <div className="space-y-3">
            <div className="bg-surface-2 p-3 rounded-xl border border-line/40 flex justify-between items-center text-xs">
              <div>
                <span className="text-ink-3 block">
                  {language === 'mr' ? 'एकूण बाकी रक्कम:' : 'Outstanding Balance:'}
                </span>
                <span className="text-xl font-semibold text-danger tabular-nums">
                  ₹{selectedLedgerCustomer.current_balance.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => viewReportPDF(getCustomerStatementPayload(selectedLedgerCustomer))}
                >
                  <Eye className="w-3.5 h-3.5 text-ink-2" />
                  <span>{language === 'mr' ? 'पहा' : 'View'}</span>
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => printReport(getCustomerStatementPayload(selectedLedgerCustomer))}
                >
                  <Printer className="w-3.5 h-3.5 text-ink-2" />
                  <span>{language === 'mr' ? 'प्रिंट' : 'Print'}</span>
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => downloadReportPDF(getCustomerStatementPayload(selectedLedgerCustomer))}
                >
                  <Download className="w-3.5 h-3.5 text-ink-2" />
                  <span>PDF</span>
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => handleSendWhatsAppReminder(selectedLedgerCustomer)}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </Button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {udharTransactions
                .filter(t => t.customer_id === selectedLedgerCustomer.id || t.customer_id === selectedLedgerCustomer.name)
                .map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2 rounded-xl border border-line/30 bg-surface-2 text-xs"
                  >
                    <div>
                      <div className="font-medium text-ink">
                        {tx.type === 'Credit_Given'
                          ? (language === 'mr' ? 'उधारी दिली (Goods)' : 'Credit Given')
                          : (language === 'mr' ? 'रक्कम जमा (Payment)' : 'Payment Received')}
                      </div>
                      <div className="text-[10px] text-ink-3">
                        {tx.transaction_date} &bull; {tx.notes || tx.payment_mode}
                      </div>
                    </div>

                    <span className={`font-semibold text-sm tabular-nums ${
                      tx.type === 'Credit_Given' ? 'text-warn' : 'text-ok'
                    }`}>
                      {tx.type === 'Credit_Given' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
            </div>

            <div className="pt-2 border-t border-line/40 text-right">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelectedLedgerCustomer(null)}
              >
                {language === 'mr' ? 'बंद करा' : 'Close'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default KhataBook;
