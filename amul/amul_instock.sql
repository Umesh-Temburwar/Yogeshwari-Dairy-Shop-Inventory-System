-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - AMUL ALL PRODUCTS IN-STOCK SETUP
-- PHASE 32: AMUL COMPLETE CATALOG & INITIAL INVENTORY INWARD (43 PRODUCTS)
-- File: amul/amul_instock.sql
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

-- STEP 2: Insert or Update 43 Amul Products and Register Inward Batches
DO $$
DECLARE
    v_prod_id UUID;
    v_batch_no VARCHAR(100);
    v_today DATE := CURRENT_DATE;
    rec RECORD;
BEGIN
    -- Temporary table holding 43 Amul items
    CREATE TEMP TABLE tmp_amul_items (
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

    INSERT INTO tmp_amul_items VALUES
    -- 1. Fresh Pouch Milk & Long Life Milk
    ('Amul Gold Full Cream Milk 500ml', 'अमूल गोल्ड फुल क्रीम दूध 500 मिली', 'अमूल गोल्ड फुल क्रीम दूध 500 मिली', 'Milk', 'Packet (500ml)', 32.00, 34.00, 60.00, 15.00, 2),
    ('Amul Gold Full Cream Milk 1L', 'अमूल गोल्ड फुल क्रीम दूध 1 लीटर', 'अमूल गोल्ड फुल क्रीम दूध 1 लिटर', 'Milk', 'Packet (1L)', 63.00, 68.00, 40.00, 10.00, 2),
    ('Amul Taaza Toned Milk 500ml', 'अमूल ताज़ा टोंड दूध 500 मिली', 'अमूल ताझा टोन्ड दूध 500 मिली', 'Milk', 'Packet (500ml)', 26.00, 28.00, 60.00, 15.00, 2),
    ('Amul Taaza Toned Milk 1L', 'अमूल ताज़ा टोंड दूध 1 लीटर', 'अमूल ताझा टोन्ड दूध 1 लिटर', 'Milk', 'Packet (1L)', 51.00, 56.00, 40.00, 10.00, 2),
    ('Amul Cow Milk 500ml', 'अमूल गाय का दूध 500 मिली', 'अमूल गाय दूध 500 मिली', 'Milk', 'Packet (500ml)', 27.00, 29.00, 50.00, 15.00, 2),
    ('Amul Cow Milk 1L', 'अमूल गाय का दूध 1 लीटर', 'अमूल गाय दूध 1 लिटर', 'Milk', 'Packet (1L)', 53.00, 58.00, 30.00, 10.00, 2),
    ('Amul Slim n Trim Milk 500ml', 'अमूल स्लिम एंड ट्रिम दूध 500 मिली', 'अमूल स्लिम अँड ट्रिम दूध 500 मिली', 'Milk', 'Packet (500ml)', 24.00, 26.00, 30.00, 10.00, 2),
    ('Amul Buffalo Milk 500ml', 'अमूल भैंस दूध 500 मिली', 'अमूल म्हैस दूध 500 मिली', 'Milk', 'Packet (500ml)', 34.00, 37.00, 40.00, 10.00, 2),
    ('Amul Taaza Homogenised Toned Milk 1L Tetra', 'अमूल ताज़ा टेट्रा पैक दूध 1 लीटर', 'अमूल ताझा टेट्रा पॅक दूध 1 लिटर', 'Milk', 'Piece', 68.00, 75.00, 24.00, 5.00, 180),

    -- 2. Dahi, Buttermilk & Beverages
    ('Amul Masti Dahi Pouch 400g', 'अमूल मस्ती दही पाउच 400 ग्राम', 'अमूल मस्ती दही पाऊच 400 ग्रॅम', 'Curd & Chaas', 'Packet (500ml)', 32.00, 36.00, 40.00, 10.00, 7),
    ('Amul Masti Dahi Cup 200g', 'अमूल मस्ती दही कप 200 ग्राम', 'अमूल मस्ती दही कप 200 ग्रॅम', 'Curd & Chaas', 'Piece', 21.00, 25.00, 30.00, 8.00, 15),
    ('Amul Masti Dahi Cup 400g', 'अमूल मस्ती दही कप 400 ग्राम', 'अमूल मस्ती दही कप 400 ग्रॅम', 'Curd & Chaas', 'Piece', 40.00, 47.00, 25.00, 5.00, 15),
    ('Amul Masti Dahi Tub 1kg', 'अमूल मस्ती दही टब 1 किग्रा', 'अमूल मस्ती दही टब 1 किलो', 'Curd & Chaas', 'Kg', 95.00, 110.00, 15.00, 3.00, 15),
    ('Amul Masti Spiced Buttermilk 200ml Pouch', 'अमूल मसाला छाछ पाउच 200 मिली', 'अमूल मसाला ताक पाऊच 200 मिली', 'Curd & Chaas', 'Piece', 12.00, 15.00, 50.00, 15.00, 7),
    ('Amul Masti Spiced Buttermilk 500ml Tetra', 'अमूल मसाला छाछ टेट्रा 500 मिली', 'अमूल मसाला ताक टेट्रा 500 मिली', 'Curd & Chaas', 'Packet (500ml)', 28.00, 32.00, 30.00, 10.00, 180),
    ('Amul Lassi Rose 200ml Tetra', 'अमूल लस्सी रोज़ टेट्रा 200 मिली', 'अमूल लस्सी रोझ टेट्रा 200 मिली', 'Curd & Chaas', 'Piece', 22.00, 25.00, 30.00, 8.00, 180),
    ('Amul Lassi Mango 200ml Tetra', 'अमूल लस्सी मैंगो टेट्रा 200 मिली', 'अमूल लस्सी मँगो टेट्रा 200 मिली', 'Curd & Chaas', 'Piece', 22.00, 25.00, 30.00, 8.00, 180),
    ('Amul Kool Cafe 200ml Can', 'अमूल कूल कैफे कैन 200 मिली', 'अमूल कूल कॅफे कॅन 200 मिली', 'Curd & Chaas', 'Piece', 35.00, 40.00, 24.00, 6.00, 180),
    ('Amul Kool Badam 200ml Bottle', 'अमूल कूल बादाम बोतल 200 मिली', 'अमूल कूल बदाम बॉटल 200 मिली', 'Curd & Chaas', 'Piece', 25.00, 30.00, 24.00, 6.00, 180),

    -- 3. Paneer, Butter & Cheese
    ('Amul Fresh Malai Paneer 200g', 'अमूल फ्रेश मलाई पनीर 200 ग्राम', 'अमूल फ्रेश मलाई पनीर 200 ग्रॅम', 'Paneer & Butter', 'Piece', 85.00, 95.00, 30.00, 8.00, 30),
    ('Amul Fresh Malai Paneer 500g', 'अमूल फ्रेश मलाई पनीर 500 ग्राम', 'अमूल फ्रेश मलाई पनीर 500 ग्रॅम', 'Paneer & Butter', 'Piece', 200.00, 225.00, 20.00, 5.00, 30),
    ('Amul Fresh Malai Paneer 1kg Block', 'अमूल फ्रेश मलाई पनीर 1 किग्रा', 'अमूल फ्रेश मलाई पनीर 1 किलो', 'Paneer & Butter', 'Kg', 380.00, 430.00, 15.00, 3.00, 30),
    ('Amul Salted Butter 100g', 'अमूल बटर 100 ग्राम', 'अमूल लोणी / बटर 100 ग्रॅम', 'Paneer & Butter', 'Piece', 52.00, 60.00, 40.00, 10.00, 180),
    ('Amul Salted Butter 500g', 'अमूल बटर 500 ग्राम', 'अमूल लोणी / बटर 500 ग्रॅम', 'Paneer & Butter', 'Piece', 250.00, 285.00, 25.00, 5.00, 180),
    ('Amul White Butter 500g', 'अमूल सफेद मक्खन 500 ग्राम', 'अमूल पांढरे लोणी 500 ग्रॅम', 'Paneer & Butter', 'Piece', 240.00, 275.00, 20.00, 5.00, 90),
    ('Amul Garlic and Herbs Butter 100g', 'अमूल गार्लिक एंड हर्ब्स बटर 100 ग्राम', 'अमूल गार्लिक अँड हर्ब्स बटर 100 ग्रॅम', 'Paneer & Butter', 'Piece', 56.00, 65.00, 20.00, 5.00, 180),
    ('Amul Cheese Slices 200g (10 Slices)', 'अमूल चीज़ स्लाइस 200 ग्राम (10 स्लाइस)', 'अमूल चीज स्लाइस 200 ग्रॅम (10 स्लाइस)', 'Paneer & Butter', 'Piece', 135.00, 155.00, 25.00, 5.00, 270),
    ('Amul Cheese Cubes 200g (8 Cubes)', 'अमूल चीज़ क्यूब्स 200 ग्राम (8 क्यूब्स)', 'अमूल चीज क्यूब्स 200 ग्रॅम (8 क्यूब्स)', 'Paneer & Butter', 'Piece', 130.00, 150.00, 25.00, 5.00, 270),
    ('Amul Cheese Block 500g', 'अमूल चीज़ ब्लॉक 500 ग्राम', 'अमूल चीज ब्लॉक 500 ग्रॅम', 'Paneer & Butter', 'Piece', 290.00, 330.00, 15.00, 3.00, 270),
    ('Amul Diced Mozzarella Pizza Cheese 200g', 'अमूल डाइस्ड पिज़्ज़ा मोज़ेरेला चीज़ 200 ग्राम', 'अमूल डाइस्ड पिझ्झा मोझेरेला चीज 200 ग्रॅम', 'Paneer & Butter', 'Piece', 115.00, 130.00, 20.00, 5.00, 180),
    ('Amul Diced Mozzarella Pizza Cheese 1kg', 'अमूल डाइस्ड पिज़्ज़ा मोज़ेरेला चीज़ 1 किग्रा', 'अमूल डाइस्ड पिझ्झा मोझेरेला चीज 1 किलो', 'Paneer & Butter', 'Kg', 460.00, 520.00, 10.00, 2.00, 180),
    ('Amul Fresh Cream 250ml', 'अमूल फ्रेश क्रीम 250 मिली', 'अमूल फ्रेश क्रीम 250 मिली', 'Paneer & Butter', 'Piece', 60.00, 70.00, 25.00, 5.00, 90),

    -- 4. Pure Ghee
    ('Amul Pure Ghee 500ml Pouch', 'अमूल शुद्ध घी पाउच 500 मिली', 'अमूल शुद्ध तूप पाऊच 500 मिली', 'Ghee', 'Packet (500ml)', 295.00, 335.00, 20.00, 5.00, 270),
    ('Amul Pure Ghee 1L Pouch', 'अमूल शुद्ध घी पाउच 1 लीटर', 'अमूल शुद्ध तूप पाऊच 1 लिटर', 'Ghee', 'Packet (1L)', 580.00, 650.00, 20.00, 5.00, 270),
    ('Amul Pure Ghee 1L Tin', 'अमूल शुद्ध घी टिन 1 लीटर', 'अमूल शुद्ध तूप टिन 1 लिटर', 'Ghee', 'Kg', 620.00, 690.00, 15.00, 3.00, 270),
    ('Amul Cow Ghee 500ml Jar', 'अमूल गाय घी जार 500 मिली', 'अमूल गाय तूप बरणी 500 मिली', 'Ghee', 'Piece', 310.00, 355.00, 20.00, 5.00, 270),
    ('Amul Cow Ghee 1L Jar', 'अमूल गाय घी जार 1 लीटर', 'अमूल गाय तूप बरणी 1 लिटर', 'Ghee', 'Kg', 610.00, 680.00, 15.00, 3.00, 270),

    -- 5. Shrikhand & Traditional Sweets
    ('Amul Elaichi Shrikhand 500g', 'अमूल इलायची श्रीखंड 500 ग्राम', 'अमूल वेलची श्रीखंड 500 ग्रॅम', 'Sweets/Mithai', 'Piece', 105.00, 125.00, 20.00, 5.00, 30),
    ('Amul Kesar Shrikhand 500g', 'अमूल केसर श्रीखंड 500 ग्राम', 'अमूल केशर श्रीखंड 500 ग्रॅम', 'Sweets/Mithai', 'Piece', 115.00, 135.00, 20.00, 5.00, 30),
    ('Amul Amrakhand (Mango) 500g', 'अमूल आम्रखंड 500 ग्राम', 'अमूल आम्रखंड 500 ग्रॅम', 'Sweets/Mithai', 'Piece', 110.00, 130.00, 20.00, 5.00, 30),
    ('Amul Mithai Mate Condensed Milk 200g', 'अमूल मिठाई मेट 200 ग्राम', 'अमूल मिठाई मेट कंडेन्स्ड मिल्क 200 ग्रॅम', 'Sweets/Mithai', 'Piece', 58.00, 66.00, 30.00, 8.00, 180),
    ('Amul Gulab Jamun 1kg Tin', 'अमूल गुलाब जामुन टिन 1 किग्रा', 'अमूल गुलाब जामुन टिन 1 किलो', 'Sweets/Mithai', 'Kg', 215.00, 250.00, 15.00, 3.00, 180),
    ('Amul Rasgulla 1kg Tin', 'अमूल रसगुल्ला टिन 1 किग्रा', 'अमूल रसगुल्ला टिन 1 किलो', 'Sweets/Mithai', 'Kg', 205.00, 240.00, 15.00, 3.00, 180);

    -- Loop over each product and insert/update
    FOR rec IN SELECT * FROM tmp_amul_items LOOP
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
            v_batch_no := 'AML-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');

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
                'Amul Fresh Inward Batch'
            );
        END IF;
    END LOOP;
END $$;

-- STEP 3: Verification Output - List all added Amul products and their live stock
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
WHERE p.name ILIKE '%Amul%'
ORDER BY p.category, p.name;

