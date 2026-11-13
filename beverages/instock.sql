-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - CAMPA, SPRITE & PACKAGED AQUA BEVERAGES SETUP
-- PHASE 46: CAMPA, SPRITE, COCA COLA, EMPIRE AQUA & SUNREACH AQUA WATER (23 PRODUCTS)
-- Files:
--   - beverages/instock.sql
--   - supabase/46_phase46_campa_sprite_and_aqua_beverages.sql
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'batches'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'batches' AND column_name = 'product_name'
    ) THEN
        ALTER TABLE public.batches ADD COLUMN product_name VARCHAR(255);
    END IF;
END $$;

DO $$
DECLARE
    v_prod_id UUID;
    v_batch_no VARCHAR(100);
    v_today DATE := CURRENT_DATE;
    rec RECORD;
BEGIN
    CREATE TEMP TABLE tmp_beverage_items (
        name VARCHAR(255),
        hindi_name VARCHAR(255),
        marathi_name VARCHAR(255),
        category VARCHAR(100),
        unit VARCHAR(50),
        purchase_price NUMERIC(12,2),
        selling_price NUMERIC(12,2),
        stock_quantity NUMERIC(12,2),
        min_stock_alert NUMERIC(12,2),
        shelf_life_days INTEGER
    ) ON COMMIT DROP;

    INSERT INTO tmp_beverage_items VALUES
    -- Campa Beverages
    ('Campa Cola 200ml Bottle', 'कैम्पा कोला 200 मिली', 'कॅम्पा कोला 200 मिली', 'Bakery & Extras', 'Piece', 8.20, 10.00, 72.00, 24.00, 180),
    ('Campa Cola 500ml Pet Bottle', 'कैम्पा कोला 500 मिली', 'कॅम्पा कोला 500 मिली', 'Bakery & Extras', 'Piece', 16.50, 20.00, 48.00, 12.00, 180),
    ('Campa Cola 2 Litre Pet Bottle', 'कैम्पा कोला 2 लीटर', 'कॅम्पा कोला 2 लिटर', 'Bakery & Extras', 'Piece', 50.00, 60.00, 24.00, 6.00, 180),
    ('Campa Orange 200ml Bottle', 'कैम्पा ऑरेंज 200 मिली', 'कॅम्पा ऑरेंज 200 मिली', 'Bakery & Extras', 'Piece', 8.20, 10.00, 72.00, 24.00, 180),
    ('Campa Orange 500ml Pet Bottle', 'कैम्पा ऑरेंज 500 मिली', 'कॅम्पा ऑरेंज 500 मिली', 'Bakery & Extras', 'Piece', 16.50, 20.00, 48.00, 12.00, 180),
    ('Campa Lemon 200ml Bottle', 'कैम्पा लेमन 200 मिली', 'कॅम्पा लेमन 200 मिली', 'Bakery & Extras', 'Piece', 8.20, 10.00, 72.00, 24.00, 180),
    ('Campa Lemon 500ml Pet Bottle', 'कैम्पा लेमन 500 मिली', 'कॅम्पा लेमन 500 मिली', 'Bakery & Extras', 'Piece', 16.50, 20.00, 48.00, 12.00, 180),

    -- Sprite & Cold Drinks
    ('Sprite 250ml Pet Bottle', 'स्प्राइट 250 मिली', 'स्प्राइट 250 मिली', 'Bakery & Extras', 'Piece', 16.50, 20.00, 72.00, 24.00, 180),
    ('Sprite 750ml Pet Bottle', 'स्प्राइट 750 मिली', 'स्प्राइट 750 मिली', 'Bakery & Extras', 'Piece', 33.50, 40.00, 48.00, 12.00, 180),
    ('Sprite 1.25L Pet Bottle', 'स्प्राइट 1.25 लीटर', 'स्प्राइट 1.25 लिटर', 'Bakery & Extras', 'Piece', 54.00, 65.00, 36.00, 10.00, 180),
    ('Sprite 2.25L Pet Bottle', 'स्प्राइट 2.25 लीटर', 'स्प्राइट 2.25 लिटर', 'Bakery & Extras', 'Piece', 80.00, 95.00, 24.00, 6.00, 180),
    ('Thums Up 250ml Pet Bottle', 'थम्स अप 250 मिली', 'थम्स अप 250 मिली', 'Bakery & Extras', 'Piece', 16.50, 20.00, 72.00, 24.00, 180),
    ('Thums Up 750ml Pet Bottle', 'थम्स अप 750 मिली', 'थम्स अप 750 मिली', 'Bakery & Extras', 'Piece', 33.50, 40.00, 48.00, 12.00, 180),
    ('Coca Cola 250ml Pet Bottle', 'कोका कोला 250 मिली', 'कोका कोला 250 मिली', 'Bakery & Extras', 'Piece', 16.50, 20.00, 72.00, 24.00, 180),
    ('Coca Cola 750ml Pet Bottle', 'कोका कोला 750 मिली', 'कोका कोला 750 मिली', 'Bakery & Extras', 'Piece', 33.50, 40.00, 48.00, 12.00, 180),

    -- Empire Aqua Packaged Drinking Water
    ('Empire Aqua Water 200ml Glass/Pouch', 'एम्पायर एक्वा पानी 200 मिली', 'एम्पायर अ‍ॅक्वा पाणी 200 मिली', 'Bakery & Extras', 'Piece', 3.50, 5.00, 120.00, 40.00, 180),
    ('Empire Aqua Water 500ml Bottle', 'एम्पायर एक्वा पानी 500 मिली', 'एम्पायर अ‍ॅक्वा पाणी 500 मिली', 'Bakery & Extras', 'Piece', 6.50, 10.00, 96.00, 24.00, 180),
    ('Empire Aqua Water 1 Litre Bottle', 'एम्पायर एक्वा पानी 1 लीटर', 'एम्पायर अ‍ॅक्वा पाणी 1 लिटर', 'Bakery & Extras', 'Piece', 12.00, 20.00, 72.00, 24.00, 180),
    ('Empire Aqua Water 20 Litre Jar', 'एम्पायर एक्वा जार 20 लीटर', 'एम्पायर अ‍ॅक्वा जार 20 लिटर', 'Bakery & Extras', 'Piece', 45.00, 70.00, 20.00, 5.00, 60),

    -- Sunreach Aqua Packaged Drinking Water
    ('Sunreach Aqua Water 250ml Bottle', 'सनरीच एक्वा पानी 250 मिली', 'सनरीच अ‍ॅक्वा पाणी 250 मिली', 'Bakery & Extras', 'Piece', 4.50, 7.00, 96.00, 24.00, 180),
    ('Sunreach Aqua Water 500ml Bottle', 'सनरीच एक्वा पानी 500 मिली', 'सनरीच अ‍ॅक्वा पाणी 500 मिली', 'Bakery & Extras', 'Piece', 6.50, 10.00, 96.00, 24.00, 180),
    ('Sunreach Aqua Water 1 Litre Bottle', 'सनरीच एक्वा पानी 1 लीटर', 'सनरीच अ‍ॅक्वा पाणी 1 लिटर', 'Bakery & Extras', 'Piece', 12.00, 20.00, 72.00, 24.00, 180),
    ('Sunreach Aqua Water 20 Litre Jar', 'सनरीच एक्वा जार 20 लीटर', 'सनरीच अ‍ॅक्वा जार 20 लिटर', 'Bakery & Extras', 'Piece', 45.00, 70.00, 20.00, 5.00, 60);

    FOR rec IN SELECT * FROM tmp_beverage_items LOOP
        SELECT id INTO v_prod_id FROM public.products WHERE LOWER(TRIM(name)) = LOWER(TRIM(rec.name)) LIMIT 1;
        IF v_prod_id IS NULL THEN
            INSERT INTO public.products (
                id, name, hindi_name, marathi_name, category, unit, purchase_price, selling_price,
                stock_quantity, min_stock_alert, shelf_life_days, has_expiry, is_active
            ) VALUES (
                gen_random_uuid(), rec.name, rec.hindi_name, rec.marathi_name, rec.category, rec.unit,
                rec.purchase_price, rec.selling_price, rec.stock_quantity, rec.min_stock_alert, rec.shelf_life_days, TRUE, TRUE
            ) RETURNING id INTO v_prod_id;
        ELSE
            UPDATE public.products
            SET hindi_name = rec.hindi_name, marathi_name = rec.marathi_name, category = rec.category,
                unit = rec.unit, purchase_price = rec.purchase_price, selling_price = rec.selling_price,
                stock_quantity = rec.stock_quantity, min_stock_alert = rec.min_stock_alert,
                shelf_life_days = rec.shelf_life_days, has_expiry = TRUE, is_active = TRUE
            WHERE id = v_prod_id;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'batches') THEN
            v_batch_no := 'BEV-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');
            INSERT INTO public.batches (
                id, product_id, product_name, batch_no, mfg_date, expiry_date,
                qty_received, qty_remaining, purchase_price, selling_price, status, notes
            ) VALUES (
                gen_random_uuid(), v_prod_id, rec.name, v_batch_no, v_today,
                v_today + (rec.shelf_life_days || ' days')::INTERVAL,
                rec.stock_quantity, rec.stock_quantity, rec.purchase_price, rec.selling_price, 'ACTIVE', 'Beverages & Aqua Inward'
            );
        END IF;
    END LOOP;
END $$;

SELECT p.name AS product_name, p.category, p.unit, p.stock_quantity AS in_stock_qty,
       p.purchase_price AS buy_price_rs, p.selling_price AS sell_price_rs
FROM public.products p
WHERE p.name ILIKE '%Campa%' 
   OR p.name ILIKE '%Sprite%' 
   OR p.name ILIKE '%Thums Up%'
   OR p.name ILIKE '%Coca Cola%'
   OR p.name ILIKE '%Empire Aqua%' 
   OR p.name ILIKE '%Sunreach Aqua%'
ORDER BY p.name;

