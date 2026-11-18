/**
 * Explicit PostgreSQL column projections for Supabase PostgREST queries.
 * Eliminates `select('*')` payload bloat while preserving every field consumed
 * by the UI, billing, FEFO batches, Khata, returns, analytics, and audit stream.
 */

export const PRODUCT_SELECT_COLS =
  'id, name, brand, category, unit, pack_size, purchase_price, selling_price, stock_quantity, min_stock_alert, shelf_life_days, barcode, image_url, image_source, image_status, is_active, created_at, updated_at';

export const PRODUCT_BARCODE_SELECT_COLS =
  'id, name, brand, category, unit, pack_size, purchase_price, selling_price, stock_quantity, min_stock_alert, shelf_life_days, barcode, image_url, is_active, created_at';

export const PRODUCT_CATALOGUE_SELECT_COLS =
  'id, barcode, product_name, brand, category, quantity_unit, mrp, selling_price, image_url, created_at';

export const BATCH_SELECT_COLS =
  'id, product_id, product_name, batch_no, mfg_date, expiry_date, qty_received, qty_remaining, purchase_price, selling_price, supplier_name, notes, created_at, products(name)';

export const SALE_ITEM_SELECT_COLS =
  'id, sale_id, product_id, product_name, quantity, unit, unit_price, purchase_cost, total_price';

export const SALE_SELECT_COLS =
  `id, invoice_no, idempotency_key, customer_name, customer_phone, customer_gender, customer_age_group, customer_age, total_amount, discount, net_amount, payment_mode, cash_amount, online_amount, udhar_amount, sale_date, created_at, created_by_name, created_by_email, created_by_role, admin_slot, counter_name, items:sale_items(${SALE_ITEM_SELECT_COLS})`;

export const PURCHASE_SELECT_COLS =
  'id, product_id, product_name, supplier_name, quantity, unit, purchase_price, total_amount, payment_mode, purchase_date, invoice_number, batch_no, expiry_date, notes, created_at';

export const DAMAGE_SELECT_COLS =
  'id, product_id, product_name, quantity, unit, estimated_loss_amount, reason, damage_date, notes, created_at';

export const EXPENSE_SELECT_COLS =
  'id, title, category, amount, payment_mode, expense_date, is_capital_investment, notes, created_at';

export const UDHAR_CUSTOMER_SELECT_COLS =
  'id, name, phone, address, total_credit, total_paid, current_balance, status, last_transaction_date, notes, created_at';

export const UDHAR_TRANSACTION_SELECT_COLS =
  'id, customer_id, type, amount, payment_mode, notes, transaction_date, created_at';

export const PRODUCT_RETURN_SELECT_COLS =
  'id, return_no, sale_id, invoice_no, product_id, product_name, quantity, unit, unit_price, refund_amount, refund_mode, reason, condition, return_type, customer_name, customer_phone, admin_name, admin_email, counter_name, notes, return_date, created_at';

export const SUPPLIER_RETURN_SELECT_COLS =
  'id, return_no, supplier_name, product_id, product_name, batch_no, purchase_id, quantity, unit, purchase_price, total_refund_amount, reason, refund_status, refund_mode, refund_date, return_date, notes, created_at';

export const ADMIN_AUDIT_SELECT_COLS =
  'id, admin_name, admin_email, admin_role, admin_slot, counter_name, action_type, title, details, amount, reference_id, reference_table, created_at';
