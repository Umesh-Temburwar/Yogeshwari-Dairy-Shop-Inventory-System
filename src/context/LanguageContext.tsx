import React, { createContext, useContext, useEffect } from 'react';

export type Language = 'en' | 'hi' | 'mr';

export interface Translations {
  [key: string]: {
    en: string;
  };
}

export const TRANSLATIONS: Translations = {
  // Brand & General
  shopName: { en: 'Yogeshwari Dairy Products' },
  shopSubtitle: { en: 'Dairy ERP & Inventory Khata System' },
  erpBadge: { en: 'Dairy ERP' },
  dashboard: { en: 'Dashboard' },
  dashboardSub: { en: 'Main Overview & KPIs' },
  quickPos: { en: 'Counter Billing' },
  quickPosSub: { en: 'Fast Counter Sales' },
  dailySalesNav: { en: 'Daily Sales & Cash' },
  dailySalesSub: { en: 'Cash, UPI & Invoices' },
  inventoryNav: { en: 'Products & Stock' },
  inventorySub: { en: 'Products & Price List' },
  stockNeedNav: { en: 'Stock Need Alert' },
  stockNeedSub: { en: 'Reorder Intelligence' },
  expiryNav: { en: 'Expiry Management' },
  expirySub: { en: 'FEFO & Expiry Dashboard' },
  purchasesNav: { en: 'Purchases' },
  purchasesSub: { en: 'Farmer & Bulk Milk Buy' },
  damagesNav: { en: 'Damages & Spoilage' },
  damagesSub: { en: 'Curdled milk & leakage' },
  returnsNav: { en: 'Returns & Refunds' },
  returnsSub: { en: 'Customer returns & refunds' },
  udharNav: { en: 'Udhar Khata' },
  udharSub: { en: 'Customer Credit Ledger' },
  expensesNav: { en: 'Rent, Electricity Bill & Fuel' },
  expensesSub: { en: 'Shop Bills & Assets' },
  analyticsNav: { en: 'Net Profit & Best Sellers' },
  analyticsSub: { en: 'Net Profit & Top Products' },

  // Sidebar Sections
  navSectionMain: { en: 'OPERATIONS' },
  navSectionInventory: { en: 'INVENTORY & BUY' },
  navSectionAccounts: { en: 'ACCOUNTS & REPORTS' },

  // Time filters
  today: { en: 'Today' },
  thisWeek: { en: 'This Week' },
  thisMonth: { en: 'This Month' },
  thisYear: { en: 'This Year' },
  allTime: { en: 'All Time' },
  timePeriodSelect: { en: 'Select Period:' },

  // Metrics (Clean, unmixed strings)
  totalSales: { en: 'Total Sales' },
  cashCollected: { en: 'Cash Inflow' },
  onlineCollected: { en: 'Online UPI & QR' },
  totalPurchases: { en: 'Total Purchases' },
  netProfit: { en: 'Net Profit' },
  grossProfit: { en: 'Gross Profit' },
  totalUdharDue: { en: 'Market Credit Due' },
  damageLoss: { en: 'Spoilage Loss' },
  lowStockAlert: { en: 'Low Stock Alert' },

  // Actions
  addNewMaal: { en: 'Add Stock (F3)' },
  openBillingCounter: { en: 'New Counter Bill (F2)' },
  openKhata: { en: 'Udhar Khata (F4)' },
  viewDetails: { en: 'View Details' },
  save: { en: 'Save' },
  cancel: { en: 'Cancel' },
  edit: { en: 'Edit' },
  delete: { en: 'Delete' },
  view: { en: 'View' },
  print: { en: 'Print' },
  downloadPdf: { en: 'Download PDF' },
  close: { en: 'Close' },
  done: { en: 'Done' },
  nextBill: { en: 'New Bill (F2)' },
  searchPlaceholder: { en: 'Search milk, paneer, curd, ghee...' },

  // Best Sellers & Low stock
  bestSellersTitle: { en: 'Best Selling Dairy Products' },
  bestSellersSubtitle: { en: 'Highest revenue generating dairy items for selected period' },
  stockNeedTitle: { en: 'Stock Need & Shortage Alert' },
  stockNeedSubtitle: { en: 'Products reaching or below reorder threshold' },
  reorderUnits: { en: 'Need' },
  addBuy: { en: 'Buy' },
  createOrderSheet: { en: 'Create Order Sheet' },
  viewAll: { en: 'View All' },

  // Daily summary
  dailySummaryTitle: { en: 'Daily Business Summary' },
  todayNetProfit: { en: 'Today Net Profit:' },
  totalDueCredit: { en: 'Total Due Credit:' },

  // Charts
  trendTitle: { en: 'Sales, Purchases & Profit Trend (Last 7 Days)' },
  salesLegend: { en: 'Sales' },
  purchaseLegend: { en: 'Purchases' },
  profitLegend: { en: 'Profit' },
  paymentBreakdownTitle: { en: 'Payment Methods Breakdown' },
  cashLabel: { en: 'Cash' },
  onlineLabel: { en: 'Online UPI' },
  udharLabel: { en: 'Udhar Credit' },
  totalIn: { en: 'Total In' },

  // Theme
  themeLight: { en: 'Light' },
  themeDark: { en: 'Dark' },
  themeSystem: { en: 'System' },

  // POS & Billing
  currentBill: { en: 'Current Cart' },
  emptyCart: { en: 'Clear Bill' },
  customerName: { en: 'Customer Name' },
  customerPhone: { en: 'Phone Number' },
  cartEmptyMsg: { en: 'No items in cart. Click on products to add to bill.' },
  subtotal: { en: 'Subtotal' },
  discount: { en: 'Discount' },
  netAmount: { en: 'Net Payable' },
  paymentMethod: { en: 'Payment Method' },
  cash: { en: 'Cash' },
  onlineUpi: { en: 'Online UPI' },
  splitPay: { en: 'Split Payment' },
  udharPay: { en: 'Credit' },
  cashReceived: { en: 'Cash Received' },
  changeToReturn: { en: 'Change to Return' },
  completeAndPrint: { en: 'Save & Print Invoice' },
  measureInRupees: { en: 'Quick Rupees to Quantity' },
  enterRupees: { en: 'Enter Amount (₹)' },
  calculatedQuantityIs: { en: 'Calculated Quantity' },
  addToBasket: { en: 'Add to Bill' },

  // Stock & Reorder
  reorderTitle: { en: 'Stock Need & Reorder Sheet' },
  reorderDesc: { en: 'Automated order sheet for products reaching low or zero stock' },
  orderCopied: { en: 'Order list copied to clipboard!' },
  copyWhatsAppOrder: { en: 'Copy WhatsApp Order' },
  recommendedOrderQty: { en: 'Suggested Order' },
  productNameCol: { en: 'Product Name' },
  categoryCol: { en: 'Category' },
  currentStockCol: { en: 'Current Stock' },
  costPriceCol: { en: 'Purchase Rate' },
  sellingPriceCol: { en: 'Selling Rate' },
  unitCol: { en: 'Unit' },
  actionsCol: { en: 'Action' },

  // Khata / Udhar
  khataTitle: { en: 'Customer Udhar Khata Book' },
  debtorsOnly: { en: 'Pending Udhar' },
  clearedAccounts: { en: 'Cleared Accounts' },
  allAccounts: { en: 'All Accounts' },
  balanceDue: { en: 'Pending Balance' },
  recordPaymentJama: { en: 'Receive Payment' },
  sendWhatsAppReminder: { en: 'WhatsApp Reminder' },

  // Damages & Spoilage
  damageTitle: { en: 'Damages & Spoilage Tracker' },
  logDamage: { en: 'Record Damage' },
  curdledMilk: { en: 'Curdled Milk' },
  leakedPouch: { en: 'Leaked Pouch' },
  expiredProduct: { en: 'Expired Product' },
  handlingSpoilage: { en: 'Handling Loss' },

  // Expenses & Investments
  expensesTitle: { en: 'Shop Expenses & Investment' },
  addExpense: { en: 'Add Expense / Investment' },
  operatingExpenses: { en: 'Operating Expenses' },
  capitalInvestments: { en: 'Shop Investment (Assets)' },
  shopRent: { en: 'Shop Rent' },
  lightBill: { en: 'Electricity Bill' },
  fuelPetrol: { en: 'Vehicle Petrol/Diesel' },
  chillerMaint: { en: 'Chiller / Deep Freezer Maint' },
  staffSalary: { en: 'Staff Salary' },

  // Analytics & P&L
  plStatement: { en: 'Profit & Loss Statement' },
  netPocketProfit: { en: 'Net Pocket Profit' },

  // Categories
  catMilk: { en: 'Milk' },
  catCurd: { en: 'Curd & Chaas' },
  catPaneer: { en: 'Paneer & Butter' },
  catGhee: { en: 'Ghee' },
  catSweets: { en: 'Sweets & Khoya' },
  catBakery: { en: 'Bakery & Extras' },
  // Customer Demographics Translations
  customerGender: { en: 'Customer Gender' },
  customerAge: { en: 'Age' },
  customerAgeGroup: { en: 'Age Group' },
  male: { en: 'Male' },
  female: { en: 'Female' },
  otherGender: { en: 'Other' },
  ageKids: { en: 'Kids (<18)' },
  ageYouth: { en: 'Youth (18-25)' },
  ageAdults: { en: 'Adults (26-45)' },
  ageSeniors: { en: 'Senior (45+)' },
  demographicsTitle: { en: 'Customer Demographics & Buying Intelligence' },
  demographicsSub: { en: 'Track which gender and age group buys which dairy products and quantities' },
  genderBreakdown: { en: 'Gender-wise Sales & Volume' },
  ageBreakdown: { en: 'Age Group Product Preference' },
  whoBuysWhat: { en: 'Who Buys What? (Product Demographics)' },
  whoBuysWhatSub: { en: 'Breakdown of buyers by gender and age group for every dairy product' },
  topBuyerGender: { en: 'Top Buyer Gender' },
  topBuyerAge: { en: 'Top Age Group' },
  filterByGender: { en: 'Filter by Gender' },
  filterByAge: { en: 'Filter by Age' },
  allGenders: { en: 'All Genders' },
  allAges: { en: 'All Age Groups' },
  maleBuyers: { en: 'Male Buyers' },
  femaleBuyers: { en: 'Female Buyers' },
  batchNo: { en: 'Batch No.' },
  mfgDate: { en: 'Mfg Date' },
  expiryDate: { en: 'Expiry Date' },
  shelfLife: { en: 'Shelf Life' },
  batches: { en: 'Batches' },
  viewBatches: { en: 'View Batches' },
  manageBatches: { en: 'Manage Batches' },
  activeBatches: { en: 'Active Batches' },
  allBatches: { en: 'All Batches' },
  expiredBatches: { en: 'Expired Batches' },
  expiringToday: { en: 'Expiring Today' },
  expiringTomorrow: { en: 'Expiring Tomorrow' },
  freshBatches: { en: 'Fresh Batches' },
  markDamage: { en: 'Mark Spoilage/Damage' },
  autoSuggestedExpiry: { en: 'Auto-suggested by variety shelf-life' },
  lotType: { en: 'Lot / Arrival Type' },
  freshTodayLot: { en: "Today's Fresh Arrival" },
  previousLot: { en: 'Previous / Earlier Stock' },
  addToExistingBatch: { en: 'Add to Existing Batch' },
  createNewBatch: { en: 'Create New Batch Entry' },
  multiLotEntry: { en: 'Multi-Lot Split Entry' },
  addAnotherLot: { en: '+ Add Another Lot' },
  removeLot: { en: 'Remove Lot' },
  selectBatch: { en: 'Select Batch' },
  totalInward: { en: 'Total Inward Stock' },
  newTotalStock: { en: 'New Shop Stock' },
  stockInModalTitle: { en: 'Add Stock & Batch Expiry Entry' },
  // Auth & Login Page Translations (100% pure en / hi / mr)
  authErpBadge: { en: 'Commercial Dairy ERP System' },
  authHeadline: { en: 'Milk Collection, Batch Inventory & Counter POS' },
  authDescription: { en: 'Farmer fat/SNF milk purchases, multi-batch FEFO inventory tracking, digital customer credit khata, and real-time profit analytics.' },
  authFeatureBatchTitle: { en: 'Multi-Batch Inventory' },
  authFeatureBatchDesc: { en: 'Unique expiry & purchase cost for each batch' },
  authFeatureFefoTitle: { en: 'FEFO Expiry Alerts' },
  authFeatureFefoDesc: { en: 'First Expiry First Out sales deduction & blocking' },
  authFeatureBillingTitle: { en: 'Fast Counter Billing' },
  authFeatureBillingDesc: { en: 'Cash, UPI, split payments & demographic insights' },
  authFeatureCloudTitle: { en: 'Secure Cloud Sync' },
  authFeatureCloudDesc: { en: 'Supabase PostgreSQL database & RLS security' },
  authEnterpriseGrade: { en: 'Enterprise Grade' },
  authCopyright: { en: 'Yogeshwari Dairy ERP. All rights reserved.' },
  authSignInTitle: { en: 'Sign in to your account' },
  authSignInSubtitle: { en: 'Enter your credentials to continue' },
  authSignUpTitle: { en: 'Create a new account' },
  authSignUpSubtitle: { en: 'Register a new dairy operator account' },
  authForgotTitle: { en: 'Reset your password' },
  authForgotSubtitle: { en: 'Enter your email to receive a password reset link' },
  authContinueGoogle: { en: 'Continue with Google' },
  authOrWithEmail: { en: 'or with email' },
  authFullName: { en: 'Full Name' },
  authFullNamePlaceholder: { en: 'e.g. Ramesh Patil' },
  authEmail: { en: 'Email address' },
  authEmailPlaceholder: { en: 'name@yogeshwaridairy.com' },
  authPassword: { en: 'Password' },
  authPasswordPlaceholder: { en: '••••••••' },
  authRememberMe: { en: 'Remember me' },
  authForgotPassword: { en: 'Forgot password?' },
  authSignInButton: { en: 'Sign in' },
  authSigningIn: { en: 'Signing in...' },
  authCreateAccountButton: { en: 'Create account' },
  authCreatingAccount: { en: 'Creating account...' },
  authSendResetLink: { en: 'Send reset link' },
  authSendingResetLink: { en: 'Sending link...' },
  authBackToSignIn: { en: 'Back to sign in' },
  authNewOperator: { en: 'New operator?' },
  authRegisterHere: { en: 'Register here' },
  authRegToggleTitle: { en: 'New Operator Registration' },
  authRegToggleDescOn: { en: 'Registration is OPEN (Visible on login page)' },
  authRegToggleDescOff: { en: 'Registration is HIDDEN & LOCKED (Strict security)' },
  authRegDisabledAlert: { en: 'New operator registration is currently disabled by Shop Owner Nikhil Sakhare.' },
  authRegOnlyOwnerAllowed: { en: 'Only Shop Owner Nikhil Sakhare can modify this security setting.' },
  authAlreadyHaveAccount: { en: 'Already have an account?' },
  authGuestMode: { en: 'Continue in Guest / Demo mode' },
  authFooterHelp: { en: 'For technical help or credential access, contact dairy management.' },
  authCapsLockOn: { en: 'Caps Lock is ON' },
  authShowPassword: { en: 'Show password' },
  authHidePassword: { en: 'Hide password' },
  authToggleTheme: { en: 'Toggle color theme' },
  authSkipToForm: { en: 'Skip to login form' },
  authEmailRequired: { en: 'Email address is required' },
  authEmailInvalid: { en: 'Please enter a valid email address' },
  authPasswordRequired: { en: 'Password is required' },
  authPasswordMinLength: { en: 'Password must be at least 6 characters' },
  authFullNameRequired: { en: 'Full name is required' },
  authInvalidCredentials: { en: 'Invalid email or password' },
  authTooManyAttempts: { en: 'Too many attempts. Please wait a moment and try again.' },
  authNetworkError: { en: 'Network error. Please check your internet connection.' },
  authGoogleFailed: { en: 'Google sign-in was cancelled or failed. Please try again.' },
  authResetEmailSent: { en: 'Password reset link sent to your email.' },
  authAccountCreated: { en: 'Account created successfully! Please sign in.' }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  tText: (obj: { en: string; hi?: string; mr?: string }) => string;
  tr: (en: string, hi?: string, mr?: string) => string;
  getProductDisplayName: (prod: { name?: string } | null | undefined) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Strictly English-only application
  const language: Language = 'en';

  const setLanguage = (_lang: Language) => {
    try {
      localStorage.setItem('dairy_language', 'en');
      document.documentElement.setAttribute('lang', 'en');
    } catch {
      // Ignore storage access errors
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('dairy_language', 'en');
      document.documentElement.setAttribute('lang', 'en');
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const t = (key: string): string => {
    if (TRANSLATIONS[key]?.en) {
      return TRANSLATIONS[key].en;
    }
    return key;
  };

  const tText = (obj: { en: string; hi?: string; mr?: string }): string => {
    return obj.en || '';
  };

  const tr = (en: string, _hi?: string, _mr?: string): string => {
    return en;
  };

  const getProductDisplayName = (prod: { name?: string } | null | undefined): string => {
    if (!prod) return '';
    return prod.name || '';
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tText, tr, getProductDisplayName }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
