import json
import csv
import os

with open('data/backups/products_backup_before_phase55.json', encoding='utf-8') as f:
    orig_products = json.load(f)

# Also load our newly curated list
curated = []
with open('data/clean_catalogue/yogeshwari_dairy_products_clean_master.csv', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for r in reader:
        curated.append(r)

curated_barcodes = {p['barcode'] for p in curated}
curated_names = {p['product_name'].lower().strip() for p in curated}

final_list = list(curated)

# Sequential barcode generator for backup items that have no barcode
barcode_counter = 8901000100010

for p in orig_products:
    name = p.get('name', '').strip()
    if not name or name.lower().strip() in curated_names:
        continue
    
    # Generate clean EAN-13 if not present
    existing_bar = p.get('barcode')
    if existing_bar and len(existing_bar.strip()) >= 8:
        bar = existing_bar.strip()
    else:
        bar = str(barcode_counter)
        barcode_counter += 1
    
    if bar in curated_barcodes:
        bar = str(barcode_counter)
        barcode_counter += 1
    
    curated_barcodes.add(bar)

    item = {
        "barcode": bar,
        "product_name": name,
        "marathi_name": p.get('marathi_name') or name,
        "hindi_name": p.get('hindi_name') or name,
        "brand": p.get('brand') or ("Amul" if "amul" in name.lower() else "Haldiram" if "haldiram" in name.lower() else "Britannia" if "britannia" in name.lower() else "Parle" if "parle" in name.lower() else "Yogeshwari Dairy"),
        "category": p.get('category') or "Bakery & Extras",
        "pack_size": p.get('unit') or "1 pc",
        "unit": p.get('unit') or "Piece",
        "purchase_price": float(p.get('purchase_price') or 0.0),
        "selling_price": float(p.get('selling_price') or 0.0),
        "min_stock_alert": int(p.get('min_stock_alert') or 10),
        "shelf_life_days": int(p.get('shelf_life_days') or 30),
        "stock_quantity": float(p.get('stock_quantity') or 0.0)
    }
    final_list.append(item)

# Save master CSV
master_csv_path = 'data/clean_catalogue/YOGESHWARI_DAIRY_MASTER_CATALOGUE.csv'
fieldnames = [
    "barcode",
    "product_name",
    "marathi_name",
    "hindi_name",
    "brand",
    "category",
    "pack_size",
    "unit",
    "purchase_price",
    "selling_price",
    "min_stock_alert",
    "shelf_life_days",
    "stock_quantity"
]

with open(master_csv_path, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    for row in final_list:
        writer.writerow(row)

# Also copy to root public directory so the user can download it directly from the app / browser!
os.makedirs('public/downloads', exist_ok=True)
public_csv_path = 'public/downloads/yogeshwari_dairy_catalogue.csv'
with open(public_csv_path, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    for row in final_list:
        writer.writerow(row)

print(f"Master CSV created at: {master_csv_path}")
print(f"Public Downloadable CSV created at: {public_csv_path}")
print(f"Total authentic dairy products: {len(final_list)}")
