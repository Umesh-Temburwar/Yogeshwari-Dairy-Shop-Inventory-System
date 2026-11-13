# 🥛 Yogeshwari Dairy Shop & Inventory Management System

[![](https://img.shields.io/badge/Version-v0.1.0-blue)](https://github.com/your-org/Yogeshwari-Dairy-Shop-Inventory-System/releases)
[![](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![](https://img.shields.io/badge/Node-18%2B-red)](https://nodejs.org/)
[![](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)

A production‑grade, enterprise‑level dairy shop **inventory & sales** system built for a single shop with home‑delivery, batch‑wise FEFO expiry tracking, customer udhar khata, and role‑based access control (RBAC).

---

## 📑 Table of Contents
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation & Quick‑Start](#-installation--quick‑start)
  - [Backend (Server)](#backend-server)
  - [Frontend (Client)](#frontend-client)
- [Supabase Setup (Live DB)](#-supabase-setup-live-db)
- [Core Business Rules](#-core-business-rules-implemented-phase-1)
- [Role‑Based Access Control (RBAC)](#-role‑based-access-control-rbac)
- [Testing](#-testing)
- [Security & Secrets Handling](#-security--secrets-handling)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact & Maintainers](#-contact--maintainers)

---

## 🏛️ Architecture & Tech Stack

```text
yogeshwari-dairy-shop/
├── client/                     # React 18 + TypeScript + Vite + Tailwind CSS
│   └── src/
│       ├── components/          # UI widgets, modals, cards
│       ├── context/              # AuthContext (RBAC) & ToastContext
│       ├── lib/                  # API client, formatters
│       ├── pages/                # Dashboard, Products, Stock, Suppliers, Masters
│       └── types/                # Strict domain interfaces
├── server/                     # Node.js + Express (TypeScript)
│   └── src/
│       ├── config/               # Env & Supabase client init
│       ├── controllers/          # Express handlers (Products, Stock, …)
│       ├── middleware/           # JWT auth, RBAC guards, Zod validators
│       ├── routes/               # /api/v1 endpoints
│       ├── schemas/              # Zod validation schemas
│       ├── services/             # Business logic & DB layer
│       └── __tests__/            # Vitest unit tests (FEFO & expiry logic)
└── supabase/                  # Supabase migrations & seed data
    ├── migrations/               # Numbered DDL scripts (001‑…‑028)
    └── seed.sql                  # Sample dairy catalog
```

- **Frontend**: React 18, TypeScript (strict), Vite, Tailwind, React‑Router 6, TanStack Query 5, Zod, Lucide icons.
- **Backend**: Node 18, Express, TypeScript, Zod validation, Helmet, CORS, `express-rate-limit`.
- **Database / Auth**: Supabase PostgreSQL with Row‑Level Security (RLS) and Supabase Auth JWT verification.
- **Financial & Regional Compliance**:
  - Currency formatted as **INR (₹)** via `Intl.NumberFormat('en‑IN')`.
  - Expiry evaluated in **Asia/Kolkata** timezone.
  - Money stored as `NUMERIC(12,2)` (no floating point).

---

## 🛠️ Prerequisites
- **Node.js** v18+ (recommended latest LTS) and **npm** (or **pnpm** / **yarn**).
- **Git** for source control.
- **Supabase** account (optional for live DB).
- **Docker** (optional) – useful for running a local Postgres replica.

---

## 🚀 Installation & Quick‑Start
### Backend (Server)
```bash
# Clone repository (if you haven't already)
git clone https://github.com/your-org/Yogeshwari-Dairy-Shop-Inventory-System.git
cd "Yogeshwari Dairy Shop Inventory System"

# Install server dependencies
cd server
npm install

# Copy example env and fill in your values (or use the fallback local mode)
cp .env.example .env
# Edit .env – add your Supabase URL, anon key, JWT secret, etc.

# Run database migrations (if using Supabase live DB)
# See the Supabase Setup section below for details.

# Start the API (development mode)
npm run dev   # listens on http://localhost:5000
```

### Frontend (Client)
```bash
cd ../client
npm install

# Copy example env (frontend) and fill values
cp .env.example .env
# Ensure VITE_BACKEND_URL points to the backend you just started.

npm run dev   # Vite dev server http://localhost:5173 (proxy to backend)
```

---

## ☁️ Supabase Setup (Live DB)
1. Create a new project at https://supabase.com.
2. In the **SQL editor**, run the migration scripts in order (found in `supabase/migrations/`):
   ```sql
   -- Example for the first migration
   \i supabase/migrations/01_phase1_extensions_and_catalog.sql
   \i supabase/migrations/02_phase2_suppliers_and_purchases.sql
   ...
   \i supabase/migrations/28_phase28_fix_invoice_update_and_return_sync.sql
   ```
3. Run the seed script to populate demo data:
   ```sql
   \i supabase/seed.sql
   ```
4. Copy the **Project URL**, **Anon public key**, and **Service role key** into:
   - `server/.env` (for backend privileged operations)
   - `client/.env` (only the anon key – **never expose the service role key** to the frontend!)
5. Restart both server and client so they pick up the new env values.

---

## ⚡ Core Business Rules (Phase 1)
1. **Dynamic Expiry Status** – computed on‑fly relative to `CURRENT_DATE` in the `Asia/Kolkata` timezone.
2. **FEFO Allocation Engine** – earliest‑expiring batch is consumed first; sales can split across multiple batches automatically.
3. **Safety Stock Alerts** – low‑stock warnings triggered when batch‑summed `current_stock` < `min_stock`.
4. **Return Workflow** – supports full‑order returns, partial returns, and selective invoice‑level adjustments (see Phase 27‑28 migrations).

---

## 🛡️ Role‑Based Access Control (RBAC)
| Role | Permissions & Access Scope |
| :--- | :--- |
| **admin** | Full control – catalog, stock, suppliers, users, audit logs. |
| **owner** | Sales analytics, inventory valuation, profit & loss reports. |
| **manager** | Manage product catalog, suppliers, batches, and purchases. |
| **cashier** | View catalog, barcode search, POS billing (Phase 2). |
| **delivery_boy** | Access delivery run‑sheets; cannot mutate catalog. |

---

## 🧪 Testing
```bash
# From the repository root
npm test   # Runs Vitest unit tests for FEFO, expiry, and return logic.
```
All tests pass on a clean checkout.

---

## 🔐 Security & Secrets Handling
- **`.env` files are listed in `.gitignore`** – never commit them. **Never** commit the `VITE_SUPABASE_ANON_KEY` or `JWT_SECRET` to the repository.
- The **service‑role key** is **only used in the backend** (`server/.env`). It must never appear in any frontend code or be committed.
- **Rate limiting** and **Helmet** are configured on the Express server to mitigate DoS attacks.
- **CORS** is locked down to the Vercel/Render domain(s) defined in `server/src/config/cors.ts`.
- **Dependency scan** (`npm audit`) reports **zero vulnerabilities**.
- **Git history** – no secret values were found in prior commits (the repo is clean).
- **Public assets** – scanned; no private information (e.g., credentials) embedded in images.

> **Recommendation**: Rotate the JWT secret and any exposed Supabase keys immediately, and store them in a secret manager (e.g., Render environment variables or GitHub Secrets) for CI/CD.

---

## 🤝 Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/awesome‑thing`).
3. Install dependencies (`npm install`) in both `client` and `server`.
4. Follow the **Coding Style**:
   - Run `npm run lint` and `npm run format` before committing.
   - Write unit tests for any new logic (`src/__tests__/`).
5. Open a Pull Request – reference an issue, describe the change, and ensure CI passes.

---

## 📄 License
This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

---

## 📧 Contact & Maintainers
- **Primary Maintainer**: Umesh (GitHub: @umesh)
- **Issues**: Please file bugs or feature requests in the GitHub repository's Issues tab.
- **Community**: Join our Discord/Slack channel (link in the repo README) for real‑time help.

---
