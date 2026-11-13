-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - MAYORA MALKIST & UNIBIC BISCOTT CRACKERS SETUP
-- PHASE 42: MALKIST CRACKERS & UNIBIC BISCOTT CARAMEL BISCUITS (11 PRODUCTS)
-- Files:
--   - malkist_biscott/instock.sql
--   - supabase/42_phase42_malkist_and_biscott.sql
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
    CREATE TEMP TABLE tmp_malkist_biscott_items (
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

    INSERT INTO tmp_malkist_biscott_items VALUES
    ('Mayora Malkist Cheese Crackers 100g', 'मायोरा मालकिस्ट चीज क्रैकर्स 100 ग्राम', 'मायोरा माल्किस्ट चीज क्रॅकर्स 100 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 48.00, 12.00, 180),
    ('Mayora Malkist Cheese Crackers 144g', 'मायोरा मालकिस्ट चीज क्रैकर्स 144 ग्राम', 'मायोरा माल्किस्ट चीज क्रॅकर्स 144 ग्रॅम', 'Bakery & Extras', 'Piece', 29.00, 35.00, 36.00, 10.00, 180),
    ('Mayora Malkist Chocolate Crackers 100g', 'मायोरा मालकिस्ट चॉकलेट क्रैकर्स 100 ग्राम', 'मायोरा माल्किस्ट चॉकलेट क्रॅकर्स 100 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 48.00, 12.00, 180),
    ('Mayora Malkist Chocolate Crackers 144g', 'मायोरा मालकिस्ट चॉकलेट क्रैकर्स 144 ग्राम', 'मायोरा माल्किस्ट चॉकलेट क्रॅकर्स 144 ग्रॅम', 'Bakery & Extras', 'Piece', 29.00, 35.00, 36.00, 10.00, 180),
    ('Mayora Malkist Cappuccino Crackers 100g', 'मायोरा मालकिस्ट कैपुचीनो क्रैकर्स 100 ग्राम', 'मायोरा माल्किस्ट कॅपुचिनो क्रॅकर्स 100 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 48.00, 12.00, 180),
    ('Mayora Malkist Sugar Glazed Crackers 100g', 'मायोरा मालकिस्ट शुगर क्रैकर्स 100 ग्राम', 'मायोरा माल्किस्ट साखर क्रॅकर्स 100 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 48.00, 12.00, 180),
    ('Mayora Malkist BBQ Crackers 100g', 'मायोरा मालकिस्ट बारबेक्यू क्रैकर्स 100 ग्राम', 'मायोरा माल्किस्ट बारबेक्यू क्रॅकर्स 100 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 36.00, 10.00, 180),
    ('Unibic Biscott Caramel Biscuits 75g', 'यूनिबिक बिस्कॉट कारमेल बिस्कुट 75 ग्राम', 'युनिबिक बिस्कॉट कारमेल बिस्कीट 75 ग्रॅम', 'Bakery & Extras', 'Piece', 20.50, 25.00, 48.00, 12.00, 180),
    ('Unibic Biscott Caramel Biscuits 150g', 'यूनिबिक बिस्कॉट कारमेल बिस्कुट 150 ग्राम', 'युनिबिक बिस्कॉट कारमेल बिस्कीट 150 ग्रॅम', 'Bakery & Extras', 'Piece', 41.00, 50.00, 36.00, 10.00, 180),
    ('Unibic Biscott Spiced Cinnamon 75g', 'यूनिबिक बिस्कॉट दालचीनी 75 ग्राम', 'युनिबिक बिस्कॉट दालचिनी 75 ग्रॅम', 'Bakery & Extras', 'Piece', 20.50, 25.00, 36.00, 10.00, 180),
    ('Unibic Biscott Coffee Biscuits 75g', 'यूनिबिक बिस्कॉट कॉफी बिस्कुट 75 ग्राम', 'युनिबिक बिस्कॉट कॉफी बिस्कीट 75 ग्रॅम', 'Bakery & Extras', 'Piece', 20.50, 25.00, 36.00, 10.00, 180);

    FOR rec IN SELECT * FROM tmp_malkist_biscott_items LOOP
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
            v_batch_no := 'MLK-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');
            INSERT INTO public.batches (
                id, product_id, product_name, batch_no, mfg_date, expiry_date,
                qty_received, qty_remaining, purchase_price, selling_price, status, notes
            ) VALUES (
                gen_random_uuid(), v_prod_id, rec.name, v_batch_no, v_today,
                v_today + (rec.shelf_life_days || ' days')::INTERVAL,
                rec.stock_quantity, rec.stock_quantity, rec.purchase_price, rec.selling_price, 'ACTIVE', 'Malkist & Biscott Inward'
            );
        END IF;
    END LOOP;
END $$;

SELECT p.name AS product_name, p.category, p.unit, p.stock_quantity AS in_stock_qty,
       p.purchase_price AS buy_price_rs, p.selling_price AS sell_price_rs
FROM public.products p
WHERE p.name ILIKE '%Malkist%' OR p.name ILIKE '%Biscott%'
ORDER BY p.name;

