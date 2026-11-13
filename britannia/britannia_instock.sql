-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - BRITANNIA, OREO & UNIBIC IN-STOCK SETUP
-- PHASE 36: BRITANNIA (GOOD DAY, JIM-JAM, NUTRICHIOICE, MILK BIKIS, MARIE GOLD,
--           50-50, LITTLE HEARTS, BOURBON, RUSK, CAKE), CADBURY OREO & UNIBIC (57 PRODUCTS)
-- File: britannia/britannia_instock.sql
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

-- STEP 2: Insert or Update Britannia, Oreo & Unibic Products and Register Inward Batches
DO $$
DECLARE
    v_prod_id UUID;
    v_batch_no VARCHAR(100);
    v_today DATE := CURRENT_DATE;
    rec RECORD;
BEGIN
    -- Temporary table holding Britannia, Oreo & Unibic items
    CREATE TEMP TABLE tmp_britannia_items (
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

    INSERT INTO tmp_britannia_items VALUES
    -- 1. BRITANNIA GOOD DAY
    ('Britannia Good Day Butter Cookies 65g', 'ब्रिटानिया गुड डे बटर कुकीज 65 ग्राम', 'ब्रिटानिया गुड डे बटर कुकीज 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 72.00, 18.00, 180),
    ('Britannia Good Day Butter Cookies 120g', 'ब्रिटानिया गुड डे बटर कुकीज 120 ग्राम', 'ब्रिटानिया गुड डे बटर कुकीज 120 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 48.00, 12.00, 180),
    ('Britannia Good Day Butter Cookies 200g', 'ब्रिटानिया गुड डे बटर कुकीज 200 ग्राम', 'ब्रिटानिया गुड डे बटर कुकीज 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.00, 35.00, 36.00, 10.00, 180),
    ('Britannia Good Day Cashew Cookies 60g', 'ब्रिटानिया गुड डे काजू कुकीज 60 ग्राम', 'ब्रिटानिया गुड डे काजू कुकीज 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 72.00, 18.00, 180),
    ('Britannia Good Day Cashew Cookies 120g', 'ब्रिटानिया गुड डे काजू कुकीज 120 ग्राम', 'ब्रिटानिया गुड डे काजू कुकीज 120 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 48.00, 12.00, 180),
    ('Britannia Good Day Cashew Cookies 200g', 'ब्रिटानिया गुड डे काजू कुकीज 200 ग्राम', 'ब्रिटानिया गुड डे काजू कुकीज 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.00, 35.00, 36.00, 10.00, 180),
    ('Britannia Good Day Pista Badam Cookies 60g', 'ब्रिटानिया गुड डे पिस्ता बादाम कुकीज 60 ग्राम', 'ब्रिटानिया गुड डे पिस्ता बदाम कुकीज 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 180),
    ('Britannia Good Day Pista Badam Cookies 120g', 'ब्रिटानिया गुड डे पिस्ता बादाम कुकीज 120 ग्राम', 'ब्रिटानिया गुड डे पिस्ता बदाम कुकीज 120 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 36.00, 10.00, 180),
    ('Britannia Good Day Choco Chip Cookies 100g', 'ब्रिटानिया गुड डे चोको चिप कुकीज 100 ग्राम', 'ब्रिटानिया गुड डे चोको चिप कुकीज 100 ग्रॅम', 'Bakery & Extras', 'Piece', 25.00, 30.00, 36.00, 10.00, 180),
    ('Britannia Good Day Harmony Cookies 100g', 'ब्रिटानिया गुड डे हार्मनी कुकीज 100 ग्राम', 'ब्रिटानिया गुड डे हार्मनी कुकीज 100 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 36.00, 10.00, 180),

    -- 2. BRITANNIA TREAT & JIM-JAM
    ('Britannia Treat Jim Jam Biscuits 60g', 'ब्रिटानिया ट्रीट जिम जैम बिस्कुट 60 ग्राम', 'ब्रिटानिया ट्रीट जिम जॅम बिस्कीट 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 72.00, 18.00, 180),
    ('Britannia Treat Jim Jam Biscuits 138g', 'ब्रिटानिया ट्रीट जिम जैम बिस्कुट 138 ग्राम', 'ब्रिटानिया ट्रीट जिम जॅम बिस्कीट 138 ग्रॅम', 'Bakery & Extras', 'Piece', 29.00, 35.00, 48.00, 12.00, 180),
    ('Britannia Treat Jim Jam Biscuits 200g', 'ब्रिटानिया ट्रीट जिम जैम बिस्कुट 200 ग्राम', 'ब्रिटानिया ट्रीट जिम जॅम बिस्कीट 200 ग्रॅम', 'Bakery & Extras', 'Piece', 42.00, 50.00, 36.00, 10.00, 180),
    ('Britannia Treat Chocolate Cream Biscuits 60g', 'ब्रिटानिया ट्रीट चॉकलेट क्रीम 60 ग्राम', 'ब्रिटानिया ट्रीट चॉकलेट क्रीम 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 180),
    ('Britannia Treat Strawberry Cream Biscuits 60g', 'ब्रिटानिया ट्रीट स्ट्रॉबेरी क्रीम 60 ग्राम', 'ब्रिटानिया ट्रीट स्ट्रॉबेरी क्रीम 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 180),
    ('Britannia Treat Vanilla Cream Biscuits 60g', 'ब्रिटानिया ट्रीट वैनिला क्रीम 60 ग्राम', 'ब्रिटानिया ट्रीट व्हॅनिला क्रीम 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 180),
    ('Britannia Treat Pineapple Cream Biscuits 60g', 'ब्रिटानिया ट्रीट पाइनएप्पल क्रीम 60 ग्राम', 'ब्रिटानिया ट्रीट अननस क्रीम 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 180),

    -- 3. BRITANNIA NUTRICHIOICE
    ('Britannia NutriChoice Digestive Biscuits 100g', 'ब्रिटानिया न्यूट्रीचॉइस डाइजेस्टिव 100 ग्राम', 'ब्रिटानिया न्यूट्रीचॉईस डायजेस्टिव्ह 100 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 48.00, 12.00, 180),
    ('Britannia NutriChoice Digestive Biscuits 250g', 'ब्रिटानिया न्यूट्रीचॉइस डाइजेस्टिव 250 ग्राम', 'ब्रिटानिया न्यूट्रीचॉईस डायजेस्टिव्ह 250 ग्रॅम', 'Bakery & Extras', 'Piece', 46.00, 55.00, 36.00, 10.00, 180),
    ('Britannia NutriChoice 5 Grain Digestive 100g', 'ब्रिटानिया न्यूट्रीचॉइस 5 ग्रेन डाइजेस्टिव 100 ग्राम', 'ब्रिटानिया न्यूट्रीचॉईस 5 ग्रेन डायजेस्टिव्ह 100 ग्रॅम', 'Bakery & Extras', 'Piece', 25.00, 30.00, 36.00, 10.00, 180),
    ('Britannia NutriChoice Oats Biscuits 100g', 'ब्रिटानिया न्यूट्रीचॉइस ओट्स बिस्कुट 100 ग्राम', 'ब्रिटानिया न्यूट्रीचॉईस ओट्स बिस्कीट 100 ग्रॅम', 'Bakery & Extras', 'Piece', 25.00, 30.00, 36.00, 10.00, 180),
    ('Britannia NutriChoice Sugar Free Cream Cracker 100g', 'ब्रिटानिया न्यूट्रीचॉइस शुगर फ्री क्रैकर 100 ग्राम', 'ब्रिटानिया न्यूट्रीचॉईस साखर विरहित क्रॅकर 100 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 36.00, 10.00, 180),
    ('Britannia NutriChoice Sugar Free Cream Cracker 300g', 'ब्रिटानिया न्यूट्रीचॉइस शुगर फ्री क्रैकर 300 ग्राम', 'ब्रिटानिया न्यूट्रीचॉईस साखर विरहित क्रॅकर 300 ग्रॅम', 'Bakery & Extras', 'Piece', 50.00, 60.00, 24.00, 8.00, 180),
    ('Britannia NutriChoice Herbs Cream Cracker 100g', 'ब्रिटानिया न्यूट्रीचॉइस हर्ब्स क्रैकर 100 ग्राम', 'ब्रिटानिया न्यूट्रीचॉईस हर्ब्स क्रॅकर 100 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 36.00, 10.00, 180),

    -- 4. BRITANNIA MILK BIKIS
    ('Britannia Milk Bikis Biscuits 65g', 'ब्रिटानिया मिल्क बिकिस 65 ग्राम', 'ब्रिटानिया मिल्क बिकीस 65 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 72.00, 18.00, 180),
    ('Britannia Milk Bikis Biscuits 130g', 'ब्रिटानिया मिल्क बिकिस 130 ग्राम', 'ब्रिटानिया मिल्क बिकीस 130 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 48.00, 12.00, 180),
    ('Britannia Milk Bikis Classic 200g', 'ब्रिटानिया मिल्क बिकिस क्लासिक 200 ग्राम', 'ब्रिटानिया मिल्क बिकीस क्लासिक 200 ग्रॅम', 'Bakery & Extras', 'Piece', 25.00, 30.00, 36.00, 10.00, 180),

    -- 5. BRITANNIA MARIE GOLD
    ('Britannia Marie Gold Biscuits 89g', 'ब्रिटानिया मैरी गोल्ड 89 ग्राम', 'ब्रिटानिया मेरी गोल्ड 89 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 72.00, 18.00, 180),
    ('Britannia Marie Gold Biscuits 175g', 'ब्रिटानिया मैरी गोल्ड 175 ग्राम', 'ब्रिटानिया मेरी गोल्ड 175 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 60.00, 15.00, 180),
    ('Britannia Marie Gold Biscuits 300g', 'ब्रिटानिया मैरी गोल्ड 300 ग्राम', 'ब्रिटानिया मेरी गोल्ड 300 ग्रॅम', 'Bakery & Extras', 'Piece', 29.50, 35.00, 48.00, 12.00, 180),
    ('Britannia Marie Gold Biscuits 1kg', 'ब्रिटानिया मैरी गोल्ड 1 किग्रा', 'ब्रिटानिया मेरी गोल्ड 1 किलो', 'Bakery & Extras', 'Piece', 94.00, 110.00, 20.00, 5.00, 180),

    -- 6. BRITANNIA 50-50 & LITTLE HEARTS
    ('Britannia 50-50 Maska Chaska 50g', 'ब्रिटानिया 50-50 मस्का चस्का 50 ग्राम', 'ब्रिटानिया 50-50 मस्का चस्का 50 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 72.00, 18.00, 180),
    ('Britannia 50-50 Maska Chaska 120g', 'ब्रिटानिया 50-50 मस्का चस्का 120 ग्राम', 'ब्रिटानिया 50-50 मस्का चस्का 120 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 48.00, 12.00, 180),
    ('Britannia 50-50 Sweet & Salty 60g', 'ब्रिटानिया 50-50 स्वीट एंड साल्टी 60 ग्राम', 'ब्रिटानिया 50-50 गोड आणि खारट 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 72.00, 18.00, 180),
    ('Britannia 50-50 Golmaal Biscuits 60g', 'ब्रिटानिया 50-50 गोलमाल 60 ग्राम', 'ब्रिटानिया 50-50 गोलमाल 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 48.00, 12.00, 180),
    ('Britannia Little Hearts Classic 34.5g', 'ब्रिटानिया लिटिल हार्ट्स 34.5 ग्राम', 'ब्रिटानिया लिटल हार्ट्स 34.5 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 72.00, 18.00, 180),
    ('Britannia Little Hearts Classic 75g', 'ब्रिटानिया लिटिल हार्ट्स 75 ग्राम', 'ब्रिटानिया लिटल हार्ट्स 75 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 48.00, 12.00, 180),

    -- 7. BRITANNIA BOURBON, NICE TIME & PURE MAGIC
    ('Britannia Bourbon Chocolate Cream 60g', 'ब्रिटानिया बॉर्बन चॉकलेट क्रीम 60 ग्राम', 'ब्रिटानिया बॉर्बन चॉकलेट क्रीम 60 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 180),
    ('Britannia Bourbon Chocolate Cream 150g', 'ब्रिटानिया बॉर्बन चॉकलेट क्रीम 150 ग्राम', 'ब्रिटानिया बॉर्बन चॉकलेट क्रीम 150 ग्रॅम', 'Bakery & Extras', 'Piece', 21.00, 25.00, 48.00, 12.00, 180),
    ('Britannia Bourbon Chocolate Cream 250g', 'ब्रिटानिया बॉर्बन चॉकलेट क्रीम 250 ग्राम', 'ब्रिटानिया बॉर्बन चॉकलेट क्रीम 250 ग्रॅम', 'Bakery & Extras', 'Piece', 34.00, 40.00, 36.00, 10.00, 180),
    ('Britannia Nice Time Coconut Biscuits 73g', 'ब्रिटानिया नाइस टाइम कोकोनट 73 ग्राम', 'ब्रिटानिया नाईस टाईम नारळ बिस्कीट 73 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 180),
    ('Britannia Nice Time Coconut Biscuits 150g', 'ब्रिटानिया नाइस टाइम कोकोनट 150 ग्राम', 'ब्रिटानिया नाईस टाईम नारळ बिस्कीट 150 ग्रॅम', 'Bakery & Extras', 'Piece', 16.80, 20.00, 48.00, 12.00, 180),
    ('Britannia Pure Magic Choco Lush 75g', 'ब्रिटानिया प्योर मैजिक चोको लश 75 ग्राम', 'ब्रिटानिया प्युअर मॅजिक चोको लश 75 ग्रॅम', 'Bakery & Extras', 'Piece', 25.00, 30.00, 36.00, 10.00, 180),

    -- 8. BRITANNIA TOASTEA RUSKS & CAKES
    ('Britannia Toastea Premium Bake Rusk 200g', 'ब्रिटानिया टोस्टी प्रीमियम बेक रस्क 200 ग्राम', 'ब्रिटानिया टोस्टी प्रीमियम बेक टोस्ट 200 ग्रॅम', 'Bakery & Extras', 'Piece', 29.00, 35.00, 48.00, 12.00, 180),
    ('Britannia Toastea Premium Bake Rusk 400g', 'ब्रिटानिया टोस्टी प्रीमियम बेक रस्क 400 ग्राम', 'ब्रिटानिया टोस्टी प्रीमियम बेक टोस्ट 400 ग्रॅम', 'Bakery & Extras', 'Piece', 54.00, 65.00, 36.00, 10.00, 180),
    ('Britannia Toastea Milk Rusk 182g', 'ब्रिटानिया टोस्टी मिल्क रस्क 182 ग्राम', 'ब्रिटानिया टोस्टी मिल्क टोस्ट 182 ग्रॅम', 'Bakery & Extras', 'Piece', 29.00, 35.00, 36.00, 10.00, 180),
    ('Britannia Toastea Elaichi Rusk 182g', 'ब्रिटानिया टोस्टी इलायची रस्क 182 ग्राम', 'ब्रिटानिया टोस्टी वेलची टोस्ट 182 ग्रॅम', 'Bakery & Extras', 'Piece', 29.00, 35.00, 36.00, 10.00, 180),
    ('Britannia Fruit Cake 120g', 'ब्रिटानिया फ्रूट केक 120 ग्राम', 'ब्रिटानिया फ्रूट केक 120 ग्रॅम', 'Bakery & Extras', 'Piece', 25.00, 30.00, 36.00, 10.00, 90),
    ('Britannia Chocolate Cake 120g', 'ब्रिटानिया चॉकलेट केक 120 ग्राम', 'ब्रिटानिया चॉकलेट केक 120 ग्रॅम', 'Bakery & Extras', 'Piece', 25.00, 30.00, 36.00, 10.00, 90),

    -- 9. CADBURY OREO BISCUITS
    ('Cadbury Oreo Original Vanilla Cream 46g', 'कैडबरी ओरियो ओरिजिनल वैनिला क्रीम 46 ग्राम', 'कॅडबरी ओरिओ ओरिजिनल व्हॅनिला क्रीम 46 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 72.00, 18.00, 180),
    ('Cadbury Oreo Original Vanilla Cream 120g', 'कैडबरी ओरियो ओरिजिनल वैनिला क्रीम 120 ग्राम', 'कॅडबरी ओरिओ ओरिजिनल व्हॅनिला क्रीम 120 ग्रॅम', 'Bakery & Extras', 'Piece', 25.00, 30.00, 60.00, 15.00, 180),
    ('Cadbury Oreo Original Vanilla Cream 288g', 'कैडबरी ओरियो ओरिजिनल वैनिला क्रीम 288 ग्राम', 'कॅडबरी ओरिओ ओरिजिनल व्हॅनिला क्रीम 288 ग्रॅम', 'Bakery & Extras', 'Piece', 58.00, 70.00, 36.00, 10.00, 180),
    ('Cadbury Oreo Chocolate Cream 46g', 'कैडबरी ओरियो चॉकलेट क्रीम 46 ग्राम', 'कॅडबरी ओरिओ चॉकलेट क्रीम 46 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 180),
    ('Cadbury Oreo Chocolate Cream 120g', 'कैडबरी ओरियो चॉकलेट क्रीम 120 ग्राम', 'कॅडबरी ओरिओ चॉकलेट क्रीम 120 ग्रॅम', 'Bakery & Extras', 'Piece', 25.00, 30.00, 48.00, 12.00, 180),
    ('Cadbury Oreo Strawberry Cream 46g', 'कैडबरी ओरियो स्ट्रॉबेरी क्रीम 46 ग्राम', 'कॅडबरी ओरिओ स्ट्रॉबेरी क्रीम 46 ग्रॅम', 'Bakery & Extras', 'Piece', 8.50, 10.00, 60.00, 15.00, 180),
    ('Cadbury Oreo Strawberry Cream 120g', 'कैडबरी ओरियो स्ट्रॉबेरी क्रीम 120 ग्राम', 'कॅडबरी ओरिओ स्ट्रॉबेरी क्रीम 120 ग्रॅम', 'Bakery & Extras', 'Piece', 25.00, 30.00, 48.00, 12.00, 180),
    ('Cadbury Oreo Golden Vanilla Cream 120g', 'कैडबरी ओरियो गोल्डन वैनिला 120 ग्राम', 'कॅडबरी ओरिओ गोल्डन व्हॅनिला 120 ग्रॅम', 'Bakery & Extras', 'Piece', 29.00, 35.00, 36.00, 10.00, 180),
    ('Cadbury Oreo Red Velvet 120g', 'कैडबरी ओरियो रेड वेलवेट 120 ग्राम', 'कॅडबरी ओरिओ रेड व्हेलव्हेट 120 ग्रॅम', 'Bakery & Extras', 'Piece', 33.00, 40.00, 36.00, 10.00, 180),

    -- 10. UNIBIC COOKIES & CRACKERS
    ('Unibic Choco Chip Cookies 75g', 'यूनिबिक चोको चिप कुकीज 75 ग्राम', 'युनिबिक चोको चिप कुकीज 75 ग्रॅम', 'Bakery & Extras', 'Piece', 16.50, 20.00, 48.00, 12.00, 180),
    ('Unibic Choco Chip Cookies 150g', 'यूनिबिक चोको चिप कुकीज 150 ग्राम', 'युनिबिक चोको चिप कुकीज 150 ग्रॅम', 'Bakery & Extras', 'Piece', 33.00, 40.00, 36.00, 10.00, 180),
    ('Unibic Butter Cookies 75g', 'यूनिबिक बटर कुकीज 75 ग्राम', 'युनिबिक बटर कुकीज 75 ग्रॅम', 'Bakery & Extras', 'Piece', 16.50, 20.00, 48.00, 12.00, 180),
    ('Unibic Butter Cookies 150g', 'यूनिबिक बटर कुकीज 150 ग्राम', 'युनिबिक बटर कुकीज 150 ग्रॅम', 'Bakery & Extras', 'Piece', 33.00, 40.00, 36.00, 10.00, 180),
    ('Unibic Cashew Butter Cookies 75g', 'यूनिबिक काजू बटर कुकीज 75 ग्राम', 'युनिबिक काजू बटर कुकीज 75 ग्रॅम', 'Bakery & Extras', 'Piece', 20.50, 25.00, 36.00, 10.00, 180),
    ('Unibic Oatmeal Digestive Cookies 75g', 'यूनिबिक ओटमील डाइजेस्टिव 75 ग्राम', 'युनिबिक ओटमील डायजेस्टिव्ह 75 ग्रॅम', 'Bakery & Extras', 'Piece', 20.50, 25.00, 36.00, 10.00, 180),
    ('Unibic Fruit & Nut Cookies 75g', 'यूनिबिक फ्रूट एंड नट कुकीज 75 ग्राम', 'युनिबिक फ्रूट अँड नट कुकीज 75 ग्रॅम', 'Bakery & Extras', 'Piece', 20.50, 25.00, 36.00, 10.00, 180),
    ('Unibic Snappers Potato Crackers 75g', 'यूनिबिक स्नैपर्स पोटैटो क्रैकर्स 75 ग्राम', 'युनिबिक स्नॅपर्स् बटाटा क्रॅकर्स 75 ग्रॅम', 'Bakery & Extras', 'Piece', 16.50, 20.00, 48.00, 12.00, 180);

    -- Loop over each product and insert/update
    FOR rec IN SELECT * FROM tmp_britannia_items LOOP
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
            v_batch_no := 'BRT-' || to_char(v_today, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');

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
                'Britannia/Oreo/Unibic Biscuits Inward'
            );
        END IF;
    END LOOP;
END $$;

-- STEP 3: Verification Output - List all added Britannia, Oreo and Unibic products and their live stock
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
WHERE p.name ILIKE '%Britannia%' 
   OR p.name ILIKE '%Oreo%' 
   OR p.name ILIKE '%Unibic%'
ORDER BY p.name;

