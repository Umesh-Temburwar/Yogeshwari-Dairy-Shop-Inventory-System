#!/usr/bin/env python3
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

    print(f"\n🔍 Search Results for: '{query}' ({len(res)} found)\n" + "="*80)
    if len(res) == 0:
        print("No products found matching query.")
        return

    display_cols = ['barcode', 'product_name', 'brand', 'category', 'pack_size', 'selling_price', 'mrp']
    actual_cols = [c for c in display_cols if c in res.columns]
    
    # Show first 25 matches
    preview = res[actual_cols].head(25)
    print(preview.to_string(index=False))
    if len(res) > 25:
        print(f"\n... and {len(res) - 25} more items. (Showing first 25)")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python search_barcode.py <barcode_or_product_name>")
        sys.exit(1)
    query = ' '.join(sys.argv[1:])
    search(query)
