-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - CADBURY CHOCOLATES & CONFECTIONERY SETUP
-- PHASE 37: CADBURY COMPLETE CATALOG (DAIRY MILK, SILK, 5 STAR, PERK, FUSE,
--           GEMS, CELEBRATIONS, BOURNVITA, CHOCOBAKES, CRISPELLO) (51 PRODUCTS)
-- File: cadbury/cadbury_instock.sql
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

-- STEP 2: Insert or Update Cadbury Products and Register Inward Batches
DO $$
DECLARE
    v_prod_id UUID;
    v_batch_no VARCHAR(100);
    v_today DATE := CURRENT_DATE;
    rec RECORD;
BEGIN
    -- Temporary table holding Cadbury items
    CREATE TEMP TABLE tmp_cadbury_items (
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

    INSERT INTO tmp_cadbury_items VALUES
    -- 1. CADBURY DAIRY MILK (REGULAR BARS)
    ('Cadbury Dairy Milk Chocolate 13.2g', 'कैडबरी डेयरी मिल्क चॉकलेट 13.2 ग्राम', 'कॅडबरी डेअरी मिल्क चॉकलेट 13.2 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 120.00, 30.00, 365),
    ('Cadbury Dairy Milk Chocolate 24g', 'कैडबरी डेयरी मिल्क चॉकलेट 24 ग्राम', 'कॅडबरी डेअरी मिल्क चॉकलेट 24 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 96.00, 24.00, 365),
    ('Cadbury Dairy Milk Chocolate 50g', 'कैडबरी डेयरी मिल्क चॉकलेट 50 ग्राम', 'कॅडबरी डेअरी मिल्क चॉकलेट 50 ग्रॅम', 'Bakery & Extras', 'Piece', 38.00, 45.00, 60.00, 15.00, 365),
    ('Cadbury Dairy Milk Chocolate 130g', 'कैडबरी डेयरी मिल्क चॉकलेट 130 ग्राम', 'कॅडबरी डेअरी मिल्क चॉकलेट 130 ग्रॅम', 'Bakery & Extras', 'Piece', 84.00, 100.00, 36.00, 10.00, 365),
    ('Cadbury Dairy Milk Maha Pack 160g', 'कैडबरी डेयरी मिल्क महा पैक 160 ग्राम', 'कॅडबरी डेअरी मिल्क महा पॅक 160 ग्रॅम', 'Bakery & Extras', 'Piece', 126.00, 150.00, 24.00, 8.00, 365),
    ('Cadbury Dairy Milk Crackle 36g', 'कैडबरी डेयरी मिल्क क्रैकल 36 ग्राम', 'कॅडबरी डेअरी मिल्क क्रॅकल 36 ग्रॅम', 'Bakery & Extras', 'Piece', 38.00, 45.00, 48.00, 12.00, 365),
    ('Cadbury Dairy Milk Fruit & Nut 36g', 'कैडबरी डेयरी मिल्क फ्रूट एंड नट 36 ग्राम', 'कॅडबरी डेअरी मिल्क फ्रूट अँड नट 36 ग्रॅम', 'Bakery & Extras', 'Piece', 38.00, 45.00, 48.00, 12.00, 365),
    ('Cadbury Dairy Milk Roast Almond 36g', 'कैडबरी डेयरी मिल्क रोस्ट आलमंड 36 ग्राम', 'कॅडबरी डेअरी मिल्क रोस्ट बदाम 36 ग्रॅम', 'Bakery & Extras', 'Piece', 38.00, 45.00, 48.00, 12.00, 365),

    -- 2. CADBURY DAIRY MILK SILK RANGE
    ('Cadbury Dairy Milk Silk Chocolate 60g', 'कैडबरी सिल्क चॉकलेट 60 ग्राम', 'कॅडबरी सिल्क चॉकलेट 60 ग्रॅम', 'Bakery & Extras', 'Piece', 68.00, 80.00, 48.00, 12.00, 270),
    ('Cadbury Dairy Milk Silk Chocolate 150g', 'कैडबरी सिल्क चॉकलेट 150 ग्राम', 'कॅडबरी सिल्क चॉकलेट 150 ग्रॅम', 'Bakery & Extras', 'Piece', 160.00, 190.00, 30.00, 8.00, 270),
    ('Cadbury Dairy Milk Silk Fruit & Nut 55g', 'कैडबरी सिल्क फ्रूट एंड नट 55 ग्राम', 'कॅडबरी सिल्क फ्रूट अँड नट 55 ग्रॅम', 'Bakery & Extras', 'Piece', 72.00, 85.00, 36.00, 10.00, 270),
    ('Cadbury Dairy Milk Silk Fruit & Nut 137g', 'कैडबरी सिल्क फ्रूट एंड नट 137 ग्राम', 'कॅडबरी सिल्क फ्रूट अँड नट 137 ग्रॅम', 'Bakery & Extras', 'Piece', 165.00, 195.00, 24.00, 6.00, 270),
    ('Cadbury Dairy Milk Silk Roast Almond 55g', 'कैडबरी सिल्क रोस्ट आलमंड 55 ग्राम', 'कॅडबरी सिल्क रोस्ट बदाम 55 ग्रॅम', 'Bakery & Extras', 'Piece', 72.00, 85.00, 36.00, 10.00, 270),
    ('Cadbury Dairy Milk Silk Roast Almond 137g', 'कैडबरी सिल्क रोस्ट आलमंड 137 ग्राम', 'कॅडबरी सिल्क रोस्ट बदाम 137 ग्रॅम', 'Bakery & Extras', 'Piece', 165.00, 195.00, 24.00, 6.00, 270),
    ('Cadbury Dairy Milk Silk Oreo 60g', 'कैडबरी सिल्क ओरियो 60 ग्राम', 'कॅडबरी सिल्क ओरिओ 60 ग्रॅम', 'Bakery & Extras', 'Piece', 76.00, 90.00, 36.00, 10.00, 270),
    ('Cadbury Dairy Milk Silk Oreo 130g', 'कैडबरी सिल्क ओरियो 130 ग्राम', 'कॅडबरी सिल्क ओरिओ 130 ग्रॅम', 'Bakery & Extras', 'Piece', 165.00, 195.00, 24.00, 6.00, 270),
    ('Cadbury Dairy Milk Silk Hazelnut 58g', 'कैडबरी सिल्क हेज़लनट 58 ग्राम', 'कॅडबरी सिल्क हेझलनट 58 ग्रॅम', 'Bakery & Extras', 'Piece', 76.00, 90.00, 36.00, 10.00, 270),
    ('Cadbury Dairy Milk Silk Hazelnut 143g', 'कैडबरी सिल्क हेज़लनट 143 ग्राम', 'कॅडबरी सिल्क हेझलनट 143 ग्रॅम', 'Bakery & Extras', 'Piece', 178.00, 210.00, 20.00, 5.00, 270),
    ('Cadbury Dairy Milk Silk Bubbly 50g', 'कैडबरी सिल्क बबली 50 ग्राम', 'कॅडबरी सिल्क बबली 50 ग्रॅम', 'Bakery & Extras', 'Piece', 72.00, 85.00, 36.00, 10.00, 270),
    ('Cadbury Dairy Milk Silk Bubbly 120g', 'कैडबरी सिल्क बबली 120 ग्राम', 'कॅडबरी सिल्क बबली 120 ग्रॅम', 'Bakery & Extras', 'Piece', 165.00, 195.00, 24.00, 6.00, 270),
    ('Cadbury Dairy Milk Silk Mousse 50g', 'कैडबरी सिल्क मूस 50 ग्राम', 'कॅडबरी सिल्क मूस 50 ग्रॅम', 'Bakery & Extras', 'Piece', 72.00, 85.00, 36.00, 10.00, 270),

    -- 3. CADBURY 5 STAR
    ('Cadbury 5 Star Chocolate 10.1g', 'कैडबरी 5 स्टार चॉकलेट 10.1 ग्राम', 'कॅडबरी 5 स्टार चॉकलेट 10.1 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 120.00, 30.00, 365),
    ('Cadbury 5 Star Chocolate 20g', 'कैडबरी 5 स्टार चॉकलेट 20 ग्राम', 'कॅडबरी 5 स्टार चॉकलेट 20 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 96.00, 24.00, 365),
    ('Cadbury 5 Star Chocolate 40g', 'कैडबरी 5 स्टार चॉकलेट 40 ग्राम', 'कॅडबरी 5 स्टार चॉकलेट 40 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 72.00, 18.00, 365),
    ('Cadbury 5 Star 3D Chocolate 42g', 'कैडबरी 5 स्टार 3D 42 ग्राम', 'कॅडबरी 5 स्टार 3D 42 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 48.00, 12.00, 365),

    -- 4. CADBURY PERK
    ('Cadbury Perk Wafer Chocolate 13g', 'कैडबरी पर्क वेफर चॉकलेट 13 ग्राम', 'कॅडबरी पर्क वेफर चॉकलेट 13 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 120.00, 30.00, 270),
    ('Cadbury Perk Wafer Chocolate 28g', 'कैडबरी पर्क वेफर चॉकलेट 28 ग्राम', 'कॅडबरी पर्क वेफर चॉकलेट 28 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 96.00, 24.00, 270),
    ('Cadbury Perk 40% Extra 40g', 'कैडबरी पर्क 40% एक्स्ट्रा 40 ग्राम', 'कॅडबरी पर्क 40% एक्स्ट्रा 40 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 60.00, 15.00, 270),

    -- 5. CADBURY FUSE
    ('Cadbury Fuse Peanut & Caramel 24g', 'कैडबरी फ्यूज पीनट एंड कारमेल 24 ग्राम', 'कॅडबरी फ्युज शेंगदाणे व कारमेल 24 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 60.00, 15.00, 270),
    ('Cadbury Fuse Peanut & Caramel 45g', 'कैडबरी फ्यूज पीनट एंड कारमेल 45 ग्राम', 'कॅडबरी फ्युज शेंगदाणे व कारमेल 45 ग्रॅम', 'Bakery & Extras', 'Piece', 34.00, 40.00, 48.00, 12.00, 270),
    ('Cadbury Fuse Almond & Peanut 45g', 'कैडबरी फ्यूज बादाम एंड पीनट 45 ग्राम', 'कॅडबरी फ्युज बदाम व शेंगदाणे 45 ग्रॅम', 'Bakery & Extras', 'Piece', 38.00, 45.00, 36.00, 10.00, 270),

    -- 6. CADBURY GEMS
    ('Cadbury Gems Pouch 7.9g', 'कैडबरी जेम्स पाउच 7.9 ग्राम', 'कॅडबरी जेम्स पाऊच 7.9 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 120.00, 30.00, 365),
    ('Cadbury Gems Pouch 18.2g', 'कैडबरी जेम्स पाउच 18.2 ग्राम', 'कॅडबरी जेम्स पाऊच 18.2 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 96.00, 24.00, 365),
    ('Cadbury Gems Pouch 38.6g', 'कैडबरी जेम्स पाउच 38.6 ग्राम', 'कॅडबरी जेम्स पाऊच 38.6 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 60.00, 15.00, 365),
    ('Cadbury Gems Tube 34g', 'कैडबरी जेम्स ट्यूब 34 ग्राम', 'कॅडबरी जेम्स ट्यूब 34 ग्रॅम', 'Bakery & Extras', 'Piece', 25.00, 30.00, 48.00, 12.00, 365),
    ('Cadbury Gems Surprise Ball 17.6g', 'कैडबरी जेम्स सरप्राइज बॉल 17.6 ग्राम', 'कॅडबरी जेम्स सरप्राईज बॉल 17.6 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 36.00, 10.00, 365),

    -- 7. CADBURY CELEBRATIONS (GIFT PACKS)
    ('Cadbury Celebrations Assorted Gift Pack 114g', 'कैडबरी सेलिब्रेशन्स गिफ्ट पैक 114 ग्राम', 'कॅडबरी सेलिब्रेशन गिफ्ट पॅक 114 ग्रॅम', 'Bakery & Extras', 'Piece', 85.00, 100.00, 30.00, 8.00, 270),
    ('Cadbury Celebrations Assorted Gift Pack 183.6g', 'कैडबरी सेलिब्रेशन्स गिफ्ट पैक 183.6 ग्राम', 'कॅडबरी सेलिब्रेशन गिफ्ट पॅक 183.6 ग्रॅम', 'Bakery & Extras', 'Piece', 148.00, 175.00, 24.00, 6.00, 270),
    ('Cadbury Celebrations Premium Gift Box 281g', 'कैडबरी सेलिब्रेशन्स प्रीमियम बॉक्स 281 ग्राम', 'कॅडबरी सेलिब्रेशन प्रीमियम बॉक्स 281 ग्रॅम', 'Bakery & Extras', 'Piece', 235.00, 275.00, 18.00, 5.00, 270),
    ('Cadbury Celebrations Rich Dry Fruit Gift Pack 177g', 'कैडबरी सेलिब्रेशन्स ड्राई फ्रूट गिफ्ट पैक 177 ग्राम', 'कॅडबरी सेलिब्रेशन ड्रायफ्रूट गिफ्ट पॅक 177 ग्रॅम', 'Bakery & Extras', 'Piece', 420.00, 500.00, 12.00, 4.00, 270),

    -- 8. CADBURY BOURNVITA (HEALTH DRINKS)
    ('Cadbury Bournvita Health Drink 500g Jar', 'कैडबरी बॉर्नविटा 500 ग्राम जार', 'कॅडबरी बॉर्नव्हिटा 500 ग्रॅम बरणी', 'Bakery & Extras', 'Piece', 210.00, 245.00, 24.00, 6.00, 365),
    ('Cadbury Bournvita Health Drink 1kg Refill', 'कैडबरी बॉर्नविटा 1 किग्रा रिफिल', 'कॅडबरी बॉर्नव्हिटा 1 किलो रिफिल', 'Bakery & Extras', 'Piece', 375.00, 435.00, 20.00, 5.00, 365),
    ('Cadbury Bournvita 5 Star Magic 500g Jar', 'कैडबरी बॉर्नविटा 5 स्टार मैजिक 500 ग्राम', 'कॅडबरी बॉर्नव्हिटा 5 स्टार मॅजिक 500 ग्रॅम', 'Bakery & Extras', 'Piece', 218.00, 255.00, 20.00, 5.00, 365),
    ('Cadbury Bournvita Health Drink 200g Pouch', 'कैडबरी बॉर्नविटा 200 ग्राम पाउच', 'कॅडबरी बॉर्नव्हिटा 200 ग्रॅम पाऊच', 'Bakery & Extras', 'Piece', 94.00, 110.00, 30.00, 8.00, 365),

    -- 9. CADBURY CHOCOBAKES, CRISPELLO & LICKABLES
    ('Cadbury Chocobakes Choc Layered Cake 21g', 'कैडबरी चोकोबेक्स लेयर्ड केक 21 ग्राम', 'कॅडबरी चोकोबेक्स लेअर्ड केक 21 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 72.00, 18.00, 90),
    ('Cadbury Chocobakes Choc Layered Cake 126g (6 Pcs)', 'कैडबरी चोकोबेक्स लेयर्ड केक 126 ग्राम', 'कॅडबरी चोकोबेक्स लेअर्ड केक 126 ग्रॅम', 'Bakery & Extras', 'Piece', 50.00, 60.00, 36.00, 10.00, 90),
    ('Cadbury Chocobakes Choc Filled Cookies 75g', 'कैडबरी चोकोबेक्स कुकीज 75 ग्राम', 'कॅडबरी चोकोबेक्स कुकीज 75 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 48.00, 12.00, 180),
    ('Cadbury Chocobakes Choc Filled Cookies 150g', 'कैडबरी चोकोबेक्स कुकीज 150 ग्राम', 'कॅडबरी चोकोबेक्स कुकीज 150 ग्रॅम', 'Bakery & Extras', 'Piece', 58.00, 70.00, 36.00, 10.00, 180),
    ('Cadbury Dairy Milk Crispello Chocolate 35g', 'कैडबरी क्रिस्पेलो चॉकलेट 35 ग्राम', 'कॅडबरी क्रिस्पेलो चॉकलेट 35 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 48.00, 12.00, 270),
    ('Cadbury Dairy Milk Lickables 20g', 'कैडबरी लिकैबल्स 20 ग्राम', 'कॅडबरी लिकेबल्स 20 ग्रॅम', 'Bakery & Extras', 'Piece', 38.00, 45.00, 48.00, 12.00, 270);

    -- Loop over each product and insert/update
    FOR rec IN SELECT * FROM tmp_cadbury_items LOOP
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
            v_batch_no := 'CDB-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');

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
                'Cadbury Chocolates & Confectionery Inward'
            );
        END IF;
    END LOOP;
END $$;

-- STEP 3: Verification Output - List all added Cadbury products and their live stock
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
WHERE p.name ILIKE '%Cadbury%'
ORDER BY p.name;

