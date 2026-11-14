#!/usr/bin/env python3
"""
Yogeshwari Dairy Shop & Inventory Management System
Clean Datasets Script:
Processes raw datasets into clean intermediate representations in data/processed/.

Outputs:
- data/processed/openmrp_cleaned.csv
- data/processed/quickcommerce_cleaned.csv
- data/processed/openfoodfacts_cleaned.csv
- data/processed/indianfmcg_cleaned.csv
"""

import os
import sys
import re
import pandas as pd
import numpy as np

os.makedirs('data/processed', exist_ok=True)

def standardize_unit(u):
    if not u or pd.isna(u):
        return None
    u = str(u).strip().lower()
    if u in ['g', 'gm', 'gram', 'grams', 'gr']:
        return 'g'
    if u in ['kg', 'kgs', 'kilogram', 'kilograms']:
        return 'kg'
    if u in ['ml', 'milliliter', 'millilitre', 'mls']:
        return 'ml'
    if u in ['l', 'ltr', 'liter', 'litre', 'litres', 'liters']:
        return 'l'
    if u in ['pcs', 'pc', 'piece', 'pieces', 'packet', 'pack', 'unit', 'units', 'nos', 'no']:
        return 'pcs'
    return u

def clean_barcode(code):
    if not code or pd.isna(code):
        return None
    s = str(code).strip()
    if re.search(r'\.0$', s):
        s = s[:-2]
    # Check if code is all zeros (invalid barcode)
    if set(s) == {'0'} or len(s) < 4:
        return None
    # Barcode should typically be numeric digits or alphanumeric EAN/UPC
    if not re.match(r'^[A-Za-z0-9\-_]+$', s):
        return None
    return s

def clean_openmrp():
    print("--- Cleaning Source 1: OpenMRP ---")
    dest = "data/processed/openmrp_cleaned.csv"
    src = "data/raw/openmrp_raw.csv"
    cols = ['id', 'barcode', 'product_name', 'brand', 'category', 'package_size', 'mrp', 'source_status']
    if os.path.exists(src) and os.path.getsize(src) > 50:
        try:
            df = pd.read_csv(src, dtype=str)
        except Exception:
            df = pd.DataFrame(columns=cols)
    else:
        df = pd.DataFrame(columns=cols)
    df.to_csv(dest, index=False)
    print(f"✅ OpenMRP cleaned: {len(df)} records saved to {dest}")

def clean_quickcommerce():
    print("--- Cleaning Source 2: QuickCommerceData ---")
    dest = "data/processed/quickcommerce_cleaned.csv"
    src = "data/raw/quickcommerce_raw.csv"
    cols = ['product_name', 'brand', 'category', 'subcategory', 'package_size', 'mrp', 'selling_price', 'barcode', 'source']
    records = []
    if os.path.exists(src) and os.path.getsize(src) > 50:
        try:
            raw_df = pd.read_csv(src, dtype=str)
            for _, r in raw_df.iterrows():
                p_name = r.get('Product', '')
                mrp_str = str(r.get('MRP', '')).replace('₹', '').replace(',', '').strip()
                try:
                    mrp = float(mrp_str)
                except ValueError:
                    mrp = None
                records.append({
                    'product_name': p_name,
                    'brand': r.get('Brand', None),
                    'category': r.get('Category', 'Groceries'),
                    'subcategory': r.get('Subcategory', None),
                    'package_size': None,
                    'mrp': mrp,
                    'selling_price': mrp,
                    'barcode': None,
                    'source': 'QuickCommerceData (Commercial Sample)'
                })
        except Exception as e:
            print(f"⚠️ QuickCommerce clean warning: {e}")
    df = pd.DataFrame(records, columns=cols)
    df.to_csv(dest, index=False)
    print(f"✅ QuickCommerce cleaned: {len(df)} records saved to {dest}")

def clean_openfoodfacts():
    print("--- Cleaning Source 3: Open Food Facts India ---")
    src = "data/raw/openfoodfacts_raw.csv"
    dest = "data/processed/openfoodfacts_cleaned.csv"
    
    if not os.path.exists(src):
        print(f"❌ Source not found: {src}")
        return
        
    df = pd.read_csv(src, dtype=str, low_memory=False)
    print(f"  Raw input rows: {len(df):,}")
    
    cleaned = []
    for _, row in df.iterrows():
        raw_code = row.get('code')
        barcode = clean_barcode(raw_code)
        if not barcode:
            continue
            
        pname = row.get('product_name')
        if not pname or pd.isna(pname) or str(pname).strip() == '':
            continue
        pname = str(pname).strip()
        
        brand = row.get('brands')
        if pd.isna(brand) or not brand or str(brand).strip().lower() in ['unknown', 'nan', 'none']:
            brand = None
        else:
            brand = str(brand).strip().split(',')[0].strip() # Take primary brand
            
        qty_val = row.get('quantity_amount') or row.get('product_quantity')
        qty_unit = row.get('quantity_unit') or row.get('product_quantity_unit')
        
        std_unit = standardize_unit(qty_unit)
        try:
            std_qty = float(qty_val) if qty_val and not pd.isna(qty_val) else None
        except ValueError:
            std_qty = None
            
        pkg_size = f"{std_qty} {std_unit}".strip() if (std_qty and std_unit) else None
        
        # Category deduction
        cat_tags = str(row.get('categories_tags', ''))
        pnns1 = str(row.get('pnns_groups_1', ''))
        pnns2 = str(row.get('pnns_groups_2', ''))
        
        cat = 'Groceries & FMCG'
        combined_cat_desc = f"{cat_tags} {pnns1} {pnns2}".lower()
        if any(k in combined_cat_desc for k in ['milk', 'dairy', 'cheese', 'paneer', 'yogurt', 'curd', 'butter', 'ghee', 'cream']):
            cat = 'Dairy & Milk Products'
        elif any(k in combined_cat_desc for k in ['beverage', 'drinks', 'juice', 'tea', 'coffee', 'water', 'soda']):
            cat = 'Beverages'
        elif any(k in combined_cat_desc for k in ['snack', 'biscuit', 'cookie', 'chips', 'cracker', 'namkeen', 'sweet', 'chocolate']):
            cat = 'Snacks & Confectionery'
        elif any(k in combined_cat_desc for k in ['bread', 'bakery', 'cake', 'toast', 'rusk']):
            cat = 'Bakery & Extras'
        elif any(k in combined_cat_desc for k in ['grain', 'flour', 'atta', 'rice', 'dal', 'pulse', 'oil', 'spice', 'masala']):
            cat = 'Staples & Groceries'
        elif any(k in combined_cat_desc for k in ['soap', 'shampoo', 'paste', 'detergent', 'clean']):
            cat = 'Personal Care & Cleaning'
            
        cleaned.append({
            'barcode': barcode,
            'product_name': pname,
            'brand': brand,
            'category': cat,
            'quantity_value': std_qty,
            'quantity_unit': std_unit,
            'package_size': pkg_size,
            'ingredients': row.get('allergens_tags', None) if not pd.isna(row.get('allergens_tags')) else None,
            'source_product_id': barcode,
            'source_name': 'Open Food Facts India',
            'source_url': f"https://world.openfoodfacts.org/product/{barcode}"
        })
        
    out_df = pd.DataFrame(cleaned)
    out_df.drop_duplicates(subset=['barcode'], inplace=True)
    out_df.to_csv(dest, index=False)
    print(f"✅ Open Food Facts India cleaned: {len(out_df):,} unique barcode records saved to {dest}")

def clean_indianfmcg():
    print("--- Cleaning Source 4: IndianFmcg Dataset ---")
    src = "data/raw/indianfmcg_raw.csv"
    dest = "data/processed/indianfmcg_cleaned.csv"
    
    if not os.path.exists(src):
        print(f"❌ Source not found: {src}")
        return
        
    df = pd.read_csv(src, dtype=str, low_memory=False)
    print(f"  Raw input rows: {len(df):,}")
    
    # We aggregate genuine product definitions from transaction records
    # Group by SKU, Brand, Category, Pack_Type, Segment
    # Calculate median or mean price_unit
    df['price_unit'] = pd.to_numeric(df['price_unit'], errors='coerce')
    
    agg = df.groupby(['sku', 'brand', 'category', 'pack_type', 'segment'], as_index=False).agg({
        'price_unit': 'mean'
    })
    
    cleaned = []
    category_map = {
        'Atta': 'Staples & Groceries',
        'Rice': 'Staples & Groceries',
        'Dal': 'Staples & Groceries',
        'Oil': 'Staples & Groceries',
        'Spices': 'Staples & Groceries',
        'Soap': 'Personal Care & Cleaning',
        'Shampoo': 'Personal Care & Cleaning',
        'Toothpaste': 'Personal Care & Cleaning',
        'Detergent': 'Personal Care & Cleaning',
        'Biscuits': 'Snacks & Confectionery',
        'Namkeen': 'Snacks & Confectionery',
        'Tea': 'Beverages',
        'Coffee': 'Beverages',
        'Milk Powder': 'Dairy & Milk Products',
        'Ghee': 'Dairy & Milk Products',
        'Butter': 'Dairy & Milk Products',
        'Paneer': 'Dairy & Milk Products'
    }
    
    for _, r in agg.iterrows():
        sku = str(r['sku']).strip()
        brand = str(r['brand']).strip()
        raw_cat = str(r['category']).strip()
        pack = str(r['pack_type']).strip()
        price = round(float(r['price_unit']), 2) if not pd.isna(r['price_unit']) else None
        
        # Indian FMCG standard unit from pack type
        qty_unit = 'pcs'
        if pack.lower() in ['packet', 'pouch', 'carton', 'tin', 'bottle', 'box', 'jar']:
            qty_unit = 'pcs'
            
        prod_name = f"{brand} {raw_cat} ({pack})"
        cat = category_map.get(raw_cat, 'Groceries & FMCG')
        
        cleaned.append({
            'barcode': None, # Transaction SKU is not an EAN barcode
            'product_name': prod_name,
            'brand': brand,
            'category': cat,
            'subcategory': raw_cat,
            'quantity_value': 1.0,
            'quantity_unit': qty_unit,
            'package_size': f"1 {pack}",
            'mrp': round(price * 1.15, 2) if price else None, # Approx MRP with 15% trade margin
            'selling_price': price,
            'source_product_id': sku,
            'source_name': 'HuggingFace:IndianFmcg',
            'source_url': 'https://huggingface.co/datasets/echosofmoon/IndianFmcg'
        })
        
    out_df = pd.DataFrame(cleaned)
    out_df.drop_duplicates(subset=['product_name', 'brand', 'package_size'], inplace=True)
    out_df.to_csv(dest, index=False)
    print(f"✅ IndianFmcg cleaned: {len(out_df):,} distinct FMCG products saved to {dest}")

def main():
    clean_openmrp()
    clean_quickcommerce()
    clean_openfoodfacts()
    clean_indianfmcg()

if __name__ == '__main__':
    main()
