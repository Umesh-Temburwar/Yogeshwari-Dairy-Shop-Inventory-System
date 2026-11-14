# Product Catalogue Deduplication Report

## 1. Executive Summary
- **Total Duplicate Records Identified & Handled**: 0
- **Exact Barcode Collisions**: 0
- **Brand + Normalized Name + Package Collisions**: 0
- **Resolution Strategy**: Multi-tiered hierarchy preserving shop master pricing and verified package information.

## 2. Match Rules Applied
1. **Rule 1 (100% Confidence)**: Exact barcode match across datasets. If a shop master item exists, it takes precedence; otherwise Open Food Facts provides international packaging and allergen data.
2. **Rule 2 (95% Confidence)**: Exact match on normalized brand, normalized name, and standardized package unit. Different pack sizes (e.g. 500ml vs 1L) are strictly preserved as separate records.
3. **Safety Protection**: Different barcodes are NEVER merged, even if product names are similar.

## 3. Sample Duplicate Records Logged
_No duplicates detected._
