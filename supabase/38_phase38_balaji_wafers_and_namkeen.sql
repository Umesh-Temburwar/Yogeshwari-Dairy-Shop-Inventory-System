-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - BALAJI WAFERS & NAMKEEN IN-STOCK SETUP
-- PHASE 38: BALAJI COMPLETE CATALOG (WAFERS, SEV, MIXTURE, FARALI, GATHIYA)
-- File: supabase/38_phase38_balaji_wafers_and_namkeen.sql
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
    CREATE TEMP TABLE tmp_balaji_items (
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

    INSERT INTO tmp_balaji_items VALUES
    ('Balaji Simply Salted Wafers 28g', 'बालाजी सिंपली साल्टेड वेफर्स 28 ग्राम', 'बालाजी सिम्पली सॉल्टेड वेफर्स 28 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 96.00, 24.00, 120),
    ('Balaji Simply Salted Wafers 55g', 'बालाजी सिंपली साल्टेड वेफर्स 55 ग्राम', 'बालाजी सिम्पली सॉल्टेड वेफर्स 55 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 72.00, 18.00, 120),
    ('Balaji Simply Salted Wafers 125g', 'बालाजी सिंपली साल्टेड वेफर्स 125 ग्राम', 'बालाजी सिम्पली सॉल्टेड वेफर्स 125 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 48.00, 12.00, 120),
    ('Balaji Masala Masti Wafers 28g', 'बालाजी मसाला मस्ती वेफर्स 28 ग्राम', 'बालाजी मसाला मस्ती वेफर्स 28 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 96.00, 24.00, 120),
    ('Balaji Masala Masti Wafers 55g', 'बालाजी मसाला मस्ती वेफर्स 55 ग्राम', 'बालाजी मसाला मस्ती वेफर्स 55 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 72.00, 18.00, 120),
    ('Balaji Masala Masti Wafers 125g', 'बालाजी मसाला मस्ती वेफर्स 125 ग्राम', 'बालाजी मसाला मस्ती वेफर्स 125 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 48.00, 12.00, 120),
    ('Balaji Tomato Twist Wafers 28g', 'बालाजी टोमैटो ट्विस्ट वेफर्स 28 ग्राम', 'बालाजी टोमॅटो ट्विस्ट वेफर्स 28 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 96.00, 24.00, 120),
    ('Balaji Tomato Twist Wafers 55g', 'बालाजी टोमैटो ट्विस्ट वेफर्स 55 ग्राम', 'बालाजी टोमॅटो ट्विस्ट वेफर्स 55 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 72.00, 18.00, 120),
    ('Balaji Tomato Twist Wafers 125g', 'बालाजी टोमैटो ट्विस्ट वेफर्स 125 ग्राम', 'बालाजी टोमॅटो ट्विस्ट वेफर्स 125 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 48.00, 12.00, 120),
    ('Balaji Cream & Onion Wafers 28g', 'बालाजी क्रीम एंड अनियन वेफर्स 28 ग्राम', 'बालाजी क्रीम अँड ओनियन वेफर्स 28 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 120),
    ('Balaji Cream & Onion Wafers 55g', 'बालाजी क्रीम एंड अनियन वेफर्स 55 ग्राम', 'बालाजी क्रीम अँड ओनियन वेफर्स 55 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120),
    ('Balaji Cream & Onion Wafers 125g', 'बालाजी क्रीम एंड अनियन वेफर्स 125 ग्राम', 'बालाजी क्रीम अँड ओनियन वेफर्स 125 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 36.00, 10.00, 120),
    ('Balaji Chaat Chaska Wafers 55g', 'बालाजी चाट चस्का वेफर्स 55 ग्राम', 'बालाजी चाट चस्का वेफर्स 55 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120),
    ('Balaji Crunchex Chilli Tadka 50g', 'बालाजी क्रंचेक्स चिली तड़का 50 ग्राम', 'बालाजी क्रंचेक्स मिरची तडका 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 120),
    ('Balaji Ratlami Sev 65g', 'बालाजी रतलामी सेव 65 ग्राम', 'बालाजी रतलामी शेव 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 150),
    ('Balaji Ratlami Sev 200g', 'बालाजी रतलामी सेव 200 ग्राम', 'बालाजी रतलामी शेव 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 36.00, 10.00, 150),
    ('Balaji Tikha Meetha Mix 65g', 'बालाजी तीखा मीठा मिक्स 65 ग्राम', 'बालाजी तिखट गोड मिक्स 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 150),
    ('Balaji Tikha Meetha Mix 200g', 'बालाजी तीखा मीठा मिक्स 200 ग्राम', 'बालाजी तिखट गोड मिक्स 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 36.00, 10.00, 150),
    ('Balaji Khatta Meetha Namkeen 65g', 'बालाजी खट्टा मीठा नमकीन 65 ग्राम', 'बालाजी आंबट गोड चिवडा 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 150),
    ('Balaji Khatta Meetha Namkeen 200g', 'बालाजी खट्टा मीठा नमकीन 200 ग्राम', 'बालाजी आंबट गोड चिवडा 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 36.00, 10.00, 150),
    ('Balaji Bhujia Sev 65g', 'बालाजी भुजिया सेव 65 ग्राम', 'बालाजी भुजिया शेव 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 150),
    ('Balaji Bhujia Sev 200g', 'बालाजी भुजिया सेव 200 ग्राम', 'बालाजी भुजिया शेव 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 36.00, 10.00, 150),
    ('Balaji Shing Bhujia (Masala Peanuts) 65g', 'बालाजी शिंग भुजिया 65 ग्राम', 'बालाजी शेंग भुजिया 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 150),
    ('Balaji Farali Chiwda 60g', 'बालाजी फराली चिवड़ा 60 ग्राम', 'बालाजी फराळी चिवडा 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 150),
    ('Balaji Farali Chiwda 180g', 'बालाजी फराली चिवड़ा 180 ग्राम', 'बालाजी फराळी चिवडा 180 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 36.00, 10.00, 150),
    ('Balaji Bhavnagari Gathiya 65g', 'बालाजी भावनगरी गांठिया 65 ग्राम', 'बालाजी भावनगरी गाठिया 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 150),
    ('Balaji Bhavnagari Gathiya 200g', 'बालाजी भावनगरी गांठिया 200 ग्राम', 'बालाजी भावनगरी गाठिया 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 36.00, 10.00, 150),
    ('Balaji Moong Dal 60g', 'बालाजी मूंग दाल 60 ग्राम', 'बालाजी मूग डाळ 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 150),
    ('Balaji Chana Jor Garam 60g', 'बालाजी चना जोर गरम 60 ग्राम', 'बालाजी चणा जोर गरम 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 150),
    ('Balaji Wheels Chatpata Masala 50g', 'बालाजी व्हील्स चटपटा मसाला 50 ग्राम', 'बालाजी व्हील्स चटपटीत मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120),
    ('Balaji Scoop Masala 50g', 'बालाजी स्कूप मसाला 50 ग्राम', 'बालाजी स्कूप मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120);

    FOR rec IN SELECT * FROM tmp_balaji_items LOOP
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
            v_batch_no := 'BLJ-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');
            INSERT INTO public.batches (
                id, product_id, product_name, batch_no, mfg_date, expiry_date,
                qty_received, qty_remaining, purchase_price, selling_price, status, notes
            ) VALUES (
                gen_random_uuid(), v_prod_id, rec.name, v_batch_no, v_today,
                v_today + (rec.shelf_life_days || ' days')::INTERVAL,
                rec.stock_quantity, rec.stock_quantity, rec.purchase_price, rec.selling_price, 'ACTIVE', 'Balaji Wafers Inward'
            );
        END IF;
    END LOOP;
END $$;

SELECT p.name AS product_name, p.category, p.unit, p.stock_quantity AS in_stock_qty,
       p.purchase_price AS buy_price_rs, p.selling_price AS sell_price_rs,
       (p.stock_quantity * p.purchase_price) AS valuation_rs
FROM public.products p
WHERE p.name ILIKE '%Balaji%'
ORDER BY p.name;

