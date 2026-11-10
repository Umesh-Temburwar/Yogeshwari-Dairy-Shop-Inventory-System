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
    en: 'Yogeshwari Dairy & Sweets',
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
