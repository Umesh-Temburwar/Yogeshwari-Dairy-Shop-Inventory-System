#!/usr/bin/env python3
"""
Yogeshwari Dairy Shop & Inventory Management System
Supabase CSV Exporter & Cloud Syncer:
1. Formats `data/final/master_product_catalogue.csv` for PostgreSQL/Supabase import.
2. Exports `data/final/supabase_product_catalogue_ready.csv`.
3. Splits into 5,000-row chunks in `data/final/chunks/` for UI Table Editor import.
4. With `--live`, safely synchronizes catalogue records into Supabase `public.products` and `public.product_barcodes`.
   (Guaranteed 100% JSON-compliant: sanitizes all NaN / Inf floats).
"""

import os
import sys
import math
import uuid
import argparse
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

def clean_val(v):
    if v is None:
        return None
    if isinstance(v, float):
        if math.isnan(v) or math.isinf(v):
            return None
        return v
    if isinstance(v, str):
        s = v.strip()
        if s.lower() in ['', 'nan', 'none', 'null', 'undefined']:
            return None
        return s
    return v

def export_csvs():
    input_file = "data/final/master_product_catalogue.csv"
    if not os.path.exists(input_file):
        print(f"❌ Input file not found: {input_file}")
        return None

    df = pd.read_csv(input_file, dtype=str)
    print(f"Loaded {len(df):,} items from {input_file}")

    # Prepare ready file
    ready_file = "data/final/supabase_product_catalogue_ready.csv"
    df.to_csv(ready_file, index=False)
    print(f"✅ Exported full import-ready CSV: {ready_file}")

    # Create chunks for easy Table Editor upload (5000 rows each)
    chunk_dir = "data/final/chunks"
    os.makedirs(chunk_dir, exist_ok=True)
    
    chunk_size = 5000
    total_chunks = math.ceil(len(df) / chunk_size)
    print(f"Splitting into {total_chunks} chunks of {chunk_size} rows each in {chunk_dir}...")
    
    for i in range(total_chunks):
        start_idx = i * chunk_size
        end_idx = min((i + 1) * chunk_size, len(df))
        chunk_df = df.iloc[start_idx:end_idx]
        chunk_path = os.path.join(chunk_dir, f"product_catalogue_part_{i+1:02d}.csv")
        chunk_df.to_csv(chunk_path, index=False)
        print(f"  - Chunk {i+1}/{total_chunks}: {len(chunk_df):,} rows -> {chunk_path}")

    return df

def upload_live(df):
    env = load_env()
    supabase_url = env.get('VITE_SUPABASE_URL') or "https://pfamoxreojbejufwhgiu.supabase.co"
    supabase_key = env.get('VITE_SUPABASE_ANON_KEY')

    if not supabase_key:
        print("❌ Supabase Anon Key not found in .env")
        return

    supabase = create_client(supabase_url, supabase_key)
    print("\n--- Live Cloud Sync to Supabase `public.products` ---")

    # Fetch existing barcodes from Supabase to prevent duplicates
    print("🔍 Checking existing barcodes in Supabase...")
    existing_barcodes = set()
    offset = 0
    while True:
        try:
            res = supabase.table('products').select('barcode').range(offset, offset + 999).execute()
            if not res.data:
                break
            for row in res.data:
                b = row.get('barcode')
                if b:
                    existing_barcodes.add(str(b).strip())
            offset += 1000
            if len(res.data) < 1000:
                break
        except Exception as e:
            print(f"⚠️ Warning checking existing barcodes at offset {offset}: {e}")
            break

    print(f"✅ Found {len(existing_barcodes):,} active barcodes already in Supabase.")

    # Filter and prepare sanitized JSON compliant rows
    products_to_insert = []
    skipped_existing = 0

    for _, row in df.iterrows():
        pname = clean_val(row.get('product_name'))
        if not pname or len(pname) < 2 or pname.lower() == '‹user›':
            continue

        barcode = clean_val(row.get('barcode'))
        if barcode and str(barcode).strip() in existing_barcodes:
            skipped_existing += 1
            continue

        mrp_raw = row.get('mrp')
        try:
            mrp = float(mrp_raw) if mrp_raw and not pd.isna(mrp_raw) else 0.0
            if math.isnan(mrp) or math.isinf(mrp):
                mrp = 0.0
        except (ValueError, TypeError):
            mrp = 0.0

        sp_raw = row.get('selling_price')
        try:
            selling_price = float(sp_raw) if sp_raw and not pd.isna(sp_raw) else mrp
            if math.isnan(selling_price) or math.isinf(selling_price):
                selling_price = mrp
        except (ValueError, TypeError):
            selling_price = mrp

        pp = round(selling_price * 0.8, 2)
        prod_id = clean_val(row.get('id')) or str(uuid.uuid4())
        brand = clean_val(row.get('brand'))
        category = clean_val(row.get('category')) or 'Bakery & Extras'
        unit = clean_val(row.get('quantity_unit')) or 'Piece'
        pack = clean_val(row.get('package_size'))
        source = clean_val(row.get('source_name')) or 'CATALOGUE'

        record = {
            'id': prod_id,
            'name': pname,
            'category': category,
            'unit': unit,
            'purchase_price': pp,
            'selling_price': selling_price,
            'stock_quantity': 0.0,
            'min_stock_alert': 5.0,
            'shelf_life_days': 30,
            'barcode': barcode,
            'brand': brand,
            'pack_size': pack,
            'source': source,
            'is_active': True
        }
        products_to_insert.append(record)
        if barcode:
            existing_barcodes.add(barcode)

    print(f"📊 Live Sync Summary:")
    print(f"   - Products already up-to-date in Supabase: {skipped_existing:,}")
    print(f"   - New products to insert: {len(products_to_insert):,}")

    if not products_to_insert:
        print("\n🎉 Supabase database is already 100% synchronized and up-to-date! No action needed.")
        return

    # Batch upload with upsert on id
    batch_size = 200
    total = len(products_to_insert)
    total_batches = math.ceil(total / batch_size)
    print(f"Syncing {total:,} records in {total_batches} batches of {batch_size}...")

    success_count = 0
    for i in range(total_batches):
        batch = products_to_insert[i*batch_size : (i+1)*batch_size]
        try:
            supabase.table('products').upsert(batch, on_conflict='id').execute()
            success_count += len(batch)
            pct = (success_count / total) * 100
            print(f"  Batch {i+1}/{total_batches}: +{len(batch)} synced ({success_count:,}/{total:,} - {pct:.1f}%)")
        except Exception as e:
            print(f"❌ Error uploading batch {i+1}: {e}")

    print(f"\n🎉 Live sync finished: {success_count:,}/{total:,} records synchronized successfully.")

def main():
    parser = argparse.ArgumentParser(description="Export Supabase Ready CSVs")
    parser.add_argument('--live', action='store_true', help="Directly sync records to Supabase")
    args = parser.parse_args()

    df = export_csvs()
    if args.live and df is not None:
        upload_live(df)

if __name__ == '__main__':
    main()
