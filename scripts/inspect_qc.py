import urllib.request
import re

url = 'https://quickcommercedata.com/datasets/global-products'
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        print(f"Status: 200 OK, length: {len(html):,} chars")
        prices = set(re.findall(r'(?:INR|USD|₹|\$)\s*[\d,]+', html))
        print("Prices found:", prices)
        
        # Look for buttons or download links
        links = re.findall(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', html, re.I | re.S)
        print("\nRelevant Links:")
        for href, text in links:
            clean_t = re.sub(r'<[^>]+>', '', text).strip()
            if any(w in clean_t.lower() or w in href.lower() for w in ['download', 'sample', 'buy', 'pricing', 'contact', 'dataset', 'csv']):
                print(f"  [{clean_t}] -> {href}")
except Exception as e:
    print("Error:", e)
