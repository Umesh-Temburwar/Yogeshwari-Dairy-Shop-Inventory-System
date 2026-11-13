-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - ALL NEW FMCG & REGIONAL BRANDS MASTER SETUP
-- PHASES 38 TO 48 COMBINED (220+ PRODUCTS IN-STOCK IN ONE RUN)
-- File: supabase/all_new_fmcg_in_stock_master.sql
-- ============================================================================
-- BRANDS INCLUDED:
--   1. Balaji Wafers & Namkeen (Phase 38)
--   2. Temptin Sauces & Condiments (Phase 39)
--   3. Rambandhu Masala, Pickles & Papad (Phase 40)
--   4. Suhana Spices & Masala (Phase 41)
--   5. Mayora Malkist & Unibic Biscott (Phase 42)
--   6. Diamond Wafers & Snacks (Phase 43)
--   7. Chakote Wafers, Toast, Khari & Rolls (Phase 44)
--   8. Moti Namkeen & Falahari Sabudana Chiwda (Phase 45)
--   9. Campa, Sprite & Packaged Drinking Water (Empire/Sunreach) (Phase 46)
--  10. Dairy Power Milk, Dahi, Paneer, Ghee, Shrikhand (Phase 47)
--  11. Nestle Maggi, KitKat, Munch, Nescafe, Everyday & Milkmaid (Phase 48)
-- ============================================================================

-- Ensure batches table has product_name column
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
    CREATE TEMP TABLE tmp_master_items (
        name VARCHAR(255),
        hindi_name VARCHAR(255),
        marathi_name VARCHAR(255),
        category VARCHAR(100),
        unit VARCHAR(50),
        purchase_price NUMERIC(12,2),
        selling_price NUMERIC(12,2),
        stock_quantity NUMERIC(12,2),
        min_stock_alert NUMERIC(12,2),
        shelf_life_days INTEGER,
        batch_prefix VARCHAR(10)
    ) ON COMMIT DROP;

    -- 1. BALAJI
    INSERT INTO tmp_master_items VALUES
    ('Balaji Simply Salted Wafers 28g', 'बालाजी सिंपली साल्टेड वेफर्स 28 ग्राम', 'बालाजी सिम्पली सॉल्टेड वेफर्स 28 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 96.00, 24.00, 120, 'BLJ'),
    ('Balaji Simply Salted Wafers 55g', 'बालाजी सिंपली साल्टेड वेफर्स 55 ग्राम', 'बालाजी सिम्पली सॉल्टेड वेफर्स 55 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 72.00, 18.00, 120, 'BLJ'),
    ('Balaji Simply Salted Wafers 125g', 'बालाजी सिंपली साल्टेड वेफर्स 125 ग्राम', 'बालाजी सिम्पली सॉल्टेड वेफर्स 125 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 48.00, 12.00, 120, 'BLJ'),
    ('Balaji Masala Masti Wafers 28g', 'बालाजी मसाला मस्ती वेफर्स 28 ग्राम', 'बालाजी मसाला मस्ती वेफर्स 28 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 96.00, 24.00, 120, 'BLJ'),
    ('Balaji Masala Masti Wafers 55g', 'बालाजी मसाला मस्ती वेफर्स 55 ग्राम', 'बालाजी मसाला मस्ती वेफर्स 55 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 72.00, 18.00, 120, 'BLJ'),
    ('Balaji Masala Masti Wafers 125g', 'बालाजी मसाला मस्ती वेफर्स 125 ग्राम', 'बालाजी मसाला मस्ती वेफर्स 125 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 48.00, 12.00, 120, 'BLJ'),
    ('Balaji Tomato Twist Wafers 28g', 'बालाजी टोमैटो ट्विस्ट वेफर्स 28 ग्राम', 'बालाजी टोमॅटो ट्विस्ट वेफर्स 28 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 96.00, 24.00, 120, 'BLJ'),
    ('Balaji Tomato Twist Wafers 55g', 'बालाजी टोमैटो ट्विस्ट वेफर्स 55 ग्राम', 'बालाजी टोमॅटो ट्विस्ट वेफर्स 55 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 72.00, 18.00, 120, 'BLJ'),
    ('Balaji Tomato Twist Wafers 125g', 'बालाजी टोमैटो ट्विस्ट वेफर्स 125 ग्राम', 'बालाजी टोमॅटो ट्विस्ट वेफर्स 125 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 48.00, 12.00, 120, 'BLJ'),
    ('Balaji Cream & Onion Wafers 28g', 'बालाजी क्रीम एंड अनियन वेफर्स 28 ग्राम', 'बालाजी क्रीम अँड ओनियन वेफर्स 28 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 120, 'BLJ'),
    ('Balaji Cream & Onion Wafers 55g', 'बालाजी क्रीम एंड अनियन वेफर्स 55 ग्राम', 'बालाजी क्रीम अँड ओनियन वेफर्स 55 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120, 'BLJ'),
    ('Balaji Cream & Onion Wafers 125g', 'बालाजी क्रीम एंड अनियन वेफर्स 125 ग्राम', 'बालाजी क्रीम अँड ओनियन वेफर्स 125 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 36.00, 10.00, 120, 'BLJ'),
    ('Balaji Chaat Chaska Wafers 55g', 'बालाजी चाट चस्का वेफर्स 55 ग्राम', 'बालाजी चाट चस्का वेफर्स 55 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120, 'BLJ'),
    ('Balaji Crunchex Chilli Tadka 50g', 'बालाजी क्रंचेक्स चिली तड़का 50 ग्राम', 'बालाजी क्रंचेक्स मिरची तडका 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 120, 'BLJ'),
    ('Balaji Ratlami Sev 65g', 'बालाजी रतलामी सेव 65 ग्राम', 'बालाजी रतलामी शेव 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 150, 'BLJ'),
    ('Balaji Ratlami Sev 200g', 'बालाजी रतलामी सेव 200 ग्राम', 'बालाजी रतलामी शेव 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 36.00, 10.00, 150, 'BLJ'),
    ('Balaji Tikha Meetha Mix 65g', 'बालाजी तीखा मीठा मिक्स 65 ग्राम', 'बालाजी तिखट गोड मिक्स 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 150, 'BLJ'),
    ('Balaji Tikha Meetha Mix 200g', 'बालाजी तीखा मीठा मिक्स 200 ग्राम', 'बालाजी तिखट गोड मिक्स 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 36.00, 10.00, 150, 'BLJ'),
    ('Balaji Khatta Meetha Namkeen 65g', 'बालाजी खट्टा मीठा नमकीन 65 ग्राम', 'बालाजी आंबट गोड चिवडा 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 150, 'BLJ'),
    ('Balaji Khatta Meetha Namkeen 200g', 'बालाजी खट्टा मीठा नमकीन 200 ग्राम', 'बालाजी आंबट गोड चिवडा 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 36.00, 10.00, 150, 'BLJ'),
    ('Balaji Bhujia Sev 65g', 'बालाजी भुजिया सेव 65 ग्राम', 'बालाजी भुजिया शेव 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 150, 'BLJ'),
    ('Balaji Bhujia Sev 200g', 'बालाजी भुजिया सेव 200 ग्राम', 'बालाजी भुजिया शेव 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 36.00, 10.00, 150, 'BLJ'),
    ('Balaji Shing Bhujia (Masala Peanuts) 65g', 'बालाजी शिंग भुजिया 65 ग्राम', 'बालाजी शेंग भुजिया 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 150, 'BLJ'),
    ('Balaji Farali Chiwda 60g', 'बालाजी फराली चिवड़ा 60 ग्राम', 'बालाजी फराळी चिवडा 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 150, 'BLJ'),
    ('Balaji Farali Chiwda 180g', 'बालाजी फराली चिवड़ा 180 ग्राम', 'बालाजी फराळी चिवडा 180 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 36.00, 10.00, 150, 'BLJ'),
    ('Balaji Bhavnagari Gathiya 65g', 'बालाजी भावनगरी गांठिया 65 ग्राम', 'बालाजी भावनगरी गाठिया 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 150, 'BLJ'),
    ('Balaji Bhavnagari Gathiya 200g', 'बालाजी भावनगरी गांठिया 200 ग्राम', 'बालाजी भावनगरी गाठिया 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 36.00, 10.00, 150, 'BLJ'),
    ('Balaji Moong Dal 60g', 'बालाजी मूंग दाल 60 ग्राम', 'बालाजी मूग डाळ 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 150, 'BLJ'),
    ('Balaji Chana Jor Garam 60g', 'बालाजी चना जोर गरम 60 ग्राम', 'बालाजी चणा जोर गरम 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 150, 'BLJ'),
    ('Balaji Wheels Chatpata Masala 50g', 'बालाजी व्हील्स चटपटा मसाला 50 ग्राम', 'बालाजी व्हील्स चटपटीत मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120, 'BLJ'),
    ('Balaji Scoop Masala 50g', 'बालाजी स्कूप मसाला 50 ग्राम', 'बालाजी स्कूप मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120, 'BLJ'),

    -- 2. TEMPTIN
    ('Temptin Tomato Ketchup 950g Bottle', 'टेम्प्टिन टोमैटो केचप 950 ग्राम', 'टेम्प्टिन टोमॅटो केचप 950 ग्रॅम', 'Bakery & Extras', 'Piece', 98.00, 120.00, 36.00, 8.00, 365, 'TMP'),
    ('Temptin Tomato Ketchup 500g Squeezo', 'टेम्प्टिन टोमैटो केचप 500 ग्राम', 'टेम्प्टिन टोमॅटो केचप 500 ग्रॅम', 'Bakery & Extras', 'Piece', 60.00, 75.00, 48.00, 12.00, 365, 'TMP'),
    ('Temptin Tomato Ketchup 200g Pouch', 'टेम्प्टिन टोमैटो केचप 200 ग्राम', 'टेम्प्टिन टोमॅटो केचप 200 ग्रॅम', 'Bakery & Extras', 'Piece', 24.00, 30.00, 60.00, 15.00, 365, 'TMP'),
    ('Temptin Red Chilli Sauce 650g Bottle', 'टेम्प्टिन रेड चिली सॉस 650 ग्राम', 'टेम्प्टिन लाल मिरची सॉस 650 ग्रॅम', 'Bakery & Extras', 'Piece', 48.00, 60.00, 36.00, 10.00, 365, 'TMP'),
    ('Temptin Green Chilli Sauce 650g Bottle', 'टेम्प्टिन ग्रीन चिली सॉस 650 ग्राम', 'टेम्प्टिन हिरवी मिरची सॉस 650 ग्रॅम', 'Bakery & Extras', 'Piece', 48.00, 60.00, 36.00, 10.00, 365, 'TMP'),
    ('Temptin Dark Soya Sauce 650g Bottle', 'टेम्प्टिन डार्क सोया सॉस 650 ग्राम', 'टेम्प्टिन डार्क सोया सॉस 650 ग्रॅम', 'Bakery & Extras', 'Piece', 48.00, 60.00, 36.00, 10.00, 365, 'TMP'),
    ('Temptin Synthetic White Vinegar 650ml', 'टेम्प्टिन सिरका 650 मिली', 'टेम्प्टिन व्हिनेगर 650 मिली', 'Bakery & Extras', 'Piece', 35.00, 45.00, 36.00, 10.00, 365, 'TMP'),
    ('Temptin Schezwan Chutney 250g Jar', 'टेम्प्टिन शेजवान चटनी 250 ग्राम', 'टेम्प्टिन शेजवान चटणी 250 ग्रॅम', 'Bakery & Extras', 'Piece', 68.00, 85.00, 48.00, 12.00, 270, 'TMP'),
    ('Temptin Schezwan Chutney 200g Squeezo', 'टेम्प्टिन शेजवान चटनी 200 ग्राम', 'टेम्प्टिन शेजवान चटणी 200 ग्रॅम', 'Bakery & Extras', 'Piece', 52.00, 65.00, 48.00, 12.00, 270, 'TMP'),
    ('Temptin Eggless Veg Mayonnaise 250g Pouch', 'टेम्प्टिन वेज मेयोनेज 250 ग्राम', 'टेम्प्टिन व्हेज मेयोनीज 250 ग्रॅम', 'Bakery & Extras', 'Piece', 48.00, 60.00, 36.00, 10.00, 180, 'TMP'),
    ('Temptin Pizza & Pasta Sauce 250g Jar', 'टेम्प्टिन पिज्जा एंड पास्ता सॉस 250 ग्राम', 'टेम्प्टिन पिझ्झा व पास्ता सॉस 250 ग्रॅम', 'Bakery & Extras', 'Piece', 60.00, 75.00, 36.00, 10.00, 270, 'TMP'),

    -- 3. RAMBANDHU
    ('Rambandhu Mango Pickle 200g Pouch', 'रामबंधु आम का अचार 200 ग्राम', 'रामबंधू आंब्याचे लोणचे 200 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 48.00, 12.00, 365, 'RBD'),
    ('Rambandhu Mango Pickle 500g Jar', 'रामबंधु आम का अचार 500 ग्राम', 'रामबंधू आंब्याचे लोणचे 500 ग्रॅम', 'Bakery & Extras', 'Piece', 88.00, 110.00, 24.00, 6.00, 365, 'RBD'),
    ('Rambandhu Lemon Pickle 200g Pouch', 'रामबंधु नींबू का अचार 200 ग्राम', 'रामबंधू लिंबाचे लोणचे 200 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 36.00, 10.00, 365, 'RBD'),
    ('Rambandhu Mixed Pickle 200g Pouch', 'रामबंधु मिक्स्ड अचार 200 ग्राम', 'रामबंधू मिक्स लोणचे 200 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 36.00, 10.00, 365, 'RBD'),
    ('Rambandhu Green Chilli Pickle 200g Pouch', 'रामबंधु हरी मिर्च का अचार 200 ग्राम', 'रामबंधू मिरचीचे लोणचे 200 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 36.00, 10.00, 365, 'RBD'),
    ('Rambandhu Udad Papad 200g', 'रामबंधु उड़द पापड़ 200 ग्राम', 'रामबंधू उडीद पापड 200 ग्रॅम', 'Bakery & Extras', 'Piece', 48.00, 60.00, 48.00, 12.00, 180, 'RBD'),
    ('Rambandhu Moong Papad 200g', 'रामबंधु मूंग पापड़ 200 ग्राम', 'रामबंधू मूग पापड 200 ग्रॅम', 'Bakery & Extras', 'Piece', 52.00, 65.00, 36.00, 10.00, 180, 'RBD'),
    ('Rambandhu Garam Masala 50g', 'रामबंधु गरम मसाला 50 ग्राम', 'रामबंधू गरम मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 30.00, 38.00, 48.00, 12.00, 365, 'RBD'),
    ('Rambandhu Garam Masala 100g', 'रामबंधु गरम मसाला 100 ग्राम', 'रामबंधू गरम मसाला 100 ग्रॅम', 'Bakery & Extras', 'Piece', 58.00, 72.00, 36.00, 10.00, 365, 'RBD'),
    ('Rambandhu Pav Bhaji Masala 50g', 'रामबंधु पाव भाजी मसाला 50 ग्राम', 'रामबंधू पाव भाजी मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 32.00, 40.00, 48.00, 12.00, 365, 'RBD'),
    ('Rambandhu Sambhar Masala 50g', 'रामबंधु सांभर मसाला 50 ग्राम', 'रामबंधू सांबार मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 30.00, 38.00, 36.00, 10.00, 365, 'RBD'),
    ('Rambandhu Mutton / Chicken Masala 50g', 'रामबंधु मटन चिकन मसाला 50 ग्राम', 'रामबंधू मटण चिकन मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 32.00, 40.00, 48.00, 12.00, 365, 'RBD'),
    ('Rambandhu Kasuri Methi 25g', 'रामबंधु कसूरी मेथी 25 ग्राम', 'रामबंधू कसुरी मेथी 25 ग्रॅम', 'Bakery & Extras', 'Piece', 20.00, 25.00, 36.00, 10.00, 365, 'RBD'),
    ('Rambandhu Hing Powder 50g', 'रामबंधु हींग 50 ग्राम', 'रामबंधू हिंग 50 ग्रॅम', 'Bakery & Extras', 'Piece', 52.00, 65.00, 36.00, 10.00, 365, 'RBD'),

    -- 4. SUHANA
    ('Suhana Garam Masala 50g', 'सुहाना गरम मसाला 50 ग्राम', 'सुहाना गरम मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 34.00, 42.00, 48.00, 12.00, 365, 'SHN'),
    ('Suhana Garam Masala 100g', 'सुहाना गरम मसाला 100 ग्राम', 'सुहाना गरम मसाला 100 ग्रॅम', 'Bakery & Extras', 'Piece', 65.00, 80.00, 36.00, 10.00, 365, 'SHN'),
    ('Suhana Paneer Butter Masala Mix 50g', 'सुहाना पनीर बटर मसाला 50 ग्राम', 'सुहाना पनीर बटर मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 48.00, 12.00, 365, 'SHN'),
    ('Suhana Shahi Paneer Masala Mix 50g', 'सुहाना शाही पनीर मसाला 50 ग्राम', 'सुहाना शाही पनीर मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 48.00, 12.00, 365, 'SHN'),
    ('Suhana Matar Paneer Masala Mix 50g', 'सुहाना मटर पनीर मसाला 50 ग्राम', 'सुहाना मटार पनीर मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 36.00, 10.00, 365, 'SHN'),
    ('Suhana Pav Bhaji Masala 50g', 'सुहाना पाव भाजी मसाला 50 ग्राम', 'सुहाना पाव भाजी मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 34.00, 42.00, 60.00, 15.00, 365, 'SHN'),
    ('Suhana Pav Bhaji Masala 100g', 'सुहाना पाव भाजी मसाला 100 ग्राम', 'सुहाना पाव भाजी मसाला 100 ग्रॅम', 'Bakery & Extras', 'Piece', 65.00, 80.00, 48.00, 12.00, 365, 'SHN'),
    ('Suhana Veg Biryani Masala Mix 50g', 'सुहाना वेज बिरयानी मसाला 50 ग्राम', 'सुहाना व्हेज बिर्याणी मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 36.00, 10.00, 365, 'SHN'),
    ('Suhana Chicken Biryani Mix 50g', 'सुहाना चिकन बिरयानी मसाला 50 ग्राम', 'सुहाना चिकन बिर्याणी मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 40.00, 50.00, 48.00, 12.00, 365, 'SHN'),
    ('Suhana Mutton Biryani Mix 50g', 'सुहाना मटन बिरयानी मसाला 50 ग्राम', 'सुहाना मटण बिर्याणी मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 40.00, 50.00, 36.00, 10.00, 365, 'SHN'),
    ('Suhana Kolhapuri Mutton Masala 50g', 'सुहाना कोल्हापुरी मटन मसाला 50 ग्राम', 'सुहाना कोल्हापुरी मटण मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 36.00, 10.00, 365, 'SHN'),
    ('Suhana Kolhapuri Chicken Masala 50g', 'सुहाना कोल्हापुरी चिकन मसाला 50 ग्राम', 'सुहाना कोल्हापुरी चिकन मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 36.00, 10.00, 365, 'SHN'),
    ('Suhana Misal Masala 50g', 'सुहाना मिसळ मसाला 50 ग्राम', 'सुहाना मिसळ मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 30.00, 38.00, 48.00, 12.00, 365, 'SHN'),
    ('Suhana Shev Bhaji Masala 50g', 'सुहाना शेव भाजी मसाला 50 ग्राम', 'सुहाना शेव भाजी मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 30.00, 38.00, 48.00, 12.00, 365, 'SHN'),
    ('Suhana Sambhar Masala 50g', 'सुहाना सांभर मसाला 50 ग्राम', 'सुहाना सांबार मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 32.00, 40.00, 36.00, 10.00, 365, 'SHN'),
    ('Suhana Chole Masala 50g', 'सुहाना छोले मसाला 50 ग्राम', 'सुहाना छोले मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 34.00, 42.00, 36.00, 10.00, 365, 'SHN'),
    ('Suhana Kitchen King Masala 100g', 'सुहाना किचन किंग मसाला 100 ग्राम', 'सुहाना किचन किंग मसाला 100 ग्रॅम', 'Bakery & Extras', 'Piece', 68.00, 85.00, 36.00, 10.00, 365, 'SHN'),
    ('Suhana Kanda Lasun Masala 100g', 'सुहाना कांदा लहसुन मसाला 100 ग्राम', 'सुहाना कांदा लसूण मसाला 100 ग्रॅम', 'Bakery & Extras', 'Piece', 28.00, 35.00, 72.00, 18.00, 365, 'SHN'),
    ('Suhana Kanda Lasun Masala 500g', 'सुहाना कांदा लहसुन मसाला 500 ग्राम', 'सुहाना कांदा लसूण मसाला 500 ग्रॅम', 'Bakery & Extras', 'Piece', 125.00, 155.00, 36.00, 10.00, 365, 'SHN'),
    ('Suhana Haldi (Turmeric) Powder 100g', 'सुहाना हल्दी पाउडर 100 ग्राम', 'सुहाना हळद पावडर 100 ग्रॅम', 'Bakery & Extras', 'Piece', 28.00, 35.00, 60.00, 15.00, 365, 'SHN'),
    ('Suhana Dhana Jeera Powder 100g', 'सुहाना धना जीरा पाउडर 100 ग्राम', 'सुहाना धने जिरे पावडर 100 ग्रॅम', 'Bakery & Extras', 'Piece', 36.00, 45.00, 60.00, 15.00, 365, 'SHN'),
    ('Suhana Red Chilli Powder 100g', 'सुहाना लाल मिर्च पाउडर 100 ग्राम', 'सुहाना लाल मिरची पावडर 100 ग्रॅम', 'Bakery & Extras', 'Piece', 40.00, 50.00, 60.00, 15.00, 365, 'SHN'),

    -- 5. MALKIST & BISCOTT
    ('Mayora Malkist Cheese Crackers 100g', 'मायोरा मालकिस्ट चीज क्रैकर्स 100 ग्राम', 'मायोरा माल्किस्ट चीज क्रॅकर्स 100 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 48.00, 12.00, 180, 'MLK'),
    ('Mayora Malkist Cheese Crackers 144g', 'मायोरा मालकिस्ट चीज क्रैकर्स 144 ग्राम', 'मायोरा माल्किस्ट चीज क्रॅकर्स 144 ग्रॅम', 'Bakery & Extras', 'Piece', 29.00, 35.00, 36.00, 10.00, 180, 'MLK'),
    ('Mayora Malkist Chocolate Crackers 100g', 'मायोरा मालकिस्ट चॉकलेट क्रैकर्स 100 ग्राम', 'मायोरा माल्किस्ट चॉकलेट क्रॅकर्स 100 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 48.00, 12.00, 180, 'MLK'),
    ('Mayora Malkist Chocolate Crackers 144g', 'मायोरा मालकिस्ट चॉकलेट क्रैकर्स 144 ग्राम', 'मायोरा माल्किस्ट चॉकलेट क्रॅकर्स 144 ग्रॅम', 'Bakery & Extras', 'Piece', 29.00, 35.00, 36.00, 10.00, 180, 'MLK'),
    ('Mayora Malkist Cappuccino Crackers 100g', 'मायोरा मालकिस्ट कैपुचीनो क्रैकर्स 100 ग्राम', 'मायोरा माल्किस्ट कॅपुचिनो क्रॅकर्स 100 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 48.00, 12.00, 180, 'MLK'),
    ('Mayora Malkist Sugar Glazed Crackers 100g', 'मायोरा मालकिस्ट शुगर क्रैकर्स 100 ग्राम', 'मायोरा माल्किस्ट साखर क्रॅकर्स 100 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 48.00, 12.00, 180, 'MLK'),
    ('Mayora Malkist BBQ Crackers 100g', 'मायोरा मालकिस्ट बारबेक्यू क्रैकर्स 100 ग्राम', 'मायोरा माल्किस्ट बारबेक्यू क्रॅकर्स 100 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 36.00, 10.00, 180, 'MLK'),
    ('Unibic Biscott Caramel Biscuits 75g', 'यूनिबिक बिस्कॉट कारमेल बिस्कुट 75 ग्राम', 'युनिबिक बिस्कॉट कारमेल बिस्कीट 75 ग्रॅम', 'Bakery & Extras', 'Piece', 20.50, 25.00, 48.00, 12.00, 180, 'MLK'),
    ('Unibic Biscott Caramel Biscuits 150g', 'यूनिबिक बिस्कॉट कारमेल बिस्कुट 150 ग्राम', 'युनिबिक बिस्कॉट कारमेल बिस्कीट 150 ग्रॅम', 'Bakery & Extras', 'Piece', 41.00, 50.00, 36.00, 10.00, 180, 'MLK'),
    ('Unibic Biscott Spiced Cinnamon 75g', 'यूनिबिक बिस्कॉट दालचीनी 75 ग्राम', 'युनिबिक बिस्कॉट दालचिनी 75 ग्रॅम', 'Bakery & Extras', 'Piece', 20.50, 25.00, 36.00, 10.00, 180, 'MLK'),
    ('Unibic Biscott Coffee Biscuits 75g', 'यूनिबिक बिस्कॉट कॉफी बिस्कुट 75 ग्राम', 'युनिबिक बिस्कॉट कॉफी बिस्कीट 75 ग्रॅम', 'Bakery & Extras', 'Piece', 20.50, 25.00, 36.00, 10.00, 180, 'MLK'),

    -- 6. DIAMOND
    ('Diamond Potato Chips Salted 25g', 'डायमंड पोटैटो चिप्स साल्टेड 25 ग्राम', 'डायमंड बटाटा वेफर्स सॉल्टेड 25 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 120, 'DMD'),
    ('Diamond Potato Chips Salted 50g', 'डायमंड पोटैटो चिप्स साल्टेड 50 ग्राम', 'डायमंड बटाटा वेफर्स सॉल्टेड 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120, 'DMD'),
    ('Diamond Potato Chips Masala Punch 25g', 'डायमंड चिप्स मसाला पंच 25 ग्राम', 'डायमंड वेफर्स मसाला पंच 25 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 120, 'DMD'),
    ('Diamond Potato Chips Masala Punch 50g', 'डायमंड चिप्स मसाला पंच 50 ग्राम', 'डायमंड वेफर्स मसाला पंच 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120, 'DMD'),
    ('Diamond Potato Chips Tomato Twist 25g', 'डायमंड चिप्स टोमैटो ट्विस्ट 25 ग्राम', 'डायमंड वेफर्स टोमॅटो ट्विस्ट 25 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 120, 'DMD'),
    ('Diamond Potato Chips Tomato Twist 50g', 'डायमंड चिप्स टोमैटो ट्विस्ट 50 ग्राम', 'डायमंड वेफर्स टोमॅटो ट्विस्ट 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120, 'DMD'),
    ('Diamond Potato Chips Cream & Onion 50g', 'डायमंड क्रीम एंड अनियन 50 ग्राम', 'डायमंड क्रीम अँड ओनियन 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 120, 'DMD'),
    ('Diamond Wheels Masala 25g', 'डायमंड व्हील्स मसाला 25 ग्राम', 'डायमंड व्हील्स मसाला 25 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 120, 'DMD'),
    ('Diamond Wheels Masala 50g', 'डायमंड व्हील्स मसाला 50 ग्राम', 'डायमंड व्हील्स मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120, 'DMD'),
    ('Diamond Rings Tomato 25g', 'डायमंड रिंग्स टोमैटो 25 ग्राम', 'डायमंड रिंग्ज टोमॅटो 25 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 120, 'DMD'),
    ('Diamond Rings Tomato 50g', 'डायमंड रिंग्स टोमैटो 50 ग्राम', 'डायमंड रिंग्ज टोमॅटो 25 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120, 'DMD'),
    ('Diamond Chulbule Masala 30g', 'डायमंड चुलबुले मसाला 30 ग्राम', 'डायमंड चुलबुले मसाला 30 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 120, 'DMD'),
    ('Diamond Chulbule Masala 65g', 'डायमंड चुलबुले मसाला 65 ग्राम', 'डायमंड चुलबुले मसाला 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120, 'DMD'),
    ('Diamond Aloo Bhujia 65g', 'डायमंड आलू भुजिया 65 ग्राम', 'डायमंड आलू भुजिया 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 150, 'DMD'),
    ('Diamond Aloo Bhujia 200g', 'डायमंड आलू भुजिया 200 ग्राम', 'डायमंड आलू भुजिया 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 36.00, 10.00, 150, 'DMD'),
    ('Diamond Ratlami Sev 65g', 'डायमंड रतलामी सेव 65 ग्राम', 'डायमंड रतलामी शेव 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 150, 'DMD'),
    ('Diamond Khatta Meetha 200g', 'डायमंड खट्टा मीठा 200 ग्राम', 'डायमंड आंबट गोड चिवडा 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 36.00, 10.00, 150, 'DMD'),

    -- 7. CHAKOTE
    ('Chakote Potato Chips Salted 25g', 'चकोते आलू चिप्स साल्टेड 25 ग्राम', 'चकोते बटाटा वेफर्स सॉल्टेड 25 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 120, 'CHK'),
    ('Chakote Potato Chips Salted 50g', 'चकोते आलू चिप्स साल्टेड 50 ग्राम', 'चकोते बटाटा वेफर्स सॉल्टेड 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120, 'CHK'),
    ('Chakote Potato Chips Masala 25g', 'चकोते आलू चिप्स मसाला 25 ग्राम', 'चकोते बटाटा वेफर्स मसाला 25 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 72.00, 18.00, 120, 'CHK'),
    ('Chakote Potato Chips Masala 50g', 'चकोते आलू चिप्स मसाला 50 ग्राम', 'चकोते बटाटा वेफर्स मसाला 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120, 'CHK'),
    ('Chakote Potato Chips Tomato 50g', 'चकोते आलू चिप्स टोमैटो 50 ग्राम', 'चकोते बटाटा वेफर्स टोमॅटो 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 120, 'CHK'),
    ('Chakote Special Bhujia Sev 65g', 'चकोते स्पेशल भुजिया सेव 65 ग्राम', 'चकोते स्पेशल भुजिया शेव 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 150, 'CHK'),
    ('Chakote Special Bhujia Sev 200g', 'चकोते स्पेशल भुजिया सेव 200 ग्राम', 'चकोते स्पेशल भुजिया शेव 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 36.00, 10.00, 150, 'CHK'),
    ('Chakote Mix Farsan Namkeen 200g', 'चकोते मिक्स फरसाण 200 ग्राम', 'चकोते मिक्स फरसाण 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 48.00, 12.00, 150, 'CHK'),
    ('Chakote Bhavnagari Gathiya 200g', 'चकोते भावनगरी गांठिया 200 ग्राम', 'चकोते भावनगरी गाठिया 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 36.00, 10.00, 150, 'CHK'),
    ('Chakote Premium Milk Toast (Rusk) 200g', 'चकोते मिल्क टोस्ट 200 ग्राम', 'चकोते मिल्क टोस्ट 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.00, 35.00, 48.00, 12.00, 180, 'CHK'),
    ('Chakote Premium Elaichi Toast 200g', 'चकोते इलायची टोस्ट 200 ग्राम', 'चकोते वेलची टोस्ट 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.00, 35.00, 36.00, 10.00, 180, 'CHK'),
    ('Chakote Butter Khari 200g', 'चकोते बटर खारी 200 ग्राम', 'चकोते बटर खारी 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.00, 35.00, 48.00, 12.00, 120, 'CHK'),
    ('Chakote Masala Khari 200g', 'चकोते मसाला खारी 200 ग्राम', 'चकोते मसाला खारी 200 ग्रॅम', 'Bakery & Extras', 'Piece', 33.00, 40.00, 36.00, 10.00, 120, 'CHK'),
    ('Chakote Jeera Khari 200g', 'चकोते जीरा खारी 200 ग्राम', 'चकोते जिरे खारी 200 ग्रॅम', 'Bakery & Extras', 'Piece', 33.00, 40.00, 36.00, 10.00, 120, 'CHK'),
    ('Chakote Chocolate Cream Roll', 'चकोते चॉकलेट क्रीम रोल', 'चकोते चॉकलेट क्रीम रोल', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 90, 'CHK'),
    ('Chakote Vanilla Cream Roll', 'चकोते वैनिला क्रीम रोल', 'चकोते व्हॅनिला क्रीम रोल', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 90, 'CHK'),

    -- 8. MOTI
    ('Moti Sabudana Falahari Chiwda 100g', 'मोती साबूदाना फलाहारी चिवड़ा 100 ग्राम', 'मोती साबुदाणा उपवास चिवडा 100 ग्रॅम', 'Bakery & Extras', 'Piece', 20.00, 25.00, 60.00, 15.00, 180, 'MOT'),
    ('Moti Sabudana Falahari Chiwda 200g', 'मोती साबूदाना फलाहारी चिवड़ा 200 ग्राम', 'मोती साबुदाणा उपवास चिवडा 200 ग्रॅम', 'Bakery & Extras', 'Piece', 41.00, 50.00, 48.00, 12.00, 180, 'MOT'),
    ('Moti Sabudana Falahari Chiwda 500g', 'मोती साबूदाना फलाहारी चिवड़ा 500 ग्राम', 'मोती साबुदाणा उपवास चिवडा 500 ग्रॅम', 'Bakery & Extras', 'Piece', 98.00, 120.00, 24.00, 6.00, 180, 'MOT'),
    ('Moti Potato Salli Falahari Chiwda 100g', 'मोती आलू सल्ली फलाहारी चिवड़ा 100 ग्राम', 'मोती बटाटा सल्ली उपवास चिवडा 100 ग्रॅम', 'Bakery & Extras', 'Piece', 24.00, 30.00, 48.00, 12.00, 180, 'MOT'),
    ('Moti Potato Salli Falahari Chiwda 200g', 'मोती आलू सल्ली फलाहारी चिवड़ा 200 ग्राम', 'मोती बटाटा सल्ली उपवास चिवडा 200 ग्रॅम', 'Bakery & Extras', 'Piece', 48.00, 60.00, 36.00, 10.00, 180, 'MOT'),
    ('Moti Makka (Corn) Chiwda 200g', 'मोती मक्का चिवड़ा 200 ग्राम', 'मोती मका चिवडा 200 ग्रॅम', 'Bakery & Extras', 'Piece', 32.00, 40.00, 36.00, 10.00, 180, 'MOT'),
    ('Moti Poha Chiwda 200g', 'मोती पोहा चिवड़ा 200 ग्राम', 'मोती पोहा चिवडा 200 ग्रॅम', 'Bakery & Extras', 'Piece', 32.00, 40.00, 36.00, 10.00, 180, 'MOT'),
    ('Moti Tikha Gathiya 200g', 'मोती तीखा गांठिया 200 ग्राम', 'मोती तिखट गाठिया 200 ग्रॅम', 'Bakery & Extras', 'Piece', 32.00, 40.00, 36.00, 10.00, 180, 'MOT'),
    ('Moti Lasun Sev 200g', 'मोती लहसुन सेव 200 ग्राम', 'मोती लसूण शेव 200 ग्रॅम', 'Bakery & Extras', 'Piece', 32.00, 40.00, 36.00, 10.00, 180, 'MOT'),

    -- 9. BEVERAGES & WATER
    ('Campa Cola 200ml Bottle', 'कैम्पा कोला 200 मिली', 'कॅम्पा कोला 200 मिली', 'Bakery & Extras', 'Piece', 8.20, 10.00, 72.00, 24.00, 180, 'BEV'),
    ('Campa Cola 500ml Pet Bottle', 'कैम्पा कोला 500 मिली', 'कॅम्पा कोला 500 मिली', 'Bakery & Extras', 'Piece', 16.50, 20.00, 48.00, 12.00, 180, 'BEV'),
    ('Campa Cola 2 Litre Pet Bottle', 'कैम्पा कोला 2 लीटर', 'कॅम्पा कोला 2 लिटर', 'Bakery & Extras', 'Piece', 50.00, 60.00, 24.00, 6.00, 180, 'BEV'),
    ('Campa Orange 200ml Bottle', 'कैम्पा ऑरेंज 200 मिली', 'कॅम्पा ऑरेंज 200 मिली', 'Bakery & Extras', 'Piece', 8.20, 10.00, 72.00, 24.00, 180, 'BEV'),
    ('Campa Orange 500ml Pet Bottle', 'कैम्पा ऑरेंज 500 मिली', 'कॅम्पा ऑरेंज 500 मिली', 'Bakery & Extras', 'Piece', 16.50, 20.00, 48.00, 12.00, 180, 'BEV'),
    ('Campa Lemon 200ml Bottle', 'कैम्पा लेमन 200 मिली', 'कॅम्पा लेमन 200 मिली', 'Bakery & Extras', 'Piece', 8.20, 10.00, 72.00, 24.00, 180, 'BEV'),
    ('Campa Lemon 500ml Pet Bottle', 'कैम्पा लेमन 500 मिली', 'कॅम्पा लेमन 500 मिली', 'Bakery & Extras', 'Piece', 16.50, 20.00, 48.00, 12.00, 180, 'BEV'),
    ('Sprite 250ml Pet Bottle', 'स्प्राइट 250 मिली', 'स्प्राइट 250 मिली', 'Bakery & Extras', 'Piece', 16.50, 20.00, 72.00, 24.00, 180, 'BEV'),
    ('Sprite 750ml Pet Bottle', 'स्प्राइट 750 मिली', 'स्प्राइट 750 मिली', 'Bakery & Extras', 'Piece', 33.50, 40.00, 48.00, 12.00, 180, 'BEV'),
    ('Sprite 1.25L Pet Bottle', 'स्प्राइट 1.25 लीटर', 'स्प्राइट 1.25 लिटर', 'Bakery & Extras', 'Piece', 54.00, 65.00, 36.00, 10.00, 180, 'BEV'),
    ('Sprite 2.25L Pet Bottle', 'स्प्राइट 2.25 लीटर', 'स्प्राइट 2.25 लिटर', 'Bakery & Extras', 'Piece', 80.00, 95.00, 24.00, 6.00, 180, 'BEV'),
    ('Thums Up 250ml Pet Bottle', 'थम्स अप 250 मिली', 'थम्स अप 250 मिली', 'Bakery & Extras', 'Piece', 16.50, 20.00, 72.00, 24.00, 180, 'BEV'),
    ('Thums Up 750ml Pet Bottle', 'थम्स अप 750 मिली', 'थम्स अप 750 मिली', 'Bakery & Extras', 'Piece', 33.50, 40.00, 48.00, 12.00, 180, 'BEV'),
    ('Coca Cola 250ml Pet Bottle', 'कोका कोला 250 मिली', 'कोका कोला 250 मिली', 'Bakery & Extras', 'Piece', 16.50, 20.00, 72.00, 24.00, 180, 'BEV'),
    ('Coca Cola 750ml Pet Bottle', 'कोका कोला 750 मिली', 'कोका कोला 750 मिली', 'Bakery & Extras', 'Piece', 33.50, 40.00, 48.00, 12.00, 180, 'BEV'),
    ('Empire Aqua Water 200ml Glass/Pouch', 'एम्पायर एक्वा पानी 200 मिली', 'एम्पायर अ‍ॅक्वा पाणी 200 मिली', 'Bakery & Extras', 'Piece', 3.50, 5.00, 120.00, 40.00, 180, 'BEV'),
    ('Empire Aqua Water 500ml Bottle', 'एम्पायर एक्वा पानी 500 मिली', 'एम्पायर अ‍ॅक्वा पाणी 500 मिली', 'Bakery & Extras', 'Piece', 6.50, 10.00, 96.00, 24.00, 180, 'BEV'),
    ('Empire Aqua Water 1 Litre Bottle', 'एम्पायर एक्वा पानी 1 लीटर', 'एम्पायर अ‍ॅक्वा पाणी 1 लिटर', 'Bakery & Extras', 'Piece', 12.00, 20.00, 72.00, 24.00, 180, 'BEV'),
    ('Empire Aqua Water 20 Litre Jar', 'एम्पायर एक्वा जार 20 लीटर', 'एम्पायर अ‍ॅक्वा जार 20 लिटर', 'Bakery & Extras', 'Piece', 45.00, 70.00, 20.00, 5.00, 60, 'BEV'),
    ('Sunreach Aqua Water 250ml Bottle', 'सनरीच एक्वा पानी 250 मिली', 'सनरीच अ‍ॅक्वा पाणी 250 मिली', 'Bakery & Extras', 'Piece', 4.50, 7.00, 96.00, 24.00, 180, 'BEV'),
    ('Sunreach Aqua Water 500ml Bottle', 'सनरीच एक्वा पानी 500 मिली', 'सनरीच अ‍ॅक्वा पाणी 500 मिली', 'Bakery & Extras', 'Piece', 6.50, 10.00, 96.00, 24.00, 180, 'BEV'),
    ('Sunreach Aqua Water 1 Litre Bottle', 'सनरीच एक्वा पानी 1 लीटर', 'सनरीच अ‍ॅक्वा पाणी 1 लिटर', 'Bakery & Extras', 'Piece', 12.00, 20.00, 72.00, 24.00, 180, 'BEV'),
    ('Sunreach Aqua Water 20 Litre Jar', 'सनरीच एक्वा जार 20 लीटर', 'सनरीच अ‍ॅक्वा जार 20 लिटर', 'Bakery & Extras', 'Piece', 45.00, 70.00, 20.00, 5.00, 60, 'BEV'),

    -- 10. DAIRY POWER
    ('Dairy Power Toned Milk 500ml', 'डेयरी पावर टोन्ड दूध 500 मिली', 'डेअरी पॉवर टोन्ड दूध 500 मिली', 'Milk', 'Packet (500ml)', 25.00, 28.00, 60.00, 20.00, 2, 'DPR'),
    ('Dairy Power Toned Milk 1L', 'डेयरी पावर टोन्ड दूध 1 लीटर', 'डेअरी पॉवर टोन्ड दूध 1 लिटर', 'Milk', 'Packet (1L)', 50.00, 55.00, 40.00, 15.00, 2, 'DPR'),
    ('Dairy Power Standardized Milk 500ml', 'डेयरी पावर स्टैंडर्ड दूध 500 मिली', 'डेअरी पॉवर स्टँडर्ड दूध 500 मिली', 'Milk', 'Packet (500ml)', 27.00, 30.00, 50.00, 15.00, 2, 'DPR'),
    ('Dairy Power Full Cream Milk 500ml', 'डेयरी पावर फुल क्रीम दूध 500 मिली', 'डेअरी पॉवर फुल क्रीम दूध 500 मिली', 'Milk', 'Packet (500ml)', 31.50, 35.00, 60.00, 20.00, 2, 'DPR'),
    ('Dairy Power Full Cream Milk 1L', 'डेयरी पावर फुल क्रीम दूध 1 लीटर', 'डेअरी पॉवर फुल क्रीम दूध 1 लिटर', 'Milk', 'Packet (1L)', 62.00, 68.00, 40.00, 15.00, 2, 'DPR'),
    ('Dairy Power Cow Milk 500ml', 'डेयरी पावर गाय का दूध 500 मिली', 'डेअरी पॉवर गाईचे दूध 500 मिली', 'Milk', 'Packet (500ml)', 26.00, 29.00, 50.00, 15.00, 2, 'DPR'),
    ('Dairy Power Fresh Curd (Dahi) 200g Cup', 'डेयरी पावर ताजा दही 200 ग्राम', 'डेअरी पॉवर ताजे दही 200 ग्रॅम', 'Curd & Chaas', 'Piece', 16.50, 20.00, 48.00, 12.00, 7, 'DPR'),
    ('Dairy Power Fresh Curd (Dahi) 400g Pouch', 'डेयरी पावर ताजा दही 400 ग्राम', 'डेअरी पॉवर ताजे दही 400 ग्रॅम', 'Curd & Chaas', 'Piece', 29.50, 35.00, 36.00, 10.00, 7, 'DPR'),
    ('Dairy Power Spiced Masala Chaas 200ml', 'डेयरी पावर मसाला छाछ 200 मिली', 'डेअरी पॉवर मसाला ताक 200 मिली', 'Curd & Chaas', 'Piece', 9.50, 12.00, 60.00, 15.00, 5, 'DPR'),
    ('Dairy Power Sweet Lassi 200ml Cup', 'डेयरी पावर मीठी लस्सी 200 मिली', 'डेअरी पॉवर गोड लस्सी 200 मिली', 'Curd & Chaas', 'Piece', 16.00, 20.00, 48.00, 12.00, 7, 'DPR'),
    ('Dairy Power Fresh Malai Paneer 200g', 'डेयरी पावर मलाई पनीर 200 ग्राम', 'डेअरी पॉवर मलाई पनीर 200 ग्रॅम', 'Paneer & Butter', 'Piece', 76.00, 90.00, 40.00, 10.00, 10, 'DPR'),
    ('Dairy Power Fresh Malai Paneer 1kg Block', 'डेयरी पावर मलाई पनीर 1 किग्रा', 'डेअरी पॉवर मलाई पनीर 1 किलो', 'Paneer & Butter', 'Kg', 360.00, 420.00, 15.00, 5.00, 10, 'DPR'),
    ('Dairy Power Pure Cow Ghee 500ml Pouch', 'डेयरी पावर शुद्ध गाय घी 500 मिली', 'डेअरी पॉवर शुद्ध गाईचे तूप 500 मिली', 'Ghee', 'Piece', 295.00, 340.00, 24.00, 6.00, 270, 'DPR'),
    ('Dairy Power Pure Cow Ghee 1L Jar', 'डेयरी पावर शुद्ध गाय घी 1 लीटर', 'डेअरी पॉवर शुद्ध गाईचे तूप 1 लिटर', 'Ghee', 'Piece', 580.00, 670.00, 18.00, 4.00, 270, 'DPR'),
    ('Dairy Power Pure Buffalo Ghee 500ml', 'डेयरी पावर शुद्ध भैंस घी 500 मिली', 'डेअरी पॉवर शुद्ध म्हशीचे तूप 500 मिली', 'Ghee', 'Piece', 310.00, 360.00, 24.00, 6.00, 270, 'DPR'),
    ('Dairy Power Pure Buffalo Ghee 1L Jar', 'डेयरी पावर शुद्ध भैंस घी 1 लीटर', 'डेअरी पॉवर शुद्ध म्हशीचे तूप 1 लिटर', 'Ghee', 'Piece', 615.00, 710.00, 18.00, 4.00, 270, 'DPR'),
    ('Dairy Power Elaichi Shrikhand 250g', 'डेयरी पावर इलायची श्रीखंड 250 ग्राम', 'डेअरी पॉवर वेलची श्रीखंड 250 ग्रॅम', 'Sweets/Mithai', 'Piece', 54.00, 65.00, 36.00, 10.00, 30, 'DPR'),
    ('Dairy Power Elaichi Shrikhand 500g', 'डेयरी पावर इलायची श्रीखंड 500 ग्राम', 'डेअरी पॉवर वेलची श्रीखंड 500 ग्रॅम', 'Sweets/Mithai', 'Piece', 105.00, 125.00, 24.00, 6.00, 30, 'DPR'),
    ('Dairy Power Mango Amrakhand 250g', 'डेयरी पावर मैंगो आम्रखंड 250 ग्राम', 'डेअरी पॉवर मँगो आम्रखंड 250 ग्रॅम', 'Sweets/Mithai', 'Piece', 58.00, 70.00, 36.00, 10.00, 30, 'DPR'),
    ('Dairy Power Mango Amrakhand 500g', 'डेयरी पावर मैंगो आम्रखंड 500 ग्राम', 'डेअरी पॉवर मँगो आम्रखंड 500 ग्रॅम', 'Sweets/Mithai', 'Piece', 112.00, 135.00, 24.00, 6.00, 30, 'DPR'),

    -- 11. NESTLE
    ('Maggi 2-Minute Masala Noodles 70g', 'मैगी 2-मिनट मसाला नूडल्स 70 ग्राम', 'मॅगी 2-मिनिट मसाला नूडल्स 70 ग्रॅम', 'Bakery & Extras', 'Piece', 11.80, 14.00, 144.00, 36.00, 240, 'NST'),
    ('Maggi 2-Minute Masala Noodles 140g', 'मैगी 2-मिनट मसाला नूडल्स 140 ग्राम', 'मॅगी 2-मिनिट मसाला नूडल्स 140 ग्रॅम', 'Bakery & Extras', 'Piece', 23.80, 28.00, 72.00, 18.00, 240, 'NST'),
    ('Maggi 2-Minute Masala Noodles 280g (4 Pcs)', 'मैगी 4-पैक 280 ग्राम', 'मॅगी 4-पॅक 280 ग्रॅम', 'Bakery & Extras', 'Piece', 47.50, 56.00, 48.00, 12.00, 240, 'NST'),
    ('Maggi 2-Minute Masala Noodles 560g (8 Pcs)', 'मैगी 8-पैक 560 ग्राम', 'मॅगी 8-पॅक 560 ग्रॅम', 'Bakery & Extras', 'Piece', 93.50, 110.00, 36.00, 10.00, 240, 'NST'),
    ('Maggi 2-Minute Special Masala Noodles 70g', 'मैगी स्पेशल मसाला नूडल्स 70 ग्राम', 'मॅगी स्पेशल मसाला नूडल्स 70 ग्रॅम', 'Bakery & Extras', 'Piece', 15.00, 18.00, 72.00, 18.00, 240, 'NST'),
    ('Maggi Masala-e-Magic Seasoning 6g Sachet', 'मैगी मसाला-ए-मैजिक 6 ग्राम', 'मॅगी मसाला-ए-मॅजिक 6 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 120.00, 30.00, 365, 'NST'),
    ('Maggi Masala-e-Magic Pack (10 Sachets)', 'मैगी मसाला-ए-मैजिक 10 पैकेट', 'मॅगी मसाला-ए-मॅजिक 10 पाकीट', 'Bakery & Extras', 'Piece', 42.00, 50.00, 36.00, 10.00, 365, 'NST'),
    ('Maggi Rich Tomato Ketchup 500g Bottle', 'मैगी टोमैटो केचप 500 ग्राम', 'मॅगी टोमॅटो केचप 500 ग्रॅम', 'Bakery & Extras', 'Piece', 95.00, 115.00, 36.00, 10.00, 365, 'NST'),
    ('Maggi Hot & Sweet Chilli Sauce 500g Bottle', 'मैगी हॉट एंड स्वीट सॉस 500 ग्राम', 'मॅगी हॉट अँड स्वीट सॉस 500 ग्रॅम', 'Bakery & Extras', 'Piece', 102.00, 125.00, 36.00, 10.00, 365, 'NST'),
    ('Maggi Rich Tomato Sauce 90g Pouch', 'मैगी टोमैटो सॉस पाउच 90 ग्राम', 'मॅगी टोमॅटो सॉस पाऊच 90 ग्रॅम', 'Bakery & Extras', 'Piece', 12.50, 15.00, 48.00, 12.00, 365, 'NST'),
    ('Nestle KitKat 2 Finger Chocolate 12.8g', 'नेस्ले किटकैट 12.8 ग्राम', 'नेस्ले किटकॅट 12.8 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 96.00, 24.00, 365, 'NST'),
    ('Nestle KitKat 2 Finger Chocolate 27.5g', 'नेस्ले किटकैट 27.5 ग्राम', 'नेस्ले किटकॅट 27.5 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 72.00, 18.00, 365, 'NST'),
    ('Nestle KitKat 4 Finger Chocolate 37.3g', 'नेस्ले किटकैट 4 फिंगर 37.3 ग्राम', 'नेस्ले किटकॅट 4 फिंगर 37.3 ग्रॅम', 'Bakery & Extras', 'Piece', 25.00, 30.00, 48.00, 12.00, 365, 'NST'),
    ('Nestle KitKat Chunky 40g', 'नेस्ले किटकैट चंकी 40 ग्राम', 'नेस्ले किटकॅट चंकी 40 ग्रॅम', 'Bakery & Extras', 'Piece', 33.50, 40.00, 36.00, 10.00, 365, 'NST'),
    ('Nestle KitKat Dessert Delight 50g', 'नेस्ले किटकैट डेजर्ट डिलाइट 50 ग्राम', 'नेस्ले किटकॅट डेझर्ट डिलाईट 50 ग्रॅम', 'Bakery & Extras', 'Piece', 50.00, 60.00, 36.00, 10.00, 365, 'NST'),
    ('Nestle Munch Chocolate Wafer 10.1g', 'नेस्ले मंच चॉकलेट वेफर 10.1 ग्राम', 'नेस्ले मंच चॉकलेट वेफर 10.1 ग्रॅम', 'Bakery & Extras', 'Piece', 4.20, 5.00, 120.00, 30.00, 270, 'NST'),
    ('Nestle Munch Chocolate Wafer 18g', 'नेस्ले मंच चॉकलेट वेफर 18 ग्राम', 'नेस्ले मंच चॉकलेट वेफर 18 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 96.00, 24.00, 270, 'NST'),
    ('Nestle Munch Max Wafer 32g', 'नेस्ले मंच मैक्स 32 ग्राम', 'नेस्ले मंच मॅक्स 32 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 60.00, 15.00, 270, 'NST'),
    ('Nestle Munch Nuts Bar 32g', 'नेस्ले मंच नट्स बार 32 ग्राम', 'नेस्ले मंच नट्स बार 32 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 60.00, 15.00, 270, 'NST'),
    ('Nestle Milkybar White Chocolate 12.5g', 'नेस्ले मिल्कीबार 12.5 ग्राम', 'नेस्ले मिल्कीबार 12.5 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 96.00, 24.00, 365, 'NST'),
    ('Nestle Milkybar White Chocolate 25g', 'नेस्ले मिल्कीबार 25 ग्राम', 'नेस्ले मिल्कीबार 25 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 72.00, 18.00, 365, 'NST'),
    ('Nescafe Classic Coffee 25g Pouch', 'नेस्कैफे क्लासिक कॉफी 25 ग्राम', 'नेस्कॅफे क्लासिक कॉफी 25 ग्रॅम', 'Bakery & Extras', 'Piece', 54.00, 65.00, 48.00, 12.00, 365, 'NST'),
    ('Nescafe Classic Coffee 50g Glass Jar', 'नेस्कैफे क्लासिक कॉफी 50 ग्राम जार', 'नेस्कॅफे क्लासिक कॉफी 50 ग्रॅम बरणी', 'Bakery & Extras', 'Piece', 138.00, 165.00, 24.00, 6.00, 365, 'NST'),
    ('Nescafe Classic Coffee 100g Glass Jar', 'नेस्कैफे क्लासिक कॉफी 100 ग्राम जार', 'नेस्कॅफे क्लासिक कॉफी 100 ग्रॅम बरणी', 'Bakery & Extras', 'Piece', 270.00, 320.00, 18.00, 4.00, 365, 'NST'),
    ('Nescafe Sunrise Coffee Mix 50g Pouch', 'नेस्कैफे सनराइज 50 ग्राम', 'नेस्कॅफे सनराईज 50 ग्रॅम', 'Bakery & Extras', 'Piece', 62.00, 75.00, 36.00, 10.00, 365, 'NST'),
    ('Nestle Everyday Dairy Whitener 200g Pouch', 'नेस्ले एवरीडे डेयरी व्हाइटनर 200 ग्राम', 'नेस्ले एव्हरीडे डेअरी व्हाईटनर 200 ग्रॅम', 'Bakery & Extras', 'Piece', 72.00, 85.00, 36.00, 10.00, 270, 'NST'),
    ('Nestle Everyday Dairy Whitener 400g Pouch', 'नेस्ले एवरीडे डेयरी व्हाइटनर 400 ग्राम', 'नेस्ले एव्हरीडे डेअरी व्हाईटनर 400 ग्रॅम', 'Bakery & Extras', 'Piece', 140.00, 165.00, 24.00, 6.00, 270, 'NST'),
    ('Nestle Everyday Dairy Whitener 1kg Pouch', 'नेस्ले एवरीडे डेयरी व्हाइटनर 1 किग्रा', 'नेस्ले एव्हरीडे डेअरी व्हाईटनर 1 किलो', 'Bakery & Extras', 'Piece', 340.00, 395.00, 18.00, 5.00, 270, 'NST'),
    ('Nestle Milkmaid Condensed Milk 400g Tin', 'नेस्ले मिल्कमेड 400 ग्राम टिन', 'नेस्ले मिल्कमेड 400 ग्रॅम टिन', 'Bakery & Extras', 'Piece', 122.00, 145.00, 36.00, 10.00, 365, 'NST');

    -- Insert or Update loop
    FOR rec IN SELECT * FROM tmp_master_items LOOP
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
            v_batch_no := rec.batch_prefix || '-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');
            INSERT INTO public.batches (
                id, product_id, product_name, batch_no, mfg_date, expiry_date,
                qty_received, qty_remaining, purchase_price, selling_price, status, notes
            ) VALUES (
                gen_random_uuid(), v_prod_id, rec.name, v_batch_no, v_today,
                v_today + (rec.shelf_life_days || ' days')::INTERVAL,
                rec.stock_quantity, rec.stock_quantity, rec.purchase_price, rec.selling_price, 'ACTIVE', 'Master FMCG Inward'
            );
        END IF;
    END LOOP;
END $$;

-- Summary counts by brand group
SELECT 
    CASE 
        WHEN name ILIKE '%Balaji%' THEN 'Balaji Wafers & Namkeen'
        WHEN name ILIKE '%Temptin%' THEN 'Temptin Sauces'
        WHEN name ILIKE '%Rambandhu%' THEN 'Rambandhu Masala & Pickles'
        WHEN name ILIKE '%Suhana%' THEN 'Suhana Spices & Masala'
        WHEN name ILIKE '%Malkist%' OR name ILIKE '%Biscott%' THEN 'Mayora Malkist & Unibic Biscott'
        WHEN name ILIKE '%Diamond%' THEN 'Diamond Wafers'
        WHEN name ILIKE '%Chakote%' THEN 'Chakote Bakery & Wafers'
        WHEN name ILIKE '%Moti%' THEN 'Moti Namkeen & Chiwda'
        WHEN name ILIKE '%Campa%' OR name ILIKE '%Sprite%' OR name ILIKE '%Thums Up%' OR name ILIKE '%Coca Cola%' OR name ILIKE '%Aqua%' THEN 'Beverages & Aqua'
        WHEN name ILIKE '%Dairy Power%' THEN 'Dairy Power Fresh Dairy'
        WHEN name ILIKE '%Nestle%' OR name ILIKE '%Maggi%' OR name ILIKE '%Nescafe%' THEN 'Nestle Products'
        ELSE 'Other'
    END AS brand_group,
    COUNT(*) AS total_skus,
    SUM(stock_quantity) AS total_units_in_stock,
    SUM(stock_quantity * purchase_price) AS total_inventory_valuation_rs
FROM public.products
WHERE name ILIKE '%Balaji%' 
   OR name ILIKE '%Temptin%'
   OR name ILIKE '%Rambandhu%'
   OR name ILIKE '%Suhana%'
   OR name ILIKE '%Malkist%'
   OR name ILIKE '%Biscott%'
   OR name ILIKE '%Diamond%'
   OR name ILIKE '%Chakote%'
   OR name ILIKE '%Moti%'
   OR name ILIKE '%Campa%'
   OR name ILIKE '%Sprite%'
   OR name ILIKE '%Thums Up%'
   OR name ILIKE '%Coca Cola%'
   OR name ILIKE '%Empire Aqua%'
   OR name ILIKE '%Sunreach Aqua%'
   OR name ILIKE '%Dairy Power%'
   OR name ILIKE '%Nestle%'
   OR name ILIKE '%Maggi%'
   OR name ILIKE '%Nescafe%'
GROUP BY 1
ORDER BY total_skus DESC;

