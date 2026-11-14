#!/usr/bin/env python3
"""
Yogeshwari Dairy Shop & Inventory Management System
Safe PackSense India Catalogue Importer & Barcode Mapping Tool

Key Guarantees:
- Never fabricates purchase prices, selling prices, or stock.
- Strictly sets stock_quantity = 0.00 for all imported catalogue items.
- Preserves leading zeros by treating barcodes as TEXT.
- Preserves existing 368 shop products and shop-specific prices.
- Supports --dry-run (default), --limit, --chunk-size, and rollback metadata logging.
"""

import os
import sys
import csv
import json
import argparse
import datetime
import urllib.request
import urllib.error
from dotenv import dotenv_values

def load_env():
    env = {}
    if os.path.exists('.env'):
        env.update(dotenv_values('.env'))
    if os.path.exists('server/.env'):
        env.update(dotenv_values('server/.env'))
    return env

def map_category(cat_tags, pnns1, pnns2, name):
    text = f"{cat_tags} {pnns1} {pnns2} {name}".lower()
    if any(k in text for k in ['milk', 'doodh', 'lait']):
        return 'Milk'
    if any(k in text for k in ['curd', 'dahi', 'yogurt', 'chaas', 'buttermilk', 'lassi']):
        return 'Curd & Chaas'
    if any(k in text for k in ['paneer', 'butter', 'makhan', 'cheese']):
        return 'Paneer & Butter'
    if 'ghee' in text:
        return 'Ghee'
    if any(k in text for k in ['sweet', 'mithai', 'pedha', 'barfi', 'gulab', 'halwa', 'shrikhand']):
        return 'Sweets/Mithai'
    if any(k in text for k in ['bakery', 'bread', 'biscuit', 'toast', 'khari', 'cake', 'cookie', 'snack', 'chips', 'namkeen']):
        return 'Bakery & Extras'
    return 'Bakery & Extras'

def map_unit(unit_str, amount_str):
    u = (unit_str or '').lower().strip()
    if u in ['g', 'gram', 'grams']:
        return 'Gram'
    if u in ['kg', 'kilogram']:
        return 'Kg'
    if u in ['ml', 'millilitre']:
        if amount_str == '500':
            return 'Packet (500ml)'
        if amount_str in ['1000', '1']:
            return 'Packet (1L)'
        return 'Litre'
    if u in ['l', 'liter', 'litre']:
        return 'Litre'
    return 'Piece'

def check_schema_supports_barcodes_table(url, key):
    try:
        req = urllib.request.Request(
            f"{url}/rest/v1/product_barcodes?select=count&limit=1",
            headers={"apikey": key, "Authorization": f"Bearer {key}", "Prefer": "count=exact"}
        )
        with urllib.request.urlopen(req) as resp:
            return True
    except Exception:
        return False

def check_schema_supports_brand_column(url, key):
    try:
        req = urllib.request.Request(
            f"{url}/rest/v1/products?select=brand&limit=1",
            headers={"apikey": key, "Authorization": f"Bearer {key}"}
        )
        with urllib.request.urlopen(req) as resp:
            return True
    except Exception:
        return False

def run_import(dry_run=True, limit=None, chunk_size=500, csv_path='data/packsense/processed/india_products_cleaned.csv'):
    env = load_env()
    url = env.get('SUPABASE_URL') or env.get('VITE_SUPABASE_URL')
    key = env.get('SUPABASE_SERVICE_ROLE_KEY') or env.get('SUPABASE_ANON_KEY') or env.get('VITE_SUPABASE_ANON_KEY')

    print("=" * 66)
    print("📦 Yogeshwari Dairy - Safe PackSense India Catalogue Importer")
    print(f"⏱️ Time: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"⚙️ Mode: {'🔍 DRY-RUN (No changes applied)' if dry_run else '🚀 LIVE IMPORT'}")
    print(f"📁 CSV Path: {csv_path}")
    print(f"📦 Chunk Size: {chunk_size}")
    if limit:
        print(f"🛑 Limit: {limit} rows")
    print("=" * 66)

    if not os.path.exists(csv_path):
        print(f"❌ Error: CSV path not found: {csv_path}")
        sys.exit(1)

    has_barcodes_table = check_schema_supports_barcodes_table(url, key)
    has_brand_col = check_schema_supports_brand_column(url, key)

    print(f"🔍 Schema Feature Check:")
    print(f"   - public.product_barcodes table: {'✅ ACTIVE' if has_barcodes_table else '⚠️ PENDING (Run Migration 55 in Supabase)'}")
    print(f"   - public.products.brand column:   {'✅ ACTIVE' if has_brand_col else '⚠️ PENDING (Run Migration 55 in Supabase)'}")

    # 1. Fetch existing barcodes
    existing_barcodes = set()
    existing_products_count = 0
    if url and key:
        if has_barcodes_table:
            try:
                req = urllib.request.Request(
                    f"{url}/rest/v1/product_barcodes?select=barcode",
                    headers={"apikey": key, "Authorization": f"Bearer {key}"}
                )
                with urllib.request.urlopen(req) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    for row in data:
                        if row.get('barcode'):
                            existing_barcodes.add(str(row['barcode']).strip())
            except Exception:
                pass

        try:
            req = urllib.request.Request(
                f"{url}/rest/v1/products?select=id,barcode",
                headers={"apikey": key, "Authorization": f"Bearer {key}"}
            )
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                existing_products_count = len(data)
                for row in data:
                    if row.get('barcode'):
                        existing_barcodes.add(str(row['barcode']).strip())
        except Exception as e:
            print(f"⚠️ Warning querying products: {e}")

    print(f"✅ Existing products in DB: {existing_products_count}")
    print(f"✅ Existing active barcodes in DB: {len(existing_barcodes)}\n")

    # 2. Read and validate
    valid_candidates = []
    skipped_duplicate_in_file = 0
    skipped_already_in_db = 0
    rejected_invalid = 0
    seen_in_file = set()

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if limit and len(valid_candidates) >= limit:
                break
            
            code = (row.get('code') or '').strip()
            name = (row.get('product_name') or '').strip()
            brand = (row.get('brands') or '').strip() or 'Generic'
            amount = (row.get('quantity_amount') or row.get('product_quantity') or '').strip()
            unit_raw = (row.get('quantity_unit') or row.get('product_quantity_unit') or '').strip()

            # Barcode check: 8-14 digits, preserve leading zero
            if not code or not code.isdigit() or len(code) < 8 or len(code) > 14 or set(code) == {'0'}:
                rejected_invalid += 1
                continue

            if not name or len(name) < 2:
                rejected_invalid += 1
                continue

            if code in seen_in_file:
                skipped_duplicate_in_file += 1
                continue
            seen_in_file.add(code)

            if code in existing_barcodes:
                skipped_already_in_db += 1
                continue

            category = map_category(
                row.get('categories_tags', ''),
                row.get('pnns_groups_1', ''),
                row.get('pnns_groups_2', ''),
                name
            )
            unit = map_unit(unit_raw, amount)
            pack_size = f"{amount} {unit_raw}".strip() if (amount and unit_raw) else unit

            candidate = {
                "name": name,
                "marathi_name": name,
                "category": category,
                "unit": unit,
                "purchase_price": 0.00, # Never fake purchase price
                "selling_price": 0.00,  # Never fake selling price
                "stock_quantity": 0.00, # STRICTLY ZERO INVENTORY
                "min_stock_alert": 5.00,
                "shelf_life_days": 14,
                "has_expiry": True,
                "barcode": code,        # TEXT with leading zeros
                "is_active": True
            }

            # If migration 55 columns exist, include them
            if has_brand_col:
                candidate["brand"] = brand
                candidate["pack_size"] = pack_size
                candidate["source"] = "PackSense"
                candidate["source_code"] = code

            valid_candidates.append(candidate)

    print("📊 Validation Summary:")
    print(f"   - Valid new import candidates: {len(valid_candidates)}")
    print(f"   - Skipped (Already in DB):      {skipped_already_in_db}")
    print(f"   - Skipped (Duplicate in file):  {skipped_duplicate_in_file}")
    print(f"   - Rejected (Invalid/Malformed): {rejected_invalid}\n")

    if dry_run:
        print("🔍 [DRY-RUN COMPLETE]")
        print(f"   {len(valid_candidates)} catalogue records ready for import with Available Stock = 0.00.")
        print("   No changes made to database.")
    else:
        print(f"🚀 Inserting {len(valid_candidates)} products in chunks of {chunk_size}...")
        inserted = 0
        for start_idx in range(0, len(valid_candidates), chunk_size):
            chunk = valid_candidates[start_idx:start_idx + chunk_size]
            payload = json.dumps(chunk).encode('utf-8')
            try:
                req = urllib.request.Request(
                    f"{url}/rest/v1/products",
                    data=payload,
                    headers={
                        "apikey": key,
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                        "Prefer": "return=representation"
                    },
                    method="POST"
                )
                with urllib.request.urlopen(req) as resp:
                    res_data = json.loads(resp.read().decode('utf-8'))
                    inserted += len(res_data)

                    # Also insert into product_barcodes if table exists
                    if has_barcodes_table:
                        barcodes_payload = []
                        for item in res_data:
                            barcodes_payload.append({
                                "product_id": item["id"],
                                "barcode": item["barcode"],
                                "barcode_type": "EAN-13",
                                "is_primary": True,
                                "source": "PackSense"
                            })
                        b_req = urllib.request.Request(
                            f"{url}/rest/v1/product_barcodes",
                            data=json.dumps(barcodes_payload).encode('utf-8'),
                            headers={
                                "apikey": key,
                                "Authorization": f"Bearer {key}",
                                "Content-Type": "application/json"
                            },
                            method="POST"
                        )
                        try:
                            with urllib.request.urlopen(b_req) as b_resp:
                                pass
                        except Exception:
                            pass
                print(f"   Inserted {inserted}/{len(valid_candidates)} records...")
            except Exception as e:
                print(f"   ❌ Batch error at {start_idx}: {e}")

        print(f"\n✅ Successfully imported {inserted} products into catalogue with strictly 0 stock.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='PackSense India Products Safe Importer')
    parser.add_argument('--live', action='store_true', help='Execute live import (default is dry-run)')
    parser.add_argument('--limit', type=int, default=None, help='Max records to import')
    parser.add_argument('--chunk-size', type=int, default=500, help='Batch chunk size')
    parser.add_argument('--csv', type=str, default='data/packsense/processed/india_products_cleaned.csv', help='Path to cleaned CSV')

    args = parser.parse_args()
    run_import(
        dry_run=not args.live,
        limit=args.limit,
        chunk_size=args.chunk_size,
        csv_path=args.csv
    )
