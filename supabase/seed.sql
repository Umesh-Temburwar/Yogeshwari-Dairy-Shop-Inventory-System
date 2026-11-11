-- ============================================================================
-- SEED DATA: CLEAN REFERENCE DATA
-- Only master categories and units for dairy inventory.
-- No dummy products, no fake batches, no mock suppliers.
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

-- 2. Insert Units
INSERT INTO public.units (id, name, short_code) VALUES
('u1000000-0000-0000-0000-000000000001', 'Litre', 'Ltr'),
('u1000000-0000-0000-0000-000000000002', 'Kilogram', 'Kg'),
('u1000000-0000-0000-0000-000000000003', 'Packet (500ml)', 'Pkt 500ml'),
('u1000000-0000-0000-0000-000000000004', 'Packet (1 Litre)', 'Pkt 1L'),
('u1000000-0000-0000-0000-000000000005', 'Piece / Unit', 'Pcs'),
('u1000000-0000-0000-0000-000000000006', 'Gram', 'gm'),
('u1000000-0000-0000-0000-000000000007', 'Box / Tub', 'Box')
ON CONFLICT (name) DO NOTHING;
