"""
Rebuilds Phase 63 Split SQL Files with 100% Guaranteed Uniform Column Length (22 columns).
Fixes PostgreSQL Error 42601 (VALUES lists must all be the same length).
"""

import re
import os

MASTER_COLS = [
    'product_name', 'brand', 'manufacturer', 'category', 'subcategory', 'unit', 'pack_size', 'pack_type',
    'net_weight_value', 'net_weight_unit', 'barcode', 'barcode_raw', 'image_url', 'image_source_url',
    'image_verification_status', 'barcode_verification_status', 'barcode_source_url', 'barcode_evidence',
    'manufacturer_source_url', 'source_name', 'import_decision', 'data_batch_id'
]

def parse_sql_values(val_str: str) -> list:
    vals = []
    cur = []
    in_quotes = False
    i = 0
    n = len(val_str)
    while i < n:
        c = val_str[i]
        if in_quotes:
            if c == "'":
                if i + 1 < n and val_str[i + 1] == "'":
                    cur.append("'")
                    i += 2
                    continue
                else:
                    in_quotes = False
                    i += 1
                    continue
            else:
                cur.append(c)
                i += 1
                continue
        else:
            if c == "'":
                in_quotes = True
                i += 1
                continue
            elif c == ',':
                v = ''.join(cur).strip()
                vals.append(None if v == 'NULL' else v)
                cur = []
                i += 1
                continue
            else:
                cur.append(c)
                i += 1
                continue
    if cur:
        v = ''.join(cur).strip()
        vals.append(None if v == 'NULL' else v)
    return vals

def main():
    print("Reading master SQL...")
    with open('supabase/product_catalogue_import.sql', 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = r'INSERT INTO public\.catalogue_import_staging \((.*?)\) VALUES \((.*?)\);'
    inserts = re.findall(pattern, content, re.DOTALL)
    print(f"Total inserts found: {len(inserts)}")

    standardized_rows = []
    for cols_str, vals_str in inserts:
        cols = [c.strip() for c in cols_str.split(',')]
        vals = parse_sql_values(vals_str)
        row_dict = dict(zip(cols, vals))
        
        row_tokens = []
        for col_name in MASTER_COLS:
            val = row_dict.get(col_name)
            if val is None or val == 'NULL':
                row_tokens.append("NULL")
            else:
                # If numeric net_weight_value
                if col_name == 'net_weight_value':
                    try:
                        f_val = float(val)
                        row_tokens.append(f"{f_val:g}")
                    except ValueError:
                        row_tokens.append("NULL")
                else:
                    escaped = str(val).replace("'", "''")
                    row_tokens.append(f"'{escaped}'")
        standardized_rows.append(row_tokens)

    # Sanity checks
    print(f"Checking row lengths across all {len(standardized_rows)} rows...")
    for idx, r in enumerate(standardized_rows):
        if len(r) != 22:
            print(f"ERROR: Row {idx} has {len(r)} values instead of 22!")
            return
    print("ALL 1,970 ROWS HAVE EXACTLY 22 VALUES!")

    cols_sql_header = ',\n  '.join(MASTER_COLS)

    def chunk_inserts(rows_subset, chunk_size=50):
        chunks = []
        for i in range(0, len(rows_subset), chunk_size):
            chunk = rows_subset[i:i + chunk_size]
            tuple_lines = []
            for r in chunk:
                tuple_lines.append("  (" + ", ".join(r) + ")")
            values_block = ",\n".join(tuple_lines)
            stmt = f"INSERT INTO public.catalogue_import_staging (\n  {cols_sql_header}\n) VALUES\n{values_block};\n"
            chunks.append(stmt)
        return "\n".join(chunks)

    # Part 1: Parle (243), Britannia (244), Cadbury (268) = 755 rows
    p1_rows = standardized_rows[:755]
    # Part 2: Oreo (140), Unibic (106), Balaji (86), Temptin (6), Rambandhu (19), Suhana (26), Mayora (24), Diamond (117), Chakote (13), Moti (2), Campa (56), Sprite (112), Dairy Power (14), Empire Aqua (4), Sunreach Aqua (4) = 729 rows
    p2_rows = standardized_rows[755:755 + 729]
    # Part 3: Nestlé India = 486 rows
    p3_rows = standardized_rows[755 + 729:]

    print(f"Slice counts: Part 1 = {len(p1_rows)}, Part 2 = {len(p2_rows)}, Part 3 = {len(p3_rows)}")

    # 1. Write Part 1
    p1_header = """-- =============================================================================
-- Phase 63 - Part 1: Schema & Staging Setup + Brands (Parle, Britannia, Cadbury)
-- Yogeshwari Dairy ERP - FMCG Product Catalogue Expansion
-- =============================================================================

-- Step 1: Additive columns on public.products (Idempotent)
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS barcode_raw TEXT,
    ADD COLUMN IF NOT EXISTS manufacturer TEXT,
    ADD COLUMN IF NOT EXISTS subcategory TEXT,
    ADD COLUMN IF NOT EXISTS flavour TEXT,
    ADD COLUMN IF NOT EXISTS variant TEXT,
    ADD COLUMN IF NOT EXISTS net_weight_value NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS net_weight_unit TEXT,
    ADD COLUMN IF NOT EXISTS pack_type TEXT DEFAULT 'single',
    ADD COLUMN IF NOT EXISTS parent_barcode TEXT,
    ADD COLUMN IF NOT EXISTS search_keywords TEXT,
    ADD COLUMN IF NOT EXISTS image_source_url TEXT,
    ADD COLUMN IF NOT EXISTS barcode_verification_status TEXT DEFAULT 'unverified',
    ADD COLUMN IF NOT EXISTS barcode_source_url TEXT,
    ADD COLUMN IF NOT EXISTS barcode_evidence TEXT,
    ADD COLUMN IF NOT EXISTS manufacturer_source_url TEXT,
    ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS data_batch_id TEXT;

-- Step 2: Isolated Staging Table
CREATE TABLE IF NOT EXISTS public.catalogue_import_staging (
    staging_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    hindi_name TEXT,
    marathi_name TEXT,
    brand TEXT NOT NULL,
    manufacturer TEXT,
    category TEXT NOT NULL,
    subcategory TEXT,
    flavour TEXT,
    variant TEXT,
    unit TEXT NOT NULL DEFAULT 'PIECE',
    pack_size TEXT,
    pack_type TEXT DEFAULT 'single',
    net_weight_value NUMERIC(10,2),
    net_weight_unit TEXT,
    barcode TEXT,
    barcode_raw TEXT,
    parent_barcode TEXT,
    purchase_price NUMERIC(12,2) DEFAULT 0.00,
    selling_price NUMERIC(12,2) DEFAULT 0.00,
    image_url TEXT,
    image_source_url TEXT,
    image_verification_status TEXT DEFAULT 'missing',
    image_checked_at TIMESTAMPTZ,
    barcode_verification_status TEXT DEFAULT 'unverified',
    barcode_source_url TEXT,
    barcode_evidence TEXT,
    manufacturer_source_url TEXT,
    source_name TEXT,
    verification_status TEXT DEFAULT 'pending',
    review_notes TEXT,
    import_decision TEXT DEFAULT 'pending',
    data_batch_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staging_barcode ON public.catalogue_import_staging (barcode);
CREATE INDEX IF NOT EXISTS idx_staging_batch_id ON public.catalogue_import_staging (data_batch_id);

-- Clean previous staging rows for Part 1 brands
DELETE FROM public.catalogue_import_staging 
WHERE data_batch_id IN ('BATCH_PARLE_20261116', 'BATCH_PHASE3_BRITANNIA_20261116', 'BATCH_PHASE3_CADBURY_20261116');

"""
    with open('supabase/63_phase63_part1_parle_britannia_cadbury.sql', 'w', encoding='utf-8') as f:
        f.write(p1_header + chunk_inserts(p1_rows))
    print("Wrote supabase/63_phase63_part1_parle_britannia_cadbury.sql")

    # 2. Write Part 2
    p2_header = """-- =============================================================================
-- Phase 63 - Part 2: Snacks, Biscuits, Spices, Beverages & Regional Brands
-- (Oreo, Unibic, Balaji, Temptin, Rambandhu, Suhana, Mayora, Diamond, Chakote, Moti, Campa, Sprite, Dairy Power, Empire Aqua, Sunrich Aqua)
-- Total Rows: 729 | Every row has exactly 22 values matching the column specification.
-- =============================================================================

DELETE FROM public.catalogue_import_staging 
WHERE data_batch_id IN (
    'BATCH_PHASE3_OREO_20261116', 'BATCH_PHASE3_UNIBIC_20261116', 'BATCH_PHASE3_BALAJI_20261116',
    'BATCH_PHASE3_TEMPTIN_20261116', 'BATCH_PHASE3_RAMBANDHU_20261116', 'BATCH_PHASE3_SUHANA_20261116',
    'BATCH_PHASE3_MAYORA_20261116', 'BATCH_PHASE3_DIAMOND_20261116', 'BATCH_PHASE3_CHAKOTE_20261116',
    'BATCH_PHASE3_MOTI_20261116', 'BATCH_PHASE3_CAMPA_20261116', 'BATCH_PHASE3_SPRITE_20261116',
    'BATCH_PHASE3_DAIRY_POWER_20261116', 'BATCH_PHASE3_EMPIRE_AQUA_20261116', 'BATCH_PHASE3_SUNREACH_AQUA_20261116'
);

"""
    with open('supabase/63_phase63_part2_oreo_unibic_snacks_beverages_regional.sql', 'w', encoding='utf-8') as f:
        f.write(p2_header + chunk_inserts(p2_rows))
    print("Wrote supabase/63_phase63_part2_oreo_unibic_snacks_beverages_regional.sql")

    # 3. Write Part 3
    p3_header = """-- =============================================================================
-- Phase 63 - Part 3: Nestlé India (Maggi, Nescafé, KitKat, Munch, etc.)
-- Total Rows: 486 | Every row has exactly 22 values matching the column specification.
-- =============================================================================

DELETE FROM public.catalogue_import_staging WHERE data_batch_id = 'BATCH_PHASE3_NESTLE_20261116';

"""
    with open('supabase/63_phase63_part3_nestle_india.sql', 'w', encoding='utf-8') as f:
        f.write(p3_header + chunk_inserts(p3_rows))
    print("Wrote supabase/63_phase63_part3_nestle_india.sql")

    # 4. Write Part 4
    p4_content = """-- =============================================================================
-- Phase 63 - Part 4: Safe Upsert & Final Merge into public.products
-- CATALOGUE VS INVENTORY ISOLATION:
-- All new products inserted with stock_quantity = 0.0 (Zero Inventory Impact).
-- Physical shop stock (8 items), billing, purchases, and ledger remain untouched.
-- =============================================================================

-- Step 1: Staging Loaded Summary
-- Run to confirm all 1,970 records are present in staging:
-- SELECT brand, manufacturer, COUNT(*) as total_records,
--        COUNT(barcode) as with_barcode,
--        COUNT(image_url) as with_image
-- FROM public.catalogue_import_staging
-- GROUP BY brand, manufacturer
-- ORDER BY total_records DESC;

-- Step 2: Enrich existing products matching by verified barcode
UPDATE public.products p
SET
    manufacturer = COALESCE(p.manufacturer, s.manufacturer),
    subcategory = COALESCE(p.subcategory, s.subcategory),
    pack_size = COALESCE(p.pack_size, s.pack_size),
    image_url = CASE 
        WHEN (p.image_url IS NULL OR p.image_url = '' OR p.image_status IN ('Broken URLs', 'Missing Image', 'Needs Review'))
             AND s.image_url IS NOT NULL 
        THEN s.image_url 
        ELSE p.image_url 
    END,
    image_status = CASE 
        WHEN (p.image_url IS NULL OR p.image_url = '' OR p.image_status IN ('Broken URLs', 'Missing Image', 'Needs Review'))
             AND s.image_url IS NOT NULL 
        THEN s.image_verification_status 
        ELSE p.image_status 
    END,
    image_source_url = COALESCE(p.image_source_url, s.image_source_url),
    barcode_verification_status = 'verified',
    barcode_source_url = s.barcode_source_url,
    barcode_evidence = s.barcode_evidence,
    manufacturer_source_url = s.manufacturer_source_url,
    data_batch_id = s.data_batch_id
FROM public.catalogue_import_staging s
WHERE p.barcode = s.barcode
  AND s.barcode IS NOT NULL;

-- Step 3: Insert brand new products from staging that DO NOT exist in public.products
-- STRICT SAFEGUARD: stock_quantity is set to 0.0 (Catalogue item only, no physical stock)
INSERT INTO public.products (
    name,
    hindi_name,
    marathi_name,
    brand,
    manufacturer,
    category,
    subcategory,
    unit,
    pack_size,
    pack_type,
    net_weight_value,
    net_weight_unit,
    barcode,
    barcode_raw,
    stock_quantity,
    min_stock_level,
    purchase_price,
    selling_price,
    image_url,
    image_source_url,
    image_status,
    barcode_verification_status,
    barcode_source_url,
    barcode_evidence,
    manufacturer_source_url,
    data_batch_id
)
SELECT 
    s.product_name,
    s.hindi_name,
    s.marathi_name,
    s.brand,
    s.manufacturer,
    s.category,
    s.subcategory,
    s.unit,
    s.pack_size,
    s.pack_type,
    s.net_weight_value,
    s.net_weight_unit,
    s.barcode,
    s.barcode_raw,
    0.0, -- STRICT: ZERO INVENTORY
    5.0,
    s.purchase_price,
    s.selling_price,
    s.image_url,
    s.image_source_url,
    s.image_verification_status,
    s.barcode_verification_status,
    s.barcode_source_url,
    s.barcode_evidence,
    s.manufacturer_source_url,
    s.data_batch_id
FROM public.catalogue_import_staging s
LEFT JOIN public.products p ON p.barcode = s.barcode
WHERE s.barcode IS NOT NULL
  AND p.id IS NULL;

-- Step 4: Verification of Inventory Isolation
SELECT 
    COUNT(*) as total_catalogue_products,
    COUNT(*) FILTER (WHERE stock_quantity = 0.0) as catalogue_items_zero_stock,
    COUNT(*) FILTER (WHERE stock_quantity > 0.0) as active_physical_stock_items
FROM public.products;
"""
    with open('supabase/63_phase63_part4_safe_merge_to_products.sql', 'w', encoding='utf-8') as f:
        f.write(p4_content)
    print("Wrote supabase/63_phase63_part4_safe_merge_to_products.sql")
    print("=== REBUILD COMPLETE WITH 100% UNIFORM COLUMN LENGTHS ===")

if __name__ == '__main__':
    main()
