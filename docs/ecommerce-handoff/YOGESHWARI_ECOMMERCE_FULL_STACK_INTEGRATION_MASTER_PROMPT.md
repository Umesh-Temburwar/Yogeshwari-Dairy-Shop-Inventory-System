# YOGESHWARI DAIRY E-COMMERCE — FULL-STACK END-TO-END INTEGRATION MASTER PROMPT

> **फ़ाइल का उपयोग कैसे करें (Instructions for User):**  
> नीचे दिए गए पूरे प्रॉम्प्ट (Triple Backticks ` ```markdown ` से लेकर अंतिम ` ``` ` तक) को कॉपी करें और **`D:\Projects\Yogeshwari-Dairy-Ecommerce`** में एक नए Antigravity सत्र में पेस्ट कर दें।  
> यह प्रॉम्प्ट आपके E-commerce को मौजूदा इन्वेंटरी, Supabase डेटाबेस, और Render बैकएंड से सीधे जोड़ देगा।

---

```markdown
# MASTER PROMPT: COMPLETE END-TO-END INTEGRATION OF YOGESHWARI DAIRY E-COMMERCE WITH INVENTORY SYSTEM

You are acting as the Principal Full-Stack Architect and Lead Systems Engineer for **Yogeshwari Dairy Products**.

Your mission is to perform the complete, end-to-end integration of the customer e-commerce web application with the existing production inventory management system, Supabase database, and Express backend API.

---

## 1. REPOSITORIES & ARCHITECTURAL OVERVIEW

1. **Customer E-Commerce Web Application (Current Workspace):**
   - Directory: `D:\Projects\Yogeshwari-Dairy-Ecommerce`
   - GitHub: `https://github.com/Umesh-Temburwar/Yogeshwari-Dairy-Ecommerce`
   - Stack: React 18.3, TypeScript 5.7, Vite 6.1, Tailwind CSS 3.4, Zustand 5.0, Lucide Icons
   - UI Design: Indian quick-commerce layout inspired by **Blinkit** and **Flipkart Grocery** (clean green & butter-gold dairy branding, fast category scroller, sticky floating cart, and mobile-safe drawers).

2. **Existing Production Inventory Admin System:**
   - Directory: `D:\Projects\Yogeshwari Dairy Shop Inventory System`
   - GitHub: `https://github.com/Umesh-Temburwar/Yogeshwari-Dairy-Shop-Inventory-System`
   - Branch: `feature/ecommerce-backend-integration`
   - Manages physical counter POS billing, milk collection, suppliers, purchases, and khata ledger.

3. **Existing Render Express Backend:**
   - Base Service URL: `https://yogeshwari-dairy-shop-inventory-system.onrender.com`
   - API Base: `https://yogeshwari-dairy-shop-inventory-system.onrender.com/api/v1`
   - E-Commerce Endpoints: `https://yogeshwari-dairy-shop-inventory-system.onrender.com/api/v1/ecommerce`

4. **Existing Production Supabase Project:**
   - Project URL: `https://pfamoxreojbejufwhgiu.supabase.co`
   - Public Anon Key: Configured in Section 2 below.
   - Database: PostgreSQL 15 with Row-Level Security (RLS) and real product catalog (368+ products).

---

## 2. ENVIRONMENT CONFIGURATION (EXACT KEYS & VARIABLES)

Set up the environment files in the root of `D:\Projects\Yogeshwari-Dairy-Ecommerce`:

### A. `.env.production` (Live Production Integration)
```env
# E-Commerce Mode (false = live backend connection)
VITE_USE_MOCK_API=false

# Render Express Backend Endpoints
VITE_BACKEND_URL=https://yogeshwari-dairy-shop-inventory-system.onrender.com/api/v1/ecommerce
VITE_API_BASE_URL=https://yogeshwari-dairy-shop-inventory-system.onrender.com/api/v1

# Supabase Production Configuration (Client-side Anon Key only)
VITE_SUPABASE_URL=https://pfamoxreojbejufwhgiu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmYW1veHJlb2piZWp1ZndoZ2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzNzc0MjEsImV4cCI6MjEwOTk1MzQyMX0.p97fdh4S8TxkVhQN5z14AApdFj6x5zsqPTQlLSXlD8E

# Dairy Store Details
VITE_STORE_NAME=Yogeshwari Dairy Products
VITE_STORE_PHONE=+919876543210
VITE_FREE_DELIVERY_THRESHOLD=300
VITE_STANDARD_DELIVERY_FEE=30
```

### B. `.env.development` (Local Development & Fallback)
```env
# Toggle between true (local mock) and false (live Render API)
VITE_USE_MOCK_API=false

VITE_BACKEND_URL=https://yogeshwari-dairy-shop-inventory-system.onrender.com/api/v1/ecommerce
VITE_API_BASE_URL=https://yogeshwari-dairy-shop-inventory-system.onrender.com/api/v1
VITE_SUPABASE_URL=https://pfamoxreojbejufwhgiu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmYW1veHJlb2piZWp1ZndoZ2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzNzc0MjEsImV4cCI6MjEwOTk1MzQyMX0.p97fdh4S8TxkVhQN5z14AApdFj6x5zsqPTQlLSXlD8E
VITE_STORE_NAME=Yogeshwari Dairy Products
VITE_STORE_PHONE=+919876543210
VITE_FREE_DELIVERY_THRESHOLD=300
VITE_STANDARD_DELIVERY_FEE=30
```

### C. `.env.example`
Provide clean template with instructions and no secrets.

---

## 3. REAL INVENTORY DATA CONNECTION & SANITIZATION RULES

The e-commerce customer website must display **real products, genuine selling prices, and live available stock** from the inventory system, with **zero risk** of exposing confidential business metrics.

### 3.1 Data Source Priority Architecture
In `src/services/api/httpApiClient.ts` (or combined client):
1. **Primary Source:** Call Render Backend Endpoint:
   `GET https://yogeshwari-dairy-shop-inventory-system.onrender.com/api/v1/ecommerce/products`
2. **Direct Supabase Fallback (if Render is cold-starting):**
   Query Supabase directly using the `@supabase/supabase-js` client with `VITE_SUPABASE_ANON_KEY`:
   - Query `v_ecommerce_products` view, or fallback to `v_product_stock` (where `is_active = true`).
3. **Offline Mock Fallback:**
   If offline or network fails, gracefully render local mock products with an offline badge.

### 3.2 Strict Data Sanitization Guardrails
Customer responses MUST contain ONLY:
- `id` (UUID)
- `name` (e.g. "Amul Taaza Toned Milk 500ml", "Fresh Malai Paneer 250g")
- `pack_size` (e.g. "500 ml", "1 kg")
- `category` & `category_id` (e.g. "Milk", "Paneer & Khoya", "Ghee & Butter")
- `unit` (Piece, Pkt, Kg, Ltr)
- `selling_price` (Official retail selling price)
- `mrp` (Max Retail Price, for legitimate discount calculation)
- `image_url` (Packshot image URL)
- `available_stock` (Quantity in stock from unexpired batches)
- `is_in_stock` (Boolean: stock > 0)

**NEVER EXPOSE TO CUSTOMER:**
- ❌ `purchase_price` (wholesale purchase cost)
- ❌ `stock_value` (total inventory value)
- ❌ `supplier_id` / `supplier_name`
- ❌ Profit margins or markup percentages
- ❌ Expired batches

---

## 4. UI & LAYOUT SPECIFICATIONS (PRESERVING EXACT QUICK-COMMERCE FEEL)

Preserve the existing Blinkit / Flipkart style mobile-first layout:

### 4.1 Header & Brand Identity
- **Logo & Title:** Yogeshwari Dairy Products (with fresh cow/milk icon).
- **Delivery Badge:** `⚡ 15-30 Mins Delivery` | `Shop Open`
- **Location Chip:** Tap to open Address Selector modal.
- **Search Bar:** Real-time filter across product name, category, and brand.

### 4.2 Category Navigation
- Horizontal scrolling pill tabs:
  - `All`
  - `Milk` (Cow Milk, Buffalo Milk, Toned, Full Cream)
  - `Paneer & Khoya` (Fresh Paneer, Malai Paneer, Mawa)
  - `Dahi, Chaas & Lassi`
  - `Desi Ghee & Butter`
  - `Sweets & Shrikhand`
  - `Bakery & Daily Staples`

### 4.3 Product Card (Blinkit Style)
- Image container with aspect-square and fallback placeholder.
- Pack size badge (`500 ml`, `250 g`, `1 L`).
- Title with 2-line clamp.
- Price display: `₹32` (strike-through MRP `₹35` if discount > 0).
- Stock indicator: Subtle red pill if stock < 5 (`Only 3 left!`), or gray disabled if out of stock.
- Interactive `ADD` button:
  - Initial state: Crisp green `ADD +` button.
  - Active state: Expands to `[-] [ qty ] [+]` with micro-vibration haptic feedback.

### 4.4 Mobile-Safe Bottom Navigation & Floating Cart Bar
> **CRITICAL FIX FROM USER SCREENSHOTS:**
> To prevent buttons from ever being hidden behind mobile navigation bars:
- `FloatingCartBar`: Placed at `fixed bottom-4 inset-x-4 max-w-md mx-auto z-40`.
- All pages must have `pb-28` (padding-bottom 7rem) so bottom content is never obscured.
- All Bottom Sheets (`CartDrawer`, `AddressSelectorModal`, `ProductDetailModal`):
  - Must have `pb-safe` / `pb-8` inside the scrollable container.
  - Action buttons (Checkout, Confirm Address, Submit) must have explicit `mb-4` clearance.

### 4.5 Cart Drawer & Checkout Flow
- **Free Delivery Progress Bar:**
  *"Add ₹X more to get FREE Delivery!"* (Free delivery for orders ≥ ₹300; standard ₹30 fee otherwise).
- **Delivery Address Card:** Display selected address with quick "Change" button.
- **Payment Method Selection:**
  - `Cash on Delivery (COD)` (Default)
  - `UPI on Delivery` (Scan QR code at doorstep upon delivery)
- **Order Total Breakdown:** Item Total, Delivery Partner Fee, Platform Fee (₹0), Total Amount.
- **Double-Click Protection:** Submit button shows spinner and disables instantly on click.
- **WhatsApp Share:** Generates formatted order details for store notification.

### 4.6 Live Order Tracking (`/track/:orderId`)
- Status progression: `Placed` ➔ `Confirmed` ➔ `Packing` ➔ `Out for Delivery` ➔ `Delivered`.
- Dairy contact button: Direct call / WhatsApp store.
- Order cancellation button for `pending` / `confirmed` status.

---

## 5. COMPLETE BACKEND API INTEGRATION MATRIX

The frontend API client (`src/services/api/httpApiClient.ts`) must cleanly map to these Render endpoints:

| Endpoint | Method | Frontend Service Call | Payload / Parameters |
| :--- | :--- | :--- | :--- |
| `/products` | `GET` | `getProducts(params)` | `?category=&search=&page=1&limit=50` |
| `/products/:id` | `GET` | `getProductById(id)` | Product ID parameter |
| `/categories` | `GET` | `getCategories()` | Returns distinct active categories |
| `/cart/validate` | `POST` | `validateCart(items)` | `{ items: [{ productId, quantity }] }` |
| `/orders` | `POST` | `placeOrder(orderPayload)` | Headers: `x-idempotency-key: <uuid>`, Body: customer details, address, items |
| `/customer/orders` | `GET` | `getCustomerOrders()` | Customer order history |
| `/customer/orders/:id` | `GET` | `getOrderById(orderId)` | Specific order tracking data |
| `/customer/orders/:id/cancel` | `POST` | `cancelOrder(orderId, reason)` | Order cancellation request |

---

## 6. STEP-BY-STEP IMPLEMENTATION & VERIFICATION PLAN

### Phase 1: Environment & API Client Verification
1. Inspect `.env.production` and `.env.development`. Verify correct Render and Supabase URLs.
2. In `src/services/api/httpApiClient.ts`, verify headers, error parsing, and timeout handling.
3. Verify `VITE_USE_MOCK_API=false` connects to real products from the backend.

### Phase 2: Live Inventory Catalogue Display
1. In `src/pages/HomePage.tsx` and `src/components/product/ProductCard.tsx`, ensure real product data renders correctly.
2. Verify category tabs filter both backend-returned categories and pre-defined quick categories.
3. Verify live `available_stock` displays correctly and prevents adding more than in-stock quantity.

### Phase 3: Mobile UI & Safe-Area Polish
1. Inspect `src/components/cart/FloatingCartBar.tsx`, `CartDrawer.tsx`, and `AddressSelectorModal.tsx`.
2. Ensure containers have `pb-28` and `max-h-[85vh] overflow-y-auto` so no buttons are clipped.
3. Test viewports: 360px, 390px, 412px, 768px, 1024px.

### Phase 4: Cart & Atomic Checkout
1. Add items to cart. Verify calculation:
   - Subtotal < ₹300 -> Delivery Fee = ₹30
   - Subtotal >= ₹300 -> Delivery Fee = ₹0
2. Fill address, select COD/UPI, and submit order.
3. Verify `idempotencyKey` is sent to avoid duplicate orders.
4. Verify order confirmation modal appears with confetti and saved order tracking link.

### Phase 5: Verification & Quality Checks
1. Run `npm run typecheck` (ensure 0 TypeScript errors).
2. Run `npm run build` (ensure Vite production build succeeds).
3. Start the dev server (`npm run dev`) and report the active localhost URL.

---

## 7. STRICT SAFETY RULES
- Do NOT run database migrations or delete data on Supabase.
- Do NOT deploy or restart the Render backend service.
- Do NOT expose any wholesale purchase prices or supplier data to the customer frontend.
- Preserve the existing UI styling, green/gold color palette, and component structure.
```
