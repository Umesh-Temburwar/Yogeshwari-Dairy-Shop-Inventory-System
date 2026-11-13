-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - DAIRY POWER FRESH DAIRY PRODUCTS SETUP
-- PHASE 47: DAIRY POWER MILK, DAHI, CHAAS, PANEER, GHEE, SHRIKHAND & AMRAKHAND
-- File: supabase/47_phase47_dairy_power_dairy_products.sql
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
    CREATE TEMP TABLE tmp_dairypower_items (
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

    INSERT INTO tmp_dairypower_items VALUES
    -- Fresh Milk Pouches
    ('Dairy Power Toned Milk 500ml', 'डेयरी पावर टोन्ड दूध 500 मिली', 'डेअरी पॉवर टोन्ड दूध 500 मिली', 'Milk', 'Packet (500ml)', 25.00, 28.00, 60.00, 20.00, 2),
    ('Dairy Power Toned Milk 1L', 'डेयरी पावर टोन्ड दूध 1 लीटर', 'डेअरी पॉवर टोन्ड दूध 1 लिटर', 'Milk', 'Packet (1L)', 50.00, 55.00, 40.00, 15.00, 2),
    ('Dairy Power Standardized Milk 500ml', 'डेयरी पावर स्टैंडर्ड दूध 500 मिली', 'डेअरी पॉवर स्टँडर्ड दूध 500 मिली', 'Milk', 'Packet (500ml)', 27.00, 30.00, 50.00, 15.00, 2),
    ('Dairy Power Full Cream Milk 500ml', 'डेयरी पावर फुल क्रीम दूध 500 मिली', 'डेअरी पॉवर फुल क्रीम दूध 500 मिली', 'Milk', 'Packet (500ml)', 31.50, 35.00, 60.00, 20.00, 2),
    ('Dairy Power Full Cream Milk 1L', 'डेयरी पावर फुल क्रीम दूध 1 लीटर', 'डेअरी पॉवर फुल क्रीम दूध 1 लिटर', 'Milk', 'Packet (1L)', 62.00, 68.00, 40.00, 15.00, 2),
    ('Dairy Power Cow Milk 500ml', 'डेयरी पावर गाय का दूध 500 मिली', 'डेअरी पॉवर गाईचे दूध 500 मिली', 'Milk', 'Packet (500ml)', 26.00, 29.00, 50.00, 15.00, 2),

    -- Curd, Chaas & Lassi
    ('Dairy Power Fresh Curd (Dahi) 200g Cup', 'डेयरी पावर ताजा दही 200 ग्राम', 'डेअरी पॉवर ताजे दही 200 ग्रॅम', 'Curd & Chaas', 'Piece', 16.50, 20.00, 48.00, 12.00, 7),
    ('Dairy Power Fresh Curd (Dahi) 400g Pouch', 'डेयरी पावर ताजा दही 400 ग्राम', 'डेअरी पॉवर ताजे दही 400 ग्रॅम', 'Curd & Chaas', 'Piece', 29.50, 35.00, 36.00, 10.00, 7),
    ('Dairy Power Spiced Masala Chaas 200ml', 'डेयरी पावर मसाला छाछ 200 मिली', 'डेअरी पॉवर मसाला ताक 200 मिली', 'Curd & Chaas', 'Piece', 9.50, 12.00, 60.00, 15.00, 5),
    ('Dairy Power Sweet Lassi 200ml Cup', 'डेयरी पावर मीठी लस्सी 200 मिली', 'डेअरी पॉवर गोड लस्सी 200 मिली', 'Curd & Chaas', 'Piece', 16.00, 20.00, 48.00, 12.00, 7),

    -- Fresh Paneer
    ('Dairy Power Fresh Malai Paneer 200g', 'डेयरी पावर मलाई पनीर 200 ग्राम', 'डेअरी पॉवर मलाई पनीर 200 ग्रॅम', 'Paneer & Butter', 'Piece', 76.00, 90.00, 40.00, 10.00, 10),
    ('Dairy Power Fresh Malai Paneer 1kg Block', 'डेयरी पावर मलाई पनीर 1 किग्रा', 'डेअरी पॉवर मलाई पनीर 1 किलो', 'Paneer & Butter', 'Kg', 360.00, 420.00, 15.00, 5.00, 10),

    -- Pure Ghee
    ('Dairy Power Pure Cow Ghee 500ml Pouch', 'डेयरी पावर शुद्ध गाय घी 500 मिली', 'डेअरी पॉवर शुद्ध गाईचे तूप 500 मिली', 'Ghee', 'Piece', 295.00, 340.00, 24.00, 6.00, 270),
    ('Dairy Power Pure Cow Ghee 1L Jar', 'डेयरी पावर शुद्ध गाय घी 1 लीटर', 'डेअरी पॉवर शुद्ध गाईचे तूप 1 लिटर', 'Ghee', 'Piece', 580.00, 670.00, 18.00, 4.00, 270),
    ('Dairy Power Pure Buffalo Ghee 500ml', 'डेयरी पावर शुद्ध भैंस घी 500 मिली', 'डेअरी पॉवर शुद्ध म्हशीचे तूप 500 मिली', 'Ghee', 'Piece', 310.00, 360.00, 24.00, 6.00, 270),
    ('Dairy Power Pure Buffalo Ghee 1L Jar', 'डेयरी पावर शुद्ध भैंस घी 1 लीटर', 'डेअरी पॉवर शुद्ध म्हशीचे तूप 1 लिटर', 'Ghee', 'Piece', 615.00, 710.00, 18.00, 4.00, 270),

    -- Shrikhand & Sweets
    ('Dairy Power Elaichi Shrikhand 250g', 'डेयरी पावर इलायची श्रीखंड 250 ग्राम', 'डेअरी पॉवर वेलची श्रीखंड 250 ग्रॅम', 'Sweets/Mithai', 'Piece', 54.00, 65.00, 36.00, 10.00, 30),
    ('Dairy Power Elaichi Shrikhand 500g', 'डेयरी पावर इलायची श्रीखंड 500 ग्राम', 'डेअरी पॉवर वेलची श्रीखंड 500 ग्रॅम', 'Sweets/Mithai', 'Piece', 105.00, 125.00, 24.00, 6.00, 30),
    ('Dairy Power Mango Amrakhand 250g', 'डेयरी पावर मैंगो आम्रखंड 250 ग्राम', 'डेअरी पॉवर मँगो आम्रखंड 250 ग्रॅम', 'Sweets/Mithai', 'Piece', 58.00, 70.00, 36.00, 10.00, 30),
    ('Dairy Power Mango Amrakhand 500g', 'डेयरी पावर मैंगो आम्रखंड 500 ग्राम', 'डेअरी पॉवर मँगो आम्रखंड 500 ग्रॅम', 'Sweets/Mithai', 'Piece', 112.00, 135.00, 24.00, 6.00, 30);

    FOR rec IN SELECT * FROM tmp_dairypower_items LOOP
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
            v_batch_no := 'DPR-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');
            INSERT INTO public.batches (
                id, product_id, product_name, batch_no, mfg_date, expiry_date,
                qty_received, qty_remaining, purchase_price, selling_price, status, notes
            ) VALUES (
                gen_random_uuid(), v_prod_id, rec.name, v_batch_no, v_today,
                v_today + (rec.shelf_life_days || ' days')::INTERVAL,
                rec.stock_quantity, rec.stock_quantity, rec.purchase_price, rec.selling_price, 'ACTIVE', 'Dairy Power Inward'
            );
        END IF;
    END LOOP;
END $$;

SELECT p.name AS product_name, p.category, p.unit, p.stock_quantity AS in_stock_qty,
       p.purchase_price AS buy_price_rs, p.selling_price AS sell_price_rs
FROM public.products p
WHERE p.name ILIKE '%Dairy Power%'
ORDER BY p.name;

