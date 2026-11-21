# Yogeshwari Dairy E-Commerce Integration & Deployment Checklist

**Project:** Yogeshwari Dairy Products — Integrated E-Commerce & Inventory  
**Target Environments:**
- Inventory Backend: Render (`https://yogeshwari-dairy-shop-inventory-system.onrender.com`)
- Database: Supabase PostgreSQL (`https://pfamoxreojbejufwhgiu.supabase.co`)
- Customer Frontend: Vercel / Netlify (`Yogeshwari-Dairy-Ecommerce`)

---

## 1. PRE-FLIGHT ARCHITECTURAL CHECKS

- [x] **Zero Production Schema Impact:** No Phase 78 SQL has been executed against live Supabase.
- [x] **Feature Branch Isolation:** All backend e-commerce additions live in `feature/ecommerce-backend-integration`.
- [x] **Zero POS Disruption:** POS tables (`sales`, `sale_items`, `sale_batch_allocations`) remain untouched.
- [x] **Full Backend Test Pass:** All 36 Vitest tests passing (`npm --prefix server run test`).
- [x] **Full Frontend TypeScript Pass:** `npm run typecheck` passes with 0 errors.
- [x] **Data Sanitization Verified:** Sensitive fields (`purchase_price`, `stock_value`, `supplier_id`) removed from customer API responses.
- [x] **Customer Privilege Isolation:** Registration strictly hardcodes `role: 'customer'`. Staff endpoints enforce `staffOnly` middleware.

---

## 2. DATABASE MIGRATION CHECKLIST (PHASE 78)

> **IMPORTANT:** Only execute these steps after explicit user review and sign-off.

- [ ] **Step 2.1 — Dry Run SQL Review:**
  Review `supabase/78_phase78_ecommerce_orders_and_stock_reservations.sql` in Supabase SQL Editor preview mode.
- [ ] **Step 2.2 — Table Creation:**
  - [ ] `ecommerce_orders` (UUID primary key, order number sequence, payment status, delivery address JSONB)
  - [ ] `ecommerce_order_items` (linked to `products(id)`)
  - [ ] `ecommerce_order_item_allocations` (linked to `batches(id)` for FEFO traceability)
  - [ ] `stock_reservations` (session-based 15-minute temporary holds)
  - [ ] `ecommerce_order_status_history` (audit trail for status transitions)
- [ ] **Step 2.3 — View & Function Deployment:**
  - [ ] Deploy view `v_ecommerce_products` (calculates available unexpired stock dynamically)
  - [ ] Deploy function `fn_create_ecommerce_order_atomic` (asserts `v_qty_needed = 0`)
  - [ ] Deploy function `fn_cancel_ecommerce_order_atomic` (idempotent stock restoration)
- [ ] **Step 2.4 — RLS Policies Verification:**
  - [ ] Verify customer can only read/create own orders (`auth.uid() = customer_id`)
  - [ ] Verify staff (`owner`, `manager`, `cashier`) can view all orders
- [ ] **Step 2.5 — Rollback Test Verification:**
  - [ ] Confirm `supabase/78_phase78_ecommerce_orders_and_stock_reservations_rollback.sql` is ready in case rollback is needed.

---

## 3. BACKEND DEPLOYMENT CHECKLIST (RENDER)

- [ ] **Step 3.1 — Merge to Main:**
  Merge `feature/ecommerce-backend-integration` into `main` after Phase 78 DB migration is complete.
- [ ] **Step 3.2 — Render Environment Variables:**
  - [ ] Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present.
  - [ ] Ensure `CORS_ORIGIN` includes the new e-commerce customer domain (e.g., `https://yogeshwari-dairy.vercel.app` and `http://localhost:5173`).
- [ ] **Step 3.3 — Live API Health Check:**
  - [ ] Verify `GET https://yogeshwari-dairy-shop-inventory-system.onrender.com/health` returns `status: "ok"`.
  - [ ] Verify `GET https://yogeshwari-dairy-shop-inventory-system.onrender.com/api/v1/ecommerce/products` returns 200 with sanitized products.
  - [ ] Verify `GET https://yogeshwari-dairy-shop-inventory-system.onrender.com/api/v1/ecommerce/categories` returns category list.

---

## 4. FRONTEND IMPLEMENTATION CHECKLIST (CUSTOMER REPO)

- [ ] **Step 4.1 — Repository Setup (`D:\Projects\Yogeshwari-Dairy-Ecommerce`):**
  - [ ] Initialize Vite + React 18 + TypeScript.
  - [ ] Setup Tailwind CSS with quick-commerce theme (Green `#0C831F` / Yellow `#F8CB46`).
  - [ ] Configure `lucide-react`, `zustand`, `react-router-dom`.
- [ ] **Step 4.2 — Offline Mock Mode:**
  - [ ] Implement `MockEcommerceApiClient` with rich dairy product catalog.
  - [ ] Ensure full visual testing can run without internet or live API connectivity.
- [ ] **Step 4.3 — Essential Quick-Commerce UI Components:**
  - [ ] Top bar with delivery promise badge (`⚡ 15 MINS`) and address chip.
  - [ ] Instant search with auto-suggest and voice search icon.
  - [ ] Category navigation horizontal scroller.
  - [ ] Product Card with image, pack size badge, selling price, and animated `ADD` button.
  - [ ] Sticky Floating Cart Bar showing item count, total price, and "View Cart" CTA.
  - [ ] Cart Drawer with free delivery threshold progress bar (Free ≥ ₹300).
  - [ ] Address modal with saved addresses (Home, Work, Other).
  - [ ] Checkout sheet with Payment Options (COD, UPI on Delivery) and WhatsApp order link.
  - [ ] Live Order Status screen with visual tracker.
- [ ] **Step 4.4 — Mobile Layout & Safe Areas:**
  - [ ] Ensure sticky bottom cart bar includes `pb-safe` / `pb-6` so buttons are never hidden behind browser or mobile navbars.
  - [ ] Ensure modals have scrollable containers (`overflow-y-auto max-h-[85vh]`).
  - [ ] Test on mobile screen widths (360px, 390px, 412px).

---

## 5. INVENTORY ADMIN MOBILE UI FIXES (EXISTING REPO)

Based on mobile screenshots, implement the following polish in the inventory admin repo:
- [ ] **Stock Bottom Sheet:** Increase bottom padding (`pb-24`) in `View, Filters & Exports` sheet so report action buttons are not clipped by the bottom navigation bar.
- [ ] **Add Stock Modal:** Add `pb-28` to `Add Stock & Batch Expiry Entry` modal form so "Confirm Stock Inward" button is clearly visible above bottom nav.
- [ ] **Sales & Purchases Reports Sheet:** Add `pb-24` in `Daily Sales` and `Purchases` tools sheets.
- [ ] **Return & Refund Confirmation:** In `ReturnProductModal.tsx`, ensure "Cancel Full Bill & Confirm Return" submit button has sufficient margin-bottom (`mb-20`) so it doesn't get cut off.

---

## 6. END-TO-END VERIFICATION & ACCEPTANCE TESTING

- [ ] Place an order from the customer website using COD.
- [ ] Check customer order appears instantly in inventory admin orders screen.
- [ ] Check unexpired batch stock decreases by the ordered quantity.
- [ ] Check counter POS billing continues to work simultaneously without race condition or crash.
- [ ] Cancel the customer order and verify batch stock is restored accurately.
- [ ] Verify no wholesale prices or margins leak in customer browser network tab.
