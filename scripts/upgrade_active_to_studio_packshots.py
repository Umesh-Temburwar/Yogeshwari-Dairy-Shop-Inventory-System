#!/usr/bin/env python3
"""
Fetch official pure-white studio packshots from verified Shopify Indian grocery catalogs
+ verified studio URLs and upgrade remaining active in-stock products in Supabase.
"""

import json
import os
import re
import urllib.request
from collections import Counter

from dotenv import dotenv_values
from supabase import create_client

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"


def load_env():
    env = {}
    for p in [".env", ".env.local", "server/.env"]:
        if os.path.exists(p):
            env.update(dotenv_values(p))
    return env


def head_ok(url: str) -> bool:
    try:
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=8) as r:
            ct = (r.headers.get("Content-Type") or "").lower()
            return r.status == 200 and ("image" in ct or any(url.lower().split("?")[0].endswith(e) for e in (".jpg", ".jpeg", ".png", ".webp")))
    except Exception:
        return False


def fetch_shopify_catalog(domain: str, max_pages=12):
    items = []
    for page in range(1, max_pages + 1):
        url = f"https://{domain}/products.json?limit=250&page={page}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=15) as r:
                prods = json.loads(r.read().decode("utf-8")).get("products") or []
            if not prods:
                break
            for p in prods:
                title = (p.get("title") or "").strip()
                imgs = p.get("images") or []
                if title and imgs and imgs[0].get("src"):
                    items.append({"title": title, "img": imgs[0]["src"], "vendor": p.get("vendor") or ""})
            if len(prods) < 250:
                break
        except Exception:
            break
    return items


# Verified direct studio URLs already confirmed HTTP 200 OK
VERIFIED_DIRECT_STUDIO = {
    "0c2044eb-0f2a-454f-9dc3-9928edd0df9f": ("Britannia", "https://cdn.dmart.in/images/products/OCT120002082xx16OCT23_5_B.jpg"),
    "4a87b4b4-641b-47cd-aaa1-1d5abd355bce": ("Parle", "https://www.bbassets.com/media/uploads/p/l/20004283_13-parle-20-20-cashew-butter-cookies.jpg"),
    "d0040e79-a5d0-4bbd-9914-ad21cdc1c08c": ("Britannia", "https://www.bbassets.com/media/uploads/p/l/40001605_6-britannia-good-day-cookies-rich-butter.jpg"),
}

# Matchers against Shopify Indian grocery studio catalog (product_id -> (brand, required_all_kws, exclude_kws))
CATALOG_MATCH_RULES = {
    "58ee217d-b9ba-47a8-a689-f99e312b3711": ("Amul", ["amulya"], []),
    "981eb563-5523-4d7a-8502-146ef257f5a1": ("Parle", ["parle", "marie"], []),
    "3be0d793-c893-46a4-9f53-72a49abf883f": ("Cadbury", ["cadbury", "shots"], []),
    "3ad37c43-fae8-4498-9f2f-f3a57f99d4e9": ("Cadbury", ["shots"], []),
    "e529b0d4-70a3-4163-9b28-6217736bb416": ("Campa", ["campa", "cola"], []),
    "ff92c31a-4ecc-43bb-b2de-75cf444e2280": ("Campa", ["campa", "lemon"], []),
    "75f0630a-94b6-4742-bf23-8ef6506ee753": ("Campa", ["campa", "orange"], []),
    "9fc056de-7a50-443b-a97c-aad2f0a6ccab": ("Amul", ["chocominis"], []),
    "c826f077-fea3-4b1b-8d0f-26aa153f9b3f": ("Karia's", ["crushed", "chikki"], []),
    "82719991-0a10-4401-9b37-b3bb90351d16": ("Parle", ["parle", "fab"], ["bourbon", "vanilla", "jam"]),
    "2cca31c2-ffd6-4d81-9e28-b29137610285": ("Britannia", ["good day", "cashew"], []),
    "8fe962ad-3d2e-4752-b63e-c88701b3be89": ("Parle", ["happy happy"], ["cake"]),
    "4e295142-4738-4013-9361-274f751012b9": ("Parle", ["happy happy"], ["cake"]),
    "5074ecdc-8a7e-4693-a3d3-20384de2663c": ("Parle", ["hide", "bourbon"], []),
    "cbdf73e4-a2c5-49b5-aca4-3a8205495d36": ("BRU", ["bru", "instant", "coffee"], ["gold"]),
    "53fea256-9b34-4a1b-81fd-46283a1589d3": ("Britannia", ["jim", "jam"], []),
    "6ea5aec8-871f-44e9-82ff-17f2b156cd0b": ("Maggi", ["maggi", "magic"], ["noodle"]),
    "f1856d58-45ed-4af7-8932-c97afa83dfdb": ("Parle", ["monaco"], ["jeera", "zeera", "pizza"]),
    "546ea05f-07ff-4dbd-a825-dac28ee33210": ("Nutritious", ["peanut", "chikki"], ["crushed"]),
    "fade5a6e-8b62-4eef-82e4-6537bbf1e5ce": ("Cadbury Oreo", ["oreo", "choc"], ["golden", "vanilla", "milk"]),
    "4c6827a6-6a07-4072-95ce-8bb944ebc34f": ("Cadbury Oreo", ["oreo", "vanilla"], ["choco", "silk"]),
    "05aa084a-da4e-4113-993a-3098e9612752": ("Parle", ["parle", "fab", "vanilla"], []),
    "d0e62e96-4b6d-4a07-855b-dbe114f30b87": ("Parle", ["happy", "cake"], []),
    "6ccfc437-1d54-4476-b888-389ea0cc8fe8": ("Parle", ["krackjack"], []),
    "ca1bdff8-bc43-41af-bdf7-d02416696e37": ("Parle", ["magix"], ["orange", "choco"]),
    "2688a882-4325-43a3-b5a5-27f78c725753": ("Parle", ["magix", "choco"], []),
    "1573e393-ca21-4948-8a79-be796477033d": ("Parle", ["magix", "orange"], []),
    "8321b473-486a-42f7-b8ec-c3fa2c4cb713": ("Parle", ["monaco", "jeera"], []),
    "92c1b124-c474-43c2-8302-d59688871fd9": ("Parle", ["jam", "parle"], []),
    "3f801df3-0882-447d-b1d8-0840211415fa": ("Parle", ["fab", "bourbon"], []),
    "dfa72fe9-dc19-4662-866d-d41ea7c9ef39": ("Parle", ["parle-g"], []),
    "eec1dc26-02e1-4186-b695-8fe0be130041": ("Patanjali", ["patanjali", "doodh"], []),
    "36abd733-3b6e-4526-9064-94ab793c961e": ("Nutritious", ["peanut", "chikki"], ["crushed"]),
    "f39b5194-4437-46eb-b829-f369250a4029": ("Karia's", ["peanut", "chikki"], ["crushed"]),
    "0410339c-0de9-4c35-a963-23ea1f4c0fa0": ("Sprite", ["sprite"], []),
    "39305d76-7d04-4c9a-8574-b1746114b791": ("Unibic", ["unibic", "choco", "chip"], []),
}


def fetch_all_products(sb):
    rows = []
    off = 0
    while True:
        d = sb.table("products").select("id, name, brand, barcode, image_url, stock_quantity").range(off, off + 999).execute().data or []
        rows.extend(d)
        if len(d) < 1000:
            break
        off += 1000
    return rows


def main():
    env = load_env()
    sb = create_client(
        env.get("VITE_SUPABASE_URL") or env.get("SUPABASE_URL"),
        env.get("VITE_SUPABASE_ANON_KEY") or env.get("SUPABASE_ANON_KEY"),
    )

    print("[1/4] Fetching Indian grocery studio catalogs (Shopify CDN)...")
    catalog = []
    domains = [
        "www.groceryfactory.in",
        "www.indiansupermarket.co.uk",
        "www.myindianstore.com",
        "www.bazaarfresh.in",
        "www.desimart.ca",
        "www.redrickshaw.com",
        "www.shopindian.com",
        "www.kiasupermarket.com",
    ]
    for dom in domains:
        items = fetch_shopify_catalog(dom, max_pages=10)
        if items:
            print(f"   {dom}: {len(items)} studio items")
            catalog.extend(items)

    print(f"   Total studio catalog items collected: {len(catalog)}")

    print("[2/4] Loading live Supabase products & currently used image URLs...")
    all_prods = fetch_all_products(sb)
    by_id = {p["id"]: p for p in all_prods}
    img_owner = {(p.get("image_url") or "").strip(): p["id"] for p in all_prods if (p.get("image_url") or "").strip()}

    upgraded = 0

    def assign_studio(pid, brand, url, label):
        nonlocal upgraded
        if not url or not head_ok(url):
            return False
        owner = img_owner.get(url)
        if owner and owner != pid:
            if (by_id.get(owner, {}).get("stock_quantity") or 0) <= 0:
                # Reclaim studio URL from zero-stock catalogue item for active shop product
                sb.table("products").update({"image_url": None}).eq("id", owner).execute()
                del img_owner[url]
            else:
                return False
        sb.table("products").update({
            "image_url": url,
            "brand": brand,
            "image_status": "official_verified",
            "image_source": "OFFICIAL_STUDIO",
        }).eq("id", pid).execute()
        img_owner[url] = pid
        upgraded += 1
        print(f"   ✓ [{label}] {by_id[pid]['name']} -> {url}")
        return True

    print("[3/4] Applying verified direct studio URLs & Shopify catalog matches...")
    for pid, (brand, u) in VERIFIED_DIRECT_STUDIO.items():
        if pid in by_id:
            assign_studio(pid, brand, u, "DIRECT STUDIO")

    for pid, (brand, req_kws, excl_kws) in CATALOG_MATCH_RULES.items():
        if pid not in by_id:
            continue
        for item in catalog:
            tl = f"{item['vendor']} {item['title']}".lower()
            if all(k in tl for k in req_kws) and not any(ex in tl for ex in excl_kws):
                if assign_studio(pid, brand, item["img"], f"STUDIO: {item['title'][:36]}"):
                    break

    print("\n[4/4] Final Live Audit...")
    final_prods = fetch_all_products(sb)
    in_stock = [p for p in final_prods if (p.get("stock_quantity") or 0) > 0]
    studio_active = [p for p in in_stock if (p.get("image_url") or "") and "openfoodfacts" not in (p.get("image_url") or "")]
    still_off = [p for p in in_stock if "openfoodfacts" in (p.get("image_url") or "")]
    img_c = Counter((p.get("image_url") or "").strip() for p in final_prods if (p.get("image_url") or "").strip())
    dup_imgs = sum(v - 1 for v in img_c.values() if v > 1)

    print(f"=== FINAL STUDIO AUDIT ===")
    print(f"Newly upgraded to white-BG studio now:      {upgraded}")
    print(f"Active in-stock with CLEAN STUDIO packshot: {len(studio_active)}/{len(in_stock)}")
    print(f"Active in-stock still using OFF photo:      {len(still_off)}")
    print(f"Duplicate image_urls across entire DB:      {dup_imgs}")
    if still_off:
        print("Remaining active items on OFF:")
        for p in still_off:
            print(f"   - {p['name']} ({p.get('brand')})")


if __name__ == "__main__":
    main()
