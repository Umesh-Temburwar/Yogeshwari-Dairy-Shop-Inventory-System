-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 9: HIGH-PERFORMANCE INDEXES & POSTGRES OPTIMIZATION
-- File: supabase/09_phase9_indexes_and_performance.sql
-- ============================================================================
-- Description:
-- Adds optimized B-Tree and Partial Indexes on Foreign Keys, Dates, and
-- Status columns to guarantee sub-millisecond query performance and zero lag.
--
-- Instructions:
-- 1. Ensure Phases 1-8 have been executed.
-- 2. Open Supabase Dashboard -> SQL Editor -> New Query.
-- 3. Paste this entire script and click "Run".
-- ============================================================================

-- 1. Product Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON public.products(stock_quantity, min_stock_alert);

-- 2. Batches & Expiry (FEFO) Indexes
CREATE INDEX IF NOT EXISTS idx_batches_product_id ON public.batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry_date ON public.batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_active_fefo ON public.batches(product_id, expiry_date ASC) WHERE qty_remaining > 0;
CREATE INDEX IF NOT EXISTS idx_batches_supplier_id ON public.batches(supplier_id);

-- 3. Stock Movements Indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch_id ON public.stock_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at);

-- 4. Purchases Indexes
CREATE INDEX IF NOT EXISTS idx_purchases_date ON public.purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON public.purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON public.purchases(supplier_id);

-- 5. Sales & Billing Indexes
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_no ON public.sales(invoice_no);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_payment_mode ON public.sales(payment_mode);

-- 6. Sale Items & Allocations Indexes
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_allocations_sale_id ON public.sale_batch_allocations(sale_id);
CREATE INDEX IF NOT EXISTS idx_allocations_batch_id ON public.sale_batch_allocations(batch_id);

-- 7. Udhar Khata Indexes
CREATE INDEX IF NOT EXISTS idx_udhar_customers_balance ON public.udhar_customers(current_balance) WHERE current_balance > 0;
CREATE INDEX IF NOT EXISTS idx_udhar_customers_phone ON public.udhar_customers(phone);
CREATE INDEX IF NOT EXISTS idx_udhar_transactions_customer_id ON public.udhar_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_udhar_transactions_date ON public.udhar_transactions(transaction_date);

-- 8. Damages & Returns Indexes
CREATE INDEX IF NOT EXISTS idx_damages_date ON public.damage_records(damage_date);
CREATE INDEX IF NOT EXISTS idx_damages_product_id ON public.damage_records(product_id);
CREATE INDEX IF NOT EXISTS idx_product_returns_date ON public.product_returns(return_date);
CREATE INDEX IF NOT EXISTS idx_product_returns_product_id ON public.product_returns(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_returns_date ON public.supplier_returns(return_date);
CREATE INDEX IF NOT EXISTS idx_supplier_returns_product_id ON public.supplier_returns(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_returns_status ON public.supplier_returns(refund_status);

-- 9. Expenses Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

