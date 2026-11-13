-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - HALDIRAM IN-STOCK SETUP
-- PHASE 31: HALDIRAM PRODUCTS & INITIAL INVENTORY INWARD (30 PRODUCTS)
-- File: supabase/31_phase31_haldiram_in_stock_inventory.sql
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

-- STEP 2: Insert or Update 30 Haldiram Products and Register Inward Batches
DO $$
DECLARE
    v_prod_id UUID;
    v_batch_no VARCHAR(100);
    v_today DATE := CURRENT_DATE;
    rec RECORD;
BEGIN
    -- Temporary table holding 30 Haldiram items
    CREATE TEMP TABLE tmp_haldiram_items (
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

    INSERT INTO tmp_haldiram_items VALUES
    -- Namkeen / Snacks
    ('Haldiram Bhujia Sev 200 gm', 'हल्दीराम भुजिया सेव 200 ग्राम', 'हळदीराम भुजिया शेव 200 ग्रॅम', 'Bakery & Extras', 'Piece', 50.00, 60.00, 24.00, 5.00, 120),
    ('Haldiram Bhujia Sev 50 gm', 'हल्दीराम भुजिया सेव 50 ग्राम', 'हळदीराम भुजिया शेव 50 ग्रॅम', 'Bakery & Extras', 'Piece', 16.00, 20.00, 36.00, 10.00, 120),
    ('Haldiram Bhujia Sev 15 gm', 'हल्दीराम भुजिया सेव 15 ग्राम', 'हळदीराम भुजिया शेव 15 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 60.00, 15.00, 120),
    ('Haldiram Mixture 200 gm', 'हल्दीराम मिक्चर 200 ग्राम', 'हळदीराम मिक्चर 200 ग्रॅम', 'Bakery & Extras', 'Piece', 50.00, 60.00, 24.00, 5.00, 120),
    ('Haldiram Mixture 50 gm', 'हल्दीराम मिक्चर 50 ग्राम', 'हळदीराम मिक्चर 200 ग्रॅम', 'Bakery & Extras', 'Piece', 16.00, 20.00, 36.00, 10.00, 120),
    ('Haldiram Mixture 15 gm', 'हल्दीराम मिक्चर 15 ग्राम', 'हळदीराम मिक्चर 15 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 60.00, 15.00, 120),
    ('Haldiram All in one 200 gm', 'हल्दीराम ऑल इन वन 200 ग्राम', 'हळदीराम ऑल इन वन 200 ग्रॅम', 'Bakery & Extras', 'Piece', 50.00, 60.00, 24.00, 5.00, 120),
    ('Haldiram Khatta Mitha 200 gm', 'हल्दीराम खट्टा मीठा 200 ग्राम', 'हळदीराम खट्टा मिठा 200 ग्रॅम', 'Bakery & Extras', 'Piece', 50.00, 60.00, 24.00, 5.00, 120),
    ('Haldiram Khatta Mittha 50 gm', 'हल्दीराम खट्टा मीठा 50 ग्राम', 'हळदीराम खट्टा मिठा 50 ग्रॅम', 'Bakery & Extras', 'Piece', 16.00, 20.00, 36.00, 10.00, 120),
    ('Haldiram Khatta Mittha 15 gm', 'हल्दीराम खट्टा मीठा 15 ग्राम', 'हळदीराम खट्टा मिठा 15 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 60.00, 15.00, 120),

    -- Soan Papdi
    ('Haldiram Orange Sonpapdi 250 gm', 'हल्दीराम ऑरेंज सोनपापड़ी 250 ग्राम', 'हळदीराम संत्री सोनपापडी 250 ग्रॅम', 'Sweets/Mithai', 'Piece', 75.00, 90.00, 20.00, 5.00, 90),
    ('Haldiram Orange Sonpapdi 500 gm', 'हल्दीराम ऑरेंज सोनपापड़ी 500 ग्राम', 'हळदीराम संत्री सोनपापडी 500 ग्रॅम', 'Sweets/Mithai', 'Piece', 145.00, 175.00, 15.00, 3.00, 90),
    ('Haldiram Chocolate Sonpapdi 250 gm', 'हल्दीराम चॉकलेट सोनपापड़ी 250 ग्राम', 'हळदीराम चॉकलेट सोनपापडी 250 ग्रॅम', 'Sweets/Mithai', 'Piece', 80.00, 95.00, 20.00, 5.00, 90),
    ('Haldiram Chocolate Sonpapdi 500 gm', 'हल्दीराम चॉकलेट सोनपापड़ी 500 ग्राम', 'हळदीराम चॉकलेट सोनपापडी 500 ग्रॅम', 'Sweets/Mithai', 'Piece', 155.00, 185.00, 15.00, 3.00, 90),
    ('Haldiram Regular Sonpapdi 250 gm', 'हल्दीराम रेगुलर सोनपापड़ी 250 ग्राम', 'हळदीराम रेगुलर सोनपापडी 250 ग्रॅम', 'Sweets/Mithai', 'Piece', 70.00, 85.00, 25.00, 5.00, 90),
    ('Haldiram Regular Sonpapdi 500 gm', 'हल्दीराम रेगुलर सोनपापड़ी 500 ग्राम', 'हळदीराम रेगुलर सोनपापडी 500 ग्रॅम', 'Sweets/Mithai', 'Piece', 135.00, 165.00, 20.00, 5.00, 90),
    ('Haldiram Coconut Sonpapdi 250 gm', 'हल्दीराम कोकोनट सोनपापड़ी 250 ग्राम', 'हळदीराम नारळ सोनपापडी 250 ग्रॅम', 'Sweets/Mithai', 'Piece', 78.00, 92.00, 20.00, 5.00, 90),

    -- Halwa & Barfi
    ('Haldiram Mango Halwa', 'हल्दीराम मैंगो हलवा', 'हळदीराम मँगो हलवा', 'Sweets/Mithai', 'Piece', 85.00, 105.00, 15.00, 3.00, 60),
    ('Haldiram Badam Halwa', 'हल्दीराम बादाम हलवा', 'हळदीराम बदाम हलवा', 'Sweets/Mithai', 'Piece', 110.00, 135.00, 15.00, 3.00, 60),
    ('Haldiram Orang Barfi', 'हल्दीराम ऑरेंज बर्फी', 'हळदीराम संत्री बर्फी', 'Sweets/Mithai', 'Piece', 95.00, 115.00, 15.00, 3.00, 45),

    -- Tinned Sweets (Rasgulla & Gulab Jamun)
    ('Haldiram Rasgulla 500 gm', 'हल्दीराम रसगुल्ला 500 ग्राम', 'हळदीराम रसगुल्ला 500 ग्रॅम', 'Sweets/Mithai', 'Piece', 110.00, 130.00, 20.00, 5.00, 180),
    ('Haldiram Rasgulla 1000 gm', 'हल्दीराम रसगुल्ला 1 किग्रा', 'हळदीराम रसगुल्ला 1 किलो', 'Sweets/Mithai', 'Kg', 210.00, 250.00, 15.00, 3.00, 180),
    ('Haldiram Gulab Jamun 500 gm', 'हल्दीराम गुलाब जामुन 500 ग्राम', 'हळदीराम गुलाब जामुन 500 ग्रॅम', 'Sweets/Mithai', 'Piece', 115.00, 135.00, 20.00, 5.00, 180),
    ('Haldiram Gulab Jamun 1000 gm', 'हल्दीराम गुलाब जामुन 1 किग्रा', 'हळदीराम गुलाब जामुन 1 किलो', 'Sweets/Mithai', 'Kg', 220.00, 260.00, 15.00, 3.00, 180),

    -- Farali / Upvas Chiwda
    ('Haldiram Farali Chiwda 200 gm', 'हल्दीराम फराली चिवड़ा 200 ग्राम', 'हळदीराम उपवास चिवडा 200 ग्रॅम', 'Bakery & Extras', 'Piece', 52.00, 65.00, 25.00, 5.00, 120),
    ('Haldiram Farali Chiwda 50 gm', 'हल्दीराम फराली चिवड़ा 50 ग्राम', 'हळदीराम उपवास चिवडा 50 ग्रॅम', 'Bakery & Extras', 'Piece', 16.00, 20.00, 36.00, 10.00, 120),
    ('Haldiram Farali Chiwda 15 gm', 'हल्दीराम फराली चिवड़ा 15 ग्राम', 'हळदीराम उपवास चिवडा 15 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 60.00, 15.00, 120),

    -- Bakery Rusk / Toast
    ('Haldiram Elaichi Rusk 250 gm', 'हल्दीराम इलायची रस्क 250 ग्राम', 'हळदीराम वेलची टोस्ट 250 ग्रॅम', 'Bakery & Extras', 'Piece', 40.00, 50.00, 30.00, 5.00, 90),
    ('Haldiram Milk Rusk 250 gm', 'हल्दीराम मिल्क रस्क 250 ग्राम', 'हळदीराम मिल्क टोस्ट 250 ग्रॅम', 'Bakery & Extras', 'Piece', 40.00, 50.00, 30.00, 5.00, 90),
    ('Haldiram Regular Rusk 250 gm', 'हल्दीराम रेगुलर रस्क 250 ग्राम', 'हळदीराम रेगुलर टोस्ट 250 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 30.00, 5.00, 90);

    -- Loop over each product and insert/update
    FOR rec IN SELECT * FROM tmp_haldiram_items LOOP
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
            v_batch_no := 'HLD-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');

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
                'Haldiram Fresh Stock Entry'
            );
        END IF;
    END LOOP;
END $$;

-- STEP 3: Verification Output - List all added Haldiram products and their live stock
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
WHERE p.name ILIKE '%Haldiram%'
ORDER BY p.category, p.name;

