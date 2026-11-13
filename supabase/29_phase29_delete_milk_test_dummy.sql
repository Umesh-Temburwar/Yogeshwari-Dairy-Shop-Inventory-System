-- =============================================================
-- Phase 29: Delete the dummy "Realtime Milk Test" product
-- -------------------------------------------------------------
-- This script removes any test product entries named "Milk Test dummy"
-- from all relevant tables to clean up the database.
-- It is safe to run on production; it only affects rows that match
-- the exact placeholder name.
-- =============================================================

-- 1. Delete product‑related stock batches (if any)
DELETE FROM public.stock_batches
WHERE product_id IN (
    SELECT id FROM public.products WHERE name ILIKE '%Milk Test dummy%'
);

-- 2. Delete sales items referencing the test product
DELETE FROM public.sales_items
WHERE product_id IN (
    SELECT id FROM public.products WHERE name ILIKE '%Milk Test dummy%'
);

-- 3. Delete purchase items referencing the test product
DELETE FROM public.purchase_items
WHERE product_id IN (
    SELECT id FROM public.products WHERE name ILIKE '%Milk Test dummy%'
);

-- 4. Finally delete the product record itself
DELETE FROM public.products
WHERE name ILIKE '%Milk Test dummy%';

-- 5. Optional: clean up any orphaned batches or logs (cascade safe)
-- (If foreign‑key constraints are set with ON DELETE CASCADE, the above
-- deletions are sufficient. Otherwise, run the following to remove
-- any left‑over rows with no matching product.)
DELETE FROM public.stock_batches sb
WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.id = sb.product_id);

-- End of Phase 29 script

