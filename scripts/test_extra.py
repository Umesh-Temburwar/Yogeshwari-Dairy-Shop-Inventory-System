import urllib.request

extra = [
    ("Horlicks Classic Malt", "https://cdn01.pharmeasy.in/dam/products_otc/I04915/horlicks-classic-malt-nutrition-drink-jar-500-gm-2-1740125103.jpg"),
    ("Karachi Bakery Fruit", "https://www.bbassets.com/media/uploads/p/l/40149091_2-karachi-bakery-fruit-biscuits.jpg"),
    ("Too Yumm Bhoot Chips", "https://media-dev.bazaar5.com/media/product/0c/8145/40317874-too-yumm-bhoot-potato-chips-bhut-jolokia-chillies-flavour-created-with-naagin-hot-sauce-90-g-0-02b8b28a.jpg"),
    ("Pintola Peanut Butter", "https://www.bbassets.com/media/uploads/p/l/40110055_10-pintola-all-natural-peanut-butter-unsweetened-creamy.jpg")
]

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
}

for name, url in extra:
    req = urllib.request.Request(url, headers=headers, method="HEAD")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            print(f"[{resp.status} OK] {name}: {resp.headers.get('Content-Type')}")
    except Exception as e:
        print(f"[FAIL] {name}: {e}")
