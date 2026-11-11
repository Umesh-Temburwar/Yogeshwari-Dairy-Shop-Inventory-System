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
    en: 'Yogeshwari Dairy & Products ',
    hi: 'योगेश्वरी डेरी &उत्पादन',
    mr: 'योगेश्वरी डेअरी &उत्पादन'
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
  expiryNav: {
    en: 'Expiry Management',
    hi: 'एक्सपायरी डेट प्रबंधन',
    mr: 'मुदत समाप्ती व्यवस्थापन'
  },
  expirySub: {
    en: 'FEFO & Expiry Dashboard',
    hi: 'FEFO व एक्सपायरी डैशबोर्ड',
    mr: 'FEFO व मुदत समाप्ती डॅशबोर्ड'
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
    en: 'Rent, Electricity Bill & Fuel',
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
  },

  // POS & Billing
  currentBill: {
    en: 'Current Bill',
    hi: 'चालू बिल (Cart)',
    mr: 'चालू बिल (Cart)'
  },
  emptyCart: {
    en: 'Clear Bill',
    hi: 'बिल खाली करें',
    mr: 'बिल रिकामे करा'
  },
  customerName: {
    en: 'Customer Name',
    hi: 'ग्राहक का नाम',
    mr: 'ग्राहकाचे नाव'
  },
  customerPhone: {
    en: 'Phone Number',
    hi: 'मोबाइल नंबर',
    mr: 'मोबाईल नंबर'
  },
  cartEmptyMsg: {
    en: 'No items in cart. Click on products to add to bill.',
    hi: 'बिल में कोई सामान नहीं है। जोड़ने के लिए उत्पादों पर क्लिक करें।',
    mr: 'बिलामध्ये कोणतेही उत्पादन जोडलेले नाही. जोडण्यासाठी उत्पादनावर क्लिक करा.'
  },
  subtotal: {
    en: 'Subtotal',
    hi: 'उप-कुल (Subtotal)',
    mr: 'उप-एकूण (Subtotal)'
  },
  discount: {
    en: 'Discount (₹)',
    hi: 'छूट (Discount ₹)',
    mr: 'सूट (Discount ₹)'
  },
  netAmount: {
    en: 'Net Payable',
    hi: 'कुल देय राशि',
    mr: 'एकूण देय रक्कम'
  },
  paymentMethod: {
    en: 'Payment Method',
    hi: 'भुगतान का तरीका',
    mr: 'पेमेंट पद्धत'
  },
  cash: {
    en: 'Cash',
    hi: 'रोकड़ (Cash)',
    mr: 'रोख (Cash)'
  },
  onlineUpi: {
    en: 'Online UPI / QR',
    hi: 'ऑनलाइन UPI / QR',
    mr: 'ऑनलाईन UPI / QR'
  },
  splitPay: {
    en: 'Split Payment',
    hi: 'आधा कैश आधा UPI (Split)',
    mr: 'विभागून पेमेंट (Split)'
  },
  udharPay: {
    en: 'Credit (Udhar)',
    hi: 'उधार खाता (Udhar)',
    mr: 'उधारी खाते (Udhar)'
  },
  cashReceived: {
    en: 'Cash Received',
    hi: 'ग्राहक से प्राप्त रोकड़',
    mr: 'ग्राहकाकडून आलेली रोख'
  },
  changeToReturn: {
    en: 'Change to Return',
    hi: 'ग्राहक को वापस देने हैं',
    mr: 'ग्राहकाला परत द्यायचे'
  },
  completeAndPrint: {
    en: 'Save & Print Invoice',
    hi: 'बिल पूरा करें और प्रिंट निकालें',
    mr: 'बिल पूर्ण करा आणि प्रिंट काढा'
  },
  nextBill: {
    en: 'New Bill (F2)',
    hi: 'नया बिल काटें (F2)',
    mr: 'नवीन बिल फाडा (F2)'
  },
  measureInRupees: {
    en: 'Quick Rupees to Quantity',
    hi: 'रुपयों में मात्रा निकालें',
    mr: 'रुपयांचे प्रमाण काढा'
  },
  enterRupees: {
    en: 'Enter Amount (₹)',
    hi: 'रुपये दर्ज करें (₹)',
    mr: 'रुपये टाका (₹)'
  },
  calculatedQuantityIs: {
    en: 'Calculated Quantity',
    hi: 'निकाली गई मात्रा',
    mr: 'काढलेले प्रमाण'
  },
  addToBasket: {
    en: 'Add to Bill',
    hi: 'बिल में जोड़ें',
    mr: 'बिलात जोडा'
  },

  // Stock & Reorder
  reorderTitle: {
    en: 'Stock Need & Reorder Sheet',
    hi: 'माल ज़रूरत एवं पुनः खरीद मांग पत्र',
    mr: 'माल तुटवडा आणि पुन्हा मागणी यादी'
  },
  reorderDesc: {
    en: 'Automated order sheet for products reaching low or zero stock',
    hi: 'खत्म या कम होने वाले माल की सप्लायर/किसान हेतु स्वचालित आर्डर लिस्ट',
    mr: 'कमी किंवा संपलेल्या मालासाठी शेतकरी/सप्लायरकडे द्यायची स्वयंचलित ऑर्डर यादी'
  },
  orderCopied: {
    en: 'Order list copied to clipboard!',
    hi: 'ऑर्डर लिस्ट क्लिपबोर्ड पर कॉपी हो गई!',
    mr: 'ऑर्डर यादी क्लिपबोर्डवर कॉपी झाली!'
  },
  copyWhatsAppOrder: {
    en: 'Copy WhatsApp Order',
    hi: 'व्हाट्सएप आर्डर कॉपी करें',
    mr: 'व्हॉट्सॲप ऑर्डर कॉपी करा'
  },
  recommendedOrderQty: {
    en: 'Suggested Order',
    hi: 'सुझाई गई मांग',
    mr: 'मागवायची शिफारस'
  },
  productNameCol: {
    en: 'Product Name',
    hi: 'उत्पाद का नाम',
    mr: 'उत्पादनाचे नाव'
  },
  categoryCol: {
    en: 'Category',
    hi: 'वर्ग (Category)',
    mr: 'प्रवर्ग (Category)'
  },
  currentStockCol: {
    en: 'Current Stock',
    hi: 'मौजूदा स्टॉक',
    mr: 'सध्याचा साठा'
  },
  costPriceCol: {
    en: 'Purchase Rate',
    hi: 'खरीद भाव',
    mr: 'खरेदी दर'
  },
  sellingPriceCol: {
    en: 'Selling Rate',
    hi: 'बिक्री भाव',
    mr: 'विक्री दर'
  },
  unitCol: {
    en: 'Unit',
    hi: 'इकाई (Unit)',
    mr: 'एकक (Unit)'
  },
  actionsCol: {
    en: 'Action',
    hi: 'कार्रवाई',
    mr: 'कृती'
  },

  // Khata / Udhar
  khataTitle: {
    en: 'Customer Udhar Khata Book',
    hi: 'ग्राहक उधारी खाता बही (लेजर)',
    mr: 'ग्राहक उधारी खातेवही (लेजर)'
  },
  debtorsOnly: {
    en: 'Pending Udhar',
    hi: 'बाकीदार ग्राहक',
    mr: 'बाकीदार ग्राहक'
  },
  clearedAccounts: {
    en: 'Cleared Accounts',
    hi: 'बेबाक खाते',
    mr: 'पूर्ण चुकते खाते'
  },
  allAccounts: {
    en: 'All Accounts',
    hi: 'सभी खाते',
    mr: 'सर्व खाती'
  },
  balanceDue: {
    en: 'Pending Balance',
    hi: 'कुल बाकी रकम',
    mr: 'बाकी शिल्लक'
  },
  recordPaymentJama: {
    en: 'Receive Payment',
    hi: 'जमा प्राप्त करें',
    mr: 'रक्कम जमा घ्या'
  },
  sendWhatsAppReminder: {
    en: 'WhatsApp Reminder',
    hi: 'व्हाट्सएप तगादा',
    mr: 'व्हॉट्सॲप स्मरणपत्र'
  },

  // Damages & Spoilage
  damageTitle: {
    en: 'Damages & Spoilage Tracker',
    hi: 'खराब व नासलेला माल हिशोब',
    mr: 'खराब व नासलेला माल नोंदवही'
  },
  logDamage: {
    en: 'Record Damage',
    hi: 'खराबी दर्ज करें',
    mr: 'खराब माल नोंदवा'
  },
  curdledMilk: {
    en: 'Curdled Milk',
    hi: 'दूध फट गया (नासले)',
    mr: 'दूध नासले/फाटले'
  },
  leakedPouch: {
    en: 'Leaked Pouch',
    hi: 'थैली लीकेज/फटी',
    mr: 'पिशवी लिकेज झाली'
  },
  expiredProduct: {
    en: 'Expired Product',
    hi: 'एक्सपायरी डेट खत्म',
    mr: 'मुदत संपली (Expired)'
  },
  handlingSpoilage: {
    en: 'Handling Loss',
    hi: 'दुकान में गिरा/टूटा',
    mr: 'हातातून पडले/नुकसान'
  },

  // Expenses & Investments
  expensesTitle: {
    en: 'Shop Expenses & Investment',
    hi: 'दुकान खर्च एवं निवेश लेजर',
    mr: 'दुकान खर्च आणि गुंतवणूक नोंद'
  },
  addExpense: {
    en: 'Add Expense / Investment',
    hi: 'खर्च या निवेश जोड़ें',
    mr: 'खर्च किंवा गुंतवणूक जोडा'
  },
  operatingExpenses: {
    en: 'Operating Expenses',
    hi: 'दैनिक दुकान खर्च (Opex)',
    mr: 'दैनिक दुकान खर्च (Opex)'
  },
  capitalInvestments: {
    en: 'Shop Investment (Assets)',
    hi: 'दुकान में निवेश (मशीनरी/फ्रीजर)',
    mr: 'दुकान गुंतवणूक (मशिनरी/फ्रीज)'
  },
  shopRent: {
    en: 'Shop Rent',
    hi: 'दुकान किराया',
    mr: 'दुकान भाडे'
  },
  lightBill: {
    en: 'Electricity Bill',
    hi: 'बिजली/लाइट बिल',
    mr: 'लाईट बिल'
  },
  fuelPetrol: {
    en: 'Vehicle Petrol/Diesel',
    hi: 'गाड़ी पेट्रोल/डीजल',
    mr: 'गाडी पेट्रोल/डिझेल'
  },
  chillerMaint: {
    en: 'Chiller / Deep Freezer Maint',
    hi: 'डीप फ्रीजर/चिलर रिपेयर',
    mr: 'चिलर/फ्रीजर दुरुस्ती'
  },
  staffSalary: {
    en: 'Staff Salary',
    hi: 'कर्मचारी पगार',
    mr: 'कर्मचारी पगार'
  },

  // Analytics & P&L
  plStatement: {
    en: 'Profit & Loss Statement',
    hi: 'लाभ एवं हानि विवरण (P&L)',
    mr: 'नफा व तोटा पत्रक (P&L)'
  },
  netPocketProfit: {
    en: 'Net Pocket Profit',
    hi: 'शुद्ध जेब में आया मुनाफा',
    mr: 'खिशात राहिलेला निव्वळ नफा'
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
    mr: 'दही व ताक'
  },
  catPaneer: {
    en: 'Paneer & Butter',
    hi: 'पनीर व मक्खन',
    mr: 'पनीर व लोणी'
  },
  catGhee: {
    en: 'Ghee',
    hi: 'शुद्ध घी',
    mr: 'शुद्ध तूप'
  },
  catSweets: {
    en: 'Sweets & Khoya',
    hi: 'मिठाई व खोया',
    mr: 'मिठाई व खवा'
  },
  catBakery: {
    en: 'Bakery & Extras',
    hi: 'बेकरी व अन्य',
    mr: 'बेकरी व इतर'
  },
  // Customer Demographics Translations
  customerGender: {
    en: 'Customer Gender',
    hi: 'ग्राहक का लिंग',
    mr: 'ग्राहकाचे लिंग'
  },
  customerAge: {
    en: 'Age',
    hi: 'उम्र (वर्ष)',
    mr: 'वय (वर्षे)'
  },
  customerAgeGroup: {
    en: 'Age Group',
    hi: 'आयु वर्ग',
    mr: 'वय गट'
  },
  male: {
    en: 'Male',
    hi: 'पुरुष',
    mr: 'पुरुष'
  },
  female: {
    en: 'Female',
    hi: 'महिला',
    mr: 'महिला'
  },
  otherGender: {
    en: 'Other',
    hi: 'अन्य',
    mr: 'इतर'
  },
  ageKids: {
    en: 'Kids/Teens (<18)',
    hi: 'बच्चे/किशोर (<18)',
    mr: 'मुले/किशोर (<१८)'
  },
  ageYouth: {
    en: 'Youth (18-25)',
    hi: 'युवा (18-25)',
    mr: 'तरुण/युवा (१८-२५)'
  },
  ageAdults: {
    en: 'Adults (26-45)',
    hi: 'प्रौढ़ (26-45)',
    mr: 'प्रौढ (२६-४५)'
  },
  ageSeniors: {
    en: 'Seniors (45+)',
    hi: 'वरिष्ठ (45+)',
    mr: 'ज्येष्ठ नागरिक (४५+)'
  },
  demographicsTitle: {
    en: 'Customer Demographics & Buying Intelligence',
    hi: 'ग्राहक जनसांख्यिकी और उत्पाद प्राथमिकता (Customer Demographics)',
    mr: 'ग्राहक डेमोग्राफिक्स व खरेदी कल (Customer Demographics)'
  },
  demographicsSub: {
    en: 'Track which gender and age group buys which dairy products and quantities',
    hi: 'किस उम्र और जेंडर के ग्राहक कौनसा माल कितना खरीदते हैं उसका पूरा विश्लेषण',
    mr: 'कोणत्या वयाचे व लिंगाचे ग्राहक कोणता माल किती प्रमाणात खरेदी करतात याचे संपूर्ण विश्लेषण'
  },
  genderBreakdown: {
    en: 'Gender-wise Sales & Volume',
    hi: 'जेंडर अनुसार बिक्री व मात्रा',
    mr: 'लिंगानुसार विक्री व प्रमाण'
  },
  ageBreakdown: {
    en: 'Age Group Product Preference',
    hi: 'आयु वर्ग अनुसार उत्पाद प्राथमिकता',
    mr: 'वय गटानुसार उत्पादन प्राधान्य'
  },
  whoBuysWhat: {
    en: 'Who Buys What? (Product Demographics)',
    hi: 'कौनसा ग्राहक क्या खरीदता है? (Product Demographics)',
    mr: 'कोणता ग्राहक काय खरेदी करतो? (Product Demographics)'
  },
  whoBuysWhatSub: {
    en: 'Breakdown of buyers by gender and age group for every dairy product',
    hi: 'प्रत्येक डेयरी उत्पाद के लिए जेंडर और आयु वर्ग का विस्तृत ब्यौरा',
    mr: 'प्रत्येक डेअरी उत्पादनासाठी लिंग आणि वय गटानुसार सविस्तर तपशील'
  },
  topBuyerGender: {
    en: 'Top Buyer Gender',
    hi: 'मुख्य खरीदार जेंडर',
    mr: 'मुख्य खरेदीदार लिंग'
  },
  topBuyerAge: {
    en: 'Top Age Group',
    hi: 'मुख्य आयु वर्ग',
    mr: 'मुख्य वय गट'
  },
  filterByGender: {
    en: 'Filter by Gender',
    hi: 'जेंडर से छांटें',
    mr: 'लिंगानुसार फिल्टर'
  },
  filterByAge: {
    en: 'Filter by Age',
    hi: 'आयु वर्ग से छांटें',
    mr: 'वय गटानुसार फिल्टर'
  },
  allGenders: {
    en: 'All Genders',
    hi: 'सभी जेंडर',
    mr: 'सर्व लिंग'
  },
  allAges: {
    en: 'All Age Groups',
    hi: 'सभी आयु वर्ग',
    mr: 'सर्व वय गट'
  },
  maleBuyers: {
    en: 'Male Buyers',
    hi: 'पुरुष ग्राहक',
    mr: 'पुरुष ग्राहक'
  },
  femaleBuyers: {
    en: 'Female Buyers',
    hi: 'महिला ग्राहक',
    mr: 'महिला ग्राहक'
  },
  batchNo: {
    en: 'Batch No.',
    hi: 'बैच नंबर',
    mr: 'बॅच क्रमांक'
  },
  mfgDate: {
    en: 'Mfg Date',
    hi: 'उत्पादन तारीख (Mfg)',
    mr: 'उत्पादन तारीख (Mfg)'
  },
  expiryDate: {
    en: 'Expiry Date',
    hi: 'एक्सपायरी तारीख',
    mr: 'मुदत समाप्ती तारीख (Expiry)'
  },
  shelfLife: {
    en: 'Shelf Life',
    hi: 'शेल्फ लाइफ',
    mr: 'टिकण्याची मुदत'
  },
  batches: {
    en: 'Batches',
    hi: 'बैचेस',
    mr: 'बॅचेस'
  },
  viewBatches: {
    en: 'View Batches',
    hi: 'बैच देखें',
    mr: 'बॅचेस पहा'
  },
  manageBatches: {
    en: 'Manage Batches',
    hi: 'बैच प्रबंधित करें',
    mr: 'बॅच व्यवस्थापन'
  },
  activeBatches: {
    en: 'Active Batches',
    hi: 'सक्रिय बैचेस',
    mr: 'सक्रिय बॅचेस'
  },
  allBatches: {
    en: 'All Batches',
    hi: 'सभी बैचेस',
    mr: 'सर्व बॅचेस'
  },
  expiredBatches: {
    en: 'Expired Batches',
    hi: 'एक्सपायर्ड बैचेस',
    mr: 'मुदत संपलेल्या बॅचेस'
  },
  expiringToday: {
    en: 'Expiring Today',
    hi: 'आज एक्सपायर होने वाले',
    mr: 'आज मुदत संपणारे'
  },
  expiringTomorrow: {
    en: 'Expiring Tomorrow',
    hi: 'कल एक्सपायर होने वाले',
    mr: 'उद्या मुदत संपणारे'
  },
  freshBatches: {
    en: 'Fresh Batches',
    hi: 'ताज़ा बैचेस',
    mr: 'ताजा बॅचेस'
  },
  markDamage: {
    en: 'Mark Spoilage/Damage',
    hi: 'खराब माल दर्ज करें',
    mr: 'खराब माल नोंदवा'
  },
  autoSuggestedExpiry: {
    en: 'Auto-suggested by variety shelf-life',
    hi: 'उत्पाद वेरायटी अनुसार सुझाई गई तारीख',
    mr: 'उत्पादन प्रकारानुसार सुचवलेली तारीख'
  },
  lotType: {
    en: 'Lot / Arrival Type',
    hi: 'लॉट / आवक प्रकार',
    mr: 'लॉट / आवक प्रकार'
  },
  freshTodayLot: {
    en: "Today's Fresh Arrival",
    hi: 'आज का ताज़ा माल (Fresh Lot)',
    mr: 'आजचा ताजा माल (नवीन लॉट)'
  },
  previousLot: {
    en: 'Previous / Earlier Stock',
    hi: 'पहले का / पुराना माल (Past Lot)',
    mr: 'आधीचा / मागील माल (शिल्लक लॉट)'
  },
  addToExistingBatch: {
    en: 'Add to Existing Batch',
    hi: 'मौजूदा पुराने बैच में जोड़ें',
    mr: 'आधीच्या चालू बॅचमध्ये वाढवा'
  },
  createNewBatch: {
    en: 'Create New Batch Entry',
    hi: 'नया अलग बैच दर्ज करें',
    mr: 'नवीन वेगळी बॅच नोंद'
  },
  multiLotEntry: {
    en: 'Multi-Lot Split Entry',
    hi: 'अलग-अलग एक्सपायरी के लॉट्स',
    mr: 'एकाच वेळी विविध लॉट नोंदी'
  },
  addAnotherLot: {
    en: '+ Add Another Lot',
    hi: '+ एक और लॉट जोड़ें',
    mr: '+ आणखी एक लॉट जोडा'
  },
  removeLot: {
    en: 'Remove Lot',
    hi: 'लॉट हटाएं',
    mr: 'लॉट काढा'
  },
  selectBatch: {
    en: 'Select Batch',
    hi: 'बैच चुनें',
    mr: 'बॅच निवडा'
  },
  totalInward: {
    en: 'Total Inward Stock',
    hi: 'कुल आवक स्टॉक',
    mr: 'एकूण आवक साठा'
  },
  newTotalStock: {
    en: 'New Shop Stock',
    hi: 'नया कुल स्टॉक',
    mr: 'नवीन एकूण शिल्लक'
  },
  stockInModalTitle: {
    en: 'Add Stock & Batch Expiry Entry',
    hi: 'माल आवक व बैच एक्सपायरी एंट्री',
    mr: 'माल आवक व बॅच मुदत नोंद'
  },
  // Auth & Login Page Translations (100% pure en / hi / mr)
  authErpBadge: {
    en: 'Commercial Dairy ERP System',
    hi: 'व्यावसायिक डेयरी ईआरपी सिस्टम',
    mr: 'व्यावसायिक डेअरी ईआरपी प्रणाली'
  },
  authHeadline: {
    en: 'Milk Collection, Batch Inventory & Counter POS',
    hi: 'दूध संकलन, बैच इन्वेंटरी और तेज़ काउंटर बिलिंग',
    mr: 'दूध संकलन, बॅच इन्व्हेंटरी आणि काउंटर बिलिंग'
  },
  authDescription: {
    en: 'Farmer fat/SNF milk purchases, multi-batch FEFO inventory tracking, digital customer credit khata, and real-time profit analytics.',
    hi: 'किसान दूध खरीद, बैच-वाइज एक्सपायरी ट्रैकिंग (FEFO), उधारी खाता और दैनिक शुद्ध मुनाफा।',
    mr: 'शेतकरी दूध फॅट खरेदी, बॅचनिहाय मुदत समाप्ती (FEFO), ग्राहकांचे उधारी खाते आणि दैनंदिन नफा-तोटा एकाच छताखाली.'
  },
  authFeatureBatchTitle: {
    en: 'Multi-Batch Inventory',
    hi: 'मल्टी-बैच इन्वेंटरी',
    mr: 'मल्टि-बॅच इन्व्हेंटरी'
  },
  authFeatureBatchDesc: {
    en: 'Unique expiry & purchase cost for each batch',
    hi: 'प्रत्येक बैच की अलग एक्सपायरी व खरीद भाव',
    mr: 'प्रत्येक बॅचची स्वतंत्र एक्सपायरी व खरेदी दर'
  },
  authFeatureFefoTitle: {
    en: 'FEFO Expiry Alerts',
    hi: 'FEFO एक्सपायरी अलर्ट',
    mr: 'FEFO मुदत समाप्ती अलर्ट'
  },
  authFeatureFefoDesc: {
    en: 'First Expiry First Out sales deduction & blocking',
    hi: 'पहले एक्सपायर होने वाला माल पहले बेचना व ब्लॉक',
    mr: 'आधीचा माल आधी विकणे व मुदत संपलेला ब्लॉक'
  },
  authFeatureBillingTitle: {
    en: 'Fast Counter Billing',
    hi: 'तेज़ काउंटर बिलिंग',
    mr: 'जलद काउंटर बिलिंग'
  },
  authFeatureBillingDesc: {
    en: 'Cash, UPI, split payments & demographic insights',
    hi: 'कैश, ऑनलाइन पेमेंट व ग्राहक डेमोग्राफिक्स',
    mr: 'कॅश, UPI आणि ग्राहक वय/लिंग विश्लेषण'
  },
  authFeatureCloudTitle: {
    en: 'Secure Cloud Sync',
    hi: 'सुरक्षित क्लाउड सिंक',
    mr: 'सुरक्षित क्लाउड सिंक'
  },
  authFeatureCloudDesc: {
    en: 'Supabase PostgreSQL database & RLS security',
    hi: 'सुपाबेस क्लाउड बैकअप व RLS सुरक्षा',
    mr: 'सुपाबेस PostgreSQL डेटाबेस आणि RLS सुरक्षा'
  },
  authEnterpriseGrade: {
    en: 'Enterprise Grade',
    hi: 'एंटरप्राइज ग्रेड',
    mr: 'एंटरप्राइझ ग्रेड'
  },
  authCopyright: {
    en: 'Yogeshwari Dairy ERP. All rights reserved.',
    hi: 'योगेश्वरी डेरी ईआरपी. सर्वाधिकार सुरक्षित.',
    mr: 'योगेश्वरी डेअरी ईआरपी. सर्व हक्क राखीव.'
  },
  authSignInTitle: {
    en: 'Sign in to your account',
    hi: 'अपने खाते में साइन इन करें',
    mr: 'तुमच्या खात्यामध्ये साइन इन करा'
  },
  authSignInSubtitle: {
    en: 'Enter your credentials to continue',
    hi: 'आगे बढ़ने के लिए अपना विवरण दर्ज करें',
    mr: 'पुढे जाण्यासाठी तुमचा तपशील प्रविष्ट करा'
  },
  authSignUpTitle: {
    en: 'Create a new account',
    hi: 'नया ऑपरेटर खाता बनाएं',
    mr: 'नवीन ऑपरेटर खाते तयार करा'
  },
  authSignUpSubtitle: {
    en: 'Register a new dairy operator account',
    hi: 'डेयरी प्रबंधन के लिए नया ऑपरेटर जोड़ें',
    mr: 'डेअरी व्यवस्थापनासाठी नवीन ऑपरेटर जोडा'
  },
  authForgotTitle: {
    en: 'Reset your password',
    hi: 'अपना पासवर्ड रीसेट करें',
    mr: 'तुमचा पासवर्ड रीसेट करा'
  },
  authForgotSubtitle: {
    en: 'Enter your email to receive a password reset link',
    hi: 'पासवर्ड रीसेट लिंक प्राप्त करने के लिए ईमेल दर्ज करें',
    mr: 'पासवर्ड रीसेट लिंक मिळवण्यासाठी ईमेल प्रविष्ट करा'
  },
  authContinueGoogle: {
    en: 'Continue with Google',
    hi: 'गूगल से जारी रखें',
    mr: 'गुगलद्वारे चालू ठेवा'
  },
  authOrWithEmail: {
    en: 'or with email',
    hi: 'या ईमेल से',
    mr: 'किंवा ईमेलने'
  },
  authFullName: {
    en: 'Full Name',
    hi: 'पूरा नाम',
    mr: 'पूर्ण नाव'
  },
  authFullNamePlaceholder: {
    en: 'e.g. Ramesh Patil',
    hi: 'उदा. रमेश पाटील',
    mr: 'उदा. रमेश पाटील'
  },
  authEmail: {
    en: 'Email address',
    hi: 'ईमेल पता',
    mr: 'ईमेल पत्ता'
  },
  authEmailPlaceholder: {
    en: 'name@yogeshwaridairy.com',
    hi: 'name@yogeshwaridairy.com',
    mr: 'name@yogeshwaridairy.com'
  },
  authPassword: {
    en: 'Password',
    hi: 'पासवर्ड',
    mr: 'पासवर्ड'
  },
  authPasswordPlaceholder: {
    en: '••••••••',
    hi: '••••••••',
    mr: '••••••••'
  },
  authRememberMe: {
    en: 'Remember me',
    hi: 'मुझे याद रखें',
    mr: 'माझी नोंद ठेवा'
  },
  authForgotPassword: {
    en: 'Forgot password?',
    hi: 'पासवर्ड भूल गए?',
    mr: 'पासवर्ड विसरलात?'
  },
  authSignInButton: {
    en: 'Sign in',
    hi: 'साइन इन करें',
    mr: 'साइन इन करा'
  },
  authSigningIn: {
    en: 'Signing in...',
    hi: 'साइन इन हो रहा है...',
    mr: 'साइन इन होत आहे...'
  },
  authCreateAccountButton: {
    en: 'Create account',
    hi: 'खाता बनाएं',
    mr: 'खाते तयार करा'
  },
  authCreatingAccount: {
    en: 'Creating account...',
    hi: 'खाता बन रहा है...',
    mr: 'खाते तयार होत आहे...'
  },
  authSendResetLink: {
    en: 'Send reset link',
    hi: 'रीसेट लिंक भेजें',
    mr: 'रीसेट लिंक पाठवा'
  },
  authSendingResetLink: {
    en: 'Sending link...',
    hi: 'लिंक भेजी जा रही है...',
    mr: 'लिंक पाठवत आहे...'
  },
  authBackToSignIn: {
    en: 'Back to sign in',
    hi: 'साइन इन पर वापस जाएं',
    mr: 'साइन इनवर परत जा'
  },
  authNewOperator: {
    en: 'New operator?',
    hi: 'नए ऑपरेटर हैं?',
    mr: 'नवीन ऑपरेटर आहात?'
  },
  authRegisterHere: {
    en: 'Register here',
    hi: 'यहाँ रजिस्टर करें',
    mr: 'येथे नोंदणी करा'
  },
  authAlreadyHaveAccount: {
    en: 'Already have an account?',
    hi: 'पहले से खाता है?',
    mr: 'आधीच खाते आहे?'
  },
  authGuestMode: {
    en: 'Continue in Guest / Demo mode',
    hi: 'डेमो मोड में जारी रखें',
    mr: 'डेमो मोडमध्ये चालू ठेवा'
  },
  authFooterHelp: {
    en: 'For technical help or credential access, contact dairy management.',
    hi: 'तकनीकी सहायता या लॉगिन क्रेडेंशियल के लिए डेरी प्रबंधक से संपर्क करें।',
    mr: 'तांत्रिक मदत किंवा लॉगिन क्रेडेंशियलसाठी डेअरी व्यवस्थापनाशी संपर्क साधा.'
  },
  authCapsLockOn: {
    en: 'Caps Lock is ON',
    hi: 'कैप्स लॉक चालू है',
    mr: 'कॅप्स लॉक सुरू आहे'
  },
  authShowPassword: {
    en: 'Show password',
    hi: 'पासवर्ड दिखाएं',
    mr: 'पासवर्ड दाखवा'
  },
  authHidePassword: {
    en: 'Hide password',
    hi: 'पासवर्ड छुपाएं',
    mr: 'पासवर्ड लपवा'
  },
  authToggleTheme: {
    en: 'Toggle color theme',
    hi: 'कलर थीम बदलें',
    mr: 'रंग थीम बदला'
  },
  authSkipToForm: {
    en: 'Skip to login form',
    hi: 'सीधे लॉगिन फॉर्म पर जाएं',
    mr: 'थेट लॉगिन फॉर्मवर जा'
  },
  authEmailRequired: {
    en: 'Email address is required',
    hi: 'ईमेल पता आवश्यक है',
    mr: 'ईमेल पत्ता आवश्यक आहे'
  },
  authEmailInvalid: {
    en: 'Please enter a valid email address',
    hi: 'कृपया एक मान्य ईमेल पता दर्ज करें',
    mr: 'कृपया वैध ईमेल पत्ता प्रविष्ट करा'
  },
  authPasswordRequired: {
    en: 'Password is required',
    hi: 'पासवर्ड आवश्यक है',
    mr: 'पासवर्ड आवश्यक आहे'
  },
  authPasswordMinLength: {
    en: 'Password must be at least 6 characters',
    hi: 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए',
    mr: 'पासवर्ड किमान ६ अक्षरांचा असावा'
  },
  authFullNameRequired: {
    en: 'Full name is required',
    hi: 'पूरा नाम आवश्यक है',
    mr: 'पूर्ण नाव आवश्यक आहे'
  },
  authInvalidCredentials: {
    en: 'Invalid email or password',
    hi: 'अमान्य ईमेल या पासवर्ड',
    mr: 'अवैध ईमेल किंवा पासवर्ड'
  },
  authTooManyAttempts: {
    en: 'Too many attempts. Please wait a moment and try again.',
    hi: 'बहुत सारे प्रयास। कृपया कुछ देर प्रतीक्षा करें और पुनः प्रयास करें।',
    mr: 'अनेक प्रयत्न झाले. कृपया थोडा वेळ प्रतीक्षा करून पुन्हा प्रयत्न करा.'
  },
  authNetworkError: {
    en: 'Network error. Please check your internet connection.',
    hi: 'नेटवर्क समस्या। कृपया अपना इंटरनेट कनेक्शन जांचें।',
    mr: 'नेटवर्क त्रुटी. कृपया तुमचे इंटरनेट कनेक्शन तपासा.'
  },
  authGoogleFailed: {
    en: 'Google sign-in was cancelled or failed. Please try again.',
    hi: 'गूगल साइन-इन रद्द हो गया या विफल रहा। कृपया पुनः प्रयास करें।',
    mr: 'गुगल साइन-इन रद्द झाले किंवा अयशस्वी झाले. कृपया पुन्हा प्रयत्न करा.'
  },
  authResetEmailSent: {
    en: 'Password reset link sent to your email.',
    hi: 'पासवर्ड रीसेट लिंक आपके ईमेल पर भेज दी गई है।',
    mr: 'पासवर्ड रीसेट लिंक तुमच्या ईमेलवर पाठवली आहे.'
  },
  authAccountCreated: {
    en: 'Account created successfully! Please sign in.',
    hi: 'खाता सफलतापूर्वक बन गया! कृपया साइन इन करें।',
    mr: 'खाते यशस्वीरित्या तयार झाले! कृपया साइन इन करा.'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  tText: (obj: { en: string; hi: string; mr: string }) => string;
  getProductDisplayName: (prod: any) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem('dairy_language') as Language;
      if (stored === 'en' || stored === 'hi' || stored === 'mr') {
        return stored;
      }
    } catch { }
    return 'mr'; // Default to Marathi as requested
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('dairy_language', lang);
      document.documentElement.setAttribute('lang', lang);
    } catch { }
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

  const tText = (obj: { en: string; hi: string; mr: string }): string => {
    return obj[language] || obj.en || '';
  };

  const getProductDisplayName = (prod: any): string => {
    if (!prod) return '';
    if (language === 'mr' && prod.marathi_name) return prod.marathi_name;
    if (language === 'hi' && prod.hindi_name) return prod.hindi_name;
    return prod.name || '';
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tText, getProductDisplayName }}>
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
