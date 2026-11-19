import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { AdminActivity } from '../../types';
import { 
  ShieldCheck, 
  Search, 
  Package, 
  RefreshCw, 
  Receipt, 
  Truck,
  AlertTriangle,
  ChevronDown,
  Tag,
  ArrowUpDown,
  Camera,
  Activity,
  Plus
} from 'lucide-react';
import { formatTimeAgo } from '../../lib/dateUtils';
import { 
  isRegistrationAllowedSync, 
  setRegistrationSetting, 
  subscribeToRegistrationSetting,
  syncRegistrationSettingFromCloud
} from '../../lib/registrationConfig';
import { 
  isAuditStreamEnabledSync, 
  setAuditStreamEnabled, 
  subscribeToAuditStreamSetting 
} from '../../lib/auditStreamConfig';

const extractImageAndClean = (details?: string): { imageUrl: string | null; cleanDetails: string } => {
  if (!details) return { imageUrl: null, cleanDetails: '' };

  const urlMatch = details.match(/(?:image_url:\s*|image:\s*|photo:\s*)?(https?:\/\/[^\s|]+)/i);

  if (!urlMatch) {
    return { imageUrl: null, cleanDetails: details };
  }

  const potentialUrl = urlMatch[1];
  const isImage = /\.(?:jpg|jpeg|png|webp|gif|svg)/i.test(potentialUrl) ||
    potentialUrl.includes('product-images') ||
    potentialUrl.includes('storage/v1/object');

  if (isImage) {
    const cleanDetails = details
      .replace(urlMatch[0], 'Photo updated')
      .replace(/\s*\|\s*Photo updated\s*\|\s*/g, ' | Photo updated | ')
      .trim();

    return { imageUrl: potentialUrl, cleanDetails };
  }

  return { imageUrl: null, cleanDetails: details };
};

export const OwnerAdminCounterWidget: React.FC = () => {
  const { sales, adminActivities, purchases, damages, refreshData, isSyncing } = useStore();
  const { language } = useLanguage();
  const { role, ownerAvatarUrl } = useAuth();

  const [isOwnerControlOpen, setIsOwnerControlOpen] = useState(false);
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'admin1' | 'sales' | 'inventory'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllActivities, setShowAllActivities] = useState(false);

  // Registration setting state & sync
  const [isRegistrationAllowed, setIsRegistrationAllowed] = useState<boolean>(() => isRegistrationAllowedSync());
  const [isTogglingReg, setIsTogglingReg] = useState(false);

  // Live Audit Stream ON / OFF state (Shop Owner controlled)
  const [isAuditStreamEnabled, setIsAuditStreamEnabled] = useState<boolean>(() => isAuditStreamEnabledSync());

  useEffect(() => {
    const unsubscribe = subscribeToAuditStreamSetting(setIsAuditStreamEnabled);
    return () => unsubscribe();
  }, []);

  const handleToggleAuditStream = () => {
    if (role !== 'Owner') return;
    const nextState = !isAuditStreamEnabled;
    const res = setAuditStreamEnabled(nextState, role);
    if (res.success) {
      setIsAuditStreamEnabled(nextState);
    }
  };

  useEffect(() => {
    syncRegistrationSettingFromCloud().then(setIsRegistrationAllowed);
    const unsubscribe = subscribeToRegistrationSetting(setIsRegistrationAllowed);
    return () => unsubscribe();
  }, []);

  const handleToggleRegistration = async () => {
    if (role !== 'Owner') return;
    const nextState = !isRegistrationAllowed;
    setIsTogglingReg(true);
    try {
      await setRegistrationSetting(nextState, 'Owner', 'yogeshwaridairy9896@gmail.com', 'Nikhil Sakhare (Shop Owner)');
      setIsRegistrationAllowed(nextState);
    } finally {
      setIsTogglingReg(false);
    }
  };

  // Calculate Metrics for Admin 1 (Nilesh Sakhare - Counter 1)
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

  // Combine and deduplicate activities from adminActivities, sales, purchases, damages (within last 1 day / 24h)
  const allActivitiesStream = useMemo(() => {
    const oneDayAgoMs = Date.now() - 24 * 60 * 60 * 1000;

    const list: AdminActivity[] = adminActivities.filter(
      a => new Date(a.created_at).getTime() >= oneDayAgoMs
    );

    // Represent last 1 day sales
    sales.forEach(s => {
      const saleTime = new Date(s.created_at).getTime();
      if (saleTime < oneDayAgoMs) return;

      const alreadyLogged = list.some(a => a.reference_id === s.invoice_no);
      if (!alreadyLogged) {
        const itemsText = s.items ? s.items.map(i => `${i.product_name} (${i.quantity} ${i.unit})`).join(', ') : 'Product Sale';
        const isOwner = s.created_by_role === 'Owner' || s.created_by_email === 'yogeshwaridairy9896@gmail.com';
        const defaultSlot = s.admin_slot ?? (isOwner ? undefined : 1);
        const defaultName = s.created_by_name || (isOwner ? 'Nikhil Sakhare' : 'Nilesh Sakhare');
        const defaultCounter = s.counter_name || (isOwner ? 'Owner Master Counter' : 'Counter 1 - Main Billing');

        list.push({
          id: 'gen-sale-' + s.id,
          admin_name: defaultName,
          admin_email: '',
          admin_role: s.created_by_role || (isOwner ? 'Owner' : 'Admin'),
          admin_slot: defaultSlot,
          counter_name: defaultCounter,
          action_type: 'SALE_CREATED',
          title: `Receipt Sale: #${s.invoice_no}`,
          details: `Items: ${itemsText} | Customer: ${s.customer_name} | Mode: ${s.payment_mode} | Total: ₹${s.net_amount}`,
          amount: s.net_amount,
          reference_id: s.invoice_no,
          reference_table: 'sales',
          created_at: s.created_at
        });
      }
    });

    // Represent last 1 day purchases
    (purchases || []).forEach(p => {
      const purTime = new Date(p.created_at).getTime();
      if (purTime < oneDayAgoMs) return;

      const alreadyLogged = list.some(a => a.reference_id === p.id || (a.action_type === 'STOCK_INWARD' && a.title?.includes(p.product_name) && Math.abs(new Date(a.created_at).getTime() - purTime) < 5000));
      if (!alreadyLogged) {
        list.push({
          id: 'gen-pur-' + p.id,
          admin_name: 'Nikhil Sakhare',
          admin_email: '',
          admin_role: 'Owner',
          counter_name: 'Owner Master Counter',
          action_type: 'STOCK_INWARD',
          title: `Stock Inward: ${p.product_name}`,
          details: `Supplier: ${p.supplier_name || 'Standard Supplier'} | Qty: +${p.quantity} ${p.unit} | Cost: ₹${p.total_amount}`,
          amount: p.total_amount,
          reference_id: p.id,
          reference_table: 'purchases',
          created_at: p.created_at
        });
      }
    });

    // Represent last 1 day damages
    (damages || []).forEach(d => {
      const dmgTime = new Date(d.created_at).getTime();
      if (dmgTime < oneDayAgoMs) return;

      const alreadyLogged = list.some(a => a.action_type === 'DAMAGE_RECORDED' && a.title?.includes(d.product_name) && Math.abs(new Date(a.created_at).getTime() - dmgTime) < 5000);
      if (!alreadyLogged) {
        list.push({
          id: 'gen-dmg-' + d.id,
          admin_name: 'Nilesh Sakhare',
          admin_email: '',
          admin_role: 'Admin',
          admin_slot: 1,
          counter_name: 'Counter 1 - Main Billing',
          action_type: 'DAMAGE_RECORDED',
          title: `Damage Recorded: ${d.product_name}`,
          details: `Reason: ${d.reason} | Qty: -${d.quantity} ${d.unit} | Loss: ₹${d.estimated_loss_amount}`,
          amount: d.estimated_loss_amount,
          reference_id: d.product_id,
          reference_table: 'damage_records',
          created_at: d.created_at
        });
      }
    });

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [adminActivities, sales, purchases, damages]);

  // Filter activities stream by selected filter tab and search query
  const filteredActivities = useMemo(() => {
    return allActivitiesStream.filter(act => {
      if (activeTabFilter === 'admin1') {
        const isAdm1 = act.admin_slot === 1 || act.admin_name?.toLowerCase().includes('nilesh');
        if (!isAdm1) return false;
      }
      if (activeTabFilter === 'sales') {
        const isSale = act.action_type === 'SALE_CREATED' || act.action_type === 'SALE_UPDATED' || act.action_type === 'SALE_DELETED';
        if (!isSale) return false;
      }
      if (activeTabFilter === 'inventory') {
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
        const matchRef = act.reference_id?.toLowerCase().includes(q);
        return matchTitle || matchDetails || matchAdmin || matchRef;
      }
      return true;
    });
  }, [allActivitiesStream, activeTabFilter, searchQuery]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'SALE_CREATED':
      case 'SALE_UPDATED':
        return <Receipt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'STOCK_INWARD':
        return <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
      case 'PRODUCT_ADDED':
        return <Plus className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />;
      case 'PRODUCT_UPDATED':
        return <Tag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case 'DAMAGE_RECORDED':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
      case 'CUSTOMER_RETURN':
      case 'SUPPLIER_RETURN':
        return <ArrowUpDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />;
    }
  };

  // Only visible to Owner role
  if (role !== 'Owner') {
    return null;
  }

  const activitiesToShow = showAllActivities ? filteredActivities : filteredActivities.slice(0, 10);

  return (
    <div className="bg-white dark:bg-[#131F1B] rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-[#24352F] shadow-xs overflow-hidden transition-all">

      {/* Accordion Header (Collapsible, collapsed by default) */}
      <button
        type="button"
        onClick={() => setIsOwnerControlOpen(!isOwnerControlOpen)}
        aria-expanded={isOwnerControlOpen}
        className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 dark:hover:bg-[#1A2A25]/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
              Owner Control Center
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] truncate">
              Admin counters & live audit stream
            </p>
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOwnerControlOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Collapsible Content */}
      {isOwnerControlOpen && (
        <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-[#24352F] space-y-5">

          {/* a) Header row: Admin name & role chip only. Right side: Refresh & Registration toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 pb-2 border-b border-slate-100 dark:border-[#24352F]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-amber-400/80 bg-white dark:bg-[#1A2A25] shrink-0">
                <img 
                  src={ownerAvatarUrl} 
                  alt="Nikhil Sakhare" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                    Nikhil Sakhare
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60">
                    👑 Shop Owner
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {/* Registration Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isRegistrationAllowed}
                onClick={handleToggleRegistration}
                disabled={isTogglingReg}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                  isRegistrationAllowed
                    ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60'
                    : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-900/60'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isRegistrationAllowed ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span>Registration: {isRegistrationAllowed ? 'ON' : 'OFF'}</span>
              </button>

              {/* Refresh button */}
              <button
                type="button"
                onClick={() => refreshData()}
                disabled={isSyncing}
                aria-label="Refresh logs from Supabase"
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#223630] border border-slate-200 dark:border-[#24352F] text-slate-700 dark:text-[#E7F0EC] flex items-center justify-center transition shadow-2xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* b) Operator cards: Horizontally scrollable snap row (~280px wide each) */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x py-1">

            {/* Operator 1: Nilesh Sakhare (Counter 1) */}
            <div className="w-[280px] shrink-0 snap-start bg-slate-50/80 dark:bg-[#1A2A25] rounded-2xl p-3.5 border border-slate-200/80 dark:border-[#24352F] space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                    1
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                        Nilesh Sakhare
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                        Admin 1
                      </span>
                    </div>
                    <span className="text-[10px] text-blue-700 dark:text-blue-400 block truncate">
                      Counter 1 — Main POS Billing
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-bold text-slate-500 dark:text-[#8FA69C] shrink-0">
                  {admin1Stats.count} Bills
                </span>
              </div>

              <div className="bg-white dark:bg-[#131F1B] rounded-xl p-2.5 border border-slate-100 dark:border-[#24352F]/70">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-[#8FA69C]">
                    Total Sales
                  </span>
                  <span className="text-base font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                    ₹{admin1Stats.totalSales.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 pt-2 mt-1 border-t border-slate-100 dark:border-[#24352F] text-[10px]">
                  <div>
                    <span className="text-slate-400 dark:text-[#8FA69C] block">Cash</span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">₹{admin1Stats.cash.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-[#8FA69C] block">UPI</span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">₹{admin1Stats.online.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-[#8FA69C] block">Credit</span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">₹{admin1Stats.udhar.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Operator 2: Yogeshwari Dairy (Total Store) */}
            <div className="w-[280px] shrink-0 snap-start bg-slate-50/80 dark:bg-[#1A2A25] rounded-2xl p-3.5 border border-slate-200/80 dark:border-[#24352F] space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                    👑
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                        Yogeshwari Dairy
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                        Total
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 block truncate">
                      Store Turnover & Collection
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-bold text-slate-500 dark:text-[#8FA69C] shrink-0">
                  {storeTotalStats.count} Bills
                </span>
              </div>

              <div className="bg-white dark:bg-[#131F1B] rounded-xl p-2.5 border border-slate-100 dark:border-[#24352F]/70">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-[#8FA69C]">
                    Total Sales
                  </span>
                  <span className="text-base font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                    ₹{storeTotalStats.totalSales.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 pt-2 mt-1 border-t border-slate-100 dark:border-[#24352F] text-[10px]">
                  <div>
                    <span className="text-slate-400 dark:text-[#8FA69C] block">Cash</span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">₹{storeTotalStats.cash.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-[#8FA69C] block">UPI</span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">₹{storeTotalStats.online.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-[#8FA69C] block">Credit</span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">₹{storeTotalStats.udhar.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* c) LIVE AUDIT STREAM */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  Live Audit Stream
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-[#16221E] text-slate-600 dark:text-[#8FA69C]">
                  1-Day Retention
                </span>
              </div>

              {/* Live / Paused switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isAuditStreamEnabled}
                onClick={handleToggleAuditStream}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-[#24352F] bg-slate-50 dark:bg-[#1A2A25] cursor-pointer"
              >
                <span className={`w-2 h-2 rounded-full ${isAuditStreamEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span className="text-[11px] text-slate-700 dark:text-slate-200">
                  {isAuditStreamEnabled ? 'Live' : 'Paused'}
                </span>
              </button>
            </div>

            {isAuditStreamEnabled && (
              <>
                {/* Search input (h-11, rounded-xl, magnifier icon) */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8FA69C]" />
                  <input
                    type="text"
                    placeholder="Search activity, item, bill..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 dark:border-[#24352F] bg-slate-50/70 dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                {/* Filter chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {[
                    { id: 'all', label: 'All Records' },
                    { id: 'admin1', label: 'Nilesh (Counter 1)' },
                    { id: 'sales', label: 'Sales' },
                    { id: 'inventory', label: 'Inventory' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTabFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeTabFilter === tab.id
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C] hover:bg-slate-200/80 dark:hover:bg-[#223630]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Timeline List (max 10 items initially, with View all button) */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-[#24352F] overflow-hidden divide-y divide-slate-100 dark:divide-[#24352F] bg-slate-50/40 dark:bg-[#1A2A25]/30">
                  {activitiesToShow.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 dark:text-[#8FA69C] text-xs space-y-1">
                      <Package className="w-8 h-8 mx-auto opacity-40 mb-1" />
                      <p className="font-bold text-slate-600 dark:text-slate-300">
                        No activity records found
                      </p>
                    </div>
                  ) : (
                    activitiesToShow.map((act) => {
                      const { imageUrl, cleanDetails } = extractImageAndClean(act.details);
                      const isOwnerAct = act.admin_role === 'Owner';
                      const operatorName = act.admin_name || (isOwnerAct ? 'Nikhil Sakhare' : 'Nilesh Sakhare');

                      return (
                        <div
                          key={act.id}
                          className="p-3 hover:bg-white dark:hover:bg-[#131F1B] transition-colors flex items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#16221E] border border-slate-200 dark:border-[#24352F] flex items-center justify-center shrink-0 mt-0.5">
                              {getActivityIcon(act.action_type)}
                            </div>

                            <div className="min-w-0 flex-1 space-y-0.5">
                              <span className="font-bold text-slate-900 dark:text-white text-xs block truncate">
                                {act.title}
                              </span>

                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-[#8FA69C] truncate">
                                <span className="font-semibold text-slate-600 dark:text-slate-300">
                                  {operatorName}
                                </span>
                                <span>&bull;</span>
                                <span>{formatTimeAgo(act.created_at, language)}</span>
                              </div>

                              {cleanDetails && (
                                <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] line-clamp-1">
                                  {cleanDetails.includes('Photo updated') ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                      <Camera className="w-3 h-3" /> Photo updated
                                    </span>
                                  ) : (
                                    cleanDetails
                                  )}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            {/* Amount if > 0 */}
                            {act.amount !== undefined && act.amount > 0 && (
                              <span className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                                ₹{act.amount.toLocaleString('en-IN')}
                              </span>
                            )}

                            {/* 40px rounded thumbnail if image exists (NEVER raw URL) */}
                            {imageUrl && (
                              <img
                                src={imageUrl}
                                alt="Activity thumbnail"
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-[#24352F] shadow-xs"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {filteredActivities.length > 10 && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAllActivities(!showAllActivities)}
                      className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      {showAllActivities ? 'Show Top 10' : `View All (${filteredActivities.length})`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
