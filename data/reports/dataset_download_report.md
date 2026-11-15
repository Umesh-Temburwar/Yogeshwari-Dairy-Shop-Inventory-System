# 📊 Master Product Catalogue — Dataset Download & Source Verification Report

**Generated:** 2026-11-15 (Updated with Official OpenMRP GitHub Integration)
**Target System:** Yogeshwari Dairy Shop & Inventory Management System

---

## 📌 Source Verification Summary

| # | Source | Status | Available Rows | File Size | License | Action / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **OpenMRP** | `INTEGRATED_SUCCESSFULLY` | 21,993 | 5.38 MB | ODbL 1.0 | Official repo `https://github.com/openmrp-in/openmrp` cloned & integrated. Full brands, products, variants, food_type (Veg/Non-Veg). |
| 2 | **QuickCommerceData** | `PAID_COMMERCIAL_GATED` | 1 | 122 B | Commercial B2B | Commercial licensing required: ₹2,22,205 to ₹6,79,990. Sample preview extracted. |
| 3 | **Open Food Facts** | `DOWNLOADED_SUCCESSFULLY` | 25,215 | 5.40 MB | ODbL 1.0 | Official PackSense India dataset downloaded and cleaned. |
| 4 | **IndianFmcg** | `DOWNLOADED_SUCCESSFULLY` | 190,740 | 18.84 MB | CC License | Daily transaction log. SKU aggregation applied (1,000 distinct FMCG products). |

---

## 🔍 Detailed Source Findings

### 1. OpenMRP (`https://github.com/openmrp-in/openmrp`)
- **Official Repository:** `openmrp-in/openmrp` (Community-built, ODbL-licensed open product database for India).
- **Integration Directory:** `integrations/openmrp/`
- **Generated Dumps:** `integrations/openmrp/dump/products.csv`, `variants.csv`, `brands.csv`, `manifest.json`
- **Total Valid Records:** 21,993 products across 4,501 Indian brands with Veg / Non-Veg food type classifications.
- **Licence & Attribution:** Open Database License (ODbL 1.0). Source attributed as `OpenMRP India (openmrp-in/openmrp)`.

### 2. QuickCommerceData (`https://quickcommercedata.com/`)
- **Finding:** Commercial gated dataset. Preview sample extracted (1 row). Full licensing required: ₹2.22L - ₹6.80L.
- **Compliance:** Adhered strictly to 'Never bypass login, payment, or website restrictions. Report price and wait for approval.'

### 3. Open Food Facts (`https://world.openfoodfacts.org/`)
- **Source Repo:** `PackSense/packsense-india` on Hugging Face
- **File:** `data/raw/openfoodfacts_raw.csv`
- **Total Rows:** 25,215
- **Licence & Attribution:** Open Database License (ODbL 1.0). Contains barcodes, product names, brands, categories, and nutrition.

### 4. IndianFmcg (`https://huggingface.co/datasets/echosofmoon/IndianFmcg`)
- **Owner/Repository:** `echosofmoon/IndianFmcg`
- **File:** `data/raw/indianfmcg_raw.csv`
- **Total Rows:** 190,740
- **Compliance:** Sales transactions aggregated into 1,000 genuine product SKUs across top Indian FMCG brands (Dabur, Britannia, Patanjali, ITC, Parle, HUL, MDH, Amul, Godrej, Nestle).
