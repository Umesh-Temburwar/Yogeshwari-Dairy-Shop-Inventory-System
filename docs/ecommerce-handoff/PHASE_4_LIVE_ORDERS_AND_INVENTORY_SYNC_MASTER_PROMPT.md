# YOGESHWARI DAIRY — PHASE 4: TWO-WAY LIVE ORDER SYNC & INVENTORY DISPATCH MASTER PROMPT

> **फ़ाइल का उपयोग कैसे करें (Instructions for User):**  
> 1,436 असली प्रोडक्ट्स और रियल-टाइम स्टॉक अब E-Commerce वेबसाइट पर लाइव दिख रहे हैं (`http://localhost:5174/`)!  
> अब अगला और सबसे महत्वपूर्ण कदम है: **कस्टमर द्वारा दिए गए ऑर्डर को सीधे Supabase डेटाबेस और इन्वेंटरी शॉप एडमिन पैनल में लाइव पहुँचाना।**  
> नीचे दिए गए पूरे प्रॉम्प्ट को कॉपी करके नए सत्र में उपयोग करें।

---

```markdown
# MASTER PROMPT: PHASE 4 — TWO-WAY LIVE ORDERS, INVENTORY DISPATCH & REALTIME ADMIN ALERTS

You are acting as the Principal Full-Stack Architect for **Yogeshwari Dairy Products**.

We have successfully connected the customer e-commerce website (`D:\Projects\Yogeshwari-Dairy-Ecommerce`) to our live Supabase PostgreSQL database, loading **1,436 active products and categories** in real-time.

---

## 1. THE MISSION FOR PHASE 4

Right now, customer order placement falls back to local storage because the live order tables have not been activated in Supabase.

Our goal in Phase 4 is to establish the **complete two-way production order lifecycle**:
1. **Customer Places Order on E-Commerce:**  
   Order is written directly to Supabase table `ecommerce_orders` & `ecommerce_order_items` with status `pending`.
2. **Shop Counter Real-Time Notification:**  
   The Inventory Admin POS application immediately receives a live visual & audio alert (*"🔔 New Online Order #ORD-1001 from Ramesh Kumar - ₹240"*).
3. **Staff Fulfillment Workflow:**  
   Shop manager accepts order ➔ status changes to `preparing` ➔ staff packs dairy items ➔ marks `out_for_delivery` ➔ marks `delivered`.
4. **FEFO Batch Stock Deduction:**  
   On order confirmation/dispatch, stock is decremented from the oldest unexpired batch in the physical shop.
5. **Customer Real-Time Tracking:**  
   The customer's tracking screen (`/track/:orderId`) updates instantly via Supabase Realtime without refreshing.

---

## 2. STEP-BY-STEP IMPLEMENTATION PLAN

### STEP 1 — ACTIVATE PHASE 78 DATABASE MIGRATION IN SUPABASE
Run the hardened migration file in Supabase SQL Editor:
- **File:** `supabase/78_phase78_ecommerce_orders_and_stock_reservations.sql`
- **Tables Activated:**
  - `ecommerce_orders` (UUID, order_number sequence, customer_name, customer_phone, delivery_address, total_amount, payment_method, status)
  - `ecommerce_order_items` (order_id, product_id, quantity, unit_price, subtotal)
  - `ecommerce_order_item_allocations` (tracks specific batch_id used for FEFO stock deduction)
  - `stock_reservations` (prevents double-booking during checkout)
- **Functions:**
  - `fn_create_ecommerce_order_atomic` (verifies unexpired stock, assigns batches, asserts `v_qty_needed = 0`)
  - `fn_cancel_ecommerce_order_atomic` (restores batch stock idempotently)
- **Security & RLS:**
  - Enables public/anon order creation while strictly scoping read access.

---

### STEP 2 — UPDATE E-COMMERCE CLIENT FOR DIRECT SUPABASE ORDER INSERTION
In `D:\Projects\Yogeshwari-Dairy-Ecommerce\src\services\api\httpApiClient.ts`:
1. When customer clicks "Place Order", insert order directly into Supabase:
   ```typescript
   const { data: order, error } = await supabase
     .from('ecommerce_orders')
     .insert({
       customer_name: payload.customerName,
       customer_phone: payload.customerPhone,
       delivery_address: payload.deliveryAddress,
       total_amount: payload.total,
       payment_method: payload.paymentMethod, // 'cod' | 'upi'
       notes: payload.notes,
       status: 'pending'
     })
     .select()
     .single();
   ```
2. Insert items into `ecommerce_order_items`.
3. Clear customer cart and redirect to `/track/:orderId`.
4. Save order ID to customer's local order history (`localStorage`).

---

### STEP 3 — REALTIME ORDER STATUS TRACKING (CUSTOMER APP)
In `D:\Projects\Yogeshwari-Dairy-Ecommerce\src\pages\TrackOrderPage.tsx`:
1. Subscribe to changes on `ecommerce_orders` for the active `orderId`:
   ```typescript
   const channel = supabase
     .channel(`order-${orderId}`)
     .on(
       'postgres_changes',
       { event: 'UPDATE', schema: 'public', table: 'ecommerce_orders', filter: `id=eq.${orderId}` },
       (payload) => {
         setOrder(payload.new as Order);
         // Play subtle update chime
       }
     )
     .subscribe();
   ```
2. Visually update status progress bar:
   - `pending` (Order Received ⏳)
   - `confirmed` (Accepted by Dairy 👍)
   - `preparing` (Packing Fresh Dairy 🥛)
   - `out_for_delivery` (Out for Delivery 🛵)
   - `delivered` (Delivered Successfully 🎉)
   - `cancelled` (Cancelled ❌)

---

### STEP 4 — INVENTORY ADMIN APP: "ONLINE ORDERS" DASHBOARD
In `D:\Projects\Yogeshwari Dairy Shop Inventory System`:
1. Add an **"Online Orders"** tab or floating badge in the main navigation.
2. Listen to incoming orders via Supabase Realtime:
   - Play audio notification chime (`/sounds/order-ding.mp3` or Web Audio oscillator beep).
   - Display toast: *"New Online Order #ORD-1002 from Ramesh Kumar (₹320)"*.
3. Order Management Actions:
   - **Accept Order:** Moves status from `pending` to `confirmed`.
   - **Pack & Dispatch:** Automatically deducts batch quantities via `fn_complete_sale_atomic` or FEFO batch deduction.
   - **Mark Delivered:** Finalizes payment collection (Cash or UPI).
   - **Reject / Cancel:** Restores stock if allocated, records cancellation reason.
4. Print Slip: Generate 58mm / 80mm thermal receipt slip for delivery rider.

---

### STEP 5 — PRODUCTION DEPLOYMENT (VERCEL)
1. In `D:\Projects\Yogeshwari-Dairy-Ecommerce`:
   - Verify `npm run typecheck` passes (0 errors).
   - Verify `npm run build` succeeds (dist folder generated).
2. Connect GitHub repo `https://github.com/Umesh-Temburwar/Yogeshwari-Dairy-Ecommerce` to Vercel.
3. Configure environment variables in Vercel project settings:
   - `VITE_USE_MOCK_API=false`
   - `VITE_SUPABASE_URL=https://pfamoxreojbejufwhgiu.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=...`
   - `VITE_BACKEND_URL=https://yogeshwari-dairy-shop-inventory-system.onrender.com/api/v1/ecommerce`
4. Deploy to live URL (e.g. `https://yogeshwari-dairy.vercel.app`).

---

## 3. STRICT OPERATIONAL RULES
- Do not modify existing physical counter POS billing tables (`sales`, `sale_items`). Online orders stay in `ecommerce_orders`.
- Counter POS cash register must remain isolated from online COD balances until marked collected by cashier.
- Zero customer privilege escalation: customer role is strictly `customer`.
- Keep existing mobile-friendly safe areas (`pb-28` / `pb-safe`) intact.
```
