# 🏛️ Comprehensive Database Architecture & Inventory Audit Report
**Project:** Yogeshwari Dairy Shop & Inventory Management System  
**Audit Author:** Senior Full-Stack Engineer, Supabase Database Architect & QA Lead  
**Audit Date:** 2026-11-15  
**Database Target:** Supabase PostgreSQL (`pfamoxreojbejufwhgiu.supabase.co`)  
**Frontend / Client:** React 18, Vite, TypeScript, Tailwind CSS, PWA / Capacitor  
**Backend:** Node.js, Express, Supabase JS Client  

---

## 📌 Executive Summary

This mandatory Phase 1 audit inspects the complete codebase, existing SQL migrations (Phases 1–54), live Supabase tables, frontend state contexts, barcode handlers, and stock movement logic.

### Live Production Database Snapshot:
- **`public.products`**: Exactly **368** products in live database.
- **`public.batches`**: **373** lot-level batches.
- **`public.stock_movements`**: **0** rows.
- **`public.sales`**: **0** rows.
- **`public.product_returns`**: **4** rows.
- **`public.udhar_customers`**: **3** customers.
- **`public.admin_audit_logs`**: **210** audit events.
- **PackSense India Dataset Downloaded:** `data/packsense/raw/india_products.csv` (25,209 rows, 5.40 MB, SHA-256 verified).

---

## 1. Existing Database Tables & Responsibilities

The database currently consists of 19 relational tables created across phases 1–54:

| Table Name | Primary Responsibility | Primary Key | Critical Foreign Keys | Current Live Row Count |
| :--- | :--- | :--- | :--- | :--- |
| **`products`** | Master catalogue and current stock levels | `id (UUID)` | `category_id`, `brand_id`, `unit_id` | **368** |
| **`batches`** | FEFO lot tracking with expiry dates | `id (UUID)` | `product_id -> products(id)`, `supplier_id` | **373** |
| **`stock_movements`** | Immutable double-entry ledger for stock in/out | `id (UUID)` | `product_id -> products(id)`, `batch_id` | **0** |
| **`purchases`** | Supplier invoices and purchase orders | `id (UUID)` | `supplier_id -> suppliers(id)` | **0** |
| **`sales`** | POS counter sale header invoices | `id (UUID)` | Auth user / Admin operator | **0** |
| **`sale_items`** | Line items for each completed bill | `id (UUID)` | `sale_id -> sales(id)`, `product_id` | **0** |
| **`sale_batch_allocations`**| Specific FEFO lot deducted per line item | `id (UUID)` | `sale_id`, `sale_item_id`, `batch_id` | **0** |
| **`damage_records`** | Spoilage, breakage, and waste write-offs | `id (UUID)` | `product_id`, `batch_id` | **0** |
| **`product_returns`** | Customer returns with condition (Damaged/Resellable) | `id (UUID)` | `sale_id` | **4** |
| **`supplier_returns`** | Outward return of expired/damaged stock to vendor | `id (UUID)` | `supplier_id`, `product_id`, `batch_id` | **0** |
| **`categories`** | Master product categories | `id (UUID)` | None | **7** |
| **`brands`** | Master brand registry | `id (UUID)` | None | **16** |
| **`units`** | Measurement units (`Litre`, `Kg`, `Packet`, `Piece`) | `id (UUID)` | None | **7** |
| **`suppliers`** | Vendor directory with GST details | `id (UUID)` | None | **1** |
| **`udhar_customers`** | Credit Khata customer ledger | `id (UUID)` | None | **3** |
| **`udhar_transactions`** | Credit given and repayments received | `id (UUID)` | `customer_id -> udhar_customers(id)` | **0** |
| **`expenses`** | Operating expenses & shop capital investments | `id (UUID)` | None | **0** |
| **`profiles`** | Authenticated user profiles (Owner, Admin) | `id (UUID)` | `auth_user_id -> auth.users(id)` | **2** |
| **`admin_audit_logs`** | Real-time immutable audit trail for shop owner | `id (UUID)` | None | **210** |

---

## 2. Existing Product Catalogue Structure

The `public.products` table schema currently holds both catalogue information and current inventory counters:

```sql
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    marathi_name VARCHAR(255),
    hindi_name VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    brand VARCHAR(100),              -- Recently added
    brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
    unit VARCHAR(50) NOT NULL,
    unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    stock_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Current stock counter
    min_stock NUMERIC(12, 2) NOT NULL DEFAULT 10.00,
    max_stock NUMERIC(12, 2) NOT NULL DEFAULT 100.00,
    min_stock_alert NUMERIC(12, 2) NOT NULL DEFAULT 10.00,
    gst_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    shelf_life_days INTEGER DEFAULT 2,
    has_expiry BOOLEAN NOT NULL DEFAULT TRUE,
    barcode VARCHAR(100),            -- Single 1:1 barcode column
    sku VARCHAR(50),
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3. How Current Stock Quantity is Calculated

The system currently has two different stock representations:

1. **Denormalized Counter (`products.stock_quantity`)**:
   - Directly stored on `public.products`.
   - Updated whenever sales are completed or stock is received.
   - Queried directly by `StoreContext.tsx` and displayed in `ProductList.tsx` and `BillingCounter.tsx`.

2. **Aggregated Batch Stock (`SUM(batches.qty_remaining)`)**:
   - Maintained in `public.batches` where `status = 'ACTIVE'` and `qty_remaining > 0`.
   - Used by FEFO sales logic (`fn_fefo_deduct_and_allocate`) and `ExpiryDashboard.tsx`.

3. **Database View (`v_product_stock`)**:
   ```sql
   COALESCE(SUM(b.qty_remaining), p.stock_quantity) AS current_stock
   ```
   If batches exist, the sum of `b.qty_remaining` is used; otherwise, it falls back to `p.stock_quantity`.

---

## 4. Why the Existing 368 Products Appear Under Current Inventory

### Root Cause Analysis:
1. **Coupled Seeding Scripts (Phases 30–50)**:
   In migrations `30_phase30_gramilk_in_stock_inventory.sql` through `all_new_fmcg_in_stock_master.sql`, products were inserted with initial hardcoded `stock_quantity` (e.g., 50, 96, 72) and simultaneous dummy batch rows in `public.batches`.
2. **UI Architecture Lack of Filter**:
   In `src/components/Inventory/ProductList.tsx`, the query is:
   ```ts
   supabase.from('products').select('*').order('name', { ascending: true })
   ```
   The UI does not filter by `stock_quantity > 0`. Every record present in `public.products` is displayed in the "शिल्लक माल (Inventory)" view.
3. **No Separation between Catalogue and Physical Inventory**:
   The application currently lacks a dedicated **"Product Master Catalogue"** view vs a **"Current In-Stock Inventory"** view. As a result, adding any product to `public.products` makes it immediately visible in the inventory list.

---

## 5. Existing Stock-In and Stock-Out Logic

### Stock-In:
1. **Manual Inward (`StockInwardModal.tsx`)**:
   - Calls `fn_record_stock_inward_batch` RPC.
   - Creates a new row in `public.batches` with `qty_received` and `qty_remaining`.
   - Increments `products.stock_quantity`.
   - Inserts movement into `public.stock_movements` (`movement_type = 'PURCHASE'`).
2. **Purchase Tracker (`PurchaseTracker.tsx`)**:
   - Records vendor invoice header in `public.purchases`.

### Stock-Out:
1. **POS Billing Counter (`BillingCounter.tsx`)**:
   - Calls `fn_fefo_deduct_and_allocate(p_sale_id, p_items)`.
   - Selects batches matching `product_id` ordered by `expiry_date ASC, mfg_date ASC FOR UPDATE`.
   - Decrements `batches.qty_remaining`.
   - Updates `batches.status = 'EXHAUSTED'` when `qty_remaining = 0`.
   - Decrements `products.stock_quantity`.
   - Records allocation in `sale_batch_allocations` and outward movement in `stock_movements` (`movement_type = 'SALE'`).
2. **Damage Write-Off (`DamageTracker.tsx`)**:
   - Calls `fn_record_damage_loss`.
   - Decrements batch and product stock.
   - Logs `movement_type = 'DAMAGE'`.
3. **Customer Returns (`ReturnsTracker.tsx`)**:
   - If return condition is `Resellable`, increments batch and product stock (`movement_type = 'SALE_RETURN'`).
   - If `Damaged_Waste`, stock is not increased.

---

## 6. Existing Triggers and RPC Functions Affecting Stock

| RPC Function | Location / File | Effect on Stock | Concurrency Safe? |
| :--- | :--- | :--- | :--- |
| **`fn_fefo_deduct_and_allocate`** | `09_phase9_stored_procedures.sql` | Decrements `batches.qty_remaining` & `products.stock_quantity` | ✅ Yes (`SELECT ... FOR UPDATE`) |
| **`fn_record_stock_inward_batch`** | `09_phase9_stored_procedures.sql` | Increments `products.stock_quantity`, inserts `batches` row | ✅ Yes (Atomic transaction) |
| **`fn_cancel_sale_atomic`** | `09_phase9_stored_procedures.sql` | Reverses batch deductions, increments `products.stock_quantity` | ✅ Yes |
| **`fn_record_damage_loss`** | `09_phase9_stored_procedures.sql` | Decrements batch and product stock | ✅ Yes |
| **`fn_record_expired_stock_removal`** | `09_phase9_stored_procedures.sql` | Sets batch `status = 'EXPIRED'`, writes off remaining qty | ✅ Yes |
| **`fn_reset_all_products_stock_to_zero`** | `54_phase54_reset_stock_to_zero.sql` | Sets all `stock_quantity = 0` and batches `status = 'EXHAUSTED'` | ✅ Yes (Transaction block) |

---

## 7. Existing Barcode Functionality

1. **Storage**: Stored as a single string column `products.barcode VARCHAR(100)`.
2. **Scanning**: `src/components/Scanner/BarcodeScannerModal.tsx` uses `@zxing/browser` (`BrowserMultiFormatReader`) accessing device camera.
3. **Lookup**:
   - In `BarcodeScannerModal`: `products.find(p => p.barcode === scannedCode)`.
   - In `BillingCounter`: `deferredSearchQuery` filters `p.barcode.includes(q)`.
4. **Current Shortcoming**:
   - **No 1:N Mapping**: A product can only have one barcode. Packaged FMCG items often possess multiple GTINs / EANs across different packaging revisions.
   - **No Barcode Table**: Barcodes are directly embedded in `products`, meaning external catalogue barcodes cannot be indexed independently of shop inventory.
   - **No Unique Constraint**: `barcode` is not currently constrained to be unique in `public.products`.

---

## 8. Duplicate Product & Barcode Risks

1. **Collisions in National vs Regional Products**:
   - If 21,963 PackSense products are inserted into `public.products` without a separate `product_barcodes` mapping, barcodes with leading zeros (e.g. `00123456`) could be corrupted if handled as numbers.
2. **Variant Collisions**:
   - Products sharing brand and base name (e.g. *Amul Butter 100g* vs *Amul Butter 500g*) have distinct barcodes. A naive merge on name will break inventory tracking.
3. **PackSense Duplicates**:
   - In the raw PackSense dataset, all 25,150 valid barcodes are unique (0 barcode duplicates in raw source). However, 59 rows contained dummy/corrupted codes (e.g. `0000000000000`) which must be rejected.

---

## 9. Data Migration Risks

| Risk | Severity | Mitigation Strategy |
| :--- | :--- | :--- |
| **Catalogue Import creates fake stock** | 🚨 CRITICAL | Enforce strictly `stock_quantity = 0` and zero batch creation for all imported catalogue items. |
| **Overwriting shop-specific prices** | 🚨 CRITICAL | Never overwrite existing 368 products' `purchase_price` or `selling_price` with PackSense data. |
| **Deleting existing 368 products or history** | 🚨 CRITICAL | Use additive migrations only. Never run `TRUNCATE`, `DROP`, or `DELETE` on existing tables. |
| **Frontend memory crash on mobile devices** | ⚠️ HIGH | Do NOT fetch all 22,000 products into frontend `localStorage` or initial load. Keep Catalogue search server-side / paginated. |
| **Corrupted barcode leading zeros** | ⚠️ HIGH | Store all barcodes strictly as `TEXT`, never numeric or bigint. |

---

## 10. Recommended Database & System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. MASTER PRODUCT CATALOGUE (public.products)                              │
│ - Stores all 368 shop items + imported PackSense catalogue items            │
│ - Catalogue items have stock_quantity = 0.00 until physically stocked in    │
│ - Preserves shop purchase_price & selling_price where configured            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 1:N
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 2. PRODUCT BARCODES (public.product_barcodes) [NEW TABLE]                   │
│ - id (UUID), product_id (UUID FK), barcode (TEXT UNIQUE)                    │
│ - barcode_type ('EAN-13', 'UPC-A', 'CODE-128')                             │
│ - is_primary (BOOLEAN), source ('PackSense', 'Manual', 'Shop')              │
│ - Supports multiple barcodes per product variant                            │
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

### Screen & UI Separation Recommendation:
1. **"Product Catalogue" (`/catalogue`)**: Browse all products (in-stock + out-of-stock).
2. **"Current Inventory" (`/inventory`)**: Displays **ONLY** items where `stock_quantity > 0` or active batches exist.
3. **"Stock Inward via Barcode"**: Scan barcode -> shows product details -> enter qty & price -> confirm -> adds stock.

---

> [!CAUTION]
> **GATEWAY APPROVAL CHECKPOINT (PHASE 1 & 2 COMPLETE):**  
> No existing data was deleted or altered.  
> The raw PackSense India dataset has been downloaded and verified (`25,209` rows, `5,657,152` bytes, SHA-256: `9007b7a48fe9bc129e6a90a6fc7dfb4dfdcb6a72f53b3a3aabc74eda0d5d1951`).  
> The cleaned dataset (`21,963` rows) and matching reports have been generated in `data/packsense/`.  
> We will proceed with the database schema migration and frontend UI separation upon your review.
