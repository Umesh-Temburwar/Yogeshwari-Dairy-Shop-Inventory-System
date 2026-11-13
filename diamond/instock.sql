-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - DIAMOND WAFERS & SNACKS IN-STOCK SETUP
-- PHASE 43: DIAMOND COMPLETE CATALOG (17 PRODUCTS)
-- Files:
--   - diamond/instock.sql
--   - supabase/43_phase43_diamond_wafers.sql
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
    CREATE TEMP TABLE tmp_diamond_items (
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

    INSERT INTO tmp_diamond_items VALUES
    ('Diamond Potato Chips Salted 25g', 'डायमंड पोटैटो चिप्स साल्टेड 25 ग्राम', 'डायमंड बटाटा वेफर्स सॉल्टेड 25 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 120),
    ('Diamond Potato Chips Salted 50g', 'डायमंड पोटैटो चिप्स साल्टेड 50 ग्राम', 'डायमंड बटाटा वेफर्स सॉल्टेड 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120),
    ('Diamond Potato Chips Masala Punch 25g', 'डायमंड चिप्स मसाला पंच 25 ग्राम', 'डायमंड वेफर्स मसाला पंच 25 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 120),
    ('Diamond Potato Chips Masala Punch 50g', 'डायमंड चिप्स मसाला पंच 50 ग्राम', 'डायमंड वेफर्स मसाला पंच 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120),
    ('Diamond Potato Chips Tomato Twist 25g', 'डायमंड चिप्स टोमैटो ट्विस्ट 25 ग्राम', 'डायमंड वेफर्स टोमॅटो ट्विस्ट 25 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 120),
    ('Diamond Potato Chips Tomato Twist 50g', 'डायमंड चिप्स टोमैटो ट्विस्ट 50 ग्राम', 'डायमंड वेफर्स टोमॅटो ट्विस्ट 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120),
    ('Diamond Potato Chips Cream & Onion 50g', 'डायमंड क्रीम एंड अनियन 50 ग्राम', 'डायमंड क्रीम अँड ओनियन 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 120),
    ('Diamond Wheels Masala 25g', 'डायमंड व्हील्स मसाला 25 ग्राम', 'डायमंड व्हील्स मसाला 25 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 120),
    ('Diamond Wheels Masala 50g', 'डायमंड व्हील्स मसाला 50 ग्राम', 'डायमंड व्हील्स मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120),
    ('Diamond Rings Tomato 25g', 'डायमंड रिंग्स टोमैटो 25 ग्राम', 'डायमंड रिंग्ज टोमॅटो 25 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 120),
    ('Diamond Rings Tomato 50g', 'डायमंड रिंग्स टोमैटो 50 ग्राम', 'डायमंड रिंग्ज टोमॅटो 25 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120),
    ('Diamond Chulbule Masala 30g', 'डायमंड चुलबुले मसाला 30 ग्राम', 'डायमंड चुलबुले मसाला 30 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 120),
    ('Diamond Chulbule Masala 65g', 'डायमंड चुलबुले मसाला 65 ग्राम', 'डायमंड चुलबुले मसाला 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120),
    ('Diamond Aloo Bhujia 65g', 'डायमंड आलू भुजिया 65 ग्राम', 'डायमंड आलू भुजिया 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 150),
    ('Diamond Aloo Bhujia 200g', 'डायमंड आलू भुजिया 200 ग्राम', 'डायमंड आलू भुजिया 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 36.00, 10.00, 150),
    ('Diamond Ratlami Sev 65g', 'डायमंड रतलामी सेव 65 ग्राम', 'डायमंड रतलामी शेव 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 150),
    ('Diamond Khatta Meetha 200g', 'डायमंड खट्टा मीठा 200 ग्राम', 'डायमंड आंबट गोड चिवडा 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 36.00, 10.00, 150);

    FOR rec IN SELECT * FROM tmp_diamond_items LOOP
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
            v_batch_no := 'DMD-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');
            INSERT INTO public.batches (
                id, product_id, product_name, batch_no, mfg_date, expiry_date,
                qty_received, qty_remaining, purchase_price, selling_price, status, notes
            ) VALUES (
                gen_random_uuid(), v_prod_id, rec.name, v_batch_no, v_today,
                v_today + (rec.shelf_life_days || ' days')::INTERVAL,
                rec.stock_quantity, rec.stock_quantity, rec.purchase_price, rec.selling_price, 'ACTIVE', 'Diamond Wafers Inward'
            );
        END IF;
    END LOOP;
END $$;

SELECT p.name AS product_name, p.category, p.unit, p.stock_quantity AS in_stock_qty,
       p.purchase_price AS buy_price_rs, p.selling_price AS sell_price_rs
FROM public.products p
WHERE p.name ILIKE '%Diamond%'
ORDER BY p.name;

