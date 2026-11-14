# 📊 PackSense India Dataset & Catalog Matching Audit Report
**Project:** Yogeshwari Dairy Shop & Inventory Management System  
**Report Generated:** 2026-11-15 02:30 IST  
**Environment:** Production ERP Architecture

---

## 📌 1. Dataset Provenance & Integrity

| Parameter | Specification / Value | Verification Status |
| :--- | :--- | :--- |
| **Dataset Repository** | [PackSense/packsense-india](https://huggingface.co/datasets/PackSense/packsense-india) | ✅ Verified Official |
| **Official Download URL** | `https://huggingface.co/datasets/PackSense/packsense-india/resolve/main/india_products.csv` | ✅ Verified HTTPS Direct |
| **Dataset Release Date** | `2026-11-03` (`2026-11-03T10:30:30 UTC`) | ✅ Latest Available Commit |
| **Download Timestamp** | `2026-11-15 02:25:44 IST` | ✅ Completed Unmodified |
| **Raw File Location** | `data/packsense/raw/india_products.csv` | ✅ Preserved Unmodified |
| **Raw File Size** | `5,657,152` bytes (~5.40 MB) | ✅ Matches Release Manifest |
| **SHA-256 Checksum** | `9007b7a48fe9bc129e6a90a6fc7dfb4dfdcb6a72f53b3a3aabc74eda0d5d1951` | ✅ Exact Manifest Hash Match |
| **License** | Open Database License (ODbL) / Open Food Facts India | ✅ Verified Open Source |

---

## 🔬 2. Data Cleaning & Validation Breakdown

The raw CSV contains 36 native columns. Strict data validation rules were executed to ensure zero corruption of shop data.

```
Total Source Rows:                25,209 (100.0%)
├── Valid Barcodes (8-14 digits): 25,150 (99.77%)
│   ├── Valid Import Candidates:  21,963 (87.12%)  -> Written to india_products_cleaned.csv
│   └── Missing Product Names:     3,210 (12.73%)  -> Rejected from import candidates
└── Invalid / Dummy Barcodes:         59  (0.23%)  -> Rejected (e.g. 0000000000000, 9999999999)
```

### Detailed Validation Counts:
- **Total Source Rows:** `25,209`
- **Valid Barcode Rows:** `25,150`
- **Invalid / Dummy Barcode Rows:** `59` (Flagged & rejected)
- **Duplicate Barcodes in Source:** `0` (Every barcode in raw dataset is unique)
- **Missing Product Names:** `3,210`
- **Missing Brand Names:** `8,052`
- **Missing Pack Sizes / Units:** `1,675`
- **Cleaned Import Candidates:** `21,963`

### Cleaned Dataset Destination:
- **File:** `data/packsense/processed/india_products_cleaned.csv`
- **Total Cleaned Records:** `21,963`
- **Barcode Type:** Strict `TEXT` (leading zeros preserved)

---

## 🏪 3. Existing 368 Dairy Shop Products Matching Summary

The dairy shop currently has **368 existing products** in the database.
Each product was evaluated against PackSense using:
1. Exact Barcode Match
2. Normalized Product Name & Brand
3. Product Type Keyword Constraint (e.g., Ghee cannot match Chocolate)
4. Variant & Pack Size Verification (e.g., 500g cannot match 1kg)

```
Existing Shop Products:           368 (100.0%)
├── High-Confidence Exact Match:    7   (1.9%)   -> data/packsense/reports/existing_products_matched.csv
├── Manual Review Required:        82  (22.3%)   -> data/packsense/reports/manual_review_required.csv
└── Unmatched (Shop / Local):     279  (75.8%)   -> data/packsense/reports/existing_products_unmatched.csv
```

### Key Findings:
1. **High-Confidence Matches (7):**
   - Products like *Amul Pure Ghee 500ml Pouch* (`8901262030540`), *Britannia Good Day Cashew Cookies 60g* (`8901063092631`), and *Parle Jam-In 50g* (`8901719107320`) matched with 100% confidence on brand, product name, and pack size.
2. **Manual Review Required (82):**
   - Products with multiple pack sizes in PackSense (e.g., *Haldiram Ratlami Sev* has both 150g, 200g, 400g, and 1kg variants in PackSense). Requires human confirmation to ensure the barcode matches the shop's physical shelf pack.
3. **Unmatched Local & Dairy Products (279):**
   - In-house dairy items (*Gramilk Full Cream Milk*, *Desi Buffalo Milk*, *Fresh Malai Paneer 1kg*, *Shrikhand*, *Chakote Toast*, *Moti Falahari Sabudana Chiwda*) and local unbranded items do not exist in national packaged goods databases like PackSense. They will retain their existing catalogue IDs without foreign barcode pollution.

---

## 🛡️ 4. Inventory Separation Guardrail

> [!IMPORTANT]
> **Catalogue Import Must Never Create Stock**  
> Under no circumstances will PackSense catalogue records create entries in `public.batches` or increase `public.products.stock_quantity`.
> All 21,963 PackSense records will be designated purely as **Master Catalogue** (`is_active = TRUE`, `stock_quantity = 0.00`).
> Physical stock will ONLY increase upon explicit, confirmed barcode stock-in by the shop owner/admin.
