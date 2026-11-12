-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - SUPABASE SETUP
-- PHASE 10: HIGH-PERFORMANCE INDEXES & POSTGRES OPTIMIZATION
-- File: supabase/10_phase10_indexes_and_performance.sql
-- ============================================================================
-- Description:
-- Adds optimized B-Tree and Partial Indexes on Foreign Keys, Dates, and
-- Status columns to guarantee sub-millisecond query performance and zero lag.
-- Follows official Supabase Postgres Best Practices.
--
-- Instructions:
-- 1. Ensure Phases 1-9 have been executed successfully.
-- 2. Open Supabase Dashboard -> SQL Editor -> New Query.
-- 3. Paste this entire script and click "Run" (or Ctrl + Enter).
-- ============================================================================

-- 1. Product & Catalog Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_unit_id ON public.products(unit_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON public.products(stock_quantity, min_stock_alert);

-- 2. Batches & Expiry (FEFO) Indexes
CREATE INDEX IF NOT EXISTS idx_batches_product_id ON public.batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry_date ON public.batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_active_fefo ON public.batches(product_id, expiry_date ASC) WHERE qty_remaining > 0;
CREATE INDEX IF NOT EXISTS idx_batches_supplier_id ON public.batches(supplier_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON public.batches(status);

-- 3. Stock Movements Indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch_id ON public.stock_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON public.stock_movements(movement_type);

-- 4. Purchases Indexes
CREATE INDEX IF NOT EXISTS idx_purchases_date ON public.purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON public.purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON public.purchases(supplier_id);

-- 5. Sales & Billing Indexes
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_no ON public.sales(invoice_no);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_payment_mode ON public.sales(payment_mode);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);

-- 6. Sale Items & Allocations Indexes
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_allocations_sale_id ON public.sale_batch_allocations(sale_id);
CREATE INDEX IF NOT EXISTS idx_allocations_batch_id ON public.sale_batch_allocations(batch_id);
CREATE INDEX IF NOT EXISTS idx_allocations_product_id ON public.sale_batch_allocations(product_id);

-- 7. Udhar Khata Indexes
CREATE INDEX IF NOT EXISTS idx_udhar_customers_balance ON public.udhar_customers(current_balance) WHERE current_balance > 0;
CREATE INDEX IF NOT EXISTS idx_udhar_customers_phone ON public.udhar_customers(phone);
CREATE INDEX IF NOT EXISTS idx_udhar_transactions_customer_id ON public.udhar_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_udhar_transactions_date ON public.udhar_transactions(transaction_date);

-- 8. Damages & Spoilage Indexes
CREATE INDEX IF NOT EXISTS idx_damages_date ON public.damage_records(damage_date);
CREATE INDEX IF NOT EXISTS idx_damages_product_id ON public.damage_records(product_id);
CREATE INDEX IF NOT EXISTS idx_damages_batch_id ON public.damage_records(batch_id);

-- 9. Returns & Refunds Indexes
CREATE INDEX IF NOT EXISTS idx_product_returns_date ON public.product_returns(return_date);
CREATE INDEX IF NOT EXISTS idx_product_returns_product_id ON public.product_returns(product_id);
CREATE INDEX IF NOT EXISTS idx_product_returns_sale_id ON public.product_returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_supplier_returns_date ON public.supplier_returns(return_date);
CREATE INDEX IF NOT EXISTS idx_supplier_returns_product_id ON public.supplier_returns(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_returns_status ON public.supplier_returns(refund_status);

-- 10. Expenses Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_is_capital ON public.expenses(is_capital_investment);
