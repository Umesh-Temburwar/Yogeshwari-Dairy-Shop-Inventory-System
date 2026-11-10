-- ============================================================================
-- SEED DATA: AUTHENTIC DAIRY CATALOG & BATCHES
-- Description: Seeds Categories, Brands, Units, Suppliers, Products, and Batches
-- ============================================================================

-- 1. Insert Categories
INSERT INTO public.categories (id, name, description) VALUES
('c1000000-0000-0000-0000-000000000001', 'Milk & Cream', 'Fresh cow, buffalo, toned, and double-toned milk'),
('c1000000-0000-0000-0000-000000000002', 'Paneer & Tofu', 'Fresh malai paneer, soft paneer blocks, and diced paneer'),
('c1000000-0000-0000-0000-000000000003', 'Curd & Chaas', 'Desi dahi, flavored yogurt, lassi, and buttermilk pouches'),
('c1000000-0000-0000-0000-000000000004', 'Butter & Cheese', 'Table butter, white butter, cheese cubes, blocks, and slices'),
('c1000000-0000-0000-0000-000000000005', 'Pure Ghee', 'Pure desi cow ghee, buffalo danedaar ghee, and cooking ghee'),
('c1000000-0000-0000-0000-000000000006', 'Sweets & Khoya', 'Fresh mawa/khoya, gulab jamun, rasgulla, and kaju katli'),
('c1000000-0000-0000-0000-000000000007', 'Ice Cream & Kulfi', 'Tubs, cups, family packs, and traditional matka kulfi')
ON CONFLICT (name) DO NOTHING;

-- 2. Insert Brands
INSERT INTO public.brands (id, name) VALUES
('b1000000-0000-0000-0000-000000000001', 'Amul'),
('b1000000-0000-0000-0000-000000000002', 'Mother Dairy'),
('b1000000-0000-0000-0000-000000000003', 'Nandini'),
('b1000000-0000-0000-0000-000000000004', 'Gowardhan'),
('b1000000-0000-0000-0000-000000000005', 'In-House Dairy Farm')
ON CONFLICT (name) DO NOTHING;

-- 3. Insert Units
INSERT INTO public.units (id, name, short_code) VALUES
('u1000000-0000-0000-0000-000000000001', 'Litre', 'Ltr'),
('u1000000-0000-0000-0000-000000000002', 'Kilogram', 'Kg'),
('u1000000-0000-0000-0000-000000000003', 'Packet (500ml)', 'Pkt 500ml'),
('u1000000-0000-0000-0000-000000000004', 'Packet (1 Litre)', 'Pkt 1L'),
('u1000000-0000-0000-0000-000000000005', 'Piece / Unit', 'Pcs'),
('u1000000-0000-0000-0000-000000000006', 'Gram', 'gm'),
('u1000000-0000-0000-0000-000000000007', 'Box / Tub', 'Box')
ON CONFLICT (name) DO NOTHING;

-- 4. Insert Suppliers
INSERT INTO public.suppliers (id, name, contact_person, phone, email, address, gst_number) VALUES
('s1000000-0000-0000-0000-000000000001', 'Gujarat Milk Marketing (Amul Depot)', 'Rakesh Shah', '9820011223', 'amuldepot@dairy.in', 'Plot 12, Industrial Area, Sector 4', '27AAACG0000A1Z5'),
('s1000000-0000-0000-0000-000000000002', 'Kishan Dairy Farmers Cooperative', 'Kishanlal Patil', '9890123456', 'kishanfarms@gmail.com', 'Village Sangam, Taluka Haveli', NULL),
('s1000000-0000-0000-0000-000000000003', 'Mother Dairy Regional Distribution', 'Sunil Verma', '9811223344', 'orders@motherdairy.com', 'Godown No 5, APMC Market', '27AABCM1234F1Z8')
ON CONFLICT DO NOTHING;

-- 5. Insert Products
INSERT INTO public.products (
    id, name, category_id, brand_id, unit_id, sku, barcode, 
    purchase_price, selling_price, gst_percent, min_stock, max_stock, image_url
) VALUES
(
    'p1000000-0000-0000-0000-000000000001',
    'Amul Taaza Toned Milk (500ml)',
    'c1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'u1000000-0000-0000-0000-000000000003',
    'SKU-AML-TZ-500',
    '8901262010051',
    24.00, 28.00, 0.00, 30.00, 300.00,
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80'
),
(
    'p1000000-0000-0000-0000-000000000002',
    'Amul Gold Full Cream Milk (1 Litre)',
    'c1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'u1000000-0000-0000-0000-000000000004',
    'SKU-AML-GLD-1L',
    '8901262010105',
    60.00, 68.00, 0.00, 25.00, 200.00,
    'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80'
),
(
    'p1000000-0000-0000-0000-000000000003',
    'Fresh Malai Paneer Block',
    'c1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000005',
    'u1000000-0000-0000-0000-000000000002',
    'SKU-INH-PAN-KG',
    '8909876000012',
    310.00, 380.00, 0.00, 10.00, 50.00,
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80'
),
(
    'p1000000-0000-0000-0000-000000000004',
    'Amul Masti Dahi (400g Cup)',
    'c1000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000001',
    'u1000000-0000-0000-0000-000000000005',
    'SKU-AML-DAHI-400',
    '8901262030042',
    26.00, 32.00, 0.00, 20.00, 150.00,
    'https://images.unsplash.com/photo-1571212515416-fef01fc43637?auto=format&fit=crop&w=400&q=80'
),
(
    'p1000000-0000-0000-0000-000000000005',
    'Amul Butter Pasteurized (500g)',
    'c1000000-0000-0000-0000-000000000004',
    'b1000000-0000-0000-0000-000000000001',
    'u1000000-0000-0000-0000-000000000005',
    'SKU-AML-BTR-500',
    '8901262020050',
    245.00, 285.00, 12.00, 15.00, 100.00,
    'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=400&q=80'
),
(
    'p1000000-0000-0000-0000-000000000006',
    'Desi Cow Ghee Pure (1 Litre Jar)',
    'c1000000-0000-0000-0000-000000000005',
    'b1000000-0000-0000-0000-000000000005',
    'u1000000-0000-0000-0000-000000000001',
    'SKU-INH-GHEE-1L',
    '8909876000050',
    590.00, 740.00, 12.00, 8.00, 60.00,
    'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=400&q=80'
),
(
    'p1000000-0000-0000-0000-000000000007',
    'Amul Processed Cheese Block (200g)',
    'c1000000-0000-0000-0000-000000000004',
    'b1000000-0000-0000-0000-000000000001',
    'u1000000-0000-0000-0000-000000000005',
    'SKU-AML-CHS-200',
    '8901262040027',
    115.00, 135.00, 12.00, 10.00, 80.00,
    'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=400&q=80'
),
(
    'p1000000-0000-0000-0000-000000000008',
    'Amul Vanilla Royal Ice Cream (1L Tub)',
    'c1000000-0000-0000-0000-000000000007',
    'b1000000-0000-0000-0000-000000000001',
    'u1000000-0000-0000-0000-000000000007',
    'SKU-AML-IC-VAN-1L',
    '8901262070017',
    140.00, 180.00, 18.00, 8.00, 40.00,
    'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=400&q=80'
)
ON CONFLICT (sku) DO NOTHING;

-- 6. Insert Multiple Batches (With realistic expiries: Expired, Expiring in 2-3 Days, Fresh)
-- Today reference: CURRENT_DATE
INSERT INTO public.batches (
    id, product_id, batch_no, mfg_date, expiry_date, 
    qty_received, qty_remaining, purchase_price, supplier_id
) VALUES
-- Amul Taaza: Batch 1 (Expiring Tomorrow)
(
    'bt100000-0000-0000-0000-000000000001',
    'p1000000-0000-0000-0000-000000000001',
    'TZ-BATCH-01',
    CURRENT_DATE - INTERVAL '2 days',
    CURRENT_DATE + INTERVAL '1 day',
    50.00, 14.00, 24.00,
    's1000000-0000-0000-0000-000000000001'
),
-- Amul Taaza: Batch 2 (Fresh, Expiring in 3 Days)
(
    'bt100000-0000-0000-0000-000000000002',
    'p1000000-0000-0000-0000-000000000001',
    'TZ-BATCH-02',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '3 days',
    100.00, 85.00, 24.00,
    's1000000-0000-0000-0000-000000000001'
),
-- Amul Gold Milk: Batch 1 (Expiring in 2 days)
(
    'bt100000-0000-0000-0000-000000000003',
    'p1000000-0000-0000-0000-000000000002',
    'GLD-BATCH-01',
    CURRENT_DATE - INTERVAL '1 day',
    CURRENT_DATE + INTERVAL '2 days',
    60.00, 42.00, 60.00,
    's1000000-0000-0000-0000-000000000001'
),
-- Malai Paneer: Batch 1 (Expiring Today - needs urgent sale!)
(
    'bt100000-0000-0000-0000-000000000004',
    'p1000000-0000-0000-0000-000000000003',
    'PAN-BATCH-TODAY',
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE,
    15.00, 3.50, 310.00,
    's1000000-0000-0000-0000-000000000002'
),
-- Malai Paneer: Batch 2 (Fresh, Made today)
(
    'bt100000-0000-0000-0000-000000000005',
    'p1000000-0000-0000-0000-000000000003',
    'PAN-BATCH-FRESH',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '4 days',
    25.00, 25.00, 310.00,
    's1000000-0000-0000-0000-000000000002'
),
-- Amul Masti Dahi: Batch 1 (Expired 2 days ago for testing wastage write-off)
(
    'bt100000-0000-0000-0000-000000000006',
    'p1000000-0000-0000-0000-000000000004',
    'DAHI-BATCH-EXP',
    CURRENT_DATE - INTERVAL '15 days',
    CURRENT_DATE - INTERVAL '2 days',
    30.00, 4.00, 26.00,
    's1000000-0000-0000-0000-000000000001'
),
-- Amul Masti Dahi: Batch 2 (Fresh)
(
    'bt100000-0000-0000-0000-000000000007',
    'p1000000-0000-0000-0000-000000000004',
    'DAHI-BATCH-FRSH',
    CURRENT_DATE - INTERVAL '2 days',
    CURRENT_DATE + INTERVAL '10 days',
    50.00, 46.00, 26.00,
    's1000000-0000-0000-0000-000000000001'
),
-- Desi Cow Ghee: Batch 1 (Long shelf life, Fresh)
(
    'bt100000-0000-0000-0000-000000000008',
    'p1000000-0000-0000-0000-000000000006',
    'GHEE-BATCH-2026',
    CURRENT_DATE - INTERVAL '20 days',
    CURRENT_DATE + INTERVAL '240 days',
    20.00, 18.00, 590.00,
    's1000000-0000-0000-0000-000000000002'
)
ON CONFLICT DO NOTHING;

