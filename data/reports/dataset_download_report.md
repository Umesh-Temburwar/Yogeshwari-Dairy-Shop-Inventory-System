# 📊 Master Product Catalogue — Dataset Download, Source Verification & Supabase Integration Report

**Updated:** 2026-11-15  
**Target System:** Yogeshwari Dairy Shop & Inventory Management System (ERP & POS)

---

## 📌 Dataset Verification & Integration Summary

| # | Dataset / Source | Download Status | Supabase Status | Records Available | File Location in Project | Description / Use-Case |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Open Food Facts (India)** | `DOWNLOADED` | `INTEGRATED & LIVE` | 21,992 valid products | `data/processed/openfoodfacts_cleaned.csv` | Full GS1/EAN barcodes, nutrition, brands, and categories. Powers live camera scanning. |
| 2 | **OpenMRP (Official GitHub)** | `CLONED & COMPILED` | `INTEGRATED & LIVE` | 21,993 products (4,501 brands) | `integrations/openmrp/dump/` & `data/processed/openmrp_cleaned.csv` | ODbL-licensed Indian product database with Veg/Non-Veg indicators and verified MRP. |
| 3 | **IndianFmcg (Hugging Face)** | `DOWNLOADED` | `SEEDED & LIVE` | 1,000 distinct SKUs (190.7K rows) | `data/raw/indianfmcg_raw.csv` & `data/processed/indianfmcg_cleaned.csv` | FMCG staples across top 10 brands (Amul, Britannia, Dabur, Nestle, Parle, ITC, MDH, etc.). Enables instant POS search. |
| 4 | **QuickCommerceData** | `PREVIEW EXTRACTED` | `SAMPLE SAVED` | Commercial B2B Sample | `data/raw/quickcommerce_raw.csv` & `data/processed/quickcommerce_cleaned.csv` | Commercial enterprise dataset (₹2,22,253 to ₹6,79,990). Requires paid license; schema sample extracted. |

---

## 🚀 Live Supabase Status

- **Total Active Products in Supabase:** **33,518**
- **Total Barcodes Indexed:** **23,320**
- **Safety Guarantee:** All catalogue additions have `stock_quantity = 0.0`. Physical store inventory remains 100% accurate and isolated.
- **Search & POS Resolution:**
  - Barcode camera scanner decodes and matches barcodes instantly via Supabase RPC/REST.
  - POS and Inventory text searches query `.or('name.ilike.%q%,brand.ilike.%q%')` so non-barcoded FMCG items appear immediately when typing.

---

## 📁 Consolidated Local CSV Files

All cleaned and ready-to-use CSV files are maintained in the repository:
1. `data/final/master_product_catalogue.csv` (Complete unified master catalogue)
2. `data/final/barcode_catalogue.csv` (All barcode-enabled products)
3. `data/final/products_without_barcode.csv` (FMCG products without barcode)
4. `data/final/supabase_product_catalogue_ready.csv` (PostgreSQL / Supabase compatible export)
5. `data/final/chunks/product_catalogue_part_01.csv` to `05.csv` (Split into 5,000-row chunks for direct Supabase Table Editor upload)
