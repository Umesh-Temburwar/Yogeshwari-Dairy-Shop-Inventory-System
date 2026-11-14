# 🏛️ Database Migration & Schema Architecture Guide
**Project:** Yogeshwari Dairy Shop & Inventory Management System  
**Migration:** `supabase/55_phase55_product_barcodes_and_catalogue_architecture.sql`  
**Database Target:** Supabase PostgreSQL (`pfamoxreojbejufwhgiu.supabase.co`)

---

## 📌 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. MASTER PRODUCT CATALOGUE (public.products)                              │
│ - Stores all shop items + imported PackSense catalogue items                │
│ - Catalogue items default to stock_quantity = 0.00 until physically added   │
│ - Preserves shop purchase_price & selling_price where configured            │
│ - Additive fields: brand, pack_size, source, source_code, description       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 1:N
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 2. PRODUCT BARCODES (public.product_barcodes) [NEW TABLE]                   │
│ - id (UUID PK), product_id (UUID FK), barcode (TEXT UNIQUE)                 │
│ - barcode_type ('EAN-13', 'UPC-A', 'CODE-128')                             │
│ - is_primary (BOOLEAN), source ('PackSense', 'MANUAL', 'SHOP')              │
│ - Supports multiple barcodes per product variant                            │
│ - Indexes on barcode and product_id                                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 1:N
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 3. PRODUCT BATCHES & ACTUAL INVENTORY (public.batches)                      │
│ - Tracks REAL physical lots received via confirmed stock-in                 │
│ - qty_received, qty_remaining, mfg_date, expiry_date                         │
│ - FEFO stock deduction via fn_fefo_deduct_and_allocate                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 1:N
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 4. AUDITABLE STOCK MOVEMENTS (public.stock_movements)                       │
│ - Immutable ledger of all PURCHASE, SALE, RETURN, DAMAGE, ADJUSTMENT        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔒 2. Safety & Non-Destructive Principles

- **Zero Drop / Truncate:** Never uses `DROP TABLE`, `TRUNCATE`, or bulk `DELETE`.
- **Foreign Keys & Cascades:** `product_barcodes.product_id` cascades safely on product removal.
- **Data Preservation:** Existing 368 products remain untouched.
- **Backfill:** Existing `products.barcode` values are automatically migrated into `product_barcodes`.
- **Atomic Operations:** All stock increments occur inside atomic PostgreSQL transactions via `fn_barcode_stock_in`.

---

## 🛠️ 3. How to Apply Migration 55 in Supabase

1. Open your Supabase Project:
   **[https://supabase.com/dashboard/project/pfamoxreojbejufwhgiu](https://supabase.com/dashboard/project/pfamoxreojbejufwhgiu)**
2. In the left sidebar, click **"SQL Editor"**.
3. Click **"+ New query"**.
4. Open `supabase/55_phase55_product_barcodes_and_catalogue_architecture.sql` and copy its entire contents.
5. Paste into the SQL editor and click **"Run"** (or press `Ctrl + Enter`).
6. Verify output shows:
   ```
   ✅ Migration Phase 55 successful
   ```

---

## ⚡ 4. RPC Functions Introduced

### 1. `public.fn_search_product_by_barcode(p_barcode TEXT)`
- Fast lookup across `public.product_barcodes` and fallback on `public.products.barcode`.
- Returns product details, brand, pack size, current available stock, purchase price, selling price.

### 2. `public.fn_barcode_stock_in(...)`
- Atomic inward operation:
  1. Finds product by barcode.
  2. Creates lot in `public.batches`.
  3. Updates `public.products.stock_quantity`.
  4. Records immutable entry in `public.stock_movements`.
  5. Logs action into `public.admin_audit_logs`.

### 3. `public.fn_register_product_and_barcode(...)`
- Registers product in catalogue with **strictly `stock_quantity = 0.00`**.
- Maps barcode in `public.product_barcodes`.
