# Cadbury Chocolates & Confectionery Catalog & In-Stock Migration (Phase 37)

This folder contains the complete database migration and in-stock setup for **Cadbury (Mondelez India)** products for **Yogeshwari Dairy Shop ERP**.

## Product Lines Covered (51 Products)

1. **Cadbury Dairy Milk (Core Bars)**: 13.2g (₹10), 24g (₹20), 50g (₹45), 130g (₹100), 160g Maha Pack (₹150), Crackle (36g), Fruit & Nut (36g), Roast Almond (36g)
2. **Cadbury Dairy Milk Silk Range**: Silk Plain Chocolate (60g, 150g), Fruit & Nut (55g, 137g), Roast Almond (55g, 137g), Oreo (60g, 130g), Hazelnut (58g, 143g), Bubbly (50g, 120g), Mousse (50g)
3. **Cadbury 5 Star**: 10.1g (₹5), 20g (₹10), 40g (₹20), 3D Chocolate (42g)
4. **Cadbury Perk**: Wafer Chocolate 13g (₹5), 28g (₹10), Perk 40% Extra (40g)
5. **Cadbury Fuse**: Peanut & Caramel (24g, 45g), Almond & Peanut (45g)
6. **Cadbury Gems**: Pouch 7.9g (₹5), 18.2g (₹10), 38.6g (₹20), Gems Tube 34g, Gems Surprise Ball 17.6g
7. **Cadbury Celebrations (Gift Boxes)**: Assorted Gift Pack (114g, 183.6g), Premium Gift Box 281g, Rich Dry Fruit Gift Pack 177g
8. **Cadbury Bournvita**: Health Drink 500g Jar, 1kg Refill, 5 Star Magic 500g Jar, 200g Pouch
9. **Cadbury Chocobakes, Crispello & Lickables**: Choc Layered Cake (21g, 126g 6-pack), Choc Filled Cookies (75g, 150g), Dairy Milk Crispello (35g), Dairy Milk Lickables (20g)

## Database Schema Compatibility

- **Category**: `Bakery & Extras`
- **Unit**: `Piece`
- **Tables targeted**: `public.products`, `public.batches`
- **ERP Schema Safe**: Safely excludes non-existent columns (`brand_id`, `min_stock`, `max_stock`) and uses `min_stock_alert`.
- **FEFO Batch Tracking**: Creates matching inward batch records with automatic batch code prefix (`CDB-`), manufactured dates, expiration dates, and pricing.

## How to Apply

Run any of the identical SQL scripts in the **Supabase Dashboard SQL Editor**:
- [`cadbury/instock.sql`](file:///d:/Projects/Yogeshwari%20Dairy%20Shop%20Inventory%20System/cadbury/instock.sql)
- [`cadbury/cadbury_instock.sql`](file:///d:/Projects/Yogeshwari%20Dairy%20Shop%20Inventory%20System/cadbury/cadbury_instock.sql)
- [`supabase/37_phase37_cadbury_chocolates_in_stock_inventory.sql`](file:///d:/Projects/Yogeshwari%20Dairy%20Shop%20Inventory%20System/supabase/37_phase37_cadbury_chocolates_in_stock_inventory.sql)

