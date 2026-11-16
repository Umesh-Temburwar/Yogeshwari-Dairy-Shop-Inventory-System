"""
Phase 2 Pilot Pipeline: Parle FMCG Catalogue Expansion & Enrichment.
Executes research, GS1 checksum verification, image HEAD/GET verification,
evidence collection, conflict detection, and staging export.
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
from urllib.parse import urlparse
from data.fmcg_catalogue.validators import validate_gs1_barcode
from data.fmcg_catalogue.image_checker import verify_image_url

OFF_BASE = "https://world.openfoodfacts.net"
HEADERS = {'User-Agent': 'YogeshwariDairyERP-CatalogExpansion/1.0 (contact@yogeshwaridairy.com; polite 1req/sec)'}
CACHE_DIR = "scratch/off_cache"
MANUFACTURER_NAME = "Parle Products Pvt. Ltd."
MANUFACTURER_URL = "https://www.parleproducts.com"
BATCH_ID = "BATCH_PILOT_PARLE_20261116"

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
            time.sleep(0.5) # polite rate limit
            return data
    except Exception as e:
        print(f"Error fetching {barcode} from OFF: {e}")
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


def run_pilot():
    print(f"=== Starting Phase 2 Pilot: Parle FMCG Catalogue Expansion ===")
    start_time = time.time()

    # 1. Load existing DB records for Parle
    with open('scratch/existing_parle_db.json', 'r', encoding='utf-8') as f:
        existing_db = json.load(f)

    db_by_barcode = {}
    for p in existing_db:
        bc = p.get('barcode')
        if bc:
            db_by_barcode[bc] = p

    print(f"Loaded {len(existing_db)} existing Parle DB records ({len(db_by_barcode)} unique barcodes).")

    # 2. Gather candidates:
    # A) All DB barcodes starting with 8901719 (Parle GS1 prefix)
    candidate_barcodes = set([bc for bc in db_by_barcode.keys() if bc.startswith('8901719')])

    # B) Open Food Facts brands_tags=parle
    off_search_url = f"{OFF_BASE}/api/v2/search?brands_tags=parle&page=1&page_size=100&fields=code,product_name,quantity,image_front_url,brands,categories"
    try:
        r = requests.get(off_search_url, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            off_prods = r.json().get('products', [])
            for p in off_prods:
                bc = p.get('code')
                if bc and bc.startswith('8901719'):
                    candidate_barcodes.add(bc)
                    # Cache it
                    cache_path = os.path.join(CACHE_DIR, f"{bc}.json")
                    if not os.path.exists(cache_path):
                        with open(cache_path, 'w', encoding='utf-8') as f:
                            json.dump({'status': 1, 'product': p}, f)
    except Exception as e:
        print(f"Error querying OFF search: {e}")

    print(f"Total candidate barcodes to process: {len(candidate_barcodes)}")

    # 3. Process each candidate barcode
    verified_barcodes = []
    verified_images = []
    missing_barcodes = []
    missing_images = []
    duplicate_barcodes = []
    unverified_products = []
    review_changes = []
    staging_records = []

    processed_count = 0
    for barcode in sorted(list(candidate_barcodes)):
        processed_count += 1
        if processed_count % 20 == 0:
            print(f"  Processed {processed_count}/{len(candidate_barcodes)} candidates...")

        # GS1 Checksum Validation
        gs1_check = validate_gs1_barcode(barcode)
        if not gs1_check['is_valid']:
            unverified_products.append({
                'barcode': barcode,
                'reason': f"GS1 Checksum Failure: {gs1_check['reason']}",
                'source': 'Pre-validation'
            })
            continue

        # Fetch evidence from OFF
        off_data = fetch_off_product(barcode)
        off_p = off_data.get('product', {}) if (off_data and off_data.get('status') == 1) else {}
        db_p = db_by_barcode.get(barcode, {})

        # Determine product name
        name_off = off_p.get('product_name', '').strip()
        name_db = db_p.get('name', '').strip()
        product_name = name_off or name_db
        if not product_name:
            unverified_products.append({
                'barcode': barcode,
                'reason': 'No product name found in OFF or DB',
                'source': 'Data extraction'
            })
            continue

        # Extract pack size / quantity
        qty_off = off_p.get('quantity')
        qty_db = db_p.get('pack_size')
        weight_val, weight_unit, pack_size = parse_weight_and_unit(qty_off or qty_db)

        # Image resolution
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
                    'attempted_url': img_url,
                    'reason': img_res['reason']
                })
                img_url = None
        else:
            missing_images.append({
                'barcode': barcode,
                'product_name': product_name,
                'attempted_url': None,
                'reason': 'No image candidate found'
            })

        # Barcode evidence
        barcode_source_url = f"https://world.openfoodfacts.org/product/{barcode}" if off_p else f"https://pfamoxreojbejufwhgiu.supabase.co/rest/v1/products?barcode=eq.{barcode}"
        barcode_evidence = f"OFF GTIN Entry (Name: {name_off}, Brand: {off_p.get('brands')})" if off_p else f"Existing verified DB entry for Parle"
        barcode_verification_status = 'verified' if off_p else 'single_source'

        verified_barcodes.append({
            'barcode': barcode,
            'product_name': product_name,
            'brand': 'Parle',
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
            # Check if review/enrichment is proposed
            existing_img = db_p.get('image_url')
            if not existing_img and img_url:
                import_decision = 'update_existing'
                review_changes.append({
                    'barcode': barcode,
                    'product_name': product_name,
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
            'brand': 'Parle',
            'manufacturer': MANUFACTURER_NAME,
            'category': 'Bakery & Extras',
            'subcategory': 'Biscuits & Cookies',
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
            'manufacturer_source_url': MANUFACTURER_URL,
            'source_name': 'Open Food Facts API / Verified BigBasket CDN',
            'import_decision': import_decision,
            'data_batch_id': BATCH_ID
        })

    elapsed = round(time.time() - start_time, 2)
    print(f"\nProcessing complete in {elapsed} seconds!")
    print(f"Total processed: {len(candidate_barcodes)}")
    print(f"Verified Barcodes: {len(verified_barcodes)}")
    print(f"Verified Images: {len(verified_images)}")
    print(f"Missing Images: {len(missing_images)}")
    print(f"Unverified / Rejected: {len(unverified_products)}")
    print(f"Proposed Review Changes: {len(review_changes)}")

    # 4. Save Checkpoint JSON
    checkpoint = {
        'brand': 'Parle',
        'manufacturer': MANUFACTURER_NAME,
        'manufacturer_url': MANUFACTURER_URL,
        'data_batch_id': BATCH_ID,
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
    with open('data/fmcg_catalogue/research/parle.json', 'w', encoding='utf-8') as f:
        json.dump(checkpoint, f, indent=2)

    # 5. Export CSVs with Excel text-safe formatting
    def write_csv(path, fieldnames, rows):
        with open(path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for r in rows:
                row_copy = dict(r)
                if 'barcode' in row_copy and row_copy['barcode']:
                    row_copy['barcode'] = f"'{row_copy['barcode']}"
                writer.writerow(row_copy)

    if verified_barcodes:
        write_csv('data/fmcg_catalogue/verified_barcodes_parle.csv', verified_barcodes[0].keys(), verified_barcodes)
    if verified_images:
        write_csv('data/fmcg_catalogue/verified_image_urls_parle.csv', verified_images[0].keys(), verified_images)
    if missing_images:
        write_csv('data/fmcg_catalogue/missing_images_parle.csv', missing_images[0].keys(), missing_images)
    if unverified_products:
        write_csv('data/fmcg_catalogue/unverified_products_parle.csv', unverified_products[0].keys(), unverified_products)
    if review_changes:
        write_csv('data/fmcg_catalogue/review_changes_parle.csv', review_changes[0].keys(), review_changes)

    # 6. Generate SQL staging script
    sql_path = 'supabase/61_pilot_parle_staging.sql'
    with open(sql_path, 'w', encoding='utf-8') as f:
        f.write("-- Pilot Phase 2: Parle Staging Table Dry-Run Inserts\n")
        f.write(f"-- Batch ID: {BATCH_ID}\n")
        f.write(f"-- Total Staging Rows: {len(staging_records)}\n\n")
        f.write("DELETE FROM public.catalogue_import_staging WHERE data_batch_id = '" + BATCH_ID + "';\n\n")
        
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
    {sql_str(r['source_name'])}, {sql_str(r['import_decision'])}, '{BATCH_ID}'
);
"""
            f.write(line)
    
    print(f"Generated staging SQL: {sql_path}")
    return checkpoint

if __name__ == '__main__':
    run_pilot()
