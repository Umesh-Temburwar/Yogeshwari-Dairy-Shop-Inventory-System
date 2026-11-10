import { Product, Sale, Purchase, DamageRecord, UdharCustomer, UdharTransaction, Expense } from '../types';
import { format, subDays } from 'date-fns';

const today = new Date();
const todayStr = format(today, 'yyyy-MM-dd');
const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');
const twoDaysAgoStr = format(subDays(today, 2), 'yyyy-MM-dd');
const fiveDaysAgoStr = format(subDays(today, 5), 'yyyy-MM-dd');
const tenDaysAgoStr = format(subDays(today, 10), 'yyyy-MM-dd');

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Fresh Buffalo Milk (Bhains Ka Doodh)',
    hindi_name: 'ताज़ा भैंस का दूध (फुल क्रीम)',
    marathi_name: 'ताजे म्हशीचे दूध (फुल फॅट)',
    category: 'Milk',
    unit: 'Litre',
    purchase_price: 58,
    selling_price: 70,
    stock_quantity: 110,
    min_stock_alert: 30,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-2',
    name: 'Desi Cow Milk (Gai Ka Doodh)',
    hindi_name: 'देसी गाय का शुद्ध दूध',
    marathi_name: 'शुद्ध देशी गाईचे दूध',
    category: 'Milk',
    unit: 'Litre',
    purchase_price: 44,
    selling_price: 56,
    stock_quantity: 80,
    min_stock_alert: 25,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-3',
    name: 'Toned Milk Pouch (500ml)',
    hindi_name: 'टोन्ड दूध थैली (500 मिली)',
    marathi_name: 'टोन्ड दूध पिशवी (५०० मिली)',
    category: 'Milk',
    unit: 'Packet (500ml)',
    purchase_price: 24,
    selling_price: 28,
    stock_quantity: 14, // Low stock on purpose to show alert
    min_stock_alert: 25,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-4',
    name: 'Fresh Malai Paneer',
    hindi_name: 'ताज़ा मलाई पनीर',
    marathi_name: 'ताजे मलाई पनीर (सॉफ्ट)',
    category: 'Paneer & Butter',
    unit: 'Kg',
    purchase_price: 310,
    selling_price: 380,
    stock_quantity: 6.5, // Low stock on purpose
    min_stock_alert: 10,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-5',
    name: 'Fresh Desi Dahi (Khula Curd)',
    hindi_name: 'ताज़ा मीठा दही (खुला)',
    marathi_name: 'ताजे गोड दही (सुटे)',
    category: 'Curd & Chaas',
    unit: 'Kg',
    purchase_price: 55,
    selling_price: 75,
    stock_quantity: 32,
    min_stock_alert: 15,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-6',
    name: 'Dahi Cup/Pouch (400g)',
    hindi_name: 'दही पाउच 400 ग्राम',
    marathi_name: 'दही कप / पाउच (४०० ग्रॅम)',
    category: 'Curd & Chaas',
    unit: 'Piece',
    purchase_price: 26,
    selling_price: 32,
    stock_quantity: 40,
    min_stock_alert: 15,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-7',
    name: 'Masala Chaas (Spiced Buttermilk)',
    hindi_name: 'ताज़ी मसाला छाछ पाउच',
    marathi_name: 'मसाला ताक पिशवी',
    category: 'Curd & Chaas',
    unit: 'Packet (500ml)',
    purchase_price: 11,
    selling_price: 15,
    stock_quantity: 65,
    min_stock_alert: 20,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-8',
    name: 'Desi Cow Ghee (Pure Jar)',
    hindi_name: 'शुद्ध देसी गाय का घी',
    marathi_name: 'शुद्ध साजूक गाईचे तूप',
    category: 'Ghee',
    unit: 'Kg',
    purchase_price: 590,
    selling_price: 740,
    stock_quantity: 18,
    min_stock_alert: 5,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-9',
    name: 'Danedaar Buffalo Ghee',
    hindi_name: 'दानेदार भैंस का शुद्ध घी',
    marathi_name: 'दाणेदार म्हशीचे शुद्ध तूप',
    category: 'Ghee',
    unit: 'Kg',
    purchase_price: 540,
    selling_price: 680,
    stock_quantity: 22,
    min_stock_alert: 6,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-10',
    name: 'Safed Makkhan (White Butter)',
    hindi_name: 'ताज़ा सफेद मक्खन',
    marathi_name: 'ताजे पांढरे लोणी',
    category: 'Paneer & Butter',
    unit: 'Kg',
    purchase_price: 420,
    selling_price: 520,
    stock_quantity: 9,
    min_stock_alert: 4,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-11',
    name: 'Shuddh Khoya / Mawa (Pindi)',
    hindi_name: 'शुद्ध खोया / मावा (पिंडी)',
    marathi_name: 'शुद्ध खवा / मावा (पिंडी)',
    category: 'Sweets/Mithai',
    unit: 'Kg',
    purchase_price: 290,
    selling_price: 370,
    stock_quantity: 12,
    min_stock_alert: 5,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-12',
    name: 'Kaju Katli (Pure Ghee)',
    hindi_name: 'शाही काजू कतली',
    marathi_name: 'काजू कतली (साजूक तूप)',
    category: 'Sweets/Mithai',
    unit: 'Kg',
    purchase_price: 720,
    selling_price: 940,
    stock_quantity: 8,
    min_stock_alert: 3,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-13',
    name: 'Desi Ghee Gulab Jamun',
    hindi_name: 'गरम गुलाब जामुन',
    marathi_name: 'साजूक तुपातील गुलाबजाम',
    category: 'Sweets/Mithai',
    unit: 'Kg',
    purchase_price: 240,
    selling_price: 320,
    stock_quantity: 15,
    min_stock_alert: 5,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-14',
    name: 'Kulhad Sweet Lassi',
    hindi_name: 'कुल्हड़ मलाई लस्सी',
    marathi_name: 'कुल्हड मलाई लस्सी',
    category: 'Curd & Chaas',
    unit: 'Piece',
    purchase_price: 22,
    selling_price: 40,
    stock_quantity: 35,
    min_stock_alert: 10,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-15',
    name: 'Farm Fresh Eggs (Crate 30 pcs)',
    hindi_name: 'फार्म फ्रेश अंडे की क्रेट',
    marathi_name: 'फार्म फ्रेश अंडी (क्रेटी ३० नग)',
    category: 'Bakery & Extras',
    unit: 'Piece',
    purchase_price: 165,
    selling_price: 210,
    stock_quantity: 12,
    min_stock_alert: 4,
    is_active: true,
    created_at: new Date().toISOString()
  }
];

export const INITIAL_PURCHASES: Purchase[] = [
  {
    id: 'pur-1',
    product_id: 'prod-1',
    product_name: 'Fresh Buffalo Milk (Bhains Ka Doodh)',
    supplier_name: 'Rampal Dairy Farmer (Village Sangam)',
    quantity: 120,
    unit: 'Litre',
    purchase_price: 58,
    total_amount: 6960,
    payment_mode: 'Cash',
    purchase_date: todayStr,
    invoice_number: 'MILK-881',
    notes: 'Morning fresh buffalo milk batch, fat 7.2',
    created_at: new Date().toISOString()
  },
  {
    id: 'pur-2',
    product_id: 'prod-2',
    product_name: 'Desi Cow Milk (Gai Ka Doodh)',
    supplier_name: 'Kishanlal Desi Goshala',
    quantity: 80,
    unit: 'Litre',
    purchase_price: 44,
    total_amount: 3520,
    payment_mode: 'Online_UPI',
    purchase_date: todayStr,
    invoice_number: 'MILK-882',
    notes: 'Desi gir cow milk, pure quality',
    created_at: new Date().toISOString()
  },
  {
    id: 'pur-3',
    product_id: 'prod-4',
    product_name: 'Fresh Malai Paneer',
    supplier_name: 'Shree Krishna Paneer Bhandar',
    quantity: 15,
    unit: 'Kg',
    purchase_price: 310,
    total_amount: 4650,
    payment_mode: 'Online_UPI',
    purchase_date: yesterdayStr,
    invoice_number: 'PAN-104',
    notes: 'Soft malai paneer',
    created_at: subDays(today, 1).toISOString()
  },
  {
    id: 'pur-4',
    product_id: 'prod-8',
    product_name: 'Desi Cow Ghee (Pure Jar)',
    supplier_name: 'Banas Dairy Cooperative',
    quantity: 20,
    unit: 'Kg',
    purchase_price: 590,
    total_amount: 11800,
    payment_mode: 'Bank_Transfer',
    purchase_date: fiveDaysAgoStr,
    invoice_number: 'GHEE-92',
    notes: 'Batch of 1kg sealed tins',
    created_at: subDays(today, 5).toISOString()
  }
];

export const INITIAL_SALES: Sale[] = [
  {
    id: 'sale-1',
    invoice_no: 'YD-2026-001',
    customer_name: 'Counter Customer',
    customer_phone: '',
    total_amount: 210,
    discount: 0,
    net_amount: 210,
    payment_mode: 'Cash',
    cash_amount: 210,
    online_amount: 0,
    udhar_amount: 0,
    sale_date: todayStr,
    created_at: new Date().toISOString(),
    items: [
      {
        id: 'si-1',
        product_id: 'prod-1',
        product_name: 'Fresh Buffalo Milk (Bhains Ka Doodh)',
        quantity: 3,
        unit: 'Litre',
        unit_price: 70,
        purchase_cost: 58,
        total_price: 210
      }
    ]
  },
  {
    id: 'sale-2',
    invoice_no: 'YD-2026-002',
    customer_name: 'Sharma Halwai',
    customer_phone: '9823145678',
    total_amount: 1460,
    discount: 20,
    net_amount: 1440,
    payment_mode: 'Online_UPI',
    cash_amount: 0,
    online_amount: 1440,
    udhar_amount: 0,
    sale_date: todayStr,
    created_at: new Date().toISOString(),
    items: [
      {
        id: 'si-2',
        product_id: 'prod-1',
        product_name: 'Fresh Buffalo Milk (Bhains Ka Doodh)',
        quantity: 10,
        unit: 'Litre',
        unit_price: 70,
        purchase_cost: 58,
        total_price: 700
      },
      {
        id: 'si-3',
        product_id: 'prod-4',
        product_name: 'Fresh Malai Paneer',
        quantity: 2,
        unit: 'Kg',
        unit_price: 380,
        purchase_cost: 310,
        total_price: 760
      }
    ]
  },
  {
    id: 'sale-3',
    invoice_no: 'YD-2026-003',
    customer_name: 'Mahesh Bhai',
    customer_phone: '9890123456',
    total_amount: 500,
    discount: 0,
    net_amount: 500,
    payment_mode: 'Split',
    cash_amount: 200,
    online_amount: 300,
    udhar_amount: 0,
    sale_date: todayStr,
    created_at: new Date().toISOString(),
    items: [
      {
        id: 'si-4',
        product_id: 'prod-2',
        product_name: 'Desi Cow Milk (Gai Ka Doodh)',
        quantity: 2,
        unit: 'Litre',
        unit_price: 56,
        purchase_cost: 44,
        total_price: 112
      },
      {
        id: 'si-5',
        product_id: 'prod-5',
        product_name: 'Fresh Desi Dahi (Khula Curd)',
        quantity: 2,
        unit: 'Kg',
        unit_price: 75,
        purchase_cost: 55,
        total_price: 150
      },
      {
        id: 'si-6',
        product_id: 'prod-13',
        product_name: 'Desi Ghee Gulab Jamun',
        quantity: 0.74,
        unit: 'Kg',
        unit_price: 320,
        purchase_cost: 240,
        total_price: 238
      }
    ]
  },
  {
    id: 'sale-4',
    invoice_no: 'YD-2026-004',
    customer_name: 'Gupta General Store & Tea Stall',
    customer_phone: '9890123456',
    total_amount: 336,
    discount: 0,
    net_amount: 336,
    payment_mode: 'Udhar',
    cash_amount: 0,
    online_amount: 0,
    udhar_amount: 336,
    sale_date: todayStr,
    created_at: new Date().toISOString(),
    items: [
      {
        id: 'si-7',
        product_id: 'prod-2',
        product_name: 'Desi Cow Milk (Gai Ka Doodh)',
        quantity: 6,
        unit: 'Litre',
        unit_price: 56,
        purchase_cost: 44,
        total_price: 336
      }
    ]
  },
  // Yesterday's sales
  {
    id: 'sale-5',
    invoice_no: 'YD-2026-005',
    customer_name: 'Vikas General',
    customer_phone: '',
    total_amount: 3500,
    discount: 0,
    net_amount: 3500,
    payment_mode: 'Cash',
    cash_amount: 3500,
    online_amount: 0,
    udhar_amount: 0,
    sale_date: yesterdayStr,
    created_at: subDays(today, 1).toISOString(),
    items: [
      {
        id: 'si-8',
        product_id: 'prod-1',
        product_name: 'Fresh Buffalo Milk (Bhains Ka Doodh)',
        quantity: 25,
        unit: 'Litre',
        unit_price: 70,
        purchase_cost: 58,
        total_price: 1750
      },
      {
        id: 'si-9',
        product_id: 'prod-8',
        product_name: 'Desi Cow Ghee (Pure Jar)',
        quantity: 2,
        unit: 'Kg',
        unit_price: 740,
        purchase_cost: 590,
        total_price: 1480
      },
      {
        id: 'si-10',
        product_id: 'prod-7',
        product_name: 'Masala Chaas (Spiced Buttermilk)',
        quantity: 18,
        unit: 'Packet (500ml)',
        unit_price: 15,
        purchase_cost: 11,
        total_price: 270
      }
    ]
  },
  {
    id: 'sale-6',
    invoice_no: 'YD-2026-006',
    customer_name: 'Pooja Sweet Mart',
    customer_phone: '9833445566',
    total_amount: 4850,
    discount: 50,
    net_amount: 4800,
    payment_mode: 'Online_UPI',
    cash_amount: 0,
    online_amount: 4800,
    udhar_amount: 0,
    sale_date: yesterdayStr,
    created_at: subDays(today, 1).toISOString(),
    items: [
      {
        id: 'si-11',
        product_id: 'prod-11',
        product_name: 'Shuddh Khoya / Mawa (Pindi)',
        quantity: 8,
        unit: 'Kg',
        unit_price: 370,
        purchase_cost: 290,
        total_price: 2960
      },
      {
        id: 'si-12',
        product_id: 'prod-4',
        product_name: 'Fresh Malai Paneer',
        quantity: 5,
        unit: 'Kg',
        unit_price: 380,
        purchase_cost: 310,
        total_price: 1900
      }
    ]
  }
];

export const INITIAL_DAMAGES: DamageRecord[] = [
  {
    id: 'dmg-1',
    product_id: 'prod-1',
    product_name: 'Fresh Buffalo Milk (Bhains Ka Doodh)',
    quantity: 2.5,
    unit: 'Litre',
    estimated_loss_amount: 145,
    reason: 'Doodh Fat Gya (Curdled)',
    damage_date: todayStr,
    notes: 'Chiller temperature fluctuated due to power cut, morning 2.5L curdled (used for paneer/chhana)',
    created_at: new Date().toISOString()
  },
  {
    id: 'dmg-2',
    product_id: 'prod-3',
    product_name: 'Toned Milk Pouch (500ml)',
    quantity: 3,
    unit: 'Packet (500ml)',
    estimated_loss_amount: 72,
    reason: 'Theli Phat Gayi (Leaked)',
    damage_date: yesterdayStr,
    notes: 'Damaged in transit crate',
    created_at: subDays(today, 1).toISOString()
  },
  {
    id: 'dmg-3',
    product_id: 'prod-6',
    product_name: 'Dahi Cup/Pouch (400g)',
    quantity: 2,
    unit: 'Piece',
    estimated_loss_amount: 52,
    reason: 'Expiry Date Over',
    damage_date: fiveDaysAgoStr,
    notes: 'Shelf life expired',
    created_at: subDays(today, 5).toISOString()
  }
];

export const INITIAL_CUSTOMERS: UdharCustomer[] = [
  {
    id: 'cust-1',
    name: 'Sharma Halwai (Ramesh)',
    phone: '9823145678',
    address: 'Shop 14, Main Gol Market, Near Temple',
    total_credit: 8500,
    total_paid: 6100,
    current_balance: 2400,
    status: 'Active',
    last_transaction_date: todayStr,
    notes: 'Takes regular milk & paneer in bulk. Pays every Monday.',
    created_at: new Date().toISOString()
  },
  {
    id: 'cust-2',
    name: 'Gupta General Store & Tea Stall',
    phone: '9890123456',
    address: 'Bus Stand Auto Stand Corner',
    total_credit: 4200,
    total_paid: 2400,
    current_balance: 1800,
    status: 'Active',
    last_transaction_date: todayStr,
    notes: 'Takes 6L cow milk daily for tea stall',
    created_at: new Date().toISOString()
  },
  {
    id: 'cust-3',
    name: 'Sunita Tai (Flat 204)',
    phone: '9765432109',
    address: 'Flat 204, Sai Krupa Heights',
    total_credit: 1850,
    total_paid: 1850,
    current_balance: 0,
    status: 'Cleared',
    last_transaction_date: yesterdayStr,
    notes: 'Monthly residential customer, cleared yesterday via PhonePe',
    created_at: new Date().toISOString()
  },
  {
    id: 'cust-4',
    name: 'Deepak Sweet & Farsan Mart',
    phone: '9811223344',
    address: 'Gandhi Chowk, Next to Bank',
    total_credit: 6700,
    total_paid: 3200,
    current_balance: 3500,
    status: 'Overdue',
    last_transaction_date: tenDaysAgoStr,
    notes: 'Payment reminder sent twice, promise to pay on Friday',
    created_at: new Date().toISOString()
  }
];

export const INITIAL_UDHAR_TRANSACTIONS: UdharTransaction[] = [
  {
    id: 'ut-1',
    customer_id: 'cust-1',
    type: 'Payment_Received',
    amount: 3000,
    payment_mode: 'Online_UPI',
    notes: 'Weekly Monday settlement received via PhonePe',
    transaction_date: yesterdayStr,
    created_at: subDays(today, 1).toISOString()
  },
  {
    id: 'ut-2',
    customer_id: 'cust-2',
    type: 'Credit_Given',
    amount: 336,
    payment_mode: 'Cash',
    notes: '6L Cow milk for tea counter bill #YD-2026-004',
    transaction_date: todayStr,
    created_at: new Date().toISOString()
  }
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    title: 'Monthly Dairy Shop Rent',
    category: 'Dukan Rent',
    amount: 14000,
    payment_mode: 'Online_UPI',
    expense_date: format(subDays(today, 6), 'yyyy-MM-dd'),
    is_capital_investment: false,
    notes: 'Shop rent paid to landlord Mr. Vijay Patil',
    created_at: subDays(today, 6).toISOString()
  },
  {
    id: 'exp-2',
    title: 'Commercial 3-Chiller Power Bill',
    category: 'Light / Electricity Bill',
    amount: 5850,
    payment_mode: 'Online_UPI',
    expense_date: format(subDays(today, 12), 'yyyy-MM-dd'),
    is_capital_investment: false,
    notes: 'Electricity board bill for commercial dairy refrigeration',
    created_at: subDays(today, 12).toISOString()
  },
  {
    id: 'exp-3',
    title: 'Delivery Bike & Van Petrol',
    category: 'Gadi Petrol / Diesel',
    amount: 650,
    payment_mode: 'Cash',
    expense_date: todayStr,
    notes: 'Morning door-to-door milk delivery petrol',
    is_capital_investment: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'exp-4',
    title: 'Blue Star 500L Deep Freezer Chiller',
    category: 'Shop Capital Investment',
    amount: 34500,
    payment_mode: 'Online_UPI',
    expense_date: format(subDays(today, 18), 'yyyy-MM-dd'),
    is_capital_investment: true,
    notes: 'New commercial double door deep freezer for ice creams, curd & paneer preservation',
    created_at: subDays(today, 18).toISOString()
  },
  {
    id: 'exp-5',
    title: 'Dairy Polythene & Printed Carry Bags',
    category: 'Packaging / Theli',
    amount: 1450,
    payment_mode: 'Cash',
    expense_date: format(subDays(today, 3), 'yyyy-MM-dd'),
    is_capital_investment: false,
    notes: '1000 pcs food-grade heavy carry bags',
    created_at: subDays(today, 3).toISOString()
  },
  {
    id: 'exp-6',
    title: 'Digital High Precision Weighing Scale',
    category: 'Shop Capital Investment',
    amount: 3200,
    payment_mode: 'Cash',
    expense_date: format(subDays(today, 25), 'yyyy-MM-dd'),
    is_capital_investment: true,
    notes: 'Stamping certified digital scale for paneer and sweets counter',
    created_at: subDays(today, 25).toISOString()
  }
];

