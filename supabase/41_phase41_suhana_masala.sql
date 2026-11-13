-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUHANA SPICES & MASALA IN-STOCK SETUP
-- PHASE 41: SUHANA COMPLETE CATALOG (PANEER, PAV BHAJI, BIRYANI, KANDA LASUN)
-- File: supabase/41_phase41_suhana_masala.sql
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
    CREATE TEMP TABLE tmp_suhana_items (
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

    INSERT INTO tmp_suhana_items VALUES
    ('Suhana Garam Masala 50g', 'सुहाना गरम मसाला 50 ग्राम', 'सुहाना गरम मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 34.00, 42.00, 48.00, 12.00, 365),
    ('Suhana Garam Masala 100g', 'सुहाना गरम मसाला 100 ग्राम', 'सुहाना गरम मसाला 100 ग्रॅम', 'Bakery & Extras', 'Piece', 65.00, 80.00, 36.00, 10.00, 365),
    ('Suhana Paneer Butter Masala Mix 50g', 'सुहाना पनीर बटर मसाला 50 ग्राम', 'सुहाना पनीर बटर मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 48.00, 12.00, 365),
    ('Suhana Shahi Paneer Masala Mix 50g', 'सुहाना शाही पनीर मसाला 50 ग्राम', 'सुहाना शाही पनीर मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 48.00, 12.00, 365),
    ('Suhana Matar Paneer Masala Mix 50g', 'सुहाना मटर पनीर मसाला 50 ग्राम', 'सुहाना मटार पनीर मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 36.00, 10.00, 365),
    ('Suhana Pav Bhaji Masala 50g', 'सुहाना पाव भाजी मसाला 50 ग्राम', 'सुहाना पाव भाजी मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 34.00, 42.00, 60.00, 15.00, 365),
    ('Suhana Pav Bhaji Masala 100g', 'सुहाना पाव भाजी मसाला 100 ग्राम', 'सुहाना पाव भाजी मसाला 100 ग्रॅम', 'Bakery & Extras', 'Piece', 65.00, 80.00, 48.00, 12.00, 365),
    ('Suhana Veg Biryani Masala Mix 50g', 'सुहाना वेज बिरयानी मसाला 50 ग्राम', 'सुहाना व्हेज बिर्याणी मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 36.00, 10.00, 365),
    ('Suhana Chicken Biryani Mix 50g', 'सुहाना चिकन बिरयानी मसाला 50 ग्राम', 'सुहाना चिकन बिर्याणी मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 40.00, 50.00, 48.00, 12.00, 365),
    ('Suhana Mutton Biryani Mix 50g', 'सुहाना मटन बिरयानी मसाला 50 ग्राम', 'सुहाना मटण बिर्याणी मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 40.00, 50.00, 36.00, 10.00, 365),
    ('Suhana Kolhapuri Mutton Masala 50g', 'सुहाना कोल्हापुरी मटन मसाला 50 ग्राम', 'सुहाना कोल्हापुरी मटण मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 36.00, 10.00, 365),
    ('Suhana Kolhapuri Chicken Masala 50g', 'सुहाना कोल्हापुरी चिकन मसाला 50 ग्राम', 'सुहाना कोल्हापुरी चिकन मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 36.00, 10.00, 365),
    ('Suhana Misal Masala 50g', 'सुहाना मिसळ मसाला 50 ग्राम', 'सुहाना मिसळ मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 30.00, 38.00, 48.00, 12.00, 365),
    ('Suhana Shev Bhaji Masala 50g', 'सुहाना शेव भाजी मसाला 50 ग्राम', 'सुहाना शेव भाजी मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 30.00, 38.00, 48.00, 12.00, 365),
    ('Suhana Sambhar Masala 50g', 'सुहाना सांभर मसाला 50 ग्राम', 'सुहाना सांबार मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 32.00, 40.00, 36.00, 10.00, 365),
    ('Suhana Chole Masala 50g', 'सुहाना छोले मसाला 50 ग्राम', 'सुहाना छोले मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 34.00, 42.00, 36.00, 10.00, 365),
    ('Suhana Kitchen King Masala 100g', 'सुहाना किचन किंग मसाला 100 ग्राम', 'सुहाना किचन किंग मसाला 100 ग्रॅम', 'Bakery & Extras', 'Piece', 68.00, 85.00, 36.00, 10.00, 365),
    ('Suhana Kanda Lasun Masala 100g', 'सुहाना कांदा लहसुन मसाला 100 ग्राम', 'सुहाना कांदा लसूण मसाला 100 ग्रॅम', 'Bakery & Extras', 'Piece', 28.00, 35.00, 72.00, 18.00, 365),
    ('Suhana Kanda Lasun Masala 500g', 'सुहाना कांदा लहसुन मसाला 500 ग्राम', 'सुहाना कांदा लसूण मसाला 500 ग्रॅम', 'Bakery & Extras', 'Piece', 125.00, 155.00, 36.00, 10.00, 365),
    ('Suhana Haldi (Turmeric) Powder 100g', 'सुहाना हल्दी पाउडर 100 ग्राम', 'सुहाना हळद पावडर 100 ग्रॅम', 'Bakery & Extras', 'Piece', 28.00, 35.00, 60.00, 15.00, 365),
    ('Suhana Dhana Jeera Powder 100g', 'सुहाना धना जीरा पाउडर 100 ग्राम', 'सुहाना धने जिरे पावडर 100 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 60.00, 15.00, 365),
    ('Suhana Red Chilli Powder 100g', 'सुहाना लाल मिर्च पाउडर 100 ग्राम', 'सुहाना लाल मिरची पावडर 100 ग्रॅम', 'Bakery & Extras', 'Piece', 40.00, 50.00, 60.00, 15.00, 365);

    FOR rec IN SELECT * FROM tmp_suhana_items LOOP
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
            v_batch_no := 'SHN-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');
            INSERT INTO public.batches (
                id, product_id, product_name, batch_no, mfg_date, expiry_date,
                qty_received, qty_remaining, purchase_price, selling_price, status, notes
            ) VALUES (
                gen_random_uuid(), v_prod_id, rec.name, v_batch_no, v_today,
                v_today + (rec.shelf_life_days || ' days')::INTERVAL,
                rec.stock_quantity, rec.stock_quantity, rec.purchase_price, rec.selling_price, 'ACTIVE', 'Suhana Masala Inward'
            );
        END IF;
    END LOOP;
END $$;

SELECT p.name AS product_name, p.category, p.unit, p.stock_quantity AS in_stock_qty,
       p.purchase_price AS buy_price_rs, p.selling_price AS sell_price_rs
FROM public.products p
WHERE p.name ILIKE '%Suhana%'
ORDER BY p.name;

