#!/usr/bin/env python3
"""
Yogeshwari Dairy Shop & Inventory Management System
Supabase CSV Exporter & Optional Cloud Uploader:
1. Formats `data/final/master_product_catalogue.csv` for PostgreSQL import.
2. Exports `data/final/supabase_product_catalogue_ready.csv`.
3. Splits into 5,000-row chunks in `data/final/chunks/` for easy UI Table Editor upload.
4. With `--live`, directly uploads records into Supabase `public.product_catalogue` in batches.
"""

import os
import sys
import math
import argparse
import pandas as pd
import requests

SUPABASE_URL = "https://pfamoxreojbejufwhgiu.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmYW1veHJlb2piZWp1ZndoZ2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzNzc0MjEsImV4cCI6MjEwOTk1MzQyMX0.p97fdh4S8TxkVhQN5z14AApdFj6x5zsqPTQlLSXlD8E"

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
    print("\n--- Live Upload to Supabase `product_catalogue` ---")
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    endpoint = f"{SUPABASE_URL}/rest/v1/product_catalogue"

    records = df.where(pd.notnull(df), None).to_dict(orient='records')
    batch_size = 200
    total = len(records)
    print(f"Uploading {total:,} records in batches of {batch_size}...")

    success_count = 0
    for i in range(0, total, batch_size):
        batch = records[i:i+batch_size]
        try:
            resp = requests.post(endpoint, headers=headers, json=batch, timeout=30)
            if resp.status_code in [200, 201]:
                success_count += len(batch)
                print(f"  Progress: {success_count:,}/{total:,} ({(success_count/total)*100:.1f}%) uploaded successfully.")
            else:
                print(f"⚠️ Batch {i//batch_size + 1} failed: HTTP {resp.status_code} - {resp.text[:150]}")
        except Exception as e:
            print(f"❌ Error uploading batch {i//batch_size + 1}: {e}")

    print(f"✅ Live upload finished: {success_count:,}/{total:,} records synced.")

def main():
    parser = argparse.ArgumentParser(description="Export Supabase Ready CSVs")
    parser.add_argument('--live', action='store_true', help="Directly upload records to Supabase REST endpoint")
    args = parser.parse_args()

    df = export_csvs()
    if args.live and df is not None:
        upload_live(df)

if __name__ == '__main__':
    main()
