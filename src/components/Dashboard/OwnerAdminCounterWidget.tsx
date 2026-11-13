import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { AdminActivity } from '../../types';
import { 
  ShieldCheck, 
  Clock, 
  Package, 
  RefreshCw, 
  Receipt,
  ShoppingBag
} from 'lucide-react';
import { Card, Button, SearchInput, Badge, StatusBadge } from '../ui';

export const OwnerAdminCounterWidget: React.FC = () => {
  const { sales, adminActivities, refreshData, isSyncing } = useStore();
  const { language } = useLanguage();
  const { role } = useAuth();

  const isMr = language === 'mr';
  const isHi = language === 'hi';

  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'admin1' | 'sales_details' | 'inventory_changes'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate Metrics for Admin 1 (Nilesh Sakhare - nilusakhare2003@gmail.com - Counter 1)
  const admin1Sales = useMemo(() => {
    return sales.filter(s => 
      s.admin_slot === 1 || 
      s.created_by_email === 'nilusakhare2003@gmail.com' || 
      (!s.admin_slot && s.created_by_role !== 'Owner')
    );
  }, [sales]);

  const admin1Stats = useMemo(() => {
    const totalSales = admin1Sales.reduce((acc, s) => acc + s.net_amount, 0);
    const cash = admin1Sales.reduce((acc, s) => acc + (s.cash_amount || 0), 0);
    const online = admin1Sales.reduce((acc, s) => acc + (s.online_amount || 0), 0);
    const udhar = admin1Sales.reduce((acc, s) => acc + (s.udhar_amount || 0), 0);
    return { count: admin1Sales.length, totalSales, cash, online, udhar };
  }, [admin1Sales]);

  // Overall Store Metrics (Total across all operations)
  const storeTotalStats = useMemo(() => {
    const totalSales = sales.reduce((acc, s) => acc + s.net_amount, 0);
    const cash = sales.reduce((acc, s) => acc + (s.cash_amount || 0), 0);
    const online = sales.reduce((acc, s) => acc + (s.online_amount || 0), 0);
    const udhar = sales.reduce((acc, s) => acc + (s.udhar_amount || 0), 0);
    return { count: sales.length, totalSales, cash, online, udhar };
  }, [sales]);

  // Combine and deduplicate activities from adminActivities and sales
  const allActivitiesStream = useMemo(() => {
    const list: AdminActivity[] = [...adminActivities];

    sales.forEach(s => {
      const alreadyLogged = list.some(a => a.reference_id === s.invoice_no);
      if (!alreadyLogged) {
        const itemsText = s.items ? s.items.map(i => `${i.product_name} (${i.quantity} ${i.unit})`).join(', ') : 'मालाची विक्री';
        const isOwner = s.created_by_role === 'Owner' || s.created_by_email === 'yogeshwaridairy9896@gmail.com';
        const defaultSlot = s.admin_slot ?? (isOwner ? undefined : 1);
        const defaultName = s.created_by_name || (isOwner ? (isMr ? 'निखिल सखारे' : 'Nikhil Sakhare') : (isMr ? 'निलेश सखारे' : 'Nilesh Sakhare'));
        const defaultEmail = s.created_by_email || (isOwner ? 'yogeshwaridairy9896@gmail.com' : 'nilusakhare2003@gmail.com');
        const defaultCounter = s.counter_name || (isOwner ? 'मुख्य मालक काऊंटर' : 'काऊंटर १ - मुख्य बिलिंग');

        list.push({
          id: 'gen-sale-' + s.id,
          admin_name: defaultName,
          admin_email: defaultEmail,
          admin_role: s.created_by_role || (isOwner ? 'Owner' : 'Admin'),
          admin_slot: defaultSlot,
          counter_name: defaultCounter,
          action_type: 'SALE_CREATED',
          title: `पावती विक्री: #${s.invoice_no}`,
          details: `वस्तू: ${itemsText} | ग्राहक: ${s.customer_name} | मोड: ${s.payment_mode} | एकूण: ₹${s.net_amount}`,
          amount: s.net_amount,
          reference_id: s.invoice_no,
          reference_table: 'sales',
          created_at: s.created_at
        });
      }
    });

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [adminActivities, sales, isMr]);

  // Filter activities stream by selected filter tab and search query
  const filteredActivities = useMemo(() => {
    return allActivitiesStream.filter(act => {
      if (activeTabFilter === 'admin1') {
        const isAdm1 = act.admin_slot === 1 || act.admin_email === 'nilusakhare2003@gmail.com' || act.admin_name?.includes('निलेश') || act.admin_name?.toLowerCase().includes('nilesh');
        if (!isAdm1) return false;
      }
      if (activeTabFilter === 'inventory_changes') {
        const isInvChange = act.action_type === 'STOCK_INWARD' || 
          act.action_type === 'PRODUCT_UPDATED' || 
          act.action_type === 'PRODUCT_ADDED' ||
          act.action_type === 'DAMAGE_RECORDED' ||
          act.action_type === 'SUPPLIER_RETURN';
        if (!isInvChange) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = act.title.toLowerCase().includes(q);
        const matchDetails = act.details.toLowerCase().includes(q);
        const matchAdmin = act.admin_name.toLowerCase().includes(q);
        const matchEmail = (act.admin_email || '').toLowerCase().includes(q);
        const matchCounter = act.counter_name.toLowerCase().includes(q);
        const matchRef = act.reference_id?.toLowerCase().includes(q);
        return matchTitle || matchDetails || matchAdmin || matchEmail || matchCounter || matchRef;
      }
      return true;
    });
  }, [allActivitiesStream, activeTabFilter, searchQuery]);

  // Granular sales list
  const itemizedSales = useMemo(() => {
    return sales
      .filter(s => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const matchInv = s.invoice_no.toLowerCase().includes(q);
        const matchCust = s.customer_name.toLowerCase().includes(q);
        const matchPhone = (s.customer_phone || '').includes(q);
        const matchAdmin = (s.created_by_name || '').toLowerCase().includes(q);
        const matchEmail = (s.created_by_email || '').toLowerCase().includes(q);
        const matchItems = (s.items || []).some(it => it.product_name.toLowerCase().includes(q));
        return matchInv || matchCust || matchPhone || matchAdmin || matchEmail || matchItems;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [sales, searchQuery]);

  const getActionBadge = (type: string) => {
    switch (type) {
      case 'SALE_CREATED':
        return { label: isMr ? 'पावती विक्री' : isHi ? 'बिल बिक्री' : 'Sale', status: 'ok' as const };
      case 'STOCK_INWARD':
        return { label: isMr ? 'साठा आवक' : isHi ? 'स्टॉक इनवर्ड' : 'Stock In', status: 'info' as const };
      case 'PRODUCT_ADDED':
        return { label: isMr ? 'नवीन उत्पादन' : isHi ? 'नया उत्पाद' : 'New Product', status: 'info' as const };
      case 'PRODUCT_UPDATED':
        return { label: isMr ? 'इन्व्हेंटरी बदल' : isHi ? 'इन्वेंट्री अपडेट' : 'Product Edit', status: 'warn' as const };
      case 'DAMAGE_RECORDED':
        return { label: isMr ? 'खराब माल/नुकसान' : isHi ? 'खराब माल/हानि' : 'Damage', status: 'danger' as const };
      case 'EXPENSE_ADDED':
        return { label: isMr ? 'दुकान खर्च' : isHi ? 'दुकान खर्च' : 'Expense', status: 'neutral' as const };
      case 'UDHAR_PAYMENT':
        return { label: isMr ? 'उधारी जमा' : isHi ? 'उधारी जमा' : 'Credit Jama', status: 'warn' as const };
      case 'CUSTOMER_RETURN':
        return { label: isMr ? 'ग्राहक परतावा' : isHi ? 'ग्राहक वापसी' : 'Cust Return', status: 'warn' as const };
      case 'SUPPLIER_RETURN':
        return { label: isMr ? 'सप्लायर परतावा' : isHi ? 'सप्लायर वापसी' : 'Supplier Return', status: 'warn' as const };
      default:
        return { label: isMr ? 'नोंद' : isHi ? 'प्रविष्टि' : 'Log', status: 'neutral' as const };
    }
  };

  if (role !== 'Owner') {
    return null;
  }

  return (
    <Card className="p-5 sm:p-6 space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-2 border border-line text-ink flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-ink-2" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-[10px] h-5">
                👑 {isMr ? 'दुकान मालक तपासणी वही' : isHi ? 'दुकान मालिक नियंत्रण कक्ष' : 'Owner Control Center'}
              </Badge>
              <span className="text-xs text-ink-3 hidden sm:inline">&bull;</span>
              <span className="text-xs text-ink-3 hidden sm:inline">
                {isMr ? 'प्रशासक थेट कामगिरी व इन्व्हेंटरी बदल' : isHi ? 'एडमिन सीधा प्रदर्शन व इन्वेंट्री बदलाव' : 'Admin Live Tracker'}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-ink tracking-tight mt-0.5">
              {isMr ? 'दुकान मालक नियंत्रण कक्ष — ॲडमिन व काऊंटर हिशोब' : 
               isHi ? 'दुकान मालिक नियंत्रण कक्ष — एडमिन व काउंटर हिसाब' : 
               'Owner Control Center: Admin & Counter Audit'}
            </h2>
            <p className="text-xs text-ink-3 mt-0.5">
              📧 {isMr ? 'मालक लॉगिन:' : isHi ? 'मालिक लॉगिन:' : 'Owner Login:'} <span className="font-medium text-ink">yogeshwaridairy9896@gmail.com</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refreshData()}
            disabled={isSyncing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />}
            className="text-xs"
          >
            {isSyncing ? (isMr ? 'ताजे करत आहे...' : 'ताज़ा हो रहा...') : (isMr ? 'रिफ्रेश' : 'रिफ्रेश')}
          </Button>
        </div>
      </div>

      {/* Counter Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Admin 1 / Counter 1 Card */}
        <div className="bg-surface-2/60 rounded-xl p-4 border border-line space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-surface border border-line text-ink flex items-center justify-center font-semibold text-xs shadow-card">
                १
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-ink text-sm">
                    निलेश सखारे
                  </h3>
                  <Badge variant="outline" className="text-[10px] h-4">
                    🛡️ {isMr ? 'प्रशासक १' : 'एडमिन १'}
                  </Badge>
                </div>
                <p className="text-xs text-ink-2">
                  📍 {isMr ? 'काऊंटर १ — मुख्य बिलिंग (POS)' : isHi ? 'काउंटर १ — मुख्य बिलिंग (POS)' : 'Counter 1 — Main POS Billing'}
                </p>
                <p className="text-[11px] text-ink-3">
                  📧 <span className="font-medium text-ink-2">nilusakhare2003@gmail.com</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-ink-3 block font-medium">
                {isMr ? 'एकूण बिले' : isHi ? 'कुल बिल' : 'Total Bills'}
              </span>
              <span className="text-sm font-semibold tabular-nums text-ink">
                {admin1Stats.count} {isMr ? 'पावत्या' : isHi ? 'बिल' : 'Bills'}
              </span>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-3 border border-line shadow-card space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-ink-3">
                {isMr ? 'एकूण विक्री रक्कम:' : isHi ? 'कुल बिक्री राशि:' : 'Total Sales:'}
              </span>
              <span className="text-lg font-semibold tabular-nums text-ink">
                ₹{admin1Stats.totalSales.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line text-[11px]">
              <div>
                <span className="text-ink-3 block font-medium">{isMr ? 'रोख जमा' : isHi ? 'रोकड़' : 'Cash'}</span>
                <span className="font-semibold tabular-nums text-ink">₹{admin1Stats.cash.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-ink-3 block font-medium">{isMr ? 'ऑनलाईन UPI' : isHi ? 'ऑनलाइन' : 'UPI'}</span>
                <span className="font-semibold tabular-nums text-ink">₹{admin1Stats.online.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-ink-3 block font-medium">{isMr ? 'उधारी दिली' : isHi ? 'उधार' : 'Credit'}</span>
                <span className="font-semibold tabular-nums text-ink">₹{admin1Stats.udhar.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Store Performance Card */}
        <div className="bg-surface-2/60 rounded-xl p-4 border border-line space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-surface border border-line text-ink flex items-center justify-center font-semibold text-xs shadow-card">
                👑
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-ink text-sm">
                    {isMr ? 'योगेश्वरी डेअरी' : isHi ? 'योगेश्वरी डेयरी' : 'Yogeshwari Dairy'}
                  </h3>
                  <Badge variant="outline" className="text-[10px] h-4">
                    👑 {isMr ? 'एकूण उलाढाल' : isHi ? 'कुल टर्नओवर' : 'Total Turnover'}
                  </Badge>
                </div>
                <p className="text-xs text-ink-2">
                  📍 {isMr ? 'दुकान विक्री व गल्ला संकलन सारांश' : isHi ? 'दुकान बिक्री & गल्ला संकलन सारांश' : 'Total Store Sales & Collection'}
                </p>
                <p className="text-[11px] text-ink-3">
                  📧 <span className="font-medium text-ink-2">yogeshwaridairy9896@gmail.com</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-ink-3 block font-medium">
                {isMr ? 'एकूण बिले' : isHi ? 'कुल बिल' : 'Total Bills'}
              </span>
              <span className="text-sm font-semibold tabular-nums text-ink">
                {storeTotalStats.count} {isMr ? 'पावत्या' : isHi ? 'बिल' : 'Bills'}
              </span>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-3 border border-line shadow-card space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-ink-3">
                {isMr ? 'दुकान एकूण विक्री:' : isHi ? 'दुकान कुल बिक्री:' : 'Total Store Sales:'}
              </span>
              <span className="text-lg font-semibold tabular-nums text-ink">
                ₹{storeTotalStats.totalSales.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line text-[11px]">
              <div>
                <span className="text-ink-3 block font-medium">{isMr ? 'रोख जमा' : isHi ? 'रोकड़' : 'Cash'}</span>
                <span className="font-semibold tabular-nums text-ink">₹{storeTotalStats.cash.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-ink-3 block font-medium">{isMr ? 'ऑनलाईन UPI' : isHi ? 'ऑनलाइन' : 'UPI'}</span>
                <span className="font-semibold tabular-nums text-ink">₹{storeTotalStats.online.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-ink-3 block font-medium">{isMr ? 'उधारी दिली' : isHi ? 'उधार' : 'Credit'}</span>
                <span className="font-semibold tabular-nums text-ink">₹{storeTotalStats.udhar.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Ledger & Stream */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-ink text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-ink-2" />
              <span>{isMr ? 'थेट तपासणी नोंदवही (काऊंटर विक्री व इन्व्हेंटरी बदल):' : isHi ? 'लाइव ऑडिट रजिस्टर:' : 'Live Audit Stream:'}</span>
            </h4>
            <p className="text-xs text-ink-3">
              {isMr ? 'निलेश सखारे व निखिल सखारे यांनी केलेल्या सर्व विक्री, साठा बदल, खर्च व नुकसानीच्या थेट नोंदी.' : isHi ? 'बिक्री, स्टॉक अपडेट व खर्च का ब्यौरा।' : 'Live ledger of sales and inventory audit logs.'}
            </p>
          </div>

          <div className="w-full sm:w-72">
            <SearchInput
              placeholder={isMr ? 'बिल क्र., वस्तू किंवा नाव शोधा...' : isHi ? 'बिल क्र., सामान या नाम खोजें...' : 'Search bill, item, name...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'all', label: isMr ? 'सर्व नोंदी (All)' : isHi ? 'सभी प्रविष्टियां (All)' : 'All Records' },
            { id: 'admin1', label: isMr ? '🛡️ निलेश सखारे (काऊंटर १)' : isHi ? '🛡️ निलेश सखारे (काउंटर १)' : 'Nilesh Sakhare (Counter 1)' },
            { id: 'sales_details', label: isMr ? '🧾 काऊंटर विक्री तपशील' : isHi ? '🧾 काउंटर बिक्री विवरण' : 'Counter Sales Details' },
            { id: 'inventory_changes', label: isMr ? '📦 इन्व्हेंटरी बदल तपशील' : isHi ? '📦 इन्वेंट्री बदलाव' : 'Inventory Changes' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTabFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                activeTabFilter === tab.id
                  ? 'bg-surface shadow-card border border-line text-ink font-semibold'
                  : 'bg-surface-2 text-ink-3 hover:text-ink hover:bg-surface-2/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* View 1: When "sales_details" Tab is Selected */}
        {activeTabFilter === 'sales_details' ? (
          <div className="bg-surface rounded-xl border border-line overflow-hidden max-h-[500px] overflow-y-auto divide-y divide-line shadow-card">
            <div className="p-3 bg-surface-2/60 border-b border-line text-xs font-medium text-ink flex items-center justify-between">
              <span>{isMr ? 'काऊंटर विक्री तपशील: कोणी काय माल विकला' : isHi ? 'काउंटर बिक्री विवरण: किसने क्या माल बेचा' : 'Counter Sales: Who Sold What'}</span>
              <span className="text-ink-3 tabular-nums">{itemizedSales.length} {isMr ? 'नोंदी' : isHi ? 'प्रविष्टियां' : 'Records'}</span>
            </div>
            {itemizedSales.length === 0 ? (
              <div className="py-12 text-center text-ink-3 text-xs space-y-1">
                <Receipt className="w-8 h-8 mx-auto opacity-40 mb-1" />
                <p className="font-medium text-ink-2">
                  {isMr ? 'कोणतीही विक्री नोंद आढळली नाही.' : 'कोई बिक्री रिकॉर्ड नहीं मिला।'}
                </p>
              </div>
            ) : (
              itemizedSales.map((sale) => {
                const isOwner = sale.created_by_role === 'Owner' || sale.created_by_email === 'yogeshwaridairy9896@gmail.com';
                const adminName = sale.created_by_name || (isOwner ? (isMr ? 'निखिल सखारे' : 'Nikhil Sakhare') : (isMr ? 'निलेश सखारे' : 'Nilesh Sakhare'));
                const adminEmail = sale.created_by_email || (isOwner ? 'yogeshwaridairy9896@gmail.com' : 'nilusakhare2003@gmail.com');
                const counter = sale.counter_name || (isOwner ? 'मुख्य मालक काऊंटर' : 'काऊंटर १ - मुख्य बिलिंग');

                return (
                  <div key={sale.id} className="p-3.5 hover:bg-surface-2/50 transition-colors space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] h-5">
                          👤 {adminName}
                        </Badge>
                        <span className="text-[10px] text-ink-3">
                          ({adminEmail})
                        </span>
                        <Badge variant="default" className="text-[10px] h-5">
                          📍 {counter}
                        </Badge>
                        <span className="text-[10px] text-ink-3">
                          {sale.sale_date} • {new Date(sale.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-semibold tabular-nums text-ink">
                          ₹{sale.net_amount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-ink-3 block">
                          {sale.payment_mode}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="text-ink-2">
                        पावती क्र: <span className="font-mono text-ink font-semibold">{sale.invoice_no}</span>
                        {sale.customer_name && (
                          <span className="ml-2 text-ink-3">
                            ग्राहक: <span className="text-ink font-medium">{sale.customer_name}</span> {sale.customer_phone && `(${sale.customer_phone})`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Items Breakdown */}
                    <div className="bg-surface-2/50 rounded-lg p-2.5 border border-line space-y-1">
                      <div className="text-[11px] font-medium text-ink-2 flex items-center gap-1">
                        <ShoppingBag className="w-3.5 h-3.5 text-ink-3" />
                        <span>विकलेल्या वस्तूंची यादी (Sold Items):</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {sale.items && sale.items.length > 0 ? (
                          sale.items.map((it, idx) => (
                            <span 
                              key={idx} 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-surface text-ink border border-line shadow-card"
                            >
                              <span className="font-medium">{it.product_name}</span>
                              <span className="text-ink-3 tabular-nums">({it.quantity} {it.unit})</span>
                              <span className="font-semibold tabular-nums">₹{it.subtotal ?? it.total_price}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-ink-3">मालाचा तपशील उपलब्ध नाही</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* View 2: Audit Stream Rows Container */
          <div className="bg-surface rounded-xl border border-line overflow-hidden max-h-[460px] overflow-y-auto divide-y divide-line shadow-card">
            {filteredActivities.length === 0 ? (
              <div className="py-12 text-center text-ink-3 text-xs space-y-1">
                <Package className="w-8 h-8 mx-auto opacity-40 mb-1" />
                <p className="font-medium text-ink-2">
                  {isMr ? 'या फिल्टरमध्ये कोणतीही ॲडमिन नोंद आढळली नाही.' : isHi ? 'इस फ़िल्टर में कोई एडमिन रिकॉर्ड नहीं मिला।' : 'No admin activity records found.'}
                </p>
                <p className="text-[11px] text-ink-3">
                  {isMr ? 'काऊंटरवरून विक्री किंवा साठा बदल होताच येथे थेट नोंद दिसेल.' : isHi ? 'काउंटर से बिक्री या स्टॉक बदलाव होते ही यहाँ तुरंत दिखेगा।' : 'Live entries will stream here.'}
                </p>
              </div>
            ) : (
              filteredActivities.map((act) => {
                const badge = getActionBadge(act.action_type);
                const formattedTime = new Date(act.created_at).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit'
                });
                const formattedDate = new Date(act.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short'
                });

                return (
                  <div 
                    key={act.id} 
                    className="p-3 sm:p-3.5 hover:bg-surface-2/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] h-5">
                          👤 {act.admin_name}
                        </Badge>

                        {act.admin_email && (
                          <span className="text-[10px] text-ink-3">
                            ({act.admin_email})
                          </span>
                        )}

                        <Badge variant="default" className="text-[10px] h-5">
                          📍 {act.counter_name}
                        </Badge>

                        <StatusBadge status={badge.status}>
                          {badge.label}
                        </StatusBadge>

                        <span className="text-[10px] text-ink-3 ml-auto sm:ml-0 tabular-nums">
                          {formattedDate} • {formattedTime}
                        </span>
                      </div>

                      <div className="font-semibold text-ink text-xs sm:text-sm">
                        {act.title}
                      </div>

                      <div className="text-xs text-ink-3 break-words">
                        {act.details}
                      </div>
                    </div>

                    {act.amount !== undefined && act.amount > 0 && (
                      <div className="shrink-0 text-right self-end sm:self-center">
                        <span className="text-[10px] text-ink-3 block font-medium">
                          {isMr ? 'रक्कम' : isHi ? 'राशि' : 'Amount'}
                        </span>
                        <span className="text-sm sm:text-base font-semibold tabular-nums text-ink">
                          ₹{act.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

    </Card>
  );
};

export default OwnerAdminCounterWidget;
