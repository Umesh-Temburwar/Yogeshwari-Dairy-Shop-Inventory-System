-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - AMUL GREEN PEAS & FROZEN VEGETABLES SETUP
-- PHASE 50: AMUL FROZEN GREEN PEAS (200g, 500g, 1kg, 5kg), SWEET CORN & SNACKS
-- File: amul/amul_greenpeas_instock.sql
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
    CREATE TEMP TABLE tmp_amul_greenpeas_items (
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

    INSERT INTO tmp_amul_greenpeas_items VALUES
    -- Amul Green Peas (Primary Products)
    ('Amul Frozen Green Peas 200g', 'अमूल फ्रोजन हरी मटर 200 ग्राम', 'अमूल फ्रोजन हिरवे मटार 200 ग्रॅम', 'Bakery & Extras', 'Piece', 28.00, 35.00, 48.00, 12.00, 365),
    ('Amul Frozen Green Peas 500g', 'अमूल फ्रोजन हरी मटर 500 ग्राम', 'अमूल फ्रोजन हिरवे मटार 500 ग्रॅम', 'Bakery & Extras', 'Piece', 60.00, 75.00, 60.00, 15.00, 365),
    ('Amul Frozen Green Peas 1kg', 'अमूल फ्रोजन हरी मटर 1 किग्रा', 'अमूल फ्रोजन हिरवे मटार 1 किलो', 'Bakery & Extras', 'Kg', 115.00, 140.00, 40.00, 10.00, 365),
    ('Amul Frozen Green Peas 5kg Bulk Pack', 'अमूल फ्रोजन हरी मटर 5 किग्रा', 'अमूल फ्रोजन हिरवे मटार 5 किलो', 'Bakery & Extras', 'Kg', 540.00, 650.00, 10.00, 2.00, 365),

    -- Amul Frozen Vegetables (Freezer Companions)
    ('Amul Frozen Sweet Corn 500g', 'अमूल फ्रोजन स्वीट कॉर्न 500 ग्राम', 'अमूल फ्रोजन मका दाणे 500 ग्रॅम', 'Bakery & Extras', 'Piece', 68.00, 85.00, 36.00, 10.00, 365),
    ('Amul Frozen Sweet Corn 1kg', 'अमूल फ्रोजन स्वीट कॉर्न 1 किग्रा', 'अमूल फ्रोजन मका दाणे 1 किलो', 'Bakery & Extras', 'Kg', 128.00, 160.00, 24.00, 6.00, 365),
    ('Amul Frozen Mixed Vegetables 500g', 'अमूल फ्रोजन मिक्स्ड वेजिटेबल्स 500 ग्राम', 'अमूल फ्रोजन मिक्स भाज्या 500 ग्रॅम', 'Bakery & Extras', 'Piece', 64.00, 80.00, 36.00, 10.00, 365),
    ('Amul Frozen Mixed Vegetables 1kg', 'अमूल फ्रोजन मिक्स्ड वेजिटेबल्स 1 किग्रा', 'अमूल फ्रोजन मिक्स भाज्या 1 किलो', 'Bakery & Extras', 'Kg', 120.00, 150.00, 24.00, 6.00, 365),

    -- Amul Happy Treats Freezer Snacks
    ('Amul Happy Treats French Fries 420g', 'अमूल फ्रेंच फ्राइज 420 ग्राम', 'अमूल फ्रेंच फ्राईज 420 ग्रॅम', 'Bakery & Extras', 'Piece', 78.00, 95.00, 30.00, 8.00, 365),
    ('Amul Happy Treats Aloo Tikki 400g', 'अमूल आलू टिक्की 400 ग्राम', 'अमूल बटाटा टिक्की 400 ग्रॅम', 'Bakery & Extras', 'Piece', 82.00, 100.00, 30.00, 8.00, 365),
    ('Amul Happy Treats Cheese Poppers 400g', 'अमूल चीज़ पॉपर्स 400 ग्राम', 'अमूल चीज पॉपर्स 400 ग्रॅम', 'Bakery & Extras', 'Piece', 148.00, 180.00, 24.00, 6.00, 365);

    FOR rec IN SELECT * FROM tmp_amul_greenpeas_items LOOP
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
            v_batch_no := 'AML-GP-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');
            INSERT INTO public.batches (
                id, product_id, product_name, batch_no, mfg_date, expiry_date,
                qty_received, qty_remaining, purchase_price, selling_price, status, notes
            ) VALUES (
                gen_random_uuid(), v_prod_id, rec.name, v_batch_no, v_today,
                v_today + (rec.shelf_life_days || ' days')::INTERVAL,
                rec.stock_quantity, rec.stock_quantity, rec.purchase_price, rec.selling_price, 'ACTIVE', 'Amul Green Peas Inward'
            );
        END IF;
    END LOOP;
END $$;

SELECT 
    p.name AS product_name,
    p.category,
    p.unit,
    p.stock_quantity AS in_stock_qty,
    p.purchase_price AS buy_price_rs,
    p.selling_price AS sell_price_rs,
    (p.stock_quantity * p.purchase_price) AS inventory_valuation_rs,
    p.shelf_life_days,
    p.is_active
FROM public.products p
WHERE p.name ILIKE '%Amul%Green Peas%'
   OR p.name ILIKE '%Amul%Sweet Corn%'
   OR p.name ILIKE '%Amul%Mixed Vegetables%'
   OR p.name ILIKE '%Amul Happy Treats%'
ORDER BY p.name;

