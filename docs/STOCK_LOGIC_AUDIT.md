# 🔍 Comprehensive Stock Logic & Inventory Architecture Audit Report
**Project:** Yogeshwari Dairy Shop & Inventory Management System  
**Document:** `docs/STOCK_LOGIC_AUDIT.md`  
**Date:** 2026-11-15  
**Auditor:** Senior Supabase Database Architect & Full-Stack Inventory Engineer  
**Database Target:** Supabase PostgreSQL (`pfamoxreojbejufwhgiu.supabase.co`)  

---

## 📌 Executive Summary

This mandatory Phase 1 audit inspects the live Supabase database schema, historical SQL migrations (Phases 1–55), frontend React/TypeScript state management (`StoreContext.tsx`), backend Express controllers, and database triggers/RPC functions.

### Core Audit Findings:
1. **Live Database Status:**
   - `public.products`: **368** products in live database.
   - `public.batches`: **373** lot-level batches. All 373 batches currently have `qty_remaining = 0.00` and `status = 'EXHAUSTED'` (following Phase 54 zero reset).
   - `public.products.stock_quantity`: Exactly **367** products have `stock_quantity = 0.00`. Exactly **1** product (`Amul Alphonso Mango Ice Cream Cup 100ml`) has `stock_quantity = 1.00`.
   - `public.stock_movements`: **0** rows.
   - `public.sales` & `public.sale_items`: **0** rows.
   - `public.product_returns`: **4** rows.
   - `public.supplier_returns`: **0** rows.
   - `public.admin_audit_logs`: **211** rows.
2. **Root Cause of Products Appearing Under Current Inventory:**
   - **Frontend UI Display Filter Missing:** In `ProductList.tsx`, the main inventory table/card renderer simply filtered on `searchQuery` and `category`. There was **no condition requiring `stock_quantity > 0`** to be considered "Current Inventory". Thus, every catalogue product in `public.products` was rendered on screen regardless of whether it was in stock or zero stock.
   - **Historical Seed Migrations Coupled Catalogue Creation with Stock:** In SQL migration phases 30 through 50 (brand seeds for Amul, Nestle, Dairy Power, etc.), each brand script performed an `INSERT INTO public.batches (...) VALUES (..., 20, 20, 'Initial stock on product creation')` and `UPDATE public.products SET stock_quantity = 20`.
   - **Modal Default Values:** In `AddProductModal.tsx` and quick-add bars, the input field for stock quantity defaulted to `20` units instead of `0`.
3. **Database Triggers:**
   - There are **ZERO database triggers** that automatically create stock upon product creation. All stock creation originated from explicit application seed SQL or user form defaults.

---

## 1. Products Table & Stock-Related Columns

Table name: `public.products` (Live row count: **368**)

| Column Name | Data Type | Constraint / Default | Role in Stock Logic |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique product identifier. |
| `name` | `VARCHAR(255)` | `NOT NULL` | Product English display name. |
| `hindi_name` | `VARCHAR(255)` | `NULL` | Hindi localized name. |
| `marathi_name`| `VARCHAR(255)` | `NULL` | Marathi localized name. |
| `category` | `VARCHAR(100)` | `NOT NULL` | Product category ('Milk', 'Ghee', etc.). |
| `category_id` | `UUID` | `REFERENCES public.categories(id)` | Foreign key to categories table. |
| `unit` | `VARCHAR(50)` | `NOT NULL` | Packaging unit ('Piece', 'Litre', 'Kg'). |
| `unit_id` | `UUID` | `REFERENCES public.units(id)` | Foreign key to units table. |
| `purchase_price` | `NUMERIC(12, 2)` | `DEFAULT 0.00 CHECK (>= 0)` | Shop cost per unit. |
| `selling_price` | `NUMERIC(12, 2)` | `DEFAULT 0.00 CHECK (>= 0)` | Shop retail price per unit. |
| `stock_quantity` | `NUMERIC(12, 2)` | `DEFAULT 0.00` | **Aggregated available shop inventory.** |
| `min_stock_alert` | `NUMERIC(12, 2)` | `DEFAULT 10.00 CHECK (>= 0)` | Low stock threshold for reordering. |
| `shelf_life_days` | `INTEGER` | `DEFAULT 2` | Expiry calculation shelf life. |
| `has_expiry` | `BOOLEAN` | `DEFAULT TRUE` | Whether product is perishable. |
| `barcode` | `VARCHAR(100)` | `NULL` | Barcode identifier (stored as text). |
| `brand` | `VARCHAR(150)` | `NULL` (Added Phase 55) | Product manufacturer / brand name. |
| `pack_size` | `VARCHAR(100)` | `NULL` (Added Phase 55) | Pack size variant ('500ml', '1kg'). |
| `source` | `VARCHAR(50)` | `'SHOP'` (Added Phase 55) | Origin ('SHOP', 'PackSense', 'MANUAL'). |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Soft-delete / catalogue visibility flag. |

---

## 2. Inventory & Batch Tables

Table name: `public.batches` (Live row count: **373**)

| Column Name | Data Type | Constraint / Default | Role in Stock Logic |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique lot-level batch ID. |
| `product_id` | `UUID` | `NOT NULL REFERENCES products(id) ON DELETE CASCADE` | Product relationship. |
| `product_name` | `VARCHAR(255)` | `NULL` | Denormalized product name for speed. |
| `batch_no` | `VARCHAR(100)` | `NOT NULL` | Physical lot/batch tracking code. |
| `mfg_date` | `DATE` | `NOT NULL` | Manufacturing / packaging date. |
| `expiry_date` | `DATE` | `NOT NULL` | Batch expiration date for FEFO sort. |
| `qty_received` | `NUMERIC(12, 2)` | `NOT NULL CHECK (>= 0)` | Total physical units received in this lot. |
| `qty_remaining` | `NUMERIC(12, 2)` | `NOT NULL CHECK (>= 0)` | **Actual remaining available physical stock in lot.** |
| `purchase_price` | `NUMERIC(12, 2)` | `DEFAULT 0.00 CHECK (>= 0)` | Batch-specific acquisition cost. |
| `selling_price` | `NUMERIC(12, 2)` | `DEFAULT 0.00 CHECK (>= 0)` | Batch-specific retail price. |
| `supplier_id` | `UUID` | `REFERENCES suppliers(id)` | Inward vendor reference. |
| `supplier_name` | `VARCHAR(255)` | `NULL` | Supplier display name. |
| `status` | `VARCHAR(20)` | `'ACTIVE' CHECK IN ('ACTIVE', 'EXHAUSTED', 'EXPIRED', 'DISPOSED')` | Lot lifecycle state. |
| `notes` | `TEXT` | `NULL` | Audit notes ('Initial stock on product creation', 'Stock inward batch added', etc.). |

---

## 3. Stock Movement Tables

Table name: `public.stock_movements` (Live row count: **0**)

| Column Name | Data Type | Role in Stock Logic |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key. |
| `product_id` | `UUID` | Foreign Key to `public.products`. |
| `batch_id` | `UUID` | Foreign Key to `public.batches`. |
| `movement_type`| `ENUM` | `'PURCHASE'`, `'SALE'`, `'SALE_RETURN'`, `'PURCHASE_RETURN'`, `'ADJUSTMENT'`, `'DAMAGE'`, `'EXPIRED_REMOVAL'`. |
| `quantity` | `NUMERIC(12, 2)` | Quantity moved (+ for inward, - for outward). |
| `unit_cost` | `NUMERIC(12, 2)` | Acquisition cost at transaction time. |
| `unit_price` | `NUMERIC(12, 2)` | Retail price at transaction time. |
| `reference_type`| `VARCHAR(50)` | Transaction reference ('batches', 'sales', 'damage_records', 'returns'). |
| `reference_id` | `UUID` | ID of originating transaction row. |
| `notes` | `TEXT` | Audit trail description. |
| `created_at` | `TIMESTAMPTZ` | Timestamp of movement. |

---

## 4. Purchase Tables

- `public.purchases` (Live row count: **0**): Tracks supplier purchase orders and total invoice costs.
- Columns: `id`, `purchase_no`, `supplier_id`, `supplier_name`, `purchase_date`, `total_amount`, `paid_amount`, `payment_status`, `payment_mode`, `invoice_no`, `notes`, `created_at`.
- Items: In the current schema, batch inward records (`public.batches` with `supplier_id` and `supplier_name`) and `public.stock_movements` (`movement_type = 'PURCHASE'`) represent lot-level purchase items.

---

## 5. Sales & Sales Item Tables

- `public.sales` (Live row count: **0**): Tracks customer point-of-sale transactions.
  - Columns: `id`, `invoice_no`, `customer_name`, `customer_phone`, `customer_gender`, `customer_age_group`, `customer_age`, `total_amount`, `discount`, `net_amount`, `payment_mode`, `cash_amount`, `online_amount`, `udhar_amount`, `sale_date`, `created_by_name`, `counter_name`, `created_at`.
- `public.sale_items` (Live row count: **0**): Line items sold.
  - Columns: `id`, `sale_id`, `product_id`, `product_name`, `quantity`, `unit`, `unit_price`, `purchase_cost`, `total_price`, `batch_id`, `batch_no`, `expiry_date`.

---

## 6. Returns & Refunds Tables

- `public.product_returns` (Live row count: **4**): Customer sale returns.
  - Columns: `id`, `return_no`, `sale_id`, `invoice_no`, `customer_name`, `customer_phone`, `refund_mode`, `reason`, `condition`, `total_refund_amount`, `return_date`, `items` (JSONB array), `notes`.
  - Condition `'Resellable'` re-increments stock; condition `'Damaged'` / `'Expired'` records damage loss.
- `public.supplier_returns` (Live row count: **0**): Returns to suppliers for spoiled or expired stock.
  - Columns: `id`, `return_no`, `supplier_name`, `reason`, `total_refund_amount`, `refund_status`, `refund_mode`, `return_date`, `items` (JSONB array).

---

## 7. Database Triggers Audit

| Trigger Name | Target Table | Timing & Event | Action & Logic | Can Cause Duplicate Stock? |
| :--- | :--- | :--- | :--- | :--- |
| `trg_products_updated_at` | `public.products` | BEFORE UPDATE | Sets `NEW.updated_at = NOW()`. | ❌ No. Does not touch stock. |
| `trg_batches_updated_at` | `public.batches` | BEFORE UPDATE | Sets `NEW.updated_at = NOW()`. | ❌ No. Does not touch stock. |
| `trg_suppliers_updated_at` | `public.suppliers` | BEFORE UPDATE | Sets `NEW.updated_at = NOW()`. | ❌ No. |
| `trg_categories_updated_at`| `public.categories` | BEFORE UPDATE | Sets `NEW.updated_at = NOW()`. | ❌ No. |
| `trg_udhar_customers_updated_at` | `public.udhar_customers` | BEFORE UPDATE | Sets `NEW.updated_at = NOW()`. | ❌ No. |
| `trg_sales_auto_audit_log` | `public.sales` | AFTER INSERT | Inserts sale summary row into `admin_audit_logs`. | ❌ No. Audit logging only. |
| `trg_sale_update_audit_log`| `public.sales` | AFTER UPDATE | Inserts sale edit summary into `admin_audit_logs`. | ❌ No. Audit logging only. |
| `trg_purge_expired_audit_logs` | `public.admin_audit_logs` | AFTER INSERT | Deletes audit logs older than 7 days. | ❌ No. Log retention only. |
| `on_auth_user_created` | `auth.users` | AFTER INSERT | Inserts profile into `public.profiles`. | ❌ No. Auth profile only. |

**Result:** Zero triggers alter stock automatically upon INSERT or UPDATE of catalogue items.

---

## 8. PostgreSQL Functions and RPCs

| RPC Function Name | Purpose | Modifies Stock? | Mechanism |
| :--- | :--- | :--- | :--- |
| `public.fn_inward_stock_batch` | Records stock inward lot. | ⬆️ Increments | Creates batch in `batches`, movement in `stock_movements`, increments `products.stock_quantity`. |
| `public.fn_barcode_stock_in` | Scanned barcode inward. | ⬆️ Increments | Atomic: looks up barcode, creates lot in `batches`, records `stock_movements`, increments `products.stock_quantity`. |
| `public.fn_fefo_deduct_and_allocate` | FEFO stock deduction. | ⬇️ Decrements | Locks batches (`SELECT FOR UPDATE`), deducts earliest eligible expiry batch, records outward movement, decrements `products.stock_quantity`. |
| `public.fn_record_damage_loss` | Spoilage loss recorder. | ⬇️ Decrements | Deducts `batches.qty_remaining`, records `stock_movements` (`'DAMAGE'`), decrements `products.stock_quantity`. |
| `public.fn_remove_expired_batches` | Auto expired disposal. | ⬇️ Decrements | Marks batch 'EXPIRED', records `stock_movements` (`'EXPIRED_REMOVAL'`), decrements `products.stock_quantity`. |
| `public.fn_cancel_sale_atomic` | Reverses cancelled sale. | ⬆️ Increments | Restores deducted batch stock, increments `products.stock_quantity`. |
| `public.fn_reset_all_products_stock_to_zero` | Zero stock reset. | 🔄 Resets to 0 | Sets `products.stock_quantity = 0.00`, `batches.qty_remaining = 0.00`, status `'EXHAUSTED'`. |
| `public.fn_search_product_by_barcode` | Barcode lookup. | ❌ None | Read-only search across `product_barcodes` and `products`. |
| `public.fn_register_product_and_barcode` | Register product with 0 stock. | ❌ None | Strictly sets `stock_quantity = 0.00`, creates 0 batches. |

---

## 9. Views & Materialized Views Used for Inventory

- Currently, there are **no database views or materialized views** computing stock dynamically in the PostgreSQL database.
- Stock is held directly in two synchronized database fields:
  1. `public.batches.qty_remaining` (Lot-level granular truth)
  2. `public.products.stock_quantity` (Product-level cached aggregate)

---

## 10. Frontend Queries Determining In Stock Status

In `src/components/Inventory/ProductList.tsx`:
```tsx
// Previously:
const filteredProducts = products.filter(p => matchesSearch && matchesCategory);
// Showed all 368 products regardless of whether stock_quantity was 0 or positive.

// Corrected in Phase 55:
const filteredProducts = products.filter(p => {
  if (inventoryViewTab === 'IN_STOCK') {
    return p.stock_quantity > 0;
  }
  if (inventoryViewTab === 'OUT_OF_STOCK') {
    return p.stock_quantity <= 0;
  }
  // 'CATALOGUE' shows all products
  return true;
});
```

---

## 11. Backend APIs Creating or Updating Stock

In `server/src/controllers/stockController.ts`:
- `POST /api/v1/stock/inward`: Calls `fn_inward_stock_batch` or creates batch and updates product stock.
- `POST /api/v1/stock/adjust`: Manual adjustment (+ or -) with stock movement.
- `GET /api/v1/stock/fefo-preview`: Previews FEFO batch allocation without mutating database.

---

## 12. Root Cause Summary: Why 368 Products Appeared in Current Inventory

1. **Seed Migrations (Phases 30–50):** Initial brand population SQL files injected dummy opening stock batches (`qty_received = 20, qty_remaining = 20, notes = 'Initial stock on product creation'`) and set `products.stock_quantity = 20`.
2. **Missing UI Separation:** Frontend `ProductList.tsx` lacked a view filter separating "Current In-Stock Items" from the "Master Product Catalogue".
3. **Form Defaults:** `AddProductModal.tsx` and quick add components defaulted initial stock to `20` units instead of `0`.

---

## 13. The Canonical Source of Truth for Actual Inventory

**ONE Canonical Architecture Defined:**
1. **Physical Available Stock:** Derived strictly from active, non-expired batches:
   $$\text{Available Stock} = \sum_{b \in \text{batches}} \{ b.\text{qty\_remaining} \mid b.\text{product\_id} = p.\text{id} \land b.\text{status} = \text{'ACTIVE'} \land b.\text{expiry\_date} \ge \text{CURRENT\_DATE} \}$$
2. **Synchronized Product Column:** `products.stock_quantity` must always reflect the exact sum of active batch quantities.
3. **Master Product Catalogue:** Holds all registered products (even with 0 stock).
4. **Current Inventory Screen:** Displays **strictly products where `stock_quantity > 0`**.
