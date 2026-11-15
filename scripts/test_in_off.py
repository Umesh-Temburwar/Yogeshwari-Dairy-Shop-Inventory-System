"""
Test in.openfoodfacts.org on multiple Indian barcodes
"""
import urllib.request
import json
import time

barcodes = [
    ("8901030383709", "Red Label Tea"),
    ("8901058852424", "Maggi 2-Minute Noodles"),
    ("8901491101837", "Lays Classic Salted"),
    ("8901262010047", "Amul Butter"),
    ("8901719101038", "Parle-G"),
    ("8901063012653", "Britannia Good Day"),
    ("8901207010415", "Dabur Honey")
]

headers = {
    "User-Agent": "YogeshwariDairy-Inventory-App/1.0 (contact: inventory@yogeshwaridairy.com)"
}

for bc, expected_name in barcodes:
    url = f"https://in.openfoodfacts.org/api/v0/product/{bc}.json"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            status = data.get('status')
            if status == 1 and 'product' in data:
                p = data['product']
                name = p.get('product_name') or p.get('product_name_en')
                brand = p.get('brands')
                img = p.get('image_front_url') or p.get('image_url')
                print(f"[FOUND] {bc} ({expected_name}):")
                print(f"  Name: {name}")
                print(f"  Brand: {brand}")
                print(f"  Image: {img}")
            else:
                print(f"[NOT FOUND] {bc} ({expected_name}) - status: {status}")
    except Exception as e:
        print(f"[ERROR] {bc}: {e}")
    time.sleep(0.5)
