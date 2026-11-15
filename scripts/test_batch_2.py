import urllib.request

test_urls = [
    ("Amul Cooking Butter Unsalted", "https://www.bbassets.com/media/uploads/p/l/40006899_9-amul-cooking-butter-unsalted.jpg"),
    ("Amul Cow Ghee", "https://www.bbassets.com/media/uploads/p/l/40149830_3-amul-cow-ghee.jpg"),
    ("Amul Cheese Spread Plain", "https://www.bbassets.com/media/uploads/p/l/104764_11-amul-cheese-spread-yummy-plain.jpg"),
    ("Amul Moti Toned Milk", "https://www.bbassets.com/media/uploads/p/l/40004415_4-amul-moti-homogenised-toned-milk.jpg"),
    ("Amul Kool Koko", "https://www.bbassets.com/media/uploads/p/l/40004412_5-amul-kool-koko.jpg"),
    ("Amul Mithai Mate", "https://www.bbassets.com/media/uploads/p/l/104860_8-amul-mithai-mate.jpg"),
    ("Amul Fresh Cream", "https://www.bbassets.com/media/uploads/p/l/104760_8-amul-fresh-cream.jpg"),
    ("Amul Cow Milk", "https://www.bbassets.com/media/uploads/p/l/40175766_7-amul-cow-milk.jpg"),
    ("Mother Dairy Dahi", "https://www.bbassets.com/media/uploads/p/l/306926_4-mother-dairy-ultimate-dahi.jpg"),
    ("Mother Dairy Toned Milk", "https://www.bbassets.com/media/uploads/p/l/40004416_4-mother-dairy-toned-milk.jpg"),
    ("Mother Dairy Full Cream", "https://www.bbassets.com/media/uploads/p/l/40004417_4-mother-dairy-full-cream-milk.jpg"),
    ("Parle Monaco", "https://www.bbassets.com/media/uploads/p/l/102758_13-parle-monaco-salted-biscuits.jpg"),
    ("Parle Krackjack", "https://www.bbassets.com/media/uploads/p/l/102757_10-parle-krackjack-biscuits.jpg"),
    ("Parle Rusk", "https://www.bbassets.com/media/uploads/p/l/40053913_5-parle-rusk-real-elaichi.jpg"),
    ("Britannia Good Day Cashew", "https://www.bbassets.com/media/uploads/p/l/40001606_8-britannia-good-day-cashew-cookies.jpg"),
    ("Britannia Marie Gold", "https://www.bbassets.com/media/uploads/p/l/40001614_7-britannia-marie-gold-biscuits.jpg"),
    ("Britannia Bourbon", "https://www.bbassets.com/media/uploads/p/l/40001613_6-britannia-the-original-bourbon-chocolate-cream-biscuits.jpg"),
    ("Britannia Little Hearts", "https://www.bbassets.com/media/uploads/p/l/102761_11-britannia-little-hearts-classic-sugar-sprinkled-biscuits.jpg"),
    ("Britannia Milk Bikis", "https://www.bbassets.com/media/uploads/p/l/40001611_7-britannia-milk-bikis-biscuits.jpg"),
    ("Maggi Hot & Sweet", "https://www.bbassets.com/media/uploads/p/l/266120_18-maggi-hot-sweet-tomato-chilli-sauce.jpg"),
    ("Maggi Rich Tomato", "https://www.bbassets.com/media/uploads/p/l/266119_18-maggi-rich-tomato-ketchup.jpg"),
    ("Dabur Red Paste", "https://www.bbassets.com/media/uploads/p/l/40183188_6-dabur-red-paste.jpg"),
    ("Patanjali Dant Kanti", "https://www.bbassets.com/media/uploads/p/l/40026265_5-patanjali-dant-kanti-dental-cream.jpg"),
    ("Patanjali Honey", "https://www.bbassets.com/media/uploads/p/l/40047395_7-patanjali-pure-honey.jpg"),
    ("Tata Tea Premium", "https://www.bbassets.com/media/uploads/p/l/240065_14-tata-tea-premium-desh-ki-chai.jpg"),
    ("Tata Tea Gold", "https://www.bbassets.com/media/uploads/p/l/240067_13-tata-tea-gold.jpg"),
    ("Cadbury 5 Star", "https://www.bbassets.com/media/uploads/p/l/100012224_9-cadbury-5-star-chocolate-bar.jpg"),
    ("Cadbury Perk", "https://www.bbassets.com/media/uploads/p/l/100012222_10-cadbury-perk-chocolate-home-treats-pack.jpg"),
    ("Cadbury Bournvita", "https://www.bbassets.com/media/uploads/p/l/40004400_8-cadbury-bournvita-health-drink.jpg"),
    ("Haldiram's Bhujia Sev", "https://www.bbassets.com/media/uploads/p/l/264453_4-haldirams-namkeen-bhujia-sev.jpg"),
    ("Haldiram's Khatta Meetha", "https://www.bbassets.com/media/uploads/p/l/264452_4-haldirams-namkeen-khatta-meetha.jpg"),
    ("Haldiram's Moong Dal", "https://www.bbassets.com/media/uploads/p/l/264451_4-haldirams-namkeen-moong-dal.jpg"),
    ("Balaji Simply Salted", "https://www.bbassets.com/media/uploads/p/l/40082989_4-balaji-wafers-simply-salted.jpg"),
    ("Balaji Masala Wafers", "https://www.bbassets.com/media/uploads/p/l/40082991_4-balaji-wafers-masala.jpg"),
    ("Lay's Classic Salted", "https://www.bbassets.com/media/uploads/p/l/102778_15-lays-potato-chips-classic-salted.jpg"),
    ("Lay's Magic Masala", "https://www.bbassets.com/media/uploads/p/l/102779_15-lays-potato-chips-indias-magic-masala.jpg"),
    ("Kurkure Masala Munch", "https://www.bbassets.com/media/uploads/p/l/102781_16-kurkure-namkeen-masala-munch.jpg"),
    ("Coca-Cola Soft Drink", "https://www.bbassets.com/media/uploads/p/l/251014_12-coca-cola-soft-drink.jpg"),
    ("Thums Up", "https://www.bbassets.com/media/uploads/p/l/251023_11-thums-up-soft-drink.jpg"),
    ("Sprite", "https://www.bbassets.com/media/uploads/p/l/251042_11-sprite-soft-drink.jpg"),
    ("Frooti Mango", "https://www.bbassets.com/media/uploads/p/l/265977_7-frooti-fresh-n-juicy-mango-drink.jpg"),
    ("Maaza Mango", "https://www.bbassets.com/media/uploads/p/l/251034_11-maaza-mango-drink.jpg")
]

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
}

passed = 0
for name, url in test_urls:
    req = urllib.request.Request(url, headers=headers, method="HEAD")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                passed += 1
                print(f"[200 OK] {name}")
    except Exception as e:
        print(f"[FAIL] {name}: {e}")

print(f"\nTotal passed: {passed}/{len(test_urls)}")
