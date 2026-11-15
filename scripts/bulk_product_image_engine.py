#!/usr/bin/env python3
"""
Bulk Product Image Database Integration Engine for Yogeshwari Dairy Shop ERP
Processes 46,000+ Barcode Records from Supabase and fetches verified external product images.

Usage:
    python scripts/bulk_product_image_engine.py --limit 100               # Phase 1 Test (100 products)
    python scripts/bulk_product_image_engine.py --limit 1000              # Phase 2 (1,000 products)
    python scripts/bulk_product_image_engine.py --all                     # Full processing
    python scripts/bulk_product_image_engine.py --dry-run                 # Simulation mode (no DB writes)
"""

import sys
import os
import json
import time
import argparse
import urllib.request
import urllib.error
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

SUPABASE_URL = 'https://pfamoxreojbejufwhgiu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmYW1veHJlb2piZWp1ZndoZ2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzNzc0MjEsImV4cCI6MjEwOTk1MzQyMX0.p97fdh4S8TxkVhQN5z14AApdFj6x5zsqPTQlLSXlD8E'

USER_AGENT = 'YogeshwariDairyERP/1.0 (contact: yogeshwaridairy9896@gmail.com; POS-Inventory-System)'
PROGRESS_FILE = os.path.abspath('data/image_fetching_progress.json')
os.makedirs(os.path.dirname(PROGRESS_FILE), exist_ok=True)

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {'processed_ids': {}, 'verified': 0, 'missing': 0, 'failed': 0, 'last_updated': None}

def save_progress(progress_data):
    progress_data['last_updated'] = datetime.now().isoformat()
    with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
        json.dump(progress_data, f, ensure_ascii=False, indent=2)

def validate_image_url(url, timeout=5):
    """Verifies that the image URL is accessible and returns Content-Type: image/*"""
    if not url or not isinstance(url, str) or not url.startswith(('http://', 'https://')):
        return False
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        # Use GET with byte limit or HEAD
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                ct = resp.headers.get('Content-Type', '').lower()
                return 'image/' in ct
    except Exception:
        pass
    return False

def fetch_image_for_barcode(barcode, timeout=5):
    """Attempts to match barcode in Open Food Facts and Open Products Facts"""
    b = str(barcode).strip()
    if not b or len(b) < 5:
        return None, 'invalid_barcode'

    candidates = [b]
    if b.startswith('0') and len(b) > 8:
        candidates.append(b.lstrip('0'))
    elif not b.startswith('0') and len(b) == 12:
        candidates.append('0' + b)

    # 1. Open Food Facts
    for cand in candidates:
        off_url = f'https://world.openfoodfacts.org/api/v2/product/{cand}.json?fields=code,product_name,image_front_url,image_url,image_front_small_url'
        try:
            req = urllib.request.Request(off_url, headers={'User-Agent': USER_AGENT})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read().decode())
                if data.get('status') == 1:
                    prod = data.get('product', {})
                    img = prod.get('image_front_url') or prod.get('image_url') or prod.get('image_front_small_url')
                    if img and validate_image_url(img, timeout=timeout):
                        return img, 'OpenFoodFacts'
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(1.5)  # Rate limit backoff
        except Exception:
            pass

    # 2. Open Products Facts (Fallback)
    for cand in candidates:
        opf_url = f'https://world.openproductsfacts.org/api/v2/product/{cand}.json?fields=code,product_name,image_front_url,image_url'
        try:
            req = urllib.request.Request(opf_url, headers={'User-Agent': USER_AGENT})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read().decode())
                if data.get('status') == 1:
                    prod = data.get('product', {})
                    img = prod.get('image_front_url') or prod.get('image_url')
                    if img and validate_image_url(img, timeout=timeout):
                        return img, 'OpenProductsFacts'
        except Exception:
            pass

    return None, 'missing'

def update_supabase_product_image(product_id, image_url, dry_run=False):
    """Updates products.image_url via Supabase REST API (zero stock alteration)"""
    if dry_run:
        return True

    patch_url = f'{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}'
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    body = json.dumps({'image_url': image_url}).encode('utf-8')
    req = urllib.request.Request(patch_url, data=body, headers=headers, method='PATCH')
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            return resp.status in (200, 204)
    except Exception as e:
        print(f"Failed to update product {product_id} in Supabase: {e}")
        return False

def get_supabase_products(offset=0, limit=1000):
    """Fetches batch of products from Supabase that have barcodes"""
    url = f'{SUPABASE_URL}/rest/v1/products?select=id,name,barcode,brand,category,image_url&barcode=not.is.null&barcode=neq.&order=id.asc&offset={offset}&limit={limit}'
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())

def run_engine(limit=None, batch_size=50, delay=0.1, workers=3, dry_run=False):
    print("=" * 80)
    print("🚀 YOGESHWARI DAIRY ERP - BULK PRODUCT IMAGE FETCHING ENGINE")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Target: {'ALL Products' if limit is None else f'First {limit} Products'}")
    print(f"Batch Size: {batch_size} | Concurrency: {workers} workers | Dry Run: {dry_run}")
    print("=" * 80)

    progress = load_progress()
    processed_dict = progress.get('processed_ids', {})
    print(f"Resuming with {len(processed_dict)} previously processed records.")

    total_target = limit if limit is not None else 44202
    current_offset = 0
    fetched_count = 0
    new_verified = 0
    new_missing = 0
    new_failed = 0

    while fetched_count < total_target:
        chunk_size = min(batch_size, total_target - fetched_count)
        try:
            products = get_supabase_products(offset=current_offset, limit=chunk_size)
            if not products:
                print("No more products returned from Supabase.")
                break
        except Exception as e:
            print(f"Error fetching products batch at offset {current_offset}: {e}")
            time.sleep(2)
            continue

        current_offset += len(products)

        # Filter out already verified or processed products
        to_process = []
        for p in products:
            p_id = p['id']
            # If already has verified image in DB, skip
            if p.get('image_url') and p['image_url'].startswith('http'):
                processed_dict[p_id] = {'status': 'verified', 'url': p['image_url']}
                continue
            if p_id in processed_dict and processed_dict[p_id].get('status') == 'verified':
                continue
            to_process.append(p)

        if not to_process:
            fetched_count += len(products)
            continue

        print(f"\nProcessing batch: {len(to_process)} items (Offset: {current_offset - len(products)})")

        with ThreadPoolExecutor(max_workers=workers) as executor:
            future_to_prod = {
                executor.submit(fetch_image_for_barcode, p['barcode']): p
                for p in to_process
            }

            for future in as_completed(future_to_prod):
                prod = future_to_prod[future]
                p_id = prod['id']
                p_barcode = prod['barcode']
                p_name = prod['name']
                fetched_count += 1

                try:
                    img_url, source = future.result()
                    if img_url:
                        new_verified += 1
                        update_supabase_product_image(p_id, img_url, dry_run=dry_run)
                        processed_dict[p_id] = {
                            'status': 'verified',
                            'barcode': p_barcode,
                            'url': img_url,
                            'source': source,
                            'timestamp': datetime.now().isoformat()
                        }
                        print(f"  [✓ FOUND] {p_barcode} | {p_name[:32]} -> {img_url}")
                    else:
                        new_missing += 1
                        processed_dict[p_id] = {
                            'status': 'missing',
                            'barcode': p_barcode,
                            'timestamp': datetime.now().isoformat()
                        }
                        print(f"  [✗ NONE ] {p_barcode} | {p_name[:32]}")
                except Exception as ex:
                    new_failed += 1
                    print(f"  [! ERR  ] {p_barcode} | Error: {ex}")

                if delay > 0:
                    time.sleep(delay)

        # Save progress after every batch
        progress['processed_ids'] = processed_dict
        progress['verified'] = sum(1 for v in processed_dict.values() if v.get('status') == 'verified')
        progress['missing'] = sum(1 for v in processed_dict.values() if v.get('status') == 'missing')
        save_progress(progress)

        print(f"--- Progress: {fetched_count}/{total_target} | Verified: {new_verified} | Missing: {new_missing} ---")

    print("\n" + "=" * 80)
    print("🎉 BATCH RUN COMPLETE!")
    print(f"Total Processed in this run: {fetched_count}")
    print(f"New Verified Images Found: {new_verified}")
    print(f"Total Missing in Sources: {new_missing}")
    print(f"Total Cumulative Verified in Database: {progress.get('verified', 0)}")
    print(f"Progress Saved To: {PROGRESS_FILE}")
    print("=" * 80)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Bulk Product Image Fetcher for Yogeshwari Dairy ERP")
    parser.add_argument('--limit', type=int, default=100, help="Maximum products to process (default: 100)")
    parser.add_argument('--all', action='store_true', help="Process all 44,000+ eligible products")
    parser.add_argument('--batch-size', type=int, default=30, help="Batch size for Supabase requests")
    parser.add_argument('--delay', type=float, default=0.15, help="Delay in seconds between requests")
    parser.add_argument('--workers', type=int, default=3, help="Concurrent worker threads")
    parser.add_argument('--dry-run', action='store_true', help="Simulate without writing to Supabase")
    args = parser.parse_args()

    max_limit = None if args.all else args.limit
    run_engine(limit=max_limit, batch_size=args.batch_size, delay=args.delay, workers=args.workers, dry_run=args.dry_run)
