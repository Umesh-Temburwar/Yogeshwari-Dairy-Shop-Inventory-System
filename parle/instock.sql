-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - PARLE BISCUITS ALL PRODUCTS IN-STOCK SETUP
-- PHASE 34: PARLE BISCUITS COMPLETE CATALOG & INVENTORY INWARD (34 PRODUCTS)
-- Files:
--   - parle/instock.sql
--   - parle/parle_instock.sql
--   - supabase/34_phase34_parle_biscuits_in_stock_inventory.sql
-- ============================================================================
-- Description:
-- Adds all 34 popular Parle biscuits (Parle-G, Monaco, Krackjack, 20-20 Cookies,
-- Hide & Seek Choco Chip, Marie Choice, Nutricrunch, Fab Cream & Real Rusk)
-- with realistic wholesale & retail rates, initial stocks, and FEFO expiry tracking.
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

-- STEP 2: Insert or Update 34 Parle Biscuit Products and Register Inward Batches
DO $$
DECLARE
    v_prod_id UUID;
    v_batch_no VARCHAR(100);
    v_today DATE := CURRENT_DATE;
    rec RECORD;
BEGIN
    -- Temporary table holding 34 Parle Biscuit items
    CREATE TEMP TABLE tmp_parle_items (
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

    INSERT INTO tmp_parle_items VALUES
    -- 1. Parle-G Glucose Biscuits
    ('Parle-G Glucose Biscuit 50g', 'पारले-जी ग्लूकोज बिस्कुट 50 ग्राम', 'पारले-जी ग्लुकोज बिस्कीट 50 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 96.00, 24.00, 180),
    ('Parle-G Glucose Biscuit 110g', 'पारले-जी ग्लूकोज बिस्कुट 110 ग्राम', 'पारले-जी ग्लुकोज बिस्कीट 110 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 72.00, 18.00, 180),
    ('Parle-G Glucose Biscuit 250g', 'पारले-जी ग्लूकोज बिस्कुट 250 ग्राम', 'पारले-जी ग्लुकोज बिस्कीट 250 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 48.00, 12.00, 180),
    ('Parle-G Glucose Biscuit 800g Family Pack', 'पारले-जी ग्लूकोज बिस्कुट 800 ग्राम', 'पारले-जी ग्लुकोज फॅमिली पॅक 800 ग्रॅम', 'Bakery & Extras', 'Piece', 64.00, 75.00, 24.00, 6.00, 180),
    ('Parle-G Gold Biscuit 100g', 'पारले-जी गोल्ड बिस्कुट 100 ग्राम', 'पारले-जी गोल्ड बिस्कीट 100 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 180),

    -- 2. Monaco & Salty Crackers
    ('Parle Monaco Salted Biscuit 50g', 'पारले मोनाको नमकीन बिस्कुट 50 ग्राम', 'पारले मोनाको सॉल्टेड बिस्कीट 50 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 180),
    ('Parle Monaco Salted Biscuit 120g', 'पारले मोनाको नमकीन बिस्कुट 120 ग्राम', 'पारले मोनाको सॉल्टेड बिस्कीट 120 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 180),
    ('Parle Monaco Salted Biscuit 200g', 'पारले मोनाको नमकीन बिस्कुट 200 ग्राम', 'पारले मोनाको सॉल्टेड बिस्कीट 200 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 36.00, 10.00, 180),
    ('Parle Monaco Cheeslings 150g', 'पारले मोनाको चीज़लिंग्स 150 ग्राम', 'पारले मोनाको चीजलिंग्स 150 ग्रॅम', 'Bakery & Extras', 'Piece', 51.00, 60.00, 24.00, 6.00, 180),
    ('Parle Monaco Pizza Toppings 65g', 'पारले मोनाको पिज़्ज़ा टॉपिंग्स 65 ग्राम', 'पारले मोनाको पिझ्झा टॉपिंग्स 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 36.00, 10.00, 180),

    -- 3. Krackjack Sweet & Salty
    ('Parle Krackjack Sweet and Salty 50g', 'पारले क्रैकजैक नमकीन-मीठा बिस्कुट 50 ग्राम', 'पारले क्रॅकजॅक गोड-खारट बिस्कीट 50 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 180),
    ('Parle Krackjack Sweet and Salty 120g', 'पारले क्रैकजैक नमकीन-मीठा बिस्कुट 120 ग्राम', 'पारले क्रॅकजॅक गोड-खारट बिस्कीट 120 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 180),
    ('Parle Krackjack Sweet and Salty 200g', 'पारले क्रैकजैक नमकीन-मीठा बिस्कुट 200 ग्राम', 'पारले क्रॅकजॅक गोड-खारट बिस्कीट 200 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 36.00, 10.00, 180),
    ('Parle Krackjack Butter Masala 65g', 'पारले क्रैकजैक बटर मसाला 65 ग्राम', 'पारले क्रॅकजॅक बटर मसाला 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 36.00, 10.00, 180),

    -- 4. Parle 20-20 Cookies
    ('Parle 20-20 Butter Cookies 50g', 'पारले 20-20 बटर कुकीज 50 ग्राम', 'पारले 20-20 बटर कुकीज 50 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 180),
    ('Parle 20-20 Butter Cookies 100g', 'पारले 20-20 बटर कुकीज 100 ग्राम', 'पारले 20-20 बटर कुकीज 100 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 180),
    ('Parle 20-20 Cashew Cookies 50g', 'पारले 20-20 काजू कुकीज 50 ग्राम', 'पारले 20-20 काजू कुकीज 50 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 180),
    ('Parle 20-20 Cashew Cookies 100g', 'पारले 20-20 काजू कुकीज 100 ग्राम', 'पारले 20-20 काजू कुकीज 100 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 180),
    ('Parle 20-20 Kaju Pista Cookies 100g', 'पारले 20-20 काजू पिस्ता कुकीज 100 ग्राम', 'पारले 20-20 काजू पिस्ता कुकीज 100 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 180),

    -- 5. Hide & Seek Premium Choco Chip Cookies
    ('Parle Hide and Seek Choco Chip 33g', 'पारले हाइड एंड सीक 33 ग्राम', 'पारले हाइड अँड सीक 33 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 180),
    ('Parle Hide and Seek Choco Chip 100g', 'पारले हाइड एंड सीक 100 ग्राम', 'पारले हाइड अँड सीक 100 ग्रॅम', 'Bakery & Extras', 'Piece', 25.00, 30.00, 48.00, 12.00, 180),
    ('Parle Hide and Seek Choco Chip 200g', 'पारले हाइड एंड सीक 200 ग्राम', 'पारले हाइड अँड सीक 200 ग्रॅम', 'Bakery & Extras', 'Piece', 51.00, 60.00, 24.00, 6.00, 180),
    ('Parle Hide and Seek Black Bourbon 100g', 'पारले ब्लैक बॉर्बन 100 ग्राम', 'पारले ब्लॅक बॉर्बन 100 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 36.00, 10.00, 180),
    ('Parle Hide and Seek Milano Choco Chip 75g', 'पारले मिलानो चोको चिप 75 ग्राम', 'पारले मिलानो चोको चिप 75 ग्रॅम', 'Bakery & Extras', 'Piece', 29.00, 35.00, 24.00, 6.00, 180),

    -- 6. Marie Choice & Nutricrunch Digestive
    ('Parle Marie Choice Biscuit 100g', 'पारले मैरी चॉइस बिस्कुट 100 ग्राम', 'पारले मेरी चॉईस बिस्कीट 100 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 180),
    ('Parle Marie Choice Biscuit 250g', 'पारले मैरी चॉइस बिस्कुट 250 ग्राम', 'पारले मेरी चॉईस बिस्कीट 250 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 36.00, 10.00, 180),
    ('Parle Nutricrunch Digestive 100g', 'पारले न्यूट्रीक्रंच डाइजेस्टिव 100 ग्राम', 'पारले न्यूट्रीक्रंच डायजेस्टिव्ह 100 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 36.00, 10.00, 180),
    ('Parle Nutricrunch Honey and Oats 100g', 'पारले न्यूट्रीक्रंच हनी एंड ओट्स 100 ग्राम', 'पारले न्यूट्रीक्रंच हनी अँड ओट्स 100 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 36.00, 10.00, 180),

    -- 7. Cream Biscuits & Kismi
    ('Parle Fab Chocolate Cream 60g', 'पारले फैब चॉकलेट क्रीम 60 ग्राम', 'पारले फॅब चॉकलेट क्रीम 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 180),
    ('Parle Fab Orange Cream 60g', 'पारले फैब ऑरेंज क्रीम 60 ग्राम', 'पारले फॅब ऑरेंज क्रीम 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 180),
    ('Parle Fab Vanilla Cream 60g', 'पारले फैब वैनिला क्रीम 60 ग्राम', 'पारले फॅब व्हॅनिला क्रीम 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 180),
    ('Parle Kismi Cinnamon Biscuit 50g', 'पारले किसमी दालचीनी बिस्कुट 50 ग्राम', 'पारले किसमी दालचिनी बिस्कीट 50 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 60.00, 15.00, 180),

    -- 8. Parle Real Rusk / Toast
    ('Parle Real Elaichi Rusk 200g', 'पारले रियल इलायची रस्क 200 ग्राम', 'पारले रियल वेलची टोस्ट 200 ग्रॅम', 'Bakery & Extras', 'Piece', 25.00, 30.00, 36.00, 10.00, 120),
    ('Parle Real Elaichi Rusk 400g', 'पारले रियल इलायची रस्क 400 ग्राम', 'पारले रियल वेलची टोस्ट 400 ग्रॅम', 'Bakery & Extras', 'Piece', 51.00, 60.00, 24.00, 6.00, 120);

    -- Loop over each product and insert/update
    FOR rec IN SELECT * FROM tmp_parle_items LOOP
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
            v_batch_no := 'PRL-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');

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
                'Parle Biscuits Official Inward'
            );
        END IF;
    END LOOP;
END $$;

-- STEP 3: Verification Output - List all added Parle products and their live stock
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
WHERE p.name ILIKE '%Parle%'
ORDER BY p.name;

