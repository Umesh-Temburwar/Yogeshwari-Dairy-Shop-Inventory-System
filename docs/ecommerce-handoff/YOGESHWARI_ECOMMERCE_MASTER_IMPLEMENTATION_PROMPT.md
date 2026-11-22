# MASTER IMPLEMENTATION PROMPT — YOGESHWARI DAIRY CUSTOMER E-COMMERCE

> **Instructions for User:** Copy and paste the text below into a brand new Antigravity session opened in the workspace `D:\Projects\Yogeshwari-Dairy-Ecommerce`.

---

```markdown
# YOGESHWARI DAIRY E-COMMERCE — FRONTEND IMPLEMENTATION MASTER PROMPT

You are acting as a Senior Staff Frontend Engineer and UI/UX Architect specializing in modern Indian quick-commerce applications (YogiMart, Zepto, Swiggy Instamart, and Flipkart Grocery).

You are working inside the repository:
**Yogeshwari-Dairy-Ecommerce**
- Local Workspace: `D:\Projects\Yogeshwari-Dairy-Ecommerce`
- GitHub: `https://github.com/Umesh-Temburwar/Yogeshwari-Dairy-Ecommerce`

This repository is the customer-facing e-commerce web application for **Yogeshwari Dairy Products**, which integrates directly with our existing production inventory management system and Supabase backend.

---

## 1. ARCHITECTURAL CONTEXT & LIVE INFRASTRUCTURE

### Production Infrastructure
1. **Existing Render Backend Service:**
   - Base URL: `https://yogeshwari-dairy-shop-inventory-system.onrender.com`
   - API Root: `https://yogeshwari-dairy-shop-inventory-system.onrender.com/api/v1`
   - E-commerce Base Endpoint: `https://yogeshwari-dairy-shop-inventory-system.onrender.com/api/v1/ecommerce`
2. **Supabase Database & Auth:**
   - Project URL: `https://pfamoxreojbejufwhgiu.supabase.co`
   - Anon Key: Defined in `.env.example`
3. **Admin & POS Inventory System:**
   - Existing separate React web application used by store staff for counter POS billing, milk collection, purchases, and khata.
   - **CRITICAL:** Do not modify POS workflows or create duplicate product tables.

---

## 2. API SPECIFICATIONS & ENDPOINTS

The Express backend exposes the following endpoints under `/api/v1/ecommerce`:

### A. Public Catalogue & Categories
- `GET /api/v1/ecommerce/products`
  - Query Params: `category` (optional), `search` (optional), `page` (default 1), `limit` (default 50)
  - Returns: `{ success: true, data: Product[], total: number, page: number, totalPages: number }`
  - *Note:* Sensitive fields (`purchase_price`, `stock_value`, `supplier_id`) are stripped by backend. Only items with `is_ecommerce_active = true` are returned.
- `GET /api/v1/ecommerce/products/:id`
  - Returns single product details, image URL, pack size, selling price, and stock status.
- `GET /api/v1/ecommerce/categories`
  - Returns: `{ success: true, data: Array<{ name: string, count: number, icon?: string }> }`

### B. Cart Validation
- `POST /api/v1/ecommerce/cart/validate`
  - Body: `{ items: Array<{ productId: string, quantity: number }> }`
  - Returns:
    ```json
    {
      "success": true,
      "data": {
        "valid": true,
        "items": [
          {
            "productId": "uuid",
            "name": "Fresh Cow Milk 1L",
            "price": 60,
            "quantity": 2,
            "itemTotal": 120,
            "inStock": true,
            "availableStock": 45
          }
        ],
        "subtotal": 120,
        "deliveryFee": 30,
        "freeDeliveryThreshold": 300,
        "deliveryFeeWaived": false,
        "amountNeededForFreeDelivery": 180,
        "total": 150
      }
    }
    ```

### C. Customer Order Placement & Management
- `POST /api/v1/ecommerce/orders` (Headers: `Authorization: Bearer <customer_jwt>`, `x-idempotency-key: <uuid>`)
  - Body:
    ```json
    {
      "customerName": "Ramesh Kumar",
      "customerPhone": "9876543210",
      "deliveryAddress": {
        "street": "Flat 302, Sai Complex, Ramdas Peth",
        "landmark": "Near Hanuman Mandir",
        "city": "Nagpur",
        "pincode": "440010"
      },
      "paymentMethod": "cod",
      "notes": "Please deliver before 8 AM",
      "items": [
        { "productId": "uuid", "quantity": 2 }
      ],
      "idempotencyKey": "uuid-v4-string"
    }
    ```
- `GET /api/v1/ecommerce/customer/orders` (Auth required)
  - Returns list of current customer's orders.
- `GET /api/v1/ecommerce/customer/orders/:id` (Auth required)
  - Detailed order status tracking (`pending`, `confirmed`, `preparing`, `out_for_delivery`, `delivered`, `cancelled`).
- `POST /api/v1/ecommerce/customer/orders/:id/cancel` (Auth required)
  - Cancels order and restores stock atomically.

---

## 3. MOCK DATA & ADAPTER PATTERN (OFFLINE-FIRST DEVELOPMENT)

To allow 100% frontend UI development, visual preview, and testing without requiring live Supabase credentials or network access:
1. Implement an **API Client Adapter Interface**:
   ```typescript
   export interface IEcommerceApiClient {
     getProducts(params?: ProductFilterParams): Promise<ProductResponse>;
     getProductById(id: string): Promise<ProductDetail>;
     getCategories(): Promise<Category[]>;
     validateCart(items: CartItem[]): Promise<CartValidationResult>;
     placeOrder(orderPayload: OrderPayload): Promise<OrderResult>;
     getCustomerOrders(): Promise<OrderSummary[]>;
     getOrderById(orderId: string): Promise<OrderDetail>;
     cancelOrder(orderId: string, reason?: string): Promise<{ success: boolean; message: string }>;
   }
   ```
2. Build two implementations:
   - `MockEcommerceApiClient`: Returns realistic local dairy products (Cow Milk, Buffalo Milk, Paneer, Dahi, Shrikhand, Ghee, Butter, Bakery items), calculates mock delivery rules, and stores placed orders in `localStorage`.
   - `HttpEcommerceApiClient`: Uses `axios` or `fetch` against `VITE_BACKEND_URL` (`https://yogeshwari-dairy-shop-inventory-system.onrender.com/api/v1/ecommerce`).
3. Toggle via environment variable `VITE_USE_MOCK_API=true` (default during local development).

---

## 4. UI/UX DESIGN SYSTEM SPECIFICATIONS (YogiMart + FLIPKART STYLE)

### 4.1 Aesthetic & Visual Identity
- **Brand Colors:**
  - Primary Green: `#0C831F` (YogiMart quick-delivery green) or `#008B45` (Fresh dairy green)
  - Brand Accent: `#F8CB46` / `#FFC107` (Dairy cow milk/butter golden yellow)
  - Background: `#F4F6F8` (Clean light slate)
  - Surface: `#FFFFFF`
  - Text Primary: `#1C1C1C`, Secondary: `#666666`, Border: `#E8E8E8`
- **Mobile-First Layout:**
  - Max width on desktop: `max-w-md` for app-like mobile wrapper, or fluid responsive grid (`sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`).
  - Fixed top search bar with delivery location & estimate badge ("⚡ 10-20 MINS").
  - Category horizontal scrolling pills with quick visual icons.

### 4.2 Core Customer Experiences
1. **Quick-Commerce Header:**
   - Store title: **"Yogeshwari Dairy Products"**
   - Delivery time pill: `⚡ 15 Mins Delivery` | `Store Open`
   - Instant search input with clear button and voice search trigger icon.
2. **Category Navigation:**
   - Milk (Fresh Cow & Buffalo)
   - Paneer & Khoya
   - Dahi, Chaas & Lassi
   - Desi Ghee & White Butter
   - Sweets & Shrikhand
   - Bakery & Daily Essentials
3. **Product Card (YogiMart Style):**
   - Packshot image with zoom on tap.
   - Pack size badge (e.g. `500 ml`, `1 kg`, `200 g`).
   - Title & Price (`₹32` with MRP strike-through `₹35` if discount applies).
   - Instant `ADD` button that expands into `[-] [ qty ] [+]` selector with haptic feedback.
4. **Floating Bottom Cart Bar (Floating Pill):**
   - When items in cart > 0, floating sticky bar appears above bottom edge:
     `[ 2 ITEMS | ₹120 ] ----------------> [ View Cart 🛒 ]`
   - **Crucial Layout Rule:** Include proper bottom safe-area padding (`pb-24` or `mb-16`) so action buttons are never obscured.
5. **Cart & Checkout Drawer:**
   - Delivery fee progress bar: *"Add ₹180 more for FREE delivery!"* (Free above ₹300).
   - Delivery Address card with Quick Address Selector (Home, Shop, Work).
   - Payment options: **Cash on Delivery (COD)**, **UPI on Delivery (Scan QR at doorstep)**.
   - One-tap WhatsApp Order confirmation generator (for convenience).
6. **Order Tracking Screen:**
   - Step progress bar: `Placed` → `Confirmed` → `Packing` → `Out for Delivery` → `Delivered`.
   - Direct call/WhatsApp store button: `📞 Call Dairy: +91 9876543210`.

---

## 5. TECH STACK & PROJECT SETUP

- **Core:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS + PostCSS + Autoprefixer
- **Icons:** `lucide-react`
- **State Management:** `zustand` (with persist middleware for cart & delivery address)
- **Routing:** `react-router-dom` v6
- **Notifications:** `react-hot-toast` or lightweight custom toast
- **Haptic/Audio:** Web Vibration API (`navigator.vibrate([15])` on ADD/REMOVE)

---

## 6. STEP-BY-STEP IMPLEMENTATION PLAN

### Phase 1: Project Initialization & Tooling
1. Initialize Vite + React + TypeScript in `D:\Projects\Yogeshwari-Dairy-Ecommerce`.
2. Install Tailwind CSS, `lucide-react`, `zustand`, `react-router-dom`, `clsx`, `tailwind-merge`.
3. Configure `tailwind.config.js` with brand colors, fonts, and safe-area utilities.
4. Set up environment files (`.env.development`, `.env.production`).

### Phase 2: Domain Types & Mock Adapter Layer
1. Create `src/types/ecommerce.ts` matching backend schemas (`Product`, `CartItem`, `Order`, `Address`).
2. Create `src/services/api/mockData.ts` with 25+ authentic dairy items with high-resolution Unsplash dairy photos.
3. Create `src/services/api/ecommerceApi.ts` with mock and HTTP adapters.

### Phase 3: State Management (Cart & Customer Context)
1. Build `src/store/cartStore.ts` using Zustand with persistence.
2. Implement delivery fee calculator (Free ≥ ₹300, else ₹30).
3. Build `src/store/customerStore.ts` for address, phone, and order history.

### Phase 4: UI Components & Screens
1. TopBar & SearchHeader (with delivery estimate & store status).
2. CategoryBar & CategoryFilter.
3. ProductGrid & ProductCard (with animated `ADD` / `[-] 1 [+]` button).
4. FloatingCartBar (sticky bottom).
5. CartDrawer / CheckoutModal with address selection and payment mode.
6. OrderSuccessModal & LiveOrderTracker.

### Phase 5: Verification & Polish
1. Run `npm run typecheck` and `npm run build` to verify 0 compiler errors.
2. Verify responsive layout on mobile viewport (360px, 390px, 412px) and desktop.
3. Verify all bottom modals have adequate bottom padding and never clip or overlap.
```
