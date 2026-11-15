# Product Catalogue Deduplication Report

## 1. Executive Summary
- **Total Duplicate Records Identified & Handled**: 21,993
- **Exact Barcode Collisions**: 21,993
- **Brand + Normalized Name + Package Collisions**: 0
- **Resolution Strategy**: Multi-tiered hierarchy preserving shop master pricing and verified package information.

## 2. Match Rules Applied
1. **Rule 1 (100% Confidence)**: Exact barcode match across datasets. If a shop master item exists, it takes precedence; otherwise Open Food Facts provides international packaging and allergen data.
2. **Rule 2 (95% Confidence)**: Exact match on normalized brand, normalized name, and standardized package unit. Different pack sizes (e.g. 500ml vs 1L) are strictly preserved as separate records.
3. **Safety Protection**: Different barcodes are NEVER merged, even if product names are similar.

## 3. Sample Duplicate Records Logged
| original_product_name   | duplicate_product_name   |   original_barcode |   duplicate_barcode | source                | match_reason              |   confidence_score | review_status   |
|:------------------------|:-------------------------|-------------------:|--------------------:|:----------------------|:--------------------------|-------------------:|:----------------|
| banana sily yellow      | banana sily yellow       |           00000604 |            00000604 | Open Food Facts India | Exact Valid Barcode Match |                  1 | Auto-Merged     |
| banana mari             | banana mari              |           00000605 |            00000605 | Open Food Facts India | Exact Valid Barcode Match |                  1 | Auto-Merged     |
| KAJU KATLI              | KAJU KATLI               |           00000723 |            00000723 | Open Food Facts India | Exact Valid Barcode Match |                  1 | Auto-Merged     |
| Hershey s milk nuggets  | Hershey s milk nuggets   |           00000740 |            00000740 | Open Food Facts India | Exact Valid Barcode Match |                  1 | Auto-Merged     |
| Muesli                  | Muesli                   |           00000839 |            00000839 | Open Food Facts India | Exact Valid Barcode Match |                  1 | Auto-Merged     |
| Potato                  | Potato                   |      0000101403163 |       0000101403163 | Open Food Facts India | Exact Valid Barcode Match |                  1 | Auto-Merged     |
| Onion                   | Onion                    |      0000101403165 |       0000101403165 | Open Food Facts India | Exact Valid Barcode Match |                  1 | Auto-Merged     |
| Bhendi                  | Bhendi                   |      0000101403175 |       0000101403175 | Open Food Facts India | Exact Valid Barcode Match |                  1 | Auto-Merged     |
| Bitter Gourd            | Bitter Gourd             |      0000101403177 |       0000101403177 | Open Food Facts India | Exact Valid Barcode Match |                  1 | Auto-Merged     |
| Ginger                  | Ginger                   |      0000101403187 |       0000101403187 | Open Food Facts India | Exact Valid Barcode Match |                  1 | Auto-Merged     |
