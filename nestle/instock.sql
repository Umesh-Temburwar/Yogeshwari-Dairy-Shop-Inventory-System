-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - NESTLE COMPLETE PRODUCTS SETUP
-- PHASE 48: NESTLE COMPLETE CATALOG (29 PRODUCTS)
-- Files:
--   - nestle/instock.sql
--   - supabase/48_phase48_nestle_products.sql
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
    CREATE TEMP TABLE tmp_nestle_items (
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

    INSERT INTO tmp_nestle_items VALUES
    -- Maggi Noodles & Seasoning
    ('Maggi 2-Minute Masala Noodles 70g', 'मैगी 2-मिनट मसाला नूडल्स 70 ग्राम', 'मॅगी 2-मिनिट मसाला नूडल्स 70 ग्रॅम', 'Bakery & Extras', 'Piece', 11.80, 14.00, 144.00, 36.00, 240),
    ('Maggi 2-Minute Masala Noodles 140g', 'मैगी 2-मिनट मसाला नूडल्स 140 ग्राम', 'मॅगी 2-मिनिट मसाला नूडल्स 140 ग्रॅम', 'Bakery & Extras', 'Piece', 23.80, 28.00, 72.00, 18.00, 240),
    ('Maggi 2-Minute Masala Noodles 280g (4 Pcs)', 'मैगी 4-पैक 280 ग्राम', 'मॅगी 4-पॅक 280 ग्रॅम', 'Bakery & Extras', 'Piece', 47.50, 56.00, 48.00, 12.00, 240),
    ('Maggi 2-Minute Masala Noodles 560g (8 Pcs)', 'मैगी 8-पैक 560 ग्राम', 'मॅगी 8-पॅक 560 ग्रॅम', 'Bakery & Extras', 'Piece', 93.50, 110.00, 36.00, 10.00, 240),
    ('Maggi 2-Minute Special Masala Noodles 70g', 'मैगी स्पेशल मसाला नूडल्स 70 ग्राम', 'मॅगी स्पेशल मसाला नूडल्स 70 ग्रॅम', 'Bakery & Extras', 'Piece', 15.00, 18.00, 72.00, 18.00, 240),
    ('Maggi Masala-e-Magic Seasoning 6g Sachet', 'मैगी मसाला-ए-मैजिक 6 ग्राम', 'मॅगी मसाला-ए-मॅजिक 6 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 120.00, 30.00, 365),
    ('Maggi Masala-e-Magic Pack (10 Sachets)', 'मैगी मसाला-ए-मैजिक 10 पैकेट', 'मॅगी मसाला-ए-मॅजिक 10 पाकीट', 'Bakery & Extras', 'Piece', 42.00, 50.00, 36.00, 10.00, 365),
    ('Maggi Rich Tomato Ketchup 500g Bottle', 'मैगी टोमैटो केचप 500 ग्राम', 'मॅगी टोमॅटो केचप 500 ग्रॅम', 'Bakery & Extras', 'Piece', 95.00, 115.00, 36.00, 10.00, 365),
    ('Maggi Hot & Sweet Chilli Sauce 500g Bottle', 'मैगी हॉट एंड स्वीट सॉस 500 ग्राम', 'मॅगी हॉट अँड स्वीट सॉस 500 ग्रॅम', 'Bakery & Extras', 'Piece', 102.00, 125.00, 36.00, 10.00, 365),
    ('Maggi Rich Tomato Sauce 90g Pouch', 'मैगी टोमैटो सॉस पाउच 90 ग्राम', 'मॅगी टोमॅटो सॉस पाऊच 90 ग्रॅम', 'Bakery & Extras', 'Piece', 12.50, 15.00, 48.00, 12.00, 365),

    -- Nestle KitKat
    ('Nestle KitKat 2 Finger Chocolate 12.8g', 'नेस्ले किटकैट 12.8 ग्राम', 'नेस्ले किटकॅट 12.8 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 96.00, 24.00, 365),
    ('Nestle KitKat 2 Finger Chocolate 27.5g', 'नेस्ले किटकैट 27.5 ग्राम', 'नेस्ले किटकॅट 27.5 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 72.00, 18.00, 365),
    ('Nestle KitKat 4 Finger Chocolate 37.3g', 'नेस्ले किटकैट 4 फिंगर 37.3 ग्राम', 'नेस्ले किटकॅट 4 फिंगर 37.3 ग्रॅम', 'Bakery & Extras', 'Piece', 25.00, 30.00, 48.00, 12.00, 365),
    ('Nestle KitKat Chunky 40g', 'नेस्ले किटकैट चंकी 40 ग्राम', 'नेस्ले किटकॅट चंकी 40 ग्रॅम', 'Bakery & Extras', 'Piece', 33.50, 40.00, 36.00, 10.00, 365),
    ('Nestle KitKat Dessert Delight 50g', 'नेस्ले किटकैट डेजर्ट डिलाइट 50 ग्राम', 'नेस्ले किटकॅट डेझर्ट डिलाईट 50 ग्रॅम', 'Bakery & Extras', 'Piece', 50.00, 60.00, 36.00, 10.00, 365),

    -- Nestle Munch & Milkybar
    ('Nestle Munch Chocolate Wafer 10.1g', 'नेस्ले मंच चॉकलेट वेफर 10.1 ग्राम', 'नेस्ले मंच चॉकलेट वेफर 10.1 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 120.00, 30.00, 270),
    ('Nestle Munch Chocolate Wafer 18g', 'नेस्ले मंच चॉकलेट वेफर 18 ग्राम', 'नेस्ले मंच चॉकलेट वेफर 18 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 96.00, 24.00, 270),
    ('Nestle Munch Max Wafer 32g', 'नेस्ले मंच मैक्स 32 ग्राम', 'नेस्ले मंच मॅक्स 32 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 60.00, 15.00, 270),
    ('Nestle Munch Nuts Bar 32g', 'नेस्ले मंच नट्स बार 32 ग्राम', 'नेस्ले मंच नट्स बार 32 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 60.00, 15.00, 270),
    ('Nestle Milkybar White Chocolate 12.5g', 'नेस्ले मिल्कीबार 12.5 ग्राम', 'नेस्ले मिल्कीबार 12.5 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 96.00, 24.00, 365),
    ('Nestle Milkybar White Chocolate 25g', 'नेस्ले मिल्कीबार 25 ग्राम', 'नेस्ले मिल्कीबार 25 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 72.00, 18.00, 365),

    -- Nescafe Instant Coffee
    ('Nescafe Classic Coffee 25g Pouch', 'नेस्कैफे क्लासिक कॉफी 25 ग्राम', 'नेस्कॅफे क्लासिक कॉफी 25 ग्रॅम', 'Bakery & Extras', 'Piece', 54.00, 65.00, 48.00, 12.00, 365),
    ('Nescafe Classic Coffee 50g Glass Jar', 'नेस्कैफे क्लासिक कॉफी 50 ग्राम जार', 'नेस्कॅफे क्लासिक कॉफी 50 ग्रॅम बरणी', 'Bakery & Extras', 'Piece', 138.00, 165.00, 24.00, 6.00, 365),
    ('Nescafe Classic Coffee 100g Glass Jar', 'नेस्कैफे क्लासिक कॉफी 100 ग्राम जार', 'नेस्कॅफे क्लासिक कॉफी 100 ग्रॅम बरणी', 'Bakery & Extras', 'Piece', 270.00, 320.00, 18.00, 4.00, 365),
    ('Nescafe Sunrise Coffee Mix 50g Pouch', 'नेस्कैफे सनराइज 50 ग्राम', 'नेस्कॅफे सनराईज 50 ग्रॅम', 'Bakery & Extras', 'Piece', 62.00, 75.00, 36.00, 10.00, 365),

    -- Nestle Everyday & Milkmaid
    ('Nestle Everyday Dairy Whitener 200g Pouch', 'नेस्ले एवरीडे डेयरी व्हाइटनर 200 ग्राम', 'नेस्ले एव्हरीडे डेअरी व्हाईटनर 200 ग्रॅम', 'Bakery & Extras', 'Piece', 72.00, 85.00, 36.00, 10.00, 270),
    ('Nestle Everyday Dairy Whitener 400g Pouch', 'नेस्ले एवरीडे डेयरी व्हाइटनर 400 ग्राम', 'नेस्ले एव्हरीडे डेअरी व्हाईटनर 400 ग्रॅम', 'Bakery & Extras', 'Piece', 140.00, 165.00, 24.00, 6.00, 270),
    ('Nestle Everyday Dairy Whitener 1kg Pouch', 'नेस्ले एवरीडे डेयरी व्हाइटनर 1 किग्रा', 'नेस्ले एव्हरीडे डेअरी व्हाईटनर 1 किलो', 'Bakery & Extras', 'Piece', 340.00, 395.00, 18.00, 5.00, 270),
    ('Nestle Milkmaid Condensed Milk 400g Tin', 'नेस्ले मिल्कमेड 400 ग्राम टिन', 'नेस्ले मिल्कमेड 400 ग्रॅम टिन', 'Bakery & Extras', 'Piece', 122.00, 145.00, 36.00, 10.00, 365);

    FOR rec IN SELECT * FROM tmp_nestle_items LOOP
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
            v_batch_no := 'NST-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');
            INSERT INTO public.batches (
                id, product_id, product_name, batch_no, mfg_date, expiry_date,
                qty_received, qty_remaining, purchase_price, selling_price, status, notes
            ) VALUES (
                gen_random_uuid(), v_prod_id, rec.name, v_batch_no, v_today,
                v_today + (rec.shelf_life_days || ' days')::INTERVAL,
                rec.stock_quantity, rec.stock_quantity, rec.purchase_price, rec.selling_price, 'ACTIVE', 'Nestle Inward'
            );
        END IF;
    END LOOP;
END $$;

SELECT p.name AS product_name, p.category, p.unit, p.stock_quantity AS in_stock_qty,
       p.purchase_price AS buy_price_rs, p.selling_price AS sell_price_rs
FROM public.products p
WHERE p.name ILIKE '%Nestle%' OR p.name ILIKE '%Maggi%' OR p.name ILIKE '%Nescafe%'
ORDER BY p.name;

