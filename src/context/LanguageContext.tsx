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
  erpBadge: {
    en: 'Dairy ERP',
    hi: 'डेरी ERP',
    mr: 'डेअरी ERP'
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
    en: 'Counter Billing',
    hi: 'काउंटर बिलिंग',
    mr: 'काउंटर बिलिंग'
  },
  quickPosSub: {
    en: 'Fast Counter Sales',
    hi: 'तेज़ काउंटर बिक्री',
    mr: 'जलद काउंटर विक्री'
  },
  dailySalesNav: {
    en: 'Daily Sales & Cash',
    hi: 'दैनिक बिक्री व रोकड़',
    mr: 'दैनिक विक्री व रोख'
  },
  dailySalesSub: {
    en: 'Cash, UPI & Invoices',
    hi: 'रोकड़, UPI व बिल विवरण',
    mr: 'रोख, UPI व बिल तपशील'
  },
  inventoryNav: {
    en: 'Products & Stock',
    hi: 'सामान व स्टॉक',
    mr: 'माल साठा व इन्व्हेंटरी'
  },
  inventorySub: {
    en: 'Products & Price List',
    hi: 'सामान व भाव सूची',
    mr: 'उत्पादने व दर यादी'
  },
  stockNeedNav: {
    en: 'Stock Need Alert',
    hi: 'माल ज़रूरत अलर्ट',
    mr: 'माल तुटवडा व गरज'
  },
  stockNeedSub: {
    en: 'Reorder Intelligence',
    hi: 'पुनः आर्डर मांग पत्र',
    mr: 'पुन्हा मागवायचा माल'
  },
  purchasesNav: {
    en: 'Purchases',
    hi: 'माल खरीद',
    mr: 'माल खरेदी'
  },
  purchasesSub: {
    en: 'Farmer & Bulk Milk Buy',
    hi: 'किसान व सप्लायर से खरीद',
    mr: 'शेतकरी व पुरवठादार खरेदी'
  },
  damagesNav: {
    en: 'Damages & Spoilage',
    hi: 'खराब व डैमेज माल',
    mr: 'खराब व नासलेला माल'
  },
  damagesSub: {
    en: 'Curdled milk & leakage',
    hi: 'फटा दूध, पाउच लीकेज',
    mr: 'नासलेले दूध, लिकेज, नुकसान'
  },
  udharNav: {
    en: 'Udhar Khata',
    hi: 'उधार खाता',
    mr: 'उधारी खातेवही'
  },
  udharSub: {
    en: 'Customer Credit Ledger',
    hi: 'ग्राहक उधारी लेजर',
    mr: 'ग्राहक बाकी व वसुली'
  },
  expensesNav: {
    en: 'Rent, Power & Fuel',
    hi: 'किराया, बिजली व खर्च',
    mr: 'भाडे, वीज बिल व खर्च'
  },
  expensesSub: {
    en: 'Shop Bills & Assets',
    hi: 'किराया, लाइट, पेट्रोल, मशीन',
    mr: 'भाडे, वीज, पेट्रोल, गुंतवणूक'
  },
  analyticsNav: {
    en: 'Net Profit & Best Sellers',
    hi: 'शुद्ध मुनाफा व बेस्ट सेलर',
    mr: 'निव्वळ नफा व जास्त खपणारा माल'
  },
  analyticsSub: {
    en: 'Net Profit & Top Products',
    hi: 'शुद्ध लाभ व ज्यादा बिका माल',
    mr: 'खरा नफा व सर्वाधिक विक्री'
  },

  // Sidebar Sections
  navSectionMain: {
    en: 'OPERATIONS',
    hi: 'ऑपरेशन्स',
    mr: 'दैनिक व्यवहार'
  },
  navSectionInventory: {
    en: 'INVENTORY & BUY',
    hi: 'इन्वेंट्री व खरीद',
    mr: 'साठा व खरेदी'
  },
  navSectionAccounts: {
    en: 'ACCOUNTS & REPORTS',
    hi: 'हिसाब व रिपोर्ट्स',
    mr: 'हिशोब व अहवाल'
  },

  // Time filters
  today: {
    en: 'Today',
    hi: 'आज',
    mr: 'आज'
  },
  thisWeek: {
    en: 'This Week',
    hi: 'या आठवड्यात',
    mr: 'या आठवड्यात'
  },
  thisMonth: {
    en: 'This Month',
    hi: 'या महिन्यात',
    mr: 'या महिन्यात'
  },
  thisYear: {
    en: 'This Year',
    hi: 'या वर्षी',
    mr: 'या वर्षी'
  },
  allTime: {
    en: 'All Time',
    hi: 'एकूण कालावधी',
    mr: 'एकूण कालावधी'
  },
  timePeriodSelect: {
    en: 'Select Period:',
    hi: 'कालावधी निवडा:',
    mr: 'कालावधी निवडा:'
  },

  // Metrics (Clean, unmixed strings)
  totalSales: {
    en: 'Total Sales',
    hi: 'कुल बिक्री',
    mr: 'एकूण विक्री'
  },
  cashCollected: {
    en: 'Cash Inflow',
    hi: 'रोकड़ जमा',
    mr: 'रोख रक्कम जमा'
  },
  onlineCollected: {
    en: 'Online UPI & QR',
    hi: 'ऑनलाइन UPI व QR',
    mr: 'ऑनलाईन UPI व QR'
  },
  totalPurchases: {
    en: 'Total Purchases',
    hi: 'कुल माल खरीद',
    mr: 'एकूण माल खरेदी'
  },
  netProfit: {
    en: 'Net Profit',
    hi: 'शुद्ध लाभ',
    mr: 'निव्वळ नफा'
  },
  grossProfit: {
    en: 'Gross Profit',
    hi: 'सकल लाभ',
    mr: 'एकूण नफा'
  },
  totalUdharDue: {
    en: 'Market Credit Due',
    hi: 'बाज़ार उधारी बाकी',
    mr: 'बाजार उधारी बाकी'
  },
  damageLoss: {
    en: 'Spoilage Loss',
    hi: 'खराब माल नुकसान',
    mr: 'खराब व नासलेला माल नुकसान'
  },
  lowStockAlert: {
    en: 'Low Stock Alert',
    hi: 'कम स्टॉक अलर्ट',
    mr: 'कमी साठा अलर्ट'
  },

  // Actions
  addNewMaal: {
    en: 'Add Stock (F3)',
    hi: 'नया माल (F3)',
    mr: 'नवीन माल जोडा (F3)'
  },
  openBillingCounter: {
    en: 'New Counter Bill (F2)',
    hi: 'नया बिलिंग काउंटर (F2)',
    mr: 'नवीन बिलिंग काउंटर (F2)'
  },
  openKhata: {
    en: 'Udhar Khata (F4)',
    hi: 'उधार खाता (F4)',
    mr: 'उधारी खाते (F4)'
  },
  viewDetails: {
    en: 'View Details',
    hi: 'विस्तार से देखें',
    mr: 'सविस्तर पहा'
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

  // Best Sellers & Low stock
  bestSellersTitle: {
    en: 'Best Selling Dairy Products',
    hi: 'सर्वाधिक बिकने वाला डेरी माल',
    mr: 'सर्वाधिक खपणारा डेअरी माल'
  },
  bestSellersSubtitle: {
    en: 'Highest revenue generating dairy items for selected period',
    hi: 'चुनी गई अवधि में सबसे अधिक बिक्री देने वाले उत्पाद',
    mr: 'निवडलेल्या कालावधीत सर्वाधिक कमाई करून देणारा माल'
  },
  stockNeedTitle: {
    en: 'Stock Need & Shortage Alert',
    hi: 'माल की कमी व ज़रूरत अलर्ट',
    mr: 'माल संपला / कमी साठा अलर्ट'
  },
  stockNeedSubtitle: {
    en: 'Products reaching or below reorder threshold',
    hi: 'उत्पाद जो न्यूनतम स्टॉक सीमा पर पहुंच चुके हैं',
    mr: 'किमान साठा मर्यादेवर किंवा खाली आलेली उत्पादने'
  },
  reorderUnits: {
    en: 'Need',
    hi: 'मंगाएं',
    mr: 'मागवा'
  },
  addBuy: {
    en: 'Buy',
    hi: 'खरीद',
    mr: 'खरेदी नोंद'
  },
  createOrderSheet: {
    en: 'Create Order Sheet',
    hi: 'ऑर्डर लिस्ट तैयार करें',
    mr: 'ऑर्डर यादी तयार करा'
  },
  viewAll: {
    en: 'View All',
    hi: 'सब देखें',
    mr: 'सर्व पहा'
  },

  // Daily summary
  dailySummaryTitle: {
    en: 'Daily Business Summary',
    hi: 'दैनिक व्यापार सारांश',
    mr: 'दैनिक व्यवसाय गोषवारा'
  },
  todayNetProfit: {
    en: 'Today Net Profit:',
    hi: 'आज का शुद्ध लाभ:',
    mr: 'आजचा निव्वळ नफा:'
  },
  totalDueCredit: {
    en: 'Total Due Credit:',
    hi: 'कुल उधारी बाकी:',
    mr: 'एकूण उधारी बाकी:'
  },

  // Charts
  trendTitle: {
    en: 'Sales, Purchases & Profit Trend (Last 7 Days)',
    hi: 'दैनिक बिक्री, खरीद और लाभ ट्रेंड (पिछले ७ दिन)',
    mr: 'दैनिक विक्री, खरेदी आणि नफा कल (गेले ७ दिवस)'
  },
  salesLegend: {
    en: 'Sales',
    hi: 'बिक्री',
    mr: 'विक्री'
  },
  purchaseLegend: {
    en: 'Purchases',
    hi: 'खरीद',
    mr: 'खरेदी'
  },
  profitLegend: {
    en: 'Profit',
    hi: 'लाभ',
    mr: 'नफा'
  },
  paymentBreakdownTitle: {
    en: 'Payment Methods Breakdown',
    hi: 'भुगतान के प्रकार',
    mr: 'पेमेंट पद्धत विभागणी'
  },
  cashLabel: {
    en: 'Cash',
    hi: 'रोकड़',
    mr: 'रोख'
  },
  onlineLabel: {
    en: 'Online UPI',
    hi: 'ऑनलाइन UPI',
    mr: 'ऑनलाईन UPI'
  },
  udharLabel: {
    en: 'Udhar Credit',
    hi: 'उधार खाता',
    mr: 'उधारी खाते'
  },
  totalIn: {
    en: 'Total In',
    hi: 'कुल जमा',
    mr: 'एकूण जमा'
  },

  // Theme
  themeLight: {
    en: 'Light',
    hi: 'लाइट',
    mr: 'लाइट'
  },
  themeDark: {
    en: 'Dark',
    hi: 'डार्क',
    mr: 'डार्क'
  },
  themeSystem: {
    en: 'System',
    hi: 'सिस्टम',
    mr: 'सिस्टम'
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
    try {
      const stored = localStorage.getItem('dairy_language') as Language;
      if (stored === 'en' || stored === 'hi' || stored === 'mr') {
        return stored;
      }
    } catch {}
    return 'mr'; // Default to Marathi as requested
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('dairy_language', lang);
      document.documentElement.setAttribute('lang', lang);
    } catch {}
  };

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const t = (key: string): string => {
    if (TRANSLATIONS[key] && TRANSLATIONS[key][language]) {
      return TRANSLATIONS[key][language];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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
