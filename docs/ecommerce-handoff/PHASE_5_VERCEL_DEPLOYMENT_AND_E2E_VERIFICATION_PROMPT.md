# YOGESHWARI DAIRY — PHASE 5: VERCEL DEPLOYMENT & LIVE END-TO-END VERIFICATION MASTER PROMPT

> **फ़ाइल का उपयोग कैसे करें (Instructions for User):**  
> अब आपकी E-Commerce वेबसाइट और इन्वेंटरी शॉप दोनों तरफ का कोड 100% पूरा हो चुका है, और `.env` फ़ाइल भी तैयार कर दी गई है!  
> यह मास्टर प्रॉम्प्ट वेबसाइट को **Vercel पर मुफ़्त में 2 मिनट के अंदर लाइव डिप्लॉय करने और मोबाइल से पहला लाइव टेस्ट ऑर्डर प्लेस करके काउंटर पर घंटी बजाने** के लिए है।  
> नीचे दिए गए पूरे प्रॉम्प्ट को कॉपी करें और नए सत्र में उपयोग करें।

---

```markdown
# MASTER PROMPT: PHASE 5 — VERCEL PRODUCTION DEPLOYMENT & LIVE END-TO-END VERIFICATION

You are acting as the Lead Release Engineer and Cloud Deployment Specialist for **Yogeshwari Dairy Products**.

We have completed the full-stack development:
1. **Customer E-Commerce Web (`D:\Projects\Yogeshwari-Dairy-Ecommerce`):**
   - 1,436 active products loaded live from Supabase PostgreSQL.
   - Cart, address selector, COD/UPI checkout, and live order tracking.
   - All tests passing (16/16 Vitest tests, 0 TypeScript errors).
   - Environment file `.env` configured with production keys.
2. **Inventory Shop POS (`D:\Projects\Yogeshwari Dairy Shop Inventory System`):**
   - "Online Orders" dashboard activated with real-time sound alert (*Ding-Dong 🔔*).
   - Status actions: `Accept` ➔ `Packing` ➔ `Out for Delivery` ➔ `Delivered`.
   - Batch stock deduction and 58mm/80mm thermal receipt printing.
   - All 38 backend tests passing, 0 TypeScript errors.

---

## 1. PHASE 5 MISSION GOALS

1. **Verify `.env` and Production Environment Configuration**
2. **Configure `vercel.json` for Single-Page Application (SPA) Routing**
   - Prevent 404 errors on direct navigation or refresh of `/orders`, `/track/:orderId`.
3. **Deploy Customer E-Commerce to Vercel**
   - Connect GitHub repository `https://github.com/Umesh-Temburwar/Yogeshwari-Dairy-Ecommerce`.
   - Configure Vercel production environment variables.
   - Obtain live public HTTPS URL (e.g. `https://yogeshwari-dairy.vercel.app`).
4. **Conduct End-to-End Live Order Verification Flow**
   - Place a real order from mobile phone on the live Vercel URL.
   - Verify the counter POS in the dairy shop rings with audio chime and shows the order instantly.
   - Accept, dispatch, and mark delivered, verifying live customer tracking and stock deduction.

---

## 2. STEP-BY-STEP DEPLOYMENT INSTRUCTIONS

### TASK 1 — VERCEL SPA ROUTING CONFIGURATION
In `D:\Projects\Yogeshwari-Dairy-Ecommerce`:
1. Verify or create `vercel.json`:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ],
     "headers": [
       {
         "source": "/assets/(.*)",
         "headers": [
           {
             "key": "Cache-Control",
             "value": "public, max-age=31536000, immutable"
           }
         ]
       }
     ]
   }
   ```
2. Run build verification:
   ```bash
   npm run build
   ```
   Confirm `dist/` is generated cleanly without errors.

---

### TASK 2 — VERIFY `.env` CONFIGURATION IN E-COMMERCE
Ensure the root `.env` file contains:
```env
# Production Mode: Direct Supabase & Backend Connection
VITE_USE_MOCK_API=false

# Render Express Backend API
VITE_BACKEND_URL=https://yogeshwari-dairy-shop-inventory-system.onrender.com/api/v1/ecommerce
VITE_API_BASE_URL=https://yogeshwari-dairy-shop-inventory-system.onrender.com/api/v1

# Supabase Production PostgreSQL & Realtime (Safe Client-side Anon Key)
VITE_SUPABASE_URL=https://pfamoxreojbejufwhgiu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmYW1veHJlb2piZWp1ZndoZ2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzNzc0MjEsImV4cCI6MjEwOTk1MzQyMX0.p97fdh4S8TxkVhQN5z14AApdFj6x5zsqPTQlLSXlD8E

# Dairy Store Details
VITE_STORE_NAME=Yogeshwari Dairy Products
VITE_STORE_PHONE=+919370869896
VITE_FREE_DELIVERY_THRESHOLD=300
VITE_STANDARD_DELIVERY_FEE=30
```

---

### TASK 3 — VERCEL DEPLOYMENT SETUP
1. Push all latest changes to GitHub:
   ```bash
   git add .
   git commit -m "chore: prepare for vercel production deployment"
   git push origin main
   ```
2. Open **[Vercel Dashboard](https://vercel.com/new)**:
   - Click **"Add New..." ➔ Project**.
   - Import Git Repository: `Umesh-Temburwar/Yogeshwari-Dairy-Ecommerce`.
   - Framework Preset: **Vite**.
   - Root Directory: `./` (leave default).
3. Under **Environment Variables**, add the 8 production keys from Section 2:
   - `VITE_USE_MOCK_API` = `false`
   - `VITE_BACKEND_URL` = `https://yogeshwari-dairy-shop-inventory-system.onrender.com/api/v1/ecommerce`
   - `VITE_API_BASE_URL` = `https://yogeshwari-dairy-shop-inventory-system.onrender.com/api/v1`
   - `VITE_SUPABASE_URL` = `https://pfamoxreojbejufwhgiu.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGci...`
   - `VITE_STORE_NAME` = `Yogeshwari Dairy Products`
   - `VITE_STORE_PHONE` = `+919370869896`
   - `VITE_FREE_DELIVERY_THRESHOLD` = `300`
   - `VITE_STANDARD_DELIVERY_FEE` = `30`
4. Click **Deploy**.
   - Build completes in ~30-45 seconds.
   - Vercel provides a live URL (e.g. `https://yogeshwari-dairy-ecommerce.vercel.app`).

---

### TASK 4 — LIVE END-TO-END ORDER VERIFICATION (CHECKLIST)
Perform the real-world checkout test:

1. **Open Live Website on Mobile Browser:**
   - Visit the live Vercel URL on your Android/iPhone smartphone.
   - Verify category tabs (`Milk`, `Paneer & Butter`, `Curd & Chaas`, etc.) load rapidly.
   - Verify 1,436 products display real prices and available stock.
2. **Add Products to Cart:**
   - Tap `ADD +` on 2x Milk and 1x Paneer.
   - Verify the sticky floating cart pill appears at the bottom with item count and subtotal.
3. **Checkout with Cash on Delivery (COD):**
   - Click "View Cart".
   - Fill delivery address (Street, Landmark, Pincode).
   - Select Payment: **Cash on Delivery (COD)**.
   - Tap **"Place Order"**.
   - Confetti animation plays, and screen redirects to `/track/YD-ORD-...`.
4. **Counter POS Verification:**
   - In the Dairy Shop Inventory System, observe the **"Online Orders"** tab.
   - **Audio Chime (Ding-Dong 🔔)** plays on the counter computer.
   - New order appears highlighted with status `PLACED (Pending Action)`.
5. **Staff Fulfillment & Live Customer Tracking:**
   - Staff clicks **"Accept Order"** ➔ Status updates to `CONFIRMED`.
   - Customer's mobile screen updates to `Confirmed 👍` in real-time.
   - Staff clicks **"Out for Delivery"** ➔ Rider prints 58mm/80mm slip.
   - Staff clicks **"Mark Delivered & Paid"** ➔ Order marked `DELIVERED` and COD payment collected.
   - Store inventory automatically reflects batch deduction!

---

## 3. STRICT OPERATIONAL RULES
- Do not expose any database service-role keys or passwords in the client bundle.
- Ensure counter POS billing (`public.sales`) remains 100% isolated and unaffected.
- Keep the clean Blinkit / Flipkart grocery layout and mobile-safe area padding intact.
```
