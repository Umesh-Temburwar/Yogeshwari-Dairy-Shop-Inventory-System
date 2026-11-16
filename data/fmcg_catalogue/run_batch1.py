"""
Executes Phase 3 Batch 1: Britannia, Cadbury, Oreo, Unibic.
Runs sequentially with checkpointing and logs after each brand.
"""

import sys
sys.path.append('.')
import json
from data.fmcg_catalogue.research_engine import process_brand

BATCH1_CONFIGS = [
    {
        'brand_key': 'britannia',
        'display_brand': 'Britannia',
        'manufacturer': 'Britannia Industries Ltd.',
        'manufacturer_url': 'https://www.britannia.co.in',
        'gs1_prefixes': ['8901063'],
        'off_tags': ['britannia', 'good-day'],
        'default_category': 'Bakery & Extras',
        'default_subcategory': 'Biscuits & Cookies',
        'db_file': 'scratch/existing_britannia_db.json'
    },
    {
        'brand_key': 'cadbury',
        'display_brand': 'Cadbury',
        'manufacturer': 'Mondelez India Foods Pvt. Ltd.',
        'manufacturer_url': 'https://www.cadburygifting.in',
        'gs1_prefixes': ['7622201', '7622202', '8901233', '8929752'],
        'off_tags': ['cadbury'],
        'default_category': 'Bakery & Extras',
        'default_subcategory': 'Chocolates & Confectionery',
        'db_file': 'scratch/existing_cadbury_db.json'
    },
    {
        'brand_key': 'oreo',
        'display_brand': 'Oreo',
        'manufacturer': 'Mondelez India Foods Pvt. Ltd.', # Verified owner in India!
        'manufacturer_url': 'https://www.mondelezinternational.com',
        'gs1_prefixes': ['7622201', '7622202', '8901233'],
        'off_tags': ['oreo'],
        'default_category': 'Bakery & Extras',
        'default_subcategory': 'Biscuits & Cookies',
        'db_file': 'scratch/existing_mondelez_oreo_db.json'
    },
    {
        'brand_key': 'unibic',
        'display_brand': 'Unibic',
        'manufacturer': 'Unibic Foods India Pvt. Ltd.', # Independent company
        'manufacturer_url': 'https://unibicfoods.com',
        'gs1_prefixes': ['8906009', '8906188'],
        'off_tags': ['unibic'],
        'default_category': 'Bakery & Extras',
        'default_subcategory': 'Biscuits & Cookies',
        'db_file': 'scratch/existing_unibic_db.json'
    }
]

def main():
    print("=== STARTING PHASE 3: BATCH 1 (Britannia, Cadbury, Oreo, Unibic) ===")
    summaries = []
    for cfg in BATCH1_CONFIGS:
        res = process_brand(cfg)
        summaries.append({
            'brand': res['brand'],
            'manufacturer': res['manufacturer'],
            'counts': res['counts'],
            'duration_sec': res['execution_seconds']
        })

    # Save Batch 1 summary
    with open('data/fmcg_catalogue/research/batch1_summary.json', 'w', encoding='utf-8') as f:
        json.dump(summaries, f, indent=2)

    print("\n=======================================================")
    print("BATCH 1 COMPLETE SUMMARY:")
    print("=======================================================")
    for s in summaries:
        c = s['counts']
        print(f"Brand: {s['brand']:<12} | Barcodes: {c['verified_barcodes']:>3} | Images: {c['verified_images']:>3} | Staging New: {c['new_products']:>3} | Enriched: {c['review_changes']:>3} ({s['duration_sec']}s)")

if __name__ == '__main__':
    main()
