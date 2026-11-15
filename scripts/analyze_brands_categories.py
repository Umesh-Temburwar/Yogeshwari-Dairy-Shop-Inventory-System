"""
Brand and Category Landscape Analyzer for 46,000+ Products
"""
import json
import urllib.request
from collections import Counter

SUPABASE_URL = "https://pfamoxreojbejufwhgiu.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmYW1veHJlb2piZWp1ZndoZ2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzNzc0MjEsImV4cCI6MjEwOTk1MzQyMX0.p97fdh4S8TxkVhQN5z14AApdFj6x5zsqPTQlLSXlD8E"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def fetch_rest(endpoint):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8'))

def main():
    # Read the exported JSON if available, or sample from Supabase
    json_path = "exports/product-image-database/food_products_46000.json"
    
    brand_counter = Counter()
    category_counter = Counter()
    prefix_counter = Counter()
    total_with_barcode = 0
    total_products = 0

    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            total_products = len(data)
            for p in data:
                b = p.get("barcode")
                cat = p.get("category") or "Uncategorized"
                brand = p.get("brand") or "Unknown"
                
                category_counter[cat] += 1
                if brand and brand != "Unknown":
                    brand_counter[brand] += 1
                else:
                    # Try to infer brand from first word of name
                    name = p.get("name") or ""
                    first_word = name.split()[0] if name.split() else ""
                    if len(first_word) >= 3:
                        brand_counter[first_word.upper()] += 1

                if b and str(b).strip():
                    total_with_barcode += 1
                    b_str = str(b).strip()
                    if len(b_str) >= 3:
                        prefix_counter[b_str[:3]] += 1
    except Exception as e:
        print(f"Reading from json failed: {e}")
        return

    print(f"Total Products Analyzed: {total_products}")
    print(f"Products with Barcodes: {total_with_barcode}")
    
    print("\nTop 15 Categories:")
    for cat, count in category_counter.most_common(15):
        print(f"  - {cat}: {count}")

    print("\nTop 25 Brands / Brand Prefixes:")
    for b, count in brand_counter.most_common(25):
        print(f"  - {b}: {count}")

    print("\nTop Barcode Prefixes (GS1 Country Codes):")
    # 890 is GS1 India!
    for pfx, count in prefix_counter.most_common(10):
        country = "India (GS1 890)" if pfx == "890" else ("USA/Canada (00-13)" if pfx.startswith("0") else "Other")
        print(f"  - Prefix {pfx}: {count} ({country})")

    # Specifically check major Indian FMCG brands requested by user
    key_brands = [
        "AMUL", "BRITANNIA", "PARLE", "NESTLE", "NESTLÉ", "ITC", "HALDIRAM",
        "TATA", "DABUR", "PATANJALI", "COCA", "PEPSI", "HINDUSTAN", "MOTHER DAIRY",
        "CADBURY", "BALAJI", "EVEREST", "MDH", "FORTUNE", "SAFFOLA", "AASHIRVAAD",
        "KRAFT", "MAGGI", "LAYS", "KURKURE"
    ]
    print("\nTarget Key Food & FMCG Brands Count in Catalogue:")
    for kb in key_brands:
        match_count = sum(1 for p in data if kb in (p.get("name") or "").upper() or kb in (p.get("brand") or "").upper())
        if match_count > 0:
            print(f"  - {kb}: {match_count} products")

if __name__ == "__main__":
    main()
