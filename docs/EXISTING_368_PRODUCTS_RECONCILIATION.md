# 📋 Existing 368 Products Reconciliation & Audit Report
**Project:** Yogeshwari Dairy Shop & Inventory Management System  
**Generated:** 2026-11-15  
**Target Database:** Supabase PostgreSQL (`pfamoxreojbejufwhgiu.supabase.co`)  

---

## 📌 Executive Classification Summary

| Classification Tier | Count | Description | Action Required |
| :--- | :--- | :--- | :--- |
| **Tier 1: Genuine Physical Stock** | 1 | Products with positive physical inventory | Keep intact; preserve stock quantity. |
| **Tier 2: Genuine Purchase / Batch History** | 0 | Lots received via verified vendor purchase invoices | None present in historical data. |
| **Tier 3: Sales History Linked** | 0 | Products with customer sales records | Table is clean at 0 rows. |
| **Tier 4: Artificial Seed Stock (Reset to 0)** | 367 | Catalogue products with initial dummy batch entries | Keep in Product Catalogue with stock = 0. |
| **Tier 5: Unknown Stock Origin** | 0 | Products with missing batch or ledger references | None. All products accounted for. |

---

## 🔍 Tier 1: Genuine Physical Stock Items (1 Product)

- **Amul Alphonso Mango Ice Cream Cup 100ml** (अमूल हापूस आंबा आईस्क्रीम कप 100 मिली)
  - ID: `ee6dd476-b20e-4dc4-9fcf-33cc66c61102`
  - Category: `Sweets/Mithai` | Unit: `Piece`
  - Available Stock: **1.0 Piece**
  - Purchase Price: ₹24.0 | Selling Price: ₹30.0
  - Recommended Action: **PRESERVE IN CURRENT INVENTORY**. Do NOT reset.

---

## 📦 Tier 4: Catalogue Products With Zero Stock (367 Products)

These 367 items represent the shop master catalogue. Their historical dummy batches were set to status `EXHAUSTED` in Phase 54. They are preserved in the **Product Catalogue** and will appear in **Current Inventory** only upon confirmed barcode or lot stock-in.

| # | Product Name | Category | Packaging Unit | Purchase Rate (₹) | Selling Rate (₹) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Amul American Nuts Tub 1L | Sweets/Mithai | Piece | ₹175.00 | ₹220.00 | Catalogue (Stock = 0.00) |
| 2 | Amul Amrakhand (Mango) 500g | Sweets/Mithai | Piece | ₹110.00 | ₹130.00 | Catalogue (Stock = 0.00) |
| 3 | Amul Butterscotch Family Pack 1L | Sweets/Mithai | Piece | ₹140.00 | ₹175.00 | Catalogue (Stock = 0.00) |
| 4 | Amul Butterscotch Ice Cream Cup 100ml | Sweets/Mithai | Piece | ₹20.00 | ₹25.00 | Catalogue (Stock = 0.00) |
| 5 | Amul Canned Paneer in Brine 400g Tin | Paneer & Butter | Piece | ₹155.00 | ₹180.00 | Catalogue (Stock = 0.00) |
| 6 | Amul Cassata Cut Slice 150ml | Sweets/Mithai | Piece | ₹32.00 | ₹40.00 | Catalogue (Stock = 0.00) |
| 7 | Amul Cheese Block 500g | Paneer & Butter | Piece | ₹290.00 | ₹330.00 | Catalogue (Stock = 0.00) |
| 8 | Amul Cheese Cubes 200g (8 Cubes) | Paneer & Butter | Piece | ₹130.00 | ₹150.00 | Catalogue (Stock = 0.00) |
| 9 | Amul Cheese Slices 200g (10 Slices) | Paneer & Butter | Piece | ₹135.00 | ₹155.00 | Catalogue (Stock = 0.00) |
| 10 | Amul Chocolate Brownie Tub 1L | Sweets/Mithai | Piece | ₹175.00 | ₹220.00 | Catalogue (Stock = 0.00) |
| 11 | Amul Chocolate Ice Cream Cup 100ml | Sweets/Mithai | Piece | ₹20.00 | ₹25.00 | Catalogue (Stock = 0.00) |
| 12 | Amul Classic Chocobar 60ml | Sweets/Mithai | Piece | ₹16.00 | ₹20.00 | Catalogue (Stock = 0.00) |
| 13 | Amul Cow Ghee 1L Jar | Ghee | Kg | ₹610.00 | ₹680.00 | Catalogue (Stock = 0.00) |
| 14 | Amul Cow Ghee 500ml Jar | Ghee | Piece | ₹310.00 | ₹355.00 | Catalogue (Stock = 0.00) |
| 15 | Amul Diced Mozzarella Pizza Cheese 1kg | Paneer & Butter | Kg | ₹460.00 | ₹520.00 | Catalogue (Stock = 0.00) |
| 16 | Amul Diced Mozzarella Pizza Cheese 200g | Paneer & Butter | Piece | ₹115.00 | ₹130.00 | Catalogue (Stock = 0.00) |
| 17 | Amul Elaichi Shrikhand 500g | Sweets/Mithai | Piece | ₹105.00 | ₹125.00 | Catalogue (Stock = 0.00) |
| 18 | Amul Fresh Cream 250ml | Paneer & Butter | Piece | ₹60.00 | ₹70.00 | Catalogue (Stock = 0.00) |
| 19 | Amul Fresh Malai Paneer 100g | Paneer & Butter | Piece | ₹39.00 | ₹45.00 | Catalogue (Stock = 0.00) |
| 20 | Amul Fresh Malai Paneer 1kg Block | Paneer & Butter | Kg | ₹375.00 | ₹430.00 | Catalogue (Stock = 0.00) |
| 21 | Amul Fresh Malai Paneer 200g | Paneer & Butter | Piece | ₹83.00 | ₹95.00 | Catalogue (Stock = 0.00) |
| 22 | Amul Fresh Malai Paneer 500g | Paneer & Butter | Piece | ₹198.00 | ₹225.00 | Catalogue (Stock = 0.00) |
| 23 | Amul Frostik Premium Chocolate Bar 70ml | Sweets/Mithai | Piece | ₹32.00 | ₹40.00 | Catalogue (Stock = 0.00) |
| 24 | Amul Frozen Diced Paneer Cubes 1kg | Paneer & Butter | Kg | ₹400.00 | ₹460.00 | Catalogue (Stock = 0.00) |
| 25 | Amul Frozen Diced Paneer Cubes 200g | Paneer & Butter | Piece | ₹86.00 | ₹100.00 | Catalogue (Stock = 0.00) |
| 26 | Amul Frozen Diced Paneer Cubes 500g | Paneer & Butter | Piece | ₹210.00 | ₹240.00 | Catalogue (Stock = 0.00) |
| 27 | Amul Frozen Green Peas 1kg | Bakery & Extras | Kg | ₹115.00 | ₹140.00 | Catalogue (Stock = 0.00) |
| 28 | Amul Frozen Green Peas 200g | Bakery & Extras | Piece | ₹28.00 | ₹35.00 | Catalogue (Stock = 0.00) |
| 29 | Amul Frozen Green Peas 500g | Bakery & Extras | Piece | ₹60.00 | ₹75.00 | Catalogue (Stock = 0.00) |
| 30 | Amul Frozen Green Peas 5kg Bulk Pack | Bakery & Extras | Kg | ₹540.00 | ₹650.00 | Catalogue (Stock = 0.00) |
| 31 | Amul Frozen Malai Paneer 1kg | Paneer & Butter | Kg | ₹385.00 | ₹440.00 | Catalogue (Stock = 0.00) |
| 32 | Amul Frozen Malai Paneer 200g | Paneer & Butter | Piece | ₹82.00 | ₹95.00 | Catalogue (Stock = 0.00) |
| 33 | Amul Frozen Malai Paneer 500g | Paneer & Butter | Piece | ₹200.00 | ₹230.00 | Catalogue (Stock = 0.00) |
| 34 | Amul Frozen Mixed Vegetables 1kg | Bakery & Extras | Kg | ₹120.00 | ₹150.00 | Catalogue (Stock = 0.00) |
| 35 | Amul Frozen Mixed Vegetables 500g | Bakery & Extras | Piece | ₹64.00 | ₹80.00 | Catalogue (Stock = 0.00) |
| 36 | Amul Frozen Sweet Corn 1kg | Bakery & Extras | Kg | ₹128.00 | ₹160.00 | Catalogue (Stock = 0.00) |
| 37 | Amul Frozen Sweet Corn 500g | Bakery & Extras | Piece | ₹68.00 | ₹85.00 | Catalogue (Stock = 0.00) |
| 38 | Amul Garlic and Herbs Butter 100g | Paneer & Butter | Piece | ₹56.00 | ₹65.00 | Catalogue (Stock = 0.00) |
| 39 | Amul Gulab Jamun 1kg Tin | Sweets/Mithai | Kg | ₹215.00 | ₹250.00 | Catalogue (Stock = 0.00) |
| 40 | Amul Happy Treats Aloo Tikki 400g | Bakery & Extras | Piece | ₹82.00 | ₹100.00 | Catalogue (Stock = 0.00) |
| 41 | Amul Happy Treats Cheese Poppers 400g | Bakery & Extras | Piece | ₹148.00 | ₹180.00 | Catalogue (Stock = 0.00) |
| 42 | Amul Happy Treats French Fries 420g | Bakery & Extras | Piece | ₹78.00 | ₹95.00 | Catalogue (Stock = 0.00) |
| 43 | Amul High Protein Paneer 200g | Paneer & Butter | Piece | ₹95.00 | ₹110.00 | Catalogue (Stock = 0.00) |
| 44 | Amul Ice Cream Sandwich 100ml | Sweets/Mithai | Piece | ₹28.00 | ₹35.00 | Catalogue (Stock = 0.00) |
| 45 | Amul Kaju Draksh Ice Cream Cup 100ml | Sweets/Mithai | Piece | ₹24.00 | ₹30.00 | Catalogue (Stock = 0.00) |
| 46 | Amul Kaju Draksh Tub 1L | Sweets/Mithai | Piece | ₹160.00 | ₹200.00 | Catalogue (Stock = 0.00) |
| 47 | Amul Kesar Pista Tub 1L | Sweets/Mithai | Piece | ₹170.00 | ₹215.00 | Catalogue (Stock = 0.00) |
| 48 | Amul Kesar Shrikhand 500g | Sweets/Mithai | Piece | ₹115.00 | ₹135.00 | Catalogue (Stock = 0.00) |
| 49 | Amul Kool Badam 200ml Bottle | Curd & Chaas | Piece | ₹25.00 | ₹30.00 | Catalogue (Stock = 0.00) |
| 50 | Amul Kool Cafe 200ml Can | Curd & Chaas | Piece | ₹35.00 | ₹40.00 | Catalogue (Stock = 0.00) |
| 51 | Amul Lassi Mango 200ml Tetra | Curd & Chaas | Piece | ₹22.00 | ₹25.00 | Catalogue (Stock = 0.00) |
| 52 | Amul Lassi Rose 200ml Tetra | Curd & Chaas | Piece | ₹22.00 | ₹25.00 | Catalogue (Stock = 0.00) |
| 53 | Amul Low Fat Paneer 200g | Paneer & Butter | Piece | ₹82.00 | ₹95.00 | Catalogue (Stock = 0.00) |
| 54 | Amul Mango Duet Bar 60ml | Sweets/Mithai | Piece | ₹16.00 | ₹20.00 | Catalogue (Stock = 0.00) |
| 55 | Amul Marinated Paneer Tikka 200g | Paneer & Butter | Piece | ₹102.00 | ₹120.00 | Catalogue (Stock = 0.00) |
| 56 | Amul Masti Dahi Cup 200g | Curd & Chaas | Piece | ₹21.00 | ₹25.00 | Catalogue (Stock = 0.00) |
| 57 | Amul Masti Dahi Cup 400g | Curd & Chaas | Piece | ₹40.00 | ₹47.00 | Catalogue (Stock = 0.00) |
| 58 | Amul Masti Dahi Pouch 400g | Curd & Chaas | Packet (500ml) | ₹32.00 | ₹36.00 | Catalogue (Stock = 0.00) |
| 59 | Amul Masti Dahi Tub 1kg | Curd & Chaas | Kg | ₹95.00 | ₹110.00 | Catalogue (Stock = 0.00) |
| 60 | Amul Masti Spiced Buttermilk 200ml Pouch | Curd & Chaas | Piece | ₹12.00 | ₹15.00 | Catalogue (Stock = 0.00) |
| 61 | Amul Masti Spiced Buttermilk 500ml Tetra | Curd & Chaas | Packet (500ml) | ₹28.00 | ₹32.00 | Catalogue (Stock = 0.00) |
| 62 | Amul Matka Kulfi 120ml | Sweets/Mithai | Piece | ₹40.00 | ₹50.00 | Catalogue (Stock = 0.00) |
| 63 | Amul Mithai Mate Condensed Milk 200g | Sweets/Mithai | Piece | ₹58.00 | ₹66.00 | Catalogue (Stock = 0.00) |
| 64 | Amul Pure Buffalo Milk Paneer 200g | Paneer & Butter | Piece | ₹87.00 | ₹100.00 | Catalogue (Stock = 0.00) |
| 65 | Amul Pure Cow Milk Paneer 200g | Paneer & Butter | Piece | ₹83.00 | ₹95.00 | Catalogue (Stock = 0.00) |
| 66 | Amul Pure Ghee 1L Pouch | Ghee | Packet (1L) | ₹580.00 | ₹650.00 | Catalogue (Stock = 0.00) |
| 67 | Amul Pure Ghee 1L Tin | Ghee | Kg | ₹620.00 | ₹690.00 | Catalogue (Stock = 0.00) |
| 68 | Amul Pure Ghee 500ml Pouch | Ghee | Packet (500ml) | ₹295.00 | ₹335.00 | Catalogue (Stock = 0.00) |
| 69 | Amul Rajbhog Gold Tub 1L | Sweets/Mithai | Piece | ₹190.00 | ₹240.00 | Catalogue (Stock = 0.00) |
| 70 | Amul Rajbhog Ice Cream Cup 100ml | Sweets/Mithai | Piece | ₹28.00 | ₹35.00 | Catalogue (Stock = 0.00) |
| 71 | Amul Rajbhog Kulfi Stick 60ml | Sweets/Mithai | Piece | ₹24.00 | ₹30.00 | Catalogue (Stock = 0.00) |
| 72 | Amul Rasgulla 1kg Tin | Sweets/Mithai | Kg | ₹205.00 | ₹240.00 | Catalogue (Stock = 0.00) |
| 73 | Amul Raspberry Duet Bar 60ml | Sweets/Mithai | Piece | ₹16.00 | ₹20.00 | Catalogue (Stock = 0.00) |
| 74 | Amul Salted Butter 100g | Paneer & Butter | Piece | ₹52.00 | ₹60.00 | Catalogue (Stock = 0.00) |
| 75 | Amul Salted Butter 500g | Paneer & Butter | Piece | ₹250.00 | ₹285.00 | Catalogue (Stock = 0.00) |
| 76 | Amul Shahi Kulfi Stick 60ml | Sweets/Mithai | Piece | ₹20.00 | ₹25.00 | Catalogue (Stock = 0.00) |
| 77 | Amul Spiced Masala Paneer 200g | Paneer & Butter | Piece | ₹90.00 | ₹105.00 | Catalogue (Stock = 0.00) |
| 78 | Amul Strawberry Ice Cream Cup 100ml | Sweets/Mithai | Piece | ₹16.00 | ₹20.00 | Catalogue (Stock = 0.00) |
| 79 | Amul Sugar Free Vanilla Ice Cream Tub 125ml | Sweets/Mithai | Piece | ₹32.00 | ₹40.00 | Catalogue (Stock = 0.00) |
| 80 | Amul Tricone Belgian Chocolate 120ml | Sweets/Mithai | Piece | ₹40.00 | ₹50.00 | Catalogue (Stock = 0.00) |
| 81 | Amul Tricone Butterscotch 120ml | Sweets/Mithai | Piece | ₹32.00 | ₹40.00 | Catalogue (Stock = 0.00) |
| 82 | Amul Tricone Chocolate 120ml | Sweets/Mithai | Piece | ₹32.00 | ₹40.00 | Catalogue (Stock = 0.00) |
| 83 | Amul Tricone Cookie and Cream 120ml | Sweets/Mithai | Piece | ₹40.00 | ₹50.00 | Catalogue (Stock = 0.00) |
| 84 | Amul Vanilla Family Pack 1L | Sweets/Mithai | Piece | ₹105.00 | ₹130.00 | Catalogue (Stock = 0.00) |
| 85 | Amul Vanilla Ice Cream Cup 100ml | Sweets/Mithai | Piece | ₹16.00 | ₹20.00 | Catalogue (Stock = 0.00) |
| 86 | Amul White Butter 500g | Paneer & Butter | Piece | ₹240.00 | ₹275.00 | Catalogue (Stock = 0.00) |
| 87 | Balaji Bhavnagari Gathiya 200g | Bakery & Extras | Piece | ₹29.50 | ₹35.00 | Catalogue (Stock = 0.00) |
| 88 | Balaji Bhavnagari Gathiya 65g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 89 | Balaji Bhujia Sev 200g | Bakery & Extras | Piece | ₹29.50 | ₹35.00 | Catalogue (Stock = 0.00) |
| 90 | Balaji Bhujia Sev 65g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 91 | Balaji Chaat Chaska Wafers 55g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 92 | Balaji Chana Jor Garam 60g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 93 | Balaji Cream & Onion Wafers 125g | Bakery & Extras | Piece | ₹16.80 | ₹20.00 | Catalogue (Stock = 0.00) |
| 94 | Balaji Cream & Onion Wafers 28g | Bakery & Extras | Piece | ₹4.20 | ₹5.00 | Catalogue (Stock = 0.00) |
| 95 | Balaji Cream & Onion Wafers 55g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 96 | Balaji Crunchex Chilli Tadka 50g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 97 | Balaji Farali Chiwda 180g | Bakery & Extras | Piece | ₹29.50 | ₹35.00 | Catalogue (Stock = 0.00) |
| 98 | Balaji Farali Chiwda 60g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 99 | Balaji Khatta Meetha Namkeen 200g | Bakery & Extras | Piece | ₹29.50 | ₹35.00 | Catalogue (Stock = 0.00) |
| 100 | Balaji Khatta Meetha Namkeen 65g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 101 | Balaji Masala Masti Wafers 125g | Bakery & Extras | Piece | ₹16.80 | ₹20.00 | Catalogue (Stock = 0.00) |
| 102 | Balaji Masala Masti Wafers 28g | Bakery & Extras | Piece | ₹4.20 | ₹5.00 | Catalogue (Stock = 0.00) |
| 103 | Balaji Masala Masti Wafers 55g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 104 | Balaji Moong Dal 60g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 105 | Balaji Ratlami Sev 200g | Bakery & Extras | Piece | ₹29.50 | ₹35.00 | Catalogue (Stock = 0.00) |
| 106 | Balaji Ratlami Sev 65g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 107 | Balaji Scoop Masala 50g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 108 | Balaji Shing Bhujia (Masala Peanuts) 65g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 109 | Balaji Simply Salted Wafers 125g | Bakery & Extras | Piece | ₹16.80 | ₹20.00 | Catalogue (Stock = 0.00) |
| 110 | Balaji Simply Salted Wafers 28g | Bakery & Extras | Piece | ₹4.20 | ₹5.00 | Catalogue (Stock = 0.00) |
| 111 | Balaji Simply Salted Wafers 55g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 112 | Balaji Tikha Meetha Mix 200g | Bakery & Extras | Piece | ₹29.50 | ₹35.00 | Catalogue (Stock = 0.00) |
| 113 | Balaji Tikha Meetha Mix 65g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 114 | Balaji Tomato Twist Wafers 125g | Bakery & Extras | Piece | ₹16.80 | ₹20.00 | Catalogue (Stock = 0.00) |
| 115 | Balaji Tomato Twist Wafers 28g | Bakery & Extras | Piece | ₹4.20 | ₹5.00 | Catalogue (Stock = 0.00) |
| 116 | Balaji Tomato Twist Wafers 55g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 117 | Balaji Wheels Chatpata Masala 50g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 118 | Britannia Bourbon Chocolate Cream 60g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 119 | Britannia Good Day Cashew Cookies 34g | Bakery & Extras | Piece | ₹16.80 | ₹20.00 | Catalogue (Stock = 0.00) |
| 120 | Britannia Good Day Cashew Cookies 60g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 121 | Britannia Little Hearts Classic 29g | Bakery & Extras | Piece | ₹16.80 | ₹20.00 | Catalogue (Stock = 0.00) |
| 122 | Britannia Little Hearts Classic 79g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 123 | Britannia NutriChoice Digestive Biscuits 50g | Bakery & Extras | Piece | ₹21.00 | ₹25.00 | Catalogue (Stock = 0.00) |
| 124 | Cadbury 5 Star 3D Chocolate 42g | Bakery & Extras | Piece | ₹29.50 | ₹35.00 | Catalogue (Stock = 0.00) |
| 125 | Cadbury 5 Star Chocolate 10.1g | Bakery & Extras | Piece | ₹4.20 | ₹5.00 | Catalogue (Stock = 0.00) |
| 126 | Cadbury 5 Star Chocolate 20g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 127 | Cadbury 5 Star Chocolate 40g | Bakery & Extras | Piece | ₹16.80 | ₹20.00 | Catalogue (Stock = 0.00) |
| 128 | Cadbury Bournvita 5 Star Magic 500g Jar | Bakery & Extras | Piece | ₹218.00 | ₹255.00 | Catalogue (Stock = 0.00) |
| 129 | Cadbury Bournvita Health Drink 1kg Refill | Bakery & Extras | Piece | ₹375.00 | ₹435.00 | Catalogue (Stock = 0.00) |
| 130 | Cadbury Bournvita Health Drink 200g Pouch | Bakery & Extras | Piece | ₹94.00 | ₹110.00 | Catalogue (Stock = 0.00) |
| 131 | Cadbury Bournvita Health Drink 500g Jar | Bakery & Extras | Piece | ₹210.00 | ₹245.00 | Catalogue (Stock = 0.00) |
| 132 | Cadbury Celebrations Assorted Gift Pack 114g | Bakery & Extras | Piece | ₹85.00 | ₹100.00 | Catalogue (Stock = 0.00) |
| 133 | Cadbury Celebrations Assorted Gift Pack 183.6g | Bakery & Extras | Piece | ₹148.00 | ₹175.00 | Catalogue (Stock = 0.00) |
| 134 | Cadbury Celebrations Premium Gift Box 281g | Bakery & Extras | Piece | ₹235.00 | ₹275.00 | Catalogue (Stock = 0.00) |
| 135 | Cadbury Celebrations Rich Dry Fruit Gift Pack 177g | Bakery & Extras | Piece | ₹420.00 | ₹500.00 | Catalogue (Stock = 0.00) |
| 136 | Cadbury Chocobakes Choc Filled Cookies 150g | Bakery & Extras | Piece | ₹58.00 | ₹70.00 | Catalogue (Stock = 0.00) |
| 137 | Cadbury Chocobakes Choc Filled Cookies 75g | Bakery & Extras | Piece | ₹29.50 | ₹35.00 | Catalogue (Stock = 0.00) |
| 138 | Cadbury Chocobakes Choc Layered Cake 126g (6 Pcs) | Bakery & Extras | Piece | ₹50.00 | ₹60.00 | Catalogue (Stock = 0.00) |
| 139 | Cadbury Chocobakes Choc Layered Cake 21g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 140 | Cadbury Dairy Milk Chocolate 13.2g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 141 | Cadbury Dairy Milk Chocolate 130g | Bakery & Extras | Piece | ₹84.00 | ₹100.00 | Catalogue (Stock = 0.00) |
| 142 | Cadbury Dairy Milk Chocolate 24g | Bakery & Extras | Piece | ₹16.80 | ₹20.00 | Catalogue (Stock = 0.00) |
| 143 | Cadbury Dairy Milk Chocolate 50g | Bakery & Extras | Piece | ₹38.00 | ₹45.00 | Catalogue (Stock = 0.00) |
| 144 | Cadbury Dairy Milk Crackle 36g | Bakery & Extras | Piece | ₹38.00 | ₹45.00 | Catalogue (Stock = 0.00) |
| 145 | Cadbury Dairy Milk Crispello Chocolate 35g | Bakery & Extras | Piece | ₹29.50 | ₹35.00 | Catalogue (Stock = 0.00) |
| 146 | Cadbury Dairy Milk Fruit & Nut 36g | Bakery & Extras | Piece | ₹38.00 | ₹45.00 | Catalogue (Stock = 0.00) |
| 147 | Cadbury Dairy Milk Lickables 20g | Bakery & Extras | Piece | ₹38.00 | ₹45.00 | Catalogue (Stock = 0.00) |
| 148 | Cadbury Dairy Milk Maha Pack 160g | Bakery & Extras | Piece | ₹126.00 | ₹150.00 | Catalogue (Stock = 0.00) |
| 149 | Cadbury Dairy Milk Roast Almond 36g | Bakery & Extras | Piece | ₹38.00 | ₹45.00 | Catalogue (Stock = 0.00) |
| 150 | Cadbury Dairy Milk Silk Bubbly 120g | Bakery & Extras | Piece | ₹165.00 | ₹195.00 | Catalogue (Stock = 0.00) |
| 151 | Cadbury Dairy Milk Silk Bubbly 50g | Bakery & Extras | Piece | ₹72.00 | ₹85.00 | Catalogue (Stock = 0.00) |
| 152 | Cadbury Dairy Milk Silk Chocolate 150g | Bakery & Extras | Piece | ₹160.00 | ₹190.00 | Catalogue (Stock = 0.00) |
| 153 | Cadbury Dairy Milk Silk Chocolate 60g | Bakery & Extras | Piece | ₹68.00 | ₹80.00 | Catalogue (Stock = 0.00) |
| 154 | Cadbury Dairy Milk Silk Fruit & Nut 137g | Bakery & Extras | Piece | ₹165.00 | ₹195.00 | Catalogue (Stock = 0.00) |
| 155 | Cadbury Dairy Milk Silk Fruit & Nut 55g | Bakery & Extras | Piece | ₹72.00 | ₹85.00 | Catalogue (Stock = 0.00) |
| 156 | Cadbury Dairy Milk Silk Hazelnut 143g | Bakery & Extras | Piece | ₹178.00 | ₹210.00 | Catalogue (Stock = 0.00) |
| 157 | Cadbury Dairy Milk Silk Hazelnut 58g | Bakery & Extras | Piece | ₹76.00 | ₹90.00 | Catalogue (Stock = 0.00) |
| 158 | Cadbury Dairy Milk Silk Mousse 50g | Bakery & Extras | Piece | ₹72.00 | ₹85.00 | Catalogue (Stock = 0.00) |
| 159 | Cadbury Dairy Milk Silk Oreo 130g | Bakery & Extras | Piece | ₹165.00 | ₹195.00 | Catalogue (Stock = 0.00) |
| 160 | Cadbury Dairy Milk Silk Oreo 60g | Bakery & Extras | Piece | ₹76.00 | ₹90.00 | Catalogue (Stock = 0.00) |
| 161 | Cadbury Dairy Milk Silk Roast Almond 137g | Bakery & Extras | Piece | ₹165.00 | ₹195.00 | Catalogue (Stock = 0.00) |
| 162 | Cadbury Dairy Milk Silk Roast Almond 55g | Bakery & Extras | Piece | ₹72.00 | ₹85.00 | Catalogue (Stock = 0.00) |
| 163 | Cadbury Fuse Almond & Peanut 45g | Bakery & Extras | Piece | ₹38.00 | ₹45.00 | Catalogue (Stock = 0.00) |
| 164 | Cadbury Fuse Peanut & Caramel 24g | Bakery & Extras | Piece | ₹16.80 | ₹20.00 | Catalogue (Stock = 0.00) |
| 165 | Cadbury Fuse Peanut & Caramel 45g | Bakery & Extras | Piece | ₹34.00 | ₹40.00 | Catalogue (Stock = 0.00) |
| 166 | Cadbury Gems Pouch 18.2g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 167 | Cadbury Gems Pouch 38.6g | Bakery & Extras | Piece | ₹16.80 | ₹20.00 | Catalogue (Stock = 0.00) |
| 168 | Cadbury Gems Pouch 7.9g | Bakery & Extras | Piece | ₹4.20 | ₹5.00 | Catalogue (Stock = 0.00) |
| 169 | Cadbury Gems Surprise Ball 17.6g | Bakery & Extras | Piece | ₹29.50 | ₹35.00 | Catalogue (Stock = 0.00) |
| 170 | Cadbury Gems Tube 34g | Bakery & Extras | Piece | ₹25.00 | ₹30.00 | Catalogue (Stock = 0.00) |
| 171 | Cadbury Oreo Chocolate Cream 120g | Bakery & Extras | Piece | ₹25.00 | ₹30.00 | Catalogue (Stock = 0.00) |
| 172 | Cadbury Oreo Chocolate Cream 46g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 173 | Cadbury Oreo Golden Vanilla Cream 120g | Bakery & Extras | Piece | ₹29.00 | ₹35.00 | Catalogue (Stock = 0.00) |
| 174 | Cadbury Oreo Original Vanilla Cream 120g | Bakery & Extras | Piece | ₹25.00 | ₹30.00 | Catalogue (Stock = 0.00) |
| 175 | Cadbury Oreo Original Vanilla Cream 288g | Bakery & Extras | Piece | ₹58.00 | ₹70.00 | Catalogue (Stock = 0.00) |
| 176 | Cadbury Oreo Original Vanilla Cream 46g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 177 | Cadbury Oreo Red Velvet 120g | Bakery & Extras | Piece | ₹33.00 | ₹40.00 | Catalogue (Stock = 0.00) |
| 178 | Cadbury Oreo Strawberry Cream 120g | Bakery & Extras | Piece | ₹25.00 | ₹30.00 | Catalogue (Stock = 0.00) |
| 179 | Cadbury Oreo Strawberry Cream 46g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 180 | Cadbury Perk 40% Extra 40g | Bakery & Extras | Piece | ₹16.80 | ₹20.00 | Catalogue (Stock = 0.00) |
| 181 | Cadbury Perk Wafer Chocolate 13g | Bakery & Extras | Piece | ₹4.20 | ₹5.00 | Catalogue (Stock = 0.00) |
| 182 | Cadbury Perk Wafer Chocolate 28g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 183 | Campa Cola 2 Litre Pet Bottle | Bakery & Extras | Piece | ₹50.00 | ₹60.00 | Catalogue (Stock = 0.00) |
| 184 | Campa Cola 200ml Bottle | Bakery & Extras | Piece | ₹8.20 | ₹10.00 | Catalogue (Stock = 0.00) |
| 185 | Campa Cola 500ml Pet Bottle | Bakery & Extras | Piece | ₹16.50 | ₹20.00 | Catalogue (Stock = 0.00) |
| 186 | Campa Lemon 200ml Bottle | Bakery & Extras | Piece | ₹8.20 | ₹10.00 | Catalogue (Stock = 0.00) |
| 187 | Campa Lemon 500ml Pet Bottle | Bakery & Extras | Piece | ₹16.50 | ₹20.00 | Catalogue (Stock = 0.00) |
| 188 | Campa Orange 200ml Bottle | Bakery & Extras | Piece | ₹8.20 | ₹10.00 | Catalogue (Stock = 0.00) |
| 189 | Campa Orange 500ml Pet Bottle | Bakery & Extras | Piece | ₹16.50 | ₹20.00 | Catalogue (Stock = 0.00) |
| 190 | Chakote Bhavnagari Gathiya 200g | Bakery & Extras | Piece | ₹29.50 | ₹35.00 | Catalogue (Stock = 0.00) |
| 191 | Chakote Butter Khari 200g | Bakery & Extras | Piece | ₹29.00 | ₹35.00 | Catalogue (Stock = 0.00) |
| 192 | Chakote Chocolate Cream Roll | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 193 | Chakote Jeera Khari 200g | Bakery & Extras | Piece | ₹33.00 | ₹40.00 | Catalogue (Stock = 0.00) |
| 194 | Chakote Masala Khari 200g | Bakery & Extras | Piece | ₹33.00 | ₹40.00 | Catalogue (Stock = 0.00) |
| 195 | Chakote Mix Farsan Namkeen 200g | Bakery & Extras | Piece | ₹29.50 | ₹35.00 | Catalogue (Stock = 0.00) |
| 196 | Chakote Potato Chips Masala 25g | Bakery & Extras | Piece | ₹4.20 | ₹5.00 | Catalogue (Stock = 0.00) |
| 197 | Chakote Potato Chips Masala 50g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 198 | Chakote Potato Chips Salted 25g | Bakery & Extras | Piece | ₹4.20 | ₹5.00 | Catalogue (Stock = 0.00) |
| 199 | Chakote Potato Chips Salted 50g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 200 | Chakote Potato Chips Tomato 50g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 201 | Chakote Premium Elaichi Toast 200g | Bakery & Extras | Piece | ₹29.00 | ₹35.00 | Catalogue (Stock = 0.00) |
| 202 | Chakote Premium Milk Toast (Rusk) 200g | Bakery & Extras | Piece | ₹29.00 | ₹35.00 | Catalogue (Stock = 0.00) |
| 203 | Chakote Special Bhujia Sev 200g | Bakery & Extras | Piece | ₹29.50 | ₹35.00 | Catalogue (Stock = 0.00) |
| 204 | Chakote Special Bhujia Sev 65g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 205 | Chakote Vanilla Cream Roll | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 206 | Coca Cola 250ml Pet Bottle | Bakery & Extras | Piece | ₹16.50 | ₹20.00 | Catalogue (Stock = 0.00) |
| 207 | Coca Cola 750ml Pet Bottle | Bakery & Extras | Piece | ₹33.50 | ₹40.00 | Catalogue (Stock = 0.00) |
| 208 | Dairy Power Elaichi Shrikhand 250g | Sweets/Mithai | Piece | ₹54.00 | ₹65.00 | Catalogue (Stock = 0.00) |
| 209 | Dairy Power Elaichi Shrikhand 500g | Sweets/Mithai | Piece | ₹105.00 | ₹125.00 | Catalogue (Stock = 0.00) |
| 210 | Dairy Power Fresh Curd (Dahi) 200g Cup | Curd & Chaas | Piece | ₹16.50 | ₹20.00 | Catalogue (Stock = 0.00) |
| 211 | Dairy Power Fresh Curd (Dahi) 400g Pouch | Curd & Chaas | Piece | ₹29.50 | ₹35.00 | Catalogue (Stock = 0.00) |
| 212 | Dairy Power Fresh Malai Paneer 1kg Block | Paneer & Butter | Kg | ₹360.00 | ₹420.00 | Catalogue (Stock = 0.00) |
| 213 | Dairy Power Fresh Malai Paneer 200g | Paneer & Butter | Piece | ₹76.00 | ₹90.00 | Catalogue (Stock = 0.00) |
| 214 | Dairy Power Mango Amrakhand 250g | Sweets/Mithai | Piece | ₹58.00 | ₹70.00 | Catalogue (Stock = 0.00) |
| 215 | Dairy Power Mango Amrakhand 500g | Sweets/Mithai | Piece | ₹112.00 | ₹135.00 | Catalogue (Stock = 0.00) |
| 216 | Dairy Power Pure Buffalo Ghee 1L Jar | Ghee | Piece | ₹615.00 | ₹710.00 | Catalogue (Stock = 0.00) |
| 217 | Dairy Power Pure Buffalo Ghee 500ml | Ghee | Piece | ₹310.00 | ₹360.00 | Catalogue (Stock = 0.00) |
| 218 | Dairy Power Pure Cow Ghee 1L Jar | Ghee | Piece | ₹580.00 | ₹670.00 | Catalogue (Stock = 0.00) |
| 219 | Dairy Power Pure Cow Ghee 500ml Pouch | Ghee | Piece | ₹295.00 | ₹340.00 | Catalogue (Stock = 0.00) |
| 220 | Dairy Power Spiced Masala Chaas 200ml | Curd & Chaas | Piece | ₹9.50 | ₹12.00 | Catalogue (Stock = 0.00) |
| 221 | Dairy Power Sweet Lassi 200ml Cup | Curd & Chaas | Piece | ₹16.00 | ₹20.00 | Catalogue (Stock = 0.00) |
| 222 | Diamond Aloo Bhujia 200g | Bakery & Extras | Piece | ₹29.50 | ₹35.00 | Catalogue (Stock = 0.00) |
| 223 | Diamond Aloo Bhujia 65g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 224 | Diamond Chulbule Masala 30g | Bakery & Extras | Piece | ₹4.20 | ₹5.00 | Catalogue (Stock = 0.00) |
| 225 | Diamond Chulbule Masala 65g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 226 | Diamond Khatta Meetha 200g | Bakery & Extras | Piece | ₹29.50 | ₹35.00 | Catalogue (Stock = 0.00) |
| 227 | Diamond Potato Chips Cream & Onion 50g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 228 | Diamond Potato Chips Masala Punch 25g | Bakery & Extras | Piece | ₹4.20 | ₹5.00 | Catalogue (Stock = 0.00) |
| 229 | Diamond Potato Chips Masala Punch 50g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 230 | Diamond Potato Chips Salted 25g | Bakery & Extras | Piece | ₹4.20 | ₹5.00 | Catalogue (Stock = 0.00) |
| 231 | Diamond Potato Chips Salted 50g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 232 | Diamond Potato Chips Tomato Twist 25g | Bakery & Extras | Piece | ₹4.20 | ₹5.00 | Catalogue (Stock = 0.00) |
| 233 | Diamond Potato Chips Tomato Twist 50g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 234 | Diamond Ratlami Sev 65g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 235 | Diamond Rings Tomato 25g | Bakery & Extras | Piece | ₹4.20 | ₹5.00 | Catalogue (Stock = 0.00) |
| 236 | Diamond Rings Tomato 50g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 237 | Diamond Wheels Masala 25g | Bakery & Extras | Piece | ₹4.20 | ₹5.00 | Catalogue (Stock = 0.00) |
| 238 | Diamond Wheels Masala 50g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 239 | Empire Aqua Water 1 Litre Bottle | Bakery & Extras | Piece | ₹12.00 | ₹20.00 | Catalogue (Stock = 0.00) |
| 240 | Empire Aqua Water 20 Litre Jar | Bakery & Extras | Piece | ₹45.00 | ₹70.00 | Catalogue (Stock = 0.00) |
| 241 | Empire Aqua Water 200ml Glass/Pouch | Bakery & Extras | Piece | ₹3.50 | ₹5.00 | Catalogue (Stock = 0.00) |
| 242 | Empire Aqua Water 500ml Bottle | Bakery & Extras | Piece | ₹6.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 243 | Gramilk Chai Special Milk | Milk | Litre | ₹56.00 | ₹62.00 | Catalogue (Stock = 0.00) |
| 244 | Gramilk Cow Ghee 1000 gm | Ghee | Kg | ₹620.00 | ₹720.00 | Catalogue (Stock = 0.00) |
| 245 | Gramilk Cow Ghee 500gm | Ghee | Piece | ₹320.00 | ₹375.00 | Catalogue (Stock = 0.00) |
| 246 | Gramilk Curd 500 gm | Curd & Chaas | Packet (500ml) | ₹40.00 | ₹48.00 | Catalogue (Stock = 0.00) |
| 247 | Gramilk Full Cream Milk | Milk | Litre | ₹60.00 | ₹66.00 | Catalogue (Stock = 0.00) |
| 248 | Gramilk Malai Paneer 100 gm | Paneer & Butter | Piece | ₹40.00 | ₹48.00 | Catalogue (Stock = 0.00) |
| 249 | Gramilk Malai Paneer 200 gm | Paneer & Butter | Piece | ₹78.00 | ₹90.00 | Catalogue (Stock = 0.00) |
| 250 | Gramilk Shrikhand 100 gm | Sweets/Mithai | Piece | ₹28.00 | ₹35.00 | Catalogue (Stock = 0.00) |
| 251 | Gramilk Shrikhand 250 gm | Sweets/Mithai | Piece | ₹68.00 | ₹80.00 | Catalogue (Stock = 0.00) |
| 252 | Gramilk Shrikhand 500 gm | Sweets/Mithai | Piece | ₹130.00 | ₹155.00 | Catalogue (Stock = 0.00) |
| 253 | Gramilk Slim Curd 200 gm | Curd & Chaas | Piece | ₹18.00 | ₹22.00 | Catalogue (Stock = 0.00) |
| 254 | Gramilk Tikka Special Paneer 1kg | Paneer & Butter | Kg | ₹360.00 | ₹420.00 | Catalogue (Stock = 0.00) |
| 255 | Haldiram All in one 200 gm | Bakery & Extras | Piece | ₹50.00 | ₹60.00 | Catalogue (Stock = 0.00) |
| 256 | Haldiram Atta cookies | Bakery & Extras | Piece | ₹85.00 | ₹100.00 | Catalogue (Stock = 0.00) |
| 257 | Haldiram Bhujia Sev 200 gm | Bakery & Extras | Piece | ₹50.00 | ₹60.00 | Catalogue (Stock = 0.00) |
| 258 | Haldiram Chai ke saath karela Sticks | Bakery & Extras | Piece | ₹55.25 | ₹65.00 | Catalogue (Stock = 0.00) |
| 259 | Haldiram Chocolate Sonpapdi 250 gm | Sweets/Mithai | Piece | ₹80.00 | ₹95.00 | Catalogue (Stock = 0.00) |
| 260 | Haldiram Coconut Sonpapdi 250 gm | Sweets/Mithai | Piece | ₹78.00 | ₹92.00 | Catalogue (Stock = 0.00) |
| 261 | Haldiram Elaichi Rusk 250 gm | Bakery & Extras | Piece | ₹40.00 | ₹50.00 | Catalogue (Stock = 0.00) |
| 262 | Haldiram Farali Chiwda 200 gm | Bakery & Extras | Piece | ₹52.00 | ₹65.00 | Catalogue (Stock = 0.00) |
| 263 | Haldiram Gulab Jamun 500 gm | Sweets/Mithai | Piece | ₹115.00 | ₹135.00 | Catalogue (Stock = 0.00) |
| 264 | Haldiram Jeera Namkeen cookies | Bakery & Extras | Piece | ₹68.00 | ₹80.00 | Catalogue (Stock = 0.00) |
| 265 | Haldiram Kaju butter cookies | Bakery & Extras | Piece | ₹76.50 | ₹90.00 | Catalogue (Stock = 0.00) |
| 266 | Haldiram Khatta Mitha 200 gm | Bakery & Extras | Piece | ₹50.00 | ₹60.00 | Catalogue (Stock = 0.00) |
| 267 | Haldiram Milk Rusk 250 gm | Bakery & Extras | Piece | ₹40.00 | ₹50.00 | Catalogue (Stock = 0.00) |
| 268 | Haldiram Mixture 200 gm | Bakery & Extras | Piece | ₹50.00 | ₹60.00 | Catalogue (Stock = 0.00) |
| 269 | Haldiram Orange Sonpapdi 250 gm | Sweets/Mithai | Piece | ₹75.00 | ₹90.00 | Catalogue (Stock = 0.00) |
| 270 | Haldiram Rasgulla 1000 gm | Sweets/Mithai | Kg | ₹210.00 | ₹250.00 | Catalogue (Stock = 0.00) |
| 271 | Haldiram Regular Sonpapdi 250 gm | Sweets/Mithai | Piece | ₹70.00 | ₹85.00 | Catalogue (Stock = 0.00) |
| 272 | Haldiram Regular Sonpapdi 500 gm | Sweets/Mithai | Piece | ₹135.00 | ₹165.00 | Catalogue (Stock = 0.00) |
| 273 | Maggi 2-Minute Masala Noodles 140g | Bakery & Extras | Piece | ₹23.80 | ₹28.00 | Catalogue (Stock = 0.00) |
| 274 | Maggi 2-Minute Masala Noodles 280g (4 Pcs) | Bakery & Extras | Piece | ₹47.50 | ₹56.00 | Catalogue (Stock = 0.00) |
| 275 | Maggi 2-Minute Masala Noodles 560g (8 Pcs) | Bakery & Extras | Piece | ₹93.50 | ₹110.00 | Catalogue (Stock = 0.00) |
| 276 | Maggi 2-Minute Masala Noodles 70g | Bakery & Extras | Piece | ₹11.80 | ₹14.00 | Catalogue (Stock = 0.00) |
| 277 | Maggi 2-Minute Special Masala Noodles 70g | Bakery & Extras | Piece | ₹15.00 | ₹18.00 | Catalogue (Stock = 0.00) |
| 278 | Maggi Hot & Sweet Chilli Sauce 500g Bottle | Bakery & Extras | Piece | ₹102.00 | ₹125.00 | Catalogue (Stock = 0.00) |
| 279 | Maggi Masala-e-Magic Pack (10 Sachets) | Bakery & Extras | Piece | ₹42.00 | ₹50.00 | Catalogue (Stock = 0.00) |
| 280 | Maggi Masala-e-Magic Seasoning 6g Sachet | Bakery & Extras | Piece | ₹4.20 | ₹5.00 | Catalogue (Stock = 0.00) |
| 281 | Maggi Rich Tomato Ketchup 500g Bottle | Bakery & Extras | Piece | ₹95.00 | ₹115.00 | Catalogue (Stock = 0.00) |
| 282 | Maggi Rich Tomato Sauce 90g Pouch | Bakery & Extras | Piece | ₹12.50 | ₹15.00 | Catalogue (Stock = 0.00) |
| 283 | Mayora Malkist BBQ Crackers 100g | Bakery & Extras | Piece | ₹21.00 | ₹25.00 | Catalogue (Stock = 0.00) |
| 284 | Mayora Malkist Cappuccino Crackers 100g | Bakery & Extras | Piece | ₹21.00 | ₹25.00 | Catalogue (Stock = 0.00) |
| 285 | Mayora Malkist Cheese Crackers 100g | Bakery & Extras | Piece | ₹21.00 | ₹25.00 | Catalogue (Stock = 0.00) |
| 286 | Mayora Malkist Cheese Crackers 144g | Bakery & Extras | Piece | ₹29.00 | ₹35.00 | Catalogue (Stock = 0.00) |
| 287 | Mayora Malkist Chocolate Crackers 100g | Bakery & Extras | Piece | ₹21.00 | ₹25.00 | Catalogue (Stock = 0.00) |
| 288 | Mayora Malkist Chocolate Crackers 144g | Bakery & Extras | Piece | ₹29.00 | ₹35.00 | Catalogue (Stock = 0.00) |
| 289 | Mayora Malkist Sugar Glazed Crackers 100g | Bakery & Extras | Piece | ₹16.80 | ₹20.00 | Catalogue (Stock = 0.00) |
| 290 | Moti Lasun Sev 200g | Bakery & Extras | Piece | ₹32.00 | ₹40.00 | Catalogue (Stock = 0.00) |
| 291 | Moti Makka (Corn) Chiwda 200g | Bakery & Extras | Piece | ₹32.00 | ₹40.00 | Catalogue (Stock = 0.00) |
| 292 | Moti Poha Chiwda 200g | Bakery & Extras | Piece | ₹32.00 | ₹40.00 | Catalogue (Stock = 0.00) |
| 293 | Moti Potato Salli Falahari Chiwda 100g | Bakery & Extras | Piece | ₹24.00 | ₹30.00 | Catalogue (Stock = 0.00) |
| 294 | Moti Potato Salli Falahari Chiwda 200g | Bakery & Extras | Piece | ₹48.00 | ₹60.00 | Catalogue (Stock = 0.00) |
| 295 | Moti Sabudana Falahari Chiwda 100g | Bakery & Extras | Piece | ₹20.00 | ₹25.00 | Catalogue (Stock = 0.00) |
| 296 | Moti Sabudana Falahari Chiwda 200g | Bakery & Extras | Piece | ₹41.00 | ₹50.00 | Catalogue (Stock = 0.00) |
| 297 | Moti Sabudana Falahari Chiwda 500g | Bakery & Extras | Piece | ₹98.00 | ₹120.00 | Catalogue (Stock = 0.00) |
| 298 | Moti Tikha Gathiya 200g | Bakery & Extras | Piece | ₹32.00 | ₹40.00 | Catalogue (Stock = 0.00) |
| 299 | Nescafe Classic Coffee 100g Glass Jar | Bakery & Extras | Piece | ₹270.00 | ₹320.00 | Catalogue (Stock = 0.00) |
| 300 | Nescafe Classic Coffee 25g Pouch | Bakery & Extras | Piece | ₹54.00 | ₹65.00 | Catalogue (Stock = 0.00) |
| 301 | Nescafe Classic Coffee 50g Glass Jar | Bakery & Extras | Piece | ₹138.00 | ₹165.00 | Catalogue (Stock = 0.00) |
| 302 | Nescafe Sunrise Coffee Mix 50g Pouch | Bakery & Extras | Piece | ₹62.00 | ₹75.00 | Catalogue (Stock = 0.00) |
| 303 | Nestle Everyday Dairy Whitener 1kg Pouch | Bakery & Extras | Piece | ₹340.00 | ₹395.00 | Catalogue (Stock = 0.00) |
| 304 | Nestle Everyday Dairy Whitener 200g Pouch | Bakery & Extras | Piece | ₹72.00 | ₹85.00 | Catalogue (Stock = 0.00) |
| 305 | Nestle Everyday Dairy Whitener 400g Pouch | Bakery & Extras | Piece | ₹140.00 | ₹165.00 | Catalogue (Stock = 0.00) |
| 306 | Nestle KitKat 2 Finger Chocolate 12.8g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 307 | Nestle KitKat 2 Finger Chocolate 27.5g | Bakery & Extras | Piece | ₹16.80 | ₹20.00 | Catalogue (Stock = 0.00) |
| 308 | Nestle KitKat 4 Finger Chocolate 37.3g | Bakery & Extras | Piece | ₹25.00 | ₹30.00 | Catalogue (Stock = 0.00) |
| 309 | Nestle KitKat Chunky 40g | Bakery & Extras | Piece | ₹33.50 | ₹40.00 | Catalogue (Stock = 0.00) |
| 310 | Nestle KitKat Dessert Delight 50g | Bakery & Extras | Piece | ₹50.00 | ₹60.00 | Catalogue (Stock = 0.00) |
| 311 | Nestle Milkmaid Condensed Milk 400g Tin | Bakery & Extras | Piece | ₹122.00 | ₹145.00 | Catalogue (Stock = 0.00) |
| 312 | Nestle Milkybar White Chocolate 12.5g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 313 | Nestle Milkybar White Chocolate 25g | Bakery & Extras | Piece | ₹16.80 | ₹20.00 | Catalogue (Stock = 0.00) |
| 314 | Nestle Munch Chocolate Wafer 10.1g | Bakery & Extras | Piece | ₹4.20 | ₹5.00 | Catalogue (Stock = 0.00) |
| 315 | Nestle Munch Chocolate Wafer 18g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 316 | Nestle Munch Max Wafer 32g | Bakery & Extras | Piece | ₹16.80 | ₹20.00 | Catalogue (Stock = 0.00) |
| 317 | Nestle Munch Nuts Bar 32g | Bakery & Extras | Piece | ₹16.80 | ₹20.00 | Catalogue (Stock = 0.00) |
| 318 | Parle 20-20 Butter Cookies 35g | Bakery & Extras | Piece | ₹4.20 | ₹5.00 | Catalogue (Stock = 0.00) |
| 319 | Parle 20-20 Butter Cookies 68g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 320 | Parle Bourbon Chocolate Sandwich 54g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 321 | Parle Coconut Crunch Biscuits 85g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 322 | Parle Fab Vanilla Cream 42g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 323 | Parle Happy Happy Choco Brownie Cake 45g | Bakery & Extras | Piece | ₹12.50 | ₹15.00 | Catalogue (Stock = 0.00) |
| 324 | Parle Happy Happy Choco Chip 32g | Bakery & Extras | Piece | ₹21.00 | ₹25.00 | Catalogue (Stock = 0.00) |
| 325 | Parle Happy Happy Choco Chip 65g | Bakery & Extras | Piece | ₹4.20 | ₹5.00 | Catalogue (Stock = 0.00) |
| 326 | Parle Happy Happy Choco Mawa Cake 35g | Bakery & Extras | Piece | ₹12.50 | ₹15.00 | Catalogue (Stock = 0.00) |
| 327 | Parle Happy Happy Vanilla Cake 35g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 328 | Parle Hide and Seek Black Bourbon 30g | Bakery & Extras | Piece | ₹21.00 | ₹25.00 | Catalogue (Stock = 0.00) |
| 329 | Parle Hide and Seek Choco Chip 33g | Bakery & Extras | Piece | ₹25.00 | ₹30.00 | Catalogue (Stock = 0.00) |
| 330 | Parle Hide and Seek Milano Choco Chip 20g | Bakery & Extras | Piece | ₹29.00 | ₹35.00 | Catalogue (Stock = 0.00) |
| 331 | Parle Jam-In Mixed Fruit Jam 50g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 332 | Parle Krackjack Sweet and Salty 30.g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 333 | Parle Krackjack Sweet and Salty 50g | Bakery & Extras | Piece | ₹4.20 | ₹5.00 | Catalogue (Stock = 0.00) |
| 334 | Parle Magix Chocolate Cream 32g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 335 | Parle Marie Gold 65g | Bakery & Extras | Piece | ₹25.00 | ₹30.00 | Catalogue (Stock = 0.00) |
| 336 | Parle Monaco Classic Salted 52g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 337 | Parle Monaco Jeera Crackers 46g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 338 | Parle Nice Sugar Sprinkled Coconut Biscuit 68g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 339 | Parle-G Gold Biscuit 68g | Bakery & Extras | Piece | ₹8.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 340 | Rambandhu Pav Bhaji Masala 50g | Bakery & Extras | Piece | ₹32.00 | ₹40.00 | Catalogue (Stock = 0.00) |
| 341 | Sprite 1.25L Pet Bottle | Bakery & Extras | Piece | ₹54.00 | ₹65.00 | Catalogue (Stock = 0.00) |
| 342 | Suhana Chicken Biryani Mix 18g | Bakery & Extras | Piece | ₹40.00 | ₹50.00 | Catalogue (Stock = 0.00) |
| 343 | Suhana Kitchen King Masala 18g | Bakery & Extras | Piece | ₹68.00 | ₹85.00 | Catalogue (Stock = 0.00) |
| 344 | Suhana Sambhar Masala 18g | Bakery & Extras | Piece | ₹32.00 | ₹40.00 | Catalogue (Stock = 0.00) |
| 345 | Sunreach Aqua Water 1 Litre Bottle | Bakery & Extras | Piece | ₹12.00 | ₹20.00 | Catalogue (Stock = 0.00) |
| 346 | Sunreach Aqua Water 20 Litre Jar | Bakery & Extras | Piece | ₹45.00 | ₹70.00 | Catalogue (Stock = 0.00) |
| 347 | Sunreach Aqua Water 250ml Bottle | Bakery & Extras | Piece | ₹4.50 | ₹7.00 | Catalogue (Stock = 0.00) |
| 348 | Sunreach Aqua Water 500ml Bottle | Bakery & Extras | Piece | ₹6.50 | ₹10.00 | Catalogue (Stock = 0.00) |
| 349 | Temptin Green Chilli Sauce 80g Bottle | Bakery & Extras | Piece | ₹48.00 | ₹60.00 | Catalogue (Stock = 0.00) |
| 350 | Temptin Pizza & Pasta Sauce 100g Pauch | Bakery & Extras | Piece | ₹60.00 | ₹75.00 | Catalogue (Stock = 0.00) |
| 351 | Temptin Red Chilli Sauce 80g Pauch | Bakery & Extras | Piece | ₹48.00 | ₹60.00 | Catalogue (Stock = 0.00) |
| 352 | Temptin Schezwan Chutney 100g Squeezo | Bakery & Extras | Piece | ₹52.00 | ₹65.00 | Catalogue (Stock = 0.00) |
| 353 | Temptin Tomato Ketchup 80g Pouch | Bakery & Extras | Piece | ₹24.00 | ₹30.00 | Catalogue (Stock = 0.00) |
| 354 | Thums Up 250ml Pet Bottle | Bakery & Extras | Piece | ₹16.50 | ₹20.00 | Catalogue (Stock = 0.00) |
| 355 | Thums Up 750ml Pet Bottle | Bakery & Extras | Piece | ₹33.50 | ₹40.00 | Catalogue (Stock = 0.00) |
| 356 | Unibic Biscott Caramel Biscuits 150g | Bakery & Extras | Piece | ₹41.00 | ₹50.00 | Catalogue (Stock = 0.00) |
| 357 | Unibic Biscott Caramel Biscuits 75g | Bakery & Extras | Piece | ₹20.50 | ₹25.00 | Catalogue (Stock = 0.00) |
| 358 | Unibic Biscott Coffee Biscuits 75g | Bakery & Extras | Piece | ₹20.50 | ₹25.00 | Catalogue (Stock = 0.00) |
| 359 | Unibic Biscott Spiced Cinnamon 75g | Bakery & Extras | Piece | ₹20.50 | ₹25.00 | Catalogue (Stock = 0.00) |
| 360 | Unibic Butter Cookies 150g | Bakery & Extras | Piece | ₹33.00 | ₹40.00 | Catalogue (Stock = 0.00) |
| 361 | Unibic Butter Cookies 75g | Bakery & Extras | Piece | ₹16.50 | ₹20.00 | Catalogue (Stock = 0.00) |
| 362 | Unibic Cashew Butter Cookies 75g | Bakery & Extras | Piece | ₹20.50 | ₹25.00 | Catalogue (Stock = 0.00) |
| 363 | Unibic Choco Chip Cookies 150g | Bakery & Extras | Piece | ₹33.00 | ₹40.00 | Catalogue (Stock = 0.00) |
| 364 | Unibic Choco Chip Cookies 75g | Bakery & Extras | Piece | ₹16.50 | ₹20.00 | Catalogue (Stock = 0.00) |
| 365 | Unibic Fruit & Nut Cookies 75g | Bakery & Extras | Piece | ₹20.50 | ₹25.00 | Catalogue (Stock = 0.00) |
| 366 | Unibic Oatmeal Digestive Cookies 75g | Bakery & Extras | Piece | ₹20.50 | ₹25.00 | Catalogue (Stock = 0.00) |
| 367 | Unibic Snappers Potato Crackers 75g | Bakery & Extras | Piece | ₹16.50 | ₹20.00 | Catalogue (Stock = 0.00) |

---

## 🛡️ Protection Guarantees

1. **Zero Data Deletion:** No product, batch, or transaction row was deleted or truncated.
2. **Shop Prices Preserved:** All 368 shop purchase and selling rates remain 100% untouched.
3. **Catalogue Access:** All 368 products remain instantly searchable and accessible in the Product Catalogue.
