#!/usr/bin/env python3
"""
Yogeshwari Dairy Shop & Inventory Management System
Dataset Inspector Script: Inspects raw datasets, row counts, columns, data types, nulls.
Outputs findings to console and assists in data quality analysis.
"""

import os
import sys
import pandas as pd
import json

def inspect_file(filepath, name):
    print(f"\n{'='*70}")
    print(f"INSPECTING: {name} ({filepath})")
    print(f"{'='*70}")
    
    if not os.path.exists(filepath):
        print(f"❌ File does not exist: {filepath}")
        return None
    
    file_size_mb = os.path.getsize(filepath) / (1024 * 1024)
    print(f"File Size: {file_size_mb:.2f} MB")
    
    try:
        # Read a sample to see columns
        sample_df = pd.read_csv(filepath, nrows=5, dtype=str)
        cols = list(sample_df.columns)
        print(f"Columns ({len(cols)}): {cols}")
        
        # Read full file or chunk
        total_rows = 0
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            total_rows = sum(1 for _ in f) - 1 # minus header
        print(f"Total Rows: {total_rows:,}")
        
        if total_rows > 0:
            df = pd.read_csv(filepath, nrows=10000, dtype=str)
            print("\nMissing values in top 10,000 rows:")
            null_counts = df.isnull().sum()
            for col, nulls in null_counts.items():
                if nulls > 0:
                    pct = (nulls / len(df)) * 100
                    print(f"  - {col}: {nulls:,} missing ({pct:.1f}%)")
                    
            print("\nSample Preview:")
            print(df.head(2).to_dict(orient='records'))
    except Exception as e:
        print(f"⚠️ Inspection error: {e}")

def main():
    os.makedirs('data/reports', exist_ok=True)
    inspect_file('data/raw/openmrp_raw.csv', 'Source 1: OpenMRP')
    inspect_file('data/raw/quickcommerce_raw.csv', 'Source 2: QuickCommerceData')
    inspect_file('data/raw/openfoodfacts_raw.csv', 'Source 3: Open Food Facts India')
    inspect_file('data/raw/indianfmcg_raw.csv', 'Source 4: IndianFmcg Dataset')

if __name__ == '__main__':
    main()
