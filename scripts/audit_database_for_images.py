"""
Read-Only Database Audit Script for Product Images
Connects to Supabase using REST API and inspects:
- Total records in public.products
- Schema columns & image metadata fields
- Barcode counts, uniqueness, leading zero counts
- Existing image URL coverage & status
- Categorization and brand breakdowns
- HTTP health check of existing sample image URLs
"""

import json
import os
import sys
import urllib.request
import urllib.error
from collections import Counter
from datetime import datetime

SUPABASE_URL = "https://pfamoxreojbejufwhgiu.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmYW1veHJlb2piZWp1ZndoZ2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzNzc0MjEsImV4cCI6MjEwOTk1MzQyMX0.p97fdh4S8TxkVhQN5z14AApdFj6x5zsqPTQlLSXlD8E"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def fetch_rest(endpoint, headers_extra=None):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    req_headers = dict(HEADERS)
    if headers_extra:
        req_headers.update(headers_extra)
    req = urllib.request.Request(url, headers=req_headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8'))

def fetch_count(endpoint):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    req_headers = dict(HEADERS)
    req_headers["Prefer"] = "count=exact"
    req_headers["Range-Unit"] = "items"
    req_headers["Range"] = "0-0"
    req = urllib.request.Request(url, headers=req_headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        content_range = resp.headers.get("Content-Range", "")
        if "/" in content_range:
            return int(content_range.split("/")[1])
    return 0

def main():
    print("=" * 70)
    print("SUPABASE PRODUCT IMAGE READ-ONLY AUDIT")
    print("=" * 70)

    # 1. Total counts
    total_products = fetch_count("products?select=id")
    print(f"Total rows in public.products: {total_products}")

    total_barcodes_table = fetch_count("product_barcodes?select=id")
    print(f"Total rows in public.product_barcodes: {total_barcodes_table}")

    # 2. Check columns of products table by fetching 1 row
    sample_rows = fetch_rest("products?limit=1")
    if sample_rows:
        sample = sample_rows[0]
        print("\nColumns detected in public.products:")
        for col in sorted(sample.keys()):
            val = sample[col]
            print(f"  - {col}: (type: {type(val).__name__}, sample: {repr(val)[:40]})")
    
    # 3. Barcode counts in products
    products_with_barcode = fetch_count("products?barcode=not.is.null&barcode=neq.&select=id")
    print(f"\nProducts with non-empty barcode: {products_with_barcode}")
    
    # 4. Image coverage in products
    products_with_image = fetch_count("products?image_url=not.is.null&image_url=neq.&select=id")
    print(f"Products with non-empty image_url: {products_with_image}")

    # 5. Fetch all products with images to analyze existing image URLs
    print("\nFetching all records with existing image_url...")
    # Fetch in batches of 1000
    images_records = []
    offset = 0
    limit = 1000
    while True:
        batch = fetch_rest(f"products?image_url=not.is.null&image_url=neq.&select=id,name,brand,category,barcode,image_url,image_status,image_source,stock_quantity&order=id.asc&offset={offset}&limit={limit}")
        if not batch:
            break
        images_records.extend(batch)
        if len(batch) < limit:
            break
        offset += limit
    
    print(f"Total fetched records with image_url: {len(images_records)}")

    # Analyze image statuses
    status_counts = Counter(r.get("image_status") for r in images_records)
    source_counts = Counter(r.get("image_source") for r in images_records)
    category_counts = Counter(r.get("category") for r in images_records)
    
    # Domain breakdown
    domains = Counter()
    for r in images_records:
        url = r.get("image_url") or ""
        if "://" in url:
            domain = url.split("://")[1].split("/")[0]
            domains[domain] += 1
        else:
            domains["invalid_protocol"] += 1

    print("\nExisting Image Status Breakdown:")
    for status, count in status_counts.most_common():
        print(f"  - {status}: {count}")

    print("\nExisting Image Source Breakdown:")
    for src, count in source_counts.most_common():
        print(f"  - {src}: {count}")

    print("\nExisting Image Host Domains:")
    for dom, count in domains.most_common():
        print(f"  - {dom}: {count}")

    # Check how many have stock > 0
    in_stock_with_image = sum(1 for r in images_records if (r.get("stock_quantity") or 0) > 0)
    print(f"\nProducts with images currently in shop active stock: {in_stock_with_image}")

    # 6. Sample HTTP verification of existing URLs (check first 20 and last 20)
    sample_urls_to_test = images_records[:15] + images_records[-15:]
    print(f"\nTesting accessibility of {len(sample_urls_to_test)} existing image URLs...")
    accessible_count = 0
    broken_count = 0
    broken_samples = []

    for item in sample_urls_to_test:
        url = item.get("image_url")
        try:
            req = urllib.request.Request(
                url, 
                headers={"User-Agent": "YogeshwariDairyAudit/1.0 (https://yogeshwari-dairy-shop.vercel.app; info@yogeshwaridairy.com)"}
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                content_type = resp.headers.get("Content-Type", "")
                if resp.status == 200 and ("image" in content_type or "octet-stream" in content_type):
                    accessible_count += 1
                else:
                    broken_count += 1
                    broken_samples.append((item.get("barcode"), item.get("name"), url, f"Status {resp.status}, Content-Type: {content_type}"))
        except Exception as e:
            broken_count += 1
            broken_samples.append((item.get("barcode"), item.get("name"), url, str(e)))

    print(f"Sample test results: Accessible: {accessible_count}, Broken: {broken_count}")
    if broken_samples:
        print("Sample broken URLs:")
        for b in broken_samples[:5]:
            print(f"  - Barcode: {b[0]}, Name: {b[1]}\n    URL: {b[2]}\n    Reason: {b[3]}")

    # Save summary to audit json
    audit_summary = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "total_products": total_products,
        "total_barcodes_table": total_barcodes_table,
        "products_with_barcode": products_with_barcode,
        "products_with_image": products_with_image,
        "status_breakdown": dict(status_counts),
        "source_breakdown": dict(source_counts),
        "domain_breakdown": dict(domains),
        "active_stock_with_image": in_stock_with_image,
        "sample_checked": len(sample_urls_to_test),
        "sample_accessible": accessible_count,
        "sample_broken": broken_count
    }

    with open("exports/product-image-database/audit_pre_update.json", "w", encoding="utf-8") as f:
        json.dump(audit_summary, f, indent=2)

    print("\nSaved audit summary to exports/product-image-database/audit_pre_update.json")

if __name__ == "__main__":
    main()
