-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - MOTI NAMKEEN & SABUDANA CHIWDA SETUP
-- PHASE 45: MOTI COMPLETE CATALOG (9 PRODUCTS)
-- Files:
--   - moti/instock.sql
--   - supabase/45_phase45_moti_namkeen_sabudana_chiwda.sql
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
    CREATE TEMP TABLE tmp_moti_items (
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

    INSERT INTO tmp_moti_items VALUES
    ('Moti Sabudana Falahari Chiwda 100g', 'मोती साबूदाना फलाहारी चिवड़ा 100 ग्राम', 'मोती साबुदाणा उपवास चिवडा 100 ग्रॅम', 'Bakery & Extras', 'Piece', 20.00, 25.00, 60.00, 15.00, 180),
    ('Moti Sabudana Falahari Chiwda 200g', 'मोती साबूदाना फलाहारी चिवड़ा 200 ग्राम', 'मोती साबुदाणा उपवास चिवडा 200 ग्रॅम', 'Bakery & Extras', 'Piece', 41.00, 50.00, 48.00, 12.00, 180),
    ('Moti Sabudana Falahari Chiwda 500g', 'मोती साबूदाना फलाहारी चिवड़ा 500 ग्राम', 'मोती साबुदाणा उपवास चिवडा 500 ग्रॅम', 'Bakery & Extras', 'Piece', 98.00, 120.00, 24.00, 6.00, 180),
    ('Moti Potato Salli Falahari Chiwda 100g', 'मोती आलू सल्ली फलाहारी चिवड़ा 100 ग्राम', 'मोती बटाटा सल्ली उपवास चिवडा 100 ग्रॅम', 'Bakery & Extras', 'Piece', 24.00, 30.00, 48.00, 12.00, 180),
    ('Moti Potato Salli Falahari Chiwda 200g', 'मोती आलू सल्ली फलाहारी चिवड़ा 200 ग्राम', 'मोती बटाटा सल्ली उपवास चिवडा 200 ग्रॅम', 'Bakery & Extras', 'Piece', 48.00, 60.00, 36.00, 10.00, 180),
    ('Moti Makka (Corn) Chiwda 200g', 'मोती मक्का चिवड़ा 200 ग्राम', 'मोती मका चिवडा 200 ग्रॅम', 'Bakery & Extras', 'Piece', 32.00, 40.00, 36.00, 10.00, 180),
    ('Moti Poha Chiwda 200g', 'मोती पोहा चिवड़ा 200 ग्राम', 'मोती पोहा चिवडा 200 ग्रॅम', 'Bakery & Extras', 'Piece', 32.00, 40.00, 36.00, 10.00, 180),
    ('Moti Tikha Gathiya 200g', 'मोती तीखा गांठिया 200 ग्राम', 'मोती तिखट गाठिया 200 ग्रॅम', 'Bakery & Extras', 'Piece', 32.00, 40.00, 36.00, 10.00, 180),
    ('Moti Lasun Sev 200g', 'मोती लहसुन सेव 200 ग्राम', 'मोती लसूण शेव 200 ग्रॅम', 'Bakery & Extras', 'Piece', 32.00, 40.00, 36.00, 10.00, 180);

    FOR rec IN SELECT * FROM tmp_moti_items LOOP
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
            v_batch_no := 'MOT-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');
            INSERT INTO public.batches (
                id, product_id, product_name, batch_no, mfg_date, expiry_date,
                qty_received, qty_remaining, purchase_price, selling_price, status, notes
            ) VALUES (
                gen_random_uuid(), v_prod_id, rec.name, v_batch_no, v_today,
                v_today + (rec.shelf_life_days || ' days')::INTERVAL,
                rec.stock_quantity, rec.stock_quantity, rec.purchase_price, rec.selling_price, 'ACTIVE', 'Moti Namkeen Inward'
            );
        END IF;
    END LOOP;
END $$;

SELECT p.name AS product_name, p.category, p.unit, p.stock_quantity AS in_stock_qty,
       p.purchase_price AS buy_price_rs, p.selling_price AS sell_price_rs
FROM public.products p
WHERE p.name ILIKE '%Moti%'
ORDER BY p.name;

