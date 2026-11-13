-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - GRAMILK IN-STOCK SETUP
-- PHASE 30: GRAMILK PRODUCTS & FRESH INITIAL INVENTORY INWARD (FIXED SCHEMA)
-- File: supabase/30_phase30_gramilk_in_stock_inventory.sql
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

-- STEP 2: Insert or Update 17 Gramilk Products and Register Inward Batches
DO $$
DECLARE
    v_prod_id UUID;
    v_batch_no VARCHAR(100);
    v_today DATE := CURRENT_DATE;
    rec RECORD;
BEGIN
    -- Temporary table with 17 Gramilk items definition
    CREATE TEMP TABLE tmp_gramilk_items (
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

    INSERT INTO tmp_gramilk_items VALUES
    ('Gramilk Full Cream Milk', 'ग्रामिल्क फुल क्रीम दूध', 'ग्रामिल्क फुल क्रीम दूध', 'Milk', 'Litre', 60.00, 66.00, 50.00, 10.00, 2),
    ('Gramilk Chai Special Milk', 'ग्रामिल्क चाय स्पेशल दूध', 'ग्रामिल्क चहा स्पेशल दूध', 'Milk', 'Litre', 56.00, 62.00, 50.00, 10.00, 2),
    ('Gramilk Curd 500 gm', 'ग्रामिल्क दही 500 ग्राम', 'ग्रामिल्क दही 500 ग्रॅम', 'Curd & Chaas', 'Packet (500ml)', 40.00, 48.00, 30.00, 5.00, 7),
    ('Gramilk Slim Curd 180 gm', 'ग्रामिल्क स्लिम दही 180 ग्राम', 'ग्रामिल्क स्लिम दही 180 ग्रॅम', 'Curd & Chaas', 'Piece', 18.00, 22.00, 30.00, 5.00, 7),
    ('Gramilk Malai Paneer 100 gm', 'ग्रामिल्क मलाई पनीर 100 ग्राम', 'ग्रामिल्क मलाई पनीर 100 ग्रॅम', 'Paneer & Butter', 'Piece', 40.00, 48.00, 25.00, 5.00, 15),
    ('Gramilk Malai Paneer 200 gm', 'ग्रामिल्क मलाई पनीर 200 ग्राम', 'ग्रामिल्क मलाई पनीर 200 ग्रॅम', 'Paneer & Butter', 'Piece', 78.00, 90.00, 25.00, 5.00, 15),
    ('Gramilk Tikka Special Paneer 1kg', 'ग्रामिल्क टिक्का स्पेशल पनीर 1 किग्रा', 'ग्रामिल्क टिक्का स्पेशल पनीर 1 किलो', 'Paneer & Butter', 'Kg', 360.00, 420.00, 15.00, 3.00, 15),
    ('Gramilk Shrikhand 100 gm', 'ग्रामिल्क श्रीखंड 100 ग्राम', 'ग्रामिल्क श्रीखंड 100 ग्रॅम', 'Sweets/Mithai', 'Piece', 28.00, 35.00, 20.00, 5.00, 14),
    ('Gramilk Shrikhand 250 gm', 'ग्रामिल्क श्रीखंड 250 ग्राम', 'ग्रामिल्क श्रीखंड 250 ग्रॅम', 'Sweets/Mithai', 'Piece', 68.00, 80.00, 20.00, 5.00, 14),
    ('Gramilk Shrikhand 500 gm', 'ग्रामिल्क श्रीखंड 500 ग्राम', 'ग्रामिल्क श्रीखंड 500 ग्रॅम', 'Sweets/Mithai', 'Piece', 130.00, 155.00, 15.00, 3.00, 14),
    ('Gramilk Lassi Vanilla', 'ग्रामिल्क लस्सी वैनिला', 'ग्रामिल्क लस्सी व्हॅनिला', 'Curd & Chaas', 'Piece', 20.00, 25.00, 30.00, 5.00, 10),
    ('Gramilk Lassi Mango', 'ग्रामिल्क लस्सी मैंगो', 'ग्रामिल्क लस्सी मँगो', 'Curd & Chaas', 'Piece', 20.00, 25.00, 30.00, 5.00, 10),
    ('Gramilk Butter Milk', 'ग्रामिल्क छाछ / बटर मिल्क', 'ग्रामिल्क ताक / बटर मिल्क', 'Curd & Chaas', 'Packet (500ml)', 12.00, 15.00, 40.00, 10.00, 5),
    ('Gramilk Cow Ghee 500gm', 'ग्रामिल्क गाय घी 500 ग्राम', 'ग्रामिल्क गाय तूप 500 ग्रॅम', 'Ghee', 'Piece', 320.00, 375.00, 15.00, 3.00, 180),
    ('Gramilk Cow Ghee 1000 gm', 'ग्रामिल्क गाय घी 1 किग्रा', 'ग्रामिल्क गाय तूप 1 किलो', 'Ghee', 'Kg', 620.00, 720.00, 15.00, 3.00, 180),
    ('Gramilk Buffalo Ghee 500 gm', 'ग्रामिल्क भैंस घी 500 ग्राम', 'ग्रामिल्क म्हैस तूप 500 ग्रॅम', 'Ghee', 'Piece', 340.00, 395.00, 15.00, 3.00, 180),
    ('Gramilk Buffalo Ghee 1000 gm', 'ग्रामिल्क भैंस घी 1 किग्रा', 'ग्रामिल्क म्हैस तूप 1 किलो', 'Ghee', 'Kg', 660.00, 760.00, 15.00, 3.00, 180);

    -- Loop over each product and insert/update
    FOR rec IN SELECT * FROM tmp_gramilk_items LOOP
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
            v_batch_no := 'GMK-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');

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
                'Gramilk Fresh Stock Entry'
            );
        END IF;
    END LOOP;
END $$;

-- STEP 3: Verification Output
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
WHERE p.name ILIKE '%Gramilk%'
ORDER BY p.category, p.name;
