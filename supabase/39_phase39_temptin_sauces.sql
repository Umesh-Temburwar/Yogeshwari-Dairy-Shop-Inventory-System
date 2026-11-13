-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - TEMPTIN SAUCES & CONDIMENTS IN-STOCK SETUP
-- PHASE 39: TEMPTIN SAUCES (KETCHUP, CHILLI, SOYA, VINEGAR, SCHEZWAN, MAYO)
-- File: supabase/39_phase39_temptin_sauces.sql
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
    CREATE TEMP TABLE tmp_temptin_items (
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

    INSERT INTO tmp_temptin_items VALUES
    ('Temptin Tomato Ketchup 950g Bottle', 'टेम्प्टिन टोमैटो केचप 950 ग्राम', 'टेम्प्टिन टोमॅटो केचप 950 ग्रॅम', 'Bakery & Extras', 'Piece', 98.00, 120.00, 36.00, 8.00, 365),
    ('Temptin Tomato Ketchup 500g Squeezo', 'टेम्प्टिन टोमैटो केचप 500 ग्राम', 'टेम्प्टिन टोमॅटो केचप 500 ग्रॅम', 'Bakery & Extras', 'Piece', 60.00, 75.00, 48.00, 12.00, 365),
    ('Temptin Tomato Ketchup 200g Pouch', 'टेम्प्टिन टोमैटो केचप 200 ग्राम', 'टेम्प्टिन टोमॅटो केचप 200 ग्रॅम', 'Bakery & Extras', 'Piece', 24.00, 30.00, 60.00, 15.00, 365),
    ('Temptin Red Chilli Sauce 650g Bottle', 'टेम्प्टिन रेड चिली सॉस 650 ग्राम', 'टेम्प्टिन लाल मिरची सॉस 650 ग्रॅम', 'Bakery & Extras', 'Piece', 48.00, 60.00, 36.00, 10.00, 365),
    ('Temptin Green Chilli Sauce 650g Bottle', 'टेम्प्टिन ग्रीन चिली सॉस 650 ग्राम', 'टेम्प्टिन हिरवी मिरची सॉस 650 ग्रॅम', 'Bakery & Extras', 'Piece', 48.00, 60.00, 36.00, 10.00, 365),
    ('Temptin Dark Soya Sauce 650g Bottle', 'टेम्प्टिन डार्क सोया सॉस 650 ग्राम', 'टेम्प्टिन डार्क सोया सॉस 650 ग्रॅम', 'Bakery & Extras', 'Piece', 48.00, 60.00, 36.00, 10.00, 365),
    ('Temptin Synthetic White Vinegar 650ml', 'टेम्प्टिन सिरका 650 मिली', 'टेम्प्टिन व्हिनेगर 650 मिली', 'Bakery & Extras', 'Piece', 35.00, 45.00, 36.00, 10.00, 365),
    ('Temptin Schezwan Chutney 250g Jar', 'टेम्प्टिन शेजवान चटनी 250 ग्राम', 'टेम्प्टिन शेजवान चटणी 250 ग्रॅम', 'Bakery & Extras', 'Piece', 68.00, 85.00, 48.00, 12.00, 270),
    ('Temptin Schezwan Chutney 200g Squeezo', 'टेम्प्टिन शेजवान चटनी 200 ग्राम', 'टेम्प्टिन शेजवान चटणी 200 ग्रॅम', 'Bakery & Extras', 'Piece', 52.00, 65.00, 48.00, 12.00, 270),
    ('Temptin Eggless Veg Mayonnaise 250g Pouch', 'टेम्प्टिन वेज मेयोनेज 250 ग्राम', 'टेम्प्टिन व्हेज मेयोनीज 250 ग्रॅम', 'Bakery & Extras', 'Piece', 48.00, 60.00, 36.00, 10.00, 180),
    ('Temptin Pizza & Pasta Sauce 250g Jar', 'टेम्प्टिन पिज्जा एंड पास्ता सॉस 250 ग्राम', 'टेम्प्टिन पिझ्झा व पास्ता सॉस 250 ग्रॅम', 'Bakery & Extras', 'Piece', 60.00, 75.00, 36.00, 10.00, 270);

    FOR rec IN SELECT * FROM tmp_temptin_items LOOP
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
            v_batch_no := 'TMP-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');
            INSERT INTO public.batches (
                id, product_id, product_name, batch_no, mfg_date, expiry_date,
                qty_received, qty_remaining, purchase_price, selling_price, status, notes
            ) VALUES (
                gen_random_uuid(), v_prod_id, rec.name, v_batch_no, v_today,
                v_today + (rec.shelf_life_days || ' days')::INTERVAL,
                rec.stock_quantity, rec.stock_quantity, rec.purchase_price, rec.selling_price, 'ACTIVE', 'Temptin Sauces Inward'
            );
        END IF;
    END LOOP;
END $$;

SELECT p.name AS product_name, p.category, p.unit, p.stock_quantity AS in_stock_qty,
       p.purchase_price AS buy_price_rs, p.selling_price AS sell_price_rs
FROM public.products p
WHERE p.name ILIKE '%Temptin%'
ORDER BY p.name;

