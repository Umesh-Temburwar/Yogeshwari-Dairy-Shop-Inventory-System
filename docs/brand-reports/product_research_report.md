# Verified Indian FMCG Product Catalogue Expansion: Final Research Report
**Yogeshwari Dairy Shop & Products Inventory / ERP / POS System**  
*Branch: `feat/fmcg-catalogue-expansion` | Date: November 2026*

---

## 1. Executive Summary

This project executed a disciplined, evidence-based expansion and enrichment of the Yogeshwari Dairy FMCG Product Catalogue across 19 major Indian food and beverage brands (Groups A through S).

### Key Aggregate Statistics:
- **Total Brand Candidates Evaluated:** 1,997
- **Verified GS1 Barcodes:** 1,948
- **Verified Studio Images (200px+):** 1,584
- **Missing Images Documented (as NULL):** 386
- **Brand New Products Added to Catalogue:** 742
- **Existing Catalogue Stubs Enriched:** 771
- **Candidates Rejected (Checksum / Single-Source / Zero Evidence):** 49
- **Catalogue vs Inventory Isolation:** 100% Guaranteed (`stock_quantity = 0.0` for all catalogue items; physical store stock of 8 items untouched).

---

## 2. Per-Brand Summary Table

| Brand Family | Verified Manufacturer / Brand Owner | Candidates | Verified GTINs | Verified Images | New Products | Enriched Stubs |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Parle** | Parle Products Pvt. Ltd. | 243 | 243 | 186 | 28 | 122 |
| **Britannia** | Britannia Industries Ltd. | 246 | 244 | 204 | 37 | 152 |
| **Cadbury** | Mondelez India Foods Pvt. Ltd. | 270 | 268 | 226 | 97 | 103 |
| **Oreo** | Mondelez India Foods Pvt. Ltd. | 147 | 140 | 109 | 92 | 34 |
| **Unibic** | Unibic Foods India Pvt. Ltd. | 106 | 106 | 89 | 0 | 59 |
| **Balaji** | Balaji Wafers Pvt. Ltd. | 86 | 86 | 82 | 1 | 50 |
| **Temptin** | Empire Spices & Foods Ltd. | 6 | 6 | 6 | 0 | 1 |
| **Ram Bandhu** | Empire Spices & Foods Ltd. | 19 | 19 | 13 | 2 | 10 |
| **Suhana** | Pravin Masalewale | 26 | 26 | 14 | 0 | 10 |
| **Mayora Malkist** | Inbisco India Pvt. Ltd. (Mayora Group) | 24 | 24 | 17 | 11 | 9 |
| **Yellow Diamond** | Prataap Snacks Ltd. | 118 | 117 | 87 | 93 | 7 |
| **Chakote** | Shree Ganesh Bakery Nandani Pvt. Ltd. (Chakote Group) | 13 | 13 | 13 | 0 | 10 |
| **Moti Namkeen** | Moti Food Products | 2 | 2 | 2 | 0 | 1 |
| **Campa** | Reliance Consumer Products Ltd. (Reliance Retail) | 56 | 56 | 43 | 1 | 29 |
| **Sprite** | Hindustan Coca-Cola Beverages Pvt. Ltd. (The Coca-Cola Company) | 117 | 112 | 83 | 95 | 13 |
| **Dairy Power** | Dairy Power Limited | 14 | 0 | 0 | 0 | 14 |
| **Empire Aqua** | The Empire Aqua (Ambajogai) | 4 | 0 | 0 | 0 | 4 |
| **Sunrich Aqua** | Bai-Kakaji Aquasure Solutions Pvt. Ltd. (Sunrich Aqua) | 4 | 0 | 0 | 0 | 4 |
| **Nestlé India** | Nestlé India Ltd. | 496 | 486 | 410 | 285 | 139 |
| **TOTAL** | **19 Brand Families** | **1,997** | **1,948** | **1,584** | **742** | **771** |

---

## 3. Verified Corporate Ownership & GS1 Prefixes

1. **Parle:** Parle Products Pvt. Ltd. (GS1 prefix `8901719`).
2. **Britannia:** Britannia Industries Ltd., Wadia Group (GS1 prefix `8901063`).
3. **Cadbury:** Mondelez India Foods Pvt. Ltd. (GS1 prefix `8901233`, `7622201`).
4. **Oreo:** Mondelez India Foods Pvt. Ltd. (GS1 prefixes `7622201`, `7622202`, `8901233`; verified owned by Mondelez, NOT Britannia).
5. **Unibic:** Unibic Foods India Pvt. Ltd. (GS1 prefixes `8906009`, `8906188`; verified independent private entity).
6. **Balaji Wafers:** Balaji Wafers Pvt. Ltd., Rajkot (GS1 prefix `8906010`).
7. **Temptin:** Empire Spices & Foods Ltd. (ESFL), Nashik (GS1 prefix `8903553`).
8. **Ram Bandhu:** Empire Spices & Foods Ltd. (ESFL), Nashik (GS1 prefix `8903553`).
9. **Suhana:** Pravin Masalewale, Pune (GS1 prefixes `8901662`, `8903241`).
10. **Mayora Malkist:** Inbisco India Pvt. Ltd. / PT Mayora Indah Tbk (GS1 prefix `8992753`, `8996001`).
11. **Yellow Diamond:** Prataap Snacks Ltd., Indore (GS1 prefix `8906004`).
12. **Chakote:** Shree Ganesh Bakery Nandani Pvt. Ltd., Shirol/Kolhapur (GS1 prefix `8906031`).
13. **Moti Namkeen:** Moti Food Products, Maharashtra (GS1 prefix `8906059`).
14. **Campa:** Reliance Consumer Products Ltd. / Reliance Retail (GS1 prefix `8904132`).
15. **Sprite:** Hindustan Coca-Cola Beverages Pvt. Ltd. / The Coca-Cola Company (GS1 prefix `8901764`).
16. **Dairy Power:** Dairy Power Limited, Niphad/Nashik, Maharashtra. Barcodes kept as NULL (`needs_physical_pack_check`).
17. **Empire Aqua:** The Empire Aqua, Ambajogai, Maharashtra. Barcodes kept as NULL (`needs_physical_pack_check`).
18. **Sunrich Aqua:** Bai-Kakaji Aquasure Solutions Pvt. Ltd., Latur, Maharashtra. Barcodes kept as NULL (`needs_physical_pack_check`).
19. **Nestlé India:** Nestlé India Ltd. (GS1 prefix `8901058`).

---

## 4. Evidence-Only Compliance & Data Quality Safeguards

1. **GS1 Modulo-10 Checksum Algorithm:**
   All 14-digit, 13-digit, 12-digit, and 8-digit barcodes were mathematically verified. 27 malformed or truncated barcodes across the dataset were rejected and logged into `data/fmcg_catalogue/unverified_products.csv`.
2. **Real Image Byte & Dimension Verification:**
   Every image URL was probed with HTTP HEAD/GET and verified using Pillow (`PIL.Image.open()`). Only images meeting minimum dimensions (>=200x200px) and clean HTTP 200 responses were approved.
3. **Excel Protection:**
   All barcodes in CSV exports are formatted with a leading apostrophe (`'890...`) to guarantee that Microsoft Excel, Google Sheets, or LibreOffice never corrupt GTINs into scientific notation (`8.90E+12`).
4. **Catalogue vs Inventory Separation:**
   Every newly inserted product record has `stock_quantity = 0.0`. Physical store stock, billing, purchases, and khata ledger are untouched.

---

## 5. Artifacts and Generated Deliverables

| Deliverable | Path | Description |
| :--- | :--- | :--- |
| **Complete FMCG Catalogue** | `data/fmcg_catalogue/complete_fmcg_catalogue.csv` | Full dataset with Excel-safe GTINs and provenance metadata |
| **Verified Barcodes** | `data/fmcg_catalogue/verified_barcodes.csv` | Mathematically valid GTINs with source URLs and GS1 types |
| **Verified Image URLs** | `data/fmcg_catalogue/verified_image_urls.csv` | Verified image URLs with dimensions, byte sizes, and format |
| **Missing Barcodes** | `data/fmcg_catalogue/missing_barcodes.csv` | Regional items requiring in-store physical pack scans |
| **Missing Images** | `data/fmcg_catalogue/missing_images.csv` | Items where no verified studio packshot exists |
| **Duplicate Barcodes** | `data/fmcg_catalogue/duplicate_barcodes.csv` | Flagged conflicts for manual review |
| **Unverified Candidates** | `data/fmcg_catalogue/unverified_products.csv` | Checksum failures and zero-evidence candidates rejected |
| **Review Changes** | `data/fmcg_catalogue/review_changes.csv` | Log of existing database stubs enriched with manufacturer and images |
| **Supabase SQL Import** | `supabase/product_catalogue_import.sql` | Consolidated idempotent SQL script for Supabase SQL Editor |
| **Supabase Rollback** | `supabase/rollback.sql` | One-click rollback script |

---

## 6. How to Deploy to Supabase

1. Open the **Supabase Dashboard** -> **SQL Editor**.
2. Paste and run [`supabase/product_catalogue_import.sql`](file:///d:/Projects/Yogeshwari%20Dairy%20Shop%20Inventory%20System/supabase/product_catalogue_import.sql).
3. The script will:
   - Create additive columns and the `catalogue_import_staging` table.
   - Insert all 1,970 verified staging records.
   - Safely enrich existing records and insert new products with `stock_quantity = 0.0`.
