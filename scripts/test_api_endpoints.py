"""
Test API endpoints with rate limit handling and official brand endpoints
"""
import urllib.request
import urllib.error
import json
import time

def test_api():
    barcode = "8901030383709" # Red Label Tea
    endpoints = [
        f"https://in.openfoodfacts.org/api/v0/product/{barcode}.json",
        f"https://world.openfoodfacts.net/api/v2/product/{barcode}.json",
        f"https://api.upcitemdb.com/prod/trial/lookup?upc={barcode}"
    ]

    headers = {
        "User-Agent": "YogeshwariDairy-Inventory-App/1.0 (contact: inventory@yogeshwaridairy.com)"
    }

    for ep in endpoints:
        print(f"\nTesting endpoint: {ep}")
        try:
            req = urllib.request.Request(ep, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as resp:
                print(f"Status: {resp.status}")
                data = json.loads(resp.read().decode('utf-8'))
                print("Response keys:", list(data.keys())[:5])
                if 'product' in data:
                    p = data['product']
                    print("Product title:", p.get('product_name') or p.get('title'))
                    print("Image front:", p.get('image_front_url'))
        except urllib.error.HTTPError as e:
            print(f"HTTPError: {e.code} {e.reason}")
        except Exception as e:
            print(f"Exception: {e}")
        time.sleep(1)

if __name__ == "__main__":
    test_api()
