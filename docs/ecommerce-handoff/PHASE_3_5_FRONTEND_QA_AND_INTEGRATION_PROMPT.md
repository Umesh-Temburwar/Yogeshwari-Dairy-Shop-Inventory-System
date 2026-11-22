# YOGESHWARI DAIRY E-COMMERCE — PHASE 3.5: FRONTEND QA, BUG FIXES & INTEGRATION READINESS MASTER PROMPT

> **How to Use This File:**  
> Copy the complete prompt below (from the opening triple backticks to the closing backticks) and paste it into a new Antigravity session opened in the workspace `D:\Projects\Yogeshwari-Dairy-Ecommerce`.

---

```markdown
# MASTER PROMPT: PHASE 3.5 FRONTEND QA, AUDIT, BUG FIXES & INTEGRATION READINESS

You are acting as the Principal Frontend Quality Assurance & Full-Stack Integration Architect for **Yogeshwari Dairy Products**.

You are working inside:
**Workspace Directory:** `D:\Projects\Yogeshwari-Dairy-Ecommerce`  
**GitHub Repository:** `https://github.com/Umesh-Temburwar/Yogeshwari-Dairy-Ecommerce`

---

## 1. ARCHITECTURAL & ENVIRONMENT CONTEXT

Our existing production system consists of:
1. **Existing Inventory Admin Repository:**
   - GitHub: `https://github.com/Umesh-Temburwar/Yogeshwari-Dairy-Shop-Inventory-System`
   - Active Branch: `feature/ecommerce-backend-integration`
   - Handles POS billing, purchases, supplier management, and counter sales.
2. **Existing Render Backend Service:**
   - Base URL: `https://yogeshwari-dairy-shop-inventory-system.onrender.com`
   - API Root: `/api/v1`
   - Customer E-Commerce Endpoints: `/api/v1/ecommerce/*`
3. **Existing Supabase PostgreSQL Database:**
   - Project URL: `https://pfamoxreojbejufwhgiu.supabase.co`
   - Phase 78 SQL Migration (`78_phase78_ecommerce_orders_and_stock_reservations.sql`) has been prepared and hardened locally, but **zero SQL has been executed on live production database**.
4. **Current E-Commerce Frontend State (`D:\Projects\Yogeshwari-Dairy-Ecommerce`):**
   - Built with: **React 18.3**, **TypeScript 5.7**, **Vite 6.1**, **Tailwind CSS 3.4**, **Zustand 5.0**, **Lucide React 0.475**, **React Router DOM 6.28**.
   - Core Architecture: Pluggable API client architecture (`IEcommerceApiClient` with `MockEcommerceApiClient` and `HttpEcommerceApiClient`).
   - Mock state is active via `VITE_USE_MOCK_API=true` in `.env.development`.

### PRIMARY MISSION:
Perform a deep frontend quality assurance audit, fix all functional, responsive, and mobile-layout issues, verify product claim accuracy, ensure safe environment configuration, and prepare the application for 100% safe future integration with the live backend.

**DO NOT rebuild the project from scratch.** Preserve all working components, polish the existing codebase, and fix any discrepancies.

---

## 2. TASK BREAKDOWN & DETAILED INSTRUCTIONS

### TASK 1 — FULL FRONTEND FUNCTIONAL TESTING & BUG FIXING
Test and fix all 20 essential customer workflows:
1. **Homepage Loading & Navigation:** Verify instant render, header banner, search bar, category pills, and featured grids.
2. **Category Filtering:** Verify switching categories ('All', 'Milk', 'Paneer & Khoya', 'Dahi & Chaas', 'Ghee & Butter', 'Sweets & Bakery') correctly filters products without glitching.
3. **Search & Empty Results:** Test instant search typing, debounce, case-insensitivity, barcode/product query, and the "No products found" empty state with a "Clear Search" button.
4. **Product Detail Modal:** Clicking a product card opens the detail modal with high-res image, description, pack size, price, ingredients/details, and stock badge.
5. **Add to Cart:** Clicking 'ADD' animates into `[-] 1 [+]` selector with haptic feedback (`navigator.vibrate`).
6. **Quantity Increments/Decrements:** Test rapid taps, ensure quantity never drops below 0.
7. **Item Removal:** Decrementing from 1 to 0 smoothly removes item and updates cart badges.
8. **Cart Persistence:** Add items, reload browser (`F5`), and verify cart persists via Zustand `persist` in `localStorage`.
9. **Stock Limit Protection:** Ensure customer cannot add more than `availableStock` for any product; disable or warn if stock limit is reached.
10. **Delivery Location Selector:** Verify clicking delivery pill opens `AddressSelectorModal` allowing selection between Home, Work, or Custom address.
11. **Multiple Delivery Addresses:** Verify adding, editing, and selecting delivery addresses.
12. **Checkout Form Validation:** Test empty name, invalid Indian 10-digit mobile number (`^[6-9]\d{9}$`), missing street or pincode, and ensure descriptive validation errors appear.
13. **Payment Selection (COD & UPI):** Verify Cash on Delivery and UPI on Delivery selection states. Clearly label UPI as "Pay via QR code at doorstep upon delivery".
14. **Mock Order Creation:** Placing an order creates an order object with an `idempotencyKey`, displays `OrderSuccessModal` with confetti, and clears the cart.
15. **My Orders Page (`/orders`):** Lists all placed mock orders stored in `localStorage` with order ID, date, items, amount, and status pill.
16. **Order Tracking Page (`/track/:orderId`):** Visual step tracker (`Placed` -> `Confirmed` -> `Preparing` -> `Out for Delivery` -> `Delivered`) with delivery driver placeholder and live status updates.
17. **Order Cancellation:** Verify customer can cancel `pending` or `confirmed` orders, with confirmation prompt and automatic status update to `cancelled`.
18. **WhatsApp Order Sharing:** Verify generated WhatsApp link contains properly encoded dairy order summary, address, and total amount.
19. **Loading, Empty & Error States:** Verify skeleton loaders during data fetch, clean empty states for cart/orders, and toast error notifications.
20. **Browser Refresh & Direct Routing:** Verify direct navigation to `/orders`, `/track/ORD-...`, or 404 routes works without breaking or crashing.

---

### TASK 2 — MOBILE RESPONSIVENESS & SAFE AREA LAYOUT AUDIT
Test and verify responsive layout across viewports:
- **Small Mobile:** `320px`, `360px`, `375px`
- **Standard Mobile:** `390px`, `412px`, `428px`
- **Tablet:** `768px`, `820px`
- **Desktop:** `1024px`, `1440px`

**Critical Mobile Layout Checks (Inspired by User's Mobile Feedback):**
- **Bottom Floating Cart & Navbars:** Ensure `FloatingCartBar` uses `fixed bottom-4 inset-x-4 max-w-md mx-auto z-40` with adequate page padding (`pb-28`) so it **never covers bottom content or action buttons**.
- **Bottom Modals & Drawers (`CartDrawer`, `AddressSelectorModal`, `ProductDetailModal`):**
  - Add safe-area padding (`pb-8` or `pb-safe`).
  - Containers must use `max-h-[85vh] overflow-y-auto` so submit/checkout buttons are always scrollable and visible above mobile navigation.
- **Zero Horizontal Overflow:** Verify `overflow-x-hidden` on root container so there is no horizontal page wobble.
- **Touch Targets:** All buttons, counter pills, and links must have a minimum touch target of `44x44px`.

---

### TASK 3 — PRODUCT DATA ACCURACY & SAFE CLAIMS
Audit all customer-facing text, mock data, and marketing banners:
1. **No Invented MRPs or False Discounts:** Only display strike-through MRP if verified by official manufacturer pack packaging. Otherwise, show honest selling price (`₹Price`).
2. **Delivery Promise Honesty:** Change aggressive "⚡ 15 Mins Delivery" claims to realistic quick-commerce operational text:
   - Example: *"⚡ Fast Local Delivery (Est. 20-40 Mins)"* or *"Delivery by 8:00 AM / Same Day"*.
3. **Stock Availability Disclaimers:** In mock mode, show a subtle banner:
   - *"Demo Store: Showing local dairy product catalog. Physical inventory managed via shop counter."*
4. **Verified Dairy Contact Placeholder:** Ensure phone numbers and addresses reflect authentic local dairy details or clear placeholders (`+91 98765 43210 (Demo Contact)`).
5. **Nutritional Information:** Do not display unverified laboratory nutritional claims unless stamped on official dairy pouches (e.g. standard FAT/SNF grades for milk).

---

### TASK 4 — ENVIRONMENT CONFIGURATION & SECURITY AUDIT
Audit `.env.development`, `.env.production`, `.env.example`, and `.gitignore`:
1. Verify `VITE_USE_MOCK_API=true` is the default in development.
2. Ensure `.env.production` sets `VITE_USE_MOCK_API=false` with the production Render backend URL `https://yogeshwari-dairy-shop-inventory-system.onrender.com/api/v1/ecommerce`.
3. **Absolute Zero Secrets in Frontend:** Verify no `SUPABASE_SERVICE_ROLE_KEY`, database passwords, or JWT secrets exist anywhere in the frontend codebase.
4. **Graceful Failover:** In `HttpEcommerceApiClient`, ensure network errors or server downtime display user-friendly toast messages rather than crashing the React DOM.

---

### TASK 5 — CUSTOMER AUTHENTICATION AUDIT
Inspect customer identity handling:
1. Review current auth implementation (local customer session vs. Supabase Auth).
2. Ensure customers are assigned strictly `role: 'customer'`.
3. Under no circumstances should frontend expose or allow customer registration with `owner`, `manager`, `cashier`, or `admin` roles.
4. Ensure addresses and order histories are scoped to the current customer ID / phone number.

---

### TASK 6 — CHECKOUT & ORDER SAFETY
Ensure:
1. **Double-Click Protection:** Disable checkout submit button immediately upon click (`isSubmitting: true`) with loading spinner.
2. **Idempotency Key:** Generate a unique `idempotencyKey` (`ord_idem_<timestamp>_<uuid>`) for every order attempt to prevent duplicate order placement on retry.
3. **Address Sanitization:** Disallow empty or whitespace-only address inputs.
4. **Stock Guard:** Re-validate cart against available stock before confirming checkout.

---

### TASK 7 — BACKEND INTEGRATION READINESS & GAP ANALYSIS
Compare `src/services/api/httpApiClient.ts` against the live backend endpoints in the inventory repository (`server/src/routes/ecommerceRoutes.ts`):
- `GET /api/v1/ecommerce/products`
- `GET /api/v1/ecommerce/products/:id`
- `GET /api/v1/ecommerce/categories`
- `POST /api/v1/ecommerce/cart/validate`
- `POST /api/v1/ecommerce/orders`
- `GET /api/v1/ecommerce/customer/orders`
- `GET /api/v1/ecommerce/customer/orders/:id`
- `POST /api/v1/ecommerce/customer/orders/:id/cancel`

Document any schema mismatches, missing payload parameters, or header requirements (e.g., `Authorization: Bearer <token>`, `x-idempotency-key`).

---

### TASK 8 — VERIFICATION, AUTOMATED TESTS & BUILD
1. Install any missing dependencies if needed: `npm install`.
2. Run TypeScript check: `npm run typecheck` (must pass with 0 errors).
3. Run Vite build: `npm run build` (must pass with 0 errors).
4. Add focused unit/component tests using Vitest for:
   - Cart calculations (subtotal, ₹300 free delivery threshold, ₹30 standard fee).
   - Quantity bounds and stock limits.
   - Address validation.
5. Start the Vite development server (`npm run dev`) and verify the real localhost URL.

---

### TASK 9 — FINAL REPORT DELIVERABLES
Generate two comprehensive documentation files:
1. `docs/FRONTEND_QA_REPORT.md`
   - Detailed breakdown of all 20 tested workflows.
   - Exact bugs identified and fixed.
   - Responsive testing results across all 8 viewports.
   - Product claim and disclaimer adjustments.
2. `docs/FRONTEND_BACKEND_INTEGRATION_READINESS.md`
   - Complete endpoint-by-endpoint compatibility matrix.
   - Auth strategy recommendations for customer login.
   - Production deployment readiness checklist.

---

## 3. STRICT OPERATIONAL RULES
- Do NOT touch or modify the existing inventory repository `Yogeshwari Dairy Shop Inventory System`.
- Do NOT execute any SQL migration on live Supabase.
- Do NOT deploy the Render backend service.
- Do NOT process real payment gateways or real transactions.
- Keep the clean YogiMart / Flipkart grocery aesthetic.
- Fix all real bugs and report results honestly.
```
