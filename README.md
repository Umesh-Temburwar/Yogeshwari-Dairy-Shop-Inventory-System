# 🥛 Yogeshwari Dairy Shop & Inventory Management System

A production-grade, enterprise Dairy Shop Management & Inventory System built for single-shop operations with home delivery, batch-wise FEFO expiry tracking, customer udhar khata, and multi-role access control (RBAC).

---

## 🏛️ Architecture & Tech Stack

```
yogeshwari-dairy-shop/
├── client/                     # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/         # Modals, Navbar, Sidebar, StatCards, Badges
│   │   ├── context/            # AuthContext (RBAC) & ToastContext
│   │   ├── lib/                # apiClient & Indian currency/date formatters
│   │   ├── pages/              # Dashboard, Products, Stock, Suppliers, Masters
│   │   └── types/              # Strict TypeScript domain interfaces
├── server/                     # Node.js + Express (TypeScript)
│   ├── src/
│   │   ├── config/             # Environment & Supabase client initialization
│   │   ├── controllers/        # Express handlers (Products, Stock, Suppliers, Auth)
│   │   ├── middleware/         # Auth JWT, RBAC guards, Zod validators, error handling
│   │   ├── routes/             # RESTful endpoints mounted under /api/v1
│   │   ├── schemas/            # Zod validation schemas
│   │   ├── services/           # Business logic & Database layer with fallback
│   │   ├── utils/              # FEFO allocation engine & Expiry status calculator
│   │   └── __tests__/          # Vitest unit test suite (FEFO & Expiry logic)
└── supabase/
    ├── migrations/             # Numbered SQL DDL migrations
    │   ├── 001_initial_schema.sql         # user_role ENUM & profiles
    │   ├── 002_catalog_and_suppliers.sql  # categories, brands, units, suppliers, products
    │   ├── 003_batches_and_stock.sql      # batches, stock_transactions, FEFO views
    │   └── 004_rls_policies.sql           # Row Level Security (RLS) policies
    └── seed.sql                # Authentic dairy seed data (Amul, Paneer, Ghee, Dahi, etc.)
```

- **Frontend**: React 18, TypeScript (Strict Mode), Vite, Tailwind CSS, React Router v6, React Hook Form + Zod, TanStack Query v5, Lucide Icons.
- **Backend**: Node.js, Express, TypeScript, Zod request validation, Centralized Error Handling, Helmet, CORS, Rate Limiting (`express-rate-limit`).
- **Database / Auth**: Supabase PostgreSQL with Row Level Security (RLS), Supabase Auth JWT verification.
- **Financial & Regional Compliance**:
  - Currency strictly formatted as **INR (₹)** via `Intl.NumberFormat('en-IN')`.
  - Expiry & Timezone strictly evaluated in **Asia/Kolkata** timezone.
  - Money stored as `NUMERIC(12,2)` (never floating point).

---

## 🛡️ Role-Based Access Control (RBAC)

The system enforces role permissions at both the **Backend API Middleware** level and the **Frontend UI**:

| Role | Permissions & Access Scope |
| :--- | :--- |
| **`admin`** | Full access to catalog, stock, suppliers, masters, users, and audit logs. |
| **`owner`** | High-level sales, inventory valuations, suppliers, and profit & loss reports. |
| **`manager`** | Full product catalog management, supplier directory, inventory batches, and purchases. |
| **`cashier`** | View catalog, search barcodes, check stock levels, POS billing (Phase 2). |
| **`delivery_boy`** | Delivery run sheets and assigned order drops (Phase 3). Restricted from catalog mutations. |

---

## ⚡ Core Business Rules Implemented (Phase 1)

1. **Dynamic Expiry Status (Business Rule 3)**: Expiry status is **never stored statically**. It is computed dynamically relative to `CURRENT_DATE` in `Asia/Kolkata`:
   - `EXPIRED` ($\text{days} < 0$)
   - `EXPIRING_TODAY` ($\text{days} = 0$)
   - `EXPIRING_TOMORROW` ($\text{days} = 1$)
   - `EXPIRING_IN_3_DAYS` ($1 < \text{days} \le 3$)
   - `FRESH` ($\text{days} > 3$)
2. **FEFO Allocation Engine (Business Rule 2 & 4)**:
   - When deducting stock, batches with the earliest expiry are selected first.
   - Automatically splits sales across multiple batches if necessary.
   - **Billing Block**: Expired batches and zero-stock items are strictly blocked from sale allocation.
3. **Safety Stock Level**:
   - Compares batch-summed `current_stock` against `min_stock` threshold to trigger automatic low-stock warnings.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+ and **npm** installed.

### 2. Install & Build
Run from the root repository:
```bash
npm run client:build
npm run server:build
```

### 3. Run Backend Unit Tests (FEFO & Expiry Logic)
```bash
npm test
```
*Executes all 8 Vitest unit tests verifying expiry status calculations, FEFO batch splitting, and expired batch billing block.*

### 4. Start the Application
You can start the server and client in separate terminals:

**Terminal 1 (Backend API):**
```bash
npm run server:dev
```
*API starts on `http://localhost:5000` (`/health` and `/api/v1`).*

**Terminal 2 (Frontend Client):**
```bash
npm run client:dev
```
*Vite dev server starts on `http://localhost:5173` with proxy to the backend API.*

---

## 🗄️ Supabase Setup (Optional for Live Cloud DB)

The system includes a complete zero-configuration fallback so you can test all UI & API features immediately without external credentials. When ready to connect live Supabase:

1. Create a project in [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in Supabase and run the migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_catalog_and_suppliers.sql`
   - `supabase/migrations/003_batches_and_stock.sql`
   - `supabase/migrations/004_rls_policies.sql`
3. Run the seed data script:
   - `supabase/seed.sql`
4. Copy your Project URL, Anon Key, and Service Role Key to `server/.env` and `client/.env`.

---

## 🧪 Phase 1 Verification Checklist

- [x] **Database Migrations**: Numbered SQL files (`001` to `004`) with ENUMs, profiles, catalog, batches, views, and RLS.
- [x] **Seed Data**: Realistic dairy items (Amul Taaza, Amul Gold, Fresh Malai Paneer, Amul Butter, Desi Cow Ghee, etc.) with varied batch expiry statuses.
- [x] **Backend Layering**: Routes -> Controllers -> Services -> Zod Schemas -> Error Handler.
- [x] **Security**: Helmet, CORS, Express Rate Limiter, Bearer JWT middleware, Role-based guard (`requireRole`).
- [x] **Unit Tests**: 8 Vitest tests covering FEFO batch allocation, multi-batch splitting, and expiry computations.
- [x] **Auth & RBAC**: Login, Logout, Forgot Password, and one-click role switcher pill for testing admin vs cashier vs manager.
- [x] **Dashboard Shell**: Live KPI summary cards (Total Products, Total Stock Units, Low Stock items, Total Inventory Value in INR), Low Stock Watchlist, Near-Expiry Alert.
- [x] **Product Catalog**: Add / Edit / Delete modals with React Hook Form + Zod validation, search, category filter, brand filter, and low-stock filter.
- [x] **Master Management**: Tabbed CRUD management for Categories, Brands, and Units of Measure.
- [x] **Supplier Directory**: Contact persons, phone, email, address, and GSTIN tracking.
- [x] **Stock & FEFO Overview**: Real-time batch-wise expiry table with visual indicators and days-to-expiry calculations.
