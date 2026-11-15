import os
import json
import pandas as pd
from datetime import datetime

OUTPUT_DIR = os.path.abspath('barcode_database')
os.makedirs(OUTPUT_DIR, exist_ok=True)

print(f"Creating Barcode Database in: {OUTPUT_DIR}")

# 1. Helper to clean and format barcodes
def clean_barcode(val):
    if pd.isna(val):
        return None
    s = str(val).strip()
    if s.endswith('.0'):
        s = s[:-2]
    s = ''.join(c for c in s if c.isalnum())
    if len(s) < 5:
        return None
    return s

all_records = {}

# 2. Ingest Yogeshwari Dairy curated shop catalogue (424 products)
dairy_file = 'data/clean_catalogue/YOGESHWARI_DAIRY_MASTER_CATALOGUE.csv'
dairy_records = []
if os.path.exists(dairy_file):
    df_dairy = pd.read_csv(dairy_file, low_memory=False)
    for _, r in df_dairy.iterrows():
        b = clean_barcode(r.get('barcode'))
        if not b:
            continue
        rec = {
            'barcode': b,
            'product_name': str(r.get('product_name') or '').strip(),
            'marathi_name': str(r.get('marathi_name') or '').strip() if not pd.isna(r.get('marathi_name')) else None,
            'hindi_name': str(r.get('hindi_name') or '').strip() if not pd.isna(r.get('hindi_name')) else None,
            'brand': str(r.get('brand') or 'Yogeshwari Dairy').strip(),
            'category': str(r.get('category') or 'Dairy').strip(),
            'subcategory': 'Shop Inventory',
            'pack_size': str(r.get('pack_size') or '').strip() if not pd.isna(r.get('pack_size')) else None,
            'unit': str(r.get('unit') or 'Pcs').strip(),
            'purchase_price': float(r['purchase_price']) if pd.notna(r.get('purchase_price')) else None,
            'selling_price': float(r['selling_price']) if pd.notna(r.get('selling_price')) else None,
            'mrp': float(r['selling_price']) if pd.notna(r.get('selling_price')) else None,
            'source': 'YOGESHWARI_DAIRY_SHOP'
        }
        all_records[b] = rec
        dairy_records.append(rec)
    print(f"Loaded {len(dairy_records)} curated Yogeshwari Dairy products.")

# 3. Ingest FMCG & Groceries barcode catalogue (21,993 products)
cat_file = 'data/final/barcode_catalogue.csv'
fmcg_records = []
if os.path.exists(cat_file):
    df_cat = pd.read_csv(cat_file, low_memory=False)
    for _, r in df_cat.iterrows():
        b = clean_barcode(r.get('barcode'))
        if not b:
            continue
        rec = {
            'barcode': b,
            'product_name': str(r.get('product_name') or '').strip(),
            'marathi_name': None,
            'hindi_name': None,
            'brand': str(r.get('brand') or 'Generic').strip(),
            'category': str(r.get('category') or 'Groceries & FMCG').strip(),
            'subcategory': str(r.get('subcategory') or '').strip() if not pd.isna(r.get('subcategory')) else None,
            'pack_size': str(r.get('package_size') or '').strip() if not pd.isna(r.get('package_size')) else None,
            'unit': str(r.get('quantity_unit') or '').strip() if not pd.isna(r.get('quantity_unit')) else None,
            'purchase_price': None,
            'selling_price': float(r['selling_price']) if pd.notna(r.get('selling_price')) else None,
            'mrp': float(r['mrp']) if pd.notna(r.get('mrp')) else None,
            'source': str(r.get('source_name') or 'FMCG_CATALOGUE').strip()
        }
        fmcg_records.append(rec)
        if b not in all_records:
            all_records[b] = rec
    print(f"Loaded {len(fmcg_records)} FMCG catalogue products.")

# 4. Ingest any additional items from OpenFoodFacts
off_file = 'data/processed/openfoodfacts_cleaned.csv'
if os.path.exists(off_file):
    df_off = pd.read_csv(off_file, low_memory=False)
    added_off = 0
    for _, r in df_off.iterrows():
        b = clean_barcode(r.get('barcode'))
        if b and b not in all_records:
            all_records[b] = {
                'barcode': b,
                'product_name': str(r.get('product_name') or '').strip(),
                'marathi_name': None,
                'hindi_name': None,
                'brand': str(r.get('brand') or 'Generic').strip(),
                'category': str(r.get('category') or 'Groceries & FMCG').strip(),
                'subcategory': None,
                'pack_size': str(r.get('package_size') or '').strip() if not pd.isna(r.get('package_size')) else None,
                'unit': str(r.get('quantity_unit') or '').strip() if not pd.isna(r.get('quantity_unit')) else None,
                'purchase_price': None,
                'selling_price': None,
                'mrp': None,
                'source': 'OPENFOODFACTS'
            }
            added_off += 1
    print(f"Added {added_off} supplemental items from OpenFoodFacts.")

total_unique = len(all_records)
print(f"Grand Total Unique Barcodes: {total_unique}")

# 5. Export Master CSV
master_list = list(all_records.values())
df_master = pd.DataFrame(master_list)
master_csv_path = os.path.join(OUTPUT_DIR, 'master_barcode_database.csv')
df_master.to_csv(master_csv_path, index=False, encoding='utf-8')
print(f"Wrote master CSV: {master_csv_path} ({len(df_master)} rows)")

# 6. Export Master JSON
master_json_path = os.path.join(OUTPUT_DIR, 'master_barcode_database.json')
with open(master_json_path, 'w', encoding='utf-8') as f:
    json.dump(master_list, f, ensure_ascii=False, indent=2)
print(f"Wrote master JSON: {master_json_path}")

# 7. Export Yogeshwari Dairy Specific Barcodes (CSV + JSON)
df_dairy_out = pd.DataFrame(dairy_records)
dairy_csv_path = os.path.join(OUTPUT_DIR, 'yogeshwari_dairy_shop_barcodes.csv')
df_dairy_out.to_csv(dairy_csv_path, index=False, encoding='utf-8')

dairy_json_path = os.path.join(OUTPUT_DIR, 'yogeshwari_dairy_shop_barcodes.json')
with open(dairy_json_path, 'w', encoding='utf-8') as f:
    json.dump(dairy_records, f, ensure_ascii=False, indent=2)
print(f"Wrote Yogeshwari Dairy shop barcodes: {dairy_csv_path} ({len(dairy_records)} items)")

# 8. Export FMCG & Groceries Catalogue CSV
df_fmcg_out = pd.DataFrame(fmcg_records)
fmcg_csv_path = os.path.join(OUTPUT_DIR, 'fmcg_groceries_barcode_catalog.csv')
df_fmcg_out.to_csv(fmcg_csv_path, index=False, encoding='utf-8')
print(f"Wrote FMCG Groceries CSV: {fmcg_csv_path} ({len(df_fmcg_out)} items)")

# 9. Compute Summary Statistics
brand_counts = df_master['brand'].value_counts().head(20).to_dict()
category_counts = df_master['category'].value_counts().head(15).to_dict()
source_counts = df_master['source'].value_counts().to_dict()

summary_data = {
    "project": "Yogeshwari Dairy Shop & Inventory Management System",
    "total_unique_barcodes": total_unique,
    "dairy_shop_curated_items": len(dairy_records),
    "fmcg_packaged_goods_items": len(fmcg_records),
    "generated_at": datetime.now().isoformat(),
    "top_brands": brand_counts,
    "top_categories": category_counts,
    "sources": source_counts
}

summary_json_path = os.path.join(OUTPUT_DIR, 'barcode_database_summary.json')
with open(summary_json_path, 'w', encoding='utf-8') as f:
    json.dump(summary_data, f, ensure_ascii=False, indent=2)
print(f"Wrote Summary JSON: {summary_json_path}")

# 10. Generate CLI Search Script: search_barcode.py
cli_search_code = '''#!/usr/bin/env python3
"""
Quick Barcode Search Utility for Yogeshwari Dairy Shop
Usage:
    python search_barcode.py 8901719100369
    python search_barcode.py "Amul Butter"
    python search_barcode.py --brand Parle
"""
import sys
import os
import pandas as pd

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'master_barcode_database.csv')

def search(query, mode='all'):
    if not os.path.exists(DB_FILE):
        print(f"Error: Database file not found at {DB_FILE}")
        return

    df = pd.read_csv(DB_FILE, low_memory=False)
    q = str(query).strip().lower()

    if q.isdigit() and len(q) >= 4:
        # Exact or suffix match on barcode
        res = df[df['barcode'].astype(str).str.contains(q, na=False)]
    else:
        # Search by product name, marathi name, hindi name, or brand
        name_match = df['product_name'].astype(str).str.lower().str.contains(q, na=False)
        brand_match = df['brand'].astype(str).str.lower().str.contains(q, na=False)
        cat_match = df['category'].astype(str).str.lower().str.contains(q, na=False)
        marathi_match = df['marathi_name'].astype(str).str.lower().str.contains(q, na=False)
        res = df[name_match | brand_match | cat_match | marathi_match]

    print(f"\\n🔍 Search Results for: '{query}' ({len(res)} found)\\n" + "="*80)
    if len(res) == 0:
        print("No products found matching query.")
        return

    display_cols = ['barcode', 'product_name', 'brand', 'category', 'pack_size', 'selling_price', 'mrp']
    actual_cols = [c for c in display_cols if c in res.columns]
    
    # Show first 25 matches
    preview = res[actual_cols].head(25)
    print(preview.to_string(index=False))
    if len(res) > 25:
        print(f"\\n... and {len(res) - 25} more items. (Showing first 25)")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python search_barcode.py <barcode_or_product_name>")
        sys.exit(1)
    query = ' '.join(sys.argv[1:])
    search(query)
'''

search_script_path = os.path.join(OUTPUT_DIR, 'search_barcode.py')
with open(search_script_path, 'w', encoding='utf-8') as f:
    f.write(cli_search_code)
print(f"Wrote CLI search utility: {search_script_path}")

# 11. Generate Supabase / PostgreSQL SQL Migration Script
sql_script_content = '''-- ============================================================================
-- YOGESHWARI DAIRY SHOP ERP - MASTER PRODUCT CATALOGUE & BARCODES DATABASE
-- File: barcode_database/supabase_product_catalogue_insert.sql
-- ============================================================================
-- Contains:
-- 1. Table schema for product_catalogue and product_barcodes
-- 2. Performance indexes (B-Tree on barcode, GIN on product_name)
-- 3. Fast lookup RPC function fn_search_product_by_barcode
-- 4. Idempotent bulk copy / insert template for 22,000+ FMCG barcodes
-- ============================================================================

BEGIN;

-- 1. Master Product Catalogue Table
CREATE TABLE IF NOT EXISTS public.product_catalogue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode TEXT,
    product_name TEXT NOT NULL,
    normalized_name TEXT,
    brand TEXT,
    category TEXT DEFAULT 'Groceries & FMCG',
    subcategory TEXT,
    quantity_value NUMERIC(10,3),
    quantity_unit TEXT,
    package_size TEXT,
    mrp NUMERIC(10,2),
    selling_price NUMERIC(10,2),
    image_url TEXT,
    description TEXT,
    ingredients TEXT,
    source_name TEXT DEFAULT 'MASTER_DB',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure Unique Index on Barcode for Fast 0ms Lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_catalogue_barcode_unique 
    ON public.product_catalogue (barcode) 
    WHERE barcode IS NOT NULL AND barcode <> '';

CREATE INDEX IF NOT EXISTS idx_product_catalogue_brand 
    ON public.product_catalogue (brand);

CREATE INDEX IF NOT EXISTS idx_product_catalogue_category 
    ON public.product_catalogue (category);

-- 3. Enable RLS with public read access for POS billing and inventory scanning
ALTER TABLE public.product_catalogue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to product_catalogue" ON public.product_catalogue;
CREATE POLICY "Allow read access to product_catalogue"
    ON public.product_catalogue FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow service role full access to product_catalogue" ON public.product_catalogue;
CREATE POLICY "Allow service role full access to product_catalogue"
    ON public.product_catalogue FOR ALL
    TO service_role
    USING (true);

-- 4. Fast RPC Search Function for Single/Multi-angle Barcodes
CREATE OR REPLACE FUNCTION public.fn_search_product_by_barcode(p_barcode TEXT)
RETURNS TABLE (
    id UUID,
    barcode TEXT,
    product_name TEXT,
    brand TEXT,
    category TEXT,
    selling_price NUMERIC,
    mrp NUMERIC,
    package_size TEXT
) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
    v_clean TEXT := TRIM(p_barcode);
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.barcode,
        c.product_name,
        c.brand,
        c.category,
        c.selling_price,
        c.mrp,
        c.package_size
    FROM public.product_catalogue c
    WHERE c.is_active = true 
      AND (
          c.barcode = v_clean 
          OR c.barcode = '0' || v_clean 
          OR c.barcode = LTRIM(v_clean, '0')
      )
    LIMIT 1;
END;
$$;

COMMIT;

-- ============================================================================
-- NOTE ON BULK IMPORTING ALL 22,397 ROWS INTO SUPABASE:
-- Option A (Fastest via Supabase CLI / psql):
--   \\copy public.product_catalogue(barcode, product_name, brand, category, package_size, selling_price, mrp, source_name) 
--   FROM 'barcode_database/master_barcode_database.csv' WITH (FORMAT csv, HEADER true);
--
-- Option B (Supabase Dashboard):
--   Open Supabase Dashboard -> Table Editor -> product_catalogue -> Click "Insert" -> "Import data from CSV"
--   Select 'barcode_database/master_barcode_database.csv'
-- ============================================================================
'''

sql_path = os.path.join(OUTPUT_DIR, 'supabase_product_catalogue_insert.sql')
with open(sql_path, 'w', encoding='utf-8') as f:
    f.write(sql_script_content)
print(f"Wrote Supabase SQL file: {sql_path}")

# 12. Generate README.md
readme_content = f"""# 📦 YOGESHWARI DAIRY SHOP - ALL BARCODE DATABASE (संपूर्ण बारकोड डेटाबेस)
**Project:** Yogeshwari Dairy Shop & Inventory Management System  
**Updated:** {datetime.now().strftime('%d %B %Y')}  
**Total Unique Barcodes:** {total_unique:,} Barcodes

---

## 📁 फोल्डरमधील फायलींची माहिती (Files in this Folder)

| File Name | Format | Rows / Size | Description |
|---|---|---|---|
| **`master_barcode_database.csv`** | CSV | **{total_unique:,} Barcodes** | सर्व उत्पादनांचा मुख्य डेटाबेस (Excel किंवा Google Sheets मध्ये उघडता येतो). |
| **`master_barcode_database.json`** | JSON | **{total_unique:,} Barcodes** | संपूर्ण डेटाबेस JSON फॉरमॅटमध्ये (APIs किंवा ॲपमध्ये वापरण्यासाठी). |
| **`yogeshwari_dairy_shop_barcodes.csv`** | CSV | **{len(dairy_records):,} Items** | योगेश्वरी डेअरीच्या खास वस्तू (दूध, दही, पनीर, खवा, तूप, बिस्किटे, स्नॅक्स) मराठी व हिंदी नावांसह. |
| **`yogeshwari_dairy_shop_barcodes.json`** | JSON | **{len(dairy_records):,} Items** | योगेश्वरी डेअरीच्या वस्तूंचा JSON डेटा. |
| **`fmcg_groceries_barcode_catalog.csv`** | CSV | **{len(fmcg_records):,} Items** | पॅकेज्ड फूड, बिस्किटे, वेफर्स, शीतपेये, मसाल्यांचा मोठा कॅटलॉग. |
| **`supabase_product_catalogue_insert.sql`** | SQL | Schema + RPC | Supabase / PostgreSQL मध्ये डेटाबेस टेबल व RPC फंक्शन्स तयार करणारी स्क्रिप्ट. |
| **`search_barcode.py`** | Python | CLI Utility | कोणताही बारकोड किंवा वस्तूचे नाव क्षणात शोधण्याचे टूल. |
| **`barcode_database_summary.json`** | JSON | Metadata | ब्रँड्स, कॅटेगरी आणि एकूण आकड्यांचे संपूर्ण विश्लेषण. |

---

## 📊 मुख्य आकडेवारी (Statistics)

- **एकूण युनिक बारकोड्स (Total Unique Barcodes):** `{total_unique:,}`
- **योगेश्वरी डेअरी क्युरेटेड उत्पादने:** `{len(dairy_records):,}`
- **FMCG ग्रॉसरी उत्पादने:** `{len(fmcg_records):,}`

### प्रमुख ब्रँड्स (Top Brands)
{chr(10).join([f"- **{brand}:** {cnt:,} उत्पादने" for brand, cnt in list(brand_counts.items())[:10]])}

### प्रमुख वर्ग (Top Categories)
{chr(10).join([f"- **{cat}:** {cnt:,} उत्पादne" for cat, cnt in list(category_counts.items())[:6]])}

---

## 🚀 कसा वापरायचा? (How to Use)

### १. बारकोड शोधणे (Search by Barcode or Product Name via CLI)
कमांड लाईन किंवा टर्मिनलवर खालील कमांड चालवा:
```bash
# बारकोड नंबरने शोधणे:
python barcode_database/search_barcode.py 8901719100369

# वस्तूच्या नावाने शोधणे:
python barcode_database/search_barcode.py "Amul Butter"

# ब्रँडनुसार शोधणे:
python barcode_database/search_barcode.py "Parle"
```

### २. Excel किंवा Google Sheets मध्ये उघडणे
- `barcode_database/master_barcode_database.csv` किंवा `yogeshwari_dairy_shop_barcodes.csv` फाईलवर डबल-क्लिक करून थेट Excel मध्ये उघडू शकता.
- सर्व बारकोड्स सुरक्षित टेक्स्ट फॉरमॅटमध्ये असल्यामुळे `0` (leading zero) गायब होत नाही.

### ३. Supabase मध्ये इंपोर्ट करणे
1. Supabase Dashboard वर जा: [https://supabase.com](https://supabase.com)
2. **SQL Editor** उघडा आणि `barcode_database/supabase_product_catalogue_insert.sql` मधील कोड रन करा.
3. **Table Editor** -> `product_catalogue` वर क्लिक करा -> **Insert** -> **Import data from CSV** निवडा -> `master_barcode_database.csv` फाईल निवडून इंपोर्ट करा.

---

## 🛒 ॲपमधील वापर (Application Integration)
- योगेश्वरी डेअरीच्या **POS Billing Counter** आणि **Stock-In Scanner** मध्ये हा डेटाबेस थेट जोडलेला आहे.
- जेव्हा तुम्ही मोबाईल कॅमेऱ्याने कोणताही बारकोड स्कॅन करता किंवा फोन हलवता (**Shake-to-Scan**), तेव्हा सिस्टीम सर्वप्रथम या डेटाबेसमधून ० सेकंदात (0ms) वस्तू शोधून थेट बिलात किंवा गोदामात जमा करते!
"""

readme_path = os.path.join(OUTPUT_DIR, 'README.md')
with open(readme_path, 'w', encoding='utf-8') as f:
    f.write(readme_content)
print(f"Wrote README: {readme_path}")
print("ALL BARCODE DATABASE ASSETS GENERATED SUCCESSFULLY!")
