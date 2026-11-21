# YOGESHWARI DAIRY — PRODUCTION ACTIVATION & LIVE VERIFICATION MASTER PROMPT

> **फ़ाइल का उपयोग कैसे करें (Instructions for User):**  
> अब आपका पूरा कोड और 34 फ्रंटएंड + 38 बैकएंड टेस्ट्स 100% पास हो चुके हैं।  
> बस दो इंफ्रास्ट्रक्चर एक्टिवेशन बाकी हैं:
> 1. Supabase में SQL रन करना।
> 2. Render पर बैकएंड को लाइव करना।  
> नीचे दिया गया मास्टर प्रॉम्प्ट प्रोडक्शन एक्टिवेशन और लाइव वेरिफिकेशन के लिए तैयार किया गया है।

---

```markdown
# MASTER PROMPT: PRODUCTION INFRASTRUCTURE ACTIVATION & END-TO-END VERIFICATION

You are acting as the Lead Production Site Reliability Engineer (SRE) for **Yogeshwari Dairy Products**.

We have completed all code hardening, mobile-safe layout fixes, audio alerts, and automated tests:
- Customer E-Commerce App: 34/34 tests pass, 0 TypeScript errors.
- Inventory Admin System: 38/38 tests pass, 0 TypeScript errors.

Now, we are activating live production integration across:
- **Supabase PostgreSQL:** `https://pfamoxreojbejufwhgiu.supabase.co`
- **Render Express Backend:** `https://yogeshwari-dairy-shop-inventory-system.onrender.com`
- **Customer Web (Vercel):** `https://github.com/Umesh-Temburwar/Yogeshwari-Dairy-Ecommerce`

---

## 1. PRODUCTION ACTIVATION CHECKLIST

### STEP 1 — VERIFY SUPABASE SQL MIGRATION
Confirm that `78_phase78_ecommerce_orders_and_stock_reservations.sql` has been executed in the Supabase SQL Editor:
1. Verify `public.ecommerce_orders` table exists.
2. Verify `public.ecommerce_order_items` table exists.
3. Verify view `public.v_ecommerce_products` returns sanitized catalogue.
4. Verify function `public.fn_create_ecommerce_order_atomic` exists and has execute permissions.
5. Verify `supabase_realtime` publication broadcasts `ecommerce_orders`.

### STEP 2 — VERIFY RENDER EXPRESS BACKEND DEPLOYMENT
In `https://yogeshwari-dairy-shop-inventory-system.onrender.com`:
1. Probe `GET /api/v1/ecommerce/products`:
   - Must return `200 OK` with `{ success: true, data: { items: [...] } }`.
   - Confirm sensitive wholesale purchase costs and profit margins are stripped.
2. Probe `GET /api/v1/ecommerce/categories`:
   - Must return `200 OK` with category counts.
3. Probe `POST /api/v1/ecommerce/cart/validate`:
   - Must return `200 OK` with dynamic delivery fee (Free >= ₹300, else ₹30).

---

## 2. LIVE END-TO-END VERIFICATION FLOW

Conduct a real-world checkout test:

### A. Customer Order Placement (Mobile / Desktop)
1. Open the live customer store:
   - Add **1 Litre Fresh Cow Milk (₹60)** to cart.
   - Add **200g Fresh Malai Paneer (₹60)** to cart.
2. Proceed to Checkout:
   - Delivery Address: Street, Landmark, Bhandara, 441904.
   - Phone: Valid 10-digit mobile number.
   - Payment Method: **Cash on Delivery (COD)**.
3. Tap **"Place Order"**:
   - Order is created atomically via `fn_create_ecommerce_order_atomic`.
   - Confetti animation triggers.
   - Redirects to `/track/:orderId`.

### B. Dairy Shop Counter POS Notification
1. In `Yogeshwari Dairy Shop Inventory System`:
   - The counter POS computer immediately plays the **Web Audio chime (Ding-Dong 🔔)**.
   - The Top Navbar shopping bag badge updates with red counter (`1 Pending`).
   - The new order appears highlighted in the **"Online Orders"** screen with customer details and item summary.

### C. Staff Fulfillment & Customer Sync
1. Staff clicks **"Accept Order"** ➔ Status updates to `CONFIRMED`.
   - Customer's screen instantly updates to `Confirmed 👍` via Supabase Realtime without page refresh.
2. Staff clicks **"Out for Delivery"** ➔ Status updates to `OUT_FOR_DELIVERY`.
   - Staff prints 58mm / 80mm thermal delivery slip for rider.
3. Staff clicks **"Mark Delivered & Paid"** ➔ Order marked `DELIVERED` and COD payment collected.
4. Verify physical store inventory reflects batch deduction accurately.

---

## 3. FINAL ACCEPTANCE & COMPLETION
Generate:
📄 `docs/FINAL_PRODUCTION_LAUNCH_REPORT.md`
Confirming:
- Supabase RPC response time and status.
- Render API endpoint status (200 OK).
- Live order lifecycle completion.
- Zero defects and complete system health.
```
