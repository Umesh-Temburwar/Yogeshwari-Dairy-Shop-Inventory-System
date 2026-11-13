-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - PARLE SPECIALTY BISCUITS & CAKES SETUP
-- PHASE 35: PARLE POPULAR BRANDS (NICE, MAGIX, COCONUT, MARIE, MONACO JEERA,
--           HAPPY HAPPY, BOURBON, JAM-IN, FAB, HAPPY HAPPY CAKES & PARLE-TOP)
-- Files:
--   - parle/parle_specialty_instock.sql
--   - supabase/35_phase35_parle_specialty_biscuits_and_cakes.sql
-- ============================================================================
-- Description:
-- Adds all requested Parle brand varieties:
-- 1. Nice (Sugar Sprinkled Coconut)
-- 2. Magix (Cream & Cashew)
-- 3. Coconut (Cookies & Crunch)
-- 4. Marie & Marigold
-- 5. Monaco Jeera & Monaco Classic
-- 6. Classic Regular Parle-G
-- 7. Happy Happy (Choco Chip Biscuits)
-- 8. Bourbon (Rich Chocolate Sandwich)
-- 9. Parle Jam-In (Fruit Jam Centers)
-- 10. Fab (Cream Varieties)
-- 11. Happy Happy Cakes (All Flavours: Choco, Vanilla, Strawberry, Brownie, Choco Lava, Swiss Roll)
-- 12. Parle-Top (Butter, Salted & Masala Crackers)
-- ============================================================================

-- STEP 1: Ensure batches has product_name column if batches table exists
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

-- STEP 2: Insert or Update Parle Specialty Products and Register Inward Batches
DO $$
DECLARE
    v_prod_id UUID;
    v_batch_no VARCHAR(100);
    v_today DATE := CURRENT_DATE;
    rec RECORD;
BEGIN
    -- Temporary table holding Parle specialty items
    CREATE TEMP TABLE tmp_parle_specialty_items (
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

    INSERT INTO tmp_parle_specialty_items VALUES
    -- 1. Parle Nice Biscuits (Sugar Sprinkled Coconut)
    ('Parle Nice Sugar Sprinkled Biscuit 73g', 'पारले नाइस शुगर स्प्रिंकल्ड बिस्कुट 73 ग्राम', 'पारले नाईस साखर बिस्कीट 73 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 180),
    ('Parle Nice Sugar Sprinkled Biscuit 150g', 'पारले नाइस शुगर स्प्रिंकल्ड बिस्कुट 150 ग्राम', 'पारले नाईस साखर बिस्कीट 150 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 48.00, 12.00, 180),

    -- 2. Parle Magix Biscuits
    ('Parle Magix Chocolate Cream 60g', 'पारले मैजिक्स चॉकलेट क्रीम 60 ग्राम', 'पारले मॅजिक्स चॉकलेट क्रीम 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 180),
    ('Parle Magix Vanilla Cream 60g', 'पारले मैजिक्स वैनिला क्रीम 60 ग्राम', 'पारले मॅजिक्स व्हॅनिला क्रीम 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 180),
    ('Parle Magix Elaichi Cream 60g', 'पारले मैजिक्स इलायची क्रीम 60 ग्राम', 'पारले मॅजिक्स वेलची क्रीम 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 180),
    ('Parle Magix Cashew Cookies 100g', 'पारले मैजिक्स काजू कुकीज 100 ग्राम', 'पारले मॅजिक्स काजू कुकीज 100 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 180),

    -- 3. Parle Coconut Biscuits
    ('Parle Coconut Crunch Biscuits 75g', 'पारले कोकोनट क्रंच बिस्कुट 75 ग्राम', 'पारले नारळ क्रंच बिस्कीट 75 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 180),
    ('Parle Coconut Cookies 120g', 'पारले कोकोनट कुकीज 120 ग्राम', 'पारले नारळ कुकीज 120 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 36.00, 10.00, 180),

    -- 4. Parle Marie & Marigold
    ('Parle Marie Choice Biscuit 150g', 'पारले मैरी चॉइस 150 ग्राम', 'पारले मेरी चॉईस 150 ग्रॅम', 'Bakery & Extras', 'Piece', 12.50, 15.00, 48.00, 12.00, 180),
    ('Parle Marie Gold Classic 250g', 'पारले मैरी गोल्ड क्लासिक 250 ग्राम', 'पारले मेरी गोल्ड क्लासिक 250 ग्रॅम', 'Bakery & Extras', 'Piece', 25.00, 30.00, 36.00, 10.00, 180),
    ('Parle Marie Gold 120g', 'पारले मैरी गोल्ड 120 ग्राम', 'पारले मेरी गोल्ड 120 ग्रॅम', 'Bakery & Extras', 'Piece', 12.50, 15.00, 48.00, 12.00, 180),

    -- 5. Parle Monaco Jeera & Monaco Classic
    ('Parle Monaco Jeera Crackers 65g', 'पारले मोनाको जीरा क्रैकर्स 65 ग्राम', 'पारले मोनाको जिरे क्रॅकर्स 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 180),
    ('Parle Monaco Jeera Crackers 120g', 'पारले मोनाको जीरा क्रैकर्स 120 ग्राम', 'पारले मोनाको जिरे क्रॅकर्स 120 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 48.00, 12.00, 180),
    ('Parle Monaco Classic Salted 75g', 'पारले मोनाको क्लासिक साल्टेड 75 ग्राम', 'पारले मोनाको क्लासिक सॉल्टेड 75 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 180),
    ('Parle Monaco Classic Salted 200g', 'पारले मोनाको क्लासिक साल्टेड 200 ग्राम', 'पारले मोनाको क्लासिक सॉल्टेड 200 ग्रॅम', 'Bakery & Extras', 'Piece', 25.00, 30.00, 36.00, 10.00, 180),

    -- 6. Parle-G Classic Regular
    ('Parle-G Classic Regular Glucose 65g', 'पारले-जी क्लासिक रेगुलर ग्लूकोज 65 ग्राम', 'पारले-जी क्लासिक रेगुलर ग्लुकोज 65 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 96.00, 24.00, 180),
    ('Parle-G Classic Regular Glucose 130g', 'पारले-जी क्लासिक रेगुलर ग्लूकोज 130 ग्राम', 'पारले-जी क्लासिक रेगुलर ग्लुकोज 130 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 72.00, 18.00, 180),
    ('Parle-G Classic Regular Glucose 250g', 'पारले-जी क्लासिक रेगुलर ग्लूकोज 250 ग्राम', 'पारले-जी क्लासिक रेगुलर ग्लुकोज 250 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 48.00, 12.00, 180),

    -- 7. Parle Happy Happy (Choco Chip Biscuits)
    ('Parle Happy Happy Choco Chip 45g', 'पारले हैप्पी हैप्पी चोको चिप 45 ग्राम', 'पारले हॅपी हॅपी चोको चिप 45 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 180),
    ('Parle Happy Happy Choco Chip 90g', 'पारले हैप्पी हैप्पी चोको चिप 90 ग्राम', 'पारले हॅपी हॅपी चोको चिप 90 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 180),
    ('Parle Happy Happy Choco Chip 200g', 'पारले हैप्पी हैप्पी चोको चिप 200 ग्राम', 'पारले हॅपी हॅपी चोको चिप 200 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 36.00, 10.00, 180),

    -- 8. Parle Bourbon Chocolate Sandwich
    ('Parle Bourbon Chocolate Sandwich 60g', 'पारले बॉर्बन चॉकलेट सैंडविच 60 ग्राम', 'पारले बॉर्बन चॉकलेट सँडविच 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 180),
    ('Parle Bourbon Chocolate Sandwich 150g', 'पारले बॉर्बन चॉकलेट सैंडविच 150 ग्राम', 'पारले बॉर्बन चॉकलेट सँडविच 150 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 36.00, 10.00, 180),

    -- 9. Parle Jam-In Biscuits
    ('Parle Jam-In Strawberry Cream 65g', 'पारले जैम-इन स्ट्रॉबेरी क्रीम 65 ग्राम', 'पारले जॅम-इन स्ट्रॉबेरी क्रीम 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 180),
    ('Parle Jam-In Mixed Fruit Jam 65g', 'पारले जैम-इन मिक्स्ड फ्रूट 65 ग्राम', 'पारले जॅम-इन मिक्स्ड फ्रूट 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 180),
    ('Parle Jam-In Pineapple Jam 65g', 'पारले जैम-इन पाइनएप्पल 65 ग्राम', 'पारले जॅम-इन अननस 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 180),

    -- 10. Parle Fab Biscuits
    ('Parle Fab Chocolate Cream 100g', 'पारले फैब चॉकलेट क्रीम 100 ग्राम', 'पारले फॅब चॉकलेट क्रीम 100 ग्रॅम', 'Bakery & Extras', 'Piece', 12.50, 15.00, 48.00, 12.00, 180),
    ('Parle Fab Strawberry Cream 60g', 'पारले फैब स्ट्रॉबेरी क्रीम 60 ग्राम', 'पारले फॅब स्ट्रॉबेरी क्रीम 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 180),
    ('Parle Fab Elaichi Cream 60g', 'पारले फैब इलायची क्रीम 60 ग्राम', 'पारले फॅब वेलची क्रीम 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 180),

    -- 11. Parle Happy Happy Cakes (All Flavours)
    ('Parle Happy Happy Chocolate Cake 30g', 'पारले हैप्पी हैप्पी चॉकलेट केक 30 ग्राम', 'पारले हॅपी हॅपी चॉकलेट केक 30 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 90),
    ('Parle Happy Happy Vanilla Cake 30g', 'पारले हैप्पी हैप्पी वैनिला केक 30 ग्राम', 'पारले हॅपी हॅपी व्हॅनिला केक 30 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 90),
    ('Parle Happy Happy Strawberry Cake 30g', 'पारले हैप्पी हैप्पी स्ट्रॉबेरी केक 30 ग्राम', 'पारले हॅपी हॅपी स्ट्रॉबेरी केक 30 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 90),
    ('Parle Happy Happy Choco Brownie Cake 45g', 'पारले हैप्पी हैप्पी चोको ब्राउनी केक 45 ग्राम', 'पारले हॅपी हॅपी चोको ब्राउनी केक 45 ग्रॅम', 'Bakery & Extras', 'Piece', 12.50, 15.00, 36.00, 10.00, 90),
    ('Parle Happy Happy Choco Lava Cake 35g', 'पारले हैप्पी हैप्पी चोको लावा केक 35 ग्राम', 'पारले हॅपी हॅपी चोको लावा केक 35 ग्रॅम', 'Bakery & Extras', 'Piece', 12.50, 15.00, 36.00, 10.00, 90),
    ('Parle Happy Happy Swiss Roll Choco Cake 40g', 'पारले हैप्पी हैप्पी स्विस रोल चोको केक 40 ग्राम', 'पारले हॅपी हॅपी स्विस रोल चोको केक 40 ग्रॅम', 'Bakery & Extras', 'Piece', 12.50, 15.00, 36.00, 10.00, 90),

    -- 12. Parle Top (Butter, Salted & Masala Crackers)
    ('Parle Top Butter Crackers 65g', 'पारले टॉप बटर क्रैकर्स 65 ग्राम', 'पारले टॉप बटर क्रॅकर्स 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 180),
    ('Parle Top Salted Crackers 65g', 'पारले टॉप साल्टेड क्रैकर्स 65 ग्राम', 'पारले टॉप सॉल्टेड क्रॅकर्स 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 180),
    ('Parle Top Masala Crackers 65g', 'पारले टॉप मसाला क्रैकर्स 65 ग्राम', 'पारले टॉप मसाला क्रॅकर्स 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 180);

    -- Loop over each product and insert/update
    FOR rec IN SELECT * FROM tmp_parle_specialty_items LOOP
        SELECT id INTO v_prod_id 
        FROM public.products 
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(rec.name))
        LIMIT 1;

        IF v_prod_id IS NULL THEN
            INSERT INTO public.products (
                id,
                name,
                hindi_name,
                marathi_name,
                category,
                unit,
                purchase_price,
                selling_price,
                stock_quantity,
                min_stock_alert,
                shelf_life_days,
                has_expiry,
                is_active
            ) VALUES (
                gen_random_uuid(),
                rec.name,
                rec.hindi_name,
                rec.marathi_name,
                rec.category,
                rec.unit,
                rec.purchase_price,
                rec.selling_price,
                rec.stock_quantity,
                rec.min_stock_alert,
                rec.shelf_life_days,
                TRUE,
                TRUE
            ) RETURNING id INTO v_prod_id;
        ELSE
            UPDATE public.products
            SET 
                hindi_name = rec.hindi_name,
                marathi_name = rec.marathi_name,
                category = rec.category,
                unit = rec.unit,
                purchase_price = rec.purchase_price,
                selling_price = rec.selling_price,
                stock_quantity = rec.stock_quantity,
                min_stock_alert = rec.min_stock_alert,
                shelf_life_days = rec.shelf_life_days,
                has_expiry = TRUE,
                is_active = TRUE
            WHERE id = v_prod_id;
        END IF;

        -- Register / Refresh FEFO Batch in public.batches
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'batches'
        ) THEN
            v_batch_no := 'PRL-SP-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');

            INSERT INTO public.batches (
                id,
                product_id,
                product_name,
                batch_no,
                mfg_date,
                expiry_date,
                qty_received,
                qty_remaining,
                purchase_price,
                selling_price,
                status,
                notes
            ) VALUES (
                gen_random_uuid(),
                v_prod_id,
                rec.name,
                v_batch_no,
                v_today,
                v_today + (rec.shelf_life_days || ' days')::INTERVAL,
                rec.stock_quantity,
                rec.stock_quantity,
                rec.purchase_price,
                rec.selling_price,
                'ACTIVE',
                'Parle Specialty Biscuits and Cakes Inward'
            );
        END IF;
    END LOOP;
END $$;

-- STEP 3: Verification Output - List all added Parle specialty products and their live stock
SELECT 
    p.name AS product_name,
    p.category,
    p.unit,
    p.stock_quantity AS in_stock_qty,
    p.purchase_price AS buy_price_rs,
    p.selling_price AS sell_price_rs,
    (p.stock_quantity * p.purchase_price) AS total_inventory_valuation_rs,
    p.shelf_life_days,
    p.is_active
FROM public.products p
WHERE p.name ILIKE '%Parle%' AND (
    p.name ILIKE '%Nice%' OR 
    p.name ILIKE '%Magix%' OR 
    p.name ILIKE '%Coconut%' OR 
    p.name ILIKE '%Marie%' OR 
    p.name ILIKE '%Monaco%' OR 
    p.name ILIKE '%Classic%' OR 
    p.name ILIKE '%Happy Happy%' OR 
    p.name ILIKE '%Bourbon%' OR 
    p.name ILIKE '%Jam-In%' OR 
    p.name ILIKE '%Fab%' OR 
    p.name ILIKE '%Cake%' OR 
    p.name ILIKE '%Top%'
)
ORDER BY p.name;

