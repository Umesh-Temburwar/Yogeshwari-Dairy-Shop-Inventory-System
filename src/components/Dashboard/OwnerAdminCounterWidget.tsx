import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { AdminActivity, Sale } from '../../types';
import { 
  ShieldCheck, 
  Store, 
  TrendingUp, 
  Banknote, 
  Smartphone, 
  BookOpen, 
  Clock, 
  Filter, 
  Search, 
  Package, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  Receipt,
  UserCheck,
  Eye,
  X
} from 'lucide-react';

export const OwnerAdminCounterWidget: React.FC = () => {
  const { sales, adminActivities, refreshData, isSyncing } = useStore();
  const { language } = useLanguage();
  const { role } = useAuth();

  const isMr = language === 'mr';
  const isHi = language === 'hi';

  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'admin1' | 'admin2' | 'sales' | 'updates'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActivityForModal, setSelectedActivityForModal] = useState<AdminActivity | null>(null);

  // If logged in user is not the Owner, don't show this master control widget
  if (role !== 'Owner') {
    return null;
  }

  // Calculate Metrics for Admin 1 (Slot 1 / Counter 1)
  const admin1Sales = useMemo(() => {
    return sales.filter(s => s.admin_slot === 1 || (!s.admin_slot && s.created_by_role !== 'Owner'));
  }, [sales]);

  const admin1Stats = useMemo(() => {
    const totalSales = admin1Sales.reduce((acc, s) => acc + s.net_amount, 0);
    const cash = admin1Sales.reduce((acc, s) => acc + (s.cash_amount || 0), 0);
    const online = admin1Sales.reduce((acc, s) => acc + (s.online_amount || 0), 0);
    const udhar = admin1Sales.reduce((acc, s) => acc + (s.udhar_amount || 0), 0);
    return { count: admin1Sales.length, totalSales, cash, online, udhar };
  }, [admin1Sales]);

  // Calculate Metrics for Admin 2 (Slot 2 / Counter 2)
  const admin2Sales = useMemo(() => {
    return sales.filter(s => s.admin_slot === 2);
  }, [sales]);

  const admin2Stats = useMemo(() => {
    const totalSales = admin2Sales.reduce((acc, s) => acc + s.net_amount, 0);
    const cash = admin2Sales.reduce((acc, s) => acc + (s.cash_amount || 0), 0);
    const online = admin2Sales.reduce((acc, s) => acc + (s.online_amount || 0), 0);
    const udhar = admin2Sales.reduce((acc, s) => acc + (s.udhar_amount || 0), 0);
    return { count: admin2Sales.length, totalSales, cash, online, udhar };
  }, [admin2Sales]);

  // Combine and deduplicate activities from adminActivities and sales
  const allActivitiesStream = useMemo(() => {
    const list: AdminActivity[] = [...adminActivities];

    // Ensure every sale in sales list is also represented in the stream
    sales.forEach(s => {
      const alreadyLogged = list.some(a => a.reference_id === s.invoice_no);
      if (!alreadyLogged) {
        const itemsText = s.items ? s.items.map(i => `${i.product_name} (${i.quantity} ${i.unit})`).join(', ') : 'मालाची विक्री';
        list.push({
          id: 'gen-sale-' + s.id,
          admin_name: s.created_by_name || (s.admin_slot === 2 ? 'प्रशासक २ (राहुल)' : 'प्रशासक १ (निलेश)'),
          admin_role: s.created_by_role || 'Admin',
          admin_slot: s.admin_slot ?? 1,
          counter_name: s.counter_name || (s.admin_slot === 2 ? 'काऊंटर २ - दुग्ध व साठा' : 'काऊंटर १ - मुख्य बिलिंग'),
          action_type: 'SALE_CREATED',
          title: `पावती विक्री: #${s.invoice_no}`,
          details: `विक्री: ${itemsText} | पेमेंट: ${s.payment_mode} | एकूण: ₹${s.net_amount}`,
          amount: s.net_amount,
          reference_id: s.invoice_no,
          reference_table: 'sales',
          created_at: s.created_at
        });
      }
    });

    // Sort newest first
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [adminActivities, sales]);

  // Filter activities stream by selected filter tab and search query
  const filteredActivities = useMemo(() => {
    return allActivitiesStream.filter(act => {
      // Filter by tab
      if (activeTabFilter === 'admin1' && act.admin_slot !== 1) return false;
      if (activeTabFilter === 'admin2' && act.admin_slot !== 2) return false;
      if (activeTabFilter === 'sales' && act.action_type !== 'SALE_CREATED') return false;
      if (activeTabFilter === 'updates' && act.action_type === 'SALE_CREATED') return false;

      // Filter by query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = act.title.toLowerCase().includes(q);
        const matchDetails = act.details.toLowerCase().includes(q);
        const matchAdmin = act.admin_name.toLowerCase().includes(q);
        const matchCounter = act.counter_name.toLowerCase().includes(q);
        const matchRef = act.reference_id?.toLowerCase().includes(q);
        return matchTitle || matchDetails || matchAdmin || matchCounter || matchRef;
      }
      return true;
    });
  }, [allActivitiesStream, activeTabFilter, searchQuery]);

  const getActionBadge = (type: string) => {
    switch (type) {
      case 'SALE_CREATED':
        return { label: isMr ? 'पावती विक्री' : isHi ? 'बिल बिक्री' : 'Sale', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40' };
      case 'STOCK_INWARD':
        return { label: isMr ? 'साठा आवक' : isHi ? 'स्टॉक इनवर्ड' : 'Stock In', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800/40' };
      case 'PRODUCT_ADDED':
        return { label: isMr ? 'नवीन उत्पादन' : isHi ? 'नया उत्पाद' : 'New Product', bg: 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-200 dark:border-teal-800/40' };
      case 'PRODUCT_UPDATED':
        return { label: isMr ? 'उत्पादन बदल' : isHi ? 'उत्पाद अपडेट' : 'Product Edit', bg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700' };
      case 'DAMAGE_RECORDED':
        return { label: isMr ? 'खराब माल/नुकसान' : isHi ? 'खराब माल/हानि' : 'Damage', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800/40' };
      case 'EXPENSE_ADDED':
        return { label: isMr ? 'दुकान खर्च' : isHi ? 'दुकान खर्च' : 'Expense', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800/40' };
      case 'UDHAR_PAYMENT':
        return { label: isMr ? 'उधारी जमा' : isHi ? 'उधारी जमा' : 'Credit Jama', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800/40' };
      case 'CUSTOMER_RETURN':
        return { label: isMr ? 'ग्राहक परतावा' : isHi ? 'ग्राहक वापसी' : 'Cust Return', bg: 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border-orange-200 dark:border-orange-800/40' };
      case 'SUPPLIER_RETURN':
        return { label: isMr ? 'सप्लायर परतावा' : isHi ? 'सप्लायर वापसी' : 'Supplier Return', bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40' };
      default:
        return { label: isMr ? 'नोंद' : isHi ? 'प्रविष्टि' : 'Log', bg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700' };
    }
  };

  return (
    <div className="bg-white dark:bg-[#131F1B] rounded-2xl border-2 border-amber-400/80 dark:border-amber-500/40 shadow-md p-5 sm:p-6 space-y-6 transition-all">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-[#24352F]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60">
                👑 {isMr ? 'दुकान मालक तपासणी वही' : isHi ? 'दुकान मालिक नियंत्रण कक्ष' : 'Owner Control Center'}
              </span>
              <span className="text-xs text-slate-400 dark:text-[#8FA69C] hidden sm:inline">&bull;</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-[#8FA69C] hidden sm:inline">
                {isMr ? '२ प्रशासक व काऊंटर कामगिरी' : isHi ? '२ प्रशासक व काउंटर प्रदर्शन' : '2 Admins & Counter Live Tracker'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {isMr ? 'दुकान मालक नियंत्रण कक्ष — २ ॲडमिन व काऊंटर हिशोब' : 
               isHi ? 'दुकान मालिक नियंत्रण कक्ष — २ एडमिन व काउंटर हिसाब' : 
               'Owner Control Center: 2 Admins & Counter Audit'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => refreshData()}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#223630] border border-slate-200 dark:border-[#24352F] text-slate-700 dark:text-[#E7F0EC] text-xs font-bold transition shadow-2xs"
            title="Refresh logs from Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-500' : ''}`} />
            <span>{isSyncing ? (isMr ? 'ताजे करत आहे...' : 'ताज़ा हो रहा...') : (isMr ? 'रिफ्रेश' : 'रिफ्रेश')}</span>
          </button>
        </div>
      </div>

      {/* 2 Admins Counter Performance Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Admin 1 / Counter 1 Card */}
        <div className="bg-gradient-to-br from-blue-50/80 via-white to-blue-50/30 dark:from-[#15232d] dark:via-[#131F1B] dark:to-[#121c24] rounded-2xl p-4 sm:p-5 border-2 border-blue-200 dark:border-blue-900/60 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                १
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                    {isMr ? 'प्रशासक १ (निलेश)' : isHi ? 'प्रशासक १ (निलेश)' : 'Admin 1 (Nilesh)'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                    🛡️ {isMr ? 'ॲडमिन १' : 'एडमिन १'}
                  </span>
                </div>
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                  📍 {isMr ? 'काऊंटर १ — मुख्य बिलिंग (POS)' : isHi ? 'काउंटर १ — मुख्य बिलिंग (POS)' : 'Counter 1 — Main POS Billing'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-500 dark:text-[#8FA69C] block">
                {isMr ? 'एकूण बिले' : isHi ? 'कुल बिल' : 'Total Bills'}
              </span>
              <span className="text-lg font-black text-blue-900 dark:text-blue-200">
                {admin1Stats.count} {isMr ? 'पावत्या' : isHi ? 'बिल' : 'Bills'}
              </span>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-[#131F1B]/90 rounded-xl p-3 border border-blue-100 dark:border-[#24352F] space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-[#8FA69C]">
                {isMr ? 'एकूण विक्री रक्कम:' : isHi ? 'कुल बिक्री राशि:' : 'Total Sales:'}
              </span>
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                ₹{admin1Stats.totalSales.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-[#24352F] text-[11px]">
              <div>
                <span className="text-slate-400 dark:text-[#8FA69C] block font-medium">{isMr ? 'रोख जमा' : isHi ? 'रोकड़' : 'Cash'}</span>
                <span className="font-extrabold text-blue-900 dark:text-blue-300">₹{admin1Stats.cash.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-[#8FA69C] block font-medium">{isMr ? 'ऑनलाईन UPI' : isHi ? 'ऑनलाइन' : 'UPI'}</span>
                <span className="font-extrabold text-purple-900 dark:text-purple-300">₹{admin1Stats.online.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-[#8FA69C] block font-medium">{isMr ? 'उधारी दिली' : isHi ? 'उधार' : 'Credit'}</span>
                <span className="font-extrabold text-amber-900 dark:text-amber-300">₹{admin1Stats.udhar.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin 2 / Counter 2 Card */}
        <div className="bg-gradient-to-br from-teal-50/80 via-white to-teal-50/30 dark:from-[#132522] dark:via-[#131F1B] dark:to-[#0f1d1a] rounded-2xl p-4 sm:p-5 border-2 border-teal-200 dark:border-teal-900/60 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                २
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                    {isMr ? 'प्रशासक २ (राहुल)' : isHi ? 'प्रशासक २ (राहुल)' : 'Admin 2 (Rahul)'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
                    🛡️ {isMr ? 'ॲडमिन २' : 'एडमिन २'}
                  </span>
                </div>
                <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                  📍 {isMr ? 'काऊंटर २ — दुग्ध व साठा काऊंटर' : isHi ? 'काउंटर २ — दुग्ध & स्टॉक काउंटर' : 'Counter 2 — Dairy & Stock Counter'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-500 dark:text-[#8FA69C] block">
                {isMr ? 'एकूण बिले' : isHi ? 'कुल बिल' : 'Total Bills'}
              </span>
              <span className="text-lg font-black text-teal-900 dark:text-teal-200">
                {admin2Stats.count} {isMr ? 'पावत्या' : isHi ? 'बिल' : 'Bills'}
              </span>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-[#131F1B]/90 rounded-xl p-3 border border-teal-100 dark:border-[#24352F] space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-[#8FA69C]">
                {isMr ? 'एकूण विक्री रक्कम:' : isHi ? 'कुल बिक्री राशि:' : 'Total Sales:'}
              </span>
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                ₹{admin2Stats.totalSales.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-[#24352F] text-[11px]">
              <div>
                <span className="text-slate-400 dark:text-[#8FA69C] block font-medium">{isMr ? 'रोख जमा' : isHi ? 'रोकड़' : 'Cash'}</span>
                <span className="font-extrabold text-blue-900 dark:text-blue-300">₹{admin2Stats.cash.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-[#8FA69C] block font-medium">{isMr ? 'ऑनलाईन UPI' : isHi ? 'ऑनलाइन' : 'UPI'}</span>
                <span className="font-extrabold text-purple-900 dark:text-purple-300">₹{admin2Stats.online.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-[#8FA69C] block font-medium">{isMr ? 'उधारी दिली' : isHi ? 'उधार' : 'Credit'}</span>
                <span className="font-extrabold text-amber-900 dark:text-amber-300">₹{admin2Stats.udhar.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Real-time Activity Ledger & Stream */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>{isMr ? 'लाइव्ह तपासणी नोंदवही (कोणत्या काऊंटरवरून काय विकले व काय बदलले):' : isHi ? 'लाइव ऑडिट रजिस्टर (किसने किस काउंटर से क्या बेचा और क्या बदला):' : 'Live Audit Stream (Who sold what from which counter & updates):'}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
              {isMr ? 'प्रशासक १ आणि प्रशासक २ यांनी केलेल्या सर्व विक्री, साठा बदल, खर्च व नुकसानीच्या थेट नोंदी.' : isHi ? 'एडमिन १ और एडमिन २ द्वारा की गई सभी बिक्री, स्टॉक अपडेट, खर्च और नुकसान का लाइव ब्यौरा।' : 'Live ledger of all sales, stock inward, expenses, damages, and returns by both admins.'}
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8FA69C]" />
            <input
              type="text"
              placeholder={isMr ? 'बिल क्र., वस्तू किंवा ऑपरेटर शोधा...' : isHi ? 'बिल क्र., सामान या ऑपरेटर खोजें...' : 'Search bill, item or admin...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'all', label: isMr ? 'सर्व नोंदी (All)' : isHi ? 'सभी प्रविष्टियां (All)' : 'All Records' },
            { id: 'admin1', label: isMr ? '🛡️ प्रशासक १ (काऊंटर १)' : isHi ? '🛡️ एडमिन १ (काउंटर १)' : 'Admin 1 (Counter 1)' },
            { id: 'admin2', label: isMr ? '🛡️ प्रशासक २ (काऊंटर २)' : isHi ? '🛡️ एडमिन २ (काउंटर २)' : 'Admin 2 (Counter 2)' },
            { id: 'sales', label: isMr ? '💰 फक्त विक्री (Sales)' : isHi ? '💰 केवल बिक्री (Sales)' : 'Sales Only' },
            { id: 'updates', label: isMr ? '📦 साठा व इतर बदल (Updates)' : isHi ? '📦 स्टॉक व अन्य बदलाव' : 'Updates Only' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTabFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTabFilter === tab.id
                  ? 'bg-amber-500 text-amber-950 font-black shadow-xs'
                  : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C] hover:bg-slate-200 dark:hover:bg-[#223630]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Audit Stream Rows Container */}
        <div className="bg-slate-50/70 dark:bg-[#1A2A25]/50 rounded-2xl border border-slate-200/80 dark:border-[#24352F] overflow-hidden max-h-[420px] overflow-y-auto divide-y divide-slate-100 dark:divide-[#24352F]">
          {filteredActivities.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-[#8FA69C] text-xs space-y-1">
              <Package className="w-8 h-8 mx-auto opacity-40 mb-1" />
              <p className="font-bold text-slate-600 dark:text-slate-300">
                {isMr ? 'या फिल्टरमध्ये कोणतीही ॲडमिन नोंद आढळली नाही.' : isHi ? 'इस फ़िल्टर में कोई एडमिन रिकॉर्ड नहीं मिला।' : 'No admin activity records found.'}
              </p>
              <p className="text-[11px]">
                {isMr ? 'काऊंटरवरून विक्री किंवा साठा बदल होताच येथे थेट नोंद दिसेल.' : isHi ? 'काउंटर से बिक्री या स्टॉक बदलाव होते ही यहाँ तुरंत दिखेगा।' : 'Live entries will stream here as sales or updates occur.'}
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
                  className="p-3 sm:p-3.5 hover:bg-white dark:hover:bg-[#131F1B] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Admin Badge */}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        act.admin_slot === 1 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300/80 dark:border-blue-800/60'
                          : act.admin_slot === 2
                          ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-300/80 dark:border-teal-800/60'
                          : 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300/80 dark:border-amber-800/60'
                      }`}>
                        👤 {act.admin_name}
                      </span>

                      {/* Counter Badge */}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-[#16221E] text-slate-700 dark:text-[#8FA69C] border border-slate-200 dark:border-[#24352F]">
                        📍 {act.counter_name}
                      </span>

                      {/* Action Type Badge */}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}>
                        {badge.label}
                      </span>

                      {/* Timestamp */}
                      <span className="text-[10px] font-medium text-slate-400 dark:text-[#8FA69C] ml-auto sm:ml-0">
                        {formattedDate} • {formattedTime}
                      </span>
                    </div>

                    <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      {act.title}
                    </div>

                    <div className="text-xs text-slate-600 dark:text-[#8FA69C] break-words">
                      {act.details}
                    </div>
                  </div>

                  {act.amount !== undefined && act.amount > 0 && (
                    <div className="shrink-0 text-right self-end sm:self-center">
                      <span className="text-[10px] text-slate-400 dark:text-[#8FA69C] block font-medium">
                        {isMr ? 'रक्कम' : isHi ? 'राशि' : 'Amount'}
                      </span>
                      <span className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400">
                        ₹{act.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};
