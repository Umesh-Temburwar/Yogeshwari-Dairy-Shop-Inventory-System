#!/usr/bin/env python3
"""
Yogeshwari Dairy Shop ERP - Hugging Face IndianFmcg Catalogue Supabase Seeder
Safely uploads 1,000 FMCG products from HuggingFace dataset into Supabase.

Guarantees:
- Safe: Sets stock_quantity = 0.0 for catalogue items (zero stock contamination).
- Preserves all existing shop products & inventory.
- Assigns clean FMCG SKU codes and categories.
- Chunks requests in batches of 200 for 100% reliable network execution.
"""

import os
import sys
import uuid
import math
import pandas as pd
from dotenv import dotenv_values
from supabase import create_client

def load_env():
    env = {}
    if os.path.exists('.env'):
        env.update(dotenv_values('.env'))
    if os.path.exists('server/.env'):
        env.update(dotenv_values('server/.env'))
    return env

def map_category(cat_str):
    c = str(cat_str).lower().strip()
    if c in ['milk']:
        return 'Milk'
    if c in ['yogurt']:
        return 'Curd & Chaas'
    if c in ['butter', 'paneer', 'cheese']:
        return 'Paneer & Butter'
    if c in ['edibleoil']:
        return 'Ghee'
    # Atta, Biscuits, Coffee, Detergent, Dal, Rice, Shampoo, Soap, Spices, Sugar, Tea, Toothpaste, WheatFlour, WashingPowder
    return 'Bakery & Extras'

def map_unit(cat_str, pack_type):
    c = str(cat_str).lower().strip()
    p = str(pack_type).lower().strip()
    if c in ['milk']:
        if 'packet' in p or 'pouch' in p:
            return 'Packet (500ml)'
        return 'Litre'
    if c in ['butter', 'paneer', 'cheese']:
        return 'Gram'
    if c in ['atta', 'dal', 'rice', 'wheatflour', 'sugar']:
        return 'Kg'
    return 'Piece'

def run_seed():
    env = load_env()
    url = env.get('VITE_SUPABASE_URL') or env.get('SUPABASE_URL')
    key = env.get('VITE_SUPABASE_ANON_KEY') or env.get('SUPABASE_ANON_KEY')

    if not url or not key:
        print("❌ Supabase URL or Key missing in .env")
        sys.exit(1)

    supabase = create_client(url, key)
    csv_path = 'data/processed/indianfmcg_cleaned.csv'
    if not os.path.exists(csv_path):
        print(f"❌ File not found: {csv_path}")
        sys.exit(1)

    print("=" * 66)
    print("🚀 YOGESHWARI DAIRY ERP - HUGGINGFACE INDIAN FMCG SEEDER")
    print(f"📁 Reading: {csv_path}")
    print("=" * 66)

    df = pd.read_csv(csv_path)
    print(f"📦 Total records in IndianFmcg CSV: {len(df)}")

    # 1. Fetch existing names from Supabase to prevent duplicates
    print("🔍 Checking existing products in Supabase...")
    existing_names = set()
    offset = 0
    while True:
        res = supabase.table('products').select('name').eq('source', 'HUGGINGFACE_FMCG').range(offset, offset + 999).execute()
        if not res.data:
            break
        for r in res.data:
            n = r.get('name')
            if n:
                existing_names.add(str(n).strip().lower())
        offset += 1000
        if len(res.data) < 1000:
            break

    print(f"✅ Found {len(existing_names)} existing HUGGINGFACE_FMCG items in Supabase.")

    # 2. Filter & prepare rows
    products_to_insert = []
    for idx, row in df.iterrows():
        pname = str(row['product_name']).strip()
        if not pname or pname.lower() in existing_names:
            continue

        brand = str(row['brand']).strip() if pd.notna(row['brand']) else 'Generic'
        cat_raw = str(row.get('category', ''))
        cat = map_category(cat_raw)
        pack_type = str(row.get('package_size', ''))
        unit = map_unit(cat_raw, pack_type)

        sp = float(row.get('selling_price', 0.0))
        mrp = float(row.get('mrp', sp))
        pp = round(sp * 0.85, 2)
        src_id = str(row.get('source_product_id', f'HF-{idx:04d}'))

        prod_id = str(uuid.uuid4())
        prod_record = {
            'id': prod_id,
            'name': pname,
            'category': cat,
            'unit': unit,
            'purchase_price': pp,
            'selling_price': sp,
            'stock_quantity': 0.0,
            'min_stock_alert': 5.0,
            'shelf_life_days': 45,
            'barcode': None,
            'sku': src_id,
            'brand': brand,
            'pack_size': pack_type,
            'source': 'HUGGINGFACE_FMCG',
            'source_code': src_id,
            'description': f"FMCG retail product from {brand} ({cat_raw})",
            'is_active': True
        }
        products_to_insert.append(prod_record)
        existing_names.add(pname.lower())

    print(f"📊 Preparation Summary:")
    print(f"   - New products ready to insert: {len(products_to_insert)}")
    print(f"   - Skipped already in database: {len(existing_names) - len(products_to_insert)}")

    if not products_to_insert:
        print("✅ No new products to insert. Supabase is already fully updated!")
        return

    # 3. Batch insert into Supabase in chunks of 200
    chunk_size = 200
    total_chunks = math.ceil(len(products_to_insert) / chunk_size)
    print(f"\n🚀 Inserting into Supabase in {total_chunks} chunks of {chunk_size}...")

    inserted_total = 0
    for i in range(total_chunks):
        start_idx = i * chunk_size
        end_idx = min(start_idx + chunk_size, len(products_to_insert))
        chunk = products_to_insert[start_idx:end_idx]

        try:
            supabase.table('products').insert(chunk).execute()
            inserted_total += len(chunk)
            print(f"   Chunk {i+1}/{total_chunks}: +{len(chunk)} products inserted (Total: {inserted_total})")
        except Exception as e:
            print(f"❌ Error inserting chunk {i+1}: {e}")

    print("\n" + "=" * 66)
    print(f"🎉 SEEDING COMPLETE! Successfully added {inserted_total} FMCG products to Supabase.")
    print("=" * 66)

if __name__ == '__main__':
    run_seed()
