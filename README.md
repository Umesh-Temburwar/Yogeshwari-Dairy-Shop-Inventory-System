import pypandoc
from pathlib import Path

md = r"""# 🥛 Yogeshwari Dairy Shop & Inventory Management System

A dairy-shop inventory and operations platform designed for single-shop workflows, including product catalog management, supplier records, batch-wise stock tracking, FEFO-based expiry handling, customer accounts, and role-based access control.

> **Project status:** Phase 1 foundation and modules are documented below based on the current project specification. Verify each feature against the deployed application before describing it as production-ready. Features not yet implemented should remain in the roadmap.

---

## 📌 Project Overview

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
