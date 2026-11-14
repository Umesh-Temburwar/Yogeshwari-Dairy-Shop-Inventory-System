#!/usr/bin/env python3
"""
Yogeshwari Dairy Shop & Inventory Management System
Product Normalization Script:
Reads all processed datasets and maps them to the common unified product structure.

Common Columns:
- id
- barcode
- product_name
- normalized_name
- brand
- category
- subcategory
- quantity_value
- quantity_unit
- package_size
- mrp
- selling_price
- image_url
- description
- ingredients
- source_name
- source_product_id
- source_url
- created_at
- updated_at
"""

import os
import sys
import re
import uuid
import datetime
import pandas as pd

def normalize_text_name(name):
    if not name or pd.isna(name):
        return ""
    # Lowercase, trim, remove excess punctuation, collapse whitespace
    s = str(name).lower()
    s = re.sub(r'[\(\)\[\],_\-\/]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def clean_str(val):
    if val is None or pd.isna(val):
        return None
    s = str(val).strip()
    if s.lower() in ['', 'none', 'nan', 'null', 'unknown']:
        return None
    return s

def normalize_all():
    print("--- Normalizing Processed Datasets ---")
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    all_normalized = []

    # 1. Open Food Facts
    off_path = "data/processed/openfoodfacts_cleaned.csv"
    if os.path.exists(off_path):
        off_df = pd.read_csv(off_path, dtype=str)
        print(f"Normalizing Open Food Facts: {len(off_df):,} records...")
        for _, r in off_df.iterrows():
            p_name = clean_str(r.get('product_name'))
            if not p_name:
                continue
            barcode = clean_str(r.get('barcode'))
            brand = clean_str(r.get('brand'))
            cat = clean_str(r.get('category')) or 'Groceries & FMCG'
            pkg = clean_str(r.get('package_size'))
            q_val = r.get('quantity_value')
            q_unit = clean_str(r.get('quantity_unit'))
            ing = clean_str(r.get('ingredients'))
            src_id = clean_str(r.get('source_product_id'))
            src_url = clean_str(r.get('source_url'))
            
            all_normalized.append({
                'id': str(uuid.uuid4()),
                'barcode': barcode,
                'product_name': p_name,
                'normalized_name': normalize_text_name(p_name),
                'brand': brand,
                'category': cat,
                'subcategory': None,
                'quantity_value': float(q_val) if q_val and not pd.isna(q_val) else None,
                'quantity_unit': q_unit,
                'package_size': pkg,
                'mrp': None,
                'selling_price': None,
                'image_url': None,
                'description': None,
                'ingredients': ing,
                'source_name': 'Open Food Facts India',
                'source_product_id': src_id,
                'source_url': src_url,
                'created_at': now_iso,
                'updated_at': now_iso
            })

    # 2. IndianFmcg
    fmcg_path = "data/processed/indianfmcg_cleaned.csv"
    if os.path.exists(fmcg_path):
        fmcg_df = pd.read_csv(fmcg_path, dtype=str)
        print(f"Normalizing IndianFmcg: {len(fmcg_df):,} records...")
        for _, r in fmcg_df.iterrows():
            p_name = clean_str(r.get('product_name'))
            brand = clean_str(r.get('brand'))
            cat = clean_str(r.get('category')) or 'Groceries & FMCG'
            subcat = clean_str(r.get('subcategory'))
            pkg = clean_str(r.get('package_size'))
            mrp = r.get('mrp')
            sp = r.get('selling_price')
            src_id = clean_str(r.get('source_product_id'))
            src_url = clean_str(r.get('source_url'))

            all_normalized.append({
                'id': str(uuid.uuid4()),
                'barcode': None,
                'product_name': p_name,
                'normalized_name': normalize_text_name(p_name),
                'brand': brand,
                'category': cat,
                'subcategory': subcat,
                'quantity_value': 1.0,
                'quantity_unit': 'pcs',
                'package_size': pkg,
                'mrp': float(mrp) if mrp and not pd.isna(mrp) else None,
                'selling_price': float(sp) if sp and not pd.isna(sp) else None,
                'image_url': None,
                'description': f"FMCG product distributed across Kirana & Modern Retail by {brand}",
                'ingredients': None,
                'source_name': 'HuggingFace:IndianFmcg',
                'source_product_id': src_id,
                'source_url': src_url,
                'created_at': now_iso,
                'updated_at': now_iso
            })

    # 3. QuickCommerce sample
    qc_path = "data/processed/quickcommerce_cleaned.csv"
    if os.path.exists(qc_path):
        qc_df = pd.read_csv(qc_path, dtype=str)
        for _, r in qc_df.iterrows():
            p_name = clean_str(r.get('product_name'))
            if not p_name:
                continue
            all_normalized.append({
                'id': str(uuid.uuid4()),
                'barcode': None,
                'product_name': p_name,
                'normalized_name': normalize_text_name(p_name),
                'brand': clean_str(r.get('brand')),
                'category': clean_str(r.get('category')) or 'Groceries',
                'subcategory': clean_str(r.get('subcategory')),
                'quantity_value': None,
                'quantity_unit': None,
                'package_size': None,
                'mrp': float(r.get('mrp')) if r.get('mrp') and not pd.isna(r.get('mrp')) else None,
                'selling_price': float(r.get('selling_price')) if r.get('selling_price') and not pd.isna(r.get('selling_price')) else None,
                'image_url': None,
                'description': None,
                'ingredients': None,
                'source_name': 'QuickCommerceData (Commercial Sample)',
                'source_product_id': 'QC-SAMPLE-01',
                'source_url': 'https://quickcommercedata.com',
                'created_at': now_iso,
                'updated_at': now_iso
            })

    # 4. Yogeshwari Dairy Master Catalogue (Shop's core products)
    shop_path = "data/clean_catalogue/YOGESHWARI_DAIRY_MASTER_CATALOGUE.csv"
    if os.path.exists(shop_path):
        shop_df = pd.read_csv(shop_path, dtype=str)
        print(f"Normalizing Yogeshwari Dairy Master Catalogue: {len(shop_df):,} core records...")
        for _, r in shop_df.iterrows():
            p_name = clean_str(r.get('name'))
            if not p_name:
                continue
            barcode = clean_str(r.get('barcode'))
            brand = clean_str(r.get('brand')) or 'Yogeshwari Dairy'
            cat = clean_str(r.get('category')) or 'Milk'
            unit = clean_str(r.get('unit')) or 'Piece'
            sp = r.get('selling_price')
            pp = r.get('purchase_price')
            
            all_normalized.append({
                'id': str(uuid.uuid4()),
                'barcode': barcode,
                'product_name': p_name,
                'normalized_name': normalize_text_name(p_name),
                'brand': brand,
                'category': f"Dairy: {cat}",
                'subcategory': cat,
                'quantity_value': 1.0,
                'quantity_unit': unit,
                'package_size': unit,
                'mrp': float(sp) if sp and not pd.isna(sp) else None,
                'selling_price': float(sp) if sp and not pd.isna(sp) else None,
                'image_url': None,
                'description': f"Yogeshwari Dairy store catalog item ({clean_str(r.get('marathi_name')) or ''})",
                'ingredients': None,
                'source_name': 'Yogeshwari Dairy Internal Master',
                'source_product_id': r.get('id', str(uuid.uuid4())),
                'source_url': 'internal://yogeshwari_dairy/master_catalogue',
                'created_at': now_iso,
                'updated_at': now_iso
            })

    norm_df = pd.DataFrame(all_normalized)
    os.makedirs('data/processed', exist_ok=True)
    out_file = "data/processed/all_normalized_products.csv"
    norm_df.to_csv(out_file, index=False)
    print(f"✅ Total normalized products: {len(norm_df):,} records saved to {out_file}")

if __name__ == '__main__':
    normalize_all()
