import urllib.request
import json

SUPABASE_URL = "https://pfamoxreojbejufwhgiu.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmYW1veHJlb2piZWp1ZndoZ2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzNzc0MjEsImV4cCI6MjEwOTk1MzQyMX0.p97fdh4S8TxkVhQN5z14AApdFj6x5zsqPTQlLSXlD8E"

headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
url = f"{SUPABASE_URL}/rest/v1/products?stock_quantity=gt.0&select=id,name,brand,category,barcode,image_url,image_source,stock_quantity&order=name.asc"
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as resp:
    items = json.loads(resp.read().decode('utf-8'))

print(f"Total active stock items in shop: {len(items)}")
for it in items:
    print(f"ID: {it['id']}")
    print(f"  Name: {it['name']} (Brand: {it.get('brand')})")
    print(f"  Barcode: {it.get('barcode')} | Stock: {it.get('stock_quantity')}")
    print(f"  Image: {it.get('image_url')}")
    print(f"  Source: {it.get('image_source')}")
    print("-" * 60)
