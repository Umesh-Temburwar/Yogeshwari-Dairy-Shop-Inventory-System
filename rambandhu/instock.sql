-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - RAMBANDHU MASALA, PAPAD & PICKLES SETUP
-- PHASE 40: RAMBANDHU COMPLETE CATALOG (14 PRODUCTS)
-- Files:
--   - rambandhu/instock.sql
--   - supabase/40_phase40_rambandhu_masala.sql
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
    CREATE TEMP TABLE tmp_rambandhu_items (
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

    INSERT INTO tmp_rambandhu_items VALUES
    ('Rambandhu Mango Pickle 200g Pouch', 'रामबंधु आम का अचार 200 ग्राम', 'रामबंधू आंब्याचे लोणचे 200 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 48.00, 12.00, 365),
    ('Rambandhu Mango Pickle 500g Jar', 'रामबंधु आम का अचार 500 ग्राम', 'रामबंधू आंब्याचे लोणचे 500 ग्रॅम', 'Bakery & Extras', 'Piece', 88.00, 110.00, 24.00, 6.00, 365),
    ('Rambandhu Lemon Pickle 200g Pouch', 'रामबंधु नींबू का अचार 200 ग्राम', 'रामबंधू लिंबाचे लोणचे 200 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 36.00, 10.00, 365),
    ('Rambandhu Mixed Pickle 200g Pouch', 'रामबंधु मिक्स्ड अचार 200 ग्राम', 'रामबंधू मिक्स लोणचे 200 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 36.00, 10.00, 365),
    ('Rambandhu Green Chilli Pickle 200g Pouch', 'रामबंधु हरी मिर्च का अचार 200 ग्राम', 'रामबंधू मिरचीचे लोणचे 200 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 36.00, 10.00, 365),
    ('Rambandhu Udad Papad 200g', 'रामबंधु उड़द पापड़ 200 ग्राम', 'रामबंधू उडीद पापड 200 ग्रॅम', 'Bakery & Extras', 'Piece', 48.00, 60.00, 48.00, 12.00, 180),
    ('Rambandhu Moong Papad 200g', 'रामबंधु मूंग पापड़ 200 ग्राम', 'रामबंधू मूग पापड 200 ग्रॅम', 'Bakery & Extras', 'Piece', 52.00, 65.00, 36.00, 10.00, 180),
    ('Rambandhu Garam Masala 50g', 'रामबंधु गरम मसाला 50 ग्राम', 'रामबंधू गरम मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 30.00, 38.00, 48.00, 12.00, 365),
    ('Rambandhu Garam Masala 100g', 'रामबंधु गरम मसाला 100 ग्राम', 'रामबंधू गरम मसाला 100 ग्रॅम', 'Bakery & Extras', 'Piece', 58.00, 72.00, 36.00, 10.00, 365),
    ('Rambandhu Pav Bhaji Masala 50g', 'रामबंधु पाव भाजी मसाला 50 ग्राम', 'रामबंधू पाव भाजी मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 32.00, 40.00, 48.00, 12.00, 365),
    ('Rambandhu Sambhar Masala 50g', 'रामबंधु सांभर मसाला 50 ग्राम', 'रामबंधू सांबार मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 30.00, 38.00, 36.00, 10.00, 365),
    ('Rambandhu Mutton / Chicken Masala 50g', 'रामबंधु मटन चिकन मसाला 50 ग्राम', 'रामबंधू मटण चिकन मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 32.00, 40.00, 48.00, 12.00, 365),
    ('Rambandhu Kasuri Methi 25g', 'रामबंधु कसूरी मेथी 25 ग्राम', 'रामबंधू कसुरी मेथी 25 ग्रॅम', 'Bakery & Extras', 'Piece', 20.00, 25.00, 36.00, 10.00, 365),
    ('Rambandhu Hing Powder 50g', 'रामबंधु हींग 50 ग्राम', 'रामबंधू हिंग 50 ग्रॅम', 'Bakery & Extras', 'Piece', 52.00, 65.00, 36.00, 10.00, 365);

    FOR rec IN SELECT * FROM tmp_rambandhu_items LOOP
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
            v_batch_no := 'RBD-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');
            INSERT INTO public.batches (
                id, product_id, product_name, batch_no, mfg_date, expiry_date,
                qty_received, qty_remaining, purchase_price, selling_price, status, notes
            ) VALUES (
                gen_random_uuid(), v_prod_id, rec.name, v_batch_no, v_today,
                v_today + (rec.shelf_life_days || ' days')::INTERVAL,
                rec.stock_quantity, rec.stock_quantity, rec.purchase_price, rec.selling_price, 'ACTIVE', 'Rambandhu Masala Inward'
            );
        END IF;
    END LOOP;
END $$;

SELECT p.name AS product_name, p.category, p.unit, p.stock_quantity AS in_stock_qty,
       p.purchase_price AS buy_price_rs, p.selling_price AS sell_price_rs
FROM public.products p
WHERE p.name ILIKE '%Rambandhu%'
ORDER BY p.name;

