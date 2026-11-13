# Britannia, Oreo & Unibic Catalog & In-Stock Migration (Phase 36)

This folder contains the complete database migration and in-stock setup for **Britannia**, **Cadbury Oreo**, and **Unibic** products for **Yogeshwari Dairy Shop ERP**.

## Brands & Lines Covered (57 Products)

1. **Britannia Good Day**: Butter Cookies, Cashew Cookies, Pista Badam Cookies, Choco Chip Cookies, Harmony Cookies
2. **Britannia Treat & Jim Jam**: Treat Jim Jam (60g, 138g, 200g), Treat Chocolate Cream, Treat Strawberry Cream, Treat Vanilla Cream, Treat Pineapple Cream
3. **Britannia NutriChoice**: Digestive (100g, 250g), 5 Grain Digestive, Oats Biscuits, Sugar Free Cream Crackers (100g, 300g), Herbs Cracker
4. **Britannia Milk Bikis**: Milk Biscuits (65g, 130g), Classic (200g)
5. **Britannia Marie Gold**: 89g, 175g, 300g, 1kg mega pack
6. **Britannia 50-50 & Little Hearts**: 50-50 Maska Chaska (50g, 120g), Sweet & Salty, Golmaal, Little Hearts Classic (34.5g, 75g)
7. **Britannia Bourbon, Nice Time & Pure Magic**: Bourbon Chocolate Cream (60g, 150g, 250g), Nice Time Coconut (73g, 150g), Pure Magic Choco Lush (75g)
8. **Britannia Toastea Premium Rusks & Cakes**: Premium Bake Rusk (200g, 400g), Milk Rusk, Elaichi Rusk, Fruit Cake, Chocolate Cake
9. **Cadbury Oreo**: Original Vanilla Cream (46g, 120g, 288g), Chocolate Cream (46g, 120g), Strawberry Cream (46g, 120g), Golden Vanilla (120g), Red Velvet (120g)
10. **Unibic Cookies & Crackers**: Choco Chip Cookies (75g, 150g), Butter Cookies (75g, 150g), Cashew Butter (75g), Oatmeal Digestives (75g), Fruit & Nut Cookies (75g), Snappers Potato Crackers (75g)

## Database Schema Compatibility

- **Category**: `Bakery & Extras`
- **Unit**: `Piece`
- **Tables targeted**: `public.products`, `public.batches`
- **Compatible with ERP schema**: Omits absent columns (`brand_id`, `min_stock`, `max_stock`) and uses `min_stock_alert`.
- **FEFO Batch Tracking**: Creates matching inward batch entries with manufactured date, expiry date, purchase price, and selling price.

## How to Apply

Execute either of the following identical files in the **Supabase Dashboard SQL Editor**:
- [`britannia/instock.sql`](file:///d:/Projects/Yogeshwari%20Dairy%20Shop%20Inventory%20System/britannia/instock.sql)
- [`britannia/britannia_instock.sql`](file:///d:/Projects/Yogeshwari%20Dairy%20Shop%20Inventory%20System/britannia/britannia_instock.sql)
- [`supabase/36_phase36_britannia_oreo_unibic_biscuits.sql`](file:///d:/Projects/Yogeshwari%20Dairy%20Shop%20Inventory%20System/supabase/36_phase36_britannia_oreo_unibic_biscuits.sql)

