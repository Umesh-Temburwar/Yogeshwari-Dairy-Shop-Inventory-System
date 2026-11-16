"""
Executes Phase 3 Batch 3:
- K. Diamond (Yellow Diamond - Prataap Snacks Ltd.)
- L. Chakote (Shree Ganesh Bakery Nandani Pvt. Ltd.)
- M. Moti Namkeen (Moti Food Products)
- N. Campa (Reliance Consumer Products Ltd. / Reliance Retail)
- O. Sprite (Hindustan Coca-Cola Beverages / Coca-Cola India)

Runs sequentially with checkpointing, image HEAD/GET verification (Pillow decoding),
Excel-safe text formatting, and Supabase staging SQL generation.
"""

import sys
sys.path.append('.')
import json
from data.fmcg_catalogue.research_engine import process_brand

BATCH3_CONFIGS = [
    {
        'brand_key': 'diamond',
        'display_brand': 'Yellow Diamond',
        'manufacturer': 'Prataap Snacks Ltd.',
        'manufacturer_url': 'https://www.prataapsnacks.com',
        'gs1_prefixes': ['8906004'],
        'off_tags': ['diamond'],
        'default_category': 'Bakery & Extras',
        'default_subcategory': 'Wafers & Namkeen',
        'db_file': 'scratch/existing_diamond_db.json'
    },
    {
        'brand_key': 'chakote',
        'display_brand': 'Chakote',
        'manufacturer': 'Shree Ganesh Bakery Nandani Pvt. Ltd. (Chakote Group)',
        'manufacturer_url': 'https://chakotegroup.com',
        'gs1_prefixes': ['8906031', '8908019'],
        'off_tags': ['chakote'],
        'default_category': 'Bakery & Extras',
        'default_subcategory': 'Bakery & Toast/Khari',
        'db_file': 'scratch/existing_chakote_db.json'
    },
    {
        'brand_key': 'moti',
        'display_brand': 'Moti Namkeen',
        'manufacturer': 'Moti Food Products',
        'manufacturer_url': 'https://motinamkeen.com',
        'gs1_prefixes': ['8906059'],
        'off_tags': ['moti'],
        'default_category': 'Bakery & Extras',
        'default_subcategory': 'Wafers & Namkeen',
        'db_file': 'scratch/existing_moti_db.json'
    },
    {
        'brand_key': 'campa',
        'display_brand': 'Campa',
        'manufacturer': 'Reliance Consumer Products Ltd. (Reliance Retail)',
        'manufacturer_url': 'https://www.relianceretail.com',
        'gs1_prefixes': ['8904132'],
        'off_tags': ['campa'],
        'default_category': 'Beverages',
        'default_subcategory': 'Cold Drinks & Carbonated',
        'db_file': 'scratch/existing_campa_db.json'
    },
    {
        'brand_key': 'sprite',
        'display_brand': 'Sprite',
        'manufacturer': 'Hindustan Coca-Cola Beverages Pvt. Ltd. (The Coca-Cola Company)',
        'manufacturer_url': 'https://www.coca-cola.com/in/en',
        'gs1_prefixes': ['8901764', '8992761'],
        'off_tags': ['sprite'],
        'default_category': 'Beverages',
        'default_subcategory': 'Cold Drinks & Carbonated',
        'db_file': 'scratch/existing_sprite_db.json'
    }
]

def main():
    print("=== STARTING PHASE 3: BATCH 3 (Yellow Diamond, Chakote, Moti, Campa, Sprite) ===")
    summaries = []
    for cfg in BATCH3_CONFIGS:
        res = process_brand(cfg)
        summaries.append({
            'brand': res['brand'],
            'manufacturer': res['manufacturer'],
            'counts': res['counts'],
            'duration_sec': res['execution_seconds']
        })

    with open('data/fmcg_catalogue/research/batch3_summary.json', 'w', encoding='utf-8') as f:
        json.dump(summaries, f, indent=2)

    print("\n=======================================================")
    print("BATCH 3 COMPLETE SUMMARY:")
    print("=======================================================")
    for s in summaries:
        c = s['counts']
        print(f"Brand: {s['brand']:<16} | Barcodes: {c['verified_barcodes']:>3} | Images: {c['verified_images']:>3} | Staging New: {c['new_products']:>3} | Enriched: {c['review_changes']:>3} ({s['duration_sec']}s)")

if __name__ == '__main__':
    main()
