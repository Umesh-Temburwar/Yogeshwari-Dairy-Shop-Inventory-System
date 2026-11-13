-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - AMUL ICE CREAM IN-STOCK SETUP
-- PHASE 33: AMUL ICE CREAM COMPLETE CATALOG & INVENTORY INWARD (28 PRODUCTS)
-- File: supabase/33_phase33_amul_ice_cream_in_stock_inventory.sql
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

-- STEP 2: Insert or Update 28 Amul Ice Cream Products and Register Inward Batches
DO $$
DECLARE
    v_prod_id UUID;
    v_batch_no VARCHAR(100);
    v_today DATE := CURRENT_DATE;
    rec RECORD;
BEGIN
    -- Temporary table holding 28 Amul Ice Cream items
    CREATE TEMP TABLE tmp_amul_icecream_items (
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

    INSERT INTO tmp_amul_icecream_items VALUES
    -- 1. Ice Cream Cups (100ml / Small Cups)
    ('Amul Vanilla Ice Cream Cup 100ml', 'अमूल वैनिला आइसक्रीम कप 100 मिली', 'अमूल व्हॅनिला आईस्क्रीम कप 100 मिली', 'Sweets/Mithai', 'Piece', 16.00, 20.00, 48.00, 12.00, 270),
    ('Amul Strawberry Ice Cream Cup 100ml', 'अमूल स्ट्रॉबेरी आइसक्रीम कप 100 मिली', 'अमूल स्ट्रॉबेरी आईस्क्रीम कप 100 मिली', 'Sweets/Mithai', 'Piece', 16.00, 20.00, 36.00, 10.00, 270),
    ('Amul Chocolate Ice Cream Cup 100ml', 'अमूल चॉकलेट आइसक्रीम कप 100 मिली', 'अमूल चॉकलेट आईस्क्रीम कप 100 मिली', 'Sweets/Mithai', 'Piece', 20.00, 25.00, 36.00, 10.00, 270),
    ('Amul Butterscotch Ice Cream Cup 100ml', 'अमूल बटरस्कॉच आइसक्रीम कप 100 मिली', 'अमूल बटरस्कॉच आईस्क्रीम कप 100 मिली', 'Sweets/Mithai', 'Piece', 20.00, 25.00, 48.00, 12.00, 270),
    ('Amul Kaju Draksh Ice Cream Cup 100ml', 'अमूल काजू द्राक्ष आइसक्रीम कप 100 मिली', 'अमूल काजू द्राक्ष आईस्क्रीम कप 100 मिली', 'Sweets/Mithai', 'Piece', 24.00, 30.00, 36.00, 10.00, 270),
    ('Amul Rajbhog Ice Cream Cup 100ml', 'अमूल राजभोग आइसक्रीम कप 100 मिली', 'अमूल राजभोग आईस्क्रीम कप 100 मिली', 'Sweets/Mithai', 'Piece', 28.00, 35.00, 36.00, 10.00, 270),
    ('Amul Alphonso Mango Ice Cream Cup 100ml', 'अमूल अल्फांसो मैंगो आइसक्रीम कप 100 मिली', 'अमूल हापूस आंबा आईस्क्रीम कप 100 मिली', 'Sweets/Mithai', 'Piece', 24.00, 30.00, 36.00, 10.00, 270),
    ('Amul Sugar Free Vanilla Ice Cream Tub 125ml', 'अमूल शुगर फ्री वैनिला आइसक्रीम 125 मिली', 'अमूल शुगर फ्री व्हॅनिला आईस्क्रीम 125 मिली', 'Sweets/Mithai', 'Piece', 32.00, 40.00, 24.00, 6.00, 270),

    -- 2. Cones & Tricones (120ml)
    ('Amul Tricone Butterscotch 120ml', 'अमूल ट्राइकोन बटरस्कॉच 120 मिली', 'अमूल ट्रायकोन बटरस्कॉच 120 मिली', 'Sweets/Mithai', 'Piece', 32.00, 40.00, 36.00, 10.00, 270),
    ('Amul Tricone Chocolate 120ml', 'अमूल ट्राइकोन चॉकलेट 120 मिली', 'अमूल ट्रायकोन चॉकलेट 120 मिली', 'Sweets/Mithai', 'Piece', 32.00, 40.00, 36.00, 10.00, 270),
    ('Amul Tricone Belgian Chocolate 120ml', 'अमूल बेल्जियन चॉकलेट ट्राइकोन 120 मिली', 'अमूल बेल्जियन चॉकलेट ट्रायकोन 120 मिली', 'Sweets/Mithai', 'Piece', 40.00, 50.00, 24.00, 6.00, 270),
    ('Amul Tricone Cookie and Cream 120ml', 'अमूल कुकी एंड क्रीम ट्राइकोन 120 मिली', 'अमूल कुकी अँड क्रीम ट्रायकोन 120 मिली', 'Sweets/Mithai', 'Piece', 40.00, 50.00, 24.00, 6.00, 270),

    -- 3. Candies, Chocobars, Sticks & Kulfi
    ('Amul Classic Chocobar 60ml', 'अमूल क्लासिक चोकोबार 60 मिली', 'अमूल क्लासिक चोकोबार 60 मिली', 'Sweets/Mithai', 'Piece', 16.00, 20.00, 48.00, 12.00, 270),
    ('Amul Frostik Premium Chocolate Bar 70ml', 'अमूल फ्रॉस्टिक प्रीमियम चॉकलेट बार 70 मिली', 'अमूल फ्रॉस्टिक प्रीमियम चॉकलेट बार 70 मिली', 'Sweets/Mithai', 'Piece', 32.00, 40.00, 36.00, 10.00, 270),
    ('Amul Mango Duet Bar 60ml', 'अमूल मैंगो ड्युएट बार 60 मिली', 'अमूल मँगो ड्युएट बार 60 मिली', 'Sweets/Mithai', 'Piece', 16.00, 20.00, 36.00, 10.00, 270),
    ('Amul Raspberry Duet Bar 60ml', 'अमूल रास्पबेरी ड्युएट बार 60 मिली', 'अमूल रास्पबेरी ड्युएट बार 60 मिली', 'Sweets/Mithai', 'Piece', 16.00, 20.00, 36.00, 10.00, 270),
    ('Amul Shahi Kulfi Stick 60ml', 'अमूल शाही कुल्फी स्टिक 60 मिली', 'अमूल शाही कुल्फी कांडी 60 मिली', 'Sweets/Mithai', 'Piece', 20.00, 25.00, 36.00, 10.00, 270),
    ('Amul Rajbhog Kulfi Stick 60ml', 'अमूल राजभोग कुल्फी स्टिक 60 मिली', 'अमूल राजभोग कुल्फी कांडी 60 मिली', 'Sweets/Mithai', 'Piece', 24.00, 30.00, 36.00, 10.00, 270),
    ('Amul Matka Kulfi 120ml', 'अमूल मटका कुल्फी 120 मिली', 'अमूल मटका कुल्फी 120 मिली', 'Sweets/Mithai', 'Piece', 40.00, 50.00, 24.00, 6.00, 270),
    ('Amul Cassata Cut Slice 150ml', 'अमूल कसाटा कट स्लाइस 150 मिली', 'अमूल कसाटा कट स्लाइस 150 मिली', 'Sweets/Mithai', 'Piece', 32.00, 40.00, 24.00, 6.00, 270),
    ('Amul Ice Cream Sandwich 100ml', 'अमूल आइसक्रीम सैंडविच 100 मिली', 'अमूल आईस्क्रीम सँडविच 100 मिली', 'Sweets/Mithai', 'Piece', 28.00, 35.00, 24.00, 6.00, 270),

    -- 4. Family Tubs & Packs (1 Litre / 1.25L)
    ('Amul Vanilla Family Pack 1L', 'अमूल वैनिला फैमिली पैक 1 लीटर', 'अमूल व्हॅनिला फॅमिली पॅक 1 लिटर', 'Sweets/Mithai', 'Piece', 105.00, 130.00, 20.00, 5.00, 270),
    ('Amul Butterscotch Family Pack 1L', 'अमूल बटरस्कॉच फैमिली पैक 1 लीटर', 'अमूल बटरस्कॉच फॅमिली पॅक 1 लिटर', 'Sweets/Mithai', 'Piece', 140.00, 175.00, 20.00, 5.00, 270),
    ('Amul Chocolate Brownie Tub 1L', 'अमूल चॉकलेट ब्राउनी टब 1 लीटर', 'अमूल चॉकलेट ब्राउनी टब 1 लिटर', 'Sweets/Mithai', 'Piece', 175.00, 220.00, 15.00, 4.00, 270),
    ('Amul Rajbhog Gold Tub 1L', 'अमूल राजभोग गोल्ड टब 1 लीटर', 'अमूल राजभोग गोल्ड टब 1 लिटर', 'Sweets/Mithai', 'Piece', 190.00, 240.00, 15.00, 4.00, 270),
    ('Amul Kaju Draksh Tub 1L', 'अमूल काजू द्राक्ष टब 1 लीटर', 'अमूल काजू द्राक्ष टब 1 लिटर', 'Sweets/Mithai', 'Piece', 160.00, 200.00, 15.00, 4.00, 270),
    ('Amul Kesar Pista Tub 1L', 'अमूल केसर पिस्ता टब 1 लीटर', 'अमूल केशर पिस्ता टब 1 लिटर', 'Sweets/Mithai', 'Piece', 170.00, 215.00, 15.00, 4.00, 270),
    ('Amul American Nuts Tub 1L', 'अमूल अमेरिकन नट्स टब 1 लीटर', 'अमूल अमेरिकन नट्स टब 1 लिटर', 'Sweets/Mithai', 'Piece', 175.00, 220.00, 15.00, 4.00, 270);

    -- Loop over each product and insert/update
    FOR rec IN SELECT * FROM tmp_amul_icecream_items LOOP
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
            v_batch_no := 'IC-AML-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');

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
                'Amul Ice Cream Deep Freezer Inward'
            );
        END IF;
    END LOOP;
END $$;

-- STEP 3: Verification Output - List all added Amul Ice Cream products and their live stock
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
WHERE p.name ILIKE '%Amul%Ice%Cream%' OR p.name ILIKE '%Amul%Tricone%' OR p.name ILIKE '%Amul%Chocobar%' OR p.name ILIKE '%Amul%Kulfi%' OR p.name ILIKE '%Amul%Cassata%' OR p.name ILIKE '%Amul%Frostik%' OR p.name ILIKE '%Amul%Tub%'
ORDER BY p.name;

