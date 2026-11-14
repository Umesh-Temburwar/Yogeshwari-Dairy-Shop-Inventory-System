# 🥛 Yogeshwari Dairy Shop & Inventory Management System

[![](https://img.shields.io/badge/Version-v2.0.0--ERP-emerald)](https://github.com/your-org/Yogeshwari-Dairy-Shop-Inventory-System)
[![](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![](https://img.shields.io/badge/Node-18%2B-red)](https://nodejs.org/)
[![](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![](https://img.shields.io/badge/Supabase-PostgreSQL-teal)](https://supabase.com/)
[![](https://img.shields.io/badge/Tests-24%20Passing-brightgreen)](#-automated-testing)

A production-ready, enterprise-grade dairy shop **inventory, barcode tracking, point-of-sale (POS), and billing** system designed for high-throughput single-shop workflows with batch-wise FEFO expiry management, customer udhar ledger, and role-based access control (RBAC).

---

## 📑 Table of Contents
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Phase 55: Product Catalogue & PackSense India Barcode Architecture](#-phase-55-product-catalogue--packsense-india-barcode-architecture)
- [PackSense India Dataset & Provenance](#-packsense-india-dataset--provenance)
- [How to Run Catalogue Import](#-how-to-run-catalogue-import)
- [Barcode Scanning & Stock-In Workflow](#-barcode-scanning--stock-in-workflow)
- [Database Schema & Migrations](#-database-schema--migrations)
- [Automated Testing](#-automated-testing)
- [Installation & Quick Start](#-installation--quick-start)
- [License & Credits](#-license--credits)

---

## 🏛️ Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. MASTER PRODUCT CATALOGUE (public.products)                              │
│ - Stores all shop items + imported PackSense catalogue items                │
│ - Catalogue items default to stock_quantity = 0.00 until physically added   │
│ - Preserves shop purchase_price & selling_price where configured            │
│ - Additive fields: brand, pack_size, source, source_code, description       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 1:N
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 2. PRODUCT BARCODES (public.product_barcodes)                               │
│ - id (UUID PK), product_id (UUID FK), barcode (TEXT UNIQUE)                 │
│ - barcode_type ('EAN-13', 'UPC-A', 'CODE-128')                             │
│ - is_primary (BOOLEAN), source ('PackSense', 'MANUAL', 'SHOP')              │
│ - Supports multiple barcodes per product variant                            │
│ - Indexes on barcode and product_id                                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 1:N
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 3. PRODUCT BATCHES & ACTUAL INVENTORY (public.batches)                      │
│ - Tracks REAL physical lots received via confirmed stock-in                 │
│ - qty_received, qty_remaining, mfg_date, expiry_date                         │
│ - FEFO stock deduction via fn_fefo_deduct_and_allocate                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 1:N
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 4. AUDITABLE STOCK MOVEMENTS (public.stock_movements)                       │
│ - Immutable ledger of all PURCHASE, SALE, RETURN, DAMAGE, ADJUSTMENT        │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, `@zxing/browser` for camera & hardware barcode scanning.
- **Backend:** Node.js, Express, TypeScript, Zod validation, `@supabase/supabase-js`.
- **Database:** Supabase PostgreSQL with Row Level Security (RLS) & transactional RPC functions.
- **Testing:** Vitest runner with 24 automated unit & integration tests.

---

## 🚀 Phase 55: Product Catalogue & PackSense India Barcode Architecture

### Key Design Guarantees:
1. **Catalogue Separation from Inventory:**
   - Products can exist in the Master Product Catalogue with `stock_quantity = 0.00`.
   - Importing catalogue items **never** creates stock or fake batches.
   - The **Current Inventory** screen strictly displays items where `stock_quantity > 0`.
2. **Barcode Integrity:**
   - Barcodes are stored strictly as `TEXT`, preserving leading zeros (e.g. `08901030384721`).
   - Supports 1:N barcodes per product variant.
3. **Price Safety:**
   - Existing shop purchase and selling rates are 100% preserved.
   - PackSense does not supply shop-specific costs; catalogue items default to 0 until physical stock-in.

---

## 📦 PackSense India Dataset & Provenance

The latest official dataset was retrieved directly from Hugging Face:

| Parameter | Value | Verification Status |
| :--- | :--- | :--- |
| **Dataset Repository** | [PackSense/packsense-india](https://huggingface.co/datasets/PackSense/packsense-india) | ✅ Verified Official |
| **Commit / Release** | `78b27c016af681e589795988da447ca37ac5ea75` (`2026-11-03`) | ✅ Latest Available |
| **Raw CSV File** | `data/packsense/raw/india_products.csv` | ✅ 5,657,152 bytes (25,209 rows) |
| **SHA-256 Checksum** | `9007b7a48fe9bc129e6a90a6fc7dfb4dfdcb6a72f53b3a3aabc74eda0d5d1951` | ✅ Exact Match |
| **Cleaned Candidates** | `data/packsense/processed/india_products_cleaned.csv` | ✅ 21,963 Valid Rows |

### Matching Reports:
- `data/packsense/reports/dataset_import_report.md`: Complete provenance and validation metrics.
- `data/packsense/reports/existing_products_matched.csv`: 7 high-confidence exact matches with existing 368 shop items.
- `data/packsense/reports/manual_review_required.csv`: 82 candidate matches requiring pack-size review.
- `data/packsense/reports/existing_products_unmatched.csv`: 279 in-house shop products preserved.
- `data/packsense/reports/possible_duplicates.csv`: 0 duplicate barcodes in shop catalogue.

---

## ⚙️ How to Run Catalogue Import

Both Node.js and Python importers are provided with dry-run support.

### Option 1: Node.js (via tsx in server)

```bash
# Dry-run test (simulates 10 products with zero DB writes)
npm --prefix server run import:catalog -- --dry-run --limit=10

# Full dry-run across all 21,963 records
npm --prefix server run import:catalog -- --dry-run

# Live import test (100 products with stock_quantity = 0.00)
npm --prefix server run import:catalog -- --live --limit=100

# Full live import (chunks of 500)
npm --prefix server run import:catalog -- --live --chunk-size=500
```

### Option 2: Standalone Python Script

```bash
# Dry-run test
python scripts/import_packsence_catalog.py --limit 10

# Full dry-run simulation
python scripts/import_packsence_catalog.py

# Live import with limit
python scripts/import_packsence_catalog.py --live --limit 100

# Full live import
python scripts/import_packsence_catalog.py --live --chunk-size 500
```

---

## 📱 Barcode Scanning & Stock-In Workflow

```
1. Scan Barcode (Camera / USB Scanner / Manual Input)
   │
   ├─► Found in Catalogue?
   │     ├─► YES: Display Product Details, Brand, Pack Size & Current Stock
   │     └─► NO:  "Product Not Found" -> Register in Catalogue (Stock = 0)
   │
2. Enter Stock Details (Qty, Purchase Price, Selling Price, Batch No, Expiry)
   │
3. Review Summary Modal
   │
4. Confirm Inward -> Atomic DB RPC (fn_barcode_stock_in):
   - Creates Batch (public.batches)
   - Increments stock_quantity (public.products)
   - Records Movement (public.stock_movements)
   - Logs Audit Trail (public.admin_audit_logs)
```

---

## 🛠️ Database Schema & Migrations

All migrations are version-controlled in `supabase/*.sql`.

The latest Phase 55 migration script:
`supabase/55_phase55_product_barcodes_and_catalogue_architecture.sql`

To apply:
1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/pfamoxreojbejufwhgiu) -> **SQL Editor**.
2. Paste the contents of `supabase/55_phase55_product_barcodes_and_catalogue_architecture.sql`.
3. Click **Run**.

---

## 🧪 Automated Testing

Run the Vitest test suite:

```bash
npm run server:test
```

### Test Coverage (24 Passing Tests):
- **Catalogue Import Guarantee:** 100 catalogue products imported with strictly `stock_quantity = 0.00`.
- **Duplicate Prevention:** Re-importing same dataset creates 0 duplicate barcodes.
- **Integrity:** Existing 368 shop items, batch allocations, and sales history remain untouched.
- **Leading Zeros:** Barcode `'08901030384721'` preserved as TEXT.
- **Lookup:** Known barcode identifies exact variant and pack size.
- **Manual Registration:** Unknown barcode registered with zero initial stock.
- **Variant Separation:** 500ml and 1L variants remain independent products.
- **Inward Accuracy:** Inward of 50 units increments inventory by exactly 50 units.
- **Cancellation:** Closing stock-in modal leaves inventory unchanged.
- **Idempotency Guard:** Rapid double-clicks do not duplicate stock.
- **Multi-Batch:** Distinct batches maintain individual expiry dates.
- **FEFO:** Allocations deduct strictly from earliest expiring lot.
- **Catalogue vs Inventory UI:** Catalogue shows all items; Current Inventory strictly shows `stock_quantity > 0`.

---

## 💻 Installation & Quick Start

```bash
# 1. Install dependencies
npm install
npm --prefix server install

# 2. Configure .env file
cp .env.example .env

# 3. Type check & build
npm run typecheck
npm run build
npm run server:build

# 4. Start Development Servers
# Frontend:
npm run dev

# Backend:
npm run server:dev
```

---

## 📄 License & Maintainers

- **License:** MIT License
- **Maintainer:** Umesh (@umesh)
- **Shop:** Yogeshwari Dairy Farm & Products
