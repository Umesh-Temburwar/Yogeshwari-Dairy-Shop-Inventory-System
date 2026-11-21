# 🗄️ Database Migration & Verification Guide: Phase 78 (E-Commerce Integration)
**Document:** `docs/ECOMMERCE_DATABASE_MIGRATIONS.md`  
**Migration Script:** `supabase/78_phase78_ecommerce_orders_and_stock_reservations.sql`  
**Rollback Script:** `supabase/78_phase78_ecommerce_orders_and_stock_reservations_rollback.sql`  
**Target:** Supabase PostgreSQL (`pfamoxreojbejufwhgiu.supabase.co`)  
**Status:** Prepared & Reviewed — Pending User Approval  

---

## 1. 🛡️ Architectural Safety & Non-Destructive Guarantees

1. **Zero Impact on POS Cashier Counters & In-Shop Billing**:
   - Counter POS billing writes exclusively to `public.sales`, `public.sale_items`, and `public.sale_batch_allocations`.
   - E-commerce orders write exclusively to dedicated tables: `public.ecommerce_orders`, `public.ecommerce_order_items`, and `public.ecommerce_order_item_allocations`.
   - Cash register balances, daily sales totals, and counter audits remain 100% isolated.
2. **Catalog Safety for 46,000+ Products**:
   - `public.products.is_ecommerce_active` defaults to `FALSE`. Unapproved catalog items are never displayed to online shoppers.
3. **FEFO & Stock Concurrency Synchronization**:
   - Both `fn_complete_sale_atomic` (POS) and `fn_create_ecommerce_order_atomic` (Online) use PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) on `public.products` and `public.batches`.
   - Lot deductions strictly follow First-Expiry-First-Out (`ORDER BY expiry_date ASC, created_at ASC`).
   - Expired batches (`expiry_date < CURRENT_DATE`) are blocked from sale.

---

## 2. 📋 Migration DDL & Component Breakdown

### A. Additive Columns on `public.products`
```sql
ALTER TABLE public.products 
    ADD COLUMN IF NOT EXISTS is_ecommerce_active BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS ecommerce_mrp NUMERIC(12, 2) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS max_order_quantity INTEGER DEFAULT 10;

CREATE INDEX IF NOT EXISTS idx_products_ecommerce_active 
    ON public.products (is_ecommerce_active, is_active) 
    WHERE is_ecommerce_active = TRUE AND is_active = TRUE;
```

### B. Table: `public.customer_addresses`
Stores customer delivery addresses with home/work tags and default flags.
- **Columns:** `id`, `user_id` (FK `auth.users`), `recipient_name`, `phone`, `alternate_phone`, `address_line1`, `address_line2`, `landmark`, `city`, `state`, `pincode`, `address_type`, `is_default`, `created_at`, `updated_at`.
- **Indexes:** `idx_customer_addresses_user` on `user_id`, `idx_customer_addresses_default` on `(user_id, is_default)`.

### C. Table: `public.ecommerce_orders`
Master ledger for all customer online delivery & pickup orders.
- **Columns:** `id`, `order_no` (UNIQUE), `customer_id` (FK `auth.users`), `customer_name`, `customer_phone`, `customer_email`, `delivery_address` (JSONB), `order_status` (`PLACED`, `CONFIRMED`, `PREPARING`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`, `REJECTED`), `payment_method` (`COD`, `ONLINE_UPI`, `RAZORPAY`), `payment_status` (`PENDING`, `PAID`, `FAILED`, `REFUNDED`), `payment_reference`, `subtotal`, `delivery_fee`, `discount_amount`, `total_amount`, `estimated_delivery_time`, `delivery_notes`, `rejection_reason`, `cancellation_reason`, `idempotency_key` (UUID UNIQUE).
- **Indexes:** `idx_ecommerce_orders_customer`, `idx_ecommerce_orders_status`, `idx_ecommerce_orders_order_no`, `idx_ecommerce_orders_idempotency`.

### D. Table: `public.ecommerce_order_items`
Itemized snapshot of products at the moment of order placement.
- **Columns:** `id`, `order_id` (FK `ecommerce_orders`), `product_id` (FK `products`), `product_name`, `pack_size`, `unit`, `unit_price`, `mrp`, `quantity`, `total_price`, `image_url`, `created_at`.

### E. Table: `public.ecommerce_order_item_allocations`
Captures exact batch IDs decremented for each line item.
- **Columns:** `id`, `order_item_id`, `order_id`, `product_id`, `batch_id` (FK `batches`), `batch_no`, `expiry_date`, `quantity`, `created_at`.
- **Purpose:** Enables 100% accurate, lossless restoration of lot quantities if an order is cancelled or rejected.

### F. Table: `public.stock_reservations`
Temporary 10-minute checkout lock during cart payment.
- **Columns:** `id`, `cart_session_id`, `user_id`, `product_id`, `quantity`, `status` (`ACTIVE`, `COMMITTED`, `RELEASED`, `EXPIRED`), `expires_at`, `created_at`, `updated_at`.
- **Indexes:** `idx_stock_reservations_active` on `(product_id, status, expires_at)`.

### G. Public Sanitized Catalog View: `public.v_ecommerce_products`
Exposes customer-safe fields while strictly omitting `purchase_price`, supplier info, internal notes, and profit margins.

### H. Stored Procedures:
1. `public.fn_create_ecommerce_order_atomic(...)`:
   - Checks idempotency.
   - Locks products with `FOR UPDATE`.
   - Verifies available stock (excluding expired batches and other active reservations).
   - Inserts order & order items.
   - Deducts batches in FEFO order & records allocations.
   - Decrements `products.stock_quantity`.
   - Commits cart reservation.
2. `public.fn_cancel_ecommerce_order_atomic(...)`:
   - Locks order row.
   - Restores exact batch quantities to `public.batches`.
   - Restores aggregate stock to `public.products`.
   - Marks order `CANCELLED`.

---

## 3. 🧪 Migration Test Cases & Verification Queries

### Test 1: Verify No Sensitive Columns are Exposed in Public View
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'v_ecommerce_products' 
  AND column_name IN ('purchase_price', 'supplier_id', 'supplier_name', 'margin', 'stock_value');
-- Expected Result: 0 rows returned
```

### Test 2: Verify Atomic Concurrency & Idempotency
```sql
-- Calling fn_create_ecommerce_order_atomic twice with the same p_idempotency_key
-- returns the existing order_id without duplicate stock deductions.
```

### Test 3: Verify FEFO Allocation & Expiry Filter
```sql
-- Products with batches where expiry_date < CURRENT_DATE must have available_stock = 0
SELECT id, name, available_stock, is_in_stock 
FROM public.v_ecommerce_products 
WHERE available_stock > 0;
```

---

## 4. 🔄 Step-by-Step Rollback Instructions

If Phase 78 needs to be completely reverted:
1. Open Supabase Dashboard -> **SQL Editor**.
2. Run [supabase/78_phase78_ecommerce_orders_and_stock_reservations_rollback.sql](file:///d:/Projects/Yogeshwari%20Dairy%20Shop%20Inventory%20System/supabase/78_phase78_ecommerce_orders_and_stock_reservations_rollback.sql).
3. The script safely drops the new views, functions, triggers, and tables in reverse dependency order, and removes the additive columns from `products`.
4. Existing POS billing, batches, products, and sales are 100% unaffected.
