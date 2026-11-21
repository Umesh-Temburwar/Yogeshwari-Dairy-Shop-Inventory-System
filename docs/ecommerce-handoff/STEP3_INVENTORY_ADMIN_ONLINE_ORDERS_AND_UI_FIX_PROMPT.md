# YOGESHWARI DAIRY INVENTORY SYSTEM — ONLINE ORDERS DASHBOARD & MOBILE UI FIX PROMPT

> **फ़ाइल का उपयोग कैसे करें (Instructions for User):**  
> यह प्रॉम्प्ट विशेष रूप से आपके **इन्वेंटरी एडमिन ऐप** (`D:\Projects\Yogeshwari Dairy Shop Inventory System`) के लिए तैयार किया गया है।  
> नीचे दिए गए पूरे प्रॉम्प्ट (Triple Backticks ` ```markdown ` से लेकर अंतिम ` ``` ` तक) को कॉपी करके सीधे AI को दें।  
> यह इन्वेंटरी में **"Online Orders" टैब, साउंड अलर्ट (Ding 🔔), FEFO स्टॉक डिडक्शन, और आपके स्क्रीनशॉट वाले बॉटम पैडिंग फिक्सेस** को लागू कर देगा।

---

```markdown
# MASTER PROMPT: INVENTORY ADMIN "ONLINE ORDERS" DASHBOARD, REALTIME SOUND ALERTS & MOBILE UI POLISH

You are acting as the Lead Full-Stack Engineer and UI/UX Architect for **Yogeshwari Dairy Shop Inventory System**.

**Working Directory:** `D:\Projects\Yogeshwari Dairy Shop Inventory System`  
**Target Repository:** `https://github.com/Umesh-Temburwar/Yogeshwari-Dairy-Shop-Inventory-System`  
**Active Branch:** `feature/ecommerce-backend-integration`

---

## 1. MISSION GOAL

Implement the **Shop Counter Online Orders Dashboard** and fix the **Mobile Navigation Padding Issues** reported in mobile screenshots:

1. **"Online Orders" Dashboard & Workflow:**  
   Allow the shopkeeper/cashier to receive, review, accept, dispatch, and track customer orders placed through the e-commerce website.
2. **Realtime Audio & Visual Alert (Ding 🔔):**  
   Whenever a customer places an order on the website, play a crisp Web Audio chime (*"Ding-Dong!"*) and show an animated banner/toast on the counter POS screen without page refresh.
3. **FEFO Batch Stock Deduction:**  
   When the order is dispatched/delivered, automatically deduct stock from the oldest unexpired batches in `public.batches`.
4. **Mobile Navigation Padding Fixes (Screenshots Polish):**  
   Fix the 5-button bottom navbar (`MobileActionBar`) overlapping issue in modals and bottom sheets (`ReturnProductModal.tsx`, `Stock & Inventory` sheet, `Add Stock` modal, `Daily Sales` reports sheet).

---

## 2. DETAILED REQUIREMENTS & IMPLEMENTATION SPECIFICATIONS

### TASK 1 — REALTIME SOUND & NOTIFICATION LISTENER
1. In `src/context/StoreContext.tsx` or a dedicated hook `src/hooks/useOnlineOrdersRealtime.ts`:
   - Subscribe to Supabase table `ecommerce_orders`:
     ```typescript
     supabase
       .channel('counter-ecommerce-orders')
       .on(
         'postgres_changes',
         { event: 'INSERT', schema: 'public', table: 'ecommerce_orders' },
         (payload) => {
           handleNewOnlineOrder(payload.new);
         }
       )
       .subscribe();
     ```
2. **Synthesized Web Audio Chime (Zero External Asset Dependency):**
   - Create `src/utils/audioChime.ts`:
     ```typescript
     export const playNewOrderChime = () => {
       try {
         const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
         const playTone = (freq: number, start: number, duration: number) => {
           const osc = ctx.createOscillator();
           const gain = ctx.createGain();
           osc.type = 'sine';
           osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
           gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
           gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
           osc.connect(gain);
           gain.connect(ctx.destination);
           osc.start(ctx.currentTime + start);
           osc.stop(ctx.currentTime + start + duration);
         };
         // Crisp 2-tone doorbell chime (880Hz -> 1046Hz)
         playTone(880, 0, 0.25);
         playTone(1046, 0.2, 0.4);
       } catch (err) {
         console.warn('Audio chime unavailable:', err);
       }
     };
     ```
3. Show immediate visual toast with customer name, items summary, and total amount:
   *"🔔 New Online Order #ORD-1002 from Ramesh Kumar (₹320) - [View Order]"*.
4. Top Navbar Badge: Add an Online Orders bell/icon with red counter badge in `Navbar.tsx`. Clicking it directly switches `activeView = 'online-orders'`.

---

### TASK 2 — "ONLINE ORDERS" DASHBOARD COMPONENT
Create `src/components/OnlineOrders/OnlineOrdersManager.tsx`:
1. **Tabs & Status Filters:**
   - `All Orders`
   - `Pending (Action Needed ⏳)`
   - `Confirmed 👍`
   - `Preparing (Packing 🥛)`
   - `Out for Delivery 🛵`
   - `Delivered 🎉`
   - `Cancelled ❌`
2. **Order Card Details:**
   - Order Number (`#ORD-1002`) & Date/Time
   - Customer Name & Phone Number (with one-click "📞 Call" and "💬 WhatsApp" buttons)
   - Delivery Address Card (with Landmark, City, Pincode)
   - Items Table: Product Name, Pack Size, Quantity, Unit Selling Price, Item Total
   - Payment Mode: `Cash on Delivery (COD)` or `UPI on Delivery`
   - Delivery Fee and Grand Total Amount
   - Customer Notes (e.g. *"Deliver before 8:00 AM"*)
3. **Staff Action Buttons & Status Progression:**
   - **`[ Accept Order ]`**: Moves `pending` ➔ `confirmed`.
   - **`[ Start Packing ]`**: Moves `confirmed` ➔ `preparing`.
   - **`[ Dispatch (Out for Delivery) ]`**: Moves `preparing` ➔ `out_for_delivery`.
     - Allocates batches and decrements stock from unexpired batches via FEFO.
   - **`[ Mark Delivered & Collected ]`**: Moves `out_for_delivery` ➔ `delivered`. Records payment received.
   - **`[ Reject / Cancel Order ]`**: Modal prompting for cancellation reason (e.g. *"Out of stock"*, *"Address unserviceable"*). Restores stock if already allocated.
4. **Thermal Receipt Slip (Print):**
   - Button to print 58mm / 80mm compact kitchen/delivery receipt with store name, customer address, items list, and grand total.

---

### TASK 3 — WIRE INTO NAVIGATION (`App.tsx`, `Sidebar.tsx`, `MobileActionBar.tsx`)
1. In `src/context/StoreContext.tsx`:
   - Add `'online-orders'` to `AppView` type.
2. In `src/App.tsx`:
   - Lazy load `OnlineOrdersManager`.
   - Render `{activeView === 'online-orders' && <OnlineOrdersManager />}`.
3. In `src/components/Sidebar.tsx`:
   - Add "Online Orders" menu item with live pending count badge.
4. In `src/components/Navbar.tsx`:
   - Add Online Orders icon button with pending counter.
5. In `src/components/MobileActionBar.tsx`:
   - Show notification badge over "Menu" or add "Orders" tab.

---

### TASK 4 — MOBILE SAFE-AREA & PADDING FIXES (SCREENSHOTS AUDIT)
Fix the 5-button bottom navbar overlapping issues across the inventory app:

1. **`src/components/Returns/ReturnProductModal.tsx`:**
   - Find the submit button: `"⚡ Cancel Full Bill & Confirm Return (Refund: ₹...)"`.
   - Add `mb-24 pb-8` and ensure modal container has `max-h-[85vh] overflow-y-auto` so the button is completely visible above the bottom navigation bar on all phones.
2. **`Stock & Inventory` Sheet (`View, Filters & Exports`):**
   - Ensure the sheet's inner container has `pb-28` so "Stock PDF", "Print", "View PDF", "CSV / Excel" buttons are easily tap-able and not clipped.
3. **`Add Stock & Batch Expiry Entry` Modal:**
   - In the modal form, add `pb-28` padding to the submit section so "Confirm Stock Inward" button is never hidden.
4. **`Daily Sales` & `Purchases` Reports Bottom Sheets:**
   - Add `pb-28` bottom spacing to reports sheets so "View Sales PDF", "Print Report", "Export CSV" buttons remain fully accessible.
5. **Touch Targets & Zero Horizontal Overflow:**
   - Ensure all touch targets are at least `44x44px`.
   - Ensure `overflow-x-hidden` on mobile containers.

---

## 3. VERIFICATION & SAFETY CHECKS
1. Run `npm run typecheck` (ensure 0 TypeScript errors).
2. Run `npm --prefix server run test` (ensure all 36 backend tests pass).
3. Verify POS billing counters (`public.sales`) remain 100% isolated and unaffected.
4. Verify mobile viewports (360px, 390px, 412px) in Chrome DevTools to ensure zero overlap.
```
