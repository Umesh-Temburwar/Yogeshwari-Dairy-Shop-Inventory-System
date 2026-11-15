import urllib.request

urls = [
    ("Amul Dark Chocolate", "https://www.bbassets.com/media/uploads/p/l/40003735_9-amul-dark-chocolate-55-rich-in-cocoa.jpg"),
    ("Parle Hide & Seek", "https://www.bbassets.com/media/uploads/p/l/302121_15-parle-hide-seek-chocolate.jpg"),
    ("Parle 20-20 Cashew", "https://www.bbassets.com/media/uploads/p/l/20004283_13-parle-20-20-cashew-butter-cookies.jpg"),
    ("Horlicks Classic Malt", "https://www.bbassets.com/media/uploads/p/l/104864_8-amul-butter-pasteurised.jpg"), # test Amul butter
    ("Sting Energy Drink", "https://www.bbassets.com/media/uploads/p/l/40113908_5-sting-energy-drink.jpg"),
    ("Amul Fresh Malai Paneer", "https://www.bbassets.com/media/uploads/p/l/40096747_11-amul-malai-fresh-paneer.jpg"),
    ("Amul Pure Ghee", "https://www.bbassets.com/media/uploads/p/l/40050536_7-amul-ghee.jpg"),
    ("Amul Taaza Milk", "https://www.bbassets.com/media/uploads/p/l/40175765_8-amul-amul-taaza.jpg"),
    ("Amul Gold Milk", "https://www.bbassets.com/media/uploads/p/l/40175764_8-amul-amul-gold.jpg"),
    ("Amul Masti Dahi", "https://www.bbassets.com/media/uploads/p/l/104851_5-amul-masti-dahi.jpg"),
    ("Amul Cheese Slices", "https://www.bbassets.com/media/uploads/p/l/104759_11-amul-cheese-slices.jpg"),
    ("Amul Mozzarella Cheese", "https://www.bbassets.com/media/uploads/p/l/40126254_5-amul-pizza-cheese-mozzarella-diced.jpg"),
    ("Dabur Chyawanprash", "https://www.bbassets.com/media/uploads/p/l/40135131_12-dabur-chyawanprash-2x-immunity.jpg"),
    ("Amul Alphonso Mango", "https://www.bbassets.com/media/uploads/p/l/40012982_5-amul-ice-cream-king-alphonso.jpg"),
    ("Temptin Ketchup", "https://www.temptin.in/wp-content/uploads/2019/08/New-Project-2.png"),
    ("Parle-G", "https://www.bbassets.com/media/uploads/p/l/216871_1-parle-gluco-biscuits-parle-g.jpg"),
    ("Britannia Good Day", "https://www.bbassets.com/media/uploads/p/l/40001605_6-britannia-good-day-cookies-rich-butter.jpg"),
    ("Dabur Honey", "https://www.bbassets.com/media/uploads/p/l/40148709_13-dabur-100-pure-honey.jpg"),
    ("Maggi Noodles", "https://www.bbassets.com/media/uploads/p/l/266109_31-maggi-2-minute-instant-noodles-masala.jpg"),
    ("Aashirvaad Atta", "https://www.bbassets.com/media/uploads/p/l/40127506_10-aashirvaad-shudh-chakki-atta.jpg"),
    ("Tata Salt", "https://www.bbassets.com/media/uploads/p/l/241600_11-tata-salt-salt-iodized.jpg"),
    ("Fortune Sunlite Oil", "https://www.bbassets.com/media/uploads/p/l/274145_21-fortune-sun-lite-sunflower-refined-oil.jpg"),
    ("Cadbury Dairy Milk", "https://www.bbassets.com/media/uploads/p/l/1206716_11-cadbury-dairy-milk-chocolate.jpg"),
    ("Haldiram's Aloo Bhujia", "https://www.bbassets.com/media/uploads/p/l/264454_4-haldirams-namkeen-aloo-bhujia.jpg"),
    ("Patanjali Cow Ghee", "https://www.bbassets.com/media/uploads/p/l/31717_5-patanjali-cow-ghee.jpg")
]

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
}

for name, url in urls:
    req = urllib.request.Request(url, headers=headers, method="HEAD")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            ct = resp.headers.get("Content-Type")
            clen = resp.headers.get("Content-Length")
            print(f"[{resp.status} OK] {name}: {ct} ({clen} bytes)")
    except Exception as e:
        print(f"[FAIL] {name}: {e}")
