-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - AMUL PANEER ALL VARIANTS IN-STOCK SETUP
-- PHASE 49: AMUL PANEER (FRESH MALAI, FROZEN, DICED CUBES, HIGH PROTEIN,
--           LOW FAT, BUFFALO, COW, SPICED TIKKA & CANNED TINS) (17 PRODUCTS)
-- File: amul/amul_paneer_instock.sql
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
    CREATE TEMP TABLE tmp_amul_paneer_items (
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

    INSERT INTO tmp_amul_paneer_items VALUES
    -- 1. Amul Fresh Malai Paneer (Chilled / Fresh)
    ('Amul Fresh Malai Paneer 100g', 'अमूल फ्रेश मलाई पनीर 100 ग्राम', 'अमूल फ्रेश मलाई पनीर 100 ग्रॅम', 'Paneer & Butter', 'Piece', 39.00, 45.00, 48.00, 12.00, 30),
    ('Amul Fresh Malai Paneer 200g', 'अमूल फ्रेश मलाई पनीर 200 ग्राम', 'अमूल फ्रेश मलाई पनीर 200 ग्रॅम', 'Paneer & Butter', 'Piece', 83.00, 95.00, 60.00, 15.00, 30),
    ('Amul Fresh Malai Paneer 500g', 'अमूल फ्रेश मलाई पनीर 500 ग्राम', 'अमूल फ्रेश मलाई पनीर 500 ग्रॅम', 'Paneer & Butter', 'Piece', 198.00, 225.00, 30.00, 8.00, 30),
    ('Amul Fresh Malai Paneer 1kg Block', 'अमूल फ्रेश मलाई पनीर 1 किग्रा', 'अमूल फ्रेश मलाई पनीर 1 किलो', 'Paneer & Butter', 'Kg', 375.00, 430.00, 20.00, 5.00, 30),

    -- 2. Amul Frozen Malai Paneer (Deep Freeze)
    ('Amul Frozen Malai Paneer 200g', 'अमूल फ्रोजन मलाई पनीर 200 ग्राम', 'अमूल फ्रोजन मलाई पनीर 200 ग्रॅम', 'Paneer & Butter', 'Piece', 82.00, 95.00, 48.00, 12.00, 180),
    ('Amul Frozen Malai Paneer 500g', 'अमूल फ्रोजन मलाई पनीर 500 ग्राम', 'अमूल फ्रोजन मलाई पनीर 500 ग्रॅम', 'Paneer & Butter', 'Piece', 200.00, 230.00, 30.00, 8.00, 180),
    ('Amul Frozen Malai Paneer 1kg', 'अमूल फ्रोजन मलाई पनीर 1 किग्रा', 'अमूल फ्रोजन मलाई पनीर 1 किलो', 'Paneer & Butter', 'Kg', 385.00, 440.00, 20.00, 5.00, 180),

    -- 3. Amul Frozen Diced Paneer Cubes (Ready to Cook)
    ('Amul Frozen Diced Paneer Cubes 200g', 'अमूल डाइस्ड पनीर क्यूब्स 200 ग्राम', 'अमूल डाइस्ड पनीर क्यूब्स 200 ग्रॅम', 'Paneer & Butter', 'Piece', 86.00, 100.00, 48.00, 12.00, 180),
    ('Amul Frozen Diced Paneer Cubes 500g', 'अमूल डाइस्ड पनीर क्यूब्स 500 ग्राम', 'अमूल डाइस्ड पनीर क्यूब्स 500 ग्रॅम', 'Paneer & Butter', 'Piece', 210.00, 240.00, 30.00, 8.00, 180),
    ('Amul Frozen Diced Paneer Cubes 1kg', 'अमूल डाइस्ड पनीर क्यूब्स 1 किग्रा', 'अमूल डाइस्ड पनीर क्यूब्स 1 किलो', 'Paneer & Butter', 'Kg', 400.00, 460.00, 15.00, 4.00, 180),

    -- 4. Amul Health & Fitness Paneer (High Protein & Low Fat)
    ('Amul High Protein Paneer 200g', 'अमूल हाई प्रोटीन पनीर 200 ग्राम', 'अमूल हाय प्रोटीन पनीर 200 ग्रॅम', 'Paneer & Butter', 'Piece', 95.00, 110.00, 36.00, 10.00, 30),
    ('Amul Low Fat Paneer 200g', 'अमूल लो फैट पनीर 200 ग्राम', 'अमूल लो फॅट पनीर 200 ग्रॅम', 'Paneer & Butter', 'Piece', 82.00, 95.00, 36.00, 10.00, 30),

    -- 5. Amul Pure Buffalo & Cow Milk Paneer
    ('Amul Pure Buffalo Milk Paneer 200g', 'अमूल शुद्ध भैंस दूध पनीर 200 ग्राम', 'अमूल शुद्ध म्हशीचे दूध पनीर 200 ग्रॅम', 'Paneer & Butter', 'Piece', 87.00, 100.00, 36.00, 10.00, 30),
    ('Amul Pure Cow Milk Paneer 200g', 'अमूल शुद्ध गाय दूध पनीर 200 ग्राम', 'अमूल शुद्ध गाईचे दूध पनीर 200 ग्रॅम', 'Paneer & Butter', 'Piece', 83.00, 95.00, 36.00, 10.00, 30),

    -- 6. Amul Spiced Masala & Marinated Paneer Tikka
    ('Amul Spiced Masala Paneer 200g', 'अमूल स्पाइस्ड मसाला पनीर 200 ग्राम', 'अमूल स्पाइस्ड मसाला पनीर 200 ग्रॅम', 'Paneer & Butter', 'Piece', 90.00, 105.00, 30.00, 8.00, 30),
    ('Amul Marinated Paneer Tikka 200g', 'अमूल मैरीनेटेड पनीर टिक्का 200 ग्राम', 'अमूल मॅरीनेटेड पनीर टिक्का 200 ग्रॅम', 'Paneer & Butter', 'Piece', 102.00, 120.00, 30.00, 8.00, 90),

    -- 7. Amul Canned Paneer (Tinned / Ambient Long Life)
    ('Amul Canned Paneer in Brine 400g Tin', 'अमूल डिब्बाबंद पनीर टिन 400 ग्राम', 'अमूल डबाबंद पनीर टिन 400 ग्रॅम', 'Paneer & Butter', 'Piece', 155.00, 180.00, 24.00, 6.00, 180);

    FOR rec IN SELECT * FROM tmp_amul_paneer_items LOOP
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
            v_batch_no := 'AML-PNR-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');
            INSERT INTO public.batches (
                id, product_id, product_name, batch_no, mfg_date, expiry_date,
                qty_received, qty_remaining, purchase_price, selling_price, status, notes
            ) VALUES (
                gen_random_uuid(), v_prod_id, rec.name, v_batch_no, v_today,
                v_today + (rec.shelf_life_days || ' days')::INTERVAL,
                rec.stock_quantity, rec.stock_quantity, rec.purchase_price, rec.selling_price, 'ACTIVE', 'Amul Paneer Inward'
            );
        END IF;
    END LOOP;
END $$;

SELECT 
    p.name AS product_name,
    p.category,
    p.unit,
    p.stock_quantity AS in_stock_qty,
    p.purchase_price AS buy_price_rs,
    p.selling_price AS sell_price_rs,
    (p.stock_quantity * p.purchase_price) AS inventory_valuation_rs,
    p.shelf_life_days,
    p.is_active
FROM public.products p
WHERE p.name ILIKE '%Amul%Paneer%'
   OR p.name ILIKE '%Amul%Tikka%'
ORDER BY p.name;

