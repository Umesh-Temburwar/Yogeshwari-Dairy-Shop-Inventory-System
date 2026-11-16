"""
Executes Phase 3 Batch 2:
- F. Balaji (Wafers & Snacks)
- G. Temptin (Sauces & Condiments - Empire Spices & Foods Ltd.)
- H. Ram Bandhu (Masalas & Spices - Empire Spices & Foods Ltd.)
- I. Suhana (Masalas & Seasonings - Pravin Masalewale)
- J. Mayora Malkist (Crackers & Confectionery - Inbisco India / Mayora)

Runs sequentially with checkpointing, image HEAD/GET verification (Pillow decoding),
Excel-safe text formatting, and Supabase staging SQL generation.
"""

import sys
sys.path.append('.')
import json
from data.fmcg_catalogue.research_engine import process_brand

BATCH2_CONFIGS = [
    {
        'brand_key': 'balaji',
        'display_brand': 'Balaji',
        'manufacturer': 'Balaji Wafers Pvt. Ltd.',
        'manufacturer_url': 'https://www.balajiwafers.com',
        'gs1_prefixes': ['8906010', '8904297', '8906016'],
        'off_tags': ['balaji', 'balaji-wafers'],
        'default_category': 'Bakery & Extras',
        'default_subcategory': 'Wafers & Namkeen',
        'db_file': 'scratch/existing_balaji_db.json'
    },
    {
        'brand_key': 'temptin',
        'display_brand': 'Temptin',
        'manufacturer': 'Empire Spices & Foods Ltd.', # Verified owner of Temptin!
        'manufacturer_url': 'https://temptin.in',
        'gs1_prefixes': ['8903553'],
        'off_tags': ['temptin'],
        'default_category': 'Staples & Groceries',
        'default_subcategory': 'Sauces & Condiments',
        'db_file': 'scratch/existing_temptin_db.json'
    },
    {
        'brand_key': 'rambandhu',
        'display_brand': 'Ram Bandhu',
        'manufacturer': 'Empire Spices & Foods Ltd.', # Verified owner of Ram Bandhu!
        'manufacturer_url': 'https://rambandhu.com',
        'gs1_prefixes': ['8903553'],
        'off_tags': ['rambandhu', 'ram-bandhu'],
        'default_category': 'Staples & Groceries',
        'default_subcategory': 'Spices & Masalas',
        'db_file': 'scratch/existing_rambandhu_db.json'
    },
    {
        'brand_key': 'suhana',
        'display_brand': 'Suhana',
        'manufacturer': 'Pravin Masalewale', # Verified manufacturer!
        'manufacturer_url': 'https://suhana.co.in',
        'gs1_prefixes': ['8901662', '8903241', '8906064'],
        'off_tags': ['suhana'],
        'default_category': 'Staples & Groceries',
        'default_subcategory': 'Spices & Masalas',
        'db_file': 'scratch/existing_suhana_db.json'
    },
    {
        'brand_key': 'mayora',
        'display_brand': 'Mayora Malkist',
        'manufacturer': 'Inbisco India Pvt. Ltd. (Mayora Group)', # Verified Indian entity!
        'manufacturer_url': 'https://mayoraindia.com',
        'gs1_prefixes': ['8996001', '8992775'],
        'off_tags': ['malkist', 'mayora'],
        'default_category': 'Bakery & Extras',
        'default_subcategory': 'Biscuits & Cookies',
        'db_file': 'scratch/existing_mayora_malkist_db.json'
    }
]

def main():
    print("=== STARTING PHASE 3: BATCH 2 (Balaji, Temptin, Ram Bandhu, Suhana, Mayora) ===")
    summaries = []
    for cfg in BATCH2_CONFIGS:
        res = process_brand(cfg)
        summaries.append({
            'brand': res['brand'],
            'manufacturer': res['manufacturer'],
            'counts': res['counts'],
            'duration_sec': res['execution_seconds']
        })

    with open('data/fmcg_catalogue/research/batch2_summary.json', 'w', encoding='utf-8') as f:
        json.dump(summaries, f, indent=2)

    print("\n=======================================================")
    print("BATCH 2 COMPLETE SUMMARY:")
    print("=======================================================")
    for s in summaries:
        c = s['counts']
        print(f"Brand: {s['brand']:<16} | Barcodes: {c['verified_barcodes']:>3} | Images: {c['verified_images']:>3} | Staging New: {c['new_products']:>3} | Enriched: {c['review_changes']:>3} ({s['duration_sec']}s)")

if __name__ == '__main__':
    main()
