import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'hi' | 'mr';

export interface Translations {
  [key: string]: {
    en: string;
    hi: string;
    mr: string;
  };
}

export const TRANSLATIONS: Translations = {
  // Brand & General
  shopName: {
    en: 'Yogeshwari Dairy Farm & Sweets',
    hi: 'योगेश्वरी डेरी फार्म & स्वीट्स',
    mr: 'योगेश्वरी डेअरी फार्म & स्वीट्स'
  },
  shopSubtitle: {
    en: 'Dairy ERP & Inventory Khata System',
    hi: 'डेरी ERP & इन्वेंट्री खाता सिस्टम',
    mr: 'डेअरी ERP आणि इन्व्हेंटरी खातेवही प्रणाली'
  },
  dashboard: {
    en: 'Dashboard',
    hi: 'डैशबोर्ड',
    mr: 'डॅशबोर्ड'
  },
  dashboardSub: {
    en: 'Main Overview & KPIs',
    hi: 'मुख्य सारांश व आंकड़े',
    mr: 'मुख्य विहंगावलोकन आणि आकडेवारी'
  },
  quickPos: {
    en: 'Quick Counter POS',
    hi: 'दैनिक काउंटर बिलिंग',
    mr: 'काउंटर बिलिंग (POS)'
  },
  quickPosSub: {
    en: 'Fast Counter Sales',
    hi: 'तेज़ काउंटर बिक्री',
    mr: 'जलद काउंटर विक्री'
  },
  dailySalesNav: {
    en: 'Daily Sales & Cash',
    hi: 'दैनिक बिक्री / कैश & ऑनलाइन',
    mr: 'दैनिक विक्री / रोख व ऑनलाईन'
  },
  dailySalesSub: {
    en: 'Cash, UPI & Invoices',
    hi: 'रोकड़, UPI व बिल हिस्ट्री',
    mr: 'रोख, UPI व बिल तपशील'
  },
  inventoryNav: {
    en: 'Maal & Stock',
    hi: 'माल इन्वेंट्री लिस्ट',
    mr: 'माल साठा व इन्व्हेंटरी'
  },
  inventorySub: {
    en: 'Products & Price List',
    hi: 'सामान व भाव सूची',
    mr: 'उत्पादने व दर यादी'
  },
  stockNeedNav: {
    en: 'Stock Need Alert',
    hi: 'माल कितना खत्म / ज़रूरत',
    mr: 'माल तुटवडा व गरज अलर्ट'
  },
  stockNeedSub: {
    en: 'Reorder Intelligence',
    hi: 'पुनः आर्डर मांग पत्र',
    mr: 'पुन्हा मागवायचा माल'
  },
  purchasesNav: {
    en: 'Purchases (खरीदा)',
    hi: 'माल खरीदा (Purchases)',
    mr: 'माल खरेदी (शेतकरी/डेअरी)'
  },
  purchasesSub: {
    en: 'Farmer & Bulk Milk Buy',
    hi: 'सप्लायर / किसान से खरीदा',
    mr: 'शेतकरी व पुरवठादार खरेदी'
  },
  damagesNav: {
    en: 'Damage & Spoilage',
    hi: 'खराब / डैमेज माल',
    mr: 'खराब / नासलेला माल'
  },
  damagesSub: {
    en: 'Curdled milk & leakage',
    hi: 'फटा दूध, पाउच लीकेज',
    mr: 'नासलेले दूध, लिकेज, नुकसान'
  },
  udharNav: {
    en: 'Udhari Khata',
    hi: 'उधारी खाता',
    mr: 'उधारी खातेवही (खाते)'
  },
  udharSub: {
    en: 'Customer Credit Ledger',
    hi: 'ग्राहक उधारी लेजर',
    mr: 'ग्राहक बाकी व वसुली'
  },
  expensesNav: {
    en: 'Rent, Light & Fuel',
    hi: 'दुकान खर्च & इन्वेस्ट',
    mr: 'भाडे, वीज बिल व खर्च'
  },
  expensesSub: {
    en: 'Shop Bills & Assets',
    hi: 'किराया, लाइट, पेट्रोल, मशीन',
    mr: 'भाडे, वीज, पेट्रोल, गुंतवणूक'
  },
  analyticsNav: {
    en: 'Profit & Best Sellers',
    hi: 'शुद्ध मुनाफा & बेस्ट सेलर',
    mr: 'निव्वळ नफा व जास्त खपणारा माल'
  },
  analyticsSub: {
    en: 'Net Profit & Top Products',
    hi: 'शुद्ध लाभ व ज्यादा बिका माल',
    mr: 'खरा नफा व सर्वाधिक विक्री'
  },

  // Time filters
  today: {
    en: 'Today',
    hi: 'आज',
    mr: 'आज'
  },
  thisWeek: {
    en: 'This Week',
    hi: 'इस हफ्ते',
    mr: 'या आठवड्यात'
  },
  thisMonth: {
    en: 'This Month',
    hi: 'इस महीने',
    mr: 'या महिन्यात'
  },
  thisYear: {
    en: 'This Year',
    hi: 'इस साल',
    mr: 'या वर्षी'
  },
  allTime: {
    en: 'All Time',
    hi: 'कुल समय',
    mr: 'एकूण कालावधी'
  },
  timePeriodSelect: {
    en: 'Select Time Period:',
    hi: 'समय अवधि चुनें:',
    mr: 'कालावधी निवडा:'
  },

  // Metrics
  totalSales: {
    en: 'Total Sales',
    hi: 'कुल बिक्री (Sales)',
    mr: 'एकूण विक्री (Sales)'
  },
  cashCollected: {
    en: 'Cash Collected (रोकड़)',
    hi: 'रोकड़ (Cash आया)',
    mr: 'रोख रक्कम आली (Cash)'
  },
  onlineCollected: {
    en: 'Online UPI / QR',
    hi: 'ऑनलाइन (UPI / QR आया)',
    mr: 'ऑनलाईन UPI / QR आले'
  },
  totalPurchases: {
    en: 'Purchases (माल खरीदा)',
    hi: 'माल खरीदा (Purchases)',
    mr: 'माल खरेदी (खरेदी खर्च)'
  },
  netProfit: {
    en: 'Net Profit (शुद्ध लाभ)',
    hi: 'शुद्ध लाभ (Net Profit)',
    mr: 'निव्वळ नफा (Net Profit)'
  },
  grossProfit: {
    en: 'Gross Margin (सकल लाभ)',
    hi: 'सकल लाभ (Gross Margin)',
    mr: 'एकूण नफा (Gross Margin)'
  },
  totalUdharDue: {
    en: 'Total Credit Due (उधारी बाकी)',
    hi: 'कुल उधारी बाकी (Pending Udhar)',
    mr: 'बाजार उधारी बाकी (Pending)'
  },
  damageLoss: {
    en: 'Damage & Spoilage Loss',
    hi: 'खराब / डैमेज माल (Loss)',
    mr: 'खराब/नासलेला माल नुकसान'
  },
  lowStockAlert: {
    en: 'Stock Need Alert',
    hi: 'माल की ज़रूरत (Low Stock)',
    mr: 'माल कमी / संपला अलर्ट'
  },

  // Actions
  addNewMaal: {
    en: 'Add New Product (F3)',
    hi: '+ नया माल जोड़ें (F3)',
    mr: '+ नवीन माल जोडा (F3)'
  },
  openBillingCounter: {
    en: 'New Counter Bill (F2)',
    hi: '⚡ नया बिलिंग काउंटर (F2)',
    mr: '⚡ नवीन बिलिंग काउंटर (F2)'
  },
  openKhata: {
    en: 'Udhari Khata (F4)',
    hi: '📒 उधार खाता (F4)',
    mr: '📒 उधारी खाते (F4)'
  },
  save: {
    en: 'Save',
    hi: 'सुरक्षित करें',
    mr: 'जतन करा'
  },
  cancel: {
    en: 'Cancel',
    hi: 'रद्द करें',
    mr: 'रद्द करा'
  },
  edit: {
    en: 'Edit',
    hi: 'बदलाव करें',
    mr: 'बदल करा'
  },
  delete: {
    en: 'Delete',
    hi: 'हटाएं',
    mr: 'हटवा'
  },
  print: {
    en: 'Print',
    hi: 'प्रिंट करें',
    mr: 'प्रिंट काढा'
  },
  searchPlaceholder: {
    en: 'Search milk, paneer, curd, ghee...',
    hi: 'दूध, पनीर, दही, घी खोजें...',
    mr: 'दूध, पनीर, दही, तूप शोधा...'
  },

  // POS
  currentBill: {
    en: 'Current Bill Basket',
    hi: 'बिलिंग बास्केट',
    mr: 'चालू बिल बास्केट'
  },
  customerName: {
    en: 'Customer Name:',
    hi: 'ग्राहक का नाम:',
    mr: 'ग्राहकाचे नाव:'
  },
  customerPhone: {
    en: 'Mobile Number:',
    hi: 'मोबाइल नंबर:',
    mr: 'मोबाईल क्रमांक:'
  },
  subtotal: {
    en: 'Subtotal:',
    hi: 'उप-योग:',
    mr: 'उप-एकूण:'
  },
  discount: {
    en: 'Discount:',
    hi: 'छूट:',
    mr: 'सूट (Discount):'
  },
  netAmount: {
    en: 'Net Payable Total:',
    hi: 'कुल देय राशि:',
    mr: 'एकूण देय रक्कम:'
  },
  paymentMethod: {
    en: 'Payment Method:',
    hi: 'भुगतान का प्रकार:',
    mr: 'पेमेंट पद्धत:'
  },
  cash: {
    en: 'Cash',
    hi: 'कैश (रोकड़)',
    mr: 'रोख (Cash)'
  },
  onlineUpi: {
    en: 'Online UPI',
    hi: 'ऑनलाइन UPI',
    mr: 'ऑनलाईन UPI'
  },
  splitPay: {
    en: 'Cash + UPI',
    hi: 'कैश + UPI',
    mr: 'रोख + ऑनलाईन'
  },
  udharPay: {
    en: 'Udhar (Credit)',
    hi: 'उधार खाता',
    mr: 'उधारी खाते'
  },
  completeAndPrint: {
    en: 'Complete Bill & Print',
    hi: 'बिल पूरा करें व प्रिंट करें',
    mr: 'बिल पूर्ण करा आणि प्रिंट करा'
  },
  emptyCart: {
    en: 'Clear Basket',
    hi: 'खाली करें',
    mr: 'रिकामे करा'
  },
  cartEmptyMsg: {
    en: 'Basket is empty. Select products from left.',
    hi: 'बास्केट खाली है। बाईं तरफ से माल चुनें।',
    mr: 'बास्केट रिकामी आहे. डावीकडून माल निवडा.'
  },
  measureInRupees: {
    en: 'Measure in ₹ (e.g. ₹50 paneer)',
    hi: '₹ में नापें (उदा. ₹50 का पनीर)',
    mr: '₹ रुपयांत मोजा (उदा. ₹५० चे पनीर)'
  },
  enterRupees: {
    en: 'How many Rupees worth? (Enter ₹):',
    hi: 'ग्राहक को कितने रुपये का चाहिए? (₹ डालें):',
    mr: 'ग्राहकाला किती रुपयांचे हवे आहे? (रुपये टाका):'
  },
  calculatedQuantityIs: {
    en: 'Calculated Quantity:',
    hi: 'मात्रा बनेगी:',
    mr: 'तयार होणारे प्रमाण:'
  },
  addToBasket: {
    en: 'Add to Basket',
    hi: 'बास्केट में जोड़ें',
    mr: 'बास्केटमध्ये जोडा'
  },
  cashReceived: {
    en: 'Cash received from customer:',
    hi: 'ग्राहक से कितने रुपये मिले:',
    mr: 'ग्राहकाकडून किती रोख मिळाली:'
  },
  changeToReturn: {
    en: 'Change to Return:',
    hi: 'वापस देने योग्य (छुट्टे):',
    mr: 'परत द्यावयाची रक्कम (सुट्टे):'
  },
  nextBill: {
    en: 'Next Bill',
    hi: 'अगला ग्राहक (Next Bill)',
    mr: 'पुढील ग्राहक (Next Bill)'
  },

  // Inventory Table
  productNameCol: {
    en: 'Product Name',
    hi: 'उत्पाद का नाम',
    mr: 'उत्पादनाचे नाव'
  },
  categoryCol: {
    en: 'Category',
    hi: 'केटेगरी',
    mr: 'प्रवर्ग (कॅटेगरी)'
  },
  unitCol: {
    en: 'Unit',
    hi: 'इकाई',
    mr: 'एकक (Unit)'
  },
  costPriceCol: {
    en: 'Purchase Rate',
    hi: 'खरीद भाव (Cost)',
    mr: 'खरेदी दर (Cost)'
  },
  sellingPriceCol: {
    en: 'Selling Rate',
    hi: 'बिक्री भाव (Price)',
    mr: 'विक्री दर (Price)'
  },
  marginCol: {
    en: 'Margin (Profit)',
    hi: 'मार्जिन (लाभ)',
    mr: 'नफा मार्जिन'
  },
  currentStockCol: {
    en: 'Current Stock',
    hi: 'वर्तमान स्टॉक',
    mr: 'शिल्लक साठा (Stock)'
  },
  quickStockAdjust: {
    en: 'Quick Stock +/-',
    hi: 'तुरंत स्टॉक +/-',
    mr: 'त्वरित साठा बदल'
  },
  actionsCol: {
    en: 'Actions',
    hi: 'एक्शन',
    mr: 'कृती'
  },

  // Stock Needs / Reorder
  reorderTitle: {
    en: 'What stock is low? What to reorder today?',
    hi: 'माल कितना खत्म हुआ - क्या मंगाने की ज़रूरत है?',
    mr: 'कोणता माल संपला आहे? आज काय मागवायचे आहे?'
  },
  reorderDesc: {
    en: 'Procurement demand sheet based on minimum stock threshold.',
    hi: 'डेरी उत्पादों की न्यूनतम स्टॉक सीमा के आधार पर आज मंगाने योग्य माल की लिस्ट।',
    mr: 'किमान साठ्याच्या आधारे आज शेतकरी व पुरवठादारांकडून मागवायच्या मालाची यादी.'
  },
  copyWhatsAppOrder: {
    en: 'Copy WhatsApp Order List',
    hi: 'WhatsApp आर्डर कॉपी करें',
    mr: 'व्हॉट्सअॅप ऑर्डर यादी कॉपी करा'
  },
  orderCopied: {
    en: 'WhatsApp Order List Copied!',
    hi: 'WhatsApp लिस्ट कॉपी हो गई!',
    mr: 'व्हॉट्सअॅप यादी कॉपी झाली!'
  },
  recommendedOrderQty: {
    en: 'Order Quantity',
    hi: 'मंगाने योग्य मात्रा',
    mr: 'मागवायची मात्रा'
  },

  // Damage
  damageTitle: {
    en: 'Damage & Spoilage Loss Tracker',
    hi: 'डैमेज व खराब माल ट्रैकर',
    mr: 'खराब व नासलेल्या मालाचा हिशोब'
  },
  logDamage: {
    en: '+ Log Damaged Stock',
    hi: '+ खराब माल दर्ज करें',
    mr: '+ नासलेला माल नोंदवा'
  },
  curdledMilk: {
    en: 'Curdled / Soured Milk',
    hi: 'दूध फट गया (Curdled)',
    mr: 'दूध नासले / फाटले'
  },
  leakedPouch: {
    en: 'Packet Leaked / Burst',
    hi: 'थैली फट गई (Leaked)',
    mr: 'पिशवी फुटली / गळती'
  },
  expiredProduct: {
    en: 'Expiry Date Over',
    hi: 'एक्सपायरी डेट खत्म',
    mr: 'मुदत संपली (Expiry)'
  },
  handlingSpoilage: {
    en: 'Handling Spoilage',
    hi: 'हैंडलिंग खराबी',
    mr: 'हाताळणी नुकसान'
  },

  // Udhar Khata
  khataTitle: {
    en: 'Customer Credit Ledger (Khata Book)',
    hi: 'उधारी खाता लेजर (Khata Book)',
    mr: 'उधारी खातेवही (खाते पुस्तक)'
  },
  recordPaymentJama: {
    en: 'Record Payment (जमा करें)',
    hi: 'जमा करें (Jama)',
    mr: 'रक्कम जमा करा (पावती)'
  },
  sendWhatsAppReminder: {
    en: 'Send WhatsApp Reminder',
    hi: 'WhatsApp तकादा',
    mr: 'व्हॉट्सअॅप आठवण संदेश'
  },
  debtorsOnly: {
    en: 'Pending Debtors',
    hi: 'बाकीदार ग्राहक',
    mr: 'बाकी असलेले ग्राहक'
  },
  clearedAccounts: {
    en: 'Cleared Accounts',
    hi: 'हिसाब चुकता',
    mr: 'हिशोब पूर्ण झालेले'
  },
  allAccounts: {
    en: 'All Accounts',
    hi: 'सभी खाते',
    mr: 'सर्व ग्राहक खाते'
  },
  balanceDue: {
    en: 'Current Balance Due:',
    hi: 'वर्तमान बाकी (Balance):',
    mr: 'सध्याची बाकी रक्कम:'
  },

  // Expenses & Investments
  expensesTitle: {
    en: 'Shop Expenses & Capital Investments',
    hi: 'दुकान खर्च & इन्वेस्टमेंट ट्रैकर',
    mr: 'दुकानाचे खर्च आणि भांडवली गुंतवणूक'
  },
  operatingExpenses: {
    en: 'Operating Expenses (किराया, लाइट, पेट्रोल)',
    hi: 'दैनिक संचालन खर्च (Rent, Light, Fuel)',
    mr: 'दैनंदिन खर्च (भाडे, वीज बिल, पेट्रोल)'
  },
  capitalInvestments: {
    en: 'Shop Capital Investment (मशीनें, फ्रीजर)',
    hi: 'दुकान पूंजी निवेश (Capital Assets)',
    mr: 'दुकानातील भांडवली गुंतवणूक (फ्रीझर, यंत्रे)'
  },
  addExpense: {
    en: '+ Add Expense / Investment',
    hi: '+ नया खर्च या इन्वेस्टमेंट जोड़ें',
    mr: '+ नवीन खर्च किंवा गुंतवणूक नोंदवा'
  },
  shopRent: {
    en: 'Shop Rent',
    hi: 'दुकान का किराया (Rent)',
    mr: 'दुकानाचे भाडे (Rent)'
  },
  lightBill: {
    en: 'Electricity / Chiller Bill',
    hi: 'चिलर का लाइट बिल',
    mr: 'चिलरचे वीज बिल'
  },
  fuelPetrol: {
    en: 'Delivery Vehicle Petrol / Diesel',
    hi: 'गाड़ी व डिलीवरी पेट्रोल',
    mr: 'गाडी व डिलिव्हरीचे पेट्रोल'
  },
  chillerMaint: {
    en: 'Deep Chiller Maintenance',
    hi: 'डीप चिलर मेंटेनेंस व सर्विस',
    mr: 'डीप फ्रीझर दुरुस्ती व देखभाल'
  },
  staffSalary: {
    en: 'Staff / Helper Salary',
    hi: 'हेल्पर / स्टाफ वेतन',
    mr: 'कामगार / मदतनीस पगार'
  },

  // Best Sellers & Analytics
  bestSellersTitle: {
    en: 'Top Selling Dairy Products',
    hi: 'कौनसा माल ज़्यादा बिकता है',
    mr: 'सर्वाधिक खपणारा डेअरी माल'
  },
  plStatement: {
    en: 'Shop Profit & Loss Statement',
    hi: 'दुकान लाभ-हानि खाता (P&L Statement)',
    mr: 'दुकान नफा-तोटा पत्रक (P&L)'
  },
  cogs: {
    en: 'Cost of Goods Sold (खरीद लागत):',
    hi: 'बेचे गए माल की मूल खरीद लागत:',
    mr: 'विकलेल्या मालाचा मूळ खरेदी खर्च:'
  },
  netPocketProfit: {
    en: 'Net Profit in Pocket:',
    hi: 'अंतिम शुद्ध मुनाफा (जेब में आया):',
    mr: 'खिशात पडणारा निव्वळ नफा:'
  },

  // Categories
  catMilk: {
    en: 'Milk',
    hi: 'दूध',
    mr: 'दूध'
  },
  catCurd: {
    en: 'Curd & Chaas',
    hi: 'दही व छाछ',
    mr: 'दही आणि ताक'
  },
  catPaneer: {
    en: 'Paneer & Butter',
    hi: 'पनीर व मक्खन',
    mr: 'पनीर आणि लोणी'
  },
  catGhee: {
    en: 'Pure Ghee',
    hi: 'शुद्ध देसी घी',
    mr: 'शुद्ध साजूक तूप'
  },
  catSweets: {
    en: 'Sweets & Khoya',
    hi: 'मिठाई व खोया/मावा',
    mr: 'मिठाई आणि खवा'
  },
  catBakery: {
    en: 'Bakery & Extras',
    hi: 'बेकरी, ब्रेड व अंडे',
    mr: 'बेकरी, ब्रेड आणि अंडी'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language') as Language;
    return saved === 'en' || saved === 'hi' || saved === 'mr' ? saved : 'mr'; // default Marathi/Hindi
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (key: string): string => {
    const item = TRANSLATIONS[key];
    if (!item) return key;
    return item[language] || item['en'] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

