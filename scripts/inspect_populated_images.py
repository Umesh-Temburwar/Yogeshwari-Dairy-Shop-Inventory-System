"""
Inspect all 658 currently populated product images in public.products
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
    records = []
    offset = 0
    limit = 1000
    while True:
        batch = fetch_rest(f"products?image_url=not.is.null&image_url=neq.&select=id,name,brand,category,barcode,image_url,image_status,image_source,image_attribution&order=id.asc&offset={offset}&limit={limit}")
        if not batch:
            break
        records.extend(batch)
        if len(batch) < limit:
            break
        offset += limit
    
    print(f"Total current populated images: {len(records)}")

    # Sample inspect
    print("\nSample 10 items:")
    for r in records[:10]:
        print(f"  Barcode: {r.get('barcode')} | Name: {r.get('name')}")
        print(f"  URL: {r.get('image_url')}")
        print(f"  Status: {r.get('image_status')} | Source: {r.get('image_source')}")
        print("-" * 50)

    # Check for duplicate URLs (i.e. same image assigned to multiple different products)
    url_counts = Counter(r['image_url'] for r in records if r.get('image_url'))
    duplicates = {url: count for url, count in url_counts.items() if count > 1}
    print(f"\nUnique Image URLs: {len(url_counts)}")
    print(f"Duplicate Image URLs (same image used on multiple products): {len(duplicates)}")
    if duplicates:
        print("Top 5 duplicate URLs:")
        for url, count in list(duplicates.items())[:5]:
            print(f"  {count}x: {url}")
            matched_items = [r for r in records if r.get('image_url') == url]
            for m in matched_items[:3]:
                print(f"     -> Barcode: {m.get('barcode')}, Name: {m.get('name')}")

if __name__ == "__main__":
    main()
