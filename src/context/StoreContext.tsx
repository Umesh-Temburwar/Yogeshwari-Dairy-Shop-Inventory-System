import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Product, Sale, SaleItem, Purchase, DamageRecord, UdharCustomer, 
  UdharTransaction, Expense, TimeRangeFilter, PaymentMode,
  CustomerGender, CustomerAgeGroup, ProductBatch, ExpiryStatus,
  ProductReturn, RefundMode, ReturnReason, ReturnCondition,
  SupplierReturn, SupplierReturnReason, SupplierRefundStatus,
  UserRole, AdminActivity, AdminActionType
} from '../types';
import { 
  INITIAL_PRODUCTS, INITIAL_SALES, INITIAL_PURCHASES, 
  INITIAL_DAMAGES, INITIAL_CUSTOMERS, INITIAL_UDHAR_TRANSACTIONS, 
  INITIAL_EXPENSES, INITIAL_BATCHES 
} from '../lib/mockInitialData';
import { getShelfLifeDays, getSuggestedExpiryDate, generateBatchNumber, computeExpiryStatus } from '../lib/shelfLifeUtils';
import { supabase, getSupabaseConfig, generateUUID } from '../lib/supabase';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, isWithinInterval, parseISO } from 'date-fns';

export type AppView = 
  | 'dashboard' 
  | 'pos' 
  | 'sales'
  | 'inventory' 
  | 'purchases' 
  | 'damages' 
  | 'udhar' 
  | 'expenses' 
  | 'analytics' 
  | 'reorder'
  | 'expiry'
  | 'returns';

interface StoreContextType {
  // Navigation & Settings
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  timeFilter: TimeRangeFilter;
  setTimeFilter: (filter: TimeRangeFilter) => void;
  isSupabaseConnected: boolean;
  isSyncing: boolean;
  syncWithSupabase: () => Promise<void>;
  refreshData: () => Promise<void>;
  resetToSampleData: () => void;
  
  // Data State
  products: Product[];
  batches: ProductBatch[];
  sales: Sale[];
  purchases: Purchase[];
  damages: DamageRecord[];
  customers: UdharCustomer[];
  udharTransactions: UdharTransaction[];
  expenses: Expense[];
  returns: ProductReturn[];
  supplierReturns: SupplierReturn[];
  adminActivities: AdminActivity[];
  logAdminActivity: (activity: Omit<AdminActivity, 'id' | 'created_at'>) => Promise<AdminActivity>;
  
  // Receipt
  currentReceipt: Sale | null;
  setCurrentReceipt: (sale: Sale | null) => void;

  // Actions
  addProduct: (product: Omit<Product, 'id' | 'created_at'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (
    id: string, 
    qtyDelta: number, 
    reason?: string,
    batchInfo?: { 
      batch_id?: string; 
      batch_no?: string; 
      expiry_date?: string; 
      mfg_date?: string;
      supplier_name?: string;
    }
  ) => Promise<void>;

  addStockEntries: (
    productId: string,
    entries: Array<{
      batch_id?: string;
      batch_no?: string;
      mfg_date?: string;
      expiry_date: string;
      quantity: number;
      purchase_price?: number;
      supplier_name?: string;
      lot_type?: 'fresh_today' | 'previous_lot' | 'existing_batch';
      notes?: string;
    }>
  ) => Promise<void>;

  addBatch: (batchData: Omit<ProductBatch, 'id' | 'created_at'>) => Promise<ProductBatch>;
  updateBatch: (id: string, updates: Partial<ProductBatch>) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
  
  createSale: (saleData: {
    customer_name: string;
    customer_phone?: string;
    customer_gender?: CustomerGender;
    customer_age_group?: CustomerAgeGroup;
    customer_age?: number;
    total_amount: number;
    discount: number;
    net_amount: number;
    payment_mode: PaymentMode;
    cash_amount: number;
    online_amount: number;
    udhar_amount: number;
    created_by_name?: string;
    created_by_email?: string;
    created_by_role?: UserRole;
    admin_slot?: 1 | 2 | null;
    counter_name?: string;
    items: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit: string;
      unit_price: number;
      purchase_cost: number;
      total_price: number;
    }>;
  }) => Promise<Sale>;

  createPurchase: (purchaseData: Omit<Purchase, 'id' | 'created_at'>) => Promise<void>;
  addPurchase: (purchaseData: Omit<Purchase, 'id' | 'created_at'>) => Promise<void>;
  recordDamage: (damageData: Omit<DamageRecord, 'id' | 'created_at'>) => Promise<void>;
  
  addUdharCustomer: (customerData: {
    name: string;
    phone: string;
    address?: string;
    notes?: string;
  }) => Promise<UdharCustomer>;
  
  recordUdharPayment: (
    customerId: string, 
    amount: number, 
    paymentMode: 'Cash' | 'Online_UPI', 
    notes?: string
  ) => Promise<void>;

  addExpense: (expenseData: Omit<Expense, 'id' | 'created_at'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // Product Returns (Customer)
  createReturn: (returnData: Omit<ProductReturn, 'id' | 'return_no' | 'created_at'>) => Promise<ProductReturn>;
  processSaleReturn: (payload: {
    sale_id?: string;
    invoice_no?: string;
    customer_name?: string;
    customer_phone?: string;
    refund_mode: RefundMode;
    reason: ReturnReason;
    condition: ReturnCondition;
    notes?: string;
    return_date?: string;
    items: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit: string;
      unit_price: number;
      refund_amount: number;
    }>;
  }) => Promise<ProductReturn[]>;
  deleteReturn: (id: string) => Promise<void>;
  deleteSale: (saleId: string) => Promise<void>;

  // Supplier Returns (खरेदी व सप्लायर परतावा - खराब/एक्सपायर माल परत करणे)
  createSupplierReturn: (returnData: Omit<SupplierReturn, 'id' | 'return_no' | 'created_at'>) => Promise<SupplierReturn>;
  updateSupplierRefundStatus: (
    id: string, 
    newStatus: SupplierRefundStatus, 
    refundMode?: 'Cash' | 'Online_UPI' | 'Credit_Deduction' | 'Replacement', 
    notes?: string
  ) => Promise<void>;
  deleteSupplierReturn: (id: string) => Promise<void>;

  // Filtered views and analytics
  filteredSales: Sale[];
  filteredPurchases: Purchase[];
  filteredExpenses: Expense[];
  filteredDamages: DamageRecord[];
  filteredReturns: ProductReturn[];
  filteredSupplierReturns: SupplierReturn[];
  
  // Metrics
  metrics: {
    totalSalesRevenue: number;
    cashCollected: number;
    onlineCollected: number;
    udharGiven: number;
    totalPurchasesAmount: number;
    cogs: number;
    grossProfit: number;
    operatingExpenses: number;
    capitalInvestments: number;
    netProfit: number;
    totalDamagesLoss: number;
    totalOutstandingUdhar: number;
    lowStockCount: number;
    outOfStockCount: number;
    // Batch Expiry Metrics
    expiredBatchesCount: number;
    expiringTodayBatchesCount: number;
    expiringTomorrowBatchesCount: number;
    expiring3DaysBatchesCount: number;
    freshBatchesCount: number;
    totalActiveBatches: number;
    // Returns Metrics
    totalReturnsCount: number;
    totalRefundAmount: number;
    todayRefundAmount: number;
    // Supplier Returns Metrics
    totalSupplierReturnsCount: number;
    totalSupplierRefundAmount: number;
    totalSupplierRefundReceived: number;
    pendingSupplierRefundAmount: number;
    supplierReplacementCount: number;
    // Compatibility Aliases
    totalCOGS: number;
    creditGiven: number;
  };
}

// LocalStorage Version Migration: Clean all dummy/sample data from previous versions
const STORAGE_CLEAN_VERSION_KEY = 'yd_clean_data_version';
const CURRENT_CLEAN_VERSION = 'v4_clean_zero_all_dummy_data_2026';

if (typeof window !== 'undefined') {
  try {
    const currentVersion = localStorage.getItem(STORAGE_CLEAN_VERSION_KEY);
    if (currentVersion !== CURRENT_CLEAN_VERSION) {
      // Clear out legacy mock data
      localStorage.removeItem('yd_products');
      localStorage.removeItem('yd_batches');
      localStorage.removeItem('yd_sales');
      localStorage.removeItem('yd_purchases');
      localStorage.removeItem('yd_damages');
      localStorage.removeItem('yd_customers');
      localStorage.removeItem('yd_udhar_transactions');
      localStorage.removeItem('yd_expenses');
      localStorage.setItem(STORAGE_CLEAN_VERSION_KEY, CURRENT_CLEAN_VERSION);
    }
  } catch {
    // Ignore storage errors
  }
}

const VALID_APP_VIEWS: AppView[] = [
  'dashboard', 'pos', 'sales', 'inventory', 'purchases', 
  'damages', 'udhar', 'expenses', 'analytics', 'reorder', 
  'expiry', 'returns'
];

const getInitialAppView = (): AppView => {
  if (typeof window !== 'undefined') {
    const rawHash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    if (VALID_APP_VIEWS.includes(rawHash as AppView)) {
      return rawHash as AppView;
    }
    try {
      const saved = localStorage.getItem('yd_active_view');
      if (saved && VALID_APP_VIEWS.includes(saved as AppView)) {
        return saved as AppView;
      }
    } catch {
      // Ignore
    }
  }
  return 'dashboard';
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveViewState] = useState<AppView>(getInitialAppView);

  const setActiveView = useCallback((newView: AppView, pushHistory = true) => {
    setActiveViewState(newView);
    try {
      localStorage.setItem('yd_active_view', newView);
      if (pushHistory && typeof window !== 'undefined') {
        const targetHash = `#/${newView}`;
        if (window.location.hash !== targetHash) {
          window.history.pushState({ view: newView }, '', targetHash);
        }
      }
    } catch {
      // Ignore history errors
    }
  }, []);

  // Listen for browser Back/Forward (popstate) so website NEVER exits on back gesture
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Normalize initial URL hash
    const initialRaw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    if (!initialRaw || !VALID_APP_VIEWS.includes(initialRaw as AppView)) {
      window.history.replaceState({ view: activeView }, '', `#/${activeView}`);
    } else {
      window.history.replaceState({ view: initialRaw }, '', `#/${initialRaw}`);
    }

    const handlePopState = (e: PopStateEvent) => {
      // If in-app report preview modal is open, dismiss it on back navigation
      const reportModal = document.getElementById('yd-report-modal');
      if (reportModal) {
        reportModal.remove();
      }

      const currentRawHash = window.location.hash.replace(/^#\/?/, '').split('?')[0] as AppView;
      const target: AppView = (e.state && e.state.view && VALID_APP_VIEWS.includes(e.state.view))
        ? e.state.view
        : VALID_APP_VIEWS.includes(currentRawHash)
          ? currentRawHash
          : 'dashboard';

      setActiveViewState(target);
      try {
        localStorage.setItem('yd_active_view', target);
      } catch {
        // Ignore
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [timeFilter, setTimeFilter] = useState<TimeRangeFilter>('today');
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [currentReceipt, setCurrentReceipt] = useState<Sale | null>(null);

  // Initialize state from LocalStorage or mock data
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('yd_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [batches, setBatches] = useState<ProductBatch[]>(() => {
    const saved = localStorage.getItem('yd_batches');
    return saved ? JSON.parse(saved) : INITIAL_BATCHES;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('yd_sales');
    if (!saved) return INITIAL_SALES;
    try {
      const parsed: Sale[] = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_SALES;
    } catch {
      return INITIAL_SALES;
    }
  });

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem('yd_purchases');
    return saved ? JSON.parse(saved) : INITIAL_PURCHASES;
  });

  const [damages, setDamages] = useState<DamageRecord[]>(() => {
    const saved = localStorage.getItem('yd_damages');
    return saved ? JSON.parse(saved) : INITIAL_DAMAGES;
  });

  const [customers, setCustomers] = useState<UdharCustomer[]>(() => {
    const saved = localStorage.getItem('yd_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [udharTransactions, setUdharTransactions] = useState<UdharTransaction[]>(() => {
    const saved = localStorage.getItem('yd_udhar_transactions');
    return saved ? JSON.parse(saved) : INITIAL_UDHAR_TRANSACTIONS;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('yd_expenses');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [returns, setReturns] = useState<ProductReturn[]>(() => {
    const saved = localStorage.getItem('yd_returns');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [supplierReturns, setSupplierReturns] = useState<SupplierReturn[]>(() => {
    const saved = localStorage.getItem('yd_supplier_returns');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [adminActivities, setAdminActivities] = useState<AdminActivity[]>(() => {
    const saved = localStorage.getItem('yd_admin_activities');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Save to localStorage on state changes
  useEffect(() => {
    localStorage.setItem('yd_returns', JSON.stringify(returns));
  }, [returns]);
  useEffect(() => {
    localStorage.setItem('yd_supplier_returns', JSON.stringify(supplierReturns));
  }, [supplierReturns]);
  useEffect(() => {
    localStorage.setItem('yd_admin_activities', JSON.stringify(adminActivities));
  }, [adminActivities]);
  useEffect(() => {
    localStorage.setItem('yd_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('yd_batches', JSON.stringify(batches));
  }, [batches]);

  useEffect(() => {
    localStorage.setItem('yd_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('yd_purchases', JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem('yd_damages', JSON.stringify(damages));
  }, [damages]);

  useEffect(() => {
    localStorage.setItem('yd_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('yd_udhar_transactions', JSON.stringify(udharTransactions));
  }, [udharTransactions]);

  useEffect(() => {
    localStorage.setItem('yd_expenses', JSON.stringify(expenses));
  }, [expenses]);

  // Central Realtime Multi-Device Broadcast helper
  const broadcastMutation = useCallback((entity: string, action: string) => {
    if (supabase) {
      try {
        const channel = supabase.channel('dairy-shop-live-sync');
        channel.send({
          type: 'broadcast',
          event: 'STORE_MUTATION',
          payload: { entity, action, timestamp: Date.now() }
        }).then(() => {}, () => {});
      } catch {}
    }
  }, []);

  // Centralized Supabase Sync: Single Source of Truth for all devices
  const syncWithSupabase = useCallback(async () => {
    if (!supabase) return;
    setIsSyncing(true);
    try {
      // 1. Fetch products
      const { data: pData, error: pErr } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (!pErr && pData && pData.length > 0) {
        setProducts(pData);
      } else if (!pErr && (!pData || pData.length === 0)) {
        // Safe one-time migration: If central DB is empty, migrate any existing local items
        try {
          const localSaved = localStorage.getItem('yd_products');
          if (localSaved) {
            const localProds: Product[] = JSON.parse(localSaved);
            if (Array.isArray(localProds) && localProds.length > 0) {
              const prodsToUpload = localProds.map(lp => {
                const newId = (lp.id && !lp.id.startsWith('prod-')) ? lp.id : generateUUID();
                return {
                  id: newId,
                  name: lp.name,
                  hindi_name: lp.hindi_name || null,
                  marathi_name: lp.marathi_name || null,
                  category: lp.category,
                  unit: lp.unit,
                  purchase_price: lp.purchase_price,
                  selling_price: lp.selling_price,
                  stock_quantity: lp.stock_quantity,
                  min_stock_alert: lp.min_stock_alert || 10,
                  shelf_life_days: 2,
                  has_expiry: true,
                  is_active: lp.is_active ?? true
                };
              });
              await supabase.from('products').insert(prodsToUpload);
              setProducts(prodsToUpload as any);
            }
          }
        } catch (migErr) {
          console.warn('Local migration skipped:', migErr);
        }
      }

      // 2. Fetch batches
      const { data: bData, error: bErr } = await supabase
        .from('batches')
        .select('*, products(name)')
        .order('expiry_date', { ascending: true });

      if (!bErr && bData) {
        const enrichedBatches = bData.map((b: any) => ({
          ...b,
          product_name: b.product_name || b.products?.name || ''
        }));
        setBatches(enrichedBatches);
      }

      // 3. Fetch sales & sale items
      const { data: sData, error: sErr } = await supabase
        .from('sales')
        .select('*, items:sale_items(*)')
        .order('created_at', { ascending: false });
      if (!sErr && sData) {
        setSales(sData);
      }

      // 4. Fetch purchases
      const { data: purData, error: purErr } = await supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false });
      if (!purErr && purData) {
        setPurchases(purData);
      }

      // 5. Fetch damages
      const { data: dData, error: dErr } = await supabase
        .from('damage_records')
        .select('*')
        .order('created_at', { ascending: false });
      if (!dErr && dData) {
        setDamages(dData);
      }

      // 6. Fetch expenses
      const { data: expData, error: expErr } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });
      if (!expErr && expData) {
        setExpenses(expData);
      }

      // 7. Fetch customers
      const { data: custData, error: custErr } = await supabase
        .from('udhar_customers')
        .select('*')
        .order('name', { ascending: true });
      if (!custErr && custData) {
        setCustomers(custData);
      }

      // 8. Fetch customer returns
      const { data: retData, error: retErr } = await supabase
        .from('product_returns')
        .select('*')
        .order('created_at', { ascending: false });
      if (!retErr && retData) {
        setReturns(retData);
      }

      // 9. Fetch supplier returns
      const { data: supRetData, error: supRetErr } = await supabase
        .from('supplier_returns')
        .select('*')
        .order('created_at', { ascending: false });
      if (!supRetErr && supRetData) {
        setSupplierReturns(supRetData);
      }

      // 10. Fetch udhar transactions
      const { data: utData, error: utErr } = await supabase
        .from('udhar_transactions')
        .select('*')
        .order('created_at', { ascending: false });
      if (!utErr && utData) {
        setUdharTransactions(utData);
      }

      // 11. Fetch admin audit logs
      const { data: auditData, error: auditErr } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (!auditErr && auditData) {
        setAdminActivities(auditData);
      }

      setIsSupabaseConnected(true);
    } catch (err) {
      console.error('Supabase central sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Multi-Device Realtime Synchronization via Supabase WebSocket
  useEffect(() => {
    if (!supabase) return;

    // 1. Join realtime channel
    const syncChannel = supabase.channel('dairy-shop-live-sync', {
      config: {
        broadcast: { self: false }
      }
    });

    // Handle peer broadcasts when Device 1 or Device 2 performs an action
    syncChannel.on('broadcast', { event: 'STORE_MUTATION' }, (msg) => {
      console.log('📡 Realtime update received from peer terminal:', msg);
      syncWithSupabase();
    });

    // Handle direct Postgres logical replication changes
    const tablesToWatch = [
      'products', 'batches', 'sales', 'sale_items', 'purchases', 
      'damage_records', 'udhar_customers', 'udhar_transactions', 
      'expenses', 'product_returns', 'supplier_returns', 'admin_audit_logs'
    ];

    tablesToWatch.forEach((tbl) => {
      syncChannel.on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: tbl }, 
        () => {
          syncWithSupabase();
        }
      );
    });

    syncChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsSupabaseConnected(true);
      }
    });

    // 2. Refetch on tab focus or visibility change (e.g., unlocking phone or switching windows)
    const handleFocusOrVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncWithSupabase();
      }
    };
    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    // Initial database pull on mount
    syncWithSupabase();

    return () => {
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      syncChannel.unsubscribe();
    };
  }, [syncWithSupabase]);

  const refreshData = async () => {
    setIsSyncing(true);
    try {
      await syncWithSupabase();
    } finally {
      setIsSyncing(false);
    }
  };

  const resetToSampleData = () => {
    setProducts(INITIAL_PRODUCTS);
    setBatches(INITIAL_BATCHES);
    setSales(INITIAL_SALES);
    setPurchases(INITIAL_PURCHASES);
    setDamages(INITIAL_DAMAGES);
    setCustomers(INITIAL_CUSTOMERS);
    setUdharTransactions(INITIAL_UDHAR_TRANSACTIONS);
    setExpenses(INITIAL_EXPENSES);
    setReturns([]);
    setSupplierReturns([]);
    try {
      localStorage.removeItem('yd_products');
      localStorage.removeItem('yd_batches');
      localStorage.removeItem('yd_sales');
      localStorage.removeItem('yd_purchases');
      localStorage.removeItem('yd_damages');
      localStorage.removeItem('yd_customers');
      localStorage.removeItem('yd_udhar_transactions');
      localStorage.removeItem('yd_expenses');
      localStorage.removeItem('yd_returns');
      localStorage.removeItem('yd_supplier_returns');
    } catch {
      // Ignore
    }
  };

  // Helper date filter
  const filterByDate = (dateStr: string) => {
    if (timeFilter === 'all') return true;
    const now = new Date();
    const itemDate = parseISO(dateStr);
    
    let intervalStart: Date;
    if (timeFilter === 'today') {
      intervalStart = startOfDay(now);
    } else if (timeFilter === 'week') {
      intervalStart = startOfWeek(now, { weekStartsOn: 1 });
    } else if (timeFilter === 'month') {
      intervalStart = startOfMonth(now);
    } else if (timeFilter === 'year') {
      intervalStart = startOfYear(now);
    } else {
      return true;
    }

    return isWithinInterval(itemDate, { start: intervalStart, end: now }) || 
           dateStr === new Date().toISOString().split('T')[0];
  };

  const filteredSales = useMemo(() => {
    return sales.filter(s => filterByDate(s.sale_date));
  }, [sales, timeFilter]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => filterByDate(p.purchase_date));
  }, [purchases, timeFilter]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => filterByDate(e.expense_date));
  }, [expenses, timeFilter]);

  const filteredDamages = useMemo(() => {
    return damages.filter(d => filterByDate(d.damage_date));
  }, [damages, timeFilter]);

  const filteredReturns = useMemo(() => {
    return returns.filter(r => filterByDate(r.return_date));
  }, [returns, timeFilter]);

  const filteredSupplierReturns = useMemo(() => {
    return supplierReturns.filter(r => filterByDate(r.return_date));
  }, [supplierReturns, timeFilter]);

  // Aggregated Financial Metrics
  const metrics = useMemo(() => {
    let totalSalesRevenue = 0;
    let cashCollected = 0;
    let onlineCollected = 0;
    let udharGiven = 0;
    let cogs = 0;

    filteredSales.forEach(s => {
      totalSalesRevenue += s.net_amount;
      cashCollected += s.cash_amount || 0;
      onlineCollected += s.online_amount || 0;
      udharGiven += s.udhar_amount || 0;
      
      // Calculate COGS from item historical purchase costs
      if (s.items && s.items.length > 0) {
        s.items.forEach(item => {
          cogs += (item.purchase_cost || 0) * (item.quantity || 0);
        });
      } else {
        // Fallback: If s.items relation is delayed or missing, compute reasonable estimated purchase cost
        // based on existing products or a default 75% COGS (25% margin)
        cogs += Math.round(s.net_amount * 0.75 * 100) / 100;
      }
    });

    const totalPurchasesAmount = filteredPurchases.reduce((acc, p) => acc + p.total_amount, 0);

    let operatingExpenses = 0;
    let capitalInvestments = 0;

    filteredExpenses.forEach(e => {
      if (e.is_capital_investment) {
        capitalInvestments += e.amount;
      } else {
        operatingExpenses += e.amount;
      }
    });

    const totalDamagesLoss = filteredDamages.reduce((acc, d) => acc + d.estimated_loss_amount, 0);
    const grossProfit = totalSalesRevenue - cogs;
    const netProfit = grossProfit - operatingExpenses - totalDamagesLoss;

    const totalOutstandingUdhar = customers.reduce((acc, c) => acc + (c.current_balance > 0 ? c.current_balance : 0), 0);
    const lowStockCount = products.filter(p => p.stock_quantity <= p.min_stock_alert && p.stock_quantity > 0).length;
    const outOfStockCount = products.filter(p => p.stock_quantity <= 0).length;

    // Batch Expiry Alert Counts
    let expiredBatchesCount = 0;
    let expiringTodayBatchesCount = 0;
    let expiringTomorrowBatchesCount = 0;
    let expiring3DaysBatchesCount = 0;
    let freshBatchesCount = 0;

    batches.forEach(b => {
      if (b.qty_remaining <= 0) return;
      const { status } = computeExpiryStatus(b.expiry_date);
      if (status === 'EXPIRED') expiredBatchesCount += 1;
      else if (status === 'EXPIRING_TODAY') expiringTodayBatchesCount += 1;
      else if (status === 'EXPIRING_TOMORROW') expiringTomorrowBatchesCount += 1;
      else if (status === 'EXPIRING_IN_3_DAYS') expiring3DaysBatchesCount += 1;
      else freshBatchesCount += 1;
    });

    return {
      totalSalesRevenue,
      cashCollected,
      onlineCollected,
      udharGiven,
      totalPurchasesAmount,
      cogs,
      grossProfit,
      operatingExpenses,
      capitalInvestments,
      netProfit,
      totalDamagesLoss,
      totalOutstandingUdhar,
      lowStockCount,
      outOfStockCount,
      expiredBatchesCount,
      expiringTodayBatchesCount,
      expiringTomorrowBatchesCount,
      expiring3DaysBatchesCount,
      freshBatchesCount,
      totalActiveBatches: batches.filter(b => b.qty_remaining > 0).length,
      // Returns Metrics
      totalReturnsCount: filteredReturns.length,
      totalRefundAmount: filteredReturns.reduce((acc, r) => acc + (r.refund_amount || 0), 0),
      todayRefundAmount: returns.filter(r => r.return_date === new Date().toISOString().split('T')[0]).reduce((acc, r) => acc + (r.refund_amount || 0), 0),
      // Supplier Returns Metrics
      totalSupplierReturnsCount: filteredSupplierReturns.length,
      totalSupplierRefundAmount: filteredSupplierReturns.reduce((acc, r) => acc + (r.total_refund_amount || 0), 0),
      totalSupplierRefundReceived: filteredSupplierReturns.filter(r => r.refund_status === 'Refund_Received' || r.refund_status === 'Adjusted_In_Next_Bill').reduce((acc, r) => acc + (r.total_refund_amount || 0), 0),
      pendingSupplierRefundAmount: filteredSupplierReturns.filter(r => r.refund_status === 'Pending').reduce((acc, r) => acc + (r.total_refund_amount || 0), 0),
      supplierReplacementCount: filteredSupplierReturns.filter(r => r.refund_status === 'Replacement_Received').length,
      // Compatibility Aliases
      totalCOGS: cogs,
      creditGiven: udharGiven
    };
  }, [filteredSales, filteredPurchases, filteredExpenses, filteredDamages, filteredReturns, returns, customers, products, batches]);

  // Helper to resolve currently active admin/owner profile details
  const getActiveAdminInfo = useCallback(() => {
    try {
      let userEmail = '';
      try {
        const storedUser = localStorage.getItem('ydo_auth_local_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          userEmail = (parsed.email || '').toLowerCase().trim();
        }
      } catch {}

      const savedRole = (localStorage.getItem('ydo_active_role') || 'Admin') as UserRole;
      const role: UserRole = (savedRole === 'Owner' || savedRole === 'Admin') ? savedRole : 'Owner';
      const slotStr = localStorage.getItem('ydo_admin_slot');
      const slot: 1 | 2 | null = role === 'Owner' ? null : (slotStr === '2' ? (2 as const) : (1 as const));

      if (userEmail === 'nilusakhare2003@gmail.com' || userEmail.includes('nilu') || role === 'Admin' || slot === 1) {
        return {
          role: 'Admin' as UserRole,
          slot: 1 as 1 | 2,
          email: 'nilusakhare2003@gmail.com',
          name: 'Nilesh Sakhare',
          counter: 'काऊंटर १ - मुख्य बिलिंग'
        };
      } else {
        return {
          role: 'Owner' as UserRole,
          slot: null,
          email: 'yogeshwaridairy9896@gmail.com',
          name: 'Nikhil Sakhare',
          counter: 'मुख्य मालक काऊंटर'
        };
      }
    } catch {
      return { 
        role: 'Admin' as UserRole, 
        slot: 1 as 1 | 2, 
        email: 'nilusakhare2003@gmail.com',
        name: 'Nilesh Sakhare', 
        counter: 'काऊंटर १ - मुख्य बिलिंग' 
      };
    }
  }, []);

  const logAdminActivity = useCallback(async (activityData: Omit<AdminActivity, 'id' | 'created_at'>): Promise<AdminActivity> => {
    const newActivity: AdminActivity = {
      ...activityData,
      id: generateUUID(),
      created_at: new Date().toISOString()
    };

    setAdminActivities(prev => [newActivity, ...prev]);

    if (supabase) {
      try {
        await supabase.from('admin_audit_logs').insert([{
          id: newActivity.id,
          admin_name: newActivity.admin_name,
          admin_email: newActivity.admin_email || null,
          admin_role: newActivity.admin_role,
          admin_slot: newActivity.admin_slot || null,
          counter_name: newActivity.counter_name,
          action_type: newActivity.action_type,
          title: newActivity.title,
          details: newActivity.details,
          amount: newActivity.amount || 0,
          reference_id: newActivity.reference_id || null,
          reference_table: newActivity.reference_table || null,
          created_at: newActivity.created_at
        }]);
        broadcastMutation('audit', 'log');
      } catch (err) {
        console.warn('Failed to sync admin audit log to Supabase', err);
      }
    }

    return newActivity;
  }, [broadcastMutation]);

  // Actions
  const addProduct = async (productData: Omit<Product, 'id' | 'created_at'>): Promise<Product> => {
    const productId = generateUUID();
    const newProduct: Product = {
      ...productData,
      id: productId,
      created_at: new Date().toISOString()
    };

    setProducts(prev => [newProduct, ...prev]);

    // If initial stock is provided, auto-create its initial batch with variety shelf life
    let initialBatch: ProductBatch | null = null;
    if (newProduct.stock_quantity > 0) {
      const todayFormatted = new Date().toISOString().split('T')[0];
      const shelfDays = getShelfLifeDays(newProduct.category, newProduct.name);
      initialBatch = {
        id: generateUUID(),
        product_id: newProduct.id,
        product_name: newProduct.name,
        batch_no: generateBatchNumber(newProduct.name, todayFormatted),
        mfg_date: todayFormatted,
        expiry_date: getSuggestedExpiryDate(todayFormatted, shelfDays),
        qty_received: newProduct.stock_quantity,
        qty_remaining: newProduct.stock_quantity,
        purchase_price: newProduct.purchase_price,
        notes: 'Initial stock on product creation',
        created_at: new Date().toISOString()
      };
      setBatches(prev => [initialBatch!, ...prev]);
    }

    if (supabase) {
      try {
        const { error: pErr } = await supabase.from('products').insert([{
          id: newProduct.id,
          name: newProduct.name,
          hindi_name: newProduct.hindi_name || null,
          marathi_name: newProduct.marathi_name || null,
          category: newProduct.category,
          unit: newProduct.unit,
          purchase_price: newProduct.purchase_price,
          selling_price: newProduct.selling_price,
          stock_quantity: newProduct.stock_quantity,
          min_stock_alert: newProduct.min_stock_alert || 10,
          shelf_life_days: 2,
          has_expiry: true,
          barcode: newProduct.barcode || null,
          is_active: newProduct.is_active ?? true
        }]);

        if (pErr) {
          console.error('Failed to sync new product to Supabase:', pErr);
        } else if (initialBatch) {
          const { error: bErr } = await supabase.from('batches').insert([{
            id: initialBatch.id,
            product_id: initialBatch.product_id,
            product_name: initialBatch.product_name,
            batch_no: initialBatch.batch_no,
            mfg_date: initialBatch.mfg_date,
            expiry_date: initialBatch.expiry_date,
            qty_received: initialBatch.qty_received,
            qty_remaining: initialBatch.qty_remaining,
            purchase_price: initialBatch.purchase_price,
            selling_price: newProduct.selling_price,
            notes: initialBatch.notes,
            status: 'ACTIVE'
          }]);
          if (bErr) console.warn('Failed to sync initial batch to Supabase:', bErr);
        }
        broadcastMutation('products', 'insert');
      } catch (e) {
        console.error('Failed to sync new product to Supabase', e);
      }
    }

    const admin = getActiveAdminInfo();
    logAdminActivity({
      admin_name: admin.name,
      admin_email: admin.email,
      admin_role: admin.role,
      admin_slot: admin.slot,
      counter_name: admin.counter,
      action_type: 'PRODUCT_ADDED',
      title: `नवीन उत्पादन जोडले: ${newProduct.name}`,
      details: `प्रवर्ग: ${newProduct.category} | दर: ₹${newProduct.selling_price} | खरेदी: ₹${newProduct.purchase_price} | प्रारंभिक साठा: ${newProduct.stock_quantity} ${newProduct.unit}`,
      amount: newProduct.selling_price,
      reference_id: newProduct.id,
      reference_table: 'products'
    });

    return newProduct;
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const existingProd = products.find(p => p.id === id);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p));
    if (supabase) {
      try {
        await supabase.from('products').update({
          ...updates,
          updated_at: new Date().toISOString()
        }).eq('id', id);
        broadcastMutation('products', 'update');
      } catch (e) {
        console.error('Failed to update product in Supabase', e);
      }
    }

    const admin = getActiveAdminInfo();
    const changes = Object.entries(updates)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    logAdminActivity({
      admin_name: admin.name,
      admin_email: admin.email,
      admin_role: admin.role,
      admin_slot: admin.slot,
      counter_name: admin.counter,
      action_type: 'PRODUCT_UPDATED',
      title: `उत्पादन माहिती बदल: ${existingProd?.name || id}`,
      details: `बदललेले तपशील: ${changes}`,
      reference_id: id,
      reference_table: 'products'
    });
  };

  const deleteProduct = async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    setBatches(prev => prev.filter(b => b.product_id !== id));
    if (supabase) {
      try {
        await supabase.from('products').delete().eq('id', id);
        broadcastMutation('products', 'delete');
      } catch (e) {
        console.error('Failed to delete product in Supabase', e);
      }
    }
  };

  const adjustStock = async (
    id: string, 
    qtyDelta: number, 
    reason?: string,
    batchInfo?: { 
      batch_id?: string; 
      batch_no?: string; 
      expiry_date?: string; 
      mfg_date?: string;
      supplier_name?: string;
    }
  ) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;

    const newStockQty = Math.max(0, Number((prod.stock_quantity + qtyDelta).toFixed(2)));

    let createdBatch: ProductBatch | null = null;
    let updatedBatchId: string | null = null;
    let updatedBatchQtyRemaining: number | null = null;

    if (qtyDelta > 0) {
      if (batchInfo?.batch_id) {
        // Add quantity to an existing previous batch
        updatedBatchId = batchInfo.batch_id;
        setBatches(prev => prev.map(b => {
          if (b.id === batchInfo.batch_id) {
            updatedBatchQtyRemaining = Number((b.qty_remaining + qtyDelta).toFixed(2));
            return {
              ...b,
              qty_received: Number((b.qty_received + qtyDelta).toFixed(2)),
              qty_remaining: updatedBatchQtyRemaining,
              notes: reason || b.notes
            };
          }
          return b;
        }));
      } else {
        // Stock In: create a new batch with variety-specific shelf life
        const todayFormatted = new Date().toISOString().split('T')[0];
        const shelfDays = getShelfLifeDays(prod.category, prod.name);
        const batchNo = batchInfo?.batch_no || generateBatchNumber(prod.name, todayFormatted);
        const expiryDate = batchInfo?.expiry_date || getSuggestedExpiryDate(batchInfo?.mfg_date || todayFormatted, shelfDays);

        createdBatch = {
          id: generateUUID(),
          product_id: id,
          product_name: prod.name,
          batch_no: batchNo,
          mfg_date: batchInfo?.mfg_date || todayFormatted,
          expiry_date: expiryDate,
          qty_received: qtyDelta,
          qty_remaining: qtyDelta,
          purchase_price: prod.purchase_price,
          supplier_name: batchInfo?.supplier_name,
          notes: reason || 'Stock In adjustment',
          created_at: new Date().toISOString()
        };
        setBatches(prev => [createdBatch!, ...prev]);
      }
    } else if (qtyDelta < 0) {
      // Stock Out: FEFO deduction from earliest expiring batch
      let remainingDeduct = Math.abs(qtyDelta);
      const batchesToUpdateInDb: Array<{ id: string; qty_remaining: number }> = [];

      setBatches(prev => {
        const prodBatches = prev
          .filter(b => b.product_id === id && b.qty_remaining > 0)
          .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

        return prev.map(b => {
          if (b.product_id !== id || b.qty_remaining <= 0 || remainingDeduct <= 0) return b;
          if (prodBatches.some(pb => pb.id === b.id)) {
            const deduct = Math.min(b.qty_remaining, remainingDeduct);
            remainingDeduct -= deduct;
            const newRemaining = Number((b.qty_remaining - deduct).toFixed(2));
            batchesToUpdateInDb.push({ id: b.id, qty_remaining: newRemaining });
            return {
              ...b,
              qty_remaining: newRemaining
            };
          }
          return b;
        });
      });

      if (supabase && batchesToUpdateInDb.length > 0) {
        for (const bu of batchesToUpdateInDb) {
          await supabase.from('batches').update({
            qty_remaining: bu.qty_remaining,
            updated_at: new Date().toISOString()
          }).eq('id', bu.id);
        }
      }
    }

    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, stock_quantity: newStockQty };
      }
      return p;
    }));

    if (supabase) {
      try {
        await supabase.from('products').update({ 
          stock_quantity: newStockQty,
          updated_at: new Date().toISOString()
        }).eq('id', id);

        if (createdBatch) {
          await supabase.from('batches').insert([{
            id: createdBatch.id,
            product_id: createdBatch.product_id,
            batch_no: createdBatch.batch_no,
            mfg_date: createdBatch.mfg_date,
            expiry_date: createdBatch.expiry_date,
            qty_received: createdBatch.qty_received,
            qty_remaining: createdBatch.qty_remaining,
            purchase_price: createdBatch.purchase_price,
            selling_price: prod.selling_price || 0,
            supplier_name: createdBatch.supplier_name || null,
            notes: createdBatch.notes,
            status: 'ACTIVE'
          }]);
        } else if (updatedBatchId && updatedBatchQtyRemaining !== null) {
          await supabase.from('batches').update({
            qty_remaining: updatedBatchQtyRemaining,
            updated_at: new Date().toISOString()
          }).eq('id', updatedBatchId);
        }

        broadcastMutation('stock', 'adjust');
      } catch (err) {
        console.error('Failed to sync adjustStock to Supabase:', err);
      }
    }

    const admin = getActiveAdminInfo();
    const oldQty = prod.stock_quantity;
    const finalQty = newStockQty;
    logAdminActivity({
      admin_name: admin.name,
      admin_email: admin.email,
      admin_role: admin.role,
      admin_slot: admin.slot,
      counter_name: admin.counter,
      action_type: 'STOCK_INWARD',
      title: `इन्व्हेंटरी साठा बदल: ${prod.name}`,
      details: `बदल: ${qtyDelta > 0 ? '+' : ''}${qtyDelta} ${prod.unit} | कारण: ${reason || 'साठा समायोजन'} | आधी: ${oldQty} -> आता: ${finalQty}`,
      reference_id: prod.id,
      reference_table: 'products'
    });
  };

  const addStockEntries = async (
    productId: string,
    entries: Array<{
      batch_id?: string;
      batch_no?: string;
      mfg_date?: string;
      expiry_date: string;
      quantity: number;
      purchase_price?: number;
      supplier_name?: string;
      lot_type?: 'fresh_today' | 'previous_lot' | 'existing_batch';
      notes?: string;
    }>
  ) => {
    const prod = products.find(p => p.id === productId);
    if (!prod || entries.length === 0) return;

    let totalQtyAdded = 0;
    const newBatchesToAppend: ProductBatch[] = [];
    const existingBatchesToUpdate: Array<{ id: string; qty_received: number; qty_remaining: number }> = [];

    entries.forEach((entry) => {
      const qty = entry.quantity;
      if (qty <= 0) return;
      totalQtyAdded += qty;

      if (entry.batch_id) {
        // Increment existing batch
        setBatches(prev => prev.map(b => {
          if (b.id === entry.batch_id) {
            const newRec = Number((b.qty_received + qty).toFixed(2));
            const newRem = Number((b.qty_remaining + qty).toFixed(2));
            existingBatchesToUpdate.push({ id: b.id, qty_received: newRec, qty_remaining: newRem });
            return {
              ...b,
              qty_received: newRec,
              qty_remaining: newRem
            };
          }
          return b;
        }));
      } else {
        // New batch entry
        const todayStr = new Date().toISOString().split('T')[0];
        const mfg = entry.mfg_date || todayStr;
        const shelfDays = getShelfLifeDays(prod.category, prod.name);
        const exp = entry.expiry_date || getSuggestedExpiryDate(mfg, shelfDays);
        const batchNo = entry.batch_no || generateBatchNumber(prod.name, mfg);

        newBatchesToAppend.push({
          id: generateUUID(),
          product_id: prod.id,
          product_name: prod.name,
          batch_no: batchNo,
          mfg_date: mfg,
          expiry_date: exp,
          qty_received: qty,
          qty_remaining: qty,
          purchase_price: entry.purchase_price || prod.purchase_price,
          supplier_name: entry.supplier_name,
          notes: entry.notes || (entry.lot_type === 'previous_lot' ? 'Previous stock lot entry' : "Today's fresh lot arrival"),
          created_at: new Date().toISOString()
        });
      }
    });

    if (newBatchesToAppend.length > 0) {
      setBatches(prev => [...newBatchesToAppend, ...prev]);
    }

    const finalProductStock = Number((prod.stock_quantity + totalQtyAdded).toFixed(2));
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          stock_quantity: finalProductStock
        };
      }
      return p;
    }));

    if (supabase) {
      try {
        if (newBatchesToAppend.length > 0) {
          await supabase.from('batches').insert(newBatchesToAppend.map(b => ({
            id: b.id,
            product_id: b.product_id,
            batch_no: b.batch_no,
            mfg_date: b.mfg_date,
            expiry_date: b.expiry_date,
            qty_received: b.qty_received,
            qty_remaining: b.qty_remaining,
            purchase_price: b.purchase_price,
            selling_price: prod.selling_price || 0,
            supplier_name: b.supplier_name || null,
            notes: b.notes,
            status: 'ACTIVE'
          })));
        }
        for (const eb of existingBatchesToUpdate) {
          await supabase.from('batches').update({
            qty_received: eb.qty_received,
            qty_remaining: eb.qty_remaining,
            updated_at: new Date().toISOString()
          }).eq('id', eb.id);
        }
        await supabase.from('products').update({
          stock_quantity: finalProductStock,
          updated_at: new Date().toISOString()
        }).eq('id', productId);

        broadcastMutation('stock', 'inward');
      } catch (err) {
        console.warn('Supabase batch inward sync error:', err);
      }
    }

    const admin = getActiveAdminInfo();
    logAdminActivity({
      admin_name: admin.name,
      admin_email: admin.email,
      admin_role: admin.role,
      admin_slot: admin.slot,
      counter_name: admin.counter,
      action_type: 'STOCK_INWARD',
      title: `साठा/बॅच आवक नोंद: ${prod.name}`,
      details: `वाढलेला साठा: +${totalQtyAdded} ${prod.unit} (${entries.length} बॅच नोंदी)`,
      reference_id: prod.id,
      reference_table: 'products'
    });
  };

  const addBatch = async (batchData: Omit<ProductBatch, 'id' | 'created_at'>): Promise<ProductBatch> => {
    const newBatch: ProductBatch = {
      ...batchData,
      id: generateUUID(),
      created_at: new Date().toISOString()
    };
    setBatches(prev => [newBatch, ...prev]);

    let finalProdStock = 0;
    setProducts(prev => prev.map(p => {
      if (p.id === batchData.product_id) {
        finalProdStock = Number((p.stock_quantity + batchData.qty_remaining).toFixed(2));
        return {
          ...p,
          stock_quantity: finalProdStock
        };
      }
      return p;
    }));

    if (supabase) {
      try {
        await supabase.from('batches').insert([{
          id: newBatch.id,
          product_id: newBatch.product_id,
          batch_no: newBatch.batch_no,
          mfg_date: newBatch.mfg_date,
          expiry_date: newBatch.expiry_date,
          qty_received: newBatch.qty_received,
          qty_remaining: newBatch.qty_remaining,
          purchase_price: newBatch.purchase_price,
          selling_price: 0,
          supplier_name: newBatch.supplier_name || null,
          notes: newBatch.notes,
          status: 'ACTIVE'
        }]);
        if (finalProdStock > 0) {
          await supabase.from('products').update({
            stock_quantity: finalProdStock,
            updated_at: new Date().toISOString()
          }).eq('id', batchData.product_id);
        }
        broadcastMutation('batches', 'add');
      } catch (e) {
        console.error('Supabase addBatch error:', e);
      }
    }
    return newBatch;
  };

  const updateBatch = async (id: string, updates: Partial<ProductBatch>) => {
    setBatches(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    if (supabase) {
      try {
        await supabase.from('batches').update({
          ...updates,
          updated_at: new Date().toISOString()
        }).eq('id', id);
        broadcastMutation('batches', 'update');
      } catch (e) {
        console.error('Supabase updateBatch error:', e);
      }
    }
  };

  const deleteBatch = async (id: string) => {
    setBatches(prev => prev.filter(b => b.id !== id));
    if (supabase) {
      try {
        await supabase.from('batches').delete().eq('id', id);
        broadcastMutation('batches', 'delete');
      } catch (e) {
        console.error('Supabase deleteBatch error:', e);
      }
    }
  };

  const createSale = async (saleData: {
    customer_name: string;
    customer_phone?: string;
    customer_gender?: CustomerGender;
    customer_age_group?: CustomerAgeGroup;
    customer_age?: number;
    total_amount: number;
    discount: number;
    net_amount: number;
    payment_mode: PaymentMode;
    cash_amount: number;
    online_amount: number;
    udhar_amount: number;
    created_by_name?: string;
    created_by_email?: string;
    created_by_role?: UserRole;
    admin_slot?: 1 | 2 | null;
    counter_name?: string;
    items: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit: string;
      unit_price: number;
      purchase_cost: number;
      total_price: number;
    }>;
  }): Promise<Sale> => {
    const saleId = generateUUID();
    const todayFormatted = new Date().toISOString().split('T')[0];

    const adminInfo = getActiveAdminInfo();
    const createdByName = saleData.created_by_name || adminInfo.name;
    const createdByEmail = saleData.created_by_email || adminInfo.email;
    const createdByRole = saleData.created_by_role || adminInfo.role;
    const adminSlot = saleData.admin_slot !== undefined ? saleData.admin_slot : adminInfo.slot;
    const counterName = saleData.counter_name || adminInfo.counter;

    // Guaranteed Unique Multi-Device Invoice Number (e.g. YD-20261112-C1-0001-492)
    const now = new Date();
    const dateCompact = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const counterTag = adminSlot ? `C${adminSlot}` : 'M';
    const todaySalesCount = sales.filter(s => s.sale_date === todayFormatted).length + 1;
    const seqStr = String(todaySalesCount).padStart(4, '0');
    const entropy = Math.floor(100 + Math.random() * 900);
    const invoiceNo = `YD-${dateCompact}-${counterTag}-${seqStr}-${entropy}`;

    const saleItems: SaleItem[] = saleData.items.map((item) => ({
      ...item,
      id: generateUUID(),
      sale_id: saleId,
      product_id: item.product_id || generateUUID()
    }));

    const newSale: Sale = {
      id: saleId,
      invoice_no: invoiceNo,
      customer_name: saleData.customer_name || 'Counter Customer',
      customer_phone: saleData.customer_phone || '',
      customer_gender: saleData.customer_gender,
      customer_age_group: saleData.customer_age_group,
      customer_age: saleData.customer_age,
      total_amount: saleData.total_amount,
      discount: saleData.discount,
      net_amount: saleData.net_amount,
      payment_mode: saleData.payment_mode,
      cash_amount: saleData.cash_amount,
      online_amount: saleData.online_amount,
      udhar_amount: saleData.udhar_amount,
      sale_date: todayFormatted,
      created_at: new Date().toISOString(),
      items: saleItems,
      created_by_name: createdByName,
      created_by_email: createdByEmail,
      created_by_role: createdByRole,
      admin_slot: adminSlot,
      counter_name: counterName
    };

    // 1. Deduct stock for sold items using FEFO across active batches
    const batchDeductionsToSync: Array<{ id: string; qty_remaining: number }> = [];

    setBatches(prev => {
      let updatedBatches = [...prev];
      saleData.items.forEach(soldItem => {
        let remainingNeeded = soldItem.quantity;
        const candidateBatches = updatedBatches
          .filter(b => b.product_id === soldItem.product_id && b.qty_remaining > 0 && computeExpiryStatus(b.expiry_date).status !== 'EXPIRED')
          .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

        for (const candidate of candidateBatches) {
          if (remainingNeeded <= 0) break;
          const takeQty = Math.min(candidate.qty_remaining, remainingNeeded);
          remainingNeeded -= takeQty;
          const newQtyRemaining = Number((candidate.qty_remaining - takeQty).toFixed(2));

          batchDeductionsToSync.push({ id: candidate.id, qty_remaining: newQtyRemaining });

          updatedBatches = updatedBatches.map(b => {
            if (b.id === candidate.id) {
              return {
                ...b,
                qty_remaining: newQtyRemaining
              };
            }
            return b;
          });
        }
      });
      return updatedBatches;
    });

    // 2. Deduct stock for sold items on aggregate product
    const productDeductionsToSync: Array<{ id: string; newStock: number }> = [];

    setProducts(prev => {
      return prev.map(prod => {
        const soldItem = saleData.items.find(i => i.product_id === prod.id);
        if (soldItem) {
          const updatedStock = Math.max(0, Number((prod.stock_quantity - soldItem.quantity).toFixed(2)));
          productDeductionsToSync.push({ id: prod.id, newStock: updatedStock });
          return { ...prod, stock_quantity: updatedStock };
        }
        return prod;
      });
    });

    // 3. If Udhar is involved and customer phone/name matches or new customer
    if (saleData.udhar_amount > 0) {
      const cleanCustomerName = (saleData.customer_name || 'Counter Customer').trim();
      const cleanCustomerPhone = saleData.customer_phone?.trim() || '';

      const existingCust = customers.find(c => 
        (cleanCustomerPhone && c.phone && c.phone !== 'N/A' && c.phone === cleanCustomerPhone) || 
        c.name.trim().toLowerCase() === cleanCustomerName.toLowerCase()
      );

      const targetCustId = existingCust ? existingCust.id : generateUUID();
      const isNewCustomer = !existingCust;
      let updatedCustRecord: UdharCustomer;

      if (existingCust) {
        const newCredit = Number((existingCust.total_credit + saleData.udhar_amount).toFixed(2));
        const newBalance = Number((existingCust.current_balance + saleData.udhar_amount).toFixed(2));
        updatedCustRecord = {
          ...existingCust,
          phone: (existingCust.phone && existingCust.phone !== 'N/A') ? existingCust.phone : (cleanCustomerPhone || 'N/A'),
          total_credit: newCredit,
          current_balance: newBalance,
          last_transaction_date: todayFormatted,
          status: 'Active'
        };
        setCustomers(prev => prev.map(c => c.id === existingCust.id ? updatedCustRecord : c));
      } else {
        updatedCustRecord = {
          id: targetCustId,
          name: cleanCustomerName,
          phone: cleanCustomerPhone || 'N/A',
          total_credit: saleData.udhar_amount,
          total_paid: 0,
          current_balance: saleData.udhar_amount,
          status: 'Active',
          last_transaction_date: todayFormatted,
          created_at: new Date().toISOString()
        };
        setCustomers(prev => [updatedCustRecord, ...prev]);
      }

      const newTx: UdharTransaction = {
        id: generateUUID(),
        customer_id: targetCustId,
        type: 'Credit_Given',
        amount: saleData.udhar_amount,
        payment_mode: 'Cash',
        notes: `पावती #${invoiceNo} (उधार विक्री)`,
        transaction_date: todayFormatted,
        created_at: new Date().toISOString()
      };
      setUdharTransactions(prev => [newTx, ...prev]);

      if (supabase) {
        (async () => {
          try {
            if (isNewCustomer) {
              await supabase.from('udhar_customers').insert([{
                id: updatedCustRecord.id,
                name: updatedCustRecord.name,
                phone: updatedCustRecord.phone,
                total_credit: updatedCustRecord.total_credit,
                total_paid: updatedCustRecord.total_paid,
                current_balance: updatedCustRecord.current_balance,
                status: updatedCustRecord.status,
                last_transaction_date: updatedCustRecord.last_transaction_date,
                created_at: updatedCustRecord.created_at
              }]);
            } else {
              await supabase.from('udhar_customers').update({
                total_credit: updatedCustRecord.total_credit,
                current_balance: updatedCustRecord.current_balance,
                phone: updatedCustRecord.phone,
                status: 'Active',
                last_transaction_date: todayFormatted
              }).eq('id', targetCustId);
            }
            await supabase.from('udhar_transactions').insert([newTx]);
            broadcastMutation('udhar', 'credit');
          } catch (e) {
            console.error('Udhar async sync notice:', e);
          }
        })();
      }
    }

    setSales(prev => [newSale, ...prev]);
    setCurrentReceipt(newSale);

    // 4. Centralized Supabase Persistence (Single Source of Truth)
    if (supabase) {
      try {
        const saleInsertPayload: Record<string, any> = {
          id: newSale.id,
          invoice_no: newSale.invoice_no,
          customer_name: newSale.customer_name,
          customer_phone: newSale.customer_phone || null,
          customer_gender: newSale.customer_gender || null,
          customer_age_group: newSale.customer_age_group || null,
          total_amount: newSale.total_amount,
          discount: newSale.discount,
          net_amount: newSale.net_amount,
          payment_mode: newSale.payment_mode,
          cash_amount: newSale.cash_amount,
          online_amount: newSale.online_amount,
          udhar_amount: newSale.udhar_amount,
          sale_date: newSale.sale_date,
          created_by_name: newSale.created_by_name,
          created_by_email: newSale.created_by_email,
          created_by_role: newSale.created_by_role,
          admin_slot: newSale.admin_slot,
          counter_name: newSale.counter_name
        };
        if (newSale.customer_age !== undefined && newSale.customer_age !== null) {
          saleInsertPayload.customer_age = newSale.customer_age;
        }

        const { error: saleErr } = await supabase.from('sales').insert([saleInsertPayload]);

        if (!saleErr) {
          // Insert line items
          const { error: itemsErr } = await supabase.from('sale_items').insert(saleItems.map(si => ({
            id: si.id,
            sale_id: newSale.id,
            product_id: (si.product_id && si.product_id.length === 36 && !si.product_id.startsWith('item-') && !si.product_id.startsWith('prod-')) ? si.product_id : null,
            product_name: si.product_name,
            quantity: si.quantity,
            unit: si.unit,
            unit_price: si.unit_price,
            purchase_cost: si.purchase_cost || 0,
            total_price: si.total_price
          })));

          if (itemsErr) {
            console.error('Failed to insert sale_items to Supabase:', itemsErr);
          }

          // Synchronize stock deduction directly in Central Database
          for (const item of saleData.items) {
            const currentProd = products.find(p => p.id === item.product_id);
            if (currentProd) {
              const updatedStock = Math.max(0, Number((currentProd.stock_quantity - item.quantity).toFixed(2)));
              await supabase.from('products').update({
                stock_quantity: updatedStock,
                updated_at: new Date().toISOString()
              }).eq('id', item.product_id);
            }
          }

          // Synchronize batch deductions directly in Central Database
          for (const bd of batchDeductionsToSync) {
            await supabase.from('batches').update({
              qty_remaining: bd.qty_remaining,
              updated_at: new Date().toISOString()
            }).eq('id', bd.id);
          }

          // Broadcast to Device 2
          broadcastMutation('sales', 'create');
        } else {
          console.error('Error saving sale to Supabase:', saleErr);
        }
      } catch (err) {
        console.error('Error saving sale to Supabase:', err);
      }
    }

    const itemsSummary = saleData.items.map(it => `${it.product_name} (${it.quantity} ${it.unit})`).join(', ');
    logAdminActivity({
      admin_name: createdByName,
      admin_email: createdByEmail,
      admin_role: createdByRole,
      admin_slot: adminSlot,
      counter_name: counterName,
      action_type: 'SALE_CREATED',
      title: `पावती विक्री: #${invoiceNo}`,
      details: `वस्तू: ${itemsSummary} | पद्धत: ${saleData.payment_mode} | निव्वळ रक्कम: ₹${saleData.net_amount}`,
      amount: saleData.net_amount,
      reference_id: invoiceNo,
      reference_table: 'sales'
    });

    return newSale;
  };

  const createPurchase = async (purchaseData: Omit<Purchase, 'id' | 'created_at'>) => {
    const todayFormatted = new Date().toISOString().split('T')[0];
    const targetProd = products.find(p => p.id === purchaseData.product_id);
    const shelfDays = targetProd ? getShelfLifeDays(targetProd.category, targetProd.name) : 2;
    const batchNo = purchaseData.batch_no || generateBatchNumber(purchaseData.product_name, purchaseData.purchase_date || todayFormatted);
    const expiryDate = purchaseData.expiry_date || getSuggestedExpiryDate(purchaseData.purchase_date || todayFormatted, shelfDays);

    const purchaseId = generateUUID();
    const batchId = generateUUID();

    const newPur: Purchase = {
      ...purchaseData,
      id: purchaseId,
      batch_no: batchNo,
      expiry_date: expiryDate,
      created_at: new Date().toISOString()
    };

    // Auto-create batch with variety-specific shelf life
    const newBatch: ProductBatch = {
      id: batchId,
      product_id: purchaseData.product_id,
      product_name: purchaseData.product_name,
      batch_no: batchNo,
      mfg_date: purchaseData.purchase_date || todayFormatted,
      expiry_date: expiryDate,
      qty_received: purchaseData.quantity,
      qty_remaining: purchaseData.quantity,
      purchase_price: purchaseData.purchase_price,
      supplier_name: purchaseData.supplier_name || 'Standard Dairy Supplier',
      notes: purchaseData.notes,
      created_at: new Date().toISOString()
    };
    setBatches(prev => [newBatch, ...prev]);

    // Auto-increase product stock
    let finalProdStock = 0;
    setProducts(prev => {
      return prev.map(p => {
        if (p.id === purchaseData.product_id) {
          finalProdStock = Number((p.stock_quantity + purchaseData.quantity).toFixed(2));
          return {
            ...p,
            stock_quantity: finalProdStock,
            purchase_price: purchaseData.purchase_price || p.purchase_price
          };
        }
        return p;
      });
    });

    setPurchases(prev => [newPur, ...prev]);

    if (supabase) {
      try {
        await supabase.from('purchases').insert([{
          id: newPur.id,
          product_id: newPur.product_id,
          product_name: newPur.product_name,
          supplier_name: newPur.supplier_name || 'Standard Dairy Supplier',
          quantity: newPur.quantity,
          unit: newPur.unit,
          purchase_price: newPur.purchase_price,
          total_amount: newPur.total_amount,
          payment_mode: newPur.payment_mode || 'Cash',
          purchase_date: newPur.purchase_date,
          invoice_number: newPur.invoice_number || null,
          batch_no: newPur.batch_no || null,
          expiry_date: newPur.expiry_date || null,
          notes: newPur.notes || null
        }]);

        await supabase.from('batches').insert([{
          id: newBatch.id,
          product_id: newBatch.product_id,
          batch_no: newBatch.batch_no,
          mfg_date: newBatch.mfg_date,
          expiry_date: newBatch.expiry_date,
          qty_received: newBatch.qty_received,
          qty_remaining: newBatch.qty_remaining,
          purchase_price: newBatch.purchase_price,
          selling_price: targetProd?.selling_price || 0,
          supplier_name: newBatch.supplier_name,
          notes: newBatch.notes,
          status: 'ACTIVE'
        }]);

        if (finalProdStock > 0) {
          await supabase.from('products').update({
            stock_quantity: finalProdStock,
            purchase_price: purchaseData.purchase_price,
            updated_at: new Date().toISOString()
          }).eq('id', purchaseData.product_id);
        }

        broadcastMutation('purchases', 'create');
      } catch (err) {
        console.error('Failed to sync purchase to Supabase', err);
      }
    }
  };

  const recordDamage = async (damageData: Omit<DamageRecord, 'id' | 'created_at'>) => {
    const damageId = generateUUID();
    const newDmg: DamageRecord = {
      ...damageData,
      id: damageId,
      created_at: new Date().toISOString()
    };

    const batchesToUpdateInDb: Array<{ id: string; qty_remaining: number }> = [];

    // Deduct from batches: if an expired batch exists for this product, deduct from it first!
    setBatches(prev => {
      let remainingDeduct = damageData.quantity;
      const prodBatches = prev
        .filter(b => b.product_id === damageData.product_id && b.qty_remaining > 0)
        // Sort expired first, then earliest expiry
        .sort((a, b) => {
          const aExp = computeExpiryStatus(a.expiry_date).status === 'EXPIRED';
          const bExp = computeExpiryStatus(b.expiry_date).status === 'EXPIRED';
          if (aExp && !bExp) return -1;
          if (!aExp && bExp) return 1;
          return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
        });

      return prev.map(b => {
        if (b.product_id !== damageData.product_id || b.qty_remaining <= 0 || remainingDeduct <= 0) return b;
        if (prodBatches.some(pb => pb.id === b.id)) {
          const deduct = Math.min(b.qty_remaining, remainingDeduct);
          remainingDeduct -= deduct;
          const newQty = Number((b.qty_remaining - deduct).toFixed(2));
          batchesToUpdateInDb.push({ id: b.id, qty_remaining: newQty });
          return {
            ...b,
            qty_remaining: newQty
          };
        }
        return b;
      });
    });

    // Deduct stock
    let finalProdStock = 0;
    setProducts(prev => {
      return prev.map(p => {
        if (p.id === damageData.product_id) {
          finalProdStock = Math.max(0, Number((p.stock_quantity - damageData.quantity).toFixed(2)));
          return {
            ...p,
            stock_quantity: finalProdStock
          };
        }
        return p;
      });
    });

    setDamages(prev => [newDmg, ...prev]);

    if (supabase) {
      try {
        await supabase.from('damage_records').insert([{
          id: newDmg.id,
          product_id: newDmg.product_id,
          product_name: newDmg.product_name,
          quantity: newDmg.quantity,
          unit: newDmg.unit,
          estimated_loss_amount: newDmg.estimated_loss_amount || 0,
          reason: newDmg.reason,
          damage_date: newDmg.damage_date,
          notes: newDmg.notes || null
        }]);

        await supabase.from('products').update({
          stock_quantity: finalProdStock,
          updated_at: new Date().toISOString()
        }).eq('id', damageData.product_id);

        for (const bd of batchesToUpdateInDb) {
          await supabase.from('batches').update({
            qty_remaining: bd.qty_remaining,
            updated_at: new Date().toISOString()
          }).eq('id', bd.id);
        }

        broadcastMutation('damages', 'record');
      } catch (err) {
        console.error('Failed to sync damage to Supabase', err);
      }
    }

    const admin = getActiveAdminInfo();
    logAdminActivity({
      admin_name: admin.name,
      admin_email: admin.email,
      admin_role: admin.role,
      admin_slot: admin.slot,
      counter_name: admin.counter,
      action_type: 'DAMAGE_RECORDED',
      title: `खराब माल नोंद: ${damageData.product_name}`,
      details: `कारण: ${damageData.reason} | प्रमाण: ${damageData.quantity} ${damageData.unit} | अंदाजे तोटा: ₹${damageData.estimated_loss_amount}`,
      amount: damageData.estimated_loss_amount,
      reference_id: damageData.product_id,
      reference_table: 'damage_records'
    });
  };

  const addUdharCustomer = async (custData: {
    name: string;
    phone: string;
    address?: string;
    notes?: string;
  }): Promise<UdharCustomer> => {
    const newCust: UdharCustomer = {
      ...custData,
      id: generateUUID(),
      total_credit: 0,
      total_paid: 0,
      current_balance: 0,
      status: 'Active',
      last_transaction_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    setCustomers(prev => [newCust, ...prev]);

    if (supabase) {
      try {
        await supabase.from('udhar_customers').insert([newCust]);
        broadcastMutation('customers', 'add');
      } catch (err) {
        console.error('Failed to sync udhar customer to Supabase', err);
      }
    }

    return newCust;
  };

  const recordUdharPayment = async (
    customerId: string, 
    amount: number, 
    paymentMode: 'Cash' | 'Online_UPI', 
    notes?: string
  ) => {
    const todayFormatted = new Date().toISOString().split('T')[0];
    let updatedCustomer: UdharCustomer | undefined;

    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        const newPaid = c.total_paid + amount;
        const newBalance = Math.max(0, c.current_balance - amount);
        updatedCustomer = {
          ...c,
          total_paid: newPaid,
          current_balance: newBalance,
          status: newBalance <= 0 ? 'Cleared' : 'Active',
          last_transaction_date: todayFormatted
        };
        return updatedCustomer;
      }
      return c;
    }));

    const newTx: UdharTransaction = {
      id: generateUUID(),
      customer_id: customerId,
      type: 'Payment_Received',
      amount,
      payment_mode: paymentMode,
      notes: notes || 'Jama payment received',
      transaction_date: todayFormatted,
      created_at: new Date().toISOString()
    };

    setUdharTransactions(prev => [newTx, ...prev]);

    if (supabase) {
      try {
        if (updatedCustomer) {
          await supabase.from('udhar_customers').update({
            total_paid: updatedCustomer.total_paid,
            current_balance: updatedCustomer.current_balance,
            status: updatedCustomer.status,
            last_transaction_date: todayFormatted
          }).eq('id', customerId);
        }
        await supabase.from('udhar_transactions').insert([newTx]);
        broadcastMutation('udhar', 'payment');
      } catch (err) {
        console.error('Failed to sync udhar payment to Supabase', err);
      }
    }

    const admin = getActiveAdminInfo();
    const cust = customers.find(c => c.id === customerId);
    logAdminActivity({
      admin_name: admin.name,
      admin_email: admin.email,
      admin_role: admin.role,
      admin_slot: admin.slot,
      counter_name: admin.counter,
      action_type: 'UDHAR_PAYMENT',
      title: `उधारी वसुली जमा: ₹${amount}`,
      details: `ग्राहक: ${cust?.name || customerId} | पेमेंट: ${paymentMode} | उर्वरित बाकी: ₹${Math.max(0, (cust?.current_balance || 0) - amount)}`,
      amount,
      reference_id: customerId,
      reference_table: 'udhar_customers'
    });
  };

  const addExpense = async (expenseData: Omit<Expense, 'id' | 'created_at'>) => {
    const newExp: Expense = {
      ...expenseData,
      id: generateUUID(),
      created_at: new Date().toISOString()
    };

    setExpenses(prev => [newExp, ...prev]);

    if (supabase) {
      try {
        await supabase.from('expenses').insert([{
          id: newExp.id,
          title: newExp.title,
          category: newExp.category,
          amount: newExp.amount,
          payment_mode: newExp.payment_mode || 'Cash',
          expense_date: newExp.expense_date,
          is_capital_investment: newExp.is_capital_investment || false,
          notes: newExp.notes || null
        }]);
        broadcastMutation('expenses', 'add');
      } catch (err) {
        console.error('Failed to sync expense to Supabase', err);
      }
    }

    const admin = getActiveAdminInfo();
    logAdminActivity({
      admin_name: admin.name,
      admin_email: admin.email,
      admin_role: admin.role,
      admin_slot: admin.slot,
      counter_name: admin.counter,
      action_type: 'EXPENSE_ADDED',
      title: `खर्च नोंद: ${expenseData.title}`,
      details: `प्रवर्ग: ${expenseData.category} | पद्धत: ${expenseData.payment_mode} | रक्कम: ₹${expenseData.amount}`,
      amount: expenseData.amount,
      reference_table: 'expenses'
    });
  };

  const deleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    if (supabase) {
      try {
        await supabase.from('expenses').delete().eq('id', id);
        broadcastMutation('expenses', 'delete');
      } catch (err) {
        console.error('Failed to delete expense in Supabase', err);
      }
    }
  };

  // Delete Sale Completely (e.g. Full Return or Admin Cancellation)
  const deleteSale = async (saleId: string): Promise<void> => {
    const target = sales.find(s => s.id === saleId);
    if (!target) return;

    setSales(prev => prev.filter(s => s.id !== saleId));

    if (supabase) {
      try {
        await supabase.from('sale_items').delete().eq('sale_id', saleId);
        await supabase.from('sales').delete().eq('id', saleId);
        broadcastMutation('sales', 'delete');
      } catch (err) {
        console.error('Failed to delete sale from Supabase:', err);
      }
    }

    const admin = getActiveAdminInfo();
    logAdminActivity({
      admin_name: admin.name,
      admin_email: admin.email,
      admin_role: admin.role,
      admin_slot: admin.slot,
      counter_name: admin.counter,
      action_type: 'SALE_DELETED',
      title: `पावती हटवली: #${target.invoice_no}`,
      details: `ग्राहक: ${target.customer_name} | रक्कम: ₹${target.net_amount}`,
      amount: target.net_amount,
      reference_id: target.invoice_no,
      reference_table: 'sales'
    });
  };

  // Comprehensive Customer Return (Full Return with Sale Deletion OR Partial Return with Sale Cut & Item Updates)
  const processSaleReturn = async (payload: {
    sale_id?: string;
    invoice_no?: string;
    customer_name?: string;
    customer_phone?: string;
    refund_mode: RefundMode;
    reason: ReturnReason;
    condition: ReturnCondition;
    notes?: string;
    return_date?: string;
    items: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit: string;
      unit_price: number;
      refund_amount: number;
    }>;
  }): Promise<ProductReturn[]> => {
    const validItems = payload.items.filter(i => i.quantity > 0);
    if (validItems.length === 0) {
      throw new Error('किमान एका वस्तूचे परतावा प्रमाण निवडा (Please specify return quantity for at least one item)');
    }

    const todayFormatted = payload.return_date || new Date().toISOString().split('T')[0];
    const todayCompact = todayFormatted.replace(/-/g, '');
    const adminInfo = getActiveAdminInfo();

    // 1. Locate Target Sale (by sale_id or invoice_no)
    const targetSale = sales.find(s => 
      (payload.sale_id && s.id === payload.sale_id) || 
      (payload.invoice_no && s.invoice_no.trim().toLowerCase() === payload.invoice_no.trim().toLowerCase())
    );

    const invoiceNo = targetSale?.invoice_no || payload.invoice_no;
    const customerName = payload.customer_name || targetSale?.customer_name || 'थेट ग्राहक';
    const customerPhone = payload.customer_phone || targetSale?.customer_phone || '';
    const totalRefundAmount = Number(validItems.reduce((acc, i) => acc + i.refund_amount, 0).toFixed(2));

    // 2. Assess if this is Full Return (all items returned) vs Partial Return (some items kept)
    let isFullReturn = false;
    let remainingItems: SaleItem[] = [];
    let updatedTotalAmount = 0;
    let updatedDiscount = 0;
    let updatedNetAmount = 0;
    let updatedCash = 0;
    let updatedOnline = 0;
    let updatedUdhar = 0;

    const returnQtyMap = new Map<string, number>();
    validItems.forEach(i => {
      returnQtyMap.set(i.product_id, (returnQtyMap.get(i.product_id) || 0) + i.quantity);
    });

    if (targetSale) {
      let allItemsReturned = true;

      targetSale.items.forEach(saleItem => {
        const retQty = returnQtyMap.get(saleItem.product_id) || 0;
        const remQty = Math.max(0, Number((saleItem.quantity - retQty).toFixed(2)));
        if (remQty > 0) {
          allItemsReturned = false;
          remainingItems.push({
            ...saleItem,
            quantity: remQty,
            total_price: Number((remQty * saleItem.unit_price).toFixed(2))
          });
        }
      });

      isFullReturn = allItemsReturned || remainingItems.length === 0;

      if (!isFullReturn) {
        updatedTotalAmount = Number(remainingItems.reduce((acc, i) => acc + i.total_price, 0).toFixed(2));
        const discountRatio = targetSale.total_amount > 0 ? (updatedTotalAmount / targetSale.total_amount) : 1;
        updatedDiscount = Number((targetSale.discount * discountRatio).toFixed(2));
        updatedNetAmount = Math.max(0, Number((updatedTotalAmount - updatedDiscount).toFixed(2)));

        // Proportionately adjust payment breakdown
        if (targetSale.payment_mode === 'Cash') {
          updatedCash = updatedNetAmount;
        } else if (targetSale.payment_mode === 'Online_UPI') {
          updatedOnline = updatedNetAmount;
        } else if (targetSale.payment_mode === 'Udhar') {
          updatedUdhar = updatedNetAmount;
        } else {
          // Split
          const refundDiff = Math.max(0, targetSale.net_amount - updatedNetAmount);
          if (targetSale.cash_amount >= refundDiff) {
            updatedCash = targetSale.cash_amount - refundDiff;
            updatedOnline = targetSale.online_amount;
          } else {
            updatedCash = 0;
            updatedOnline = Math.max(0, targetSale.online_amount - (refundDiff - targetSale.cash_amount));
          }
        }
      }
    }

    const returnTypeStr = targetSale ? (isFullReturn ? 'Full' : 'Partial') : 'Direct';

    // 3. Generate ProductReturn records for each returned item
    const createdReturns: ProductReturn[] = [];
    let todayReturnCount = returns.filter(r => r.return_date === todayFormatted).length;

    for (const item of validItems) {
      todayReturnCount += 1;
      const returnNo = `RET-${todayCompact}-${String(todayReturnCount).padStart(3, '0')}`;
      const newReturn: ProductReturn = {
        id: generateUUID(),
        return_no: returnNo,
        sale_id: targetSale?.id,
        invoice_no: invoiceNo,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        refund_amount: item.refund_amount,
        refund_mode: payload.refund_mode,
        reason: payload.reason,
        condition: payload.condition,
        customer_name: customerName,
        customer_phone: customerPhone,
        notes: payload.notes ? `[${returnTypeStr} Return] ${payload.notes}` : `[${returnTypeStr} Return]`,
        return_date: todayFormatted,
        created_at: new Date().toISOString()
      };
      createdReturns.push(newReturn);
    }

    setReturns(prev => [...createdReturns, ...prev]);

    // 4. Stock Handling: Restock (Resellable) or Record in Damages (Damaged_Waste)
    for (const retItem of validItems) {
      if (payload.condition === 'Resellable') {
        let finalStock = 0;
        setProducts(prev => prev.map(p => {
          if (p.id === retItem.product_id) {
            finalStock = Number((p.stock_quantity + retItem.quantity).toFixed(2));
            return { ...p, stock_quantity: finalStock };
          }
          return p;
        }));

        let batchIdToUpdate: string | null = null;
        let batchNewQty = 0;
        setBatches(prev => {
          let updated = false;
          return prev.map(b => {
            if (!updated && b.product_id === retItem.product_id) {
              updated = true;
              batchIdToUpdate = b.id;
              batchNewQty = Number((b.qty_remaining + retItem.quantity).toFixed(2));
              return { ...b, qty_remaining: batchNewQty };
            }
            return b;
          });
        });

        if (supabase) {
          (async () => {
            try {
              if (finalStock > 0) {
                await supabase.from('products').update({ stock_quantity: finalStock }).eq('id', retItem.product_id);
              }
              if (batchIdToUpdate) {
                await supabase.from('batches').update({ qty_remaining: batchNewQty }).eq('id', batchIdToUpdate);
              }
            } catch (e) {
              console.warn('Restock sync notice:', e);
            }
          })();
        }
      } else {
        // Damaged Waste: record loss in damages table
        const autoDamage: DamageRecord = {
          id: generateUUID(),
          product_id: retItem.product_id,
          product_name: retItem.product_name,
          quantity: retItem.quantity,
          unit: retItem.unit,
          estimated_loss_amount: retItem.refund_amount,
          reason: 'Customer Return Defective',
          damage_date: todayFormatted,
          notes: `Customer Return #${createdReturns[0]?.return_no} (${invoiceNo || 'No Invoice'}): ${payload.reason}`,
          created_at: new Date().toISOString()
        };
        setDamages(prev => [autoDamage, ...prev]);

        if (supabase) {
          (async () => {
            try {
              await supabase.from('damage_records').insert([autoDamage]);
            } catch (e) {
              console.warn('Damage sync notice:', e);
            }
          })();
        }
      }
    }

    // 5. Udhar Customer Balance Adjustment (if Udhar sale or Udhar refund mode)
    const isUdharAdjustment = payload.refund_mode === 'Udhar_Credit' || (targetSale && targetSale.payment_mode === 'Udhar');
    if (isUdharAdjustment && (customerName || customerPhone)) {
      setCustomers(prev => prev.map(c => {
        const matches = (customerPhone && c.phone === customerPhone) || (customerName && c.name.toLowerCase() === customerName.toLowerCase());
        if (matches) {
          const updatedBal = Math.max(0, Number((c.current_balance - totalRefundAmount).toFixed(2)));
          return {
            ...c,
            current_balance: updatedBal,
            last_transaction_date: todayFormatted
          };
        }
        return c;
      }));

      const matchedCust = customers.find(c => 
        (customerPhone && c.phone === customerPhone) || 
        (customerName && c.name.toLowerCase() === customerName.toLowerCase())
      );

      if (matchedCust) {
        const udharTx: UdharTransaction = {
          id: generateUUID(),
          customer_id: matchedCust.id,
          type: 'Payment_Received',
          amount: totalRefundAmount,
          payment_mode: 'Cash',
          notes: `माल परतावा उधारी वजावट (${createdReturns[0]?.return_no}): ${invoiceNo ? 'पावती #' + invoiceNo : ''}`,
          transaction_date: todayFormatted,
          created_at: new Date().toISOString()
        };
        setUdharTransactions(prev => [udharTx, ...prev]);

        if (supabase) {
          (async () => {
            try {
              await supabase.from('udhar_transactions').insert([udharTx]);
              await supabase.from('udhar_customers').update({
                current_balance: Math.max(0, matchedCust.current_balance - totalRefundAmount),
                last_transaction_date: todayFormatted
              }).eq('id', matchedCust.id);
            } catch (e) {
              console.warn('Udhar return sync notice:', e);
            }
          })();
        }
      }
    }

    // 6. Handle Original Sale: Full Return (Delete Sale) vs Partial Return (Cut/Update Sale)
    if (targetSale) {
      if (isFullReturn) {
        // FULL RETURN: Delete sale completely from sales state and database!
        setSales(prev => prev.filter(s => s.id !== targetSale.id));

        if (supabase) {
          (async () => {
            try {
              await supabase.from('sale_items').delete().eq('sale_id', targetSale.id);
              await supabase.from('sales').delete().eq('id', targetSale.id);
              broadcastMutation('sales', 'delete');
            } catch (e) {
              console.error('Failed to delete full returned sale in Supabase:', e);
            }
          })();
        }

        logAdminActivity({
          admin_name: adminInfo.name,
          admin_email: adminInfo.email,
          admin_role: adminInfo.role,
          admin_slot: adminInfo.slot,
          counter_name: adminInfo.counter,
          action_type: 'CUSTOMER_FULL_RETURN',
          title: `ग्राहक संपूर्ण पावती परतावा: #${targetSale.invoice_no}`,
          details: `ग्राहक: ${customerName} | सर्व वस्तू परत | मूळ पावती हटवली | एकूण परतावा: ₹${totalRefundAmount} (${payload.refund_mode})`,
          amount: totalRefundAmount,
          reference_id: targetSale.invoice_no,
          reference_table: 'product_returns'
        });
      } else {
        // PARTIAL RETURN: Update sale with remaining items and reduced totals!
        const updatedSale: Sale = {
          ...targetSale,
          items: remainingItems,
          total_amount: updatedTotalAmount,
          discount: updatedDiscount,
          net_amount: updatedNetAmount,
          cash_amount: updatedCash,
          online_amount: updatedOnline,
          udhar_amount: updatedUdhar,
        };

        setSales(prev => prev.map(s => s.id === targetSale.id ? updatedSale : s));

        if (supabase) {
          (async () => {
            try {
              await supabase.from('sales').update({
                total_amount: updatedTotalAmount,
                discount: updatedDiscount,
                net_amount: updatedNetAmount,
                cash_amount: updatedCash,
                online_amount: updatedOnline,
                udhar_amount: updatedUdhar,
              }).eq('id', targetSale.id);

              // Delete items that were completely returned
              const remainingProductIds = remainingItems.map(i => i.product_id);
              const itemsToDelete = targetSale.items.filter(i => !remainingProductIds.includes(i.product_id));
              for (const delItem of itemsToDelete) {
                await supabase.from('sale_items').delete().eq('sale_id', targetSale.id).eq('product_id', delItem.product_id);
              }

              // Update quantity and total of remaining items
              for (const remItem of remainingItems) {
                const { error: updErr } = await supabase.from('sale_items').update({
                  quantity: remItem.quantity,
                  total_price: remItem.total_price
                }).eq('sale_id', targetSale.id).eq('product_id', remItem.product_id);

                if (updErr && remItem.id) {
                  await supabase.from('sale_items').update({
                    quantity: remItem.quantity,
                    total_price: remItem.total_price
                  }).eq('id', remItem.id);
                }
              }

              broadcastMutation('sales', 'update');
            } catch (e) {
              console.error('Failed to update partially returned sale in Supabase:', e);
            }
          })();
        }

        logAdminActivity({
          admin_name: adminInfo.name,
          admin_email: adminInfo.email,
          admin_role: adminInfo.role,
          admin_slot: adminInfo.slot,
          counter_name: adminInfo.counter,
          action_type: 'CUSTOMER_PARTIAL_RETURN',
          title: `ग्राहक आंशिक पावती परतावा: #${targetSale.invoice_no}`,
          details: `ग्राहक: ${customerName} | परतावा: ₹${totalRefundAmount} | सुधारित पावती रक्कम: ₹${updatedNetAmount} (${remainingItems.length} वस्तू शिल्लक)`,
          amount: totalRefundAmount,
          reference_id: targetSale.invoice_no,
          reference_table: 'sales'
        });
      }
    } else {
      // Standalone return without invoice
      logAdminActivity({
        admin_name: adminInfo.name,
        admin_email: adminInfo.email,
        admin_role: adminInfo.role,
        admin_slot: adminInfo.slot,
        counter_name: adminInfo.counter,
        action_type: 'CUSTOMER_RETURN',
        title: `ग्राहक थेट परतावा (${createdReturns.length} वस्तू)`,
        details: `एकूण परतावा रक्कम: ₹${totalRefundAmount} (${payload.refund_mode}) | कारण: ${payload.reason}`,
        amount: totalRefundAmount,
        reference_id: createdReturns[0]?.return_no,
        reference_table: 'product_returns'
      });
    }

    // 7. Sync product_returns to Supabase
    if (supabase) {
      try {
        const insertRows = createdReturns.map(r => ({
          id: r.id,
          return_no: r.return_no,
          sale_id: r.sale_id || null,
          invoice_no: r.invoice_no || null,
          product_id: r.product_id,
          product_name: r.product_name,
          quantity: r.quantity,
          unit: r.unit,
          unit_price: r.unit_price,
          refund_amount: r.refund_amount,
          refund_mode: r.refund_mode,
          reason: r.reason,
          condition: r.condition,
          customer_name: r.customer_name || null,
          customer_phone: r.customer_phone || null,
          notes: r.notes || null,
          return_date: r.return_date,
          admin_name: adminInfo.name,
          admin_email: adminInfo.email,
          counter_name: adminInfo.counter
        }));
        await supabase.from('product_returns').insert(insertRows);
        broadcastMutation('returns', 'create');
      } catch (err) {
        console.error('Failed to sync returns to Supabase:', err);
      }
    }

    return createdReturns;
  };

  // Legacy wrapper for single-item return
  const createReturn = async (returnData: Omit<ProductReturn, 'id' | 'return_no' | 'created_at'>): Promise<ProductReturn> => {
    const res = await processSaleReturn({
      sale_id: returnData.sale_id,
      invoice_no: returnData.invoice_no,
      customer_name: returnData.customer_name,
      customer_phone: returnData.customer_phone,
      refund_mode: returnData.refund_mode,
      reason: returnData.reason,
      condition: returnData.condition,
      notes: returnData.notes,
      return_date: returnData.return_date,
      items: [{
        product_id: returnData.product_id,
        product_name: returnData.product_name,
        quantity: returnData.quantity,
        unit: returnData.unit,
        unit_price: returnData.unit_price,
        refund_amount: returnData.refund_amount
      }]
    });
    return res[0];
  };

  const deleteReturn = async (id: string) => {
    setReturns(prev => prev.filter(r => r.id !== id));
    if (supabase) {
      try {
        await supabase.from('product_returns').delete().eq('id', id);
        broadcastMutation('returns', 'delete');
      } catch (err) {
        console.error('Failed to delete return from Supabase', err);
      }
    }
  };

  // Supplier Returns (खरेदी व सप्लायर परतावा - खराब/एक्सपायर माल परत करणे)
  const createSupplierReturn = async (returnData: Omit<SupplierReturn, 'id' | 'return_no' | 'created_at'>): Promise<SupplierReturn> => {
    const returnNo = `VRET-${new Date().getFullYear()}-${String(supplierReturns.length + 1).padStart(4, '0')}`;
    const returnId = generateUUID();
    const newReturn: SupplierReturn = {
      ...returnData,
      id: returnId,
      return_no: returnNo,
      created_at: new Date().toISOString()
    };

    setSupplierReturns(prev => [newReturn, ...prev]);

    // 1. Defective / expired goods returned to supplier: deduct from product stock
    let updatedProductStock = 0;
    setProducts(prev => prev.map(p => {
      if (p.id === returnData.product_id) {
        if (returnData.refund_status === 'Replacement_Received') {
          return p;
        }
        updatedProductStock = Math.max(0, Number((p.stock_quantity - returnData.quantity).toFixed(2)));
        return {
          ...p,
          stock_quantity: updatedProductStock
        };
      }
      return p;
    }));

    // 2. Batch stock deduction
    let replBatch: ProductBatch | null = null;
    if (returnData.refund_status === 'Replacement_Received') {
      const todayFormatted = new Date().toISOString().split('T')[0];
      const targetProd = products.find(p => p.id === returnData.product_id);
      const shelfDays = targetProd ? getShelfLifeDays(targetProd.category, targetProd.name) : 3;
      replBatch = {
        id: generateUUID(),
        product_id: returnData.product_id,
        product_name: returnData.product_name,
        batch_no: `REPL-${Date.now().toString().slice(-4)}`,
        mfg_date: todayFormatted,
        expiry_date: getSuggestedExpiryDate(todayFormatted, shelfDays),
        qty_received: returnData.quantity,
        qty_remaining: returnData.quantity,
        purchase_price: returnData.purchase_price,
        supplier_name: returnData.supplier_name,
        notes: `Replacement received for supplier return ${returnNo}`,
        created_at: new Date().toISOString()
      };
    }

    const batchUpdatesToSync: Array<{ id: string; qty_remaining: number }> = [];

    setBatches(prev => {
      if (replBatch) {
        return [replBatch, ...prev];
      }

      let remainingToDeduct = returnData.quantity;
      return prev.map(b => {
        if (remainingToDeduct <= 0) return b;
        const isTarget = returnData.batch_no 
          ? (b.batch_no === returnData.batch_no || b.id === returnData.batch_no) 
          : (b.product_id === returnData.product_id && b.qty_remaining > 0);
        
        if (isTarget) {
          const deductAmt = Math.min(b.qty_remaining, remainingToDeduct);
          remainingToDeduct -= deductAmt;
          const newQty = Number((b.qty_remaining - deductAmt).toFixed(2));
          batchUpdatesToSync.push({ id: b.id, qty_remaining: newQty });
          return {
            ...b,
            qty_remaining: newQty
          };
        }
        return b;
      });
    });

    // 3. Centralized Supabase sync
    if (supabase) {
      try {
        await supabase.from('supplier_returns').insert([{
          id: newReturn.id,
          return_no: newReturn.return_no,
          supplier_name: newReturn.supplier_name,
          product_id: newReturn.product_id,
          product_name: newReturn.product_name,
          batch_no: newReturn.batch_no || null,
          purchase_id: newReturn.purchase_id || null,
          quantity: newReturn.quantity,
          unit: newReturn.unit,
          purchase_price: newReturn.purchase_price,
          total_refund_amount: newReturn.total_refund_amount,
          reason: newReturn.reason,
          refund_status: newReturn.refund_status,
          refund_mode: newReturn.refund_mode || null,
          return_date: newReturn.return_date,
          notes: newReturn.notes || null
        }]);

        if (returnData.refund_status !== 'Replacement_Received' && updatedProductStock > 0) {
          await supabase.from('products').update({
            stock_quantity: updatedProductStock,
            updated_at: new Date().toISOString()
          }).eq('id', returnData.product_id);
        }

        if (replBatch) {
          const batchToInsert: ProductBatch = replBatch;
          await supabase.from('batches').insert([{
            id: batchToInsert.id,
            product_id: batchToInsert.product_id,
            batch_no: batchToInsert.batch_no,
            mfg_date: batchToInsert.mfg_date,
            expiry_date: batchToInsert.expiry_date,
            qty_received: batchToInsert.qty_received,
            qty_remaining: batchToInsert.qty_remaining,
            purchase_price: batchToInsert.purchase_price,
            selling_price: 0,
            supplier_name: batchToInsert.supplier_name,
            notes: batchToInsert.notes,
            status: 'ACTIVE'
          }]);
        }

        for (const bu of batchUpdatesToSync) {
          await supabase.from('batches').update({
            qty_remaining: bu.qty_remaining,
            updated_at: new Date().toISOString()
          }).eq('id', bu.id);
        }

        broadcastMutation('supplier_returns', 'create');
      } catch (err) {
        console.error('Failed to sync supplier return to Supabase', err);
      }
    }

    const admin = getActiveAdminInfo();
    logAdminActivity({
      admin_name: admin.name,
      admin_email: admin.email,
      admin_role: admin.role,
      admin_slot: admin.slot,
      counter_name: admin.counter,
      action_type: 'SUPPLIER_RETURN',
      title: `सप्लायर खरेदी परतावा: ${newReturn.product_name}`,
      details: `सप्लायर: ${newReturn.supplier_name} | प्रमाण: ${newReturn.quantity} ${newReturn.unit} | रिफंड: ₹${newReturn.total_refund_amount} | कारण: ${newReturn.reason}`,
      amount: newReturn.total_refund_amount,
      reference_id: returnNo,
      reference_table: 'supplier_returns'
    });

    return newReturn;
  };

  const updateSupplierRefundStatus = async (
    id: string, 
    newStatus: SupplierRefundStatus, 
    refundMode?: 'Cash' | 'Online_UPI' | 'Credit_Deduction' | 'Replacement', 
    notes?: string
  ) => {
    const target = supplierReturns.find(r => r.id === id);
    if (!target) return;

    const todayFormatted = new Date().toISOString().split('T')[0];

    // If changing to replacement received and wasn't before, restore product stock
    if (newStatus === 'Replacement_Received' && target.refund_status !== 'Replacement_Received') {
      setProducts(curr => curr.map(p => {
        if (p.id === target.product_id) {
          return {
            ...p,
            stock_quantity: Number((p.stock_quantity + target.quantity).toFixed(2))
          };
        }
        return p;
      }));
    }

    setSupplierReturns(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          refund_status: newStatus,
          refund_mode: refundMode || r.refund_mode,
          refund_date: todayFormatted,
          notes: notes ? (r.notes ? `${r.notes} | ${notes}` : notes) : r.notes
        };
      }
      return r;
    }));

    if (supabase && isSupabaseConnected) {
      try {
        await supabase.from('supplier_returns').update({
          refund_status: newStatus,
          refund_mode: refundMode,
          refund_date: todayFormatted,
          notes
        }).eq('id', id);
      } catch (err) {
        console.error('Failed to update supplier return in Supabase', err);
      }
    }
  };

  const deleteSupplierReturn = async (id: string) => {
    const target = supplierReturns.find(r => r.id === id);
    if (target && target.refund_status !== 'Replacement_Received') {
      // Restore product stock
      setProducts(prev => prev.map(p => {
        if (p.id === target.product_id) {
          return {
            ...p,
            stock_quantity: Number((p.stock_quantity + target.quantity).toFixed(2))
          };
        }
        return p;
      }));
    }
    setSupplierReturns(prev => prev.filter(r => r.id !== id));
    if (supabase && isSupabaseConnected) {
      try {
        await supabase.from('supplier_returns').delete().eq('id', id);
      } catch (err) {
        console.error('Failed to delete supplier return from Supabase', err);
      }
    }
  };

  return (
    <StoreContext.Provider value={{
      activeView,
      setActiveView,
      timeFilter,
      setTimeFilter,
      isSupabaseConnected,
      isSyncing,
      syncWithSupabase,
      refreshData,
      resetToSampleData,
      products,
      batches,
      sales,
      purchases,
      damages,
      customers,
      udharTransactions,
      expenses,
      returns,
      supplierReturns,
      adminActivities,
      logAdminActivity,
      currentReceipt,
      setCurrentReceipt,
      addProduct,
      updateProduct,
      deleteProduct,
      adjustStock,
      addStockEntries,
      addBatch,
      updateBatch,
      deleteBatch,
      createSale,
      createPurchase,
      addPurchase: createPurchase,
      recordDamage,
      addUdharCustomer,
      recordUdharPayment,
      addExpense,
      deleteExpense,
      createReturn,
      processSaleReturn,
      deleteReturn,
      deleteSale,
      createSupplierReturn,
      updateSupplierRefundStatus,
      deleteSupplierReturn,
      filteredSales,
      filteredPurchases,
      filteredExpenses,
      filteredDamages,
      filteredReturns,
      filteredSupplierReturns,
      metrics
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
