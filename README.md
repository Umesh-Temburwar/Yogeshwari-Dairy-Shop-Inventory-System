import pypandoc
from pathlib import Path

<<<<<<< HEAD
md = r"""# 🥛 Yogeshwari Dairy Shop & Inventory Management System

A dairy-shop inventory and operations platform designed for single-shop workflows, including product catalog management, supplier records, batch-wise stock tracking, FEFO-based expiry handling, customer accounts, and role-based access control.

> **Project status:** Phase 1 foundation and modules are documented below based on the current project specification. Verify each feature against the deployed application before describing it as production-ready. Features not yet implemented should remain in the roadmap.
=======
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
>>>>>>> 6b08f7e (Update README.md)

---

## 📌 Project Overview

<<<<<<< HEAD
The system is designed to help a dairy shop manage:

- Product catalog, categories, brands, and units.
- Suppliers and purchase/stock receiving workflows.
- Batch-wise inventory and expiry monitoring.
- FEFO (First Expiry, First Out) stock allocation.
- Low-stock monitoring.
- Customer records and udhar/credit tracking.
- POS billing and sales workflows as they are implemented.
- Full and partial sales returns as they are implemented.
- Role-based access for shop staff.

The application uses INR formatting and the `Asia/Kolkata` business timezone.

## 🖼️ Screenshots

Add current screenshots from the running application here. Do not include customer personal information, phone numbers, invoices, API keys, QR payment credentials, or other private data.

```text
docs/
└── screenshots/
    ├── dashboard.png
    ├── products.png
    ├── inventory-batches.png
    └── suppliers.png
```

Example:

```md
![Dashboard](docs/screenshots/dashboard.png)
```

---

## 🏗️ Architecture

```text
yogeshwari-dairy-shop/
├── client/                     # React + TypeScript + Vite frontend
│   └── src/
│       ├── components/         # Shared UI components
│       ├── context/            # Authentication and UI contexts
│       ├── lib/                # API client and formatters
│       ├── pages/              # Application pages
│       └── types/              # TypeScript domain types
├── server/                     # Node.js + Express + TypeScript API
│   └── src/
│       ├── config/              # Environment and Supabase setup
│       ├── controllers/         # HTTP request handlers
│       ├── middleware/          # Authentication, RBAC, validation
│       ├── routes/              # REST API routes
│       ├── schemas/              # Zod validation schemas
│       ├── services/             # Business and data-access logic
│       ├── utils/                # FEFO and expiry utilities
│       └── __tests__/            # Automated tests
└── supabase/
    ├── migrations/              # Ordered PostgreSQL migrations
    └── seed.sql                 # Development/demo seed data
```

> Repository layouts can change. Keep this tree synchronized with the actual checked-in folders and files.

## 🧰 Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Routing | React Router |
| Forms and validation | React Hook Form, Zod |
| Server state | TanStack Query |
| Backend | Node.js, Express, TypeScript |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth / JWT verification |
| API validation | Zod |
| Security middleware | Helmet, CORS, express-rate-limit |
| Testing | Vitest |
| Frontend hosting | Vercel (if configured) |
| Backend hosting | Render (if configured) |

---

## 👥 Roles and Access Control

The intended role model is:

| Role | Intended access |
|---|---|
| `admin` | User administration, configuration, catalog, inventory, suppliers, and audit functions |
| `owner` | Business overview, sales, inventory, suppliers, and financial reports |
| `manager` | Product catalog, suppliers, purchases, and inventory operations |
| `cashier` | Product lookup, stock visibility, and permitted POS operations |
| `delivery_boy` | Assigned delivery tasks and delivery status updates |

**Security requirement:** Frontend visibility is not authorization. Every protected API operation must enforce permissions on the server. Database access must also follow appropriate Supabase grants and Row Level Security (RLS) policies.

---

## 📦 Inventory Business Rules

### 1. Batch-wise stock

Stock should be traceable to individual purchase/receiving batches. Maintain batch quantities and stock movements rather than changing aggregate stock without an auditable transaction.

### 2. FEFO allocation

For products with expiry dates, allocate stock using **First Expiry, First Out**:

- Prefer eligible batches with the earliest expiry date.
- Split a sale across multiple batches when required.
- Do not allocate expired batches.
- Do not allocate batches with zero available stock.
- Keep batch balances and stock movement records consistent.

### 3. Expiry status

Expiry status should be calculated from the batch expiry date and the shop's `Asia/Kolkata` business date. Avoid storing a status that becomes stale as time passes.

| Status | Rule |
|---|---|
| `EXPIRED` | Expiry date is before the business date |
| `EXPIRING_TODAY` | Expiry date is the business date |
| `EXPIRING_TOMORROW` | One day remains |
| `EXPIRING_IN_3_DAYS` | More than one and up to three days remain |
| `FRESH` | More than three days remain |

Ensure the date calculation is explicitly performed using the business timezone; do not assume the database server timezone is `Asia/Kolkata`.

### 4. Low-stock monitoring

Compare the total eligible stock for a product with its configured minimum stock threshold. Define clearly whether expired, damaged, reserved, or quarantined stock is excluded from sellable stock.

### 5. Financial precision

- Store monetary amounts using PostgreSQL `NUMERIC`, not floating-point types.
- Format amounts as INR in the UI.
- Calculate totals and discounts on the trusted server/database side.
- Preserve original transaction prices for historical invoices and returns.

---

## 🔐 Security & Data Protection

Security must be enforced at multiple layers. A feature listed here is a requirement, not proof that it has been fully audited or enabled in production.

### Authentication and authorization

- Authenticate users using the configured authentication provider.
- Verify access tokens on protected backend routes.
- Enforce role and resource permissions on the backend.
- Apply least-privilege access to administrative and financial operations.
- Never rely only on hiding buttons or pages in the frontend.

### Supabase and database security

- Enable and test RLS on tables exposed to client access.
- Review policies for every role and data operation.
- Use restrictive database grants.
- Keep privileged service-role credentials on trusted server environments only.
- Validate ownership and shop scope in server-side operations.
- Use parameterized queries or safe database client methods.
- Use transactions for multi-step stock, sales, and return operations.

### API security

- Use HTTPS in production.
- Configure CORS with explicit trusted origins.
- Use Helmet and appropriate security headers.
- Apply rate limits to authentication and sensitive endpoints.
- Validate request bodies, query parameters, and route parameters.
- Return safe error messages; do not expose stack traces or secrets.
- Log security-relevant events without logging credentials or sensitive customer data.

### Secrets management

- Keep real `.env` files out of Git.
- Store production secrets in the hosting provider's environment settings.
- Never put a Supabase service-role key, database password, private JWT secret, or private API token in a `VITE_` variable.
- Treat all `VITE_*` variables as public because they are bundled into browser code.
- Keep `.env.example` limited to placeholder values.
- Rotate any credential that has been committed or exposed. Removing a file from the latest commit does not remove it from Git history.

### Operational security

- Review dependencies and security advisories.
- Restrict access to production dashboards and deployment settings.
- Back up the database and periodically test restoration.
- Maintain audit history for sensitive stock, payment, user, and configuration changes.
- Review RLS, CORS, authentication, and authorization whenever roles or tables change.

---

## 🌐 Production Deployment

The intended deployment arrangement, where configured, is:

```text
Browser / Mobile PWA
        |
        | HTTPS
        v
Vercel - React frontend
        |
        | HTTPS REST API
        v
Render - Express backend
        |
        | Supabase client / PostgreSQL
        v
Supabase - Database and authentication
```

Use the actual production URLs in deployment settings. Do not commit private deployment credentials or database connection strings.

### Frontend environment

Create `client/.env` for local development:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

Example production value:

```env
VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api/v1
```

### Backend environment

Create `server/.env` locally, using only variables required by the actual server configuration:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
```

If the application uses a separate JWT signing secret, configure it server-side using the exact variable name expected by the code.

**Never copy the service-role key into `client/.env`, a `VITE_*` variable, source code, screenshots, or public documentation.** Supabase Auth access tokens and service-role credentials serve different purposes; follow the project's actual authentication design.

For production, configure frontend variables in Vercel and backend secrets in Render. Do not commit production `.env` files.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or later (use the version supported by the current dependencies and deployment environment).
- npm.
- A Supabase project for live database functionality.
- Git.

### Install dependencies

Run from the repository root:

```bash
npm install
```

### Build

Use the scripts defined in the root `package.json`:

```bash
npm run client:build
npm run server:build
```

### Run tests

```bash
npm test
```

### Start locally

Terminal 1 - backend:

```bash
npm run server:dev
```

Terminal 2 - frontend:

```bash
npm run client:dev
```

Typical local URLs (confirm against your configuration):

- Frontend: `http://localhost:5173`
- Backend health endpoint: `http://localhost:5000/health`
- API base path: `http://localhost:5000/api/v1`

---

## 🗄️ Supabase Database Setup

1. Create a Supabase project.
2. Review the migration files in `supabase/migrations/`.
3. Apply migrations in numeric order using the Supabase SQL Editor or the project's migration workflow.
4. Review and test RLS policies and database grants.
5. Run `supabase/seed.sql` only in a development or intentionally seeded environment.
6. Configure the required server-side environment variables.
7. Verify authentication, role permissions, and database access before using real shop data.

Migration files described in the original project specification:

```text
001_initial_schema.sql
002_catalog_and_suppliers.sql
003_batches_and_stock.sql
004_rls_policies.sql
```

Do not rerun seed data against a live database unless the seed script is explicitly designed to be safe and idempotent. Back up production data before applying schema changes.

---

## 🧪 Testing and Verification

Run the automated test suite:

```bash
npm test
```

Recommended verification areas:

- FEFO ordering and multi-batch allocation.
- Expired and zero-stock sale prevention.
- Expiry calculations around midnight in `Asia/Kolkata`.
- Product and supplier validation.
- Authentication and role-based API access.
- RLS behavior for each role.
- Stock movement consistency.
- Concurrent stock deductions.
- Duplicate request/idempotency handling.
- Refund and return calculations, if the return module is enabled.
- Production build and deployment health checks.

Do not mark a test as passing until it has actually been run and its result reviewed.

---

## 🗺️ Development Roadmap

The following is a planning outline. Update each item to **Completed** only after implementation and testing.

| Module | Scope |
|---|---|
| Phase 1 | Authentication, RBAC, product catalog, masters, suppliers, stock batches, expiry and FEFO foundation |
| Phase 2 | POS billing, payment recording, invoice generation and stock deduction |
| Phase 3 | Delivery management and delivery status workflows |
| Future | Barcode/QR scanning, internal barcode generation and label printing |
| Future | Full invoice returns, partial item returns and refund tracking |
| Future | Customer udhar khata and payment collection |
| Future | Expiry alerts, daily reports and optional WhatsApp PDF delivery |
| Future | Audit dashboard, backup monitoring and operational reporting |

---

## 🧾 Data and Privacy

This application may process business-sensitive and customer-related information, including phone numbers, purchase history, credit balances, invoices, and payment references.

- Use real customer data only in appropriately secured environments.
- Avoid publishing production database exports, invoices, customer lists, or payment details.
- Use anonymized sample data in screenshots and seed files.
- Restrict access to reports and customer financial records.
- Define retention and backup practices appropriate to the business.

---

## 🤝 Contributing

1. Create a feature branch.
2. Keep changes focused and consistent with existing architecture.
3. Add or update tests for business-critical logic.
4. Never commit secrets or production customer data.
5. Run the relevant tests and builds before opening a pull request.

---

## 📄 License

Add the license that applies to this repository. Until a license is included, do not assume that others have permission to reuse, distribute, or modify the source code.

---

## ⚠️ Production Readiness Note

Before using this application for live shop operations, verify:

- Production authentication and backend authorization.
- Supabase RLS policies and database grants.
- Secret storage and rotation procedures.
- Stock transaction atomicity and concurrency handling.
- Backup and restore procedures.
- Billing, refund, and inventory reconciliation.
- Deployment health checks and error monitoring.

A successful frontend build alone does not establish production readiness.
"""
out = Path("/mnt/data/README.md")
pypandoc.convert_text(md, "md", format="md", outputfile=str(out), extra_args=["--standalone"])
print(f"Created {out} ({out.stat().st_size} bytes)")
=======
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
>>>>>>> 6b08f7e (Update README.md)
