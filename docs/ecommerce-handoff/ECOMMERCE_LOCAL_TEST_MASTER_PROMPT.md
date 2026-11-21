# YOGESHWARI DAIRY CUSTOMER E-COMMERCE — LOCAL TESTING MASTER PROMPT

> **फ़ाइल का उपयोग कैसे करें (Instructions for User):**  
> यह प्रॉम्प्ट आपके **कस्टमर E-Commerce ऐप** (`D:\Projects\Yogeshwari-Dairy-Ecommerce`) की **100% सुरक्षित लोकल टेस्टिंग** के लिए तैयार किया गया है।  
> नीचे दिए गए पूरे प्रॉम्प्ट (Triple Backticks ` ```markdown ` से लेकर अंतिम ` ``` ` तक) को कॉपी करें और **E-Commerce प्रोजेक्ट** के Antigravity सत्र में पेस्ट करें।  
> इससे बिना प्रोडक्शन डेटाबेस को छुए पूरा लोकल टेस्ट रन होगा और `docs/ECOMMERCE_LOCAL_TEST_REPORT.md` जनरेट हो जाएगी।

---

```markdown
# MASTER PROMPT: CUSTOMER E-COMMERCE LOCAL TESTING & QUALITY VERIFICATION (ZERO PRODUCTION IMPACT)

You are acting as the Principal QA & Test Automation Architect for **Yogeshwari Dairy Products Customer E-Commerce**.

**Workspace Directory:** `D:\Projects\Yogeshwari-Dairy-Ecommerce`  
**GitHub Repository:** `https://github.com/Umesh-Temburwar/Yogeshwari-Dairy-Ecommerce`

---

## 1. MANDATORY SAFETY DIRECTIVES
- **Zero Production Mutations:** Do NOT execute any SQL migration or modify live production tables on Supabase (`pfamoxreojbejufwhgiu`).
- **Zero Real Orders in Production:** Use local mock orders or isolated client-side test queues.
- **Zero Production Deployments:** Do NOT deploy to Render or Vercel.
- **Zero Payment Gateway Calls:** COD and UPI modes must remain test placeholders.
- **Strict Isolation:** Ensure local testing cannot cause duplicate stock deductions or affect the physical shop counter POS billing.

---

## 2. TESTING OBJECTIVES & SCOPE

Perform a comprehensive local audit and automated verification across the entire customer e-commerce application.

### TASK 1 — LOCAL DEV SERVER & NAVIGATION VERIFICATION
1. Start the Vite development server (`npm run dev`).
2. Verify the real active localhost URL (e.g. `http://localhost:5173/` or `http://localhost:5174/`).
3. Verify that direct browser navigation and refresh (`F5`) on all routes work without crashing:
   - `/` (Homepage & Product Catalog)
   - `/orders` (Customer Order History)
   - `/track/:orderId` (Live Order Tracking)
   - 404 Not Found fallback route.

---

### TASK 2 — PRODUCT CATALOGUE & SEARCH TESTING
1. **Category Filter Testing:**
   - Test clicking category pills: `All`, `Milk`, `Paneer & Butter`, `Curd & Chaas`, `Ghee`, `Mithai`, `Bakery`.
   - Verify products filter instantly without layout glitching.
2. **Real-time Search:**
   - Search by product name (e.g. "Milk", "Paneer", "Ghee").
   - Search by brand or category.
   - Verify empty state: Searching for a non-existent item (e.g. "XYZ123") displays a clean "No products found" message with a "Clear Search" button.
3. **Product Card & Modal:**
   - Click a product card to open `ProductDetailModal`.
   - Verify pack size badge, selling price, image, and stock status are displayed cleanly.

---

### TASK 3 — CART & PRICING RULES VERIFICATION
1. **Add to Cart & Quantity Selector:**
   - Tap `ADD +` on a product ➔ verifies it expands into `[-] [1] [+]`.
   - Test rapid incrementing and decrementing.
   - Decrement from 1 to 0 ➔ item smoothly removes from cart.
2. **Stock Limit Protection:**
   - Attempt to add more units than `availableStock`.
   - Verify the UI disables the `+` button or shows a warning when max stock is reached.
3. **Cart Persistence:**
   - Add 3 items to cart.
   - Refresh browser (`F5`).
   - Verify cart items, quantities, and totals persist via `localStorage`.
4. **Delivery Fee Calculation Rule:**
   - **Case A (Subtotal < ₹300):** Subtotal ₹180 ➔ Delivery fee must be **₹30** (Total: ₹210). Verify banner: *"Add ₹120 more for FREE delivery!"*.
   - **Case B (Subtotal ≥ ₹300):** Subtotal ₹340 ➔ Delivery fee must be **₹0 (Free)** (Total: ₹340). Verify green badge: *"Congratulations! You have unlocked FREE Delivery!"*.

---

### TASK 4 — CHECKOUT & ORDER CREATION SAFETY
1. **Address Selection & Validation:**
   - Open `AddressSelectorModal`.
   - Test adding, selecting, and editing delivery addresses (Home, Work, Other).
   - Verify form validation: Reject submission if street, pincode, or phone number is invalid (must be valid 10-digit Indian phone).
2. **Double-Click & Idempotency Guard:**
   - In `CartDrawer.tsx`, verify submit button shows spinner and disables immediately upon click (`isSubmitting = true`).
   - Confirm a unique `idempotencyKey` (`ord_idem_<timestamp>_<uuid>`) is generated for every order.
3. **Payment Methods:**
   - Verify **Cash on Delivery (COD)** selection.
   - Verify **UPI on Delivery (Scan QR code at doorstep)** selection with clear customer instructions.
4. **Order Confirmation:**
   - Submit order ➔ verify confetti animation triggers.
   - Verify cart is cleared immediately.
   - Verify redirect to `/track/:orderId`.
   - Verify WhatsApp order share link encodes the order details cleanly.

---

### TASK 5 — ORDER TRACKING & CANCELLATION
1. **Live Order Tracker Screen (`/track/:orderId`):**
   - Verify visual step indicator: `Placed` ➔ `Confirmed` ➔ `Packing` ➔ `Out for Delivery` ➔ `Delivered`.
   - Verify customer delivery address, items list, and payment mode are displayed accurately.
2. **Customer Order Cancellation:**
   - Click "Cancel Order" on a `Placed` or `Confirmed` order.
   - Confirm cancellation modal opens asking for confirmation.
   - Verify order status updates to `CANCELLED` and cancellation timestamp is recorded.
   - Verify that repeated cancellation attempts are blocked or handled idempotently.

---

### TASK 6 — MOBILE RESPONSIVENESS & SAFE AREAS AUDIT
Test layout across 5 critical screen viewports:
- **320px** (iPhone SE 1st Gen / Small Android)
- **360px** (Galaxy S8 / Compact Android)
- **390px** (iPhone 12/13/14/15 standard)
- **428px** (iPhone Pro Max / Plus)
- **768px** (iPad / Tablet)

**Ensure:**
- **Zero Horizontal Wobble:** Container has `overflow-x-hidden`.
- **Floating Cart Pill:** `FloatingCartBar` sits at `fixed bottom-4 inset-x-4 max-w-md mx-auto z-40` with `pb-28` page padding so it **never covers bottom content**.
- **Drawers & Modals:** `CartDrawer`, `ProductDetailModal`, and `AddressSelectorModal` have `max-h-[85vh] overflow-y-auto pb-safe` so buttons are always clickable.
- **Touch Targets:** All buttons are at least `44x44px`.

---

### TASK 7 — AUTOMATED TESTS, BUILD & VERIFICATION
1. Run automated test suite:
   ```bash
   npm test
   ```
   (Must pass 100% of tests).
2. Run TypeScript typecheck:
   ```bash
   npm run typecheck
   ```
   (Must pass with 0 errors).
3. Run Vite production build:
   ```bash
   npm run build
   ```
   (Must succeed and generate `dist/` bundle).

---

### TASK 8 — DOCUMENTATION & FINAL REPORT
Generate the test report in:
📄 `docs/ECOMMERCE_LOCAL_TEST_REPORT.md`

Include:
1. Executive summary of local test results.
2. Verified localhost URL and port.
3. Functional test pass/fail matrix (All 20 workflows).
4. Responsive layout verification results across all 5 viewports.
5. Cart and delivery calculation test results.
6. Order creation and cancellation test results.
7. Any warnings, minor polish items, or blockers before production deployment.
```
