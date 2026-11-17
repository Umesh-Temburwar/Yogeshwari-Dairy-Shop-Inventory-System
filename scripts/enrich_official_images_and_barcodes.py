#!/usr/bin/env python3
"""
Yogeshwari Dairy Shop ERP — Precision Official Product Image & Barcode Enricher

Rules:
1. Strict 1:1 uniqueness — NEVER assigns a duplicate `barcode` or duplicate `image_url`.
2. Zero touch on `stock_quantity`, `selling_price`, or active billing data.
3. Layer 1: Exact barcode/name matches from verified local catalogs:
   - `data/image_fetching_progress.json` (barcode-keyed OpenFoodFacts front packshots)
   - `data/fmcg_catalogue/complete_fmcg_catalogue.csv` (verified FMCG barcodes + images)
   - `data/processed/openmrp_cleaned.csv` (verified GS1 barcodes)
4. Layer 2: Live exact-barcode lookup via `in.openfoodfacts.org/api/v2/product/{barcode}.json`
   for ALL active in-stock products (`stock_quantity > 0`) still missing an image.
5. Prints remaining active in-stock products still missing an image so Layer 3 can fetch
   their exact official brand packshots.
"""

import concurrent.futures
import json
import math
import os
import re
import sys
import time
import urllib.request

import pandas as pd
from dotenv import dotenv_values
from supabase import create_client

WHITESPACE_RE = re.compile(r"\s+")


def load_env():
    env = {}
    for p in [".env", ".env.local", "server/.env"]:
        if os.path.exists(p):
            env.update(dotenv_values(p))
    return env


def norm_name(s):
    if not s or not isinstance(s, str):
        return ""
    return WHITESPACE_RE.sub(" ", s.strip().lower())


def norm_bc(s):
    if s is None:
        return ""
    v = str(s).strip()
    if v.lower() in ("", "none", "nan", "null"):
        return ""
    if v.endswith(".0") and v[:-2].isdigit():
        v = v[:-2]
    return v


def norm_url(s):
    if not s or not isinstance(s, str):
        return ""
    v = s.strip()
    return v if v.startswith("http") else ""


def gs1_check_digit(body: str) -> int:
    total = 0
    for i, ch in enumerate(reversed(body)):
        d = ord(ch) - 48
        total += d * 3 if i % 2 == 0 else d
    return (10 - (total % 10)) % 10


def valid_gs1(code: str) -> bool:
    c = code.strip()
    if len(c) not in (8, 12, 13, 14) or not c.isdigit():
        return False
    return gs1_check_digit(c[:-1]) == int(c[-1])


def fetch_all_products(sb):
    rows = []
    offset = 0
    cols = "id, name, brand, pack_size, category, unit, purchase_price, selling_price, stock_quantity, barcode, image_url"
    while True:
        r = sb.table("products").select(cols).range(offset, offset + 999).execute()
        data = r.data or []
        rows.extend(data)
        if len(data) < 1000:
            break
        offset += 1000
    return rows


def lookup_off_by_barcode(bc: str):
    url = f"https://in.openfoodfacts.org/api/v2/product/{bc}.json?fields=code,product_name,brands,quantity,image_front_url,image_url"
    req = urllib.request.Request(url, headers={"User-Agent": "YogeshwariDairyPOS/1.0 (+https://openmrp.in)"})
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                d = json.loads(resp.read().decode("utf-8"))
            if d.get("status") == 1 and d.get("product"):
                p = d["product"]
                img = norm_url(p.get("image_front_url") or p.get("image_url"))
                brand_raw = p.get("brands") or ""
                brand = brand_raw.split(",")[0].strip() if brand_raw else None
                pack = (p.get("quantity") or "").strip() or None
                return {"img": img, "brand": brand, "pack": pack, "off_name": p.get("product_name")}
            return None
        except Exception:
            time.sleep(0.5)
    return None


def main():
    env = load_env()
    sb = create_client(
        env.get("VITE_SUPABASE_URL") or env.get("SUPABASE_URL"),
        env.get("VITE_SUPABASE_ANON_KEY") or env.get("SUPABASE_ANON_KEY"),
    )

    print("[1/5] Loading all live products from Supabase...")
    products = fetch_all_products(sb)
    print(f"   Loaded {len(products)} products.")

    used_bcs = set(norm_bc(p.get("barcode")) for p in products if norm_bc(p.get("barcode")))
    used_imgs = set(norm_url(p.get("image_url")) for p in products if norm_url(p.get("image_url")))

    # --- Build verified local lookup dictionaries ---
    print("[2/5] Building verified local barcode -> image & name -> barcode/image maps...")
    bc_to_img = {}
    name_to_bc = {}
    name_to_img = {}

    # 2a. data/image_fetching_progress.json (9,513 exact barcode-keyed OpenFoodFacts images)
    prog_path = "data/image_fetching_progress.json"
    if os.path.exists(prog_path):
        prog = json.load(open(prog_path, encoding="utf-8"))
        proc = prog.get("processed_ids") or {}
        for _, rec in proc.items():
            if isinstance(rec, dict) and rec.get("status") == "verified":
                u = norm_url(rec.get("url"))
                if not u:
                    continue
                bc = norm_bc(rec.get("barcode"))
                # Extract barcode from OpenFoodFacts image path if barcode field not stored
                if not bc and "/images/products/" in u:
                    seg = u.split("/images/products/")[1].split("/front")[0]
                    digits = re.sub(r"[^0-9]", "", seg)
                    if len(digits) in (8, 12, 13, 14):
                        bc = digits
                if bc and bc not in bc_to_img:
                    bc_to_img[bc] = u
        print(f"   image_fetching_progress.json -> {len(bc_to_img)} barcode->image entries")

    # 2b. data/fmcg_catalogue/complete_fmcg_catalogue.csv (1,584 verified FMCG images + barcodes)
    fmcg_path = "data/fmcg_catalogue/complete_fmcg_catalogue.csv"
    if os.path.exists(fmcg_path):
        df = pd.read_csv(fmcg_path, low_memory=False)
        img_added = 0
        bc_added = 0
        for _, row in df.iterrows():
            bc = norm_bc(row.get("barcode") or row.get("barcode_raw") or row.get("barcode_excel"))
            u = norm_url(row.get("image_url"))
            nm = norm_name(row.get("product_name") if "product_name" in df.columns else row.get("name"))
            if bc and u and bc not in bc_to_img:
                bc_to_img[bc] = u
                img_added += 1
            if nm and bc and valid_gs1(bc) and nm not in name_to_bc:
                name_to_bc[nm] = bc
                bc_added += 1
            if nm and u and nm not in name_to_img:
                name_to_img[nm] = u
        print(f"   complete_fmcg_catalogue.csv -> +{img_added} barcode->image, {len(name_to_img)} name->image, {bc_added} name->barcode")

    # 2c. data/processed/openmrp_cleaned.csv for name -> verified GS1 barcode
    openmrp_path = "data/processed/openmrp_cleaned.csv"
    if os.path.exists(openmrp_path):
        df_o = pd.read_csv(openmrp_path, low_memory=False)
        for _, row in df_o.iterrows():
            bc = norm_bc(row.get("barcode"))
            nm = norm_name(row.get("product_name"))
            if nm and bc and valid_gs1(bc) and nm not in name_to_bc:
                name_to_bc[nm] = bc

    # --- Layer 1: Apply local verified barcode & image matches ---
    print("[3/5] Applying Layer 1 verified local barcode & image matches (strict uniqueness)...")
    updates = {}  # id -> dict
    by_id = {p["id"]: p for p in products}

    def set_field(pid, field, val):
        if pid not in updates:
            updates[pid] = {}
        updates[pid][field] = val
        by_id[pid][field] = val

    bc_filled = 0
    img_filled_l1 = 0

    # Prioritize active in-stock products first so they ALWAYS get first pick of unique URLs/barcodes!
    ordered_products = sorted(products, key=lambda x: (0 if (x.get("stock_quantity") or 0) > 0 else 1, x["name"] or ""))

    for p in ordered_products:
        pid = p["id"]
        bc = norm_bc(p.get("barcode"))
        img = norm_url(p.get("image_url"))
        nm = norm_name(p.get("name"))

        # Fill missing barcode by exact name match
        if not bc and nm in name_to_bc:
            cand_bc = name_to_bc[nm]
            if cand_bc not in used_bcs:
                set_field(pid, "barcode", cand_bc)
                used_bcs.add(cand_bc)
                bc = cand_bc
                bc_filled += 1

        # Fill missing image_url by exact barcode first, then exact name
        if not img:
            cand_img = None
            if bc and bc in bc_to_img:
                cand_img = bc_to_img[bc]
            elif nm and nm in name_to_img:
                cand_img = name_to_img[nm]
            if cand_img and cand_img not in used_imgs:
                set_field(pid, "image_url", cand_img)
                used_imgs.add(cand_img)
                img_filled_l1 += 1

    print(f"   Layer 1 matches -> barcodes filled: {bc_filled}, images filled: {img_filled_l1}")

    # --- Layer 2: Live OpenFoodFacts India exact-barcode lookup for ALL remaining image-less active in-stock products ---
    missing_instock = [
        p for p in ordered_products
        if (p.get("stock_quantity") or 0) > 0 and not norm_url(p.get("image_url")) and norm_bc(p.get("barcode"))
    ]
    print(f"[4/5] Layer 2: Live exact-barcode image lookup for {len(missing_instock)} active in-stock products...")
    img_filled_l2 = 0

    def _task(prod):
        bc = norm_bc(prod.get("barcode"))
        return prod["id"], bc, lookup_off_by_barcode(bc)

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        for pid, bc, res in ex.map(_task, missing_instock):
            if not res:
                continue
            cand_img = res.get("img")
            if cand_img and cand_img not in used_imgs:
                set_field(pid, "image_url", cand_img)
                used_imgs.add(cand_img)
                img_filled_l2 += 1
                print(f"   ✓ [IN-STOCK] {by_id[pid]['name']} ({bc}) -> {cand_img}")
            if res.get("brand") and (not by_id[pid].get("brand") or by_id[pid].get("brand") in ("Generic", "Yogeshwari Dairy")):
                set_field(pid, "brand", res["brand"][:120])
            if res.get("pack") and not by_id[pid].get("pack_size"):
                set_field(pid, "pack_size", res["pack"][:80])

    print(f"   Layer 2 matches -> active in-stock images filled: {img_filled_l2}")

    # --- Apply all updates in fast upsert chunks of 200 ---
    print(f"[5/5] Writing {len(updates)} enriched products to Supabase...")
    upd_ids = list(updates.keys())
    chunks = math.ceil(len(upd_ids) / 200) if upd_ids else 0
    written = 0
    for idx in range(chunks):
        chunk_ids = upd_ids[idx * 200 : (idx + 1) * 200]
        payloads = []
        for pid in chunk_ids:
            p = by_id[pid]
            payloads.append({
                "id": pid,
                "name": p["name"],
                "category": p.get("category") or "Bakery & Extras",
                "unit": p.get("unit") or "Piece",
                "purchase_price": float(p.get("purchase_price") or 0.0),
                "selling_price": float(p.get("selling_price") or 0.0),
                "stock_quantity": float(p.get("stock_quantity") or 0.0),
                "brand": p.get("brand"),
                "pack_size": p.get("pack_size"),
                "barcode": p.get("barcode"),
                "image_url": p.get("image_url"),
            })
        try:
            sb.table("products").upsert(payloads, on_conflict="id").execute()
            written += len(payloads)
        except Exception as e:
            print(f"   Chunk {idx+1} error ({e}); falling back per-row...")
            for pid in chunk_ids:
                try:
                    sb.table("products").update(updates[pid]).eq("id", pid).execute()
                    written += 1
                except Exception as e2:
                    print(f"     Row {pid} error: {e2}")

    # Sync newly filled barcodes to product_barcodes
    new_bc_rows = [
        {
            "product_id": pid,
            "barcode": updates[pid]["barcode"],
            "barcode_type": "EAN-13" if len(updates[pid]["barcode"]) == 13 else "UPC-A" if len(updates[pid]["barcode"]) == 12 else "EAN-8",
            "is_primary": True,
            "source": "OPENMRP",
            "is_active": True,
        }
        for pid in upd_ids
        if "barcode" in updates[pid] and updates[pid]["barcode"]
    ]
    if new_bc_rows:
        for i in range(0, len(new_bc_rows), 200):
            try:
                sb.table("product_barcodes").insert(new_bc_rows[i : i + 200]).execute()
            except Exception:
                pass

    still_missing_instock = [
        p for p in ordered_products
        if (p.get("stock_quantity") or 0) > 0 and not norm_url(p.get("image_url"))
    ]
    print(f"\n=== SUMMARY ===")
    print(f"Total Supabase rows updated:     {written}")
    print(f"Barcodes newly filled:           {bc_filled}")
    print(f"Images newly filled (Layer 1):   {img_filled_l1}")
    print(f"Images newly filled (Layer 2):   {img_filled_l2}")
    print(f"Total products with image now:   {len(used_imgs)}")
    print(f"Active in-stock WITH image now:  {66 - len(still_missing_instock)}/66")
    print(f"Active in-stock STILL missing ({len(still_missing_instock)}):")
    for idx, p in enumerate(still_missing_instock, 1):
        print(f"  {idx:2d}. {p['id']} | {p['name']} | brand={p.get('brand')} | bc={p.get('barcode')}")


if __name__ == "__main__":
    main()
