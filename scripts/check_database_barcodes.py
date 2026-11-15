#!/usr/bin/env python3
"""
Yogeshwari Dairy Shop & Inventory System
Live Database Barcode Counter:
Directly checks Supabase live database and displays exact barcode counts.
"""

import requests

SUPABASE_URL = "https://pfamoxreojbejufwhgiu.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmYW1veHJlb2piZWp1ZndoZ2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzNzc0MjEsImV4cCI6MjEwOTk1MzQyMX0.p97fdh4S8TxkVhQN5z14AApdFj6x5zsqPTQlLSXlD8E"

def get_exact_count(endpoint):
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Prefer": "count=exact"
    }
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    try:
        r = requests.get(url, headers=headers, timeout=10)
        cr = r.headers.get("Content-Range", "")
        if "/" in cr:
            total = cr.split("/")[-1]
            return int(total) if total != "*" else 0
        return 0
    except Exception as e:
        return f"Error: {e}"

def main():
    print("\n" + "=" * 65)
    print("   YOGESHWARI DAIRY ERP — LIVE SUPABASE DATABASE AUDIT")
    print("=" * 65)

    total_prods = get_exact_count("products?select=id")
    barcoded_prods = get_exact_count("products?select=id&barcode=not.is.null")
    in_stock_prods = get_exact_count("products?select=id&stock_quantity=gt.0")
    total_pb = get_exact_count("product_barcodes?select=id")
    total_cat = get_exact_count("product_catalogue?select=id")

    print(f"\n📊 1. Products Table (`public.products`):")
    print(f"   • Total Products:                {total_prods:,}")
    print(f"   • Products with Barcode:         {barcoded_prods:,}")
    print(f"   • Active In-Stock Items (Stock>0): {in_stock_prods}")

    print(f"\n🏷️ 2. Barcodes Table (`public.product_barcodes`):")
    print(f"   • Total Barcodes Linked:         {total_pb:,}")

    print(f"\n📚 3. Master Catalogue (`public.product_catalogue`):")
    print(f"   • Catalogue Items:               {total_cat:,}")

    print("\n" + "=" * 65)
    print(f"✅ RESULT: You currently have {barcoded_prods:,} barcoded products in Supabase!")
    print("=" * 65 + "\n")

if __name__ == "__main__":
    main()
