# 📦 PackSense India Product Catalogue Import & Stock Architecture Guide
**Project:** Yogeshwari Dairy Shop & Inventory Management System  
**Version:** Phase 55 ERP Architecture  
**Dataset Release:** 2026-11-03 (Commit `78b27c0`)  
**Official Source:** [PackSense India Products (Hugging Face)](https://huggingface.co/datasets/PackSense/packsense-india)

---

## 📌 Executive Architecture & Non-Negotiable Rules

1. **Product Catalogue vs Physical Inventory Separation:**
   - Importing catalogue products **NEVER** creates physical stock.
   - All imported records have `stock_quantity = 0.00` and create **zero batches**.
   - Current Inventory (`/inventory`) displays only products where `stock_quantity > 0`.
   - Product Catalogue displays all products (both in-stock and out-of-stock).

2. **Zero Price Fabrication:**
   - PackSense does not provide retail shop cost or selling prices.
   - The importer **never** invents prices. All new catalogue entries default to `purchase_price = 0.00` and `selling_price = 0.00` until physical stock-in is performed.
   - Existing shop prices for matched products are preserved 100%.

3. **Leading Zeros & Barcode Integrity:**
   - Barcodes are strictly stored as `TEXT`, never numeric or bigint.
   - Leading zeros (e.g., `08901030384721`) are preserved.
   - Barcodes are indexed for $O(1)$ lookup speed in `public.product_barcodes`.

---

## 📁 Dataset & File Locations

| File | Purpose | Size / Rows | SHA-256 Checksum |
| :--- | :--- | :--- | :--- |
| `data/packsense/raw/india_products.csv` | Original, unmodified download from Hugging Face | 5,657,152 bytes (25,209 rows) | `9007b7a48fe9bc129e6a90a6fc7dfb4dfdcb6a72f53b3a3aabc74eda0d5d1951` |
| `data/packsense/processed/india_products_cleaned.csv` | Cleaned import candidates (valid barcodes + names) | 3,539,576 bytes (21,963 rows) | Verified Clean |
| `data/packsense/reports/existing_products_matched.csv` | Exact matches against existing 368 shop items | 7 exact matches | Matched |
| `data/packsense/reports/manual_review_required.csv` | Candidates requiring pack-size confirmation | 82 items | Review Needed |
| `data/packsense/reports/existing_products_unmatched.csv` | Local dairy items with no PackSense barcode | 279 items | Shop In-House |
| `data/packsense/reports/possible_duplicates.csv` | Shop duplicate barcode check | 0 duplicates | Clean |
| `data/packsense/reports/dataset_import_report.md` | Full provenance & validation statistics | Markdown Audit | Complete |

---

## 🚀 How to Run the Import

### Option 1: Node.js / TypeScript Importer (Recommended)

From the project root:

```bash
# 1. Run in Dry-Run mode with limit (Simulates 10 products without DB write)
cd server
npx tsx src/scripts/importPackSenseCatalog.ts --dry-run --limit=10

# 2. Run full dry-run simulation across all 21,963 candidates
npx tsx src/scripts/importPackSenseCatalog.ts --dry-run

# 3. Run live test import for 100 products
npx tsx src/scripts/importPackSenseCatalog.ts --live --limit=100

# 4. Run full live import in chunks of 500
npx tsx src/scripts/importPackSenseCatalog.ts --live --chunk-size=500
```

### Option 2: Python Importer

From the project root:

```bash
# 1. Dry-run test with limit
python scripts/import_packsence_catalog.py --limit 10

# 2. Full dry-run across all 21,963 candidates
python scripts/import_packsence_catalog.py

# 3. Live import with limit
python scripts/import_packsence_catalog.py --live --limit 100

# 4. Full live import
python scripts/import_packsence_catalog.py --live --chunk-size 500
```

---

## 📲 Barcode Scanning & Stock-In Workflow

1. **Step 1: Scan Barcode**
   - Click the green **"बारकोड साठा आवक (Barcode Stock-In)"** button in Inventory.
   - Use your mobile camera, USB scanner gun, or type the barcode manually.
2. **Step 2: Instant Search**
   - The system queries `public.product_barcodes` and `public.products`.
   - If found: Product name, brand, category, and current stock are shown.
   - If not found: Prompt to register the product in catalogue with 0 stock.
3. **Step 3: Enter Stock Details**
   - Enter Quantity received, purchase price, selling price, batch number, and expiry date.
   - Click quick presets like `+2 दिवस (दूध)` or `+7 दिवस (दही/पनीर)`.
4. **Step 4: Atomic Confirmation**
   - Review summary of inward batch.
   - Click **"साठा आवक पक्का करा"** — atomically creates batch, updates stock, records movement, and logs audit trail.
