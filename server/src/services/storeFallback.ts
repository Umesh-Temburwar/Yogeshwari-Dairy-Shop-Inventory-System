export interface CategoryItem {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface BrandItem {
  id: string;
  name: string;
  created_at: string;
}

export interface UnitItem {
  id: string;
  name: string;
  short_code: string;
  created_at: string;
}

export interface SupplierItem {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gst_number: string | null;
  created_at: string;
}

export interface ProductItem {
  id: string;
  name: string;
  category_id: string;
  brand_id: string | null;
  unit_id: string;
  sku: string;
  barcode: string | null;
  purchase_price: number;
  selling_price: number;
  gst_percent: number;
  min_stock: number;
  max_stock: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  category?: CategoryItem;
  brand?: BrandItem;
  unit?: UnitItem;
  current_stock?: number;
  stock_status?: 'LOW' | 'NORMAL' | 'OVERSTOCK';
}

export interface BatchItem {
  id: string;
  product_id: string;
  batch_no: string;
  mfg_date: string;
  expiry_date: string;
  qty_received: number;
  qty_remaining: number;
  purchase_price: number;
  supplier_id: string | null;
  created_at: string;
  expiry_status?: 'EXPIRED' | 'EXPIRING_TODAY' | 'EXPIRING_TOMORROW' | 'EXPIRING_IN_3_DAYS' | 'FRESH';
  days_to_expiry?: number;
}

// Initial In-Memory Seed Store matching supabase/seed.sql
export const initialCategories: CategoryItem[] = [
  { id: 'c1000000-0000-0000-0000-000000000001', name: 'Milk & Cream', description: 'Fresh cow, buffalo, toned, and double-toned milk', created_at: new Date().toISOString() },
  { id: 'c1000000-0000-0000-0000-000000000002', name: 'Paneer & Tofu', description: 'Fresh malai paneer, soft paneer blocks, and diced paneer', created_at: new Date().toISOString() },
  { id: 'c1000000-0000-0000-0000-000000000003', name: 'Curd & Chaas', description: 'Desi dahi, flavored yogurt, lassi, and buttermilk pouches', created_at: new Date().toISOString() },
  { id: 'c1000000-0000-0000-0000-000000000004', name: 'Butter & Cheese', description: 'Table butter, white butter, cheese cubes, blocks, and slices', created_at: new Date().toISOString() },
  { id: 'c1000000-0000-0000-0000-000000000005', name: 'Pure Ghee', description: 'Pure desi cow ghee, buffalo danedaar ghee, and cooking ghee', created_at: new Date().toISOString() },
  { id: 'c1000000-0000-0000-0000-000000000006', name: 'Sweets & Khoya', description: 'Fresh mawa/khoya, gulab jamun, rasgulla, and kaju katli', created_at: new Date().toISOString() },
  { id: 'c1000000-0000-0000-0000-000000000007', name: 'Ice Cream & Kulfi', description: 'Tubs, cups, family packs, and traditional matka kulfi', created_at: new Date().toISOString() },
];

export const initialBrands: BrandItem[] = [
  { id: 'b1000000-0000-0000-0000-000000000001', name: 'Amul', created_at: new Date().toISOString() },
  { id: 'b1000000-0000-0000-0000-000000000002', name: 'Mother Dairy', created_at: new Date().toISOString() },
  { id: 'b1000000-0000-0000-0000-000000000003', name: 'Nandini', created_at: new Date().toISOString() },
  { id: 'b1000000-0000-0000-0000-000000000004', name: 'Gowardhan', created_at: new Date().toISOString() },
  { id: 'b1000000-0000-0000-0000-000000000005', name: 'In-House Dairy Farm', created_at: new Date().toISOString() },
];

export const initialUnits: UnitItem[] = [
  { id: 'u1000000-0000-0000-0000-000000000001', name: 'Litre', short_code: 'Ltr', created_at: new Date().toISOString() },
  { id: 'u1000000-0000-0000-0000-000000000002', name: 'Kilogram', short_code: 'Kg', created_at: new Date().toISOString() },
  { id: 'u1000000-0000-0000-0000-000000000003', name: 'Packet (500ml)', short_code: 'Pkt 500ml', created_at: new Date().toISOString() },
  { id: 'u1000000-0000-0000-0000-000000000004', name: 'Packet (1 Litre)', short_code: 'Pkt 1L', created_at: new Date().toISOString() },
  { id: 'u1000000-0000-0000-0000-000000000005', name: 'Piece / Unit', short_code: 'Pcs', created_at: new Date().toISOString() },
  { id: 'u1000000-0000-0000-0000-000000000006', name: 'Gram', short_code: 'gm', created_at: new Date().toISOString() },
  { id: 'u1000000-0000-0000-0000-000000000007', name: 'Box / Tub', short_code: 'Box', created_at: new Date().toISOString() },
];

export const initialSuppliers: SupplierItem[] = [
  {
    id: 's1000000-0000-0000-0000-000000000001',
    name: 'Gujarat Milk Marketing (Amul Depot)',
    contact_person: 'Rakesh Shah',
    phone: '9820011223',
    email: 'amuldepot@dairy.in',
    address: 'Plot 12, Industrial Area, Sector 4',
    gst_number: '27AAACG0000A1Z5',
    created_at: new Date().toISOString(),
  },
  {
    id: 's1000000-0000-0000-0000-000000000002',
    name: 'Kishan Dairy Farmers Cooperative',
    contact_person: 'Kishanlal Patil',
    phone: '9890123456',
    email: 'kishanfarms@gmail.com',
    address: 'Village Sangam, Taluka Haveli',
    gst_number: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 's1000000-0000-0000-0000-000000000003',
    name: 'Mother Dairy Regional Distribution',
    contact_person: 'Sunil Verma',
    phone: '9811223344',
    email: 'orders@motherdairy.com',
    address: 'Godown No 5, APMC Market',
    gst_number: '27AABCM1234F1Z8',
    created_at: new Date().toISOString(),
  },
];

const today = new Date();
const formatDate = (daysOffset: number): string => {
  const d = new Date(today);
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
};

export const initialProducts: ProductItem[] = [
  {
    id: 'p1000000-0000-0000-0000-000000000001',
    name: 'Amul Taaza Toned Milk (500ml)',
    category_id: 'c1000000-0000-0000-0000-000000000001',
    brand_id: 'b1000000-0000-0000-0000-000000000001',
    unit_id: 'u1000000-0000-0000-0000-000000000003',
    sku: 'SKU-AML-TZ-500',
    barcode: '8901262010051',
    purchase_price: 24.0,
    selling_price: 28.0,
    gst_percent: 0,
    min_stock: 30,
    max_stock: 300,
    image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'p1000000-0000-0000-0000-000000000002',
    name: 'Amul Gold Full Cream Milk (500ml)',
    category_id: 'c1000000-0000-0000-0000-000000000001',
    brand_id: 'b1000000-0000-0000-0000-000000000001',
    unit_id: 'u1000000-0000-0000-0000-000000000003',
    sku: 'SKU-AML-GLD-500',
    barcode: '8901262010068',
    purchase_price: 31.0,
    selling_price: 35.0,
    gst_percent: 0,
    min_stock: 40,
    max_stock: 350,
    image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'p1000000-0000-0000-0000-000000000003',
    name: 'Fresh Malai Paneer (200g)',
    category_id: 'c1000000-0000-0000-0000-000000000002',
    brand_id: 'b1000000-0000-0000-0000-000000000005',
    unit_id: 'u1000000-0000-0000-0000-000000000005',
    sku: 'SKU-PAN-MALAI-200',
    barcode: '8901262020012',
    purchase_price: 75.0,
    selling_price: 90.0,
    gst_percent: 0,
    min_stock: 15,
    max_stock: 80,
    image_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'p1000000-0000-0000-0000-000000000004',
    name: 'Amul Masti Dahi Pouch (400g)',
    category_id: 'c1000000-0000-0000-0000-000000000003',
    brand_id: 'b1000000-0000-0000-0000-000000000001',
    unit_id: 'u1000000-0000-0000-0000-000000000005',
    sku: 'SKU-AML-DAHI-400',
    barcode: '8901262030011',
    purchase_price: 32.0,
    selling_price: 36.0,
    gst_percent: 0,
    min_stock: 25,
    max_stock: 120,
    image_url: 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?auto=format&fit=crop&w=400&q=80',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'p1000000-0000-0000-0000-000000000005',
    name: 'Amul Butter Salted (500g)',
    category_id: 'c1000000-0000-0000-0000-000000000004',
    brand_id: 'b1000000-0000-0000-0000-000000000001',
    unit_id: 'u1000000-0000-0000-0000-000000000005',
    sku: 'SKU-AML-BTR-500',
    barcode: '8901262040010',
    purchase_price: 245.0,
    selling_price: 275.0,
    gst_percent: 12,
    min_stock: 12,
    max_stock: 60,
    image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=400&q=80',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'p1000000-0000-0000-0000-000000000006',
    name: 'Desi Cow Ghee (1 Litre Jar)',
    category_id: 'c1000000-0000-0000-0000-000000000005',
    brand_id: 'b1000000-0000-0000-0000-000000000005',
    unit_id: 'u1000000-0000-0000-0000-000000000001',
    sku: 'SKU-GHEE-COW-1L',
    barcode: '8901262050019',
    purchase_price: 580.0,
    selling_price: 680.0,
    gst_percent: 12,
    min_stock: 10,
    max_stock: 50,
    image_url: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=400&q=80',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export const initialBatches: BatchItem[] = [];

// Helper to compute expiry status dynamically from expiry_date (Business Rule 3)
export const computeExpiryStatus = (expiryDateStr: string): { status: 'EXPIRED' | 'EXPIRING_TODAY' | 'EXPIRING_TOMORROW' | 'EXPIRING_IN_3_DAYS' | 'FRESH'; daysDiff: number } => {
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const expDate = new Date(expiryDateStr);
  expDate.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - todayDate.getTime();
  const daysDiff = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) return { status: 'EXPIRED', daysDiff };
  if (daysDiff === 0) return { status: 'EXPIRING_TODAY', daysDiff };
  if (daysDiff === 1) return { status: 'EXPIRING_TOMORROW', daysDiff };
  if (daysDiff <= 3) return { status: 'EXPIRING_IN_3_DAYS', daysDiff };
  return { status: 'FRESH', daysDiff };
};

