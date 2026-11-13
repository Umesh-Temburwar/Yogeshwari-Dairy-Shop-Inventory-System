-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - CHAKOTE WAFERS, TOAST, KHARI & NAMKEEN SETUP
-- PHASE 44: CHAKOTE POTATO CHIPS, BHUJIA, MILK TOAST, KHARI & CREAM ROLLS
-- File: supabase/44_phase44_chakote_namkeen_and_wafers.sql
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
    CREATE TEMP TABLE tmp_chakote_items (
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

    INSERT INTO tmp_chakote_items VALUES
    ('Chakote Potato Chips Salted 25g', 'चकोते आलू चिप्स साल्टेड 25 ग्राम', 'चकोते बटाटा वेफर्स सॉल्टेड 25 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 120),
    ('Chakote Potato Chips Salted 50g', 'चकोते आलू चिप्स साल्टेड 50 ग्राम', 'चकोते बटाटा वेफर्स सॉल्टेड 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120),
    ('Chakote Potato Chips Masala 25g', 'चकोते आलू चिप्स मसाला 25 ग्राम', 'चकोते बटाटा वेफर्स मसाला 25 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 120),
    ('Chakote Potato Chips Masala 50g', 'चकोते आलू चिप्स मसाला 50 ग्राम', 'चकोते बटाटा वेफर्स मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120),
    ('Chakote Potato Chips Tomato 50g', 'चकोते आलू चिप्स टोमैटो 50 ग्राम', 'चकोते बटाटा वेफर्स टोमॅटो 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120),
    ('Chakote Special Bhujia Sev 65g', 'चकोते स्पेशल भुजिया सेव 65 ग्राम', 'चकोते स्पेशल भुजिया शेव 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 150),
    ('Chakote Special Bhujia Sev 200g', 'चकोते स्पेशल भुजिया सेव 200 ग्राम', 'चकोते स्पेशल भुजिया शेव 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 36.00, 10.00, 150),
    ('Chakote Mix Farsan Namkeen 200g', 'चकोते मिक्स फरसाण 200 ग्राम', 'चकोते मिक्स फरसाण 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 48.00, 12.00, 150),
    ('Chakote Bhavnagari Gathiya 200g', 'चकोते भावनगरी गांठिया 200 ग्राम', 'चकोते भावनगरी गाठिया 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 36.00, 10.00, 150),
    ('Chakote Premium Milk Toast (Rusk) 200g', 'चकोते मिल्क टोस्ट 200 ग्राम', 'चकोते मिल्क टोस्ट 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.00, 35.00, 48.00, 12.00, 180),
    ('Chakote Premium Elaichi Toast 200g', 'चकोते इलायची टोस्ट 200 ग्राम', 'चकोते वेलची टोस्ट 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.00, 35.00, 36.00, 10.00, 180),
    ('Chakote Butter Khari 200g', 'चकोते बटर खारी 200 ग्राम', 'चकोते बटर खारी 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.00, 35.00, 48.00, 12.00, 120),
    ('Chakote Masala Khari 200g', 'चकोते मसाला खारी 200 ग्राम', 'चकोते मसाला खारी 200 ग्रॅम', 'Bakery & Extras', 'Piece', 33.00, 40.00, 36.00, 10.00, 120),
    ('Chakote Jeera Khari 200g', 'चकोते जीरा खारी 200 ग्राम', 'चकोते जिरे खारी 200 ग्रॅम', 'Bakery & Extras', 'Piece', 33.00, 40.00, 36.00, 10.00, 120),
    ('Chakote Chocolate Cream Roll', 'चकोते चॉकलेट क्रीम रोल', 'चकोते चॉकलेट क्रीम रोल', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 90),
    ('Chakote Vanilla Cream Roll', 'चकोते वैनिला क्रीम रोल', 'चकोते व्हॅनिला क्रीम रोल', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 90);

    FOR rec IN SELECT * FROM tmp_chakote_items LOOP
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
            v_batch_no := 'CHK-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');
            INSERT INTO public.batches (
                id, product_id, product_name, batch_no, mfg_date, expiry_date,
                qty_received, qty_remaining, purchase_price, selling_price, status, notes
            ) VALUES (
                gen_random_uuid(), v_prod_id, rec.name, v_batch_no, v_today,
                v_today + (rec.shelf_life_days || ' days')::INTERVAL,
                rec.stock_quantity, rec.stock_quantity, rec.purchase_price, rec.selling_price, 'ACTIVE', 'Chakote Wafers & Bakery Inward'
            );
        END IF;
    END LOOP;
END $$;

SELECT p.name AS product_name, p.category, p.unit, p.stock_quantity AS in_stock_qty,
       p.purchase_price AS buy_price_rs, p.selling_price AS sell_price_rs
FROM public.products p
WHERE p.name ILIKE '%Chakote%'
ORDER BY p.name;

