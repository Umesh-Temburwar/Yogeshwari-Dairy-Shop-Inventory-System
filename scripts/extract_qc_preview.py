import urllib.request
import re
import csv
import json

headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

url = "https://quickcommercedata.com/datasets/global-products"
req = urllib.request.Request(url, headers=headers)
html = ""
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
except Exception as e:
    print("Error fetching QuickCommerceData:", e)

# Parse the table headers and rows
table_match = re.search(r'<table[^>]*>(.*?)</table>', html, re.S | re.I)
if table_match:
    table_html = table_match.group(1)
    # Get headers
    th_matches = re.findall(r'<th[^>]*>(.*?)</th>', table_html, re.S | re.I)
    headers_clean = [re.sub(r'<[^>]+>', '', h).strip() for h in th_matches]
    print("QuickCommerceData preview headers:", headers_clean)
    
    # Get rows
    tr_matches = re.findall(r'<tr[^>]*>(.*?)</tr>', table_html, re.S | re.I)
    rows_data = []
    for tr in tr_matches:
        tds = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.S | re.I)
        if tds:
            row_clean = [re.sub(r'<[^>]+>', '', td).strip() for td in tds]
            rows_data.append(row_clean)
            
    print(f"QuickCommerceData preview rows extracted: {len(rows_data)}")
    
    with open('data/raw/quickcommerce_raw.csv', 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        if headers_clean:
            writer.writerow(headers_clean)
        writer.writerows(rows_data)
else:
    print("No table found on QuickCommerceData page")
