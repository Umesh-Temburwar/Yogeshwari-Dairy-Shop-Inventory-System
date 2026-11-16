"""
Generic Brand Research Engine for FMCG Catalogue Expansion.
Processes brands sequentially with GS1 Modulo-10 checksum validation,
image HEAD/GET verification (Pillow decoding), evidence extraction,
Excel-safe CSV formatting, and Supabase staging SQL generation.
"""

import sys
sys.path.append('.')
import os
import json
import csv
import time
import requests
import re
from datetime import datetime, timezone
from data.fmcg_catalogue.validators import validate_gs1_barcode
from data.fmcg_catalogue.image_checker import verify_image_url

OFF_BASE = "https://world.openfoodfacts.net"
HEADERS = {'User-Agent': 'YogeshwariDairyERP-CatalogExpansion/1.0 (contact@yogeshwaridairy.com; polite 1req/sec)'}
CACHE_DIR = "scratch/off_cache"
os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs("data/fmcg_catalogue/research", exist_ok=True)
os.makedirs("data/fmcg_catalogue/reports", exist_ok=True)


def fetch_off_product(barcode: str):
    """Fetches product JSON from Open Food Facts API with local caching."""
    cache_path = os.path.join(CACHE_DIR, f"{barcode}.json")
    if os.path.exists(cache_path):
        try:
            with open(cache_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass

    url = f"{OFF_BASE}/api/v0/product/{barcode}.json"
    try:
        r = requests.get(url, headers=HEADERS, timeout=8)
        if r.status_code == 200:
            data = r.json()
            with open(cache_path, 'w', encoding='utf-8') as f:
                json.dump(data, f)
            time.sleep(0.3)
            return data
    except Exception as e:
        print(f"  [OFF Fetch Error] {barcode}: {e}")
    return None


def parse_weight_and_unit(qty_str: str):
    """Extracts numeric weight and unit from strings like '800 g', '100g', '250 gm'."""
    if not qty_str:
        return None, None, None
    s = str(qty_str).strip()
    match = re.search(r'([\d\.]+)\s*(g|gm|gms|gram|grams|kg|ml|l|ltr|litres?)', s, re.IGNORECASE)
    if match:
        val = float(match.group(1))
        unit = match.group(2).lower()
        if unit in ('gm', 'gms', 'gram', 'grams'):
            unit = 'g'
        elif unit in ('ltr', 'litres', 'litre'):
            unit = 'l'
        clean_pack_size = f"{val:g} {unit}"
        return val, unit, clean_pack_size
    return None, None, s


def process_brand(brand_config: dict) -> dict:
    brand_key = brand_config['brand_key']
    display_brand = brand_config['display_brand']
    manufacturer = brand_config['manufacturer']
    manufacturer_url = brand_config['manufacturer_url']
    gs1_prefixes = brand_config.get('gs1_prefixes', [])
    off_tags = brand_config.get('off_tags', [])
    default_cat = brand_config.get('default_category', 'Bakery & Extras')
    default_subcat = brand_config.get('default_subcategory', 'Biscuits & Cookies')
    db_file = brand_config.get('db_file')
    batch_id = f"BATCH_PHASE3_{brand_key.upper()}_20261116"

    print(f"\n=======================================================")
    print(f"Processing Brand: {display_brand.upper()} ({manufacturer})")
    print(f"=======================================================")
    start_time = time.time()

    # 1. Load existing DB records for this brand
    existing_db = []
    if db_file and os.path.exists(db_file):
        with open(db_file, 'r', encoding='utf-8') as f:
            existing_db = json.load(f)
    print(f"Loaded {len(existing_db)} existing DB records from {db_file}")

    db_by_barcode = {}
    for p in existing_db:
        bc = p.get('barcode')
        if bc:
            db_by_barcode[bc] = p

    # 2. Gather candidates
    candidate_barcodes = set()
    # From DB matching valid GS1 prefixes
    for bc in db_by_barcode.keys():
        if any(bc.startswith(pref) for pref in gs1_prefixes):
            candidate_barcodes.add(bc)

    # From OFF search tags
    for tag in off_tags:
        url = f"{OFF_BASE}/api/v2/search?brands_tags={tag}&page=1&page_size=100&fields=code,product_name,quantity,image_front_url,brands,categories"
        try:
            r = requests.get(url, headers=HEADERS, timeout=10)
            if r.status_code == 200:
                off_prods = r.json().get('products', [])
                for p in off_prods:
                    bc = p.get('code')
                    if bc:
                        candidate_barcodes.add(bc)
                        cache_path = os.path.join(CACHE_DIR, f"{bc}.json")
                        if not os.path.exists(cache_path):
                            with open(cache_path, 'w', encoding='utf-8') as f:
                                json.dump({'status': 1, 'product': p}, f)
        except Exception as e:
            print(f"Error querying OFF tag {tag}: {e}")

    print(f"Total candidate barcodes for {display_brand}: {len(candidate_barcodes)}")

    # 3. Process each candidate
    verified_barcodes = []
    verified_images = []
    missing_images = []
    unverified_products = []
    review_changes = []
    staging_records = []

    processed = 0
    for barcode in sorted(list(candidate_barcodes)):
        processed += 1
        if processed % 50 == 0:
            print(f"  Processed {processed}/{len(candidate_barcodes)}...")

        # Validate GS1 Checksum
        gs1_check = validate_gs1_barcode(barcode)
        if not gs1_check['is_valid']:
            unverified_products.append({
                'barcode': barcode,
                'brand': display_brand,
                'reason': f"GS1 Checksum Failure: {gs1_check['reason']}",
                'source': 'Pre-validation'
            })
            continue

        # Fetch evidence from OFF
        off_data = fetch_off_product(barcode)
        off_p = off_data.get('product', {}) if (off_data and off_data.get('status') == 1) else {}
        db_p = db_by_barcode.get(barcode, {})

        name_off = off_p.get('product_name', '').strip()
        name_db = db_p.get('name', '').strip()
        product_name = name_off or name_db
        if not product_name:
            unverified_products.append({
                'barcode': barcode,
                'brand': display_brand,
                'reason': 'No product name found in OFF or DB',
                'source': 'Data extraction'
            })
            continue

        # Clean pack size
        qty_off = off_p.get('quantity')
        qty_db = db_p.get('pack_size')
        weight_val, weight_unit, pack_size = parse_weight_and_unit(qty_off or qty_db)

        # Image resolution & verification
        img_url = off_p.get('image_front_url') or off_p.get('image_url') or db_p.get('image_url')
        image_status = 'missing'
        image_source_url = None
        img_res = None

        if img_url:
            if 'openfoodfacts' in img_url:
                image_source_url = f"https://world.openfoodfacts.org/product/{barcode}"
                expected_status = 'trusted_db'
            elif 'bbassets.com' in img_url:
                image_source_url = "https://www.bigbasket.com"
                expected_status = 'retailer_verified'
            else:
                image_source_url = img_url
                expected_status = 'unverified'

            img_res = verify_image_url(img_url)
            if img_res['is_valid']:
                image_status = expected_status
                verified_images.append({
                    'barcode': barcode,
                    'product_name': product_name,
                    'brand': display_brand,
                    'image_url': img_url,
                    'image_source_url': image_source_url,
                    'image_status': image_status,
                    'dimensions': f"{img_res['width']}x{img_res['height']}",
                    'size_bytes': img_res['size_bytes']
                })
            else:
                image_status = 'broken_url'
                missing_images.append({
                    'barcode': barcode,
                    'product_name': product_name,
                    'brand': display_brand,
                    'attempted_url': img_url,
                    'reason': img_res['reason']
                })
                img_url = None
        else:
            missing_images.append({
                'barcode': barcode,
                'product_name': product_name,
                'brand': display_brand,
                'attempted_url': None,
                'reason': 'No image candidate found'
            })

        # Barcode evidence
        barcode_source_url = f"https://world.openfoodfacts.org/product/{barcode}" if off_p else f"https://pfamoxreojbejufwhgiu.supabase.co/rest/v1/products?barcode=eq.{barcode}"
        barcode_evidence = f"OFF GTIN Record (Name: {name_off}, Brand: {off_p.get('brands')})" if off_p else f"Existing verified DB entry for {display_brand}"
        barcode_verification_status = 'verified' if off_p else 'single_source'

        verified_barcodes.append({
            'barcode': barcode,
            'product_name': product_name,
            'brand': display_brand,
            'pack_size': pack_size,
            'barcode_source_url': barcode_source_url,
            'barcode_evidence': barcode_evidence,
            'status': barcode_verification_status
        })

        # Import Decision
        is_in_db = barcode in db_by_barcode
        if not is_in_db:
            import_decision = 'import_as_new'
        else:
            existing_img = db_p.get('image_url')
            if not existing_img and img_url:
                import_decision = 'update_existing'
                review_changes.append({
                    'barcode': barcode,
                    'product_name': product_name,
                    'brand': display_brand,
                    'field_changed': 'image_url',
                    'old_value': 'NULL',
                    'new_value': img_url,
                    'reason': f'Added verified {image_status} packshot'
                })
            elif not db_p.get('pack_size') and pack_size:
                import_decision = 'update_existing'
                review_changes.append({
                    'barcode': barcode,
                    'product_name': product_name,
                    'brand': display_brand,
                    'field_changed': 'pack_size',
                    'old_value': 'NULL',
                    'new_value': pack_size,
                    'reason': 'Enriched pack size'
                })
            else:
                import_decision = 'already_current'

        staging_records.append({
            'product_name': product_name,
            'hindi_name': None,
            'marathi_name': None,
            'brand': display_brand,
            'manufacturer': manufacturer,
            'category': default_cat,
            'subcategory': default_subcat,
            'unit': 'PIECE',
            'pack_size': pack_size,
            'pack_type': 'single',
            'net_weight_value': weight_val,
            'net_weight_unit': weight_unit,
            'barcode': barcode,
            'barcode_raw': barcode,
            'image_url': img_url,
            'image_source_url': image_source_url,
            'image_verification_status': image_status,
            'image_checked_at': img_res['checked_at'] if img_res else None,
            'barcode_verification_status': barcode_verification_status,
            'barcode_source_url': barcode_source_url,
            'barcode_evidence': barcode_evidence,
            'manufacturer_source_url': manufacturer_url,
            'source_name': 'Open Food Facts API / Verified BigBasket CDN',
            'import_decision': import_decision,
            'data_batch_id': batch_id
        })

    elapsed = round(time.time() - start_time, 2)
    print(f"\n{display_brand} Complete in {elapsed}s:")
    print(f"  Verified Barcodes: {len(verified_barcodes)}")
    print(f"  Verified Images:   {len(verified_images)}")
    print(f"  Missing Images:    {len(missing_images)}")
    print(f"  Rejected:          {len(unverified_products)}")
    print(f"  New Products:      {sum(1 for s in staging_records if s['import_decision'] == 'import_as_new')}")
    print(f"  Review Changes:    {len(review_changes)}")

    # Save Checkpoint JSON
    checkpoint = {
        'brand': display_brand,
        'brand_key': brand_key,
        'manufacturer': manufacturer,
        'manufacturer_url': manufacturer_url,
        'data_batch_id': batch_id,
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'execution_seconds': elapsed,
        'counts': {
            'candidates': len(candidate_barcodes),
            'verified_barcodes': len(verified_barcodes),
            'verified_images': len(verified_images),
            'missing_images': len(missing_images),
            'unverified_products': len(unverified_products),
            'review_changes': len(review_changes),
            'new_products': sum(1 for s in staging_records if s['import_decision'] == 'import_as_new')
        },
        'sample_records': staging_records[:20],
        'rejected_records': unverified_products
    }
    with open(f"data/fmcg_catalogue/research/{brand_key}.json", 'w', encoding='utf-8') as f:
        json.dump(checkpoint, f, indent=2)

    # Save CSVs
    def write_csv(path, rows):
        if not rows:
            return
        with open(path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=rows[0].keys())
            writer.writeheader()
            for r in rows:
                row_copy = dict(r)
                if 'barcode' in row_copy and row_copy['barcode']:
                    row_copy['barcode'] = f"'{row_copy['barcode']}"
                writer.writerow(row_copy)

    write_csv(f"data/fmcg_catalogue/verified_barcodes_{brand_key}.csv", verified_barcodes)
    write_csv(f"data/fmcg_catalogue/verified_image_urls_{brand_key}.csv", verified_images)
    write_csv(f"data/fmcg_catalogue/missing_images_{brand_key}.csv", missing_images)
    write_csv(f"data/fmcg_catalogue/unverified_products_{brand_key}.csv", unverified_products)
    write_csv(f"data/fmcg_catalogue/review_changes_{brand_key}.csv", review_changes)

    # Save Staging SQL
    sql_path = f"supabase/62_phase62_staging_{brand_key}.sql"
    with open(sql_path, 'w', encoding='utf-8') as f:
        f.write(f"-- Phase 3: {display_brand} Staging Table Inserts\n")
        f.write(f"-- Batch ID: {batch_id}\n")
        f.write(f"-- Total Staging Rows: {len(staging_records)}\n\n")
        f.write(f"DELETE FROM public.catalogue_import_staging WHERE data_batch_id = '{batch_id}';\n\n")
        
        for r in staging_records:
            def sql_str(val):
                if val is None:
                    return "NULL"
                s = str(val).replace("'", "''")
                return f"'{s}'"
            def sql_num(val):
                return str(val) if val is not None else "NULL"

            line = f"""INSERT INTO public.catalogue_import_staging (
    product_name, brand, manufacturer, category, subcategory, unit, pack_size, pack_type,
    net_weight_value, net_weight_unit, barcode, barcode_raw, image_url, image_source_url,
    image_verification_status, barcode_verification_status, barcode_source_url, barcode_evidence,
    manufacturer_source_url, source_name, import_decision, data_batch_id
) VALUES (
    {sql_str(r['product_name'])}, {sql_str(r['brand'])}, {sql_str(r['manufacturer'])},
    {sql_str(r['category'])}, {sql_str(r['subcategory'])}, {sql_str(r['unit'])},
    {sql_str(r['pack_size'])}, {sql_str(r['pack_type'])}, {sql_num(r['net_weight_value'])},
    {sql_str(r['net_weight_unit'])}, {sql_str(r['barcode'])}, {sql_str(r['barcode_raw'])},
    {sql_str(r['image_url'])}, {sql_str(r['image_source_url'])}, {sql_str(r['image_verification_status'])},
    {sql_str(r['barcode_verification_status'])}, {sql_str(r['barcode_source_url'])},
    {sql_str(r['barcode_evidence'])}, {sql_str(r['manufacturer_source_url'])},
    {sql_str(r['source_name'])}, {sql_str(r['import_decision'])}, '{batch_id}'
);
"""
            f.write(line)

    print(f"  Saved checkpoint: data/fmcg_catalogue/research/{brand_key}.json")
    print(f"  Saved staging SQL: {sql_path}")
    return checkpoint
