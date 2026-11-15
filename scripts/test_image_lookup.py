"""
Test exact barcode lookup against Open Food Facts & Brand sources
"""
import json
import urllib.request
import urllib.error
import time

def test_barcodes():
    # Load 15 barcoded items from exports/product-image-database/food_products_46000.json
    with open("exports/product-image-database/food_products_46000.json", "r", encoding="utf-8") as f:
        products = json.load(f)

    barcoded = [p for p in products if p.get('barcode') and len(str(p['barcode']).strip()) >= 8]
    # Pick a variety: Amul, Britannia, Parle, Nestle, Haldiram, etc.
    sample = barcoded[:20]

    headers = {
        "User-Agent": "YogeshwariDairyShopERP/1.0 (info@yogeshwaridairy.com; https://yogeshwari-dairy-shop.vercel.app)"
    }

    print(f"Testing {len(sample)} sample products...")
    for idx, p in enumerate(sample):
        bc = str(p['barcode']).strip()
        name = p.get('name')
        brand = p.get('brand')
        print(f"\n[{idx+1}/{len(sample)}] DB Product: '{name}' | Brand: '{brand}' | Barcode: {bc}")

        # Try Open Food Facts
        url = f"https://world.openfoodfacts.org/api/v2/product/{bc}.json?fields=code,product_name,brands,quantity,image_front_url,image_url"
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                if data.get('status') == 1 and data.get('product'):
                    prod_data = data['product']
                    off_name = prod_data.get('product_name')
                    off_brand = prod_data.get('brands')
                    img = prod_data.get('image_front_url') or prod_data.get('image_url')
                    print(f"  -> FOUND in OFF: '{off_name}' | Brand: '{off_brand}'")
                    print(f"  -> Image: {img}")
                else:
                    print(f"  -> Not found in Open Food Facts (status: {data.get('status')})")
        except Exception as e:
            print(f"  -> Error querying OFF: {e}")

        time.sleep(0.3)

if __name__ == "__main__":
    test_barcodes()
