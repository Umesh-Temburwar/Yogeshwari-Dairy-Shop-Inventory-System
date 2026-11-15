"""
Test direct CDN lookup for Open Food Facts images
"""
import urllib.request
import urllib.error

def split_barcode_path(barcode):
    bc = str(barcode).strip()
    if len(bc) <= 8:
        return bc
    # If 13 digits: 3/3/3/4
    if len(bc) == 13:
        return f"{bc[:3]}/{bc[3:6]}/{bc[6:9]}/{bc[9:]}"
    # If 12 digits: 3/3/3/3
    if len(bc) == 12:
        return f"{bc[:3]}/{bc[3:6]}/{bc[6:9]}/{bc[9:]}"
    return bc

test_barcodes = [
    "8908012861928", # Karachi dry fruit (known from DB)
    "8904010630382", # NIRAA Samba Wheat Puttu Podi (known from DB)
    "8901262010047", # Amul Butter
    "8901058852424", # Maggi
    "8901063012653", # Britannia Good Day
    "8901719101038", # Parle-G
]

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

suffixes = [
    "front_en.4.400.jpg",
    "front_en.3.400.jpg",
    "front_en.2.400.jpg",
    "front_en.1.400.jpg",
    "front_en.5.400.jpg",
    "front_en.6.400.jpg",
    "front.400.jpg",
    "1.400.jpg",
    "front_en.full.jpg"
]

for bc in test_barcodes:
    p = split_barcode_path(bc)
    base = f"https://images.openfoodfacts.org/images/products/{p}"
    found = False
    for s in suffixes:
        url = f"{base}/{s}"
        req = urllib.request.Request(url, headers=headers, method="HEAD")
        try:
            with urllib.request.urlopen(req, timeout=4) as resp:
                if resp.status == 200:
                    ct = resp.headers.get("Content-Type", "")
                    clen = resp.headers.get("Content-Length", "0")
                    print(f"FOUND image for {bc}: {url} ({ct}, {clen} bytes)")
                    found = True
                    break
        except Exception:
            pass
    if not found:
        print(f"No image on CDN for {bc}")
