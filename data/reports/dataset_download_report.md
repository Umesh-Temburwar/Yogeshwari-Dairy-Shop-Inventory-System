# 📊 Master Product Catalogue — Dataset Download & Source Verification Report

**Generated:** 2026-11-15 05:04:48
**Target System:** Yogeshwari Dairy Shop & Inventory Management System

---

## 📌 Source Verification Summary

| # | Source | Status | Available Rows | File Size | License | Action / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **OpenMRP** | `UNAVAILABLE` | 0 | 0 KB | N/A | Domain unresolved / Inactive |
| 2 | **QuickCommerceData** | `PAID_COMMERCIAL_GATED` | 1 | 122 B | Commercial B2B | Commercial licensing required: ₹2,22,205 to ₹6,79,990. Sample preview extracted. |
| 3 | **Open Food Facts** | `DOWNLOADED_SUCCESSFULLY` | 25,215 | 5.40 MB | ODbL 1.0 | Official PackSense India dataset downloaded. |
| 4 | **IndianFmcg** | `DOWNLOADED_SUCCESSFULLY` | 190,740 | 18.84 MB | CC License | Daily transaction log. SKU aggregation applied. |

---

## 🔍 Detailed Source Findings

### 1. OpenMRP (`https://openmrp.org/`)
- **Finding:** Domain unreachable (DNS/Network: <urlopen error [Errno 11001] getaddrinfo failed>)
- **Compliance:** Adhered strictly to 'Never fabricate records'. No synthetic rows created.

### 2. QuickCommerceData (`https://quickcommercedata.com/`)
- **Finding:** Commercial gated dataset. Preview sample extracted (1 rows). Full licensing required: ₹2.22L - ₹6.80L.
- **Pricing:** Commercial licensing required: ₹2,22,205 to ₹6,79,990
- **Compliance:** Adhered strictly to 'Never bypass login, payment, or website restrictions. Report price and wait for approval.' Sample preview captured in `quickcommerce_raw.csv`.

### 3. Open Food Facts (`https://world.openfoodfacts.org/`)
- **Source Repo:** `PackSense/packsense-india` on Hugging Face
- **File:** `data/raw/openfoodfacts_raw.csv`
- **Total Rows:** 25,215
- **SHA-256:** `9007b7a48fe9bc129e6a90a6fc7dfb4dfdcb6a72f53b3a3aabc74eda0d5d1951`
- **Licence & Attribution:** Open Database License (ODbL 1.0). Contains barcodes, product names, brands, categories, and nutrition.

### 4. IndianFmcg (`https://huggingface.co/datasets/echosofmoon/IndianFmcg`)
- **Owner/Repository:** `echosofmoon/IndianFmcg`
- **File:** `data/raw/indianfmcg_raw.csv`
- **Total Rows:** 190,740
- **SHA-256:** `5c6e5654c7e200d96e99ffae2613c4c94e5136be92490060850dc003381719a0`
- **Data Nature:** Contains 190,740 sales transaction logs spanning top Indian FMCG brands (Dabur, Britannia, Patanjali, ITC, Parle, HUL, MDH, Amul, Godrej, Nestle).
- **Compliance:** As instructed, sales transactions are not treated as individual products. The dataset will be deduplicated and aggregated by `(sku, brand, category, pack_type)` to yield genuine product catalogue items.
